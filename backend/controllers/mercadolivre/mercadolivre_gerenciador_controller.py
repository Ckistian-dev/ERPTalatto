import os
import traceback
import mysql.connector.pooling
import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import httpx
from datetime import datetime
import json
import re

# Importações do seu projeto
from config.database import get_db
from services.meli_service import MeliAPIService
from models.mercadolivre_model import MeliCredentials
from models.configuracao_meli_model import MeliConfiguracao

# ===================================================================
# SCHEMAS
# ===================================================================

class AnuncioPayload(BaseModel):
    erp_product_id: int
    ml_listing_id: Optional[str] = None
    form_data: Dict[str, Any]
    
class AnswerPayload(BaseModel):
    text: str
    
class VincularPayload(BaseModel):
    ml_item_id: str
    erp_product_sku: str
    
class OrderStatusCheckPayload(BaseModel):
    order_ids: List[int]


# Pool de conexão para buscar produtos do ERP
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="meli_gerenciador_pool",
    pool_size=5,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

router = APIRouter(
    prefix="/mercadolivre",
    tags=["Mercado Livre - Gerenciamento"]
)

@router.get("/status", summary="Verifica o status da conexão com o Mercado Livre")
async def get_integration_status(db: Session = Depends(get_db)):
    try:
        credentials = db.query(MeliCredentials).first()
        if not credentials:
            return { "status": "desconectado" }
        try:
            meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
            user_info = await meli_service.get_user_info()
            return {
                "status": "conectado",
                "user_id": user_info.get("id"),
                "nickname": user_info.get("nickname"),
                "email": user_info.get("email")
            }
        except HTTPException as e:
            return { "status": "erro_conexao", "detail": e.detail }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro interno: {e}")

