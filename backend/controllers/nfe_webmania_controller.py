# /controllers/nfe_webmania_controller.py

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime
import os
import json
import logging
import requests

from config.database import get_db
from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro
from .empresa_controller import InfoEmpresa # Importa o novo model de empresa

router = APIRouter(prefix="/nfe-webmania", tags=["NF-e (Webmania)"])
logger = logging.getLogger(__name__)

# URL da API Webmania
API_URL = "https://webmaniabr.com/api/1/nfe/emissao/"

class EmitirNfePayload(BaseModel):
    pedido_id: int

def _get_next_nfe_number(db: Session, serie: int) -> int:
    """Busca o último número de NF-e para uma dada série e retorna o próximo."""
    last_nfe = db.query(Pedido.numero_nf).filter(Pedido.serie_nfe == serie, Pedido.numero_nf.isnot(None)).order_by(Pedido.numero_nf.desc()).first()
    return (last_nfe[0] + 1) if last_nfe else 1

def _construir_payload_webmania(info_empresa: InfoEmpresa, pedido: dict, cliente: dict, itens_pedido: list) -> dict:
    """
    Constrói o dicionário (payload) no formato esperado pela API da Webmania.
    Toda a lógica de impostos foi removida.
    """
    # Limpa CPF/CNPJ e CEP
    cpf_cnpj_cliente = ''.join(filter(str.isdigit, str(cliente.get("cpf_cnpj", ""))))
    cep_cliente = ''.join(filter(str.isdigit, str(cliente.get("cep", ""))))
    
    # Mapeamento do cliente
    cliente_payload = {
        "cpf" if len(cpf_cnpj_cliente) == 11 else "cnpj": cpf_cnpj_cliente,
        "nome_completo" if len(cpf_cnpj_cliente) == 11 else "razao_social": cliente.get("nome_razao"),
        "endereco": cliente.get("rua"),
        "numero": cliente.get("numero"),
        "bairro": cliente.get("bairro"),
        "cidade": cliente.get("cidade"),
        "uf": cliente.get("estado"),
        "cep": cep_cliente,
        "email": cliente.get("email")
    }
    # Adiciona IE se for pessoa jurídica e tiver
    if len(cpf_cnpj_cliente) == 14 and cliente.get("rg_ie"):
        cliente_payload["ie"] = ''.join(filter(str.isdigit, str(cliente.get("rg_ie"))))

    # Mapeamento dos produtos
    produtos_payload = []
    for item in itens_pedido:
        produtos_payload.append({
            "nome": item.get("descricao"),
            "codigo": item.get("sku"),
            "ncm": ''.join(filter(str.isdigit, str(item.get("classificacao_fiscal", "")))),
            "quantidade": item.get("quantidade_itens"),
            "unidade": item.get("unidade", "UN"),
            "origem": int(item.get("origem", 0)),
            "subtotal": str(item.get("valor_unitario")), # Webmania espera strings para valores
            "total": str(float(item.get("quantidade_itens", 0)) * float(item.get("valor_unitario", 0))),
            # PONTO CHAVE: A classe de imposto pré-configurada no painel da Webmania
            # Você deve criar esta classe no painel e usar o nome dela aqui.
            "classe_imposto": item.get("classe_imposto", "default") 
        })

    # Payload final
    payload = {
        "ID": str(pedido.get("id")), # ID do seu pedido para referência
        "operacao": 1, # 1 para Saída
        "natureza_operacao": pedido.get("natureza_operacao", "Venda de mercadoria"),
        "modelo": 1, # 1 para NF-e
        "finalidade": 1, # 1 para NF-e Normal
        "ambiente": 1 if info_empresa.emissao_em_producao else 2, # 1 para Produção, 2 para Homologação
        "cliente": cliente_payload,
        "produtos": produtos_payload,
        "pedido": {
            "presenca": 2, # 2 = Operação não presencial, pela Internet
            "modalidade_frete": int(pedido.get("modalidade_frete", 9)),
            "frete": str(pedido.get("valor_frete", "0.00")),
            "desconto": str(pedido.get("desconto_total", "0.00")),
            # A API calcula o total, mas é bom enviar
            "total": str(pedido.get("total_com_desconto", "0.00")),
            # URL que a Webmania vai chamar para notificar sobre o status da NF-e
            "url_notificacao": f"{os.getenv('APP_BASE_URL')}/nfe-webmania/webhook"
        }
    }
    return payload

