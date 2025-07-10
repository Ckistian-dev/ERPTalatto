# controllers/cadastros_controller.py

from fastapi import APIRouter, HTTPException, Query, Depends, Response, status
from pydantic import BaseModel, EmailStr, ConfigDict, BeforeValidator
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional, List, Annotated, Any
from datetime import datetime
import os
from dotenv import load_dotenv
import mysql.connector.pooling
import json

load_dotenv()

from config.database import get_db
from models.cadastro_model import Cadastro

router = APIRouter(tags=["Cadastros"])

# Pool de conexões para as rotas de importação que usam o padrão antigo
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="cadastro_pool_hybrid",
    pool_size=5,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT")),
    charset='utf8mb4',
    collation='utf8mb4_unicode_ci'
)

# --- Modelos Pydantic (Schema) ---

def parse_int_from_string(value: Any) -> Optional[int]:
    if value is None: return None
    if isinstance(value, int): return value
    if isinstance(value, str):
        cleaned_value = value.strip().strip('"')
        if cleaned_value.isdigit(): return int(cleaned_value)
    return None

class CadastroBase(BaseModel):
    nome_razao: str
    fantasia: Optional[str] = None
    tipo_pessoa: str
    tipo_cadastro: str
    telefone: Optional[str] = None
    celular: Optional[str] = None
    email: EmailStr
    cpf_cnpj: Optional[str] = None
    ie: Optional[str] = None
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cep: str
    cidade: str
    estado: str
    codigo_ibge_cidade: Optional[str] = None
    pais: Optional[str] = 'Brasil'
    codigo_pais: Optional[str] = '1058'
    indicador_ie: Optional[str] = '9'
    regiao: Optional[str] = None
    situacao: str

class CadastroCreate(CadastroBase): pass
class CadastroUpdate(CadastroBase): pass

class CadastroResponse(CadastroBase):
    id: int
    criado_em: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class CadastroCSV(CadastroBase):
    id: Annotated[Optional[int], BeforeValidator(parse_int_from_string)] = None
    email: str
    criado_em: Optional[str] = None

class ImportacaoPayload(BaseModel):
    registros: List[CadastroCSV]

# --- Endpoints com SQLAlchemy (Padrão Novo) ---

@router.post("/cadastros", response_model=CadastroResponse, status_code=201)
def criar_cadastro(cadastro: CadastroCreate, db: Session = Depends(get_db)):
    db_cadastro = db.query(Cadastro).filter(Cadastro.email == cadastro.email).first()
    if db_cadastro:
        raise HTTPException(status_code=400, detail="Email já cadastrado.")
    if cadastro.cpf_cnpj and cadastro.cpf_cnpj.strip():
        db_cadastro = db.query(Cadastro).filter(Cadastro.cpf_cnpj == cadastro.cpf_cnpj).first()
        if db_cadastro:
            raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado.")
    try:
        novo_cadastro = Cadastro(**cadastro.model_dump())
        db.add(novo_cadastro)
        db.commit()
        db.refresh(novo_cadastro)
        return novo_cadastro
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade: Email ou CPF/CNPJ já existe.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao criar cadastro: {e}")

@router.get("/cadastros/paginado")
def listar_cadastros_paginado(db: Session = Depends(get_db), page: int = 1, limit: int = 15, filtros: Optional[str] = None, filtro_rapido_coluna: Optional[str] = None, filtro_rapido_texto: Optional[str] = None, data_inicio: Optional[str] = None, data_fim: Optional[str] = None, ordenar_por: Optional[str] = "id", ordenar_direcao: Optional[str] = "asc"):
    query = db.query(Cadastro)
    if filtros:
        for par_filtro in filtros.split(";"):
            if ":" in par_filtro:
                coluna, texto = par_filtro.split(":", 1)
                if hasattr(Cadastro, coluna):
                    query = query.filter(getattr(Cadastro, coluna).like(f"%{texto}%"))
    if filtro_rapido_coluna and filtro_rapido_texto and hasattr(Cadastro, filtro_rapido_coluna):
        query = query.filter(getattr(Cadastro, filtro_rapido_coluna).like(f"%{filtro_rapido_texto}%"))
    if data_inicio: query = query.filter(Cadastro.criado_em >= data_inicio)
    if data_fim: query = query.filter(Cadastro.criado_em <= f"{data_fim} 23:59:59")
    total_registros = query.count()
    if hasattr(Cadastro, ordenar_por):
        coluna_ordenacao = getattr(Cadastro, ordenar_por)
        if ordenar_direcao.lower() == "desc":
            query = query.order_by(coluna_ordenacao.desc())
        else:
            query = query.order_by(coluna_ordenacao.asc())
    offset = (page - 1) * limit
    resultados = query.offset(offset).limit(limit).all()
    return {"total": total_registros, "resultados": resultados}

