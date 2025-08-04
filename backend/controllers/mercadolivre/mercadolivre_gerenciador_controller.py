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
    
# Esta função auxiliar fará a "tradução" dos dados
async def _transform_ml_order_to_erp_pedido(ml_order: dict, db: Session) -> dict:
    """
    Converte um objeto de pedido do Mercado Livre para o formato PedidoCreate do ERP.
    """
    # Lógica para encontrar o cliente no ERP.
    # TODO: Implementar uma busca real pelo CPF ou nome do comprador.
    # Por enquanto, usaremos um cliente padrão (ID 1) se ele existir.
    cliente_id_erp = 1 # ID de cliente padrão
    cliente_nome_erp = ml_order['buyer']['nickname']

    # Lógica para encontrar o vendedor no ERP.
    # TODO: Mapear o vendedor do ML para um vendedor do ERP.
    vendedor_id_erp = 1 # ID de vendedor padrão
    vendedor_nome_erp = "Vendedor Padrão"

    # Converte os itens do pedido
    lista_itens_erp = []
    for item_ml in ml_order.get('order_items', []):
        # Busca o produto correspondente no ERP pelo SKU
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            cursor.execute("SELECT id FROM produtos WHERE sku = %s", (item_ml['item']['seller_sku'],))
            produto_erp = cursor.fetchone()
            produto_id_erp = produto_erp['id'] if produto_erp else None
        finally:
            cursor.close()
            conn.close()

        if not produto_id_erp:
            # Se um produto não for encontrado, pulamos ou lançamos um erro.
            # Por segurança, vamos pular e adicionar uma observação.
            print(f"AVISO: Produto com SKU {item_ml['item']['seller_sku']} não encontrado no ERP.")
            continue

        lista_itens_erp.append({
            "produto_id": produto_id_erp,
            "produto": item_ml['item']['title'],
            "variacao_id": item_ml['item'].get('variation_attributes', [{}])[0].get('value_id'),
            "variacao": item_ml['item'].get('variation_attributes', [{}])[0].get('value_name'),
            "quantidade_itens": item_ml['quantity'],
            "tabela_preco_id": "PADRAO", # Assumindo um preço padrão
            "tabela_preco": "PADRAO",
            "subtotal": item_ml['full_unit_price'] * item_ml['quantity']
        })
    
    # Formata a data
    data_emissao = datetime.fromisoformat(ml_order['date_created'].replace('Z', '+00:00')).strftime('%Y-%m-%d %H:%M:%S')

    pedido_erp_payload = {
        "data_emissao": data_emissao,
        "data_validade": data_emissao, # Usando a mesma data por padrão
        "cliente_id": cliente_id_erp,
        "cliente_nome": cliente_nome_erp,
        "vendedor_id": vendedor_id_erp,
        "vendedor_nome": vendedor_nome_erp,
        "transportadora_id": 1, # ID de transportadora padrão
        "transportadora_nome": ml_order.get('shipping', {}).get('shipping_option', {}).get('name', 'A definir'),
        "origem_venda": "Mercado Livre",
        "lista_itens": lista_itens_erp,
        "total": ml_order['total_amount'],
        "desconto_total": ml_order.get('coupon', {}).get('amount', 0),
        "total_com_desconto": ml_order['total_amount'], # total_amount já considera descontos
        "tipo_frete": ml_order.get('shipping', {}).get('shipping_mode', 'A definir'),
        "valor_frete": ml_order.get('shipping', {}).get('cost', 0),
        "formas_pagamento": [{
            "tipo": p['payment_type'].capitalize(),
            "valor_pix": p['total_paid_amount'] if p['payment_type'] == 'pix' else 0,
            "valor_boleto": p['total_paid_amount'] if p['payment_type'] == 'ticket' else 0,
            "valor_dinheiro": 0,
            "parcelas": p.get('installments'),
            "valor_parcela": p.get('installment_amount')
        } for p in ml_order.get('payments', [])],
        "observacao": f"Pedido importado do Mercado Livre. ID ML: {ml_order['id']}. Comprador: {ml_order['buyer']['nickname']}",
        "situacao_pedido": "Aguardando Faturamento" # Situação inicial no ERP
    }

    return pedido_erp_payload


@router.post("/pedidos/{order_id}/importar", summary="Importa um pedido do ML para o ERP")
async def import_meli_order_to_erp(order_id: int, db: Session = Depends(get_db)):
    """
    1. Busca os detalhes completos de um pedido no Mercado Livre.
    2. "Traduz" os dados para o formato de criação de pedido do ERP.
    3. Chama a rota interna POST /pedidos para criar o pedido no ERP.
    """
    credentials = db.query(MeliCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Mercado Livre não está ativa.")

    meli_service = MeliAPIService(user_id=credentials.user_id, db=db)
    
    try:
        # 1. Busca os detalhes do pedido no ML
        ml_order = await meli_service.get_order_details(order_id)
        
        # 2. "Traduz" para o formato do ERP
        erp_pedido_payload = await _transform_ml_order_to_erp_pedido(ml_order, db)

        # 3. Faz uma chamada interna para a sua própria API para criar o pedido
        # Isso reutiliza toda a sua lógica de criação de pedidos já existente!
        async with httpx.AsyncClient() as client:
            # O host pode precisar ser ajustado dependendo de onde você roda o serviço
            # Para ambientes containerizados (Docker), pode ser o nome do serviço.
            api_host = os.getenv("API_HOST", "http://localhost:8000")
            response = await client.post(f"{api_host}/pedidos", json=erp_pedido_payload)
            response.raise_for_status() # Lança exceção se a criação falhar

        return {"message": "Pedido importado para o ERP com sucesso!", "erp_pedido": response.json()}

    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao importar pedido: {e}")    
    
    
    
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