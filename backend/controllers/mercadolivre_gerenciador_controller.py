import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session # Usaremos a sessão apenas para instanciar o serviço
import traceback

# Importações do seu projeto
from config.database import get_db
from services.meli_service import MeliAPIService
from models.mercadolivre_model import MeliCredentials # Para consulta direta se necessário

router = APIRouter(
    prefix="/mercadolivre",
    tags=["Mercado Livre - Gerenciamento"]
)

@router.get("/status", summary="Verifica o status da conexão com o Mercado Livre")
async def get_integration_status(db: Session = Depends(get_db)):
    """
    Verifica se existem credenciais válidas no banco de dados e, em caso afirmativo,
    busca o apelido da conta conectada para exibir no frontend.
    """
    try:
        # Usamos o ORM aqui pois é uma consulta simples e já temos o modelo
        # Isso também facilita a transição se um dia migrar o resto do código
        credentials = db.query(MeliCredentials).first()

        if not credentials:
            return { "status": "desconectado" }

        # Se temos credenciais, vamos usar nosso MeliAPIService para buscar
        # os dados do usuário e confirmar que o token está funcionando.
        # O serviço já lida com a renovação do token se necessário.
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
            # Se o serviço falhar (ex: token revogado), consideramos como desconectado
            # e retornamos o erro para o frontend poder exibir uma mensagem útil.
            print(f"Erro ao validar token do ML: {e.detail}")
            return { "status": "erro_conexao", "detail": e.detail }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao verificar status da integração: {e}"
        )

