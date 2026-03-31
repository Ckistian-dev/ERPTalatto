from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.core.db.database import get_db
from app.api.dependencies import get_current_active_user
from app.core.db import models
from app.core.service.intelipost_service import IntelipostService

router = APIRouter()

class IntelipostFreteSelection(BaseModel):
    delivery_method_id: int
    final_shipping_cost: float
    delivery_method_name: str
    quote_id: Optional[int] = None
    prazo_entrega: Optional[int] = None

@router.post("/intelipost/cotacao/{pedido_id}")
async def cotar_frete_pedido(
    pedido_id: int,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    service = IntelipostService(db, current_user.id_empresa)
    return await service.cotar_por_pedido(pedido_id)

@router.post("/intelipost/pedido_envio/{pedido_id}")
async def criar_pedido_envio_intelipost(
    pedido_id: int,
    dados: IntelipostFreteSelection,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    service = IntelipostService(db, current_user.id_empresa)
    return await service.criar_pedido_envio(pedido_id, dados.model_dump())

@router.get("/intelipost/transportadora/buscar")
def buscar_transportadora_por_nome(
    nome: str,
    db: Session = Depends(get_db),
    current_user: models.Usuario = Depends(get_current_active_user)
):
    """
    Busca uma transportadora no banco local pelo nome retornado da Intelipost (fuzzy search simples).
    """
    # Tenta achar contains (ILIKE)
    # Nota: Em produção idealmente usaria unaccent
    transportadora = db.query(models.Cadastro).filter(
        models.Cadastro.id_empresa == current_user.id_empresa,
        models.Cadastro.tipo_cadastro == 'transportadora',
        models.Cadastro.nome_razao.ilike(f"%{nome}%")
    ).first()
    
    if not transportadora:
         # Tenta pela fantasia
         transportadora = db.query(models.Cadastro).filter(
            models.Cadastro.id_empresa == current_user.id_empresa,
            models.Cadastro.tipo_cadastro == 'transportadora',
            models.Cadastro.fantasia.ilike(f"%{nome}%")
        ).first()

    if not transportadora:
        raise HTTPException(status_code=404, detail="Transportadora não encontrada no cadastro local.")

    return {
        "id": transportadora.id,
        "nome_razao": transportadora.nome_razao
    }