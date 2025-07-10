# controllers/nfe_controller.py

from fastapi import APIRouter, HTTPException, Body, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import os
import json
import requests
import traceback
import uuid
from fastapi.responses import StreamingResponse
from typing import Iterator
from dotenv import load_dotenv

load_dotenv()

from config.database import get_db
from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro

router = APIRouter()

# --- Configuração da API (sem alterações) ---
EMISSAO_EM_PRODUCAO = os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() == "true"
if EMISSAO_EM_PRODUCAO:
    PLUGNOTAS_BASE_URL = "https://api.plugnotas.com.br"
    PLUGNOTAS_API_KEY = os.getenv("PLUGNOTAS_PROD_KEY")
else:
    PLUGNOTAS_BASE_URL = "https://api.sandbox.plugnotas.com.br"
    PLUGNOTAS_API_KEY = os.getenv("PLUGNOTAS_SANDBOX_KEY")
if not PLUGNOTAS_API_KEY:
    raise RuntimeError("Chave da API PlugNotas não configurada.")

# --- Funções Auxiliares e Modelos Pydantic (sem alterações) ---
def formatar_cep(cep: str) -> str:
    if not cep: return ""
    return ''.join(filter(str.isdigit, str(cep))).zfill(8)[:8]

def formatar_cpf_cnpj(cpf_cnpj: str) -> str:
    if not cpf_cnpj: return ""
    return ''.join(filter(str.isdigit, str(cpf_cnpj)))

class EmitirNfePayload(BaseModel):
    pedido_id: int

