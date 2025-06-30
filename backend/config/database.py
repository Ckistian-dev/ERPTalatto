from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from dotenv import load_dotenv
import os

load_dotenv()

# ✅ Corrigido: Incluindo a porta na DATABASE_URL
# O formato correto é user:password@host:port/database_name
DATABASE_URL = (
    f"mysql+mysqlconnector://{os.getenv('DB_USER')}:{os.getenv('DB_PASSWORD')}"
    f"@{os.getenv('DB_HOST')}:{os.getenv('DB_PORT')}/{os.getenv('DB_NAME')}" # Adicionado :DB_PORT
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_session():
    """
    Função para obter uma nova sessão de banco de dados.
    Deve ser usada com 'with' para garantir que a sessão seja fechada.
    Exemplo:
        with get_session() as db:
            # use db aqui
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

