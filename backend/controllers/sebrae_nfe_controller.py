# /controllers/sebrae_nfe_controller.py

from fastapi import APIRouter, HTTPException, Body, Depends, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import json
import logging

from config.database import get_db
from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro
from controllers.empresa_controller import InfoEmpresa

# Importa o builder específico para o XML do Sebrae
from helpers.sebrae_xml_builder import construir_xml_para_sebrae

router = APIRouter(prefix="/nfe", tags=["NF-e (Sebrae)"])
logger = logging.getLogger(__name__)

class DadosManuaisNfePayload(BaseModel):
    numero_nf: int
    nfe_chave: str
    data_nf: datetime

# --- ENDPOINTS PARA O FLUXO SEBRAE ---

@router.get("/gerar-xml-sebrae/{pedido_id}")
def gerar_xml_sebrae(pedido_id: int, db: Session = Depends(get_db)):
    """
    Gera um arquivo XML de NF-e (não assinado) para importação no Emissor Sebrae.
    """
    pedido_db = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    info_empresa_db = db.query(InfoEmpresa).first()
    cliente_db = db.query(Cadastro).filter(Cadastro.id == pedido_db.cliente_id).first()
    itens_pedido = json.loads(pedido_db.lista_itens or "[]")
    
    # --- CORREÇÃO APLICADA AQUI ---
    # Carrega os dados de pagamento do pedido
    pagamentos_pedido = json.loads(pedido_db.formas_pagamento or "[]")

    if not all([info_empresa_db, cliente_db, itens_pedido]):
        raise HTTPException(status_code=400, detail="Dados incompletos para gerar o XML.")

    try:
        # Passa os dados de pagamento para o builder
        xml_string = construir_xml_para_sebrae(db, info_empresa_db, pedido_db, cliente_db, itens_pedido, pagamentos_pedido)
        
        filename = f"nfe_pedido_{pedido_id}_para_importar.xml"
        headers = {'Content-Disposition': f'attachment; filename="{filename}"'}
        
        return Response(content=xml_string, media_type='application/xml', headers=headers)

    except Exception as e:
        logger.exception(f"Erro ao gerar XML para o pedido {pedido_id}.")
        raise HTTPException(status_code=500, detail=f"Erro ao gerar XML: {e}")


@router.put("/atualizar-dados-manuais/{pedido_id}")
def atualizar_dados_manuais_nfe(
    pedido_id: int,
    payload: DadosManuaisNfePayload,
    db: Session = Depends(get_db)
):
    """
    Atualiza um pedido com os dados da NF-e emitida manualmente no portal do Sebrae.
    """
    pedido_db = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido_db:
        raise HTTPException(status_code=404, detail="Pedido não encontrado.")

    try:
        pedido_db.numero_nf = payload.numero_nf
        pedido_db.nfe_chave = payload.nfe_chave
        pedido_db.data_nf = payload.data_nf
        pedido_db.nfe_status = 'autorizado' # Marca como autorizado
        pedido_db.situacao_pedido = 'Expedição' # Move o pedido para a próxima etapa
        
        db.commit()
        db.refresh(pedido_db)

        return {"message": "Dados da NF-e manual atualizados com sucesso!", "pedido": pedido_db.id}

    except Exception as e:
        db.rollback()
        logger.exception(f"Erro ao salvar dados manuais da NF-e para o pedido {pedido_id}.")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar dados: {e}")