@router.get("/anuncios", summary="Lista anúncios do ML e os vincula com produtos do ERP")
async def get_ml_listings_with_erp_link(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    offset = (page - 1) * limit
    
    try:
        search_results = await meli_service.get_seller_items_paged(limit=limit, offset=offset)
        ml_listings = search_results.get("results", [])
        total_ml = search_results.get("paging", {}).get("total", 0)

        # ===================================================================
        # PONTO DE DEPURAÇÃO 1: VER O QUE VEIO DO MERCADO LIVRE
        # ===================================================================
        print("\n" + "="*80)
        print("|| PONTO 1: DADOS BRUTOS RECEBIDOS DO MERCADO LIVRE ||")
        print(f"Total de {len(ml_listings)} anúncios encontrados nesta página.")
        print(json.dumps(ml_listings, indent=2, ensure_ascii=False))
        print("="*80 + "\n")
        # ===================================================================

        if not ml_listings:
            return {"total": 0, "resultados": []}

        # LÓGICA DE COLETA DE SKU FINAL E CORRIGIDA
        skus_to_find = set()
        for item in ml_listings:
            main_sku = item.get("seller_sku") or item.get("seller_custom_field")
            if main_sku:
                skus_to_find.add(str(main_sku))
            for variation in item.get("variations", []):
                variation_sku = variation.get("seller_sku") or variation.get("seller_custom_field")
                if variation_sku:
                    skus_to_find.add(str(variation_sku))
        skus_to_find = list(skus_to_find)
        
        # ===================================================================
        # PONTO DE DEPURAÇÃO 2: VER A LISTA DE SKUs A SEREM BUSCADOS
        # ===================================================================
        print("\n" + "="*80)
        print("|| PONTO 2: LISTA DE SKUs COLETADOS DOS ANÚNCIOS ||")
        print(skus_to_find)
        print("="*80 + "\n")
        # ===================================================================

        erp_products_map = {}
        if skus_to_find:
            conn = pool.get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                format_strings = ','.join(['%s'] * len(skus_to_find))
                query = f"SELECT id, sku, descricao FROM produtos WHERE sku IN ({format_strings})"
                cursor.execute(query, tuple(skus_to_find))
                erp_products = cursor.fetchall()

                # ===================================================================
                # PONTO DE DEPURAÇÃO 3: VER O QUE O BANCO DE DADOS DO ERP RETORNOU
                # ===================================================================
                print("\n" + "="*80)
                print(f"|| PONTO 3: RESPOSTA DA CONSULTA AO BANCO DE DADOS DO ERP (query: {query}) ||")
                print(f"Total de {len(erp_products)} produtos encontrados no ERP com os SKUs correspondentes.")
                print(erp_products)
                print("="*80 + "\n")
                # ===================================================================

                for product in erp_products:
                    erp_products_map[product['sku']] = product
            finally:
                cursor.close()
                conn.close()

        resultados_combinados = []
        # ===================================================================
        # PONTO DE DEPURAÇÃO 4: VER A COMBINAÇÃO FINAL, ITEM POR ITEM
        # ===================================================================
        print("\n" + "="*80)
        print("|| PONTO 4: RESULTADO DA VINCULAÇÃO ITEM A ITEM ||")
        # ===================================================================
        for ml_listing in ml_listings:
            sku = ml_listing.get("seller_sku") or ml_listing.get("seller_custom_field")
            erp_product = erp_products_map.get(str(sku))
            
            if not erp_product:
                 for variation in ml_listing.get("variations", []):
                    variation_sku = variation.get("seller_sku") or variation.get("seller_custom_field")
                    if variation_sku and erp_products_map.get(str(variation_sku)):
                        erp_product = erp_products_map.get(str(variation_sku))
                        sku = variation_sku # Atualiza o SKU para o da variação encontrada
                        break

            print(f"--- Anúncio ML: '{ml_listing.get('title')}' (SKU encontrado: {sku}) ---")
            if erp_product:
                print(f"Produto ERP Vinculado: {erp_product}")
            else:
                print("Produto ERP Vinculado: None")

            resultados_combinados.append({
                "ml_listing": ml_listing,
                "erp_product": erp_product
            })
        print("="*80 + "\n")
        
        return {
            "total": total_ml,
            "resultados": resultados_combinados
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar anúncios combinados: {e}")

# ... (O resto do seu arquivo controller continua aqui, sem alterações) ...
# ... (get_initial_listing_config, search_categories_by_term, etc.)

@router.get("/anuncios/configuracoes-iniciais", summary="Busca dados iniciais para configurar um anúncio")
async def get_initial_listing_config(erp_product_id: int, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, sku, descricao, tabela_precos, url_imagem FROM produtos WHERE id = %s", (erp_product_id,))
        erp_product = cursor.fetchone()
        if not erp_product:
            raise HTTPException(status_code=404, detail="Produto do ERP não encontrado.")
    finally:
        cursor.close()
        conn.close()

    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        suggested_categories, listing_types = await asyncio.gather(
            meli_service.search_categories(erp_product['descricao'], limit=3),
            meli_service.get_listing_types()
        )

        return {
            "erp_product": erp_product,
            "suggested_categories": suggested_categories,
            "listing_types": listing_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar configurações do ML: {e}")


@router.get("/categorias/buscar", summary="Busca categorias por termo")
async def search_categories_by_term(q: str, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")

    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    categories = await meli_service.search_categories(title=q, limit=8)
    return categories

@router.get("/categorias/{category_id}/atributos", summary="Busca atributos de uma categoria específica")
async def get_attributes_for_category(category_id: str, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    attributes = await meli_service.get_category_attributes(category_id)
    return attributes

@router.post("/anuncios", summary="Publica ou atualiza um anúncio no Mercado Livre")
async def publish_listing(payload: AnuncioPayload, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT sku FROM produtos WHERE id = %s", (payload.erp_product_id,))
        erp_product = cursor.fetchone()
        if not erp_product or not erp_product.get('sku'):
            raise HTTPException(status_code=404, detail="Produto ou SKU do ERP não encontrado.")
        payload.form_data['seller_sku'] = erp_product['sku']
    finally:
        cursor.close()
        conn.close()

    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        result = await meli_service.publish_or_update_item(
            item_payload=payload.form_data,
            meli_item_id=payload.ml_listing_id
        )
        return {"message": "Anúncio salvo com sucesso!", "data": result}
    except HTTPException as e:
        raise e
    
@router.get("/pedidos", summary="Lista os pedidos recentes do Mercado Livre")
async def get_meli_orders(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    offset = (page - 1) * limit
    
    try:
        orders_data = await meli_service.get_recent_orders(limit=limit, offset=offset)
        
        return {
            "total": orders_data.get("paging", {}).get("total", 0),
            "resultados": orders_data.get("results", [])
        }
    except HTTPException as e:
        raise e
    
async def _find_or_create_customer(ml_order: dict, shipment_details: dict) -> dict:
    receiver_identification = shipment_details.get('receiver_identification', {})
    doc_number = receiver_identification.get('number')
    doc_type = receiver_identification.get('type')

    if not doc_number:
        print("AVISO: Documento (CPF/CNPJ) não encontrado no shipment. Usando fallback: ML + ID do comprador.")
        doc_number = f"ML{ml_order['buyer']['id']}"
        doc_type = 'outros'

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nome_razao FROM cadastros WHERE cpf_cnpj = %s", (doc_number,))
        existing_customer = cursor.fetchone()
        if existing_customer:
            return existing_customer

        print(f"Cliente com documento {doc_number} não encontrado. Criando novo cadastro...")
        
        shipping_address = shipment_details.get('receiver_address', {})
        cep = shipping_address.get('zip_code', '').replace('-', '')
        numero_ml = shipping_address.get('street_number') or 'S/N'
        complemento_ml = shipping_address.get('comment')
        
        address_from_cep = {}
        if cep and len(cep) == 8:
            print(f"Consultando ViaCEP para o CEP: {cep}...")
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"https://viacep.com.br/ws/{cep}/json/")
                    response.raise_for_status()
                    cep_data = response.json()
                    
                    if not cep_data.get('erro'):
                        address_from_cep = {
                            "logradouro": cep_data.get('logradouro'),
                            "bairro": cep_data.get('bairro'),
                            "cidade": cep_data.get('localidade'),
                            "estado": cep_data.get('uf'),
                            "codigo_ibge_cidade": cep_data.get('ibge')
                        }
            except Exception as e:
                print(f"AVISO: Falha ao consultar ViaCEP para o CEP {cep}. Erro: {e}")

        uf_cliente = address_from_cep.get('estado')
        regiao_cliente = None

        if uf_cliente:
            sul = ['PR', 'SC', 'RS']
            sudeste = ['SP', 'RJ', 'ES', 'MG']
            centro_oeste = ['GO', 'MT', 'MS', 'DF']
            nordeste = ['BA', 'SE', 'AL', 'PE', 'PB', 'RN', 'CE', 'PI', 'MA']
            norte = ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO']

            if uf_cliente in sul:
                regiao_cliente = 'Sul'
            elif uf_cliente in sudeste:
                regiao_cliente = 'Sudeste'
            elif uf_cliente in centro_oeste:
                regiao_cliente = 'Centro-Oeste'
            elif uf_cliente in nordeste:
                regiao_cliente = 'Nordeste'
            elif uf_cliente in norte:
                regiao_cliente = 'Norte'

        new_customer_payload = {
            "nome_razao": f"{ml_order['buyer'].get('first_name', '')} {ml_order['buyer'].get('last_name', '')}".strip(),
            "tipo_pessoa": "Pessoa Jurídica" if doc_type == 'CNPJ' else "Pessoa Física",
            "tipo_cadastro": "Cliente",
            "celular": "55" + str(shipping_address.get('receiver_phone', '')),
            "email": f"ml_cliente_{ml_order['buyer']['id']}@email.com",
            "cpf_cnpj": doc_number,
            "logradouro": address_from_cep.get('logradouro') or 'Não informado',
            "numero": numero_ml,
            "complemento": complemento_ml,
            "bairro": address_from_cep.get('bairro') or 'Não informado',
            "cep": cep,
            "cidade": address_from_cep.get('cidade') or 'Não informada',
            "estado": address_from_cep.get('estado') or 'NI',
            "codigo_ibge_cidade": address_from_cep.get('codigo_ibge_cidade'),
            "regiao": regiao_cliente,
            "situacao": "Ativo",
            "indicador_ie": "9"
        }

        columns = ", ".join(f"`{k}`" for k in new_customer_payload.keys())
        placeholders = ", ".join(["%s"] * len(new_customer_payload))
        values = list(new_customer_payload.values())
        cursor.execute(f"INSERT INTO cadastros ({columns}) VALUES ({placeholders})", values)
        new_customer_id = cursor.lastrowid
        conn.commit()
        return {"id": new_customer_id, "nome_razao": new_customer_payload["nome_razao"]}
    finally:
        cursor.close()
        conn.close()


async def _transform_ml_order_to_erp_pedido(ml_order: dict, meli_service: MeliAPIService, db: Session) -> dict:
    config = db.query(MeliConfiguracao).filter(MeliConfiguracao.id == 1).first()
    if not config:
        raise HTTPException(status_code=500, detail="Configurações da integração não encontradas.")

    shipment_details = await meli_service.get_shipment_details(ml_order['shipping']['id'])
    
    customer_erp = await _find_or_create_customer(
        ml_order=ml_order,
        shipment_details=shipment_details
    )

    lista_itens_erp = []
    for item_ml in ml_order.get('order_items', []):
        sku = item_ml.get('item', {}).get('seller_sku')
        if not sku:
            raise HTTPException(status_code=400, detail=f"Item '{item_ml.get('item', {}).get('title')}' está sem SKU.")
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id, descricao FROM produtos WHERE sku = %s", (sku,))
            produto_erp = cursor.fetchone()
            if not produto_erp:
                raise HTTPException(status_code=404, detail=f"Produto com SKU '{sku}' não encontrado no ERP.")
        finally:
            cursor.close()
            conn.close()
        
        produto_nome_final = produto_erp['descricao']
        variation_attrs = item_ml.get('item', {}).get('variation_attributes', [])
        if variation_attrs:
            variacao_str = ", ".join([f"{attr['value_name']}" for attr in variation_attrs])
            produto_nome_final = f"{produto_erp['descricao']} ({variacao_str})"

        lista_itens_erp.append({
            "produto_id": produto_erp['id'],
            "produto": produto_nome_final,
            "quantidade_itens": item_ml['quantity'],
            "tabela_preco_id": "PADRAO", "tabela_preco": "PADRAO",
            "subtotal": float(item_ml['unit_price']) * item_ml['quantity']
        })

    data_obj = datetime.fromisoformat(ml_order['date_created'].replace('Z', '+00:00'))
    data_emissao_formatada = data_obj.strftime('%d/%m/%Y')
    
    print("\n--- [DEPURAÇÃO] Formatação de Data ---")
    print(f"Data Original: {ml_order['date_created']}, Data Formatada: {data_emissao_formatada}")

    formas_pagamento_erp = []
    tipo_map = {
        'credit_card': 'Parcelamento',
        'pix': 'Pix',
        'bank_transfer': 'Pix',
        'ticket': 'Boleto',
        'account_money': 'Dinheiro'
    }

    for p in ml_order.get('payments', []):
        erp_tipo = tipo_map.get(p.get('payment_type'), 'Outro')
        forma_pagamento = {
            "tipo": erp_tipo,
            "valor_pix": 0.0,
            "valor_boleto": 0.0,
            "valor_dinheiro": 0.0,
            "parcelas": 1,
            "valor_parcela": 0.0
        }
        if erp_tipo == 'Parcelamento':
            forma_pagamento['parcelas'] = p.get('installments') or 1
            forma_pagamento['valor_parcela'] = float(p.get('installment_amount') or 0.0)
        elif erp_tipo == 'Pix':
            forma_pagamento['valor_pix'] = float(p.get('total_paid_amount') or 0.0)
        elif erp_tipo == 'Boleto':
            forma_pagamento['valor_boleto'] = float(p.get('total_paid_amount') or 0.0)
        elif erp_tipo == 'Dinheiro':
            forma_pagamento['valor_dinheiro'] = float(p.get('total_paid_amount') or 0.0)
        formas_pagamento_erp.append(forma_pagamento)

    print("\n--- [DEPURAÇÃO] Estrutura Final de Pagamentos ---")
    print(json.dumps(formas_pagamento_erp, indent=2, ensure_ascii=False))
    print("-------------------------------------------\n")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT nome_razao FROM cadastros WHERE id = %s", (config.vendedor_padrao_id,))
        vendedor_erp = cursor.fetchone()
        vendedor_nome_erp = vendedor_erp['nome_razao'] if vendedor_erp else "Vendedor Padrão"
    finally:
        cursor.close()
        conn.close()

    pedido_erp_payload = {
        "data_emissao": data_emissao_formatada,
        "data_validade": data_emissao_formatada,
        "cliente_id": customer_erp['id'], "cliente_nome": customer_erp['nome_razao'],
        "vendedor_id": config.vendedor_padrao_id, "vendedor_nome": vendedor_nome_erp,
        "transportadora_id": 0,
        "transportadora_nome": shipment_details.get('name', 'A definir'),
        "origem_venda": "Mercado Livre",
        "lista_itens": lista_itens_erp,
        "total": float(ml_order['total_amount']),
        "desconto_total": float(ml_order.get('coupon', {}).get('amount', 0)),
        "total_com_desconto": float(ml_order['total_amount']),
        "tipo_frete": shipment_details.get('shipping_mode', 'A definir'),
        "valor_frete": float(shipment_details.get('order_cost', 0) if shipment_details.get('mode') == 'custom' else shipment_details.get('base_cost', 0)),
        "formas_pagamento": formas_pagamento_erp,
        "observacao": f"Pedido importado do Mercado Livre. ID ML: {ml_order['id']}. Comprador: {ml_order['buyer']['nickname']}",
        "situacao_pedido": config.situacao_pedido_inicial
    }
    return pedido_erp_payload

async def _check_if_order_exists_in_obs(order_id: int) -> bool:
    conn = pool.get_connection()
    cursor = conn.cursor()
    try:
        search_pattern = f"%ID ML: {order_id}%"
        query = "SELECT COUNT(id) FROM pedidos WHERE observacao LIKE %s"
        cursor.execute(query, (search_pattern,))
        count = cursor.fetchone()[0]
        return count > 0
    finally:
        cursor.close()
        conn.close()

@router.post("/pedidos/{order_id}/importar", summary="Importa um pedido do ML para o ERP")
async def import_meli_order_to_erp(order_id: int, db: Session = Depends(get_db)):
    already_imported = await _check_if_order_exists_in_obs(order_id)
    if already_imported:
        print(f"Tentativa de re-importar pedido já existente: {order_id}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"O pedido do Mercado Livre #{order_id} já foi importado anteriormente."
        )

    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        ml_order = await meli_service.get_order_details(order_id)
        
        print("\n" + "="*80)
        print(f"||  DEPURAÇÃO: DADOS BRUTOS RECEBIDOS DO PEDIDO ML #{order_id}  ||")
        print("="*80)
        print(json.dumps(ml_order, indent=2, ensure_ascii=False))
        print("\n" + "-"*40)
        print("FOCO NO OBJETO 'buyer':")
        print(json.dumps(ml_order.get('buyer'), indent=2, ensure_ascii=False))
        print("\n" + "-"*40)
        print("FOCO NO OBJETO 'shipping' (ENDEREÇO DE ENTREGA):")
        print(json.dumps(ml_order.get('shipping'), indent=2, ensure_ascii=False))
        print("\n" + "="*80)
        print("|| FIM DA DEPURAÇÃO ||")
        print("="*80 + "\n")

        erp_pedido_payload = await _transform_ml_order_to_erp_pedido(ml_order, meli_service, db)
        
        async with httpx.AsyncClient() as client:
            api_host = os.getenv("API_HOST", "http://localhost:8000")
            response = await client.post(f"{api_host}/pedidos", json=erp_pedido_payload)
            
            if response.status_code != 201:
                   raise HTTPException(status_code=response.status_code, detail=f"Erro ao criar pedido no ERP: {response.text}")

        return {"message": "Pedido importado para o ERP com sucesso!", "erp_pedido": response.json()}
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao importar pedido: {str(e)}")
    
@router.delete("/credentials", summary="Desconecta a integração e remove os tokens")
def disconnect_integration(db: Session = Depends(get_db)):
    try:
        credentials = db.query(MeliCredentials).first()
        
        if credentials:
            db.delete(credentials)
            db.commit()
        
        return {"message": "Integração desconectada com sucesso."}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desconectar a integração: {e}"
        )
        
@router.get("/perguntas", summary="Lista as perguntas não respondidas do Mercado Livre")
async def get_meli_questions(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    offset = (page - 1) * limit
    
    try:
        questions_data = await meli_service.get_unanswered_questions(limit=limit, offset=offset)
        
        return {
            "total": questions_data.get("total", 0),
            "resultados": questions_data.get("questions", [])
        }
    except HTTPException as e:
        raise e

@router.post("/perguntas/{question_id}/responder", summary="Envia uma resposta para uma pergunta")
async def post_meli_answer(
    question_id: int,
    payload: AnswerPayload,
    db: Session = Depends(get_db)
):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        answer_response = await meli_service.post_answer(question_id=question_id, text=payload.text)
        return {"message": "Resposta enviada com sucesso!", "data": answer_response}
    except HTTPException as e:
        raise e
    
@router.post("/anuncios/vincular", summary="Vincula um anúncio do ML a um produto do ERP")
async def link_item_to_product(payload: VincularPayload, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        result = await meli_service.update_item_sku(
            meli_item_id=payload.ml_item_id,
            sku=payload.erp_product_sku
        )
        return {"message": "Anúncio vinculado com sucesso.", "data": result}
    except HTTPException as e:
        raise e
    
@router.post("/pedidos/verificar-status-importacao", summary="Verifica quais IDs de pedidos do ML já foram importados")
async def check_imported_orders_status(payload: OrderStatusCheckPayload):
    if not payload.order_ids:
        return {"imported_ids": []}

    conn = pool.get_connection()
    cursor = conn.cursor()
    imported_ids_found = set()
    
    try:
        where_clauses = " OR ".join(["observacao LIKE %s"] * len(payload.order_ids))
        query = f"SELECT observacao FROM pedidos WHERE {where_clauses}"
        
        search_patterns = tuple(f"%ID ML: {order_id}%" for order_id in payload.order_ids)
        
        cursor.execute(query, search_patterns)
        results = cursor.fetchall()
        
        for row in results:
            observacao = row[0]
            match = re.search(r"ID ML: (\d+)", observacao)
            if match:
                imported_ids_found.add(int(match.group(1)))
                
        return {"imported_ids": list(imported_ids_found)}

    except Exception as e:
        print(f"Erro ao verificar status de pedidos: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao verificar status de pedidos.")
    finally:
        cursor.close()
        conn.close()
        
@router.get("/anuncios/{item_id}/debug", summary="Exibe todos os dados de um anúncio específico do ML")
async def debug_single_item(item_id: str, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        item_details = await meli_service.get_single_item_full_details(item_id)
        
        print("\n" + "="*80)
        print(f"||  DEPURAÇÃO COMPLETA DO ITEM: {item_id}  ||")
        print("="*80)
        print(json.dumps(item_details, indent=2, ensure_ascii=False))
        print("="*80 + "\n")
        
        return {"message": f"Os dados completos do item {item_id} foram impressos no terminal do backend."}

    except HTTPException as e:
        raise e