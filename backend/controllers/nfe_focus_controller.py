# /controllers/nfe_focus_nfe_controller.py

from fastapi import APIRouter, HTTPException, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
# Adicionado 'text' para executar queries SQL de forma segura
from sqlalchemy import text
from datetime import datetime
import os
import json
import logging
import requests
from requests.auth import HTTPBasicAuth
from typing import Optional, Any

# Importações do seu projeto
from config.database import get_db
from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro
from models.focus_configuracoes_model import FocusConfiguracoes

logger = logging.getLogger(__name__)

# ==================================
#         SCHEMAS (Pydantic)
# ==================================

class FocusConfiguracoesSchema(BaseModel):
    cnpj: Optional[str] = Field(None, max_length=14)
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    ie: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = Field(None, max_length=8)
    crt: Optional[str] = None
    emissao_em_producao: Optional[bool] = False
    focus_nfe_token: Optional[str] = None
    # Adicionando os novos campos de padrões fiscais ao schema
    cfop_interno: Optional[str] = None
    cfop_interestadual: Optional[str] = None
    cst_padrao: Optional[str] = None
    csosn_padrao: Optional[str] = None
    pis_cst_padrao: Optional[str] = None
    cofins_cst_padrao: Optional[str] = None
    presenca_comprador_padrao: Optional[str] = None
    consumidor_final_padrao: Optional[str] = None
    modalidade_frete_padrao: Optional[int] = None

    class Config:
        from_attributes = True

class EmitirNfePayload(BaseModel):
    pedido_id: int

# ==================================
#    ROUTER - CONFIGURAÇÕES DA EMPRESA
# ==================================
router_config = APIRouter(prefix="/api/empresa", tags=["Configurações da Empresa"])

@router_config.get("", response_model=FocusConfiguracoesSchema)
def get_info_empresa(db: Session = Depends(get_db)):
    config = db.query(FocusConfiguracoes).first()
    if not config:
        config = FocusConfiguracoes(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    
    if config:
        for field in ['crt', 'presenca_comprador_padrao', 'consumidor_final_padrao']:
             if getattr(config, field, None) is not None:
                setattr(config, field, str(getattr(config, field)))
    return config

@router_config.put("", response_model=FocusConfiguracoesSchema)
def update_info_empresa(config_update: FocusConfiguracoesSchema, db: Session = Depends(get_db)):
    db_config = db.query(FocusConfiguracoes).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Informações da empresa não encontradas para atualizar.")

    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value if value is not None else None)
    
    db.commit()
    db.refresh(db_config)
    
    if db_config:
        for field in ['crt', 'presenca_comprador_padrao', 'consumidor_final_padrao']:
             if getattr(db_config, field, None) is not None:
                setattr(db_config, field, str(getattr(db_config, field)))
    return db_config

# ==================================
#         ROUTER - EMISSÃO NF-e
# ==================================
router_nfe = APIRouter(prefix="/nfe-focus", tags=["NF-e (Focus NF-e)"])

API_URL_PROD = "https://api.focusnfe.com.br"
API_URL_HOMOLOG = "https://homologacao.focusnfe.com.br"

def _get_api_url(config_empresa: FocusConfiguracoes) -> str:
    return API_URL_PROD if config_empresa.emissao_em_producao else API_URL_HOMOLOG

