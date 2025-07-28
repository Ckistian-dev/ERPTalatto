from sqlalchemy import Column, Integer, String, DateTime, BigInteger
from sqlalchemy.sql import func

# Importa a Base declarativa do seu projeto.
# Certifique-se de que o caminho do import ('from config.database...')
# está correto de acordo com a estrutura do seu projeto.
from config.database import Base

class MeliCredentials(Base):
    """
    Modelo SQLAlchemy para armazenar as credenciais de autenticação
    do Mercado Livre de forma segura no banco de dados.
    """
    __tablename__ = "meli_credentials"

    # Chave primária da tabela, um simples número de identificação.
    id = Column(Integer, primary_key=True, index=True)

    # ID do usuário do Mercado Livre (ex: 123456789).
    # Usamos BigInteger para garantir compatibilidade com os IDs do ML.
    # É único, pois cada usuário do ML só pode ter um conjunto de credenciais.
    user_id = Column(BigInteger, unique=True, nullable=False, index=True)

    # O token de acesso para fazer chamadas à API. Expira em 6 horas.
    access_token = Column(String(255), nullable=False)

    # O token de atualização para obter novos access_tokens sem que o usuário
    # precise fazer login novamente. É de longa duração.
    refresh_token = Column(String(255), nullable=False)

    # Tempo de vida do access_token em segundos (geralmente 21600).
    expires_in = Column(Integer, nullable=False)

    # Data e hora da última atualização do registro.
    # É preenchido e atualizado automaticamente pelo banco de dados.
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

