# models/cadastro_model.py
from sqlalchemy import Column, Integer, String, DateTime, func
from config.database import Base # Supondo que Base seja seu declarative_base do SQLAlchemy

class Cadastro(Base):
    __tablename__ = "cadastros"

    id = Column(Integer, primary_key=True, index=True)
    nome_razao = Column(String(100), nullable=False)
    fantasia = Column(String(100))
    tipo_pessoa = Column(String(20), nullable=False) # Ex: 'Pessoa Física', 'Pessoa Jurídica'
    tipo_cadastro = Column(String(20), nullable=False) # Ex: 'Cliente', 'Fornecedor'
    
    telefone = Column(String(20)) # Armazenar apenas números ou formatado?
    celular = Column(String(20))  # Armazenar apenas números ou formatado?
    email = Column(String(100), unique=True, index=True, nullable=False)
    cpf_cnpj = Column(String(20), unique=True, index=True) # Armazenar apenas números
    ie = Column(String(30)) # Inscrição Estadual

    logradouro = Column(String(100), nullable=False)
    numero = Column(String(20), nullable=False)
    complemento = Column(String(60)) # Ajustado para 60, conforme NFe
    bairro = Column(String(60), nullable=False) # Aumentado um pouco
    cep = Column(String(10), nullable=False) # Armazenar apenas números
    cidade = Column(String(60), nullable=False) # Aumentado um pouco
    estado = Column(String(2), nullable=False) # UF
    
    # Novos campos para NFe
    codigo_ibge_cidade = Column(String(7)) # Código IBGE do município tem 7 dígitos
    pais = Column(String(50), default='Brasil')
    codigo_pais = Column(String(4), default='1058') # Código do país (Brasil)
    indicador_ie = Column(String(1), default='9') # 1, 2 ou 9

    regiao = Column(String(20)) # Pode ser derivado da UF, talvez não precise armazenar
    situacao = Column(String(20), default='Ativo', nullable=False) # Ex: Ativo, Inativo

    # Coluna para data de criação (opcional, mas útil)
    criado_em = Column(DateTime, server_default=func.now())
    # Coluna para data de atualização (opcional, mas útil)
    atualizado_em = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Adicionar __repr__ para facilitar a depuração (opcional)
    def __repr__(self):
        return f"<Cadastro(id={self.id}, nome_razao='{self.nome_razao}', cpf_cnpj='{self.cpf_cnpj}')>"
