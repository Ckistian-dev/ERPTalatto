import os
import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from datetime import datetime, timedelta
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any

# Importa o modelo de credenciais da Tray
from models.tray_model import TrayCredentials

load_dotenv()
TRAY_CONSUMER_KEY = os.getenv("TRAY_CONSUMER_KEY")
TRAY_CONSUMER_SECRET = os.getenv("TRAY_CONSUMER_SECRET")
TRAY_CALLBACK_URL = os.getenv("TRAY_CALLBACK_URL")

class TrayAPIService:
    """
    Camada de serviço para encapsular toda a lógica de comunicação com a API da Tray.
    """
    def __init__(self, store_id: int, db: Session):
        self.db = db
        self.store_id = store_id
        self.credentials = db.query(TrayCredentials).filter(TrayCredentials.store_id == self.store_id).first()
        if not self.credentials:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Credenciais não encontradas para a loja Tray ID {self.store_id}. Por favor, autentique primeiro."
            )
        self.base_url = self.credentials.api_address

    async def _refresh_token(self):
        print(f"Token para a loja Tray {self.store_id} expirado. Tentando renovar...")
        refresh_url = f"{self.base_url}/auth" 
        params = {"refresh_token": self.credentials.refresh_token}
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(refresh_url, params=params)
                response.raise_for_status()
                token_data = response.json()

                if 'code' in token_data and str(token_data.get('code')) not in ['200', '201']:
                    raise HTTPException(
                        status_code=token_data.get('code', 400), 
                        detail=f"Erro ao renovar token: {token_data.get('message', 'Erro desconhecido')}"
                    )

                self.credentials.access_token = token_data['access_token']
                self.credentials.refresh_token = token_data['refresh_token']
                self.credentials.date_expiration_access_token = token_data['date_expiration_access_token']
                self.credentials.date_expiration_refresh_token = token_data['date_expiration_refresh_token']
                self.credentials.date_activated = token_data['date_activated']
                
                self.db.commit()
                self.db.refresh(self.credentials)
                print(f"Token para a loja Tray {self.store_id} foi renovado com sucesso.")
        
        except httpx.HTTPStatusError as e:
            error_detail = e.response.json() if "json" in e.response.headers.get("content-type", "") else e.response.text
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail=f"Não foi possível renovar o token. O usuário pode ter revogado o acesso. Erro: {error_detail}"
            )

    async def _get_auth_params(self) -> dict:
        """
        Verifica a validade do token e o renova se necessário, usando UTC para a comparação.
        """
        expiration_time = datetime.strptime(self.credentials.date_expiration_access_token, '%Y-%m-%d %H:%M:%S')
        
        # ===================================================================
        # CORREÇÃO FINAL: FUSO HORÁRIO
        # Usamos datetime.utcnow() para comparar a hora atual em UTC com a
        # hora de expiração que a API da Tray também fornece em UTC.
        # Isso resolve o loop de renovação.
        # ===================================================================
        if datetime.utcnow() >= (expiration_time - timedelta(seconds=60)):
            await self._refresh_token()
            
        return {"access_token": self.credentials.access_token}


    async def _make_request(self, method: str, endpoint: str, params: Optional[dict] = None, json_data: Optional[dict] = None) -> dict:
        auth_params = await self._get_auth_params()
        url = f"{self.base_url}{endpoint}"
        
        full_params = {**(params or {})}
        full_params.update(auth_params)
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.request(method, url, params=full_params, json=json_data)
                response.raise_for_status()
                json_response = response.json()
                if 'code' in json_response and str(json_response.get('code')) not in ['200', '201']:
                     raise HTTPException(status_code=int(json_response['code']), detail=json_response.get('message', 'Erro retornado pela API da Tray.'))
                return json_response
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API da Tray: {e.response.text}")

    # ===================================================================
    # MÉTODOS DE INFORMAÇÕES GERAIS
    # ===================================================================
    async def get_store_info(self) -> dict:
        response = await self._make_request("GET", "/informations")
        if "Informations" in response:
            return response["Informations"]
        raise HTTPException(status_code=404, detail="Não foi possível obter informações da loja.")

    # ===================================================================
    # MÉTODOS PARA PRODUTOS
    # ===================================================================
    async def get_products_by_sku(self) -> Dict[str, Any]:
        all_products = {}
        page = 1
        while True:
            try:
                response = await self._make_request("GET", "/products", params={"page": page, "limit": 50})
                products = response.get("Products", [])
                if not products:
                    break
                
                for product_wrapper in products:
                    product = product_wrapper.get("Product")
                    if product and product.get("reference"):
                        all_products[product["reference"]] = {
                            "id": product.get("id"),
                            "name": product.get("name"),
                            "price": product.get("price"),
                            "stock": product.get("stock"),
                            "available": product.get("available"),
                            "url": product.get("url", {}).get("https_image_path")
                        }
                
                if len(products) < 50:
                    break
                page += 1
            except HTTPException as e:
                print(f"Erro ao buscar página {page} de produtos da Tray: {e.detail}")
                break
            
        return all_products

    async def search_categories(self, name: str, limit: int = 10) -> List[Dict[str, Any]]:
        response = await self._make_request("GET", "/categories", params={"name": name, "limit": limit})
        categories_found = []
        if "Categories" in response:
            for cat_wrapper in response["Categories"]:
                category = cat_wrapper.get("Category")
                if category:
                    categories_found.append({
                        "id": category.get("id"),
                        "name": category.get("name"),
                        "path": category.get("path") 
                    })
        return categories_found

    async def publish_or_update_product(self, product_payload: dict, tray_product_id: Optional[int] = None):
        endpoint = "/products"
        method = "POST"
        
        if tray_product_id:
            endpoint = f"/products/{tray_product_id}"
            method = "PUT"
            
        wrapped_payload = {"product": product_payload}
        
        return await self._make_request(method, endpoint, json_data=wrapped_payload)

    # ===================================================================
    # MÉTODOS PARA PEDIDOS
    # ===================================================================
    async def get_recent_orders(self, limit: int = 50, offset: int = 0) -> Dict[str, Any]:
        page = (offset // limit) + 1
        params = {
            "limit": limit,
            "page": page,
            "sort": "id_desc"
        }
        return await self._make_request("GET", "/orders", params=params)

    async def get_order_details(self, order_id: int) -> Dict[str, Any]:
        response = await self._make_request("GET", f"/orders/{order_id}")
        if "Order" in response:
            return response["Order"]
        raise HTTPException(status_code=404, detail=f"Pedido com ID {order_id} não encontrado na Tray.")
    
    # ===================================================================
    # MÉTODO PARA BUSCAR DETALHES DE UM PRODUTO
    # ===================================================================
    async def get_product_details(self, product_id: int) -> Dict[str, Any]:
        response = await self._make_request("GET", f"/products/{product_id}")
        if "Product" in response:
            return response["Product"]
        raise HTTPException(status_code=404, detail=f"Produto com ID {product_id} não encontrado na Tray.")
    
    # ===================================================================
    # MÉTODO PARA ATUALIZAR STATUS E RASTREIO DO PEDIDO (ERP -> TRAY)
    # ===================================================================
    async def update_order_status_and_tracking(
        self, 
        order_id: int, 
        status_name: str, 
        tracking_code: Optional[str] = None, 
        shipping_company: Optional[str] = None,
        tracking_url: Optional[str] = None
    ):
        endpoint = f"/orders/{order_id}"
        
        order_data = {
            "status": status_name,
            "shipment_code": tracking_code,
            "shipment": shipping_company,
            "shipment_url": tracking_url
        }

        order_data = {k: v for k, v in order_data.items() if v is not None}

        wrapped_payload = {"Order": order_data}
        
        print(f"Enviando atualização de status para Tray (Pedido ID: {order_id}): {wrapped_payload}")
        
        return await self._make_request("PUT", endpoint, json_data=wrapped_payload)