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
    # ... (código do endpoint /status inalterado) ...
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
    """
    NOVA LÓGICA:
    1. Busca os anúncios diretamente do Mercado Livre de forma paginada.
    2. Pega os SKUs desses anúncios.
    3. Busca no banco de dados do ERP por produtos com esses SKUs.
    4. Combina as informações e retorna para o frontend.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    offset = (page - 1) * limit
    
    try:
        # 1. Busca os anúncios do ML de forma paginada
        # Reutilizaremos a função get_recent_orders do serviço, pois a API é similar
        search_results = await meli_service.get_seller_items_paged(limit=limit, offset=offset)
        
        ml_listings = search_results.get("results", [])
        total_ml = search_results.get("paging", {}).get("total", 0)

        if not ml_listings:
            return {"total": 0, "resultados": []}

        # 2. Pega os SKUs dos anúncios buscados
        skus_to_find = [item.get("seller_sku") for item in ml_listings if item.get("seller_sku")]

        erp_products_map = {}
        if skus_to_find:
            # 3. Busca no ERP por todos os produtos com esses SKUs de uma só vez
            conn = pool.get_connection()
            cursor = conn.cursor(dictionary=True)
            try:
                # Usamos um 'IN (%s, %s, ...)' para uma busca eficiente
                format_strings = ','.join(['%s'] * len(skus_to_find))
                cursor.execute(f"SELECT id, sku, descricao, tabela_precos, url_imagem FROM produtos WHERE sku IN ({format_strings})", tuple(skus_to_find))
                erp_products = cursor.fetchall()
                for product in erp_products:
                    erp_products_map[product['sku']] = product
            finally:
                cursor.close()
                conn.close()

        # 4. Combina as informações
        resultados_combinados = []
        for ml_listing in ml_listings:
            sku = ml_listing.get("seller_sku")
            erp_product = erp_products_map.get(sku) # Procura o produto do ERP no mapa
            
            resultados_combinados.append({
                "ml_listing": ml_listing,
                "erp_product": erp_product # Será null se não encontrar o vínculo
            })

        return {
            "total": total_ml,
            "resultados": resultados_combinados
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao buscar anúncios combinados: {e}")

@router.get("/anuncios/configuracoes-iniciais", summary="Busca dados iniciais para configurar um anúncio")
async def get_initial_listing_config(erp_product_id: int, db: Session = Depends(get_db)):
    # ... (código para buscar credentials e erp_product inalterado) ...
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
        # ATUALIZADO: Agora busca uma lista de sugestões (limit=3)
        suggested_categories, listing_types = await asyncio.gather(
            meli_service.search_categories(erp_product['descricao'], limit=3),
            meli_service.get_listing_types()
        )

        return {
            "erp_product": erp_product,
            "suggested_categories": suggested_categories, # Retorna a lista de sugestões
            "listing_types": listing_types
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao buscar configurações do ML: {e}")


# ===================================================================
# NOVO ENDPOINT PARA A BUSCA MANUAL DE CATEGORIAS
# ===================================================================
@router.get("/categorias/buscar", summary="Busca categorias por termo")
async def search_categories_by_term(q: str, db: Session = Depends(get_db)):
    """
    Endpoint para a busca interativa de categorias no frontend.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")

    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    # Retorna até 8 sugestões para a busca manual
    categories = await meli_service.search_categories(title=q, limit=8)
    return categories

@router.get("/categorias/{category_id}/atributos", summary="Busca atributos de uma categoria específica")
async def get_attributes_for_category(category_id: str, db: Session = Depends(get_db)):
    # ... (código inalterado) ...
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    attributes = await meli_service.get_category_attributes(category_id)
    return attributes

@router.post("/anuncios", summary="Publica ou atualiza um anúncio no Mercado Livre")
async def publish_listing(payload: AnuncioPayload, db: Session = Depends(get_db)):
    """
    Recebe os dados do modal de configuração do frontend e chama o serviço
    para criar ou atualizar o anúncio na plataforma do Mercado Livre.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")

    # Busca o SKU do produto no ERP, que é essencial para o anúncio
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
        # Repassa a exceção do serviço para o frontend
        raise e
    
# ===================================================================
# NOVO ENDPOINT PARA A ABA DE PEDIDOS
# ===================================================================
@router.get("/pedidos", summary="Lista os pedidos recentes do Mercado Livre")
async def get_meli_orders(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """
    Busca os pedidos do Mercado Livre de forma paginada.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    offset = (page - 1) * limit
    
    try:
        orders_data = await meli_service.get_recent_orders(limit=limit, offset=offset)
        
        # A API do ML já retorna um formato paginado que podemos usar
        return {
            "total": orders_data.get("paging", {}).get("total", 0),
            "resultados": orders_data.get("results", [])
        }
    except HTTPException as e:
        raise e

