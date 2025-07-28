import os
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Importa o modelo de dados para interagir com o banco
from models.mercadolivre_model import MeliCredentials

# Carrega as variáveis de ambiente necessárias para a renovação de token
load_dotenv()
MELI_APP_ID = os.getenv("MELI_APP_ID")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET")


class MeliAPIService:
    """
    Camada de serviço para centralizar todas as interações com a API do Mercado Livre.
    Gerencia automaticamente a validação e renovação de tokens de acesso.
    """
    def __init__(self, user_id: int, db: Session):
        self.db = db
        self.user_id = user_id
        self.base_url = "https://api.mercadolibre.com"

        # Ao instanciar o serviço, busca imediatamente as credenciais do usuário
        self.credentials = db.query(MeliCredentials).filter(MeliCredentials.user_id == self.user_id).first()
        if not self.credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Credenciais não encontradas para o user_id {self.user_id}. Por favor, autentique primeiro."
            )

    async def _refresh_token(self):
        """
        Método privado que encapsula a lógica de renovação de token.
        """
        print(f"Token para o user_id {self.user_id} expirado. Tentando renovar...")
        token_url = f"{self.base_url}/oauth/token"
        payload = {
            "grant_type": "refresh_token",
            "client_id": MELI_APP_ID,
            "client_secret": MELI_CLIENT_SECRET,
            "refresh_token": self.credentials.refresh_token,
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(token_url, data=payload)
                response.raise_for_status()
                token_data = response.json()

            # Atualiza o objeto de credenciais em memória e no banco
            self.credentials.access_token = token_data['access_token']
            self.credentials.refresh_token = token_data['refresh_token']
            self.credentials.expires_in = token_data['expires_in']
            
            self.db.commit()
            self.db.refresh(self.credentials)
            print(f"Token para o user_id {self.user_id} foi renovado com sucesso.")
        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Não foi possível renovar o token. O usuário pode ter revogado o acesso. Erro: {e.response.json()}"
            )

    async def _get_auth_header(self) -> dict:
        """
        Verifica a validade do token e o renova se necessário antes de retornar o cabeçalho de autorização.
        """
        # Adiciona uma margem de segurança de 60 segundos para evitar usar um token no último segundo de vida
        expiration_time = self.credentials.last_updated + timedelta(seconds=self.credentials.expires_in - 60)
        
        # Compara com o tempo atual (com o mesmo fuso horário)
        if datetime.now(expiration_time.tzinfo) >= expiration_time:
            await self._refresh_token()
        
        return {"Authorization": f"Bearer {self.credentials.access_token}"}

    # --- Métodos Públicos para Interagir com a API ---

    async def get_user_info(self) -> dict:
        """
        Busca as informações do usuário autenticado ('/users/me').
        """
        # Sempre obtém o cabeçalho antes de cada chamada, garantindo um token válido
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/users/me"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API do ML ao buscar dados do usuário: {e.response.json()}")

    # Exemplo de como você adicionaria novas funcionalidades no futuro
    async def get_order_details(self, order_id: int) -> dict:
        """
        Busca os detalhes de um pedido específico.
        """
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/orders/{order_id}"

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API do ML ao buscar pedido {order_id}: {e.response.json()}")
