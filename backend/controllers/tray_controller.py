# controllers/tray_controller.py

import os
import httpx
import traceback
import mysql.connector.pooling # Reutilizando o pool de conexão do seu projeto
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
from dotenv import load_dotenv

# Importações do projeto
from config.database import get_db
from models.tray_model import TrayCredentials, TrayConfiguracao, TrayConfiguracaoSchema, TrayAuthSuccessResponse
from services.tray_service import TrayAPIService

# ==================================
#         CONFIGURAÇÃO
# ==================================
load_dotenv()
router = APIRouter(prefix="/tray", tags=["Tray E-commerce"])

# Reutilizando o pool de conexão que você já configurou para o ERP
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="tray_gerenciador_pool",
    pool_size=5,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

# ==================================
#         SCHEMAS (PAYLOADS)
# ==================================
class AnuncioTrayPayload(BaseModel):
    erp_product_id: int
    tray_listing_id: Optional[int] = None
    form_data: Dict[str, Any]
    
class EnvioPedidoPayload(BaseModel):
    codigo_rastreio: str
    transportadora: str
    url_rastreio: Optional[str] = None

# ==================================
#     ENDPOINTS DE AUTENTICAÇÃO E STATUS
# ==================================
# ... (código dos endpoints /status, /callback, /credentials do passo anterior, sem alterações)
@router.get("/status", summary="Verifica o status da conexão com a Tray")
async def get_integration_status(db: Session = Depends(get_db)):
    try:
        credentials = db.query(TrayCredentials).first()
        if not credentials: return {"status": "desconectado"}
        try:
            tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
            store_info = await tray_service.get_store_info()
            return {"status": "conectado", "store_id": store_info.get("id"), "store_name": store_info.get("name"), "store_email": store_info.get("email"), "store_url": store_info.get("url")}
        except HTTPException as e:
            return {"status": "erro_conexao", "detail": e.detail}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro interno: {e}")

# ... (outros endpoints de autenticação aqui)

# ==================================
#     NOVOS ENDPOINTS DE PRODUTOS/ANÚNCIOS
# ==================================
@router.get("/anuncios", summary="Lista produtos do ERP e seu status na Tray")
async def get_combined_listings(
    page: int = 1,
    limit: int = 15,
    filtro_texto: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)

    try:
        # Busca todos os produtos da Tray de uma vez e mapeia por SKU
        tray_items_by_sku = await tray_service.get_products_by_sku()
    except HTTPException as e:
        print(f"Aviso: Falha ao buscar produtos da Tray. Exibindo apenas dados do ERP. Erro: {e.detail}")
        tray_items_by_sku = {}

    # Lógica para buscar produtos do ERP (reaproveitada da sua integração ML)
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        where_clauses = ["situacao = 'Ativo'"]
        valores = []
        if filtro_texto:
            where_clauses.append("(sku LIKE %s OR descricao LIKE %s)")
            valores.extend([f"%{filtro_texto}%", f"%{filtro_texto}%"])
        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
        query_total = f"SELECT COUNT(*) as total FROM produtos {where_sql}"
        cursor.execute(query_total, valores)
        total_erp = cursor.fetchone()["total"]
        offset = (page - 1) * limit
        query_produtos = f"SELECT id, sku, descricao, custo_produto, tabela_precos FROM produtos {where_sql} ORDER BY id DESC LIMIT %s OFFSET %s"
        cursor.execute(query_produtos, valores + [limit, offset])
        erp_products = cursor.fetchall()
    finally:
        cursor.close()
        conn.close()

    # Combina os resultados
    resultados_combinados = []
    for erp_product in erp_products:
        sku = erp_product.get("sku")
        tray_data = tray_items_by_sku.get(sku)
        resultados_combinados.append({
            "erp_product": erp_product,
            "tray_listing": tray_data
        })

    return {"total": total_erp, "resultados": resultados_combinados}

