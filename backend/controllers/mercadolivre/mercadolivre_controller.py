import os
import httpx
import secrets
import hashlib
import base64
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Importações do projeto
from config.database import Base, get_db
from services.meli_service import MeliAPIService # <<< NOVO IMPORT DO SERVIÇO

# Adicione ou garanta que esta linha exista no topo do seu controller
from models.mercadolivre_model import MeliCredentials

# ==================================
#              SCHEMA
# ==================================
class MeliAuthSuccessResponse(BaseModel):
    message: str = "Autenticação com Mercado Livre realizada com sucesso!"
    user_id: int
    class Config: from_attributes = True

class MeliUserInfo(BaseModel):
    id: int
    nickname: str
    email: str
    class Config: from_attributes = True

# ==================================
#           CONTROLLER
# ==================================
load_dotenv()
router = APIRouter(prefix="/mercadolivre", tags=["Mercado Livre"])

# ... (As variáveis de ambiente e o pkce_verifier_storage continuam aqui) ...
MELI_APP_ID = os.getenv("MELI_APP_ID")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET")
MELI_REDIRECT_URI = os.getenv("MELI_REDIRECT_URI")
pkce_verifier_storage = {}

# --- As rotas /auth e /callback continuam exatamente iguais ---
@router.get("/auth", summary="Iniciar Autenticação com Mercado Livre (com PKCE)", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def start_meli_auth():
    # ... (código inalterado) ...
    code_verifier = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(hashed).decode('utf-8').replace('=', '')
    state = secrets.token_urlsafe(16)
    pkce_verifier_storage[state] = code_verifier
    auth_url = (
        f"https://auth.mercadolivre.com.br/authorization?"
        f"response_type=code&client_id={MELI_APP_ID}&redirect_uri={MELI_REDIRECT_URI}"
        f"&code_challenge={code_challenge}&code_challenge_method=S256&state={state}"
    )
    return RedirectResponse(url=auth_url)

@router.get("/callback", summary="Callback de Autenticação do Mercado Livre (com PKCE)", response_model=MeliAuthSuccessResponse)
async def meli_auth_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    """
    Endpoint de callback que o Mercado Livre chama após a autorização do usuário.
    Recebe o 'code' de autorização, troca por um 'access_token' e o armazena no banco de dados.
    """
    code_verifier = pkce_verifier_storage.pop(state, None)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="State inválido ou verifier PKCE não encontrado.")

    token_url = "https://api.mercadolibre.com/oauth/token"
    payload = {
        "grant_type": "authorization_code", "client_id": MELI_APP_ID, "client_secret": MELI_CLIENT_SECRET,
        "code": code, "redirect_uri": MELI_REDIRECT_URI, "code_verifier": code_verifier,
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(token_url, headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"}, data=payload)
            response.raise_for_status()
            token_data = response.json()

        db_credentials = db.query(MeliCredentials).filter(MeliCredentials.user_id == token_data['user_id']).first()
        
        if db_credentials:
            # A lógica de atualização já estava correta (campo a campo)
            db_credentials.access_token = token_data['access_token']
            db_credentials.refresh_token = token_data['refresh_token']
            db_credentials.expires_in = token_data['expires_in']
        else:
            # ===== INÍCIO DA CORREÇÃO =====
            # Mapeamos explicitamente apenas os campos que nosso modelo MeliCredentials espera.
            # Isso ignora campos extras como 'token_type', 'scope', etc.
            new_credentials = MeliCredentials(
                user_id=token_data['user_id'],
                access_token=token_data['access_token'],
                refresh_token=token_data['refresh_token'],
                expires_in=token_data['expires_in']
            )
            # ===== FIM DA CORREÇÃO =====
            db.add(new_credentials)
            
        db.commit()
        return MeliAuthSuccessResponse(user_id=token_data['user_id'])

    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao obter token do Mercado Livre: {e.response.json()}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro interno no servidor: {str(e)}")


# ===================================================================
# ROTA DE TESTE REFATORADA PARA USAR O SERVIÇO
# ===================================================================
@router.get("/me/{user_id}", summary="Busca dados do usuário usando o MeliAPIService", response_model=MeliUserInfo)
async def get_user_info(user_id: int, db: Session = Depends(get_db)):
    """
    Este endpoint agora delega toda a lógica para a camada de serviço.
    É muito mais limpo e segue as boas práticas de arquitetura.
    """
    try:
        # 1. Instancia o serviço com o ID do usuário e a sessão do DB
        meli_service = MeliAPIService(user_id=user_id, db=db)
        
        # 2. Chama o método do serviço
        user_data = await meli_service.get_user_info()
        
        # 3. Retorna os dados
        return user_data
    except HTTPException as e:
        # Repassa exceções HTTP conhecidas (como 404, 401) para o FastAPI
        raise e
    except Exception as e:
        # Captura qualquer outro erro inesperado do serviço
        raise HTTPException(status_code=500, detail=f"Erro inesperado no serviço: {str(e)}")