@router.post("/emitir")
def emitir_nfe(payload_input: EmitirNfePayload, db: Session = Depends(get_db)):
    """
    Endpoint para construir o payload e enviar para a API da Webmania.
    O processo é assíncrono. A resposta imediata apenas confirma o recebimento.
    """
    pedido_db = db.query(Pedido).filter(Pedido.id == payload_input.pedido_id).first()
    if not pedido_db:
        raise HTTPException(status_code=404, detail=f"Pedido {payload_input.pedido_id} não encontrado.")
    if pedido_db.nfe_status == 'AUTORIZADO':
        raise HTTPException(status_code=400, detail="Este pedido já possui uma NF-e autorizada.")

    try:
        info_empresa_db = db.query(InfoEmpresa).first()
        if not info_empresa_db or not info_empresa_db.webmania_consumer_key:
            raise HTTPException(status_code=500, detail="Credenciais da Webmania não configuradas.")

        cliente_db = db.query(Cadastro).filter(Cadastro.id == pedido_db.cliente_id).first()
        if not cliente_db:
            raise HTTPException(status_code=404, detail=f"Cliente ID {pedido_db.cliente_id} não encontrado.")

        # Converte os dados do banco para dicionários
        cliente_dict = {c.name: getattr(cliente_db, c.name) for c in cliente_db.__table__.columns}
        pedido_dict = {c.name: getattr(pedido_db, c.name) for c in pedido_db.__table__.columns}
        itens_pedido = json.loads(pedido_dict.get("lista_itens", "[]") or "[]")

        # Constrói o payload para a API
        payload_webmania = _construir_payload_webmania(info_empresa_db, pedido_dict, cliente_dict, itens_pedido)

        # Configura os headers de autenticação
        headers = {
            "Content-Type": "application/json",
            "X-Consumer-Key": info_empresa_db.webmania_consumer_key,
            "X-Consumer-Secret": info_empresa_db.webmania_consumer_secret,
            "X-Access-Token": info_empresa_db.webmania_access_token,
            "X-Access-Token-Secret": info_empresa_db.webmania_access_token_secret,
        }

        # Envia a requisição para a Webmania
        response = requests.post(API_URL, headers=headers, data=json.dumps(payload_webmania))
        response.raise_for_status() # Lança exceção para erros HTTP (4xx ou 5xx)
        
        resposta_api = response.json()

        if resposta_api.get("error"):
            logger.error(f"Erro da API Webmania ao emitir NF-e para pedido {pedido_db.id}: {resposta_api['error']}")
            pedido_db.nfe_status = 'REJEITADO'
            pedido_db.nfe_rejeicao_motivo = str(resposta_api['error'])
            db.commit()
            raise HTTPException(status_code=400, detail=str(resposta_api['error']))
        
        # Sucesso no envio, aguardando webhook
        pedido_db.nfe_status = 'PROCESSANDO'
        pedido_db.nfe_uuid = resposta_api.get("uuid") # Salva o UUID para referência
        pedido_db.situacao_pedido = 'Em Processamento (NF-e)'
        db.commit()

        return {
            "status": "PROCESSANDO",
            "message": "NF-e enviada para processamento. Aguardando autorização da SEFAZ via webhook.",
            "uuid": resposta_api.get("uuid")
        }

    except requests.exceptions.RequestException as e:
        logger.exception(f"Erro de comunicação com a API Webmania para o pedido {payload_input.pedido_id}.")
        raise HTTPException(status_code=502, detail=f"Erro de comunicação com a API de NF-e: {e}")
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro fatal ao emitir NF-e para o pedido {payload_input.pedido_id}.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {type(e).__name__} - {e}")