def _construir_payload_focus_nfe(config_empresa: FocusConfiguracoes, pedido: dict, cliente: dict, itens_pedido: list, db: Session) -> dict:
    cpf_cnpj_cliente = ''.join(filter(str.isdigit, str(cliente.get("cpf_cnpj", ""))))
    cep_cliente = ''.join(filter(str.isdigit, str(cliente.get("cep", ""))))
    cnpj_emitente = ''.join(filter(str.isdigit, str(config_empresa.cnpj)))

    uf_emitente = config_empresa.uf
    uf_destinatario = cliente.get("estado")

    if uf_emitente == uf_destinatario:
        cfop_padrao = config_empresa.cfop_interno or "5102"
        local_destino = 1 # Operação interna
    else:
        cfop_padrao = config_empresa.cfop_interestadual or "6108"
        local_destino = 2 # Operação interestadual

    if config_empresa.crt in ['1', '4']:
        situacao_tributaria_campo = "icms_csosn"
        situacao_tributaria_padrao = config_empresa.csosn_padrao or "102"
    else:
        situacao_tributaria_campo = "icms_cst"
        situacao_tributaria_padrao = config_empresa.cst_padrao or "00"

    items_payload = []
    soma_valor_bruto_itens = 0.0
    valor_desconto_total = float(pedido.get('desconto_total', 0.00))
    valor_frete_total = float(pedido.get('valor_frete', 0.00))

    for item in itens_pedido:
        soma_valor_bruto_itens += float(item.get("subtotal", 0))
    soma_valor_bruto_itens = round(soma_valor_bruto_itens, 2)

    for i, item in enumerate(itens_pedido):
        if not item.get('sku') or not item.get('classificacao_fiscal'):
            produto_id = item.get('produto_id')
            if not produto_id: raise ValueError(f"Item do pedido sem produto_id, SKU ou NCM. Item: {item}")
            logger.info(f"Dados fiscais ausentes para o produto_id {produto_id}. Buscando no DB.")
            query = text("SELECT sku, classificacao_fiscal, origem, unidade FROM produtos WHERE id = :pid")
            db_produto_info = db.execute(query, {"pid": produto_id}).first()
            if not db_produto_info: raise ValueError(f"Produto com ID {produto_id} não encontrado no banco de dados.")
            item.update({ 'sku': db_produto_info.sku, 'classificacao_fiscal': db_produto_info.classificacao_fiscal, 'origem': db_produto_info.origem, 'unidade': db_produto_info.unidade })

        ncm = ''.join(filter(str.isdigit, str(item.get("classificacao_fiscal", ""))))
        if len(ncm) != 8: raise ValueError(f"NCM inválido para o produto {item.get('sku')}: '{ncm}'")

        mapa_origem = { "nacional": 0, "estrangeira": 1, "estrangeira - importação direta": 1, "estrangeira - adquirida no mercado interno": 2 }
        origem_valor = item.get("origem", 0)
        icms_origem_codigo = 0
        if isinstance(origem_valor, int): icms_origem_codigo = origem_valor
        elif isinstance(origem_valor, str):
            try: icms_origem_codigo = int(origem_valor)
            except ValueError: icms_origem_codigo = mapa_origem.get(origem_valor.lower().strip(), 0)

        valor_bruto_item = round(float(item.get("subtotal", 0)), 2)
        proporcao_item = valor_bruto_item / soma_valor_bruto_itens if soma_valor_bruto_itens > 0 else 0
        valor_frete_item = round(valor_frete_total * proporcao_item, 2)
        valor_desconto_item = round(valor_desconto_total * proporcao_item, 2)

        # [CORREÇÃO] Valores numéricos são enviados como float/int, não string
        item_payload = {
            "numero_item": i + 1,
            "codigo_produto": str(item.get("sku")),
            "descricao": str(item.get("produto")),
            "cfop": str(item.get("cfop", cfop_padrao)),
            "codigo_ncm": str(ncm),
            "quantidade_comercial": float(item.get("quantidade_itens")),
            "quantidade_tributavel": float(item.get("quantidade_itens")),
            "unidade_comercial": str(item.get("unidade", "UN")),
            "unidade_tributavel": str(item.get("unidade", "UN")),
            "valor_unitario_comercial": float(item.get('subtotal', 0) / item.get('quantidade_itens', 1)),
            "valor_unitario_tributavel": float(item.get('subtotal', 0) / item.get('quantidade_itens', 1)),
            "valor_bruto": valor_bruto_item,
            "valor_desconto": valor_desconto_item,
            "valor_frete": valor_frete_item,
            "icms_origem": icms_origem_codigo,
            "pis_situacao_tributaria": config_empresa.pis_cst_padrao or "07",
            "cofins_situacao_tributaria": config_empresa.cofins_cst_padrao or "07",
            "inclui_no_total": 1,
        }
        
        item_payload[situacao_tributaria_campo] = str(item.get(situacao_tributaria_campo, situacao_tributaria_padrao))
        items_payload.append(item_payload)

    valor_total_calculado = soma_valor_bruto_itens - valor_desconto_total + valor_frete_total

    payload = {
        "natureza_operacao": str(pedido.get("natureza_operacao", "Venda de mercadoria")),
        "data_emissao": datetime.now().isoformat(timespec='seconds') + '-03:00',
        "tipo_documento": 1,
        "local_destino": local_destino,
        "finalidade_emissao": 1,
        "presenca_comprador": int(config_empresa.presenca_comprador_padrao or 2),
        "consumidor_final": int(config_empresa.consumidor_final_padrao or 1),
        "cnpj_emitente": str(cnpj_emitente),
        "nome_destinatario": str(cliente.get("nome_razao")),
        "logradouro_destinatario": str(cliente.get("logradouro")),
        "numero_destinatario": str(cliente.get("numero")),
        "bairro_destinatario": str(cliente.get("bairro")),
        "municipio_destinatario": str(cliente.get("cidade")),
        "uf_destinatario": str(cliente.get("estado")),
        "cep_destinatario": str(cep_cliente),
        "indicador_inscricao_estadual_destinatario": 9,
        "valor_produtos": round(soma_valor_bruto_itens, 2),
        "valor_frete": valor_frete_total,
        "valor_desconto": valor_desconto_total,
        "valor_total": round(valor_total_calculado, 2),
        "modalidade_frete": int(pedido.get("modalidade_frete", config_empresa.modalidade_frete_padrao or 9)),
        "items": items_payload,
        ("cpf_destinatario" if len(cpf_cnpj_cliente) == 11 else "cnpj_destinatario"): str(cpf_cnpj_cliente),
        "url_notificacao": f"{os.getenv('APP_BASE_URL')}/nfe-focus/webhook"
    }
    
    print("--- PAYLOAD ENVIADO PARA FOCUS NF-e ---")
    print(json.dumps(payload, indent=2))
    print("------------------------------------")
    
    return payload

