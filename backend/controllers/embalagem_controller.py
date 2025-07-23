# controllers/embalagem_controller.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Union, Dict, Any
from sqlalchemy import Column, Integer, String, JSON, DateTime, func
import json
import os
import mysql.connector.pooling

# Importa o ORM e a sessão para o CRUD de Embalagem
from config.database import Base, get_db

# --- Pool de conexão MySQL (o mesmo do seu produtos_controller) ---
# É ideal que este pool seja definido em um local central (ex: config/database.py) e importado aqui.
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="geral_pool",
    pool_size=10,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

# ===================================================================
#                      MODELO DO BANCO (SQLAlchemy)
# ===================================================================

class Embalagem(Base):
    __tablename__ = "embalagem"
    
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, unique=True)
    descricao = Column(String(500), nullable=True)
    regras = Column(JSON, nullable=False)
    # --- NOVAS COLUNAS ---
    criado_em = Column(DateTime, server_default=func.now())
    modificado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())


# ===================================================================
#                      SCHEMAS DE DADOS (Pydantic)
# ===================================================================

class FormulaComponentSchema(BaseModel):
    tipo: str
    valor: Union[str, float]

class RegraSchema(BaseModel):
    id_regra: str
    condicao_gatilho: str
    valor_gatilho: Optional[float] = None
    prioridade: int = 0
    formula_altura: List[FormulaComponentSchema]
    formula_largura: List[FormulaComponentSchema]
    formula_comprimento: List[FormulaComponentSchema]
    formula_peso: List[FormulaComponentSchema]

class LogicaEmbalagemSchema(BaseModel):
    id: Optional[int] = None
    nome: str
    descricao: Optional[str] = None
    regras: List[RegraSchema]
    class Config: from_attributes = True

class CalculoVolumeRequest(BaseModel):
    produto_id: int
    quantidade: int

class VolumeCalculadoSchema(BaseModel):
    tipo: str
    itens: int
    peso_kg: float
    altura_cm: float
    largura_cm: float
    comprimento_cm: float

class CalculoVolumeResponse(BaseModel):
    total_volumes: int
    peso_total_kg: float
    volumes: List[VolumeCalculadoSchema]
    
class PaginatedResponse(BaseModel):
    total: int
    resultados: List[LogicaEmbalagemSchema]


# ===================================================================
#                        FUNÇÃO AUXILIAR
# ===================================================================
def executar_formula(formula: List[Dict[str, Any]], contexto: Dict[str, float]) -> float:
    if not formula: return 0.0
    stack = []
    for comp in formula:
        if comp['tipo'] == 'variavel':
            if comp['valor'] not in contexto: raise ValueError(f"Variável desconhecida: {comp['valor']}")
            stack.append(float(contexto[comp['valor']]))
        else: stack.append(comp['valor'])
    try:
        resultado = stack[0]
        i = 1
        while i < len(stack):
            operador, proximo_numero = stack[i], stack[i+1]
            if operador == '+': resultado += proximo_numero
            elif operador == '-': resultado -= proximo_numero
            elif operador == '*': resultado *= proximo_numero
            elif operador == '/': resultado /= proximo_numero if proximo_numero != 0 else 1
            i += 2
        return round(resultado, 4)
    except (IndexError, TypeError): raise ValueError("Fórmula mal formatada.")


# ===================================================================
#                    CONTROLLER (Endpoints da API)
# ===================================================================
router = APIRouter(prefix="/embalagem", tags=["Embalagens e Volumes"])

# --- Endpoints CRUD para Lógicas de Embalagem (Usando SQLAlchemy ORM) ---

@router.post("", response_model=LogicaEmbalagemSchema, status_code=status.HTTP_201_CREATED)
def criar_logica(logica: LogicaEmbalagemSchema, db: Session = Depends(get_db)):
    db_logica_existente = db.query(Embalagem).filter(Embalagem.nome == logica.nome).first()
    if db_logica_existente:
        raise HTTPException(status_code=400, detail=f"Já existe uma lógica com o nome '{logica.nome}'.")
    
    # Usando o modelo Embalagem definido neste arquivo
    db_logica = Embalagem(**logica.dict())
    db.add(db_logica)
    db.commit()
    db.refresh(db_logica)
    return db_logica

