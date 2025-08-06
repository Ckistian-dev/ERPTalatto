# models/tray_model.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger
from sqlalchemy.sql import func
from config.database import Base, get_db
from pydantic import BaseModel, Field
from typing import Optional

# ==================================
#         MODELO DE CREDENCIAIS
# ==================================
# Este modelo armazena as informações de autenticação para CADA loja Tray que se conectar.
# É o equivalente ao 'MeliCredentials', mas projetado para o fluxo da Tray.
class TrayCredentials(Base):
    """
    Modelo SQLAlchemy para armazenar as credenciais de autenticação da Tray.
    Cada registro representa uma loja conectada.
    """
    __tablename__ = "tray_credentials"

    # A Tray não fornece um 'user_id' numérico fixo como o Mercado Livre durante a autenticação.
    # Usaremos o 'store_id' da loja como chave primária e identificador único.
    store_id = Column(BigInteger, primary_key=True, index=True)

    # O endereço base da API para esta loja específica (ex: https://api.tray.com.br/v1).
    # É fornecido durante o callback de autorização e é essencial para todas as chamadas.
    api_address = Column(String(255), nullable=False)

    # O token de acesso para fazer chamadas à API. Geralmente expira em algumas horas.
    access_token = Column(String(255), nullable=False)

    # O token de atualização para obter novos access_tokens. É de longa duração.
    refresh_token = Column(String(255), nullable=False)

    # Data e hora em que o token expira, conforme retornado pela API da Tray.
    date_expires = Column(String(50), nullable=False)
    
    # Data e hora da última atualização do registro.
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

# ==================================
#         MODELO DE CONFIGURAÇÕES (ATUALIZADO)
# ==================================
class TrayConfiguracao(Base):
    __tablename__ = "tray_configuracoes"
    id = Column(Integer, primary_key=True, default=1)
    
    # Credenciais da Aplicação (Movidas para cá)
    tray_consumer_key = Column(String(255), nullable=True)
    tray_consumer_secret = Column(String(255), nullable=True)
    
    # Configurações de Pedidos
    aceite_automatico_pedidos = Column(Boolean, default=False)
    cliente_padrao_id = Column(Integer, nullable=True)
    vendedor_padrao_id = Column(Integer, nullable=True)
    situacao_pedido_inicial = Column(String(100), default='A ENVIAR')
    
    atualizado_em = Column(DateTime, default=func.now(), onupdate=func.now())

# ==================================
#         SCHEMA (ATUALIZADO)
# ==================================
class TrayConfiguracaoSchema(BaseModel):
    # Credenciais da Aplicação
    tray_consumer_key: Optional[str] = None
    tray_consumer_secret: Optional[str] = None
    
    # Configurações de Pedidos
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
