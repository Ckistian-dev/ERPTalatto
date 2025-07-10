# controllers/opcao_controller.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

# ATUALIZADO: Importa a função correta 'get_db' do seu módulo de database.
from config.database import get_db
# Supondo que você tenha um models/opcao_model.py
from models.opcao_model import Opcao 


router = APIRouter(prefix="/opcoes", tags=["Opções"])

class OpcaoSchema(BaseModel):
    tipo: str
    valor: str

@router.get("/{tipo}")
# ATUALIZADO: Usa Depends(get_db) para injetar a sessão do SQLAlchemy.
def listar_opcoes(tipo: str, db: Session = Depends(get_db)):
    return db.query(Opcao).filter(Opcao.tipo == tipo).all()

@router.post("/")
# ATUALIZADO: Usa Depends(get_db).
def adicionar_opcao(data: OpcaoSchema, db: Session = Depends(get_db)):
    ja_existe = db.query(Opcao).filter(Opcao.tipo == data.tipo, Opcao.valor == data.valor).first()
    if ja_existe:
        raise HTTPException(status_code=400, detail="Opção já existe.")

    nova = Opcao(tipo=data.tipo, valor=data.valor)
    db.add(nova)
    db.commit()
    db.refresh(nova)

    return {"id": nova.id, "valor": nova.valor}

@router.put("/{id}")
# ATUALIZADO: Usa Depends(get_db).
def editar_opcao(id: int, novo_valor: str, db: Session = Depends(get_db)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    
    opcao.valor = novo_valor
    db.commit()
    return opcao

@router.delete("/{id}")
# ATUALIZADO: Usa Depends(get_db).
def remover_opcao(id: int, db: Session = Depends(get_db)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
        
    db.delete(opcao)
    db.commit()
    return {"ok": True}