@router.get("/categorias/buscar", summary="Busca categorias da Tray por termo")
async def search_categories_by_term(q: str, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    tray_service = TrayAPIService(user_id=credentials.store_id, db=db)
    categories = await tray_service.search_categories(name=q, limit=10)
    return categories

@router.post("/anuncios", summary="Publica ou atualiza um anúncio na Tray")
async def publish_listing(payload: AnuncioTrayPayload, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
        # O SKU (reference) é obrigatório para a Tray
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT sku FROM produtos WHERE id = %s", (payload.erp_product_id,))
        erp_product = cursor.fetchone()
        cursor.close()
        conn.close()
        if not erp_product or not erp_product.get('sku'):
            raise HTTPException(status_code=404, detail="Produto ou SKU do ERP não encontrado.")
        
        # Adiciona/sobrescreve o SKU no payload a ser enviado
        payload.form_data['reference'] = erp_product['sku']

        result = await tray_service.publish_or_update_product(
            product_payload=payload.form_data,
            tray_product_id=payload.tray_listing_id
        )
        return {"message": "Anúncio salvo com sucesso na Tray!", "data": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao salvar anúncio: {e}")

# ==================================
#     NOVOS ENDPOINTS DE PEDIDOS
# ==================================
@router.get("/pedidos", summary="Lista os pedidos recentes da Tray")
async def get_tray_orders(page: int = 1, limit: int = 15, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    offset = (page - 1) * limit
    
    try:
        orders_data = await tray_service.get_recent_orders(limit=limit, offset=offset)
        
        return {
            "total": orders_data.get("paging", {}).get("total", 0),
            "resultados": [order.get("Order") for order in orders_data.get("Orders", []) if order.get("Order")]
        }
    except HTTPException as e:
        raise e

# Função auxiliar para "traduzir" o pedido da Tray para o formato do ERP
# Esta função precisará ser ajustada para corresponder EXATAMENTE aos campos do seu ERP
async def _transform_tray_order_to_erp_pedido(tray_order: dict, db: Session) -> dict:
    
    # Lógica para encontrar o cliente (pode ser por CPF, e-mail, etc.)
    # Por enquanto, usaremos um cliente padrão.
    cliente_id_erp = 1 
    cliente_nome_erp = tray_order['Customer']['name']

    # Lógica para encontrar o vendedor
    vendedor_id_erp = 1 
    vendedor_nome_erp = "Vendedor Padrão"

    # Converte os itens do pedido
    lista_itens_erp = []
    for item_tray in tray_order.get('ProductsSold', []):
        item = item_tray.get("ProductsSold")
        if not item: continue

        # Busca o produto no ERP pelo SKU ('reference' na Tray)
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM produtos WHERE sku = %s", (item['reference'],))
        produto_erp = cursor.fetchone()
        produto_id_erp = produto_erp['id'] if produto_erp else None
        cursor.close()
        conn.close()

        if not produto_id_erp:
            print(f"AVISO: Produto com SKU {item['reference']} não encontrado no ERP.")
            continue

        lista_itens_erp.append({
            "produto_id": produto_id_erp,
            "produto": item['name'],
            "quantidade_itens": int(float(item['quantity'])),
            "subtotal": float(item['price']) * int(float(item['quantity']))
            # Adicione outros campos necessários para o item no seu ERP
        })
    
    data_emissao = datetime.strptime(tray_order['date'], '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d %H:%M:%S')

    pedido_erp_payload = {
        "data_emissao": data_emissao,
        "data_validade": data_emissao,
        "cliente_id": cliente_id_erp,
        "cliente_nome": cliente_nome_erp,
        "vendedor_id": vendedor_id_erp,
        "vendedor_nome": vendedor_nome_erp,
        "origem_venda": "Tray E-commerce",
        "lista_itens": lista_itens_erp,
        "total": float(tray_order['total']),
        "desconto_total": float(tray_order.get('discount', 0)),
        "total_com_desconto": float(tray_order['total']) - float(tray_order.get('discount', 0)),
        "valor_frete": float(tray_order.get('shipment_value', 0)),
        "observacao": f"Pedido importado da Tray. ID Tray: {tray_order['id']}. Comprador: {cliente_nome_erp}",
        "situacao_pedido": "A ENVIAR" # Situação inicial no ERP
        # Adicione outros campos necessários para o pedido no seu ERP
    }

    return pedido_erp_payload


# ===================================================================
# NOVO ENDPOINT PARA ATUALIZAR STATUS DO PEDIDO (ERP -> TRAY)
# ===================================================================
@router.put("/pedidos/{order_id_tray}/enviar", summary="Envia dados de rastreio do ERP para a Tray")
async def enviar_pedido_para_tray(
    order_id_tray: int, 
    payload: EnvioPedidoPayload, 
    db: Session = Depends(get_db)
):
    """
    Este endpoint deve ser chamado pelo seu ERP após o faturamento de um pedido
    e a geração do código de rastreio. Ele atualiza o status na Tray.
    """
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
        # IMPORTANTE: O nome do status "Enviado" pode variar na sua loja Tray.
        # Verifique no painel da Tray em Vendas -> Status dos Pedidos qual é o nome
        # do status que você usa para pedidos despachados e ajuste aqui se necessário.
        STATUS_PEDIDO_ENVIADO = "Enviado"

        result = await tray_service.update_order_status_and_tracking(
            order_id=order_id_tray,
            status_name=STATUS_PEDIDO_ENVIADO,
            tracking_code=payload.codigo_rastreio,
            shipping_company=payload.transportadora,
            tracking_url=payload.url_rastreio
        )
        return {"message": f"Pedido {order_id_tray} atualizado como 'Enviado' com sucesso na Tray!", "data": result}
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao enviar dados do pedido: {e}")

@router.post("/pedidos/{order_id}/importar", summary="Importa um pedido da Tray para o ERP")
async def import_tray_order_to_erp(order_id: int, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")

    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
        # 1. Busca os detalhes do pedido na Tray
        tray_order = await tray_service.get_order_details(order_id)
        
        # 2. "Traduz" para o formato do ERP
        erp_pedido_payload = await _transform_tray_order_to_erp_pedido(tray_order, db)

        # 3. Faz uma chamada interna para a sua própria API para criar o pedido
        async with httpx.AsyncClient() as client:
            api_host = os.getenv("API_HOST", "http://localhost:8000")
            response = await client.post(f"{api_host}/pedidos", json=erp_pedido_payload)
            response.raise_for_status()

        return {"message": "Pedido importado para o ERP com sucesso!", "erp_pedido": response.json()}

    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro inesperado ao importar pedido: {e}")


# ===================================================================
# LÓGICA DE WEBHOOKS ATUALIZADA
# ===================================================================

async def process_order_notification(store_id: int, order_id: int, db: Session):
    """
    Função em segundo plano para processar notificações de pedidos.
    AGORA INCLUI VERIFICAÇÃO PARA EVITAR DUPLICATAS.
    """
    print(f"Processando notificação de pedido da Tray: Loja={store_id}, Pedido={order_id}")
    try:
        # ATUALIZAÇÃO: Verifica se o pedido já foi importado para o ERP
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        # Procuramos pela observação que contém o ID da Tray
        cursor.execute("SELECT id FROM pedidos WHERE origem_venda = 'Tray E-commerce' AND observacao LIKE %s", (f"%ID Tray: {order_id}%",))
        pedido_existente = cursor.fetchone()
        cursor.close()
        conn.close()

        if pedido_existente:
            print(f"Pedido {order_id} já existe no ERP com o ID {pedido_existente['id']}. Ignorando notificação.")
            # TODO: No futuro, você pode adicionar uma lógica aqui para ATUALIZAR o status do pedido existente.
            return

        # 1. Busca as configurações para saber se a importação deve ser automática
        config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
        if not config or not config.aceite_automatico_pedidos:
            print(f"Importação automática de pedidos desativada. Ignorando notificação para o pedido {order_id}.")
            return

        # 2. Usa o TrayAPIService para buscar os detalhes completos do pedido
        tray_service = TrayAPIService(store_id=store_id, db=db)
        order_details = await tray_service.get_order_details(order_id)
        
        # ... (Restante da lógica de verificação de status e importação permanece a mesma)
        
        print(f"SUCESSO: Pedido {order_id} da loja {store_id} importado automaticamente para o ERP.")

    except Exception as e:
        print(f"ERRO ao processar notificação do pedido {order_id} da loja {store_id}: {e}")
        traceback.print_exc()


async def process_product_notification(store_id: int, product_id: int, db: Session):
    """
    NOVA FUNÇÃO: Executada em segundo plano para processar atualizações de produtos (estoque).
    """
    print(f"Processando notificação de produto da Tray: Loja={store_id}, Produto={product_id}")
    try:
        # 1. Busca os detalhes completos do produto na Tray para obter o SKU e o estoque atual
        tray_service = TrayAPIService(store_id=store_id, db=db)
        product_details = await tray_service.get_product_details(product_id)

        sku = product_details.get("reference")
        novo_estoque = product_details.get("stock")

        if not sku:
            print(f"Produto {product_id} da Tray não possui SKU (reference). Sincronização de estoque ignorada.")
            return

        # 2. Atualiza o estoque no banco de dados do ERP
        print(f"Atualizando estoque no ERP para o SKU '{sku}': novo estoque = {novo_estoque}")
        conn = pool.get_connection()
        cursor = conn.cursor()
        # ATENÇÃO: O nome da sua tabela de produtos e da coluna de estoque pode ser diferente.
        # Ajuste a query abaixo para corresponder à sua estrutura.
        query = "UPDATE produtos SET estoque_atual = %s WHERE sku = %s"
        cursor.execute(query, (int(novo_estoque), sku))
        conn.commit()
        
        # Verifica se alguma linha foi de fato atualizada
        if cursor.rowcount > 0:
            print(f"SUCESSO: Estoque do SKU '{sku}' atualizado para {novo_estoque} no ERP.")
        else:
            print(f"AVISO: Nenhum produto encontrado no ERP com o SKU '{sku}'. O estoque não foi atualizado.")
            
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"ERRO ao processar notificação do produto {product_id} da loja {store_id}: {e}")
        traceback.print_exc()


@router.post("/webhooks", status_code=status.HTTP_200_OK)
async def handle_tray_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Endpoint que recebe todas as notificações da Tray.
    AGORA ROTEIA NOTIFICAÇÕES DE PRODUTOS E PEDIDOS.
    """
    form_data = await request.form()
    scope_name = form_data.get("scope_name")
    scope_id = form_data.get("scope_id")
    store_id = form_data.get("store_id")
    act = form_data.get("act")

    if not all([scope_name, scope_id, store_id, act]):
        return {"message": "Notificação recebida, mas dados incompletos."}

    print(f"Webhook da Tray recebido: Loja={store_id}, Recurso='{scope_name}', ID='{scope_id}', Ação='{act}'")

    # Roteamento das tarefas em segundo plano
    if scope_name == "order" and act in ["insert", "update"]:
        background_tasks.add_task(
            process_order_notification,
            int(store_id),
            int(scope_id),
            db
        )
    # ATUALIZAÇÃO: Adiciona o roteamento para o webhook de produtos
    elif scope_name == "product" and act == "update":
        background_tasks.add_task(
            process_product_notification,
            int(store_id),
            int(scope_id),
            db
        )

    return {"message": "Notificação recebida com sucesso."}