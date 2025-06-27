from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class CadastroBase(BaseModel):
    nome_razao: str
    fantasia: Optional[str] = None
    tipo_pessoa: str
    tipo_cadastro: str
    telefone: Optional[str] = None
    celular: Optional[str] = None
    email: EmailStr
    cpf_cnpj: Optional[str] = None # Será validado e formatado no backend
    rg_ie: Optional[str] = None    # Será a Inscrição Estadual para NFe
    
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cep: str # Será validado e formatado no backend
    cidade: str
    estado: str # UF

    # Novos campos para NFe e melhorias
    codigo_ibge_cidade: Optional[str] = None
    pais: str = 'Brasil' # Default conforme modelo SQLAlchemy
    codigo_pais: str = '1058' # Default conforme modelo SQLAlchemy
    indicador_ie: str = '9' # Default: 1=Contribuinte ICMS; 2=Contribuinte isento; 9=Não Contribuinte
    
    regiao: Optional[str] = None # Mantido conforme schema original do usuário
    situacao: str = 'Ativo' # Default conforme modelo SQLAlchemy (nullable=False)

class CadastroCreate(CadastroBase):
    # Pode adicionar validações específicas para criação aqui, se necessário
    pass

class CadastroUpdate(CadastroBase):
    # Campos podem ser todos opcionais na atualização, se desejado.
    # Exemplo: nome_razao: Optional[str] = None
    # Mas para manter simples, herdamos tudo de CadastroBase.
    # O frontend controlará quais campos são enviados para atualização.
    pass

class CadastroResponse(CadastroBase): # Renomeado de CadastroInDB para consistência com o controller
    id: int
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None

    class Config:
        from_attributes = True # Para Pydantic v2. Se usar Pydantic v1, mantenha orm_mode = True
        # orm_mode = True # Para Pydantic v1

# Esquema para resposta de listagem paginada (exemplo, se necessário)
class CadastroPaginatedResponse(BaseModel):
    total: int
    resultados: List[CadastroResponse]