@router_nfe.post("/emitir")
def emitir_nfe(payload_input: EmitirNfePayload, db: Session = Depends(get_db)):
    pedido_db = db.query(Pedido).filter(Pedido.id == payload_input.pedido_id).first()
    if not pedido_db:
        raise HTTPException(status_code=404, detail=f"Pedido {payload_input.pedido_id} não encontrado.")
    if pedido_db.nfe_status == 'AUTORIZADO':
        raise HTTPException(status_code=400, detail="Este pedido já possui uma NF-e autorizada.")

    try:
        config_empresa_db = db.query(FocusConfiguracoes).first()
        if not config_empresa_db or not config_empresa_db.focus_nfe_token:
            raise HTTPException(status_code=500, detail="Token da Focus NF-e não configurado.")

        cliente_db = db.query(Cadastro).filter(Cadastro.id == pedido_db.cliente_id).first()
        if not cliente_db:
            raise HTTPException(status_code=404, detail=f"Cliente ID {pedido_db.cliente_id} não encontrado.")

        campos_obrigatorios_cliente = {
            "logradouro": "Logradouro", "numero": "Número", "bairro": "Bairro",
            "cidade": "Cidade", "estado": "UF", "cep": "CEP"
        }
        campos_faltando = [nome for campo, nome in campos_obrigatorios_cliente.items() if not getattr(cliente_db, campo, None)]
        
        if campos_faltando:
            mensagem_erro = f"Endereço do cliente ID {cliente_db.id} está incompleto. Campos faltando: {', '.join(campos_faltando)}."
            logger.error(mensagem_erro)
            raise HTTPException(status_code=400, detail=mensagem_erro)

        cliente_dict = {c.name: getattr(cliente_db, c.name) for c in cliente_db.__table__.columns}
        pedido_dict = {c.name: getattr(pedido_db, c.name) for c in pedido_db.__table__.columns}
        itens_pedido = json.loads(pedido_dict.get("lista_itens", "[]") or "[]")

        payload_focus = _construir_payload_focus_nfe(config_empresa_db, pedido_dict, cliente_dict, itens_pedido, db)

        api_url = _get_api_url(config_empresa_db)
        auth = HTTPBasicAuth(config_empresa_db.focus_nfe_token, '')
        emission_url = f"{api_url}/v2/nfe?ref={pedido_db.id}"

        response = requests.post(emission_url, auth=auth, json=payload_focus)
        
        if response.status_code != 202:
            error_message = f"API retornou status {response.status_code}."
            try:
                if response.text:
                    resposta_api = response.json()
                    api_errors = resposta_api.get("erros", "Erro desconhecido da API")
                    error_message = json.dumps(api_errors)
                else:
                    error_message = f"API retornou status {response.status_code} sem corpo na resposta."
            except json.JSONDecodeError:
                logger.warning(f"A resposta da API não era um JSON válido. Corpo: {response.text}")
                error_message = response.text[:500]

            logger.error(f"Erro da API Focus NF-e ao emitir NF-e para pedido {pedido_db.id}: {error_message}")
            pedido_db.nfe_status = 'REJEITADO'
            pedido_db.nfe_rejeicao_motivo = error_message
            db.commit()
            raise HTTPException(status_code=response.status_code, detail=f"Erro de validação da API: {error_message}")

        pedido_db.nfe_status = 'PROCESSANDO'
        pedido_db.nfe_uuid = str(pedido_db.id)
        pedido_db.situacao_pedido = 'Em Processamento (NF-e)'
        db.commit()

        return {
            "status": "PROCESSANDO",
            "message": "NF-e enviada para processamento. Aguardando autorização da SEFAZ via webhook.",
            "ref": pedido_db.id
        }
    except requests.exceptions.RequestException as e:
        logger.exception(f"Erro de comunicação com a API Focus NF-e para o pedido {payload_input.pedido_id}.")
        raise HTTPException(status_code=502, detail=f"Erro de comunicação com a API de NF-e: {e}")
    except Exception as e:
        db.rollback()
        logger.exception(f"Erro fatal ao emitir NF-e para o pedido {payload_input.pedido_id}.")
        raise HTTPException(status_code=500, detail=f"Erro interno: {type(e).__name__} - {e}")

