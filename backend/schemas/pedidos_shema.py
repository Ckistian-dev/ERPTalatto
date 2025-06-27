from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date

class PedidoBase(BaseModel):
    situacao_pedido: str
    data_emissao: date
    data_validade: date

    cliente_id: Optional[int]
    cliente_nome: Optional[str]
    
    vendedor_id: Optional[int]
    vendedor_nome: Optional[str]
    
    origem_venda: Optional[str]
    
    tipo_frete: Optional[str]
    transportadora_id: Optional[int]
    transportadora_nome: Optional[str]

    valor_frete: Optional[float] = 0.00
    total: Optional[float] = 0.00
    desconto_total: Optional[float] = 0.00
    total_com_desconto: Optional[float] = 0.00

    lista_itens: Optional[Dict[str, Any]] = {}
    formas_pagamento: Optional[Dict[str, Any]] = {}
    
    data_finalizacao: Optional[date] = None
    ordem_finalizacao: Optional[float] = None

    observacao: Optional[str] = None

class PedidoCreate(PedidoBase):
    pass

class PedidoUpdate(PedidoBase):
    pass

class PedidoInDB(PedidoBase):
    id: int
    criado_em: Optional[str]
    atualizado_em: Optional[str]

    class Config:
        orm_mode = True
