from sqlalchemy import (Column, Integer, String, DateTime, func, DECIMAL, 
                        ForeignKey, Enum, Text, PrimaryKeyConstraint)
from sqlalchemy.orm import relationship
from config.database import Base

class EstoquePosicao(Base):
    __tablename__ = "estoque"
    id_produto = Column(Integer, ForeignKey("produtos.id"), primary_key=True)
    lote = Column(String(50), primary_key=True)
    deposito = Column(String(100), primary_key=True)
    rua = Column(String(50), primary_key=True)
    numero = Column(Integer, primary_key=True)
    nivel = Column(Integer, primary_key=True)
    cor = Column(String(50), primary_key=True)
    situacao_estoque = Column(String(100), primary_key=True)
    quantidade = Column(DECIMAL(10, 2), nullable=False)
    data_ultima_modificacao = Column(DateTime, server_default=func.now(), onupdate=func.now())
    produto = relationship("Produto", back_populates="posicoes_estoque")
    __table_args__ = (PrimaryKeyConstraint('id_produto', 'lote', 'deposito', 'rua', 'numero', 'nivel', 'cor', 'situacao_estoque'),)