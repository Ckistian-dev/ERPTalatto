# controllers/nfe_controller.py
from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
import os
import json
import requests
import mysql.connector
import traceback
import uuid

# Carregar variáveis de ambiente
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()

# --- Configurações da API Tecnospeed ---
SANDBOX_URL = "https://api.sandbox.plugnotas.com.br"
SANDBOX_API_KEY = "2da392a6-79d2-4304-a8b7-959572c7e44d"

PLUGNOTAS_BASE_URL = os.getenv("PLUGNOTAS_BASE_URL", SANDBOX_URL)
PLUGNOTAS_API_KEY = "2da392a6-79d2-4304-a8b7-959572c7e44d"

if PLUGNOTAS_BASE_URL == SANDBOX_URL:
    PLUGNOTAS_API_KEY = SANDBOX_API_KEY
    print("INFO: Utilizando URL e Token de SANDBOX da Tecnospeed.")
else:
    PLUGNOTAS_API_KEY = os.getenv("PLUGNOTAS_TOKEN")
    print("INFO: Utilizando URL e Token de PRODUÇÃO/HOMOLOGAÇÃO da Tecnospeed.")
    if not PLUGNOTAS_API_KEY:
        print("ALERTA: PLUGNOTAS_TOKEN não definido para ambiente de produção/homologação.")

EMISSAO_EM_PRODUCAO = os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() == "true"

# --- Funções Auxiliares ---
def formatar_cep(cep: str) -> str:
    """Remove caracteres não numéricos do CEP e garante 8 dígitos."""
    if not cep:
        return ""
    cep_numeros = ''.join(filter(str.isdigit, str(cep)))
    return cep_numeros.zfill(8)[:8]

def formatar_cpf_cnpj(cpf_cnpj: str) -> str:
    """Remove caracteres não numéricos do CPF/CNPJ."""
    if not cpf_cnpj:
        return ""
    return ''.join(filter(str.isdigit, str(cpf_cnpj)))

def get_db_connection():
    """Estabelece e retorna uma conexão com o banco de dados."""
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            database=os.getenv("DB_NAME"),
            port=int(os.getenv("DB_PORT")),
            charset='utf8mb4',
            collation='utf8mb4_unicode_ci'
        )
        return conn
    except mysql.connector.Error as err:
        print(f"Erro ao conectar ao MySQL: {err}")
        raise HTTPException(status_code=503, detail=f"Erro de conexão com o banco de dados: {err}")

# --- Modelos Pydantic ---
class EmitirNfePayload(BaseModel):
    pedido_id: int

# --- Funções de Interação com a API Tecnospeed ---
def construir_payload_nfe_tecnospeed(pedido: dict, cliente_db: dict, itens_pedido: list, pagamentos_pedido_db: list) -> list:
    """
    Constrói o payload JSON para a NFe conforme as especificações da Tecnospeed.
    """
    id_integracao = f"PEDIDO_{pedido['id']}_{uuid.uuid4().hex[:8]}"
    data_emissao_str = datetime.now().astimezone().isoformat(timespec='seconds')
    cpf_cnpj_dest_formatado = formatar_cpf_cnpj(cliente_db.get("cpf_cnpj", ""))
    nome_destinatario_final = ""
    razao_social_destinatario_final = None
    indicador_ie_dest_final = 9
    inscricao_estadual_dest_final = None
    if len(cpf_cnpj_dest_formatado) == 11:
        nome_destinatario_final = cliente_db.get("nome_raza", "").strip()
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
        razao_social_destinatario_final = cliente_db.get("nome_raza", "").strip()
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

def enviar_para_tecnospeed(endpoint_path: str, method: str = "POST", data: list = None, params: dict = None) -> dict:
    """Função genérica para enviar requisições para a API Tecnospeed."""
    if not PLUGNOTAS_API_KEY:
        raise HTTPException(status_code=500, detail="Chave da API Tecnospeed (PLUGNOTAS_API_KEY) não configurada.")
    headers = {"Content-Type": "application/json", "X-API-KEY": PLUGNOTAS_API_KEY}
    url = f"{PLUGNOTAS_BASE_URL}{endpoint_path}"
    try:
        print(f"Enviando {method} para {url}")
        if data:
            print(f"Payload: {json.dumps(data, indent=2, ensure_ascii=False)}")
        if method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=60)
        elif method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params, timeout=30)
        else:
            raise ValueError("Método HTTP não suportado")
        print(f"Resposta da Tecnospeed ({response.status_code}):")
        try:
            response_json = response.json()
            print(json.dumps(response_json, indent=2, ensure_ascii=False))
        except json.JSONDecodeError:
            response_json = {"raw_text": response.text}
            print(response.text)
        response.raise_for_status()
        return response_json
    except requests.exceptions.HTTPError as http_err:
        error_detail_str = f"Erro HTTP da API Tecnospeed: {http_err.response.status_code} - {http_err.response.text}"
        print(error_detail_str)
        try:
            error_data_parsed = http_err.response.json()
            if isinstance(error_data_parsed, list) and error_data_parsed:
                first_error = error_data_parsed[0]
                if isinstance(first_error, dict) and "message" in first_error:
                    error_detail_str = first_error["message"]
            elif isinstance(error_data_parsed, dict):
                if "message" in error_data_parsed:
                    error_detail_str = error_data_parsed["message"]
                elif "Message" in error_data_parsed:
                    error_detail_str = error_data_parsed["Message"]
        except json.JSONDecodeError:
            pass
        raise HTTPException(status_code=http_err.response.status_code, detail=error_detail_str)
    except requests.exceptions.RequestException as req_err:
        error_detail_str = f"Erro na requisição para Tecnospeed: {req_err}"
        print(error_detail_str)
        raise HTTPException(status_code=503, detail=error_detail_str)