def construir_payload_nfe_tecnospeed(pedido: dict, cliente_db: dict, itens_pedido: list, pagamentos_pedido_db: list) -> list:
    # (Seu código de construção de payload continua aqui, sem alterações)
    id_integracao = f"PEDIDO_{pedido['id']}_{uuid.uuid4().hex[:8]}"
    data_emissao_str = datetime.now().astimezone().isoformat(timespec='seconds')
    cpf_cnpj_dest_formatado = formatar_cpf_cnpj(cliente_db.get("cpf_cnpj", ""))
    nome_destinatario_final = ""
    razao_social_destinatario_final = None
    indicador_ie_dest_final = 9
    inscricao_estadual_dest_final = None
    if len(cpf_cnpj_dest_formatado) == 11:
        nome_destinatario_final = cliente_db.get("nome_razao", "").strip()
        cliente_indicador_ie_str = str(cliente_db.get("indicador_ie", "9")).strip()
        cliente_ie_str = str(cliente_db.get("rg_ie", "")).strip()
        if cliente_indicador_ie_str == "1" and cliente_ie_str:
            indicador_ie_dest_final = 1
            inscricao_estadual_dest_final = cliente_ie_str
        elif cliente_indicador_ie_str == "2":
            indicador_ie_dest_final = 2
        else:
            indicador_ie_dest_final = 9
    elif len(cpf_cnpj_dest_formatado) == 14:
        razao_social_destinatario_final = cliente_db.get("nome_razao", "").strip()
        nome_destinatario_final = cliente_db.get("fantasia") if cliente_db.get("fantasia") else razao_social_destinatario_final
        cliente_indicador_ie_str = str(cliente_db.get("indicador_ie", "9")).strip()
        cliente_ie_str = str(cliente_db.get("rg_ie", "")).strip()
        if cliente_indicador_ie_str == "1" and cliente_ie_str:
            indicador_ie_dest_final = 1
            inscricao_estadual_dest_final = cliente_ie_str
        elif cliente_indicador_ie_str == "2":
            indicador_ie_dest_final = 2
        else:
            indicador_ie_dest_final = 9
    else:
        nome_destinatario_final = "CONSUMIDOR NAO IDENTIFICADO"
        cpf_cnpj_dest_formatado = None
        indicador_ie_dest_final = 9

    is_consumidor_final = cliente_db.get("is_consumidor_final", (len(cpf_cnpj_dest_formatado) == 11 or not cpf_cnpj_dest_formatado))
    tipo_presencial = int(pedido.get("tipo_presencial", 1))
    
    payload_nfe = {
        "idIntegracao": id_integracao, "natureza": pedido.get("natureza_operacao", "VENDA DE MERCADORIA").strip() or "VENDA DE MERCADORIA",
        "identificacao": {"modelo": 55, "serie": int(pedido.get("serie_nfe", 1)), "numero": int(pedido.get("numero_nfe", 0)), "dataEmissao": data_emissao_str, "tipoOperacao": int(pedido.get("tipo_operacao", 1)), "finalidade": int(pedido.get("finalidade_nfe", 1)), "ambiente": 1 if EMISSAO_EM_PRODUCAO else 2},
        "emitente": {"cpfCnpj": formatar_cpf_cnpj(os.getenv("EMIT_CNPJ")), "razaoSocial": os.getenv("EMIT_RAZAO_SOCIAL"), "nomeFantasia": os.getenv("EMIT_NOME_FANTASIA", os.getenv("EMIT_RAZAO_SOCIAL")), "inscricaoEstadual": os.getenv("EMIT_IE"), "inscricaoMunicipal": os.getenv("EMIT_IM"), "cnae": os.getenv("EMIT_CNAE"), "crt": int(os.getenv("EMIT_CRT", 1)), "endereco": {"logradouro": os.getenv("EMIT_LOGRADOURO"), "numero": os.getenv("EMIT_NUMERO"), "complemento": os.getenv("EMIT_COMPLEMENTO", ""), "bairro": os.getenv("EMIT_BAIRRO"), "codigoCidade": os.getenv("EMIT_CODIGO_MUNICIPIO_IBGE"), "cidade": os.getenv("EMIT_CIDADE"), "uf": os.getenv("EMIT_UF"), "cep": formatar_cep(os.getenv("EMIT_CEP")), "pais": os.getenv("EMIT_PAIS", "Brasil"), "codigoPais": os.getenv("EMIT_CODIGO_PAIS", "1058")}},
        "destinatario": {"cpfCnpj": cpf_cnpj_dest_formatado, "razaoSocial": razao_social_destinatario_final, "nome": nome_destinatario_final, "email": cliente_db.get("email", ""), "indicadorIEDestinatario": indicador_ie_dest_final, "inscricaoEstadual": inscricao_estadual_dest_final, "endereco": {"logradouro": cliente_db.get("rua", "Rua Não Informada"), "numero": cliente_db.get("numero", "S/N"), "complemento": cliente_db.get("complemento", ""), "bairro": cliente_db.get("bairro", "Bairro Não Informado"), "codigoCidade": cliente_db.get("codigo_ibge_cidade"), "cidade": cliente_db.get("cidade", "Cidade Não Informada"), "uf": cliente_db.get("estado", "XX"), "cep": formatar_cep(cliente_db.get("cep")), "pais": cliente_db.get("pais", "Brasil"), "codigoPais": cliente_db.get("codigo_pais", "1058")}},
        "itens": [], "transporte": {"modalidadeFrete": int(pedido.get("modalidade_frete", 9))}, "pagamentos": [], "informacoesAdicionais": {"fisco": pedido.get("info_fisco", ""), "contribuinte": pedido.get("info_contribuinte", f"Pedido: {pedido['id']}")}, "presencial": tipo_presencial, "consumidorFinal": is_consumidor_final
    }
    valor_total_produtos_decimal = Decimal("0.00")
    for i, item_db in enumerate(itens_pedido):
        quantidade = Decimal(str(item_db.get("quantidade_itens", "0")))
        valor_unitario_comercial = Decimal(str(item_db.get("valor_unitario", item_db.get("valorUnitarioComercial", "0"))))
        if valor_unitario_comercial == Decimal("0.00") and quantidade > Decimal("0.00"):
            subtotal_item_db = Decimal(str(item_db.get("subtotal", "0")))
            if subtotal_item_db > Decimal("0.00"):
                valor_unitario_comercial = (subtotal_item_db / quantidade).quantize(Decimal('0.0000000001'), rounding=ROUND_HALF_UP)
        subtotal_calculado = (quantidade * valor_unitario_comercial).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
        valor_total_produtos_decimal += subtotal_calculado
        emit_crt = int(os.getenv("EMIT_CRT", 1))
        icms_data = {"origem": str(item_db.get("icms_origem", os.getenv("ITEM_ICMS_ORIGEM_PADRAO", "0")))}
        if emit_crt == 1:
            icms_data["cst"] = str(item_db.get("icms_csosn", os.getenv("ITEM_ICMS_CSOSN_PADRAO", "102")))
        else:
            icms_data["cst"] = str(item_db.get("icms_cst", os.getenv("ITEM_ICMS_CST_PADRAO", "00")))
            if icms_data["cst"] == "00":
                icms_data["baseCalculo"] = float(subtotal_calculado)
                icms_data["aliquota"] = float(item_db.get("icms_aliquota", os.getenv("ITEM_ICMS_ALIQUOTA_PADRAO", "18.0")))
                icms_data["valor"] = round(float(subtotal_calculado * Decimal(str(icms_data["aliquota"])) / 100), 2)
        item_nfe = {
            "numeroItem": i + 1, "codigo": str(item_db.get("produto_id_ou_codigo_interno", item_db.get("codigo", f"PROD_{item_db.get('produto_id','UNK')}"))),
            "descricao": item_db.get("produto", item_db.get("descricao", "Produto sem descrição")), "ncm": str(item_db.get("ncm", "00000000")).replace(".", ""),
            "cfop": str(item_db.get("cfop", "5102")), "unidadeComercial": item_db.get("unidade", item_db.get("unidadeComercial", "UN")),
            "quantidadeComercial": float(quantidade), "valorUnitarioComercial": round(float(valor_unitario_comercial), 10), "valorBruto": float(subtotal_calculado),
            "tributos": {"icms": icms_data, "pis": {"cst": str(item_db.get("pis_cst", os.getenv("ITEM_PIS_CST_PADRAO", "07")))}, "cofins": {"cst": str(item_db.get("cofins_cst", os.getenv("ITEM_COFINS_CST_PADRAO", "07")))}}
        }
        payload_nfe["itens"].append(item_nfe)
    total_desconto_decimal = Decimal(str(pedido.get("desconto_total", "0.00"))).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
    total_frete_decimal = Decimal(str(pedido.get("valor_frete", "0.00"))).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
    valor_final_nota_decimal = (valor_total_produtos_decimal - total_desconto_decimal + total_frete_decimal).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
    soma_valores_pagamento_decimal = Decimal("0.00")
    payload_nfe["pagamentos"] = []
    for pag_db in pagamentos_pedido_db:
        valor_pagamento_item = Decimal(str(pag_db.get("valor", "0.00"))).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
        pagamento_nfe_item = {"meio": str(pag_db.get("meio_pagamento_codigo_tecnospeed", pag_db.get("meio", "01"))), "valorPagamento": float(valor_pagamento_item)}
        payload_nfe["pagamentos"].append(pagamento_nfe_item)
        soma_valores_pagamento_decimal += valor_pagamento_item
    if not payload_nfe["pagamentos"] and valor_final_nota_decimal > Decimal("0.00"):
        pagamento_padrao = {"meio": "90", "valorPagamento": float(valor_final_nota_decimal)}
        payload_nfe["pagamentos"].append(pagamento_padrao)
    troco_total_calculado_decimal = (soma_valores_pagamento_decimal - valor_final_nota_decimal).quantize(Decimal('0.02'), rounding=ROUND_HALF_UP)
    if troco_total_calculado_decimal > Decimal("0.00"):
        payload_nfe["valorTroco"] = float(troco_total_calculado_decimal)
    if total_frete_decimal > Decimal("0.00"):
        payload_nfe["transporte"]["valorFrete"] = float(total_frete_decimal)
    return [payload_nfe]

