from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import Column, Integer, String, Boolean, DECIMAL
from sqlalchemy.orm import Session
from config.database import Base, get_db
from typing import Optional, List

# ==================================
#             MODEL
# ==================================
class RegraTributaria(Base):
    __tablename__ = "regras_tributarias"
    id = Column(Integer, primary_key=True, index=True)
    descricao = Column(String(255), nullable=False)
    natureza_operacao = Column(String(100), nullable=False)
    cfop = Column(String(4), nullable=False)
    ncm = Column(String(8), nullable=True)
    tipo_cliente = Column(String(1), nullable=True)
    uf_origem = Column(String(2), nullable=False)
    uf_destino = Column(String(2), nullable=False)
    icms_csosn = Column(String(3), nullable=True)
    icms_cst = Column(String(2), nullable=True)
    icms_aliquota = Column(DECIMAL(5, 2), default=0.00)
    icms_base_calculo = Column(DECIMAL(5, 2), default=100.00)
    pis_cst = Column(String(2), nullable=True)
    pis_aliquota = Column(DECIMAL(5, 2), default=0.00)
    cofins_cst = Column(String(2), nullable=True)
    cofins_aliquota = Column(DECIMAL(5, 2), default=0.00)
    ipi_cst = Column(String(2), nullable=True)
    ipi_aliquota = Column(DECIMAL(5, 2), default=0.00)
    
    # --- NOVOS CAMPOS (OPCIONAIS) PARA ICMS-ST ---
    icms_modalidade_st = Column(String(2), nullable=True)
    icms_mva_st = Column(DECIMAL(5, 2), nullable=True)
    icms_reducao_bc_st = Column(DECIMAL(5, 2), nullable=True)
    icms_aliquota_st = Column(DECIMAL(5, 2), nullable=True)
    icms_fcp_st = Column(DECIMAL(5, 2), nullable=True)
    # -------------------------------------------
    
    ativo = Column(Boolean, default=True)

# ==================================
#             SCHEMA
# ==================================
class RegraTributariaSchema(BaseModel):
    id: Optional[int] = None
    descricao: str
    natureza_operacao: str
    cfop: str = Field(..., max_length=4)
    ncm: Optional[str] = Field(None, max_length=8)
    tipo_cliente: Optional[str] = Field(None, max_length=1)
    uf_origem: str = Field(..., max_length=2)
    uf_destino: str = Field(..., max_length=2)
    icms_csosn: Optional[str] = None
    icms_cst: Optional[str] = None
    icms_aliquota: float = 0.0
    icms_base_calculo: float = 100.0
    pis_cst: Optional[str] = None
    pis_aliquota: float = 0.0
    cofins_cst: Optional[str] = None
    cofins_aliquota: float = 0.0
    ipi_cst: Optional[str] = None
    ipi_aliquota: float = 0.0

    # --- NOVOS CAMPOS (OPCIONAIS) PARA ICMS-ST ---
    icms_modalidade_st: Optional[str] = None
    icms_mva_st: Optional[float] = None
    icms_reducao_bc_st: Optional[float] = None
    icms_aliquota_st: Optional[float] = None
    icms_fcp_st: Optional[float] = None
    # -------------------------------------------

    ativo: bool = True
    class Config:
        from_attributes = True

# ==================================
#           CONTROLLER
# ==================================
router = APIRouter(prefix="/regras-tributarias", tags=["Regras de Tributação"])

@router.post("", response_model=RegraTributariaSchema, status_code=status.HTTP_201_CREATED)
def criar_regra(regra: RegraTributariaSchema, db: Session = Depends(get_db)):
    db_regra = RegraTributaria(**regra.dict(exclude={'id'}))
    db.add(db_regra)
    db.commit()
    db.refresh(db_regra)
    return db_regra

@router.get("", response_model=List[RegraTributariaSchema])
def listar_regras(db: Session = Depends(get_db)):
    return db.query(RegraTributaria).all()

@router.put("/{regra_id}", response_model=RegraTributariaSchema)
def atualizar_regra(regra_id: int, regra_update: RegraTributariaSchema, db: Session = Depends(get_db)):
    db_regra = db.query(RegraTributaria).filter(RegraTributaria.id == regra_id).first()
    if not db_regra:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    
    update_data = regra_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_regra, key, value)
        
    db.commit()
    db.refresh(db_regra)
    return db_regra

@router.delete("/{regra_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_regra(regra_id: int, db: Session = Depends(get_db)):
    db_regra = db.query(RegraTributaria).filter(RegraTributaria.id == regra_id).first()
    if not db_regra:
        raise HTTPException(status_code=404, detail="Regra não encontrada.")
    db.delete(db_regra)
    db.commit()