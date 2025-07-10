# config/database.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# Constrói a URL de conexão a partir das variáveis de ambiente
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_NAME = os.getenv("DB_NAME")
SQLALCHEMY_DATABASE_URL = f"mysql+mysqlconnector://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Cria a "engine" do SQLAlchemy, o ponto central de comunicação com o banco.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True  # Verifica a conexão antes de cada uso, ideal para conexões remotas
)

# Cria uma fábrica de sessões que será usada para criar sessões individuais para cada requisição.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Cria uma classe Base da qual todos os seus modelos de tabela do SQLAlchemy irão herdar.
Base = declarative_base()

def get_db():
    """
    Função de dependência do FastAPI para obter uma sessão do banco de dados.
    Garante que a sessão seja sempre fechada após a requisição.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
