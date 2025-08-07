# controllers/tray_controller.py

import os
import httpx
import traceback
import mysql.connector.pooling
from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, BackgroundTasks
from fastapi.responses import JSONResponse, HTMLResponse # Adicionada a importação de HTMLResponse
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

router = APIRouter(tags=["Tray E-commerce"])

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

@router.get("/tray", summary="Página de Início da Autorização Tray", response_class=HTMLResponse)
async def start_tray_auth_page(
    request: Request,
    url: str = Query(..., alias="url"), # O domínio da loja vindo da Tray
    db: Session = Depends(get_db)
):
    """
    Esta é a página de aterrissagem para onde o lojista é redirecionado
    após instalar o aplicativo na Tray. Ela apresenta um botão para
    iniciar o fluxo de autorização OAuth.
    """
    config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
    if not config or not config.tray_consumer_key:
        raise HTTPException(
            status_code=500,
            detail="Consumer Key da aplicação Tray não configurado no sistema."
        )

    # A URL de callback da nossa API que a Tray deve chamar após a autorização.
    # É crucial que esta URL esteja registrada no seu painel de parceiro Tray.
    callback_url = str(request.url_for('tray_auth_callback'))

    # Constrói a URL de autorização para a qual o lojista será redirecionado
    auth_url = f"{url}/auth.php?response_type=code&consumer_key={config.tray_consumer_key}&callback={callback_url}"

    # Retorna uma página HTML simples com o botão para autorizar
    html_content = f"""
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Autorizar Integração com ERP</title>
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f4f5f7; }}
            .container {{ text-align: center; background-color: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            h1 {{ color: #172b4d; }}
            p {{ color: #42526e; max-width: 400px; margin: 20px auto; }}
            a.button {{ display: inline-block; background-color: #0052cc; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 600; transition: background-color 0.2s; }}
            a.button:hover {{ background-color: #0065ff; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Concluir Integração com a Tray</h1>
            <p>Você está quase lá! Clique no botão abaixo para autorizar a conexão entre sua loja Tray e o seu sistema ERP.</p>
            <a href="{auth_url}" class="button">Autorizar Conexão</a>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)


@router.get("/tray/status", summary="Verifica o status da conexão com a Tray")
async def get_integration_status(db: Session = Depends(get_db)):
    try:
        credentials = db.query(TrayCredentials).first()
        if not credentials:
            return {"status": "desconectado"}
        try:
            tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
            store_info = await tray_service.get_store_info()
            return {
                "status": "conectado",
                "store_id": store_info.get("id"),
                "store_name": store_info.get("name"),
                "store_email": store_info.get("email"),
                "store_url": store_info.get("url")
            }
        except HTTPException as e:
            return {"status": "erro_conexao", "detail": e.detail}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Erro interno: {e}")

@router.get("/tray/callback", summary="Callback de Autenticação da Tray")
async def tray_auth_callback(
    code: str = Query(...), 
    api_address: str = Query(...), 
    db: Session = Depends(get_db)
):
    """
    Endpoint de callback chamado pela Tray após o lojista autorizar a aplicação.
    Recebe um 'code' de autorização temporário e o troca por um 'access_token' permanente.
    """
    # 1. Busca as credenciais da aplicação (consumer_key e secret) salvas no banco
    config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
    if not config or not config.tray_consumer_key or not config.tray_consumer_secret:
        raise HTTPException(
            status_code=500, 
            detail="Credenciais da aplicação Tray (Consumer Key/Secret) não configuradas no sistema."
        )

    # 2. Monta o payload para a requisição de troca do token
    payload = {
        "consumer_key": config.tray_consumer_key,
        "consumer_secret": config.tray_consumer_secret,
        "code": code,
    }
    
    try:
        # 3. Faz a chamada para a API da Tray para obter o token de acesso
        async with httpx.AsyncClient(base_url=api_address) as client:
            # A documentação confirma que a chamada é POST com dados 'url-encoded' (parâmetro 'data')
            response = await client.post("/auth", data=payload)
            
            # Lança uma exceção se a resposta da API for um erro (ex: 404, 500)
            response.raise_for_status()
            
            token_data = response.json()

            # 4. Verifica se a resposta, apesar de bem-sucedida, contém um código de erro da Tray
            # Usamos str() para garantir a comparação correta
            if 'code' in token_data and str(token_data.get('code')) not in ['200', '201']:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Erro da API Tray ao obter token: {token_data.get('message', 'Resposta inválida')}"
                )

            # 5. Extrai os dados da resposta. 
            # A documentação mostra que 'store_id' e os tokens já vêm nesta resposta,
            # eliminando a necessidade de uma segunda chamada para /informations.
            store_id = int(token_data['store_id'])
            access_token = token_data['access_token']
            refresh_token = token_data['refresh_token']
            
            # O nome do campo na API é 'date_expiration_access_token', mapeamos para 'date_expires' do seu modelo
            date_expires = token_data['date_expiration_access_token']

            # 6. Salva as credenciais no banco de dados
            db_credentials = db.query(TrayCredentials).filter(TrayCredentials.store_id == store_id).first()
            
            if db_credentials:
                # Se a loja já existe, atualiza os tokens
                db_credentials.access_token = access_token
                db_credentials.refresh_token = refresh_token
                db_credentials.date_expires = date_expires
                db_credentials.api_address = api_address
            else:
                # Se é uma nova loja, cria um novo registro
                new_credentials = TrayCredentials(
                    store_id=store_id,
                    api_address=api_address,
                    access_token=access_token,
                    refresh_token=refresh_token,
                    date_expires=date_expires
                )
                db.add(new_credentials)
            
            db.commit()
            
            # Redireciona para uma página de sucesso ou retorna uma mensagem.
            # Idealmente, você teria uma página no seu frontend para isso.
            return JSONResponse(
                content={"message": f"Loja {store_id} conectada com sucesso!"}
            )

    except httpx.HTTPStatusError as e:
        # Captura erros de comunicação com a API da Tray
        print("Erro na resposta da Tray (com POST e data):", e.response.text)
        raise HTTPException(
            status_code=e.response.status_code, 
            detail=f"Erro de comunicação ao obter token da Tray: {e.response.text}"
        )
    except Exception as e:
        # Captura qualquer outro erro inesperado
        db.rollback()
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail=f"Ocorreu um erro interno no servidor: {str(e)}"
        )

# ==================================
#     ENDPOINTS DE PRODUTOS/ANÚNCIOS
# ==================================
@router.get("/tray/anuncios", summary="Lista produtos do ERP e seu status na Tray")
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
        tray_items_by_sku = await tray_service.get_products_by_sku()
    except HTTPException as e:
        print(f"Aviso: Falha ao buscar produtos da Tray. Exibindo apenas dados do ERP. Erro: {e.detail}")
        tray_items_by_sku = {}

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

    resultados_combinados = []
    for erp_product in erp_products:
        sku = erp_product.get("sku")
        tray_data = tray_items_by_sku.get(sku)
        resultados_combinados.append({
            "erp_product": erp_product,
            "tray_listing": tray_data
        })

    return {"total": total_erp, "resultados": resultados_combinados}

@router.get("/tray/categorias/buscar", summary="Busca categorias da Tray por termo")
async def search_categories_by_term(q: str, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    categories = await tray_service.search_categories(name=q, limit=10)
    return categories

@router.post("/tray/anuncios", summary="Publica ou atualiza um anúncio na Tray")
async def publish_listing(payload: AnuncioTrayPayload, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT sku FROM produtos WHERE id = %s", (payload.erp_product_id,))
        erp_product = cursor.fetchone()
        cursor.close()
        conn.close()
        if not erp_product or not erp_product.get('sku'):
            raise HTTPException(status_code=404, detail="Produto ou SKU do ERP não encontrado.")
        
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
#     ENDPOINTS DE PEDIDOS
# ==================================
@router.get("/tray/pedidos", summary="Lista os pedidos recentes da Tray")
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

async def _transform_tray_order_to_erp_pedido(tray_order: dict, db: Session) -> dict:
    cliente_id_erp = 1 
    cliente_nome_erp = tray_order['Customer']['name']
    vendedor_id_erp = 1 
    vendedor_nome_erp = "Vendedor Padrão"
    transportadora_id_erp = 1
    transportadora_nome_erp = tray_order.get('shipment', 'A definir')

    lista_itens_erp = []
    for item_tray_wrapper in tray_order.get('ProductsSold', []):
        item = item_tray_wrapper.get("ProductsSold")
        if not item: continue

        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM produtos WHERE sku = %s", (item['reference'],))
        produto_erp = cursor.fetchone()
        produto_id_erp = produto_erp['id'] if produto_erp else None
        cursor.close()
        conn.close()

        if not produto_id_erp:
            print(f"AVISO: Produto com SKU {item['reference']} não encontrado no ERP. Item não será adicionado ao pedido.")
            continue

        lista_itens_erp.append({
            "produto_id": produto_id_erp,
            "produto": item['name'],
            "quantidade_itens": int(float(item['quantity'])),
            "subtotal": float(item['price']) * int(float(item['quantity'])),
            "tabela_preco_id": "PADRAO",
            "tabela_preco": "PADRAO"
        })
    
    formas_pagamento_erp = []
    for pagamento_tray_wrapper in tray_order.get('Payment', []):
        pagamento = pagamento_tray_wrapper.get("Payment")
        if not pagamento: continue
        
        tipo_pagamento = "Outros"
        if "Cartão" in pagamento.get("payment_method", ""):
            tipo_pagamento = "Cartão de Crédito"
        elif "Boleto" in pagamento.get("payment_method", ""):
            tipo_pagamento = "Boleto"
        elif "Pix" in pagamento.get("payment_method", ""):
            tipo_pagamento = "Pix"

        formas_pagamento_erp.append({
            "tipo": tipo_pagamento,
            "valor_pix": float(pagamento['value']) if tipo_pagamento == "Pix" else 0,
            "valor_boleto": float(pagamento['value']) if tipo_pagamento == "Boleto" else 0,
            "valor_dinheiro": 0,
            "parcelas": int(pagamento.get("installments", 1)),
            "valor_parcela": float(pagamento.get("installment_value", pagamento['value']))
        })

    data_emissao = datetime.strptime(tray_order['date'], '%Y-%m-%d %H:%M:%S').strftime('%Y-%m-%d %H:%M:%S')

    pedido_erp_payload = {
        "data_emissao": data_emissao,
        "data_validade": data_emissao,
        "cliente_id": cliente_id_erp,
        "cliente_nome": cliente_nome_erp,
        "vendedor_id": vendedor_id_erp,
        "vendedor_nome": vendedor_nome_erp,
        "transportadora_id": transportadora_id_erp,
        "transportadora_nome": transportadora_nome_erp,
        "origem_venda": "Tray E-commerce",
        "lista_itens": lista_itens_erp,
        "total": float(tray_order['total']),
        "desconto_total": float(tray_order.get('discount', 0)),
        "total_com_desconto": float(tray_order['total']) - float(tray_order.get('discount', 0)),
        "tipo_frete": tray_order.get('shipment_type', 'A definir'),
        "valor_frete": float(tray_order.get('shipment_value', 0)),
        "formas_pagamento": formas_pagamento_erp,
        "observacao": f"Pedido importado da Tray. ID Tray: {tray_order['id']}. Comprador: {cliente_nome_erp}",
        "situacao_pedido": "A ENVIAR"
    }
    return pedido_erp_payload

@router.post("/tray/pedidos/{order_id}/importar", summary="Importa um pedido da Tray para o ERP")
async def import_tray_order_to_erp(order_id: int, db: Session = Depends(get_db)):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")

    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
        tray_order = await tray_service.get_order_details(order_id)
        erp_pedido_payload = await _transform_tray_order_to_erp_pedido(tray_order, db)

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

@router.put("/tray/pedidos/{order_id_tray}/enviar", summary="Envia dados de rastreio do ERP para a Tray")
async def enviar_pedido_para_tray(
    order_id_tray: int, 
    payload: EnvioPedidoPayload, 
    db: Session = Depends(get_db)
):
    credentials = db.query(TrayCredentials).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Integração Tray não está ativa.")
    
    tray_service = TrayAPIService(store_id=credentials.store_id, db=db)
    
    try:
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

# ==================================
#     ENDPOINT DE CONFIGURAÇÕES
# ==================================
@router.get("/configuracoes/tray", response_model=TrayConfiguracaoSchema, summary="Busca as configurações da integração Tray")
def get_tray_configuracoes(db: Session = Depends(get_db)):
    config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
    if not config:
        config = TrayConfiguracao(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/configuracoes/tray", response_model=TrayConfiguracaoSchema, summary="Atualiza as configurações da integração Tray")
def update_tray_configuracoes(config_update: TrayConfiguracaoSchema, db: Session = Depends(get_db)):
    config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada.")
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config

# ===================================================================
# LÓGICA DE WEBHOOKS
# ===================================================================
async def process_order_notification(store_id: int, order_id: int, db: Session):
    print(f"Processando notificação de pedido da Tray: Loja={store_id}, Pedido={order_id}")
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id FROM pedidos WHERE origem_venda = 'Tray E-commerce' AND observacao LIKE %s", (f"%ID Tray: {order_id}%",))
        pedido_existente = cursor.fetchone()
        cursor.close()
        conn.close()

        if pedido_existente:
            print(f"Pedido {order_id} já existe no ERP. Ignorando notificação.")
            return

        config = db.query(TrayConfiguracao).filter(TrayConfiguracao.id == 1).first()
        if not config or not config.aceite_automatico_pedidos:
            print(f"Importação automática desativada. Ignorando pedido {order_id}.")
            return

        tray_service = TrayAPIService(store_id=store_id, db=db)
        order_details = await tray_service.get_order_details(order_id)
        
        if order_details.get('status_id') != '5': 
            print(f"Pedido {order_id} não está com status 'Pagamento aprovado'. Importação ignorada.")
            return

        erp_pedido_payload = await _transform_tray_order_to_erp_pedido(order_details, db)

        async with httpx.AsyncClient() as client:
            api_host = os.getenv("API_HOST", "http://localhost:8000")
            response = await client.post(f"{api_host}/pedidos", json=erp_pedido_payload)
            response.raise_for_status()
        
        print(f"SUCESSO: Pedido {order_id} da loja {store_id} importado automaticamente para o ERP.")

    except Exception as e:
        print(f"ERRO ao processar notificação do pedido {order_id} da loja {store_id}: {e}")
        traceback.print_exc()

async def process_product_notification(store_id: int, product_id: int, db: Session):
    print(f"Processando notificação de produto da Tray: Loja={store_id}, Produto={product_id}")
    try:
        tray_service = TrayAPIService(store_id=store_id, db=db)
        product_details = await tray_service.get_product_details(product_id)

        sku = product_details.get("reference")
        novo_estoque = product_details.get("stock")

        if not sku:
            print(f"Produto {product_id} da Tray não possui SKU. Sincronização ignorada.")
            return

        conn = pool.get_connection()
        cursor = conn.cursor()
        query = "UPDATE produtos SET estoque_atual = %s WHERE sku = %s"
        cursor.execute(query, (int(novo_estoque), sku))
        conn.commit()
        
        if cursor.rowcount > 0:
            print(f"SUCESSO: Estoque do SKU '{sku}' atualizado para {novo_estoque} no ERP.")
        else:
            print(f"AVISO: SKU '{sku}' não encontrado no ERP. Estoque não atualizado.")
            
        cursor.close()
        conn.close()

    except Exception as e:
        print(f"ERRO ao processar notificação do produto {product_id} da loja {store_id}: {e}")
        traceback.print_exc()

@router.post("/tray/webhooks", status_code=status.HTTP_200_OK)
async def handle_tray_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    form_data = await request.form()
    scope_name = form_data.get("scope_name")
    scope_id = form_data.get("scope_id")
    store_id = form_data.get("store_id")
    act = form_data.get("act")

    if not all([scope_name, scope_id, store_id, act]):
        return {"message": "Notificação recebida, mas dados incompletos."}

    print(f"Webhook da Tray recebido: Loja={store_id}, Recurso='{scope_name}', ID='{scope_id}', Ação='{act}'")

    if scope_name == "order" and act in ["insert", "update"]:
        background_tasks.add_task(
            process_order_notification,
            int(store_id),
            int(scope_id),
            db
        )
    elif scope_name == "product" and act == "update":
        background_tasks.add_task(
            process_product_notification,
            int(store_id),
            int(scope_id),
            db
        )

    return {"message": "Notificação recebida com sucesso."}

@router.delete("/tray/credentials/{store_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove as credenciais de uma loja")
def delete_tray_credentials(store_id: int, db: Session = Depends(get_db)):
    """
    Desconecta uma loja, removendo suas credenciais do banco de dados.
    """
    credentials = db.query(TrayCredentials).filter(TrayCredentials.store_id == store_id).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credenciais não encontradas para a loja especificada.")
    
    db.delete(credentials)
    db.commit()
    return