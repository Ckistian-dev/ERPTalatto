# /controllers/empresa_controller.py

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, TIMESTAMP, func, Boolean
from sqlalchemy.orm import Session
from config.database import Base, get_db
from datetime import datetime
from typing import Optional

# ==================================
#             MODEL
# ==================================
class InfoEmpresa(Base):
    __tablename__ = "info_empresa"
    id = Column(Integer, primary_key=True, index=True)
    cnpj = Column(String(14), nullable=True)
    razao_social = Column(String(255), nullable=True)
    nome_fantasia = Column(String(255), nullable=True)
    ie = Column(String(20), nullable=True)
    im = Column(String(20), nullable=True)
    logradouro = Column(String(255), nullable=True)
    numero = Column(String(20), nullable=True)
    complemento = Column(String(255), nullable=True)
    bairro = Column(String(100), nullable=True)
    codigo_municipio_ibge = Column(String(10), nullable=True)
    cidade = Column(String(100), nullable=True)
    uf = Column(String(2), nullable=True)
    cep = Column(String(8), nullable=True)
    cnae = Column(String(10), nullable=True)
    crt = Column(Integer, nullable=True)
    emissao_em_producao = Column(Boolean, default=False)
    pynfe_uf = Column(String(2), nullable=True)
    resp_tec_cnpj = Column(String(14), nullable=True)
    resp_tec_contato = Column(String(255), nullable=True)
    resp_tec_email = Column(String(255), nullable=True)
    resp_tec_fone = Column(String(20), nullable=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    created_at = Column(TIMESTAMP, server_default=func.now())

# ==================================
#             SCHEMA
# ==================================
class InfoEmpresaSchema(BaseModel):
    cnpj: Optional[str] = Field(None, max_length=14)
    razao_social: Optional[str] = None
    nome_fantasia: Optional[str] = None
    ie: Optional[str] = None
    im: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    codigo_municipio_ibge: Optional[str] = None
    cidade: Optional[str] = None
    uf: Optional[str] = None
    cep: Optional[str] = Field(None, max_length=8)
    cnae: Optional[str] = None
    crt: Optional[int] = None
    emissao_em_producao: Optional[bool] = None
    pynfe_uf: Optional[str] = Field(None, max_length=2)
    resp_tec_cnpj: Optional[str] = Field(None, max_length=14)
    resp_tec_contato: Optional[str] = None
    resp_tec_email: Optional[str] = None
    resp_tec_fone: Optional[str] = None

    class Config:
        from_attributes = True

# ==================================
#           CONTROLLER
# ==================================
router = APIRouter(prefix="/empresa", tags=["Configurações da Empresa"])

@router.get("", response_model=InfoEmpresaSchema)
def get_info_empresa(db: Session = Depends(get_db)):
    config = db.query(InfoEmpresa).first()
    if not config:
        raise HTTPException(status_code=404, detail="Nenhuma configuração de empresa encontrada. Execute o script SQL inicial.")
    return config

@router.put("", response_model=InfoEmpresaSchema)
def update_info_empresa(config_update: InfoEmpresaSchema, db: Session = Depends(get_db)):
    db_config = db.query(InfoEmpresa).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Informações da empresa não encontradas para atualizar.")

    update_data = config_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value if value is not None else None)
    
    db.commit()
    db.refresh(db_config)
    return db_config