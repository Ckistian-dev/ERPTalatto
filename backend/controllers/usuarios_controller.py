# controllers/usuarios_controller.py

# --- Importações Essenciais ---
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr, ConfigDict
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import Column, Integer, String, Boolean, JSON, DateTime, func # Importações do SQLAlchemy
from typing import Optional, List
import bcrypt
from datetime import datetime 

# Importações da configuração do seu projeto
from config.database import get_db, Base 

# ----------------------------------------------------------------
# 1. MODELO DE DADOS (SQLAlchemy)
#    Definição da tabela 'usuarios' no banco de dados.
# ----------------------------------------------------------------

class Usuario(Base):
    __tablename__ = 'usuarios'

    id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha = Column(String(255), nullable=False)
    perfil = Column(String(50), nullable=False, default='vendedor')
    ativo = Column(Boolean, default=True)
    criado_em = Column(DateTime(timezone=True), server_default=func.now())
    atualizado_em = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Adicionado para evitar erros de "Table already defined" com hot-reload
    __table_args__ = {'extend_existing': True}


# ----------------------------------------------------------------
# 2. SCHEMAS DE DADOS (Pydantic)
#    Define a estrutura dos dados para a API (entrada e saída).
# ----------------------------------------------------------------

class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    perfil: str

class UsuarioCreate(UsuarioBase):
    senha: str

class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    criado_em: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
    
class ListaUsuariosResponse(BaseModel):
    total: int
    resultados: List[UsuarioResponse]

class UsuarioCSV(UsuarioBase):
    id: Optional[int] = None
    ativo: Optional[bool] = True
    senha: Optional[str] = "definir_senha"

class ImportacaoPayload(BaseModel):
    registros: List[UsuarioCSV]
    
class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[EmailStr] = None
    perfil: Optional[str] = None
    ativo: Optional[bool] = None
    senha: Optional[str] = None # Senha é opcional na atualização


# ----------------------------------------------------------------
# 3. LÓGICA DO CONTROLLER (FastAPI Router)
#    Define os endpoints da API.
# ----------------------------------------------------------------

router = APIRouter(prefix="/api/usuarios", tags=["Usuários"])

@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
def criar_usuario(usuario_data: UsuarioCreate, db: Session = Depends(get_db)):
    # ... (código de criar usuário)
    db_usuario = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if db_usuario:
        raise HTTPException(status_code=400, detail="Este email já está cadastrado.")
    senha_hash = bcrypt.hashpw(usuario_data.senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    novo_usuario_dados = usuario_data.model_dump(exclude={"senha"})
    novo_usuario = Usuario(**novo_usuario_dados, senha=senha_hash, ativo=True)
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@router.get("/paginado", response_model=ListaUsuariosResponse) # ANTES: response_model=dict
def listar_usuarios_paginado(
    db: Session = Depends(get_db),
    page: int = 1,
    limit: int = 15,
    filtros: Optional[str] = None,
    filtro_rapido_coluna: Optional[str] = None,
    filtro_rapido_texto: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    ordenar_por: Optional[str] = "id",
    ordenar_direcao: Optional[str] = "asc"
):
    # ... (código de listar usuários)
    query = db.query(Usuario)
    if filtros:
        for par_filtro in filtros.split(";"):
            if ":" in par_filtro:
                coluna, texto = par_filtro.split(":", 1)
                if hasattr(Usuario, coluna):
                    query = query.filter(getattr(Usuario, coluna).like(f"%{texto}%"))
    if filtro_rapido_coluna and filtro_rapido_texto and hasattr(Usuario, filtro_rapido_coluna):
        query = query.filter(getattr(Usuario, filtro_rapido_coluna).like(f"%{filtro_rapido_texto}%"))
    if data_inicio: query = query.filter(Usuario.criado_em >= data_inicio)
    if data_fim: query = query.filter(Usuario.criado_em <= f"{data_fim} 23:59:59")
    total_registros = query.count()
    if hasattr(Usuario, ordenar_por):
        coluna_ordenacao = getattr(Usuario, ordenar_por)
        if ordenar_direcao.lower() == "desc":
            query = query.order_by(coluna_ordenacao.desc())
        else:
            query = query.order_by(coluna_ordenacao.asc())
    offset = (page - 1) * limit
    resultados = query.offset(offset).limit(limit).all()
    return {"total": total_registros, "resultados": resultados}


@router.post("/validar_importacao", status_code=200)
def validar_importacao_usuarios(payload: ImportacaoPayload, db: Session = Depends(get_db)):
    # ... (código de validar importação)
    conflitos, novos, erros = [], [], []
    for usuario_csv in payload.registros:
        if not usuario_csv.email:
            erros.append({"mensagem": "Usuário sem email informado.", "usuario": usuario_csv.model_dump()})
            continue
        existente = db.query(Usuario).filter(Usuario.email == usuario_csv.email).first()
        if existente:
            existente_dict = {c.name: getattr(existente, c.name) for c in existente.__table__.columns}
            conflitos.append({"original": existente_dict, "novo": usuario_csv.model_dump()})
        else:
            novos.append(usuario_csv.model_dump())
    return {"conflitos": conflitos, "novos": novos, "erros": erros}


@router.post("/importar_csv_confirmado", status_code=200)
def importar_csv_usuarios_confirmado(payload: ImportacaoPayload, db: Session = Depends(get_db)):
    # ... (código de importar CSV)
    inseridos_count, atualizados_count = 0, 0
    senha_padrao_hash = bcrypt.hashpw(b"mudar123", bcrypt.gensalt()).decode('utf-8')
    for registro in payload.registros:
        try:
            existente = db.query(Usuario).filter(Usuario.email == registro.email).first()
            if existente:
                existente.nome = registro.nome
                existente.perfil = registro.perfil
                existente.ativo = registro.ativo if registro.ativo is not None else existente.ativo
                atualizados_count += 1
            else:
                novo_usuario = Usuario(
                    nome=registro.nome,
                    email=registro.email,
                    perfil=registro.perfil,
                    senha=senha_padrao_hash,
                    ativo=registro.ativo if registro.ativo is not None else True
                )
                db.add(novo_usuario)
                inseridos_count += 1
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Erro ao processar o usuário {registro.email}: {e}")
    db.commit()
    return {"mensagem": f"Importação concluída. Inseridos: {inseridos_count}, Atualizados: {atualizados_count}."}


@router.put("/{usuario_id}", response_model=UsuarioResponse)
def atualizar_usuario(usuario_id: int, usuario_update: UsuarioUpdate, db: Session = Depends(get_db)):
    db_usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not db_usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado.")

    # Pega os dados do update, excluindo os que não foram enviados
    update_data = usuario_update.model_dump(exclude_unset=True)

    # Trata a senha separadamente
    if "senha" in update_data and update_data["senha"]:
        # Se uma nova senha foi enviada, criptografa e atualiza
        senha_hash = bcrypt.hashpw(update_data["senha"].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        db_usuario.senha = senha_hash
        del update_data["senha"] # Remove para não tentar atribuir novamente no loop

    # Atualiza os outros campos
    for key, value in update_data.items():
        setattr(db_usuario, key, value)

    try:
        db.commit()
        db.refresh(db_usuario)
        return db_usuario
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email já existe em outro registro.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar usuário: {e}")
