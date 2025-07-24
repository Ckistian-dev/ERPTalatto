from fastapi import APIRouter, HTTPException, Depends, Request, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt

# ✅ Importa o limiter do novo arquivo, quebrando o ciclo de importação
from core.limiter import limiter 

# Funções utilitárias para senha e token
from utils.password_utils import verify_password
from utils.jwt_handler import create_access_token, verify_token, SECRET_KEY, ALGORITHM

# Importa o modelo de usuário e a função de dependência do banco
from models.user_model import Usuario
from config.database import get_db

router = APIRouter()

# Define o esquema de segurança para obter o token do cabeçalho de autorização
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# Define a estrutura esperada para o corpo da requisição de login
class LoginRequest(BaseModel):
    email: str
    senha: str

@router.post("/login", tags=["Autenticação"])
@limiter.limit("5/minute") # Proteção contra força bruta (5 tentativas por minuto por IP)
def login(request: Request, data: LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica um usuário e retorna um token JWT.
    """
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.ativo == True).first()

    if not usuario or not verify_password(data.senha, usuario.senha):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, 
            detail="Credenciais inválidas. Verifique o e-mail e a senha.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token({"sub": usuario.email, "perfil": usuario.perfil})

    return {
        "access_token": token,
        "token_type": "bearer",
        "nome": usuario.nome,
        "perfil": usuario.perfil
    }

@router.get("/usuario-logado", tags=["Autenticação"])
def usuario_logado(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    """
    Verifica o token JWT e retorna os dados do usuário logado.
    """
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido ou expirado")

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuário do token não encontrado")

    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil
    }

# --- SEÇÃO DE DEPENDÊNCIAS DE AUTORIZAÇÃO ---

def get_current_user_payload(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado",
        )

def admin_required(payload: dict = Depends(get_current_user_payload)):
    perfil = payload.get("perfil")
    if perfil != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Permissões de administrador são necessárias.",
        )
    return payload

# --- Exemplo de como usar a dependência de autorização ---

@router.get("/admin/check", tags=["Autenticação", "Admin"])
def check_admin_access(payload: dict = Depends(admin_required)):
    """
    Rota de exemplo que só pode ser acessada por administradores.
    """
    user_email = payload.get("sub")
    return {"message": f"Bem-vindo, administrador {user_email}! Você tem acesso a esta área."}

