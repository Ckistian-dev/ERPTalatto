from sqlalchemy import Column, Integer, String, Date, DECIMAL, Text
from sqlalchemy.dialects.mysql import LONGTEXT
from config.database import Base

class Orcamento(Base):
    __tablename__ = "orcamentos"

    id = Column(Integer, primary_key=True, index=True)
    
    situacao_orcamento = Column(String(50), default="Orçamento")
    data_emissao = Column(Date, nullable=False)
    data_validade = Column(Date, nullable=False)

    cliente_id = Column(Integer)
    cliente_nome = Column(String(255))
    
    vendedor_id = Column(Integer)
    vendedor_nome = Column(String(255))
    
    origem_venda = Column(String(100))

    tipo_frete = Column(String(50))
    transportadora_id = Column(Integer)
    transportadora_nome = Column(String(255))

    valor_frete = Column(DECIMAL(10, 2), default=0.00)
    total = Column(DECIMAL(10, 2), default=0.00)
    desconto_total = Column(DECIMAL(10, 2), default=0.00)
    total_com_desconto = Column(DECIMAL(10, 2), default=0.00)

    lista_itens = Column(LONGTEXT)   # JSON em string
    formas_pagamento = Column(LONGTEXT)  # JSON em string

    observacao = Column(Text)

    criado_em = Column(String(25))