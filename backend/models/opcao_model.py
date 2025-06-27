from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Opcao(Base):
    __tablename__ = "opcoes"

    id = Column(Integer, primary_key=True, index=True)
    tipo = Column(String(50), index=True)    # Ex: "unidade", "grupo"
    valor = Column(String(100), nullable=False)
