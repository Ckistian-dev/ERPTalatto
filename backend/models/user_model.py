# models/user_model.py
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from datetime import datetime
from config.database import Base # Importa a Base do nosso arquivo de configuração

class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha = Column(String(255), nullable=False)
    perfil = Column(String(50), nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow)
    ativo = Column(Boolean, default=True)
