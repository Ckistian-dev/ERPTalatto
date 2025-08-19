# controllers/embalagem_controller.py

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, JSON, DateTime, func, and_
from typing import Optional, List, Union, Dict, Any
import json
import os
import math
import mysql.connector.pooling

from config.database import Base, get_db

# --- Pool de conexão MySQL ---
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
#                       MODELO DO BANCO (Sem alterações)
# ===================================================================

class Embalagem(Base):
    __tablename__ = "embalagem"
    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False, unique=True)
    descricao = Column(String(500), nullable=True)
    regras = Column(JSON, nullable=False)
    criado_em = Column(DateTime, server_default=func.now())
    modificado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())

# ===================================================================
#                       SCHEMAS DE DADOS (Sem alterações)
# ===================================================================

class FormulaComponentSchema(BaseModel):
    tipo: str
    valor: Union[str, int, float]

class RegraSchema(BaseModel):
    id_regra: str
    condicao_gatilho: str
    valor_gatilho: Optional[Union[float, int, str]] = None
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
    criado_em: Optional[Any] = None
    modificado_em: Optional[Any] = None
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
#               MOTOR DE CÁLCULO DE FÓRMULAS (Sem alterações)
# ===================================================================
def executar_formula(formula: List[Dict[str, Any]], contexto: Dict[str, float]) -> float:
    # ... (A lógica interna do motor de cálculo já era robusta e não precisa de alterações)
    if not formula:
        return 0.0
    valores, operadores, precedencia = [], [], {'+': 1, '-': 1, '*': 2, '/': 2}
    def aplicar_operador():
        op, right, left = operadores.pop(), valores.pop(), valores.pop()
        if op == '+': valores.append(left + right)
        elif op == '-': valores.append(left - right)
        elif op == '*': valores.append(left * right)
        elif op == '/': valores.append(left / right if right != 0 else 0)
    for comp in formula:
        tipo, valor = comp['tipo'], comp['valor']
        if tipo == 'numero': valores.append(float(valor))
        elif tipo == 'variavel':
            if valor not in contexto: raise ValueError(f"Variável de contexto '{valor}' não encontrada.")
            valores.append(float(contexto[valor]))
        elif tipo == 'operador':
            while operadores and operadores[-1] in precedencia and precedencia.get(operadores[-1], 0) >= precedencia.get(valor, 0):
                aplicar_operador()
            operadores.append(valor)
    while operadores: aplicar_operador()
    return round(valores[0], 4) if valores else 0.0

# ===================================================================
#                       FUNÇÕES AUXILIARES (Sem alterações)
# ===================================================================
def avaliar_condicao(condicao: str, valor_regra: Any, valor_real: int) -> bool:
    # ... (A lógica de avaliação de condições permanece a mesma)
    if condicao == "SEMPRE": return True
    if valor_regra is None: return False
    try:
        if condicao == "IGUAL_A": return valor_real == float(valor_regra)
        if condicao == "MAIOR_QUE": return valor_real > float(valor_regra)
        if condicao == "MAIOR_IGUAL_A": return valor_real >= float(valor_regra)
        if condicao == "MENOR_QUE": return valor_real < float(valor_regra)
        if condicao == "MENOR_IGUAL_A": return valor_real <= float(valor_regra)
        if condicao == "ENTRE":
            v1, v2 = map(float, str(valor_regra).split(','))
            return v1 <= valor_real <= v2
    except (ValueError, IndexError): return False
    return False

# ===================================================================
#                  CONTROLLER (Endpoints da API - Com alterações)
# ===================================================================
router = APIRouter(prefix="/embalagem", tags=["Embalagens e Volumes"])

# --- Endpoints CRUD (Sem alterações) ---
@router.post("", response_model=LogicaEmbalagemSchema, status_code=status.HTTP_201_CREATED)
def criar_logica(logica: LogicaEmbalagemSchema, db: Session = Depends(get_db)):
    # ... (código inalterado)
    db_logica_existente = db.query(Embalagem).filter(Embalagem.nome == logica.nome).first()
    if db_logica_existente:
        raise HTTPException(status_code=400, detail=f"Já existe uma lógica com o nome '{logica.nome}'.")
    logica_data = logica.model_dump()
    db_logica = Embalagem(**logica_data)
    db.add(db_logica)
    db.commit()
    db.refresh(db_logica)
    return db_logica

