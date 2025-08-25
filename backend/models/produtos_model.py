# /models/produtos_model.py

from sqlalchemy import Column, Integer, String, DECIMAL, Boolean
from sqlalchemy.orm import relationship
from config.database import Base

class Produto(Base):
    """
    Modelo SQLAlchemy para a tabela 'produtos'.
    Mapeia os campos essenciais necessários para a emissão da NF-e.
    """
    __tablename__ = "produtos"
    
    id = Column(Integer, primary_key=True)
    sku = Column(String(255), nullable=False)
    descricao = Column(String(255))
    unidade = Column(String(10))
    classificacao_fiscal = Column(String(8))  # NCM
    origem = Column(String(1))
    gtin = Column(String(14))
    gtin_tributavel = Column(String(14))
    
    posicoes_estoque = relationship("EstoquePosicao", back_populates="produto")
