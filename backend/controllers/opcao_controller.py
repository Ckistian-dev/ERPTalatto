from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List

from config.database import get_db
from models.opcao_model import Opcao 
# A importação do EstoquePosicao não é mais necessária aqui
# from models.estoque_model import EstoquePosicao 

router = APIRouter(prefix="/opcoes", tags=["Opções"])

# --- Schemas Pydantic ---
class OpcaoCreateSchema(BaseModel):
    tipo: str
    valor: str

class OpcaoUpdateSchema(BaseModel):
    valor: str

class OpcaoResponseSchema(BaseModel):
    id: int
    tipo: str
    valor: str

    class Config:
        from_attributes = True

@router.get("/{tipo}", response_model=List[OpcaoResponseSchema])
def listar_opcoes(tipo: str, db: Session = Depends(get_db)):
    # [CORREÇÃO] A lógica complexa foi removida.
    # Agora, todos os tipos de opções são buscados da mesma forma na tabela 'opcoes'.
    return db.query(Opcao).filter(Opcao.tipo == tipo).order_by(Opcao.valor).all()


@router.post("", response_model=OpcaoResponseSchema) 
def adicionar_opcao(data: OpcaoCreateSchema, db: Session = Depends(get_db)):
    ja_existe = db.query(Opcao).filter(Opcao.tipo == data.tipo, Opcao.valor == data.valor).first()
    if ja_existe:
        raise HTTPException(status_code=400, detail="Opção já existe.")
    nova = Opcao(tipo=data.tipo, valor=data.valor)
    db.add(nova)
    db.commit()
    db.refresh(nova)
    return nova


@router.put("/{id}", response_model=OpcaoResponseSchema)
def editar_opcao(id: int, data: OpcaoUpdateSchema, db: Session = Depends(get_db)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    opcao.valor = data.valor
    db.commit()
    db.refresh(opcao)
    return opcao


@router.delete("/{id}")
def remover_opcao(id: int, db: Session = Depends(get_db)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    db.delete(opcao)
    db.commit()
    return {"ok": True}