@router.get("", response_model=List[LogicaEmbalagemSchema])
def listar_logicas(db: Session = Depends(get_db)):
    return db.query(Embalagem).all()
    
@router.put("/{logica_id}", response_model=LogicaEmbalagemSchema)
def atualizar_logica(logica_id: int, logica_update: LogicaEmbalagemSchema, db: Session = Depends(get_db)):
    db_logica = db.query(Embalagem).filter(Embalagem.id == logica_id).first()
    if not db_logica:
        raise HTTPException(status_code=404, detail="Lógica de embalagem não encontrada.")
    
    update_data = logica_update.dict(exclude_unset=True)
    if 'nome' in update_data and update_data['nome'] != db_logica.nome:
        db_logica_existente = db.query(Embalagem).filter(Embalagem.nome == update_data['nome']).first()
        if db_logica_existente:
            raise HTTPException(status_code=400, detail=f"Já existe uma lógica com o nome '{update_data['nome']}'.")

    for key, value in update_data.items():
        setattr(db_logica, key, value)

    db.commit()
    db.refresh(db_logica)
    return db_logica

@router.delete("/{logica_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_logica(logica_id: int, db: Session = Depends(get_db)):
    db_logica = db.query(Embalagem).filter(Embalagem.id == logica_id).first()
    if not db_logica:
        raise HTTPException(status_code=404, detail="Lógica de embalagem não encontrada.")
    db.delete(db_logica)
    db.commit()


# --- Endpoint para Cálculo de Volume (Usando SQL Puro para ler produtos) ---

@router.post("/calcular-volumes", response_model=CalculoVolumeResponse, summary="Calcula os volumes de um produto")
def calcular_volumes_produto(req: CalculoVolumeRequest):
    if req.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade deve ser maior que zero.")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                p.unidade_caixa, p.peso_embalagem, p.altura_embalagem, 
                p.largura_embalagem, p.comprimento_embalagem,
                e.regras
            FROM produtos p
            LEFT JOIN embalagem e ON p.id_logica_embalagem = e.id
            WHERE p.id = %s
        """
        cursor.execute(query, (req.produto_id,))
        produto_data = cursor.fetchone()

        if not produto_data:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")

        if not all([produto_data['unidade_caixa'], produto_data['peso_embalagem'], produto_data['altura_embalagem'], produto_data['largura_embalagem'], produto_data['comprimento_embalagem']]) or produto_data['unidade_caixa'] <= 0:
            raise HTTPException(status_code=400, detail="Produto com dados de embalagem padrão incompletos ou inválidos.")
        
        volumes_finais = []
        unidade_caixa = int(produto_data['unidade_caixa'])
        volumes_cheios = req.quantidade // unidade_caixa
        quantidade_restante = req.quantidade % unidade_caixa
        peso_caixa_kg = float(produto_data['peso_embalagem']) / 1000.0

        for _ in range(volumes_cheios):
            volumes_finais.append(VolumeCalculadoSchema(
                tipo="Volume Completo", itens=unidade_caixa, peso_kg=peso_caixa_kg,
                altura_cm=float(produto_data['altura_embalagem']),
                largura_cm=float(produto_data['largura_embalagem']),
                comprimento_cm=float(produto_data['comprimento_embalagem'])
            ))
            
        if quantidade_restante > 0:
            regras_json = produto_data.get('regras')
            regras = json.loads(regras_json) if isinstance(regras_json, str) else regras_json
            
            regra_aplicada = None
            if regras:
                regras_sorted = sorted(regras, key=lambda r: r.get('prioridade', 0))
                for regra in regras_sorted:
                    if regra.get('condicao_gatilho') == 'SEMPRE':
                        regra_aplicada = regra
                        break
            
            peso_proporcional = (peso_caixa_kg / unidade_caixa) * quantidade_restante
            contexto = {
                "QTD_RESTANTE": quantidade_restante, "QTD_POR_EMBALAGEM": unidade_caixa,
                "PESO_PROPORCIONAL": peso_proporcional, "ALTURA_BASE": float(produto_data['altura_embalagem']),
                "LARGURA_BASE": float(produto_data['largura_embalagem']), "COMPRIMENTO_BASE": float(produto_data['comprimento_embalagem'])
            }

            altura_p, largura_p, comp_p, peso_p = (contexto["ALTURA_BASE"] / unidade_caixa) * quantidade_restante, contexto["LARGURA_BASE"], contexto["COMPRIMENTO_BASE"], peso_proporcional

            if regra_aplicada:
                try:
                    if regra_aplicada.get('formula_altura'): altura_p = executar_formula(regra_aplicada['formula_altura'], contexto)
                    if regra_aplicada.get('formula_largura'): largura_p = executar_formula(regra_aplicada['formula_largura'], contexto)
                    if regra_aplicada.get('formula_comprimento'): comp_p = executar_formula(regra_aplicada['formula_comprimento'], contexto)
                    if regra_aplicada.get('formula_peso'): peso_p = executar_formula(regra_aplicada['formula_peso'], contexto)
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Erro ao processar fórmula da lógica: {e}")

            volumes_finais.append(VolumeCalculadoSchema(
                tipo="Volume Parcial", itens=quantidade_restante, peso_kg=round(peso_p, 3),
                altura_cm=round(altura_p, 2), largura_cm=round(largura_p, 2), comprimento_cm=round(comp_p, 2)
            ))
            
        return CalculoVolumeResponse(
            total_volumes=len(volumes_finais),
            peso_total_kg=round(sum(v.peso_kg for v in volumes_finais), 3),
            volumes=volumes_finais
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro interno no servidor: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
        
@router.get("/paginado", response_model=PaginatedResponse)
def listar_logicas_paginado(
    page: int = 1,
    limit: int = 15,
    filtros: Optional[str] = None, # Para filtros avançados
    filtro_rapido_coluna: Optional[str] = None,
    filtro_rapido_texto: Optional[str] = None,
    data_inicio: Optional[str] = None, # Para filtro por data
    data_fim: Optional[str] = None, # Para filtro por data
    ordenar_por: Optional[str] = "id",
    ordenar_direcao: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(Embalagem)
    
    colunas_validas = {
        "id": Embalagem.id, "nome": Embalagem.nome, 
        "descricao": Embalagem.descricao, "criado_em": Embalagem.criado_em
    }

    # Lógica de filtros (avançado e rápido)
    where_clauses = []
    if filtros:
        for par in filtros.split(";"):
            if ":" in par:
                coluna, texto = par.split(":", 1)
                if coluna in colunas_validas:
                    where_clauses.append(colunas_validas[coluna].ilike(f"%{texto}%"))

    if filtro_rapido_coluna and filtro_rapido_texto and filtro_rapido_coluna in colunas_validas:
        where_clauses.append(colunas_validas[filtro_rapido_coluna].ilike(f"%{filtro_rapido_texto}%"))

    if data_inicio:
        where_clauses.append(Embalagem.criado_em >= f"{data_inicio} 00:00:00")
    if data_fim:
        where_clauses.append(Embalagem.criado_em <= f"{data_fim} 23:59:59")
        
    if where_clauses:
        query = query.filter(*where_clauses)

    total = query.count()

    coluna_ordenacao = colunas_validas.get(ordenar_por, Embalagem.id)
    if ordenar_direcao.lower() == "desc":
        query = query.order_by(coluna_ordenacao.desc())
    else:
        query = query.order_by(coluna_ordenacao.asc())
        
    offset = (page - 1) * limit
    resultados = query.offset(offset).limit(limit).all()

    return {"total": total, "resultados": resultados}