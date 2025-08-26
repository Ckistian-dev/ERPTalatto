# /models/cadastro_model.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from config.database import Base

class Cadastro(Base):
    """
    Modelo SQLAlchemy para a tabela 'cadastros', refletindo a estrutura
    original do banco de dados do usuário.
    """
    __tablename__ = "cadastros"

    id = Column(Integer, primary_key=True, index=True)
    
    # --- Campos com nomes originais ---
    nome_razao = Column(String(100), nullable=False)
    fantasia = Column(String(100))
    tipo_pessoa = Column(String(20), nullable=False)
    tipo_cadastro = Column(String(20), nullable=False)
    telefone = Column(String(20))
    celular = Column(String(20))
    email = Column(String(100))
    cpf_cnpj = Column(String(20), unique=True, index=True)
    ie = Column(String(30)) # Nome original mantido
    logradouro = Column(String(100))
    numero = Column(String(20))
    complemento = Column(String(60))
    bairro = Column(String(60))
    cep = Column(String(10))
    cidade = Column(String(60))
    estado = Column(String(2))
    codigo_ibge_cidade = Column(String(7)) # Nome original mantido
    pais = Column(String(50), default='Brasil')
    codigo_pais = Column(String(4), default='1058')
    indicador_ie = Column(String(1), default='9')
    situacao = Column(String(20), default='Ativo', nullable=False)
    regiao = Column(String(60))
    
    # --- Campo novo adicionado ---
    is_consumidor_final = Column(Boolean, default=True)

    criado_em = Column(DateTime, server_default=func.now())
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<Cadastro(id={self.id}, nome_razao='{self.nome_razao}')>"