# ===================================================================
# NOVO ENDPOINT PARA IMPORTAÇÂO DE PEDIDOS
# ===================================================================    
    
async def _find_or_create_customer(buyer_id: int, ml_order_shipping: dict, meli_service: MeliAPIService) -> dict:
    """
    Busca os dados completos do comprador. Verifica se ele já existe no ERP pelo documento.
    Se não, cria um novo cadastro. Retorna o ID e o nome do cliente no ERP.
    """
    buyer_data = await meli_service.get_user_details(buyer_id)
    doc_number = buyer_data.get('identification', {}).get('number')
    email = buyer_data.get('email')

    if not doc_number:
        doc_number = f"ML{buyer_id}"

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, nome_razao FROM cadastros WHERE cpf_cnpj = %s", (doc_number,))
        existing_customer = cursor.fetchone()
        if existing_customer:
            print(f"Cliente encontrado no ERP pelo documento: ID {existing_customer['id']}")
            return existing_customer

        print(f"Cliente com documento {doc_number} não encontrado. Criando novo cadastro...")
        shipping_address = ml_order_shipping.get('receiver_address', {})
        cep = shipping_address.get('zip_code', '').replace('-', '')
        
        address_from_cep = {}
        if cep and len(cep) == 8:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"https://viacep.com.br/ws/{cep}/json/")
                    response.raise_for_status()
                    cep_data = response.json()
                    if not cep_data.get('erro'):
                        address_from_cep = {
                            "logradouro": cep_data.get('logradouro'), "bairro": cep_data.get('bairro'),
                            "cidade": cep_data.get('localidade'), "estado": cep_data.get('uf'),
                            "codigo_ibge_cidade": cep_data.get('ibge')
                        }
            except Exception as e:
                print(f"AVISO: Falha ao consultar ViaCEP para o CEP {cep}. Erro: {e}")

        new_customer_payload = {
            "nome_razao": f"{buyer_data.get('first_name', '')} {buyer_data.get('last_name', '')}".strip(),
            "tipo_pessoa": "Pessoa Jurídica" if buyer_data.get('identification', {}).get('type') == 'CNPJ' else "Pessoa Física",
            "tipo_cadastro": "Cliente",
            "celular": buyer_data.get('phone', {}).get('area_code', '') + buyer_data.get('phone', {}).get('number', ''),
            "email": email or f"ml_cliente_{buyer_id}@email.com",
            "cpf_cnpj": doc_number,
            "logradouro": shipping_address.get('street_name') or address_from_cep.get('logradouro') or 'Não informado',
            "numero": shipping_address.get('street_number') or 'S/N',
            "complemento": shipping_address.get('comment'),
            "bairro": shipping_address.get('neighborhood', {}).get('name') or address_from_cep.get('bairro') or 'Não informado',
            "cep": cep,
            "cidade": shipping_address.get('city', {}).get('name') or address_from_cep.get('cidade') or 'Não informada',
            "estado": shipping_address.get('state', {}).get('id') or address_from_cep.get('estado') or 'NI',
            "codigo_ibge_cidade": address_from_cep.get('codigo_ibge_cidade'),
            "situacao": "Ativo", "indicador_ie": "9"
        }

        columns = ", ".join(f"`{k}`" for k in new_customer_payload.keys())
        placeholders = ", ".join(["%s"] * len(new_customer_payload))
        values = list(new_customer_payload.values())
        
        cursor.execute(f"INSERT INTO cadastros ({columns}) VALUES ({placeholders})", values)
        new_customer_id = cursor.lastrowid
        conn.commit()
        
        print(f"Novo cliente criado com ID: {new_customer_id}")
        return {"id": new_customer_id, "nome_razao": new_customer_payload["nome_razao"]}

    finally:
        cursor.close()
        conn.close()


