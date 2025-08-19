# /models/focus_configuracoes_model.py

from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from config.database import Base

class FocusConfiguracoes(Base):
    """
    Modelo SQLAlchemy que mapeia para a tabela 'focus_configuracoes'.
    
    Esta classe define a estrutura da tabela que armazena todas as
    informações e credenciais da empresa, incluindo os valores padrão
    para a emissão de NF-e através da API da Focus NF-e.
    """
    __tablename__ = "focus_configuracoes"

    id = Column(Integer, primary_key=True, index=True)
    
    # Dados da Empresa
    razao_social = Column(String(255))
    nome_fantasia = Column(String(255))
    cnpj = Column(String(14), unique=True)
    ie = Column(String(20)) # Inscrição Estadual
    im = Column(String(20)) # Inscrição Municipal
    cnae = Column(String(7)) # Classificação Nacional de Atividades Econômicas
    crt = Column(String(1)) # Código de Regime Tributário

    # Endereço Fiscal
    logradouro = Column(String(255))
    numero = Column(String(20))
    complemento = Column(String(100))
    bairro = Column(String(100))
    cep = Column(String(8))
    cidade = Column(String(100))
    uf = Column(String(2))
    codigo_municipio_ibge = Column(String(7))

    # Configurações da API Focus NF-e
    emissao_em_producao = Column(Boolean, default=False)
    focus_nfe_token = Column(String(255))

    # [ATUALIZADO] Novos campos para padrões fiscais
    cfop_interno = Column(String(4), default='5102')
    cfop_interestadual = Column(String(4), default='6108')
    cst_padrao = Column(String(2), default='00')
    csosn_padrao = Column(String(3), default='102')
    pis_cst_padrao = Column(String(2), default='07')
    cofins_cst_padrao = Column(String(2), default='07')
    presenca_comprador_padrao = Column(String(1), default='2')
    consumidor_final_padrao = Column(String(1), default='1')
    modalidade_frete_padrao = Column(Integer, default=9)

    # Timestamps
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now(), server_default=func.now())
