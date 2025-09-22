# controllers/intelipost_controller.py

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Any, Dict
import traceback
import os
import re
import mysql.connector.pooling

# Importações do projeto
from config.database import get_db
from models.intelipost_model import IntelipostConfiguracao
from services.intelipost_service import IntelipostService

# --- Pool de conexão para buscas no banco de dados ---
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="intelipost_controller_pool",
    pool_size=5,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

# ==================================
#         SCHEMAS
# ==================================

class IntelipostConfigSchema(BaseModel):
    api_key: Optional[str] = Field(None, max_length=255)
    origin_zip_code: Optional[str] = Field(None, max_length=8, description="CEP de origem sem máscara")
    class Config: from_attributes = True

class ItemCotacaoSchema(BaseModel):
    produto_id: int
    quantidade_itens: int

class CotacaoAvulsaRequestSchema(BaseModel):
    destination_zip_code: str
    items: List[ItemCotacaoSchema]

# [NOVO] Schema de resposta para os dados de localização do cliente.
# Ajuda na documentação e validação da API.
class ClienteLocalizacaoSchema(BaseModel):
    nome_razao: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cidade: Optional[str] = None
    estado: Optional[str] = None
    cep: Optional[str] = None


# ==================================
#       FUNÇÕES AUXILIARES
# ==================================

def _find_carrier_by_word_match(api_name: str, all_carriers: List[Dict]) -> Optional[Dict]:
    """
    Encontra a primeira transportadora no cadastro que tenha pelo menos uma
    palavra em comum com o nome vindo da API.
    """
    if not api_name or not all_carriers:
        return None
    api_words = set(re.sub(r'[^\w\s]', '', api_name.lower()).split())
    if not api_words:
        return None
    for carrier in all_carriers:
        carrier_name = f"{carrier.get('nome_razao') or ''} {carrier.get('fantasia') or ''}"
        carrier_words = set(re.sub(r'[^\w\s]', '', carrier_name.lower()).split())
        if api_words.intersection(carrier_words):
            return carrier
    return None

# ==================================
#         CONTROLLER
# ==================================

router = APIRouter(
    prefix="/intelipost",
    tags=["Intelipost"]
)

# --- Endpoints de Configuração ---

@router.get("/configuracoes", response_model=IntelipostConfigSchema)
def get_intelipost_configuracoes(db: Session = Depends(get_db)):
    config = db.query(IntelipostConfiguracao).filter(IntelipostConfiguracao.id == 1).first()
    if not config:
        config = IntelipostConfiguracao(id=1, api_key=None, origin_zip_code=None)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/configuracoes", response_model=IntelipostConfigSchema)
def update_intelipost_configuracoes(
    config_update: IntelipostConfigSchema,
    db: Session = Depends(get_db)
):
    config = db.query(IntelipostConfiguracao).filter(IntelipostConfiguracao.id == 1).first()
    if not config:
        config = IntelipostConfiguracao(id=1)
        db.add(config)
        db.commit()
        db.refresh(config)
    update_data = config_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if 'zip_code' in key and value:
            value = ''.join(filter(str.isdigit, value))
        setattr(config, key, value)
    db.commit()
    db.refresh(config)
    return config

# --- Endpoints de Cotação ---

@router.post("/cotacao_por_orcamento")
async def fazer_cotacao_por_orcamento(
    orcamento_id: int = Query(..., description="ID do orçamento para o qual o frete será cotado"),
    db: Session = Depends(get_db)
):
    try:
        intelipost_service = IntelipostService(db=db)
        return await intelipost_service.get_quote_for_orcamento(orcamento_id=orcamento_id)
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro interno: {str(e)}")

@router.post("/cotacao_avulsa")
async def fazer_cotacao_avulsa(
    request: CotacaoAvulsaRequestSchema,
    db: Session = Depends(get_db)
):
    try:
        intelipost_service = IntelipostService(db=db)
        return await intelipost_service.get_quote_for_items(
            items=[item.model_dump() for item in request.items],
            destination_zip_code=request.destination_zip_code
        )
    except HTTPException as e:
        raise e
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Ocorreu um erro interno: {str(e)}")

# --- Endpoints Utilitários (Agora dentro do mesmo controller) ---

@router.get("/buscar_transportadora")
def buscar_transportadora_por_nome(nome: str = Query(..., description="Nome da transportadora para buscar")):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, nome_razao, fantasia FROM cadastros WHERE tipo_cadastro = 'Transportadora' AND situacao = 'Ativo'"
        )
        all_carriers = cursor.fetchall()
        matched_carrier = _find_carrier_by_word_match(nome, all_carriers)
        if not matched_carrier:
            raise HTTPException(status_code=404, detail="Nenhuma transportadora correspondente encontrada.")
        return matched_carrier
    finally:
        cursor.close()
        conn.close()

@router.get("/cliente_cep/{cliente_id}", response_model=ClienteLocalizacaoSchema)
def get_cliente_cep(cliente_id: int):
    """
    Busca os dados de localização de um cliente específico pelo seu ID.
    Retorna um objeto com nome, endereço, cidade, estado e CEP.
    """
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT 
                nome_razao, logradouro, numero, bairro, cidade, estado, cep 
            FROM cadastros 
            WHERE id = %s AND tipo_cadastro = 'Cliente'
        """, (cliente_id,))
        
        cliente = cursor.fetchone()
        
        # [ADICIONE ESTA LINHA PARA TESTE]
        print(f"DADOS DO CLIENTE ENCONTRADOS NO BACKEND: {cliente}")
        
        if not cliente:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, 
                detail="Cliente não encontrado."
            )
            
        return cliente
        
    finally:
        cursor.close()
        conn.close()