@router.put("/cadastros/{cadastro_id}", response_model=CadastroResponse)
def atualizar_cadastro(cadastro_id: int, cadastro_update: CadastroUpdate, db: Session = Depends(get_db)):
    db_cadastro = db.query(Cadastro).filter(Cadastro.id == cadastro_id).first()
    if not db_cadastro:
        raise HTTPException(status_code=404, detail="Cadastro não encontrado.")
    update_data = cadastro_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_cadastro, key, value)
    try:
        db.commit()
        db.refresh(db_cadastro)
        return db_cadastro
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Erro de integridade: Email ou CPF/CNPJ já existe em outro registro.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar cadastro: {e}")

@router.delete("/{cadastro_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_cadastro(cadastro_id: int, db: Session = Depends(get_db)):
    db_cadastro = db.query(Cadastro).filter(Cadastro.id == cadastro_id).first()
    if not db_cadastro:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cadastro não encontrado.")
    try:
        db.delete(db_cadastro)
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao deletar cadastro: {e}")

@router.get("/cadastros_dropdown")
def listar_cadastros_dropdown(db: Session = Depends(get_db), tipo_cadastro: Optional[List[str]] = Query(None)):
    query = db.query(Cadastro.id, Cadastro.nome_razao, Cadastro.cpf_cnpj).filter(Cadastro.situacao == 'Ativo')
    if tipo_cadastro:
        query = query.filter(Cadastro.tipo_cadastro.in_(tipo_cadastro))
    resultados = query.order_by(Cadastro.nome_razao.asc()).all()
    return [{"id": r.id, "nome_razao": r.nome_razao, "cpf_cnpj": r.cpf_cnpj} for r in resultados]

# --- ROTAS DE IMPORTAÇÃO DE CSV (Padrão Antigo com SQL Manual) ---

@router.post("/cadastros/validar_importacao", status_code=200)
def validar_importacao(payload: ImportacaoPayload):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    conflitos, novos, erros = [], [], []
    try:
        for cadastro_csv in payload.registros:
            cadastro_dict = cadastro_csv.model_dump(exclude_unset=True)
            cpf_cnpj_limpo = (cadastro_dict.get("cpf_cnpj") or '').strip().replace('.', '').replace('-', '').replace('/', '')

            if not cpf_cnpj_limpo:
                erros.append({"mensagem": "Cadastro sem CPF/CNPJ informado.", "cadastro": cadastro_dict})
                continue

            # CORREÇÃO: A query agora limpa o campo do banco de dados antes de comparar
            query = "SELECT * FROM cadastros WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = %s"
            cursor.execute(query, (cpf_cnpj_limpo,))
            existente = cursor.fetchone()

            if existente:
                # Limpa dados gerados pelo DB para uma comparação mais justa
                existente.pop("id", None)
                existente.pop("criado_em", None)
                existente.pop("atualizado_em", None)
                conflitos.append({"original": existente, "novo": cadastro_dict})
            else:
                novos.append(cadastro_dict)
        return {"conflitos": conflitos, "novos": novos, "erros": erros}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao validar cadastros: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@router.post("/cadastros/importar_csv_confirmado", status_code=200)
def importar_csv_confirmado(payload: ImportacaoPayload):
    conn = pool.get_connection()
    cursor = conn.cursor()
    erros_importacao = []
    atualizados_count, inseridos_count = 0, 0

    for idx, cadastro_csv in enumerate(payload.registros):
        linha_num = idx + 1
        try:
            dados = cadastro_csv.model_dump()
            cleaned_data = {k: v.strip().strip('"') if isinstance(v, str) else v for k, v in dados.items()}
            cpf_cnpj_limpo = (cleaned_data.get("cpf_cnpj") or '').replace('.', '').replace('-', '').replace('/', '')

            if not cpf_cnpj_limpo:
                erros_importacao.append(f"Linha {linha_num}: CPF/CNPJ não informado.")
                continue

            # CORREÇÃO: A query de busca também foi corrigida aqui
            query_busca = "SELECT id FROM cadastros WHERE REPLACE(REPLACE(REPLACE(cpf_cnpj, '.', ''), '-', ''), '/', '') = %s"
            cursor.execute(query_busca, (cpf_cnpj_limpo,))
            existente = cursor.fetchone()

            if existente:
                # Lógica de UPDATE com SQL manual
                query_update = """UPDATE cadastros SET
                    nome_razao=%s, fantasia=%s, tipo_pessoa=%s, tipo_cadastro=%s, telefone=%s,
                    celular=%s, email=%s, ie=%s, logradouro=%s, numero=%s, complemento=%s,
                    bairro=%s, cep=%s, cidade=%s, estado=%s, codigo_ibge_cidade=%s, pais=%s,
                    codigo_pais=%s, indicador_ie=%s, regiao=%s, situacao=%s
                    WHERE id = %s"""
                params = (
                    cleaned_data.get('nome_razao'), cleaned_data.get('fantasia'), cleaned_data.get('tipo_pessoa'),
                    cleaned_data.get('tipo_cadastro'), cleaned_data.get('telefone'), cleaned_data.get('celular'),
                    cleaned_data.get('email'), cleaned_data.get('ie'), cleaned_data.get('logradouro'),
                    cleaned_data.get('numero'), cleaned_data.get('complemento'), cleaned_data.get('bairro'),
                    cleaned_data.get('cep'), cleaned_data.get('cidade'), cleaned_data.get('estado'),
                    cleaned_data.get('codigo_ibge_cidade'), cleaned_data.get('pais'), cleaned_data.get('codigo_pais'),
                    cleaned_data.get('indicador_ie'), cleaned_data.get('regiao'), cleaned_data.get('situacao'),
                    existente[0] # ID do cadastro existente
                )
                cursor.execute(query_update, params)
                atualizados_count += 1
            else:
                # Lógica de INSERT com SQL manual
                query_insert = """INSERT INTO cadastros (
                    nome_razao, fantasia, tipo_pessoa, tipo_cadastro, telefone, celular, email,
                    cpf_cnpj, ie, logradouro, numero, complemento, bairro, cep, cidade, estado,
                    codigo_ibge_cidade, pais, codigo_pais, indicador_ie, regiao, situacao
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"""
                params = (
                    cleaned_data.get('nome_razao'), cleaned_data.get('fantasia'), cleaned_data.get('tipo_pessoa'),
                    cleaned_data.get('tipo_cadastro'), cleaned_data.get('telefone'), cleaned_data.get('celular'),
                    cleaned_data.get('email'), cpf_cnpj_limpo, cleaned_data.get('ie'), cleaned_data.get('logradouro'),
                    cleaned_data.get('numero'), cleaned_data.get('complemento'), cleaned_data.get('bairro'),
                    cleaned_data.get('cep'), cleaned_data.get('cidade'), cleaned_data.get('estado'),
                    cleaned_data.get('codigo_ibge_cidade'), cleaned_data.get('pais'), cleaned_data.get('codigo_pais'),
                    cleaned_data.get('indicador_ie'), cleaned_data.get('regiao'), cleaned_data.get('situacao')
                )
                cursor.execute(query_insert, params)
                inseridos_count += 1
        except Exception as e:
            erros_importacao.append(f"Linha {linha_num}: {str(e)}")

    try:
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao salvar dados: {e}")
    finally:
        cursor.close()
        conn.close()

    mensagem_final = f"Importação concluída. Inseridos: {inseridos_count}, Atualizados: {atualizados_count}."
    if erros_importacao:
        return {"mensagem": mensagem_final, "erros": erros_importacao}
    return {"mensagem": mensagem_final, "erros": []}