def enviar_para_tecnospeed(endpoint_path: str, method: str, data=None, params=None, stream=False):
    """Função genérica para enviar requisições à API da PlugNotas."""
    headers = {"x-api-key": PLUGNOTAS_API_KEY}
    if not stream:
        headers["Content-Type"] = "application/json"
    
    url = f"{PLUGNOTAS_BASE_URL}{endpoint_path}"
    try:
        response = requests.request(method, url, headers=headers, json=data, params=params, stream=stream, timeout=60)
        response.raise_for_status()
        return response
    except requests.exceptions.HTTPError as e:
        raise HTTPException(status_code=e.response.status_code, detail=e.response.text)
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Erro de comunicação com o serviço de NF-e: {e}")

# --- Endpoints ---

@router.post("/v2/nfe/emitir", tags=["NFe v2"])
def emitir_nfe_v2(payload_input: EmitirNfePayload, db: Session = Depends(get_db)):
    pedido_id = payload_input.pedido_id
    try:
        pedido_db = db.query(Pedido).filter(Pedido.id == pedido_id).first()
        if not pedido_db: raise HTTPException(status_code=404, detail=f"Pedido {pedido_id} não encontrado.")
        cliente_db = db.query(Cadastro).filter(Cadastro.id == pedido_db.cliente_id).first()
        if not cliente_db: raise HTTPException(status_code=404, detail=f"Cliente ID {pedido_db.cliente_id} não encontrado.")
        
        pedido_dict = {c.name: getattr(pedido_db, c.name) for c in pedido_db.__table__.columns}
        cliente_dict = {c.name: getattr(cliente_db, c.name) for c in cliente_db.__table__.columns}
        
        itens_pedido = json.loads(pedido_dict.get("lista_itens", "[]"))
        pagamentos_pedido = json.loads(pedido_dict.get("formas_pagamento", "[]"))

        payload_tecnospeed = construir_payload_nfe_tecnospeed(pedido_dict, cliente_dict, itens_pedido, pagamentos_pedido)
        
        # CORREÇÃO: Removido /v2. A rota correta da API externa é /nfe
        response_obj = enviar_para_tecnospeed("/nfe", method="POST", data=payload_tecnospeed)
        resposta_envio = response_obj.json()
        
        doc_info = (resposta_envio[0] if isinstance(resposta_envio, list) and resposta_envio else 
                    (resposta_envio.get("documents", [{}])[0] if isinstance(resposta_envio, dict) else {}))
        
        id_nota = doc_info.get("id")
        if id_nota:
            pedido_db.tecnospeed_id = id_nota
            pedido_db.tecnospeed_id_integracao = doc_info.get("idIntegracao")
            pedido_db.tecnospeed_status = doc_info.get("status", "EM_PROCESSAMENTO")
            pedido_db.situacao_pedido = 'Em Processamento (NF-e)'
            db.commit()
        
        return {"message": "NFe enviada para processamento.", "tecnospeed_id": id_nota, "tecnospeed_status": pedido_db.tecnospeed_status}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar emissão da NFe: {e}")

