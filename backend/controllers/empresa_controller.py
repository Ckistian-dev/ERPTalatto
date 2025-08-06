# /controllers/empresa_controller.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Boolean
from sqlalchemy.orm import Session
from config.database import Base, get_db
from typing import Optional

# ==================================
#              MODEL
# ==================================
class InfoEmpresa(Base):
    """
    Modelo de dados para armazenar as informações e credenciais da empresa.
    """
    __tablename__ = "info_empresa"
    id = Column(Integer, primary_key=True, index=True)
    
    # Dados da Empresa
    cnpj = Column(String(14), nullable=True)
    razao_social = Column(String(255), nullable=True)
    nome_fantasia = Column(String(255), nullable=True)
    ie = Column(String(20), nullable=True)
    logradouro = Column(String(255), nullable=True)
    numero = Column(String(20), nullable=True)
    complemento = Column(String(255), nullable=True)
    bairro = Column(String(100), nullable=True)
    cidade = Column(String(100), nullable=True)
    uf = Column(String(2), nullable=True)
    cep = Column(String(8), nullable=True)
    
    # Configurações de Emissão Webmania
    emissao_em_producao = Column(Boolean, default=False)
    webmania_consumer_key = Column(String(255), nullable=True)
    webmania_consumer_secret = Column(String(255), nullable=True)
    webmania_access_token = Column(String(255), nullable=True)
    webmania_access_token_secret = Column(String(255), nullable=True)
    
    # Timestamps
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

# ==================================
#              SCHEMA
# ==================================
class InfoEmpresaSchema(BaseModel):
    """
    Schema Pydantic para validação e serialização dos dados da empresa.
    """
    cnpj: Optional[str] = Field(None, max_length=14)
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    ie: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = Field(None, max_length=8)
    
    # Campos Webmania
    emissao_em_producao: Optional[bool] = False
    webmania_consumer_key: Optional[str] = None
    webmania_consumer_secret: Optional[str] = None
    webmania_access_token: Optional[str] = None
    webmania_access_token_secret: Optional[str] = None

    class Config:
        from_attributes = True

# ==================================
#            CONTROLLER
# ==================================
router = APIRouter(prefix="/api/empresa", tags=["Configurações da Empresa"])

@router.get("", response_model=InfoEmpresaSchema)
def get_info_empresa(db: Session = Depends(get_db)):
    """Busca a configuração atual da empresa no banco de dados."""
    config = db.query(InfoEmpresa).first()
    if not config:
        # Para evitar erros na primeira vez, podemos criar um registro padrão
        config = InfoEmpresa(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("", response_model=InfoEmpresaSchema)
def update_info_empresa(config_update: InfoEmpresaSchema, db: Session = Depends(get_db)):
    """Atualiza as informações e credenciais da empresa."""
    db_config = db.query(InfoEmpresa).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Informações da empresa não encontradas para atualizar.")

    # CORREÇÃO: .dict() foi substituído por .model_dump(), que é o método atual do Pydantic.
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value if value is not None else None)
    
    db.commit()
    db.refresh(db_config)
    return db_config
