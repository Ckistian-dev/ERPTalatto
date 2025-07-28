import os
import httpx
import secrets  # Biblioteca para gerar segredos criptograficamente seguros
import hashlib  # Biblioteca para gerar hashes (SHA256)
import base64   # Biblioteca para codificação em base64
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from dotenv import load_dotenv
from typing import Optional
from datetime import datetime

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

    class Config:
        from_attributes = True

# ==================================
#           CONTROLLER
# ==================================
load_dotenv()

router = APIRouter(
    prefix="/mercadolivre",
    tags=["Mercado Livre"]
)

# --- Configuração das Variáveis de Ambiente ---
MELI_APP_ID = os.getenv("MELI_APP_ID")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET")
MELI_REDIRECT_URI = os.getenv("MELI_REDIRECT_URI")

if not all([MELI_APP_ID, MELI_CLIENT_SECRET, MELI_REDIRECT_URI]):
    raise ImportError("Variáveis de ambiente do Mercado Livre não configuradas.")

# ATENÇÃO: Este armazenamento em memória é apenas para demonstração.
# Em produção com múltiplos usuários ou processos, use um sistema de sessão
# (como o SessionMiddleware do Starlette) ou um cache externo (Redis)
# para armazenar o code_verifier de forma segura entre as requisições.
pkce_verifier_storage = {}

@router.get("/auth", summary="Iniciar Autenticação com Mercado Livre (com PKCE)", status_code=status.HTTP_307_TEMPORARY_REDIRECT)
async def start_meli_auth():
    """
    Inicia o fluxo de autenticação OAuth 2.0, agora com o desafio PKCE.
    """
    # ETAPA 1 (PKCE): Gerar um 'verifier' e um 'challenge'.
    code_verifier = secrets.token_urlsafe(64)
    hashed = hashlib.sha256(code_verifier.encode('utf-8')).digest()
    code_challenge = base64.urlsafe_b64encode(hashed).decode('utf-8').replace('=', '')

    # Geramos um 'state' para proteção contra CSRF e para associar o verifier a esta requisição.
    state = secrets.token_urlsafe(16)
    pkce_verifier_storage[state] = code_verifier # Armazena o verifier temporariamente

    # ETAPA 2 (PKCE): Adicionar o 'code_challenge' e o 'state' à URL de autorização.
    auth_url = (
        f"https://auth.mercadolivre.com.br/authorization?"
        f"response_type=code&client_id={MELI_APP_ID}"
        f"&redirect_uri={MELI_REDIRECT_URI}"
        f"&code_challenge={code_challenge}"
        f"&code_challenge_method=S256"
        f"&state={state}" # O state é crucial para segurança e para encontrar o verifier depois
    )
    return RedirectResponse(url=auth_url)

@router.get("/callback", summary="Callback de Autenticação do Mercado Livre (com PKCE)", response_model=MeliAuthSuccessResponse)
async def meli_auth_callback(code: str = Query(...), state: str = Query(...), db: Session = Depends(get_db)):
    """
    Recebe a resposta do Mercado Livre, incluindo o 'state', e finaliza o fluxo PKCE.
    """
    # ETAPA 3 (PKCE): Recuperar o 'code_verifier' que foi armazenado usando o 'state'.
    code_verifier = pkce_verifier_storage.pop(state, None)
    if not code_verifier:
        raise HTTPException(status_code=400, detail="State inválido ou verifier PKCE não encontrado. A sessão pode ter expirado.")

    token_url = "https://api.mercadolibre.com/oauth/token"

    # ETAPA 4 (PKCE): Adicionar o 'code_verifier' original no corpo da requisição do token.
    payload = {
        "grant_type": "authorization_code",
        "client_id": MELI_APP_ID,
        "client_secret": MELI_CLIENT_SECRET,
        "code": code,
        "redirect_uri": MELI_REDIRECT_URI,
        "code_verifier": code_verifier, # << NOVO CAMPO ADICIONADO AQUI
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

        db_credentials = db.query(MeliCredentials).filter(MeliCredentials.user_id == token_data['user_id']).first()
        if db_credentials:
            db_credentials.access_token = token_data['access_token']
            db_credentials.refresh_token = token_data['refresh_token']
            db_credentials.expires_in = token_data['expires_in']
        else:
            new_credentials = MeliCredentials(
                user_id=token_data['user_id'],
                access_token=token_data['access_token'],
                refresh_token=token_data['refresh_token'],
                expires_in=token_data['expires_in']
            )
            db.add(new_credentials)
        db.commit()
        return MeliAuthSuccessResponse(user_id=token_data['user_id'])

    except httpx.HTTPStatusError as e:
        error_details = e.response.json() if e.response.content else {"error": "unknown_meli_error"}
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao obter token do Mercado Livre: {error_details}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro interno no servidor: {str(e)}")

