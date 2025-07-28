from fastapi import APIRouter, Depends, Request, BackgroundTasks, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

# Importações do seu projeto
from config.database import get_db
from services.meli_service import MeliAPIService

# Cria um novo roteador específico para os webhooks
router = APIRouter(
    prefix="/mercadolivre",
    tags=["Mercado Livre - Webhooks"]
)

# --- Schema para validar a notificação recebida do Mercado Livre ---
class MeliWebhookNotification(BaseModel):
    user_id: int
    resource: str # Ex: "/orders/123456789"
    topic: str    # Ex: "orders_v2"
    application_id: int
    attempts: int
    sent: str
    received: str

# --- Funções de Processamento em Segundo Plano ---

async def process_order_notification(user_id: int, resource_url: str, db: Session):
    """
    Esta função é executada em segundo plano para processar notificações de pedidos.
    """
    print(f"Processando notificação de pedido para o user_id: {user_id}, recurso: {resource_url}")
    try:
        # Extrai o ID do pedido da URL do recurso
        order_id = int(resource_url.split('/')[-1])

        # Usa o MeliAPIService para buscar os detalhes completos do pedido
        meli_service = MeliAPIService(user_id=user_id, db=db)
        order_details = await meli_service.get_order_details(order_id)

        #
        # AQUI VOCÊ ADICIONA A LÓGICA DO SEU ERP:
        # 1. Verifique se o pedido já existe no seu banco de dados.
        # 2. Se não existir, salve-o.
        # 3. Se já existir, atualize o status (ex: pagamento confirmado).
        # 4. Dê baixa no estoque do produto vendido.
        # 5. Envie uma notificação interna para sua equipe de expedição.
        #
        print(f"Detalhes do pedido {order_id} obtidos e processados com sucesso: {order_details.get('status')}")

    except Exception as e:
        # É importante ter um log de erros para qualquer falha no processamento
        print(f"ERRO ao processar notificação de pedido {resource_url}: {e}")

# --- Endpoint Principal de Webhooks ---

@router.post("/webhooks", status_code=status.HTTP_200_OK)
async def handle_mercadolivre_webhook(
    notification: MeliWebhookNotification,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Este é o endpoint que receberá todas as notificações do Mercado Livre.
    Ele responde imediatamente com 200 OK e delega o processamento real
    para uma tarefa em segundo plano.
    """
    print(f"Webhook recebido: Tópico='{notification.topic}', Recurso='{notification.resource}'")

    # Adiciona a tarefa de processamento apropriada à fila de segundo plano
    if notification.topic == "orders_v2":
        background_tasks.add_task(
            process_order_notification,
            notification.user_id,
            notification.resource,
            db
        )
    elif notification.topic == "questions":
        # Você pode criar uma função 'process_question_notification' similar
        print("Notificação de pergunta recebida. Lógica de processamento a ser implementada.")
    
    # Retorna a resposta de sucesso IMEDIATAMENTE.
    # Não espera o processamento terminar.
    return {"message": "Notificação recebida com sucesso."}

