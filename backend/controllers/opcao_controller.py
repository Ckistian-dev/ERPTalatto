from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from config.database import get_session
from models.opcao_model import Opcao
from pydantic import BaseModel

router = APIRouter(prefix="/opcoes", tags=["Opções"])

class OpcaoSchema(BaseModel):
    tipo: str
    valor: str

@router.get("/{tipo}")
def listar_opcoes(tipo: str, db: Session = Depends(get_session)):
    return db.query(Opcao).filter(Opcao.tipo == tipo).all()

@router.post("/")
def adicionar_opcao(data: OpcaoSchema, db: Session = Depends(get_session)):
    ja_existe = db.query(Opcao).filter(Opcao.tipo == data.tipo, Opcao.valor == data.valor).first()
    if ja_existe:
        raise HTTPException(status_code=400, detail="Opção já existe.")

    nova = Opcao(tipo=data.tipo, valor=data.valor)
    db.add(nova)
    db.commit()
    db.refresh(nova)  # 🔄 garante que id e campos estão atualizados

    return {"id": nova.id, "valor": nova.valor}  # ✅ retorno direto do que o frontend espera


@router.put("/{id}")
def editar_opcao(id: int, novo_valor: str, db: Session = Depends(get_session)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    opcao.valor = novo_valor
    db.commit()
    return opcao

@router.delete("/{id}")
def remover_opcao(id: int, db: Session = Depends(get_session)):
    opcao = db.query(Opcao).filter(Opcao.id == id).first()
    if not opcao:
        raise HTTPException(status_code=404, detail="Opção não encontrada")
    db.delete(opcao)
    db.commit()
    return {"ok": True}
