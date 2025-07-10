# controllers/auth_controller.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session

# Funções utilitárias para senha e token
from utils.password_utils import verify_password
from utils.jwt_handler import create_access_token, verify_token

# Importa o modelo de usuário e a função de dependência do banco
from models.user_model import Usuario
from config.database import get_db # <<< CORREÇÃO AQUI

router = APIRouter()

# Define o esquema de segurança para obter o token do cabeçalho de autorização
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

# Define a estrutura esperada para o corpo da requisição de login
class LoginRequest(BaseModel):
    email: str
    senha: str

@router.post("/login", tags=["Autenticação"])
def login(data: LoginRequest, db: Session = Depends(get_db)): # <<< CORREÇÃO AQUI
    """
    Autentica um usuário e retorna um token JWT.
    """
    # Busca o usuário ativo pelo e-mail no banco de dados
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.ativo == True).first()

    # Verifica se o usuário existe e se a senha está correta
    if not usuario or not verify_password(data.senha, usuario.senha):
        raise HTTPException(
            status_code=401, 
            detail="Credenciais inválidas. Verifique o e-mail e a senha.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Cria o token JWT com o e-mail e perfil do usuário no payload
    token = create_access_token({"sub": usuario.email, "perfil": usuario.perfil})

    # Retorna o token e informações básicas do usuário
    return {
        "access_token": token,
        "token_type": "bearer",
        "nome": usuario.nome,
        "perfil": usuario.perfil
    }

@router.get("/usuario-logado", tags=["Autenticação"])
def usuario_logado(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)): # <<< CORREÇÃO AQUI
    """
    Verifica o token JWT e retorna os dados do usuário logado.
    """
    # Decodifica o token para obter o e-mail (subject)
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    # Busca o usuário correspondente ao e-mail do token
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário do token não encontrado")

    # Retorna os dados públicos do usuário
    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil
    }
