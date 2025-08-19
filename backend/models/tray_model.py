# models/tray_model.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger
from sqlalchemy.sql import func
from config.database import Base
from pydantic import BaseModel, Field
from typing import Optional

# ==================================
#         MODELO DE CREDENCIAIS
# ==================================
# store_name e store_email foram removidos deste modelo.
class TrayCredentials(Base):
    __tablename__ = "tray_credentials"

    store_id = Column(BigInteger, primary_key=True, index=True)
    api_address = Column(String(255), nullable=False)
    access_token = Column(String(255), nullable=False)
    refresh_token = Column(String(255), nullable=False)
    date_expiration_access_token = Column(String(50), nullable=False)
    date_expiration_refresh_token = Column(String(50), nullable=False)
    date_activated = Column(String(50), nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# ==================================
#         MODELO DE CONFIGURAÇÕES
# ==================================
# store_name e store_email foram adicionados a este modelo.
class TrayConfiguracao(Base):
    __tablename__ = "tray_configuracoes"
    id = Column(Integer, primary_key=True, default=1)
    
    # Credenciais da Aplicação
    tray_consumer_key = Column(String(255), nullable=True)
    tray_consumer_secret = Column(String(255), nullable=True)
    
    # Informações da Loja (preenchidas pelo usuário)
    store_name = Column(String(255), nullable=True)
    store_email = Column(String(255), nullable=True)
    
    # Configurações de Pedidos
    aceite_automatico_pedidos = Column(Boolean, default=False)
    cliente_padrao_id = Column(Integer, nullable=True)
    vendedor_padrao_id = Column(Integer, nullable=True)
    situacao_pedido_inicial = Column(String(100), default='A ENVIAR')
    
    atualizado_em = Column(DateTime, default=func.now(), onupdate=func.now())

# ==================================
#         SCHEMA DE CONFIGURAÇÕES
# ==================================
# store_name e store_email foram adicionados a este schema.
class TrayConfiguracaoSchema(BaseModel):
    tray_consumer_key: Optional[str] = None
    tray_consumer_secret: Optional[str] = None
    
    store_name: Optional[str] = None
    store_email: Optional[str] = None
    
    aceite_automatico_pedidos: bool
    cliente_padrao_id: Optional[int] = None
    vendedor_padrao_id: Optional[int] = None
    situacao_pedido_inicial: Optional[str] = Field(None, max_length=100)

    class Config:
        from_attributes = True


class TrayAuthSuccessResponse(BaseModel):
    message: str = "Autenticação com a Tray Commerce realizada com sucesso!"
    store_id: int

class TrayStoreInfo(BaseModel):
    id: int
    name: str
    url: str
    email: str
