from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from config.database import get_db
from models.estoque_model import EstoquePosicao, Produto
from schemas.estoque_schema import (
    EntradaCreate, SaidaCreate, EstoquePosicaoResponse, 
    EstoquePosicaoConsolidadaResponse, ProdutoSearchResponse
)

router = APIRouter(prefix="/api/estoque", tags=["Estoque"])

# ... (As funções de entrada, saida e put não precisam de alteração) ...
@router.post("/entrada", status_code=201, response_model=EstoquePosicaoResponse)
def registrar_entrada(entrada: EntradaCreate, db: Session = Depends(get_db)):
    produto = db.query(Produto).filter(Produto.id == entrada.id_produto).first()
    if not produto: raise HTTPException(status_code=404, detail="Produto não encontrado.")
    pk_posicao = {"id_produto": entrada.id_produto, "lote": entrada.lote, "deposito": entrada.deposito, "rua": entrada.rua, "numero": entrada.numero, "nivel": entrada.nivel, "cor": entrada.cor, "situacao_estoque": entrada.situacao_estoque}
    posicao = db.query(EstoquePosicao).filter_by(**pk_posicao).first()
    if posicao:
        posicao.quantidade += entrada.quantidade
    else:
        posicao = EstoquePosicao(**pk_posicao, quantidade=entrada.quantidade)
        db.add(posicao)
    db.commit()
    db.refresh(posicao)
    return posicao

@router.post("/saida", status_code=201, response_model=EstoquePosicaoResponse)
def registrar_saida(saida: SaidaCreate, db: Session = Depends(get_db)):
    pk_posicao = {"id_produto": saida.id_produto, "lote": saida.lote, "deposito": saida.deposito, "rua": saida.rua, "numero": saida.numero, "nivel": saida.nivel, "cor": saida.cor, "situacao_estoque": saida.situacao_estoque}
    posicao = db.query(EstoquePosicao).filter_by(**pk_posicao).with_for_update().first()
    if not posicao: raise HTTPException(status_code=404, detail="Posição de estoque não encontrada.")
    if posicao.quantidade < saida.quantidade: raise HTTPException(status_code=400, detail=f"Quantidade insuficiente. Disponível: {posicao.quantidade}")
    posicao.quantidade -= saida.quantidade
    db.commit()
    db.refresh(posicao)
    return posicao

@router.put("/posicao", status_code=200, response_model=EstoquePosicaoResponse)
def atualizar_posicao_estoque(posicao_data: EntradaCreate, db: Session = Depends(get_db)):
    pk_posicao = {"id_produto": posicao_data.id_produto, "lote": posicao_data.lote, "deposito": posicao_data.deposito, "rua": posicao_data.rua, "numero": posicao_data.numero, "nivel": posicao_data.nivel, "cor": posicao_data.cor}
    db_posicao = db.query(EstoquePosicao).filter_by(**pk_posicao).first()
    if not db_posicao: raise HTTPException(status_code=404, detail="Posição de estoque para atualização não encontrada.")
    db_posicao.quantidade = posicao_data.quantidade
    db_posicao.situacao_estoque = posicao_data.situacao_estoque
    db.commit()
    db.refresh(db_posicao)
    return db_posicao


@router.get("/posicao_paginada")
def get_posicao_paginada(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 15,
    filtros: Optional[str] = None,
    filtro_rapido_coluna: Optional[str] = None,
    filtro_rapido_texto: Optional[str] = None,
    ordenar_por: Optional[str] = "descricao",
    ordenar_direcao: Optional[str] = "asc"
):
    query = db.query(
        Produto.descricao, EstoquePosicao.id_produto, EstoquePosicao.lote, EstoquePosicao.deposito,
        EstoquePosicao.rua, EstoquePosicao.numero, EstoquePosicao.nivel, EstoquePosicao.cor,
        EstoquePosicao.situacao_estoque, func.sum(EstoquePosicao.quantidade).label("quantidade_total")
    ).join(Produto, EstoquePosicao.id_produto == Produto.id).group_by(
        Produto.descricao, EstoquePosicao.id_produto, EstoquePosicao.lote, EstoquePosicao.deposito,
        EstoquePosicao.rua, EstoquePosicao.numero, EstoquePosicao.nivel, EstoquePosicao.cor, EstoquePosicao.situacao_estoque
    )

    # ... (filtros e ordenação permanecem iguais)
    if filtro_rapido_coluna and filtro_rapido_texto:
        if hasattr(Produto, filtro_rapido_coluna): query = query.filter(getattr(Produto, filtro_rapido_coluna).ilike(f"%{filtro_rapido_texto}%"))
        elif hasattr(EstoquePosicao, filtro_rapido_coluna): query = query.filter(getattr(EstoquePosicao, filtro_rapido_coluna).ilike(f"%{filtro_rapido_texto}%"))
    if filtros:
        for par_filtro in filtros.split(";"):
            if ":" in par_filtro:
                coluna, texto = par_filtro.split(":", 1)
                if hasattr(Produto, coluna): query = query.filter(getattr(Produto, coluna).ilike(f"%{texto}%"))
                elif hasattr(EstoquePosicao, coluna): query = query.filter(getattr(EstoquePosicao, coluna).ilike(f"%{texto}%"))
    query = query.having(func.sum(EstoquePosicao.quantidade) > 0)
    
    # É necessário clonar a query para contagem antes de aplicar ordenação e paginação
    count_query = query.statement.with_only_columns(func.count()).order_by(None)
    total_registros = db.execute(count_query).scalar()
    
    coluna_ordenacao = getattr(Produto, ordenar_por, None) or getattr(EstoquePosicao, ordenar_por, EstoquePosicao.id_produto)
    if ordenar_direcao.lower() == "desc": query = query.order_by(coluna_ordenacao.desc())
    else: query = query.order_by(coluna_ordenacao.asc())
    offset = (page - 1) * limit
    resultados_query = query.offset(offset).limit(limit).all()

    # --- INÍCIO DA CORREÇÃO ---
    # Transforma a lista de tuplas/Row objects em uma lista de dicionários
    
    resultados_formatados = [
        {
            "descricao": row.descricao,
            "id_produto": row.id_produto,
            "lote": row.lote,
            "deposito": row.deposito,
            "rua": row.rua,
            "numero": row.numero,
            "nivel": row.nivel,
            "cor": row.cor,
            "situacao_estoque": row.situacao_estoque,
            "quantidade_total": row.quantidade_total
        }
        for row in resultados_query
    ]

    return {"total": total_registros, "resultados": resultados_formatados}
    # --- FIM DA CORREÇÃO ---


@router.get("/posicao/{produto_id}", response_model=List[EstoquePosicaoResponse])
def get_posicoes_por_produto(produto_id: int, db: Session = Depends(get_db)):
    # ... (código sem alterações)
    posicoes = db.query(EstoquePosicao).filter(EstoquePosicao.id_produto == produto_id, EstoquePosicao.quantidade > 0).order_by(EstoquePosicao.deposito, EstoquePosicao.rua, EstoquePosicao.lote).all()
    if not posicoes: raise HTTPException(status_code=404, detail="Nenhuma posição de estoque encontrada para este produto.")
    return posicoes

@router.get("/produtos/search", response_model=List[ProdutoSearchResponse])
def search_produtos(q: Optional[str] = None, db: Session = Depends(get_db)):
    # ... (código sem alterações)
    query = db.query(Produto)
    if q: query = query.filter(Produto.descricao.ilike(f"%{q}%"))
    return query.limit(20).all()
