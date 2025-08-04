# models/intelipost_model.py

from sqlalchemy import Column, Integer, String, DateTime, func
from config.database import Base

class IntelipostConfiguracao(Base):
    """
    Modelo SQLAlchemy para armazenar as configurações e credenciais
    da integração com a Intelipost.
    """
    __tablename__ = "intelipost_configuracoes"

    id = Column(Integer, primary_key=True, default=1)
    api_key = Column(String(255), nullable=True)
    origin_zip_code = Column(String(8), nullable=True)
    atualizado_em = Column(DateTime, default=func.now(), onupdate=func.now())