@router.get("", response_model=List[LogicaEmbalagemSchema])
def listar_logicas(db: Session = Depends(get_db)):
    return db.query(Embalagem).all()
    
@router.put("/{logica_id}", response_model=LogicaEmbalagemSchema)
def atualizar_logica(logica_id: int, logica_update: LogicaEmbalagemSchema, db: Session = Depends(get_db)):
    # ... (código inalterado)
    db_logica = db.query(Embalagem).filter(Embalagem.id == logica_id).first()
    if not db_logica:
        raise HTTPException(status_code=404, detail="Lógica de embalagem não encontrada.")
    update_data = logica_update.model_dump(exclude_unset=True)
    if 'nome' in update_data and update_data['nome'] != db_logica.nome:
        db_logica_existente = db.query(Embalagem).filter(Embalagem.nome == update_data['nome'], Embalagem.id != logica_id).first()
        if db_logica_existente:
            raise HTTPException(status_code=400, detail=f"Já existe uma lógica com o nome '{update_data['nome']}'.")
    for key, value in update_data.items():
        setattr(db_logica, key, value)
    db.commit()
    db.refresh(db_logica)
    return db_logica

@router.delete("/{logica_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_logica(logica_id: int, db: Session = Depends(get_db)):
    # ... (código inalterado)
    db_logica = db.query(Embalagem).filter(Embalagem.id == logica_id).first()
    if not db_logica:
        raise HTTPException(status_code=404, detail="Lógica de embalagem não encontrada.")
    db.delete(db_logica)
    db.commit()

# --- Endpoint para Cálculo de Volume (ATUALIZADO) ---
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

        # --- DADOS BASE EXTRAÍDOS DO PRODUTO ---
        unidade_caixa = int(produto_data.get('unidade_caixa') or 0)
        peso_embalagem_g = float(produto_data.get('peso_embalagem') or 0)
        altura_embalagem_cm = float(produto_data.get('altura_embalagem') or 0)
        largura_embalagem_cm = float(produto_data.get('largura_embalagem') or 0)
        comprimento_embalagem_cm = float(produto_data.get('comprimento_embalagem') or 0)
        
        if not all([unidade_caixa, peso_embalagem_g, altura_embalagem_cm, largura_embalagem_cm, comprimento_embalagem_cm]):
            raise HTTPException(status_code=400, detail="Produto com dados de embalagem padrão incompletos.")
        if unidade_caixa <= 0:
            raise HTTPException(status_code=400, detail="A 'unidade_caixa' do produto deve ser maior que zero.")

        volumes_finais = []
        volumes_cheios = req.quantidade // unidade_caixa
        quantidade_restante = req.quantidade % unidade_caixa
        
        # Adiciona os volumes completos (caixas cheias)
        for _ in range(volumes_cheios):
            volumes_finais.append(VolumeCalculadoSchema(
                tipo="Volume Completo", itens=unidade_caixa, peso_kg=(peso_embalagem_g / 1000.0),
                altura_cm=altura_embalagem_cm, largura_cm=largura_embalagem_cm, comprimento_cm=comprimento_embalagem_cm
            ))
            
        # Calcula o volume parcial, se houver itens restantes
        if quantidade_restante > 0:
            regras_json = produto_data.get('regras')
            regras = json.loads(regras_json) if isinstance(regras_json, str) else regras_json
            
            # --- CÁLCULO DAS VARIÁVEIS PROPORCIONAIS (REGRA DE 3) ---
            # A lógica é: (Valor da embalagem cheia / Itens na embalagem cheia) * Itens restantes
            peso_proporcional_kg = ( (peso_embalagem_g / 1000.0) / unidade_caixa) * quantidade_restante
            altura_proporcional_cm = (altura_embalagem_cm / unidade_caixa) * quantidade_restante
            largura_proporcional_cm = (largura_embalagem_cm / unidade_caixa) * quantidade_restante
            comprimento_proporcional_cm = (comprimento_embalagem_cm / unidade_caixa) * quantidade_restante

            # --- CRIAÇÃO DO CONTEXTO PARA O MOTOR DE FÓRMULAS ---
            # Este dicionário alimenta as fórmulas com os valores calculados.
            contexto = {
                "QTD_RESTANTE": float(quantidade_restante),
                "QTD_EMBALAGEM": float(unidade_caixa),
                
                "PESO_EMBALAGEM": float(peso_embalagem_g / 1000.0), # Em Kg
                "ALTURA_EMBALAGEM": float(altura_embalagem_cm),
                "LARGURA_EMBALAGEM": float(largura_embalagem_cm),
                "COMPRIMENTO_EMBALAGEM": float(comprimento_embalagem_cm),
                
                "PESO_PROPORCIONAL": float(peso_proporcional_kg),
                "ALTURA_PROPORCIONAL": float(altura_proporcional_cm),
                "LARGURA_PROPORCIONAL": float(largura_proporcional_cm),
                "COMPRIMENTO_PROPORCIONAL": float(comprimento_proporcional_cm),
                
                "ACRESCIMO_EMBALAGEM": 2.0 # Valor fixo (2cm), conforme padrão definido no frontend.
            }

            regra_aplicada = None
            if regras:
                regras_sorted = sorted(regras, key=lambda r: r.get('prioridade', 0), reverse=True)
                for regra in regras_sorted:
                    if avaliar_condicao(regra.get('condicao_gatilho'), regra.get('valor_gatilho'), quantidade_restante):
                        regra_aplicada = regra
                        break 
            
            # Valores padrão se nenhuma regra for aplicada (usamos os da embalagem cheia)
            altura_p = contexto["ALTURA_EMBALAGEM"]
            largura_p = contexto["LARGURA_EMBALAGEM"]
            comp_p = contexto["COMPRIMENTO_EMBALAGEM"]
            peso_p = contexto["PESO_PROPORCIONAL"]
            
            if regra_aplicada:
                try:
                    if regra_aplicada.get('formula_altura'): altura_p = executar_formula(regra_aplicada['formula_altura'], contexto)
                    if regra_aplicada.get('formula_largura'): largura_p = executar_formula(regra_aplicada['formula_largura'], contexto)
                    if regra_aplicada.get('formula_comprimento'): comp_p = executar_formula(regra_aplicada['formula_comprimento'], contexto)
                    if regra_aplicada.get('formula_peso'): peso_p = executar_formula(regra_aplicada['formula_peso'], contexto)
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Erro ao processar fórmula: {e}")
            
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
        if 'cursor' in locals() and cursor: cursor.close()
        if 'conn' in locals() and conn: conn.close()
        
# --- Endpoint de Paginação ---
@router.get("/paginado", response_model=PaginatedResponse)
def listar_logicas_paginado(
    page: int = 1, limit: int = 15, filtros: Optional[str] = None,
    filtro_rapido_coluna: Optional[str] = None, filtro_rapido_texto: Optional[str] = None,
    data_inicio: Optional[str] = None, data_fim: Optional[str] = None,
    ordenar_por: Optional[str] = "id", ordenar_direcao: Optional[str] = "asc",
    db: Session = Depends(get_db)
):
    query = db.query(Embalagem)
    
    colunas_validas = {
        "id": Embalagem.id, "nome": Embalagem.nome, 
        "descricao": Embalagem.descricao, "criado_em": Embalagem.criado_em
    }

    where_clauses = []
    if filtros:
        for par in filtros.split(";"):
            if ":" in par:
                coluna, texto = par.split(":", 1)
                if coluna in colunas_validas:
                    where_clauses.append(colunas_validas[coluna].ilike(f"%{texto}%"))

    if filtro_rapido_coluna and filtro_rapido_texto and filtro_rapido_coluna in colunas_validas:
        where_clauses.append(colunas_validas[filtro_rapido_coluna].ilike(f"%{filtro_rapido_texto}%"))

    if data_inicio: where_clauses.append(Embalagem.criado_em >= f"{data_inicio} 00:00:00")
    if data_fim: where_clauses.append(Embalagem.criado_em <= f"{data_fim} 23:59:59")
        
    if where_clauses:
        query = query.filter(and_(*where_clauses))

    total = query.count()

    coluna_ordenacao = colunas_validas.get(ordenar_por, Embalagem.id)
    if ordenar_direcao.lower() == "desc":
        query = query.order_by(coluna_ordenacao.desc())
    else:
        query = query.order_by(coluna_ordenacao.asc())
        
    offset = (page - 1) * limit
    resultados = query.offset(offset).limit(limit).all()

    return {"total": total, "resultados": resultados}