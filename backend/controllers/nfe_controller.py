# /controllers/nfe_controller.py

from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import os
import json
import logging
from fastapi.responses import FileResponse, JSONResponse
from lxml import etree

from config.database import get_db
from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro
from services.pynfe_service import get_pynfe_service, PyNFeService
from helpers.nfe_builder import construir_objetos_pynfe

router = APIRouter(prefix="/nfe", tags=["NF-e (PyNFe)"])
logger = logging.getLogger(__name__)

class EmitirNfePayload(BaseModel):
    pedido_id: int

def _get_next_nfe_number(db: Session, serie: int) -> int:
    """Busca o último número de NF-e para uma dada série e retorna o próximo."""
    last_nfe = db.query(Pedido.numero_nf).filter(Pedido.serie_nfe == serie, Pedido.numero_nf.isnot(None)).order_by(Pedido.numero_nf.desc()).first()
    return (last_nfe[0] + 1) if last_nfe else 1

@router.post("/emitir")
def emitir_nfe(
    payload_input: EmitirNfePayload, 
    db: Session = Depends(get_db),
    pynfe_service: PyNFeService = Depends(get_pynfe_service)
):
    """
    Endpoint síncrono para construir, assinar, enviar e processar uma NF-e.
    """
    pedido_id = payload_input.pedido_id
    pedido_db = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido_db:
        raise HTTPException(status_code=404, detail=f"Pedido {pedido_id} não encontrado.")
    if pedido_db.nfe_status == 'AUTORIZADO':
        raise HTTPException(status_code=400, detail="Este pedido já possui uma NF-e autorizada.")

    try:
        # Carrega dados do cliente
        cliente_db = db.query(Cadastro).filter(Cadastro.id == pedido_db.cliente_id).first()
        if not cliente_db:
            raise HTTPException(status_code=404, detail=f"Cliente ID {pedido_db.cliente_id} não encontrado.")
        
        # Converte os dados do banco para dicionários
        cliente_dict = {c.name: getattr(cliente_db, c.name) for c in cliente_db.__table__.columns}
        pedido_dict = {c.name: getattr(pedido_db, c.name) for c in pedido_db.__table__.columns}
        itens_pedido = json.loads(pedido_dict.get("lista_itens", "[]") or "[]")
        pagamentos_pedido = json.loads(pedido_dict.get("formas_pagamento", "[]") or "[]")

        # Define a série e o número da NF-e
        serie_atual = int(pedido_dict.get("serie_nfe") or 1)
        # Só busca um novo número se o pedido ainda não tiver um (útil para tentar de novo após uma rejeição)
        numero_atual = pedido_dict.get("numero_nf") or _get_next_nfe_number(db, serie_atual)
        
        pedido_dict['numero_nfe'] = numero_atual
        pedido_dict['serie_nfe'] = serie_atual

        # Constrói o objeto NotaFiscal da PyNFe
        nota_fiscal_obj = construir_objetos_pynfe(pedido_dict, cliente_dict, itens_pedido, pagamentos_pedido)

        # Atualiza o status no pedido para indicar que a emissão começou
        pedido_db.situacao_pedido = 'Em Processamento (NF-e)'
        pedido_db.numero_nf = numero_atual
        pedido_db.serie_nfe = serie_atual
        db.commit()

        # Chama o serviço que executa o fluxo completo
        status_proc, resultado = pynfe_service.emitir_nfe_sincrono(nota_fiscal_obj)

        if status_proc == 'autorizado':
            xml_autorizado_etree = resultado
            xml_final_string = etree.tostring(xml_autorizado_etree, encoding='unicode', pretty_print=True)
            
            ns = {'nfe': 'http://www.portalfiscal.inf.br/nfe'}
            chave_nfe = xml_autorizado_etree.find('.//nfe:infNFe', namespaces=ns).get('Id').replace('NFe', '')
            protocolo = xml_autorizado_etree.find('.//nfe:infProt/nfe:nProt', namespaces=ns).text
            
            # Salva o arquivo XML
            xml_path = f"storage/nfe/xml/{chave_nfe}.xml"
            os.makedirs(os.path.dirname(xml_path), exist_ok=True)
            with open(xml_path, "w", encoding="utf-8") as f:
                f.write(xml_final_string)

            # Gera e salva o arquivo DANFE (PDF)
            pdf_bytes = pynfe_service.gerar_danfe(xml_autorizado_etree)
            danfe_path = f"storage/nfe/danfe/{chave_nfe}.pdf"
            os.makedirs(os.path.dirname(danfe_path), exist_ok=True)
            with open(danfe_path, "wb") as f:
                f.write(pdf_bytes)

            # Atualiza o pedido no banco com os dados finais da nota autorizada
            pedido_db.nfe_status = 'AUTORIZADO'
            pedido_db.nfe_chave = chave_nfe
            pedido_db.nfe_protocolo = protocolo
            pedido_db.data_nf = datetime.now()
            pedido_db.nfe_rejeicao_motivo = None
            pedido_db.nfe_xml_path = xml_path
            pedido_db.nfe_danfe_path = danfe_path
            db.commit()
            
            return {"status": "AUTORIZADO", "message": "NF-e autorizada com sucesso!", "numero_nf": numero_atual, "chave_nfe": chave_nfe}
        
        else: # 'rejeitado' ou 'erro_fatal'
            pedido_db.nfe_status = 'REJEITADO'
            pedido_db.nfe_rejeicao_motivo = resultado
            db.commit()
            raise HTTPException(status_code=400, detail=f"Falha na emissão: {resultado}")
            
    except HTTPException:
        raise # Re-levanta exceções HTTP para não serem capturadas abaixo
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro fatal ao emitir NF-e para o pedido {pedido_id}.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {type(e).__name__} - {e}")


@router.get("/{pedido_id}/danfe", response_class=FileResponse)
def download_danfe(pedido_id: int, db: Session = Depends(get_db)):
    """Serve o arquivo PDF do DANFE armazenado localmente."""
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido or not pedido.nfe_danfe_path or not os.path.exists(pedido.nfe_danfe_path):
        raise HTTPException(status_code=404, detail="DANFE não encontrado.")
    
    filename = f"danfe-{pedido.numero_nf or pedido.nfe_chave}.pdf"
    return FileResponse(
        path=pedido.nfe_danfe_path, 
        media_type='application/pdf', 
        filename=filename,
        content_disposition_type="inline"
    )

@router.get("/{pedido_id}/xml", response_class=FileResponse)
def download_xml(pedido_id: int, db: Session = Depends(get_db)):
    """Serve o arquivo XML da NF-e armazenado localmente."""
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido or not pedido.nfe_xml_path or not os.path.exists(pedido.nfe_xml_path):
        raise HTTPException(status_code=404, detail="XML da NF-e não encontrado.")
        
    filename = f"nfe-{pedido.nfe_chave}.xml"
    return FileResponse(
        path=pedido.nfe_xml_path, 
        media_type='application/xml', 
        filename=filename,
        content_disposition_type="attachment"
    )