@router.post("/webhook")
async def nfe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint para receber notificações de status da Webmania.
    """
    data = await request.json()
    logger.info(f"Webhook recebido da Webmania: {data}")

    uuid = data.get("uuid")
    status_nfe = data.get("status")

    if not uuid:
        logger.error("Webhook recebido sem UUID.")
        return Response(status_code=400, content="UUID não fornecido")

    pedido = db.query(Pedido).filter(Pedido.nfe_uuid == uuid).first()
    if not pedido:
        logger.error(f"Pedido com UUID {uuid} não encontrado no banco de dados.")
        # Retorna 200 para a Webmania não tentar reenviar. O erro é nosso.
        return Response(status_code=200, content="Pedido não encontrado, mas webhook processado.")

    if status_nfe == 'aprovado':
        pedido.nfe_status = 'AUTORIZADO'
        pedido.nfe_chave = data.get('chave')
        pedido.numero_nf = data.get('nfe')
        pedido.serie_nfe = data.get('serie')
        pedido.nfe_protocolo = data.get('protocolo')
        pedido.data_nf = datetime.now()
        pedido.nfe_xml_path = data.get('xml') # Salva a URL do XML
        pedido.nfe_danfe_path = data.get('danfe') # Salva a URL do DANFE
        pedido.nfe_rejeicao_motivo = None
        logger.info(f"NF-e para pedido {pedido.id} (UUID: {uuid}) foi AUTORIZADA.")
    
    elif status_nfe == 'rejeitado':
        pedido.nfe_status = 'REJEITADO'
        pedido.nfe_rejeicao_motivo = data.get('motivo')
        logger.warning(f"NF-e para pedido {pedido.id} (UUID: {uuid}) foi REJEITADA. Motivo: {data.get('motivo')}")

    elif status_nfe == 'cancelado':
        pedido.nfe_status = 'CANCELADO'
        logger.info(f"NF-e para pedido {pedido.id} (UUID: {uuid}) foi CANCELADA.")

    else:
        logger.info(f"Status '{status_nfe}' recebido para UUID {uuid}, nenhuma ação necessária.")

    db.commit()
    return Response(status_code=200)

@router.get("/{pedido_id}/danfe")
async def download_danfe(pedido_id: int, db: Session = Depends(get_db)):
    """
    Faz o proxy do download do DANFE a partir da URL fornecida pela Webmania.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido or not pedido.nfe_danfe_path:
        raise HTTPException(status_code=404, detail="DANFE não encontrado para este pedido.")
    
    try:
        # Faz o download do conteúdo do PDF a partir da URL
        response = requests.get(pedido.nfe_danfe_path)
        response.raise_for_status()
        
        # Retorna o conteúdo do PDF para o cliente
        return Response(content=response.content, media_type='application/pdf', headers={
            "Content-Disposition": f"inline; filename=danfe-{pedido.numero_nf}.pdf"
        })
    except requests.exceptions.RequestException as e:
        logger.error(f"Falha ao buscar DANFE da URL {pedido.nfe_danfe_path}: {e}")
        raise HTTPException(status_code=502, detail="Não foi possível buscar o DANFE no momento.")

@router.get("/{pedido_id}/xml")
async def download_xml(pedido_id: int, db: Session = Depends(get_db)):
    """
    Faz o proxy do download do XML a partir da URL fornecida pela Webmania.
    """
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    if not pedido or not pedido.nfe_xml_path:
        raise HTTPException(status_code=404, detail="XML da NF-e não encontrado para este pedido.")
    
    try:
        response = requests.get(pedido.nfe_xml_path)
        response.raise_for_status()
        
        return Response(content=response.content, media_type='application/xml', headers={
            "Content-Disposition": f"attachment; filename=nfe-{pedido.nfe_chave}.xml"
        })
    except requests.exceptions.RequestException as e:
        logger.error(f"Falha ao buscar XML da URL {pedido.nfe_xml_path}: {e}")
        raise HTTPException(status_code=502, detail="Não foi possível buscar o XML no momento.")

