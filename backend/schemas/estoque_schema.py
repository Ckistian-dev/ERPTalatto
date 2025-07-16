from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class MovimentacaoBase(BaseModel):
    id_produto: int
    quantidade: Decimal = Field(..., gt=0)
    lote: str = Field(..., min_length=1)
    deposito: str = Field(..., min_length=1)
    rua: str
    numero: int
    nivel: int
    cor: str
    situacao_estoque: str = Field(..., min_length=1)
    observacao: Optional[str] = None

class EntradaCreate(MovimentacaoBase): pass
class SaidaCreate(MovimentacaoBase): pass

class EstoquePosicaoResponse(BaseModel):
    id_produto: int
    lote: str
    deposito: str
    rua: str
    numero: int
    nivel: int
    cor: str
    situacao_estoque: str
    quantidade: Decimal
    class Config: from_attributes = True

class EstoquePosicaoConsolidadaResponse(BaseModel):
    descricao: str
    id_produto: int
    lote: str
    deposito: str
    rua: str
    numero: int
    nivel: int
    cor: str
    situacao_estoque: str
    quantidade_total: Decimal

class ProdutoSearchResponse(BaseModel):
    id: int
    descricao: str
    class Config: from_attributes = True
