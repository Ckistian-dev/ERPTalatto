from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Optional

# Importa a Base (para o modelo) e o get_db (para os endpoints)
from config.database import Base, get_db

# ==================================
#              MODEL
# ==================================
# O modelo SQLAlchemy que antes estava em um arquivo separado, agora está aqui.
class MeliConfiguracao(Base):
    __tablename__ = "meli_configuracoes"

    id = Column(Integer, primary_key=True, default=1)
    aceite_automatico_pedidos = Column(Boolean, default=False)
    cliente_padrao_id = Column(Integer)
    vendedor_padrao_id = Column(Integer)
    situacao_pedido_inicial = Column(String(100), default='Aguardando Faturamento')
    atualizado_em = Column(DateTime, default=func.now(), onupdate=func.now())

# ==================================
#              SCHEMA
# ==================================
# Schema Pydantic para validação dos dados que chegam e saem da API
class MeliConfiguracaoSchema(BaseModel):
    aceite_automatico_pedidos: bool
    cliente_padrao_id: Optional[int] = None
    vendedor_padrao_id: Optional[int] = None
    situacao_pedido_inicial: Optional[str] = Field(None, max_length=100)

    class Config:
        from_attributes = True

# ==================================
#           CONTROLLER
# ==================================
router = APIRouter(
    prefix="/configuracoes",
    tags=["Configurações"]
)

@router.get("/mercadolivre", response_model=MeliConfiguracaoSchema)
def get_meli_configuracoes(db: Session = Depends(get_db)):
    """
    Busca a configuração da integração com o Mercado Livre.
    Se não existir, cria uma com valores padrão.
    """
    config = db.query(MeliConfiguracao).filter(MeliConfiguracao.id == 1).first()
    
    # Garante que sempre exista uma linha de configuração no banco
    if not config:
        config = MeliConfiguracao(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
        
    return config

@router.put("/mercadolivre", response_model=MeliConfiguracaoSchema)
def update_meli_configuracoes(
    config_update: MeliConfiguracaoSchema, 
    db: Session = Depends(get_db)
):
    """
    Atualiza a configuração da integração com o Mercado Livre.
    """
    config = db.query(MeliConfiguracao).filter(MeliConfiguracao.id == 1).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuração não encontrada.")

    # Pega os dados do request e os aplica no objeto do banco
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)
    
    db.commit()
    db.refresh(config)
    return config
