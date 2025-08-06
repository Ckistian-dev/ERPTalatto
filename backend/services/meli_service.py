import os
import httpx
import asyncio
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional, List

# Importações do seu projeto
from models.mercadolivre_model import MeliCredentials

# Carrega variáveis de ambiente
load_dotenv()
MELI_APP_ID = os.getenv("MELI_APP_ID")
MELI_CLIENT_SECRET = os.getenv("MELI_CLIENT_SECRET")

class MeliAPIService:
    """
    Classe de serviço para encapsular toda a comunicação com a API do Mercado Livre.
    """
    def __init__(self, user_id: int, db: Session):
        self.db = db
        self.user_id = user_id
        self.base_url = "https://api.mercadolibre.com"
        self.credentials = db.query(MeliCredentials).filter(MeliCredentials.user_id == self.user_id).first()
        if not self.credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Credenciais não encontradas para o user_id {self.user_id}. Por favor, autentique primeiro."
            )

    async def _refresh_token(self):
        """Renova o access_token usando o refresh_token."""
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
            
            self.credentials.access_token = token_data['access_token']
            self.credentials.refresh_token = token_data['refresh_token']
            self.credentials.expires_in = token_data['expires_in']
            # Atualiza o timestamp para refletir a última atualização do token
            self.credentials.last_updated = datetime.utcnow()
            self.db.commit()
            self.db.refresh(self.credentials)
            print(f"Token para o user_id {self.user_id} foi renovado com sucesso.")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Não foi possível renovar o token. O usuário pode ter revogado o acesso. Erro: {e.response.json()}")

    async def _get_auth_header(self) -> dict:
        """Verifica a validade do token e o renova se necessário antes de retornar o cabeçalho."""
        # Usa UTC para uma comparação de timezone consistente
        expiration_time = self.credentials.last_updated + timedelta(seconds=self.credentials.expires_in - 120)
        if datetime.utcnow() >= expiration_time:
            await self._refresh_token()
        return {"Authorization": f"Bearer {self.credentials.access_token}"}

    async def get_user_info(self) -> dict:
        """Busca informações do usuário autenticado (/users/me)."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/users/me"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API do ML ao buscar dados do usuário: {e.response.json()}")

    async def search_categories(self, title: str, limit: int = 1) -> list:
        """Busca sugestões de categorias para um título de produto."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/sites/MLB/domain_discovery/search"
        params = {"q": title, "limit": limit}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header, params=params)
                response.raise_for_status()
                data = response.json()
            if not data:
                raise HTTPException(status_code=404, detail="Nenhuma categoria encontrada para o título fornecido.")
            return data[0] if limit == 1 else data
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar categorias: {e.response.json()}")
            
    async def get_category_attributes(self, category_id: str) -> list:
        """Busca os atributos (ficha técnica) de uma categoria."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/categories/{category_id}/attributes"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar atributos da categoria: {e.response.json()}")

    async def get_listing_types(self) -> list:
        """Busca os tipos de anúncio disponíveis (Clássico, Premium)."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/sites/MLB/listing_types"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar tipos de anúncio: {e.response.json()}")

    async def get_items_details(self, item_ids: List[str]) -> list:
        """Busca detalhes para uma lista de IDs de anúncios."""
        if not item_ids:
            return []
        auth_header = await self._get_auth_header()
        details_url = f"{self.base_url}/items"
        params = {"ids": ",".join(item_ids), "attributes": "id,title,price,available_quantity,seller_sku,status,permalink,variations"}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(details_url, headers=auth_header, params=params)
                response.raise_for_status()
                return [item.get("body", {}) for item in response.json() if item.get("code") == 200]
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar detalhes dos itens: {e.response.json()}")
    
    async def get_seller_items_paged(self, limit: int, offset: int) -> dict:
        """Busca os anúncios do vendedor de forma paginada."""
        auth_header = await self._get_auth_header()
        search_url = f"{self.base_url}/users/{self.user_id}/items/search"
        search_params = {"status": "active,paused", "limit": limit, "offset": offset}
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                search_response = await client.get(search_url, headers=auth_header, params=search_params)
                search_response.raise_for_status()
                search_data = search_response.json()
            item_ids_on_page = search_data.get("results", [])
            paging_info = search_data.get("paging", {})
            if not item_ids_on_page:
                return {"paging": paging_info, "results": []}
            details_for_page = await self.get_items_details(item_ids_on_page)
            return {"paging": paging_info, "results": details_for_page}
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar anúncios paginados do vendedor: {e.response.json()}")

    async def publish_or_update_item(self, item_payload: dict, meli_item_id: Optional[str] = None):
        """Cria um novo anúncio ou atualiza um existente."""
        required_fields = ["title", "category_id", "listing_type_id", "price", "available_quantity"]
        for field in required_fields:
            if not item_payload.get(field):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"O campo '{field}' é obrigatório.")
        auth_header = await self._get_auth_header()
        attributes_raw = item_payload.get("attributes", [])
        attributes_formatted = []
        for attr in attributes_raw:
            if attr.get("value_id"):
                attributes_formatted.append({"id": attr["id"], "value_id": attr["value_id"]})
            elif attr.get("value_name"):
                attributes_formatted.append({"id": attr["id"], "value_name": attr["value_name"]})
        attributes_formatted.append({"id": "ITEM_CONDITION", "value_id": "2230284"})
        sale_terms_formatted = [
            {"id": "WARRANTY_TYPE", "value_id": "2230280"},
            {"id": "WARRANTY_TIME", "value_name": "90 dias"}
        ]
        pictures_formatted = [{"source": pic_url} for pic_url in item_payload.get("pictures", []) if pic_url]
        ml_item_data = {
            "title": item_payload["title"],
            "category_id": item_payload["category_id"],
            "listing_type_id": item_payload["listing_type_id"],
            "price": float(item_payload["price"]),
            "currency_id": "BRL",
            "available_quantity": int(item_payload["available_quantity"]),
            "buying_mode": "buy_it_now",
            "pictures": pictures_formatted,
            "attributes": attributes_formatted,
            "sale_terms": sale_terms_formatted,
            "seller_sku": item_payload.get("seller_sku")
        }
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                if meli_item_id:
                    update_data = { "title": ml_item_data["title"], "price": ml_item_data["price"], "available_quantity": ml_item_data["available_quantity"], "pictures": ml_item_data["pictures"], "attributes": ml_item_data["attributes"], "sale_terms": ml_item_data["sale_terms"] }
                    url = f"{self.base_url}/items/{meli_item_id}"
                    response = await client.put(url, headers=auth_header, json=update_data)
                else:
                    ml_item_data["status"] = "active"
                    url = f"{self.base_url}/items"
                    response = await client.post(url, headers=auth_header, json=ml_item_data)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_body = e.response.json()
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro da API do Mercado Livre: {error_body.get('message', 'Erro desconhecido.')} Causa: {error_body.get('cause', [])}")

    async def get_order_details(self, order_id: int) -> dict:
        """Busca os detalhes completos de um pedido específico."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/orders/{order_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API do ML ao buscar pedido {order_id}: {e.response.json()}")

    async def get_recent_orders(self, limit: int = 50, offset: int = 0) -> dict:
        """Busca os pedidos de venda mais recentes do vendedor."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/orders/search"
        data_final = datetime.now()
        data_inicial = data_final - timedelta(days=180)
        params = {
            "seller": self.user_id,
            "sort": "date_desc",
            "order.date_created.from": data_inicial.strftime('%Y-%m-%dT00:00:00.000-03:00'),
            "order.date_created.to": data_final.strftime('%Y-%m-%dT23:59:59.999-03:00'),
            "limit": limit,
            "offset": offset
        }
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, headers=auth_header, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar pedidos no Mercado Livre: {e.response.json()}")
            
    async def get_unanswered_questions(self, limit: int = 50, offset: int = 0) -> dict:
        """Busca as perguntas não respondidas de um vendedor."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/questions/search"
        params = {"seller_id": self.user_id, "status": "UNANSWERED", "sort": "date_desc", "limit": limit, "offset": offset}
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(url, headers=auth_header, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar perguntas: {e.response.json()}")

    async def post_answer(self, question_id: int, text: str) -> dict:
        """Envia uma resposta para uma pergunta específica."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/answers"
        payload = {"question_id": question_id, "text": text}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=auth_header, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao enviar resposta: {e.response.json()}")
            
    async def update_item_sku(self, meli_item_id: str, sku: str):
        """Atualiza o campo seller_sku de um anúncio."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/items/{meli_item_id}"
        payload = {"seller_sku": sku}
        try:
            async with httpx.AsyncClient() as client:
                response = await client.put(url, headers=auth_header, json=payload)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            error_body = e.response.json()
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao vincular SKU: {error_body.get('message', 'Erro desconhecido.')}")
            
    async def get_shipment_details(self, shipment_id: int) -> dict:
        """Busca os detalhes completos de um envio (shipping), que contém o endereço e documento."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/shipments/{shipment_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API do ML ao buscar detalhes do envio {shipment_id}: {e.response.json()}")
            
    async def get_user_details(self, user_id: int) -> dict:
        """Busca os detalhes públicos de um usuário (comprador)."""
        auth_header = await self._get_auth_header()
        url = f"{self.base_url}/users/{user_id}"
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=auth_header)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro ao buscar dados do comprador ID {user_id}: {e.response.json()}")
