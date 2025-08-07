# models/tray_model.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger
from sqlalchemy.sql import func
from config.database import Base, get_db
from pydantic import BaseModel, Field
from typing import Optional

# ==================================
#         MODELO DE CREDENCIAIS
# ==================================
class TrayCredentials(Base):
    """
    Modelo SQLAlchemy para armazenar as credenciais de autenticação da Tray.
    Cada registro representa uma loja conectada.
    VERSÃO ATUALIZADA E PADRONIZADA.
    """
    __tablename__ = "tray_credentials"

    # Chave primária, o ID da loja na Tray
    store_id = Column(BigInteger, primary_key=True, index=True)

    # O endereço base da API para esta loja (ex: https://api.tray.com.br/v1)
    api_address = Column(String(255), nullable=False)

    # O token de acesso para fazer chamadas à API. Curta duração.
    access_token = Column(String(255), nullable=False)

    # O token de atualização para obter novos access_tokens. Longa duração.
    refresh_token = Column(String(255), nullable=False)

    # --- CAMPOS ATUALIZADOS E NOVOS ---

    # RENOMEADO: Data e hora em que o access_token expira.
    date_expiration_access_token = Column(String(50), nullable=False)

    # NOVO: Data e hora em que o refresh_token expira.
    date_expiration_refresh_token = Column(String(50), nullable=False)

    # NOVO: Data em que as chaves foram ativadas.
    date_activated = Column(String(50), nullable=False)
    
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