async def _transform_ml_order_to_erp_pedido(ml_order: dict, meli_service: MeliAPIService, db: Session) -> dict:
    config = db.query(MeliConfiguracao).filter(MeliConfiguracao.id == 1).first()
    if not config:
        raise HTTPException(status_code=500, detail="Configurações da integração não encontradas.")

    customer_erp = await _find_or_create_customer(ml_order['buyer']['id'], ml_order.get('shipping', {}), meli_service)

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

    data_emissao = datetime.fromisoformat(ml_order['date_created'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')
    
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
        "data_emissao": data_emissao, "data_validade": data_emissao,
        "cliente_id": customer_erp['id'], "cliente_nome": customer_erp['nome_razao'],
        "vendedor_id": config.vendedor_padrao_id, "vendedor_nome": vendedor_nome_erp,
        "transportadora_id": 1,
        "transportadora_nome": ml_order.get('shipping', {}).get('shipping_option', {}).get('name', 'A definir'),
        "origem_venda": "Mercado Livre", "lista_itens": lista_itens_erp,
        "total": float(ml_order['total_amount']),
        "desconto_total": float(ml_order.get('coupon', {}).get('amount', 0)),
        "total_com_desconto": float(ml_order['total_amount']),
        "tipo_frete": ml_order.get('shipping', {}).get('shipping_mode', 'A definir'),
        "valor_frete": float(ml_order.get('shipping', {}).get('cost', 0)),
        "formas_pagamento": [{
            "tipo": p.get('payment_type', 'Outro').capitalize(),
            "valor_pix": float(p['total_paid_amount']) if p.get('payment_type') == 'pix' else 0.0,
            "valor_boleto": float(p['total_paid_amount']) if p.get('payment_type') == 'ticket' else 0.0,
            "valor_dinheiro": 0.0,
            "parcelas": p.get('installments'),
            "valor_parcela": float(p.get('installment_amount', 0))
        } for p in ml_order.get('payments', [])],
        "observacao": f"Pedido importado do Mercado Livre. ID ML: {ml_order['id']}. Comprador: {ml_order['buyer']['nickname']}",
        "situacao_pedido": config.situacao_pedido_inicial
    }
    return pedido_erp_payload

# --- Endpoints ---

@router.post("/pedidos/{order_id}/importar", summary="Importa um pedido do ML para o ERP")
async def import_meli_order_to_erp(order_id: int, db: Session = Depends(get_db)):
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração não ativa.")
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    try:
        ml_order = await meli_service.get_order_details(order_id)
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
    
# ===================================================================
# NOVO ENDPOINT PARA DESCONECTAR A INTEGRAÇÃO
# ===================================================================
@router.delete("/credentials", summary="Desconecta a integração e remove os tokens")
def disconnect_integration(db: Session = Depends(get_db)):
    """
    Remove as credenciais de autenticação do Mercado Livre do banco de dados,
    efetivamente desconectando a integração.
    """
    try:
        # Busca a primeira (e única) linha de credenciais
        credentials = db.query(MeliCredentials).first()
        
        if credentials:
            db.delete(credentials)
            db.commit()
        
        # Retorna sucesso mesmo que não haja credenciais, 
        # pois o estado final desejado é "desconectado".
        return {"message": "Integração desconectada com sucesso."}

    except Exception as e:
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao desconectar a integração: {e}"
        )
        
# ===================================================================
# NOVOS ENDPOINTS PARA A ABA DE PERGUNTAS
# ===================================================================

@router.get("/perguntas", summary="Lista as perguntas não respondidas do Mercado Livre")
async def get_meli_questions(
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db)
):
    """
    Busca as perguntas não respondidas do Mercado Livre de forma paginada.
    """
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
    """
    Recebe o texto de uma resposta e a envia para a pergunta correspondente.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")
    
    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        answer_response = await meli_service.post_answer(question_id=question_id, text=payload.text)
        return {"message": "Resposta enviada com sucesso!", "data": answer_response}
    except HTTPException as e:
        raise e
    
# ===================================================================
# NOVO ENDPOINT PARA VINCULAR UM ANÚNCIO A UM PRODUTO
# ===================================================================
@router.post("/anuncios/vincular", summary="Vincula um anúncio do ML a um produto do ERP")
async def link_item_to_product(payload: VincularPayload, db: Session = Depends(get_db)):
    """
    Atualiza o seller_sku de um anúncio do Mercado Livre para criar um vínculo
    com um produto existente no ERP.
    """
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