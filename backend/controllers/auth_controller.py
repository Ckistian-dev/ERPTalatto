from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from utils.password_utils import verify_password
from utils.jwt_handler import create_access_token
from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from utils.jwt_handler import verify_token
from models.user_model import Usuario
from sqlalchemy.orm import Session
from config.database import get_session 

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    senha: str

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_session)):
    usuario = db.query(Usuario).filter(Usuario.email == data.email, Usuario.ativo == True).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Usuário não encontrado ou inativo.")

    if not verify_password(data.senha, usuario.senha):
        raise HTTPException(status_code=401, detail="Senha inválida.")

    token = create_access_token({"sub": usuario.email, "perfil": usuario.perfil})

    return {
        "access_token": token,
        "token_type": "bearer",
        "nome": usuario.nome,
        "perfil": usuario.perfil
    }

@router.get("/usuario-logado")
def usuario_logado(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_session)  # ⚠️ novo depends correto
):
    email = verify_token(token)
    if not email:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")

    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    return {
        "id": usuario.id,
        "nome": usuario.nome,
        "email": usuario.email,
        "perfil": usuario.perfil  # Se quiser também retornar o perfil
    }