@router_nfe.post("/webhook")
async def nfe_webhook(request: Request, db: Session = Depends(get_db)):
    data = await request.json()
    logger.info(f"Webhook recebido da Focus NF-e: {data}")

    ref = data.get("ref")
    status_nfe = data.get("status")

    if not ref:
        logger.error("Webhook recebido sem 'ref'.")
        return Response(status_code=400, content="'ref' não fornecida")

    pedido = db.query(Pedido).filter(Pedido.nfe_uuid == str(ref)).first()
    if not pedido:
        logger.error(f"Pedido com referência {ref} não encontrado no banco de dados.")
        return Response(status_code=200, content="Pedido não encontrado, mas webhook processado.")

    if status_nfe == 'autorizado':
        pedido.nfe_status = 'AUTORIZADO'
        pedido.nfe_chave = data.get('chave_nfe')
        pedido.numero_nf = data.get('numero')
        pedido.serie_nfe = data.get('serie')
        pedido.nfe_protocolo = data.get('protocolo')
        pedido.data_nf = datetime.now()
        pedido.nfe_xml_path = data.get('caminho_xml_nota_fiscal')
        pedido.nfe_danfe_path = data.get('caminho_danfe')
        pedido.nfe_rejeicao_motivo = None
        logger.info(f"NF-e para pedido {pedido.id} (ref: {ref}) foi AUTORIZADA.")
    
    elif status_nfe == 'rejeitado':
        pedido.nfe_status = 'REJEITADO'
        pedido.nfe_rejeicao_motivo = data.get('motivo_sefaz')
        logger.warning(f"NF-e para pedido {pedido.id} (ref: {ref}) foi REJEITADA. Motivo: {data.get('motivo_sefaz')}")

    elif status_nfe == 'cancelado':
        pedido.nfe_status = 'CANCELADO'
        logger.info(f"NF-e para pedido {pedido.id} (ref: {ref}) foi CANCELADA.")
    else:
        logger.info(f"Status '{status_nfe}' recebido para ref {ref}, nenhuma ação necessária.")

    db.commit()
    return Response(status_code=200)

async def _proxy_download(pedido_id: int, file_type: str, db: Session):
    pedido = db.query(Pedido).filter(Pedido.id == pedido_id).first()
    
    path_attr = f"nfe_{file_type}_path"
    if not pedido or not getattr(pedido, path_attr, None):
        raise HTTPException(status_code=404, detail=f"{file_type.upper()} não encontrado para este pedido.")

    config_empresa_db = db.query(FocusConfiguracoes).first()
    if not config_empresa_db or not config_empresa_db.focus_nfe_token:
        raise HTTPException(status_code=500, detail="Token da Focus NF-e não configurado.")

    try:
        api_url = _get_api_url(config_empresa_db)
        file_path = getattr(pedido, path_attr)
        download_url = f"{api_url}{file_path}"
        
        auth = HTTPBasicAuth(config_empresa_db.focus_nfe_token, '')
        response = requests.get(download_url, auth=auth)
        response.raise_for_status()
        
        media_type = 'application/pdf' if file_type == 'danfe' else 'application/xml'
        filename = f"{file_type}-{pedido.nfe_chave or pedido.id}.{'pdf' if file_type == 'danfe' else 'xml'}"
        disposition = 'inline' if file_type == 'danfe' else 'attachment'

        return Response(content=response.content, media_type=media_type, headers={
            "Content-Disposition": f"{disposition}; filename={filename}"
        })
    except requests.exceptions.RequestException as e:
        logger.error(f"Falha ao buscar {file_type.upper()} da URL {download_url}: {e}")
        raise HTTPException(status_code=502, detail=f"Não foi possível buscar o {file_type.upper()} no momento.")

@router_nfe.get("/{pedido_id}/danfe")
async def download_danfe(pedido_id: int, db: Session = Depends(get_db)):
    return await _proxy_download(pedido_id, "danfe", db)

@router_nfe.get("/{pedido_id}/xml")
async def download_xml(pedido_id: int, db: Session = Depends(get_db)):
    return await _proxy_download(pedido_id, "xml", db)