@router.get("/v2/nfe/resumo/{id_tecnospeed}", tags=["NFe v2"])
def consultar_resumo_nfe(id_tecnospeed: str):
    """Consulta o resumo de uma NF-e para verificar status, número, etc."""
    try:
        # CORREÇÃO: Removido /v2. A rota correta da API externa é /nfe/{id}/resumo
        endpoint = f"/nfe/{id_tecnospeed}/resumo"
        response = enviar_para_tecnospeed(endpoint, method="GET")
        resposta_json = response.json()
        return resposta_json[0] if isinstance(resposta_json, list) and resposta_json else resposta_json
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno ao consultar resumo da NFe: {str(e)}")

# --- Endpoints de Download (Lógica Corrigida) ---

@router.get("/nfe/{nfe_id}/danfe", tags=["NFe Documentos"])
def download_danfe(nfe_id: str):
    """Busca o PDF da NFe diretamente e transmite o arquivo para o navegador."""
    # CORREÇÃO: Removido /v2. A rota correta da API externa é /nfe/pdf/{id}
    pdf_endpoint = f"/nfe/{nfe_id}/pdf"
    try:
        response = enviar_para_tecnospeed(pdf_endpoint, method="GET", stream=True)
        return StreamingResponse(
            response.iter_content(chunk_size=8192), 
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=danfe_{nfe_id}.pdf"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o DANFE: {str(e)}")

@router.get("/nfe/{nfe_id}/xml", tags=["NFe Documentos"])
def download_xml(nfe_id: str):
    """Busca o XML da NFe diretamente e transmite o arquivo para o navegador."""
    # CORREÇÃO: Removido /v2. A rota correta da API externa é /nfe/xml/{id}
    xml_endpoint = f"/nfe/{nfe_id}/xml"
    try:
        response = enviar_para_tecnospeed(xml_endpoint, method="GET", stream=True)
        return StreamingResponse(
            response.iter_content(chunk_size=8192), 
            media_type="application/xml",
            headers={"Content-Disposition": f"attachment; filename=nfe_{nfe_id}.xml"}
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o XML: {str(e)}")

