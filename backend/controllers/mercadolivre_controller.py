import os
import httpx
import secrets
import hashlib
import base64
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from dotenv import load_dotenv
from typing import Optional
from datetime import datetime, timedelta # Importado para calcular a expiração do token

# Importações do seu projeto
from config.database import Base, get_db

# ==================================
#              MODEL
# ==================================
class MeliCredentials(Base):
    __tablename__ = "meli_credentials"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(BigInteger, unique=True, nullable=False, index=True)
    access_token = Column(String(255), nullable=False)
    refresh_token = Column(String(255), nullable=False)
    expires_in = Column(Integer, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

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

# --- Configuração das Variáveis de Ambiente ---
MELI_APP_ID = os.getenv("MELI_APP_ID")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET")
MELI_REDIRECT_URI = os.getenv("MELI_REDIRECT_URI")

if not all([MELI_APP_ID, MELI_CLIENT_SECRET, MELI_REDIRECT_URI]):
    raise ImportError("Variáveis de ambiente do Mercado Livre não configuradas.")

pkce_verifier_storage = {}

# ===================================================================
# NOVO: FUNÇÃO PRIVADA PARA RENOVAR O TOKEN
# ===================================================================
async def _refresh_access_token(credentials: MeliCredentials, db: Session) -> MeliCredentials:
    """
    Função interna para renovar um access_token expirado usando o refresh_token.
    Recebe o objeto de credenciais e a sessão do banco como argumentos.
    """
    token_url = "https://api.mercadolibre.com/oauth/token"
    payload = {
        "grant_type": "refresh_token",
        "client_id": MELI_APP_ID,
        "client_secret": MELI_CLIENT_SECRET,
        "refresh_token": credentials.refresh_token,
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                token_url,
                headers={"Content-Type": "application/x-www-form-urlencoded", "Accept": "application/json"},
                data=payload
            )
            response.raise_for_status()
            token_data = response.json()

        # Atualiza o objeto de credenciais com os novos tokens
        credentials.access_token = token_data['access_token']
        credentials.refresh_token = token_data['refresh_token'] # O ML pode retornar um novo refresh_token
        credentials.expires_in = token_data['expires_in']
        # O campo 'last_updated' será atualizado automaticamente pelo banco de dados

        db.commit()
        db.refresh(credentials)
        print(f"Token para o user_id {credentials.user_id} foi renovado com sucesso.")
        return credentials

    except httpx.HTTPStatusError as e:
        # Se a renovação falhar (ex: refresh_token revogado), lança uma exceção.
        # O frontend precisará tratar isso pedindo para o usuário se autenticar novamente.
        error_details = e.response.json()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Não foi possível renovar o token. Por favor, autentique novamente. Erro: {error_details}"
        )

# --- Endpoints de Autenticação ---
@router.get("/auth", summary="Iniciar Autenticação com Mercado Livre (com PKCE)", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def start_meli_auth():
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
            db_credentials.access_token = token_data['access_token']
            db_credentials.refresh_token = token_data['refresh_token']
            db_credentials.expires_in = token_data['expires_in']
        else:
            new_credentials = MeliCredentials(**token_data)
            db.add(new_credentials)
        db.commit()
        return MeliAuthSuccessResponse(user_id=token_data['user_id'])
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao obter token do Mercado Livre: {e.response.json()}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro interno no servidor: {str(e)}")

# ===================================================================
# NOVO: ENDPOINT DE TESTE PARA VERIFICAR A RENOVAÇÃO DO TOKEN
# ===================================================================
@router.get("/me/{user_id}", summary="Busca dados do usuário e renova o token se necessário", response_model=MeliUserInfo)
async def get_user_info(user_id: int, db: Session = Depends(get_db)):
    """
    Este endpoint demonstra o fluxo completo de uma chamada de API autenticada:
    1. Busca as credenciais do usuário no banco.
    2. Verifica se o access_token expirou.
    3. Se sim, chama a função de renovação.
    4. Faz a chamada para a API do Mercado Livre com um token válido.
    """
    credentials = db.query(MeliCredentials).filter(MeliCredentials.user_id == user_id).first()
    if not credentials:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credenciais não encontradas para este usuário. Por favor, autentique primeiro.")

    # Verifica se o token expirou. Adicionamos uma margem de 60 segundos por segurança.
    expiration_time = credentials.last_updated + timedelta(seconds=credentials.expires_in - 60)
    if datetime.now(expiration_time.tzinfo) >= expiration_time:
        print(f"Token para o user_id {user_id} expirado. Tentando renovar...")
        credentials = await _refresh_access_token(credentials, db)

    # Agora, com a garantia de um token válido, fazemos a chamada à API
    user_info_url = "https://api.mercadolibre.com/users/me"
    auth_header = {"Authorization": f"Bearer {credentials.access_token}"}

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(user_info_url, headers=auth_header)
            response.raise_for_status()
            user_data = response.json()
            return user_data
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar dados do usuário no Mercado Livre: {e.response.json()}")

