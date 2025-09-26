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
    formula_itens: List[FormulaComponentSchema]
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
    if not formula:
        return 0.0
    
    valores, operadores = [], []
    precedencia = {'+': 1, '-': 1, '*': 2, '/': 2}

    def aplicar_operador():
        op = operadores.pop()
        right = valores.pop()
        left = valores.pop()
        if op == '+': valores.append(left + right)
        elif op == '-': valores.append(left - right)
        elif op == '*': valores.append(left * right)
        elif op == '/': valores.append(left / right if right != 0 else 0)

    for comp in formula:
        tipo, valor = comp['tipo'], comp['valor']
        
        if tipo == 'numero':
            valores.append(float(valor))
        elif tipo == 'variavel':
            if valor not in contexto:
                raise ValueError(f"Variável de contexto '{valor}' não encontrada.")
            valores.append(float(contexto[valor]))
        
        # --- LÓGICA ATUALIZADA AQUI ---
        elif valor == '(':
            operadores.append(valor)
        elif valor == ')':
            while operadores and operadores[-1] != '(':
                aplicar_operador()
            if operadores and operadores[-1] == '(':
                operadores.pop() # Remove o '(' correspondente
            else:
                raise ValueError("Parênteses não correspondidos na fórmula.")
        # --- FIM DA LÓGICA ATUALIZADA ---

        elif tipo == 'operador':
            while (operadores and operadores[-1] != '(' and 
                   precedencia.get(operadores[-1], 0) >= precedencia.get(valor, 0)):
                aplicar_operador()
            operadores.append(valor)

    while operadores:
        if operadores[-1] == '(':
             raise ValueError("Parênteses não correspondidos na fórmula.")
        aplicar_operador()

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
def listar_todas_as_logicas(db: Session = Depends(get_db)):
    """
    Retorna uma lista de todas as lógicas de embalagem cadastradas.
    Este endpoint é usado pelo dropdown no cadastro de produtos.
    """
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
@router.post("/calcular-volumes", response_model=CalculoVolumeResponse, summary="Calcula os volumes de um produto com base em regras dinâmicas")
def calcular_volumes_produto(req: CalculoVolumeRequest):
    if req.quantidade <= 0:
        raise HTTPException(status_code=400, detail="A quantidade deve ser maior que zero.")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        query = """
            SELECT 
                p.peso_produto, p.altura_produto, p.largura_produto, p.comprimento_produto,
                e.regras
            FROM produtos p
            LEFT JOIN embalagem e ON p.id_logica_embalagem = e.id
            WHERE p.id = %s
        """
        cursor.execute(query, (req.produto_id,))
        produto_data = cursor.fetchone()

        if not produto_data:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")

        peso_item_g = float(produto_data.get('peso_produto') or 0)
        altura_item_cm = float(produto_data.get('altura_produto') or 0)
        largura_item_cm = float(produto_data.get('largura_produto') or 0)
        comprimento_item_cm = float(produto_data.get('comprimento_produto') or 0)
        
        if not all([peso_item_g, altura_item_cm, largura_item_cm, comprimento_item_cm]):
            raise HTTPException(status_code=400, detail="Produto com dados dimensionais (peso, altura, largura, comprimento) incompletos ou zerados.")

        regras_json = produto_data.get('regras')
        regras = json.loads(regras_json) if isinstance(regras_json, str) else regras_json
        
        if not regras:
            raise HTTPException(status_code=400, detail="Nenhuma lógica de embalagem ou regras associadas a este produto.")

        regras_sorted = sorted(regras, key=lambda r: r.get('prioridade', 0), reverse=True)

        volumes_finais = []
        quantidade_a_processar = req.quantidade
        
        # --- LÓGICA DE LOOP "GANANCIOSO" ---
        # Continua enquanto houver itens para embalar
        while quantidade_a_processar > 0:
            regra_foi_aplicada = False
            
            # A cada loop, tenta aplicar as regras desde a de maior prioridade
            for regra in regras_sorted:
                # Verifica se a condição da regra é atendida pela quantidade restante
                if avaliar_condicao(regra.get('condicao_gatilho'), regra.get('valor_gatilho'), quantidade_a_processar):
                    
                    # Se a condição for atendida, APLICA A REGRA e sai do loop interno
                    try:
                        contexto = {
                            "QTD_A_PROCESSAR": float(quantidade_a_processar),
                            "QTD_TOTAL_PEDIDO": float(req.quantidade),
                            "PESO_ITEM_UNICO": peso_item_g / 1000.0,
                            "ALTURA_ITEM_UNICO": altura_item_cm,
                            "LARGURA_ITEM_UNICO": largura_item_cm,
                            "COMPRIMENTO_ITEM_UNICO": comprimento_item_cm,
                            "ACRESCIMO_EMBALAGEM": 2.0
                        }

                        if not regra.get('formula_itens'):
                             raise ValueError("A regra não possui 'formula_itens'.")
                        
                        itens_neste_volume = executar_formula(regra['formula_itens'], contexto)
                        itens_neste_volume = int(max(1, min(itens_neste_volume, quantidade_a_processar)))

                        contexto["QTD_NESTE_VOLUME"] = float(itens_neste_volume)

                        altura_p = executar_formula(regra['formula_altura'], contexto)
                        largura_p = executar_formula(regra['formula_largura'], contexto)
                        comp_p = executar_formula(regra['formula_comprimento'], contexto)
                        peso_p = executar_formula(regra['formula_peso'], contexto)

                    except (ValueError, KeyError) as e:
                        raise HTTPException(status_code=400, detail=f"Erro ao processar fórmula da regra: {e}")

                    volumes_finais.append(VolumeCalculadoSchema(
                        tipo="Volume",
                        itens=itens_neste_volume,
                        peso_kg=round(peso_p, 4),
                        altura_cm=round(altura_p, 2),
                        largura_cm=round(largura_p, 2),
                        comprimento_cm=round(comp_p, 2)
                    ))
                    
                    quantidade_a_processar -= itens_neste_volume
                    regra_foi_aplicada = True
                    break # <-- PONTO CHAVE: Sai do 'for' e força o 'while' a recomeçar do zero

            # Se o 'for' terminar e nenhuma regra tiver sido aplicada, significa que algo está errado
            if not regra_foi_aplicada:
                raise HTTPException(status_code=400, detail=f"Loop infinito detectado. Nenhuma regra aplicável para a quantidade restante de {quantidade_a_processar}. Verifique se existe uma regra 'Sempre Aplicar' com prioridade baixa.")

        return CalculoVolumeResponse(
            total_volumes=len(volumes_finais),
            peso_total_kg=round(sum(v.peso_kg for v in volumes_finais), 4),
            volumes=volumes_finais
        )
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