@router.post("/v2/nfe/emitir", tags=["NFe v2"])
async def emitir_nfe_v2(payload_input: EmitirNfePayload = Body(...)):
    pedido_id = payload_input.pedido_id
    conn = None
    cursor = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True, buffered=True)
        cursor.execute("SELECT * FROM pedidos WHERE id = %s", (pedido_id,))
        pedido_db = cursor.fetchone()
        if not pedido_db:
            raise HTTPException(status_code=404, detail=f"Pedido {pedido_id} não encontrado.")
        cursor.execute("SELECT * FROM cadastros WHERE id = %s", (pedido_db["cliente_id"],))
        cliente_db = cursor.fetchone()
        if not cliente_db:
            raise HTTPException(status_code=404, detail=f"Cliente ID {pedido_db['cliente_id']} não encontrado.")
        
        itens_pedido = json.loads(pedido_db["lista_itens"] or "[]")
        pagamentos_pedido = json.loads(pedido_db.get("lista_pagamentos") or "[]")

        payload_tecnospeed_list = construir_payload_nfe_tecnospeed(pedido_db, cliente_db, itens_pedido, pagamentos_pedido)
        
        print(f"Enviando NFe para Tecnospeed (Pedido ID: {pedido_id})...")
        resposta_envio = enviar_para_tecnospeed("/nfe", method="POST", data=payload_tecnospeed_list)
        
        id_nota_tecnospeed = None
        id_integracao_retornado = None
        status_inicial = "EM_PROCESSAMENTO"
        
        if isinstance(resposta_envio, list) and resposta_envio:
            document_info = resposta_envio[0]
            id_nota_tecnospeed = document_info.get("id")
            id_integracao_retornado = document_info.get("idIntegracao")
            status_inicial = document_info.get("status", status_inicial)
        elif isinstance(resposta_envio, dict) and resposta_envio.get("documents") and isinstance(resposta_envio["documents"], list) and resposta_envio["documents"]:
            document_info = resposta_envio["documents"][0]
            id_nota_tecnospeed = document_info.get("id")
            id_integracao_retornado = document_info.get("idIntegracao")
            status_inicial = document_info.get("status", status_inicial)
        
        if id_nota_tecnospeed:
            update_query = "UPDATE pedidos SET tecnospeed_id = %s, tecnospeed_id_integracao = %s, tecnospeed_status = %s, situacao_pedido = %s WHERE id = %s"
            cursor.execute(update_query, (id_nota_tecnospeed, id_integracao_retornado, status_inicial, 'Em Processamento (NF-e)', pedido_id))
            conn.commit()
            print(f"Pedido {pedido_id} atualizado no banco com ID Tecnospeed e status inicial.")
        
        return {"message": "NFe enviada para processamento.", "id_tecnospeed": id_nota_tecnospeed, "status_tecnospeed": status_inicial}

    except Exception as e:
        print(f"Erro inesperado ao emitir NFe para o pedido {pedido_id}: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar emissão da NFe: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.get("/v2/nfe/resumo/{id_tecnospeed}", tags=["NFe v2"])
async def consultar_resumo_nfe(id_tecnospeed: str):
    """
    Consulta o endpoint /resumo da PlugNotas e apenas retorna os dados.
    A atualização do banco de dados foi removida para ser controlada pelo frontend.
    """
    try:
        endpoint = f"/nfe/{id_tecnospeed}/resumo"
        print(f"Consultando resumo da NFe via BFF: {id_tecnospeed} no endpoint {endpoint}")
        
        resposta_resumo = enviar_para_tecnospeed(endpoint, method="GET")
        
        if isinstance(resposta_resumo, list) and len(resposta_resumo) > 0:
            return resposta_resumo[0]
        elif isinstance(resposta_resumo, dict) and resposta_resumo:
            return resposta_resumo
        else:
            raise HTTPException(
                status_code=404, 
                detail="Nenhum resumo encontrado para o ID fornecido ou formato de resposta inesperado."
            )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro inesperado ao consultar resumo da NFe {id_tecnospeed}: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro interno ao processar o resumo da NFe: {str(e)}")

