from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
from dotenv import load_dotenv
import urllib3

# IMPORTAÇÕES DO SLOWAPI E DO NOSSO ARQUIVO DE LIMITER
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from core.limiter import limiter

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ✅ CORREÇÃO: Especifica a codificação UTF-8 para ler o arquivo .env
load_dotenv()

# --- Importação dos Controladores ---
from controllers import (
    auth_controller, 
    cnpj_controller, 
    opcao_controller, 
    cadastros_controller, 
    produtos_controller, 
    orcamento_controller, 
    pedidos_controller, 
    nfe_controller, 
    contas_controller,
    dashboard_controller,
    estoque_controller,
    empresa_controller,
    regras_controller,
    embalagem_controller
)

app = FastAPI(
    title="Talatto ERP API",
    description="API para o sistema de gestão integrada Talatto.",
    version="1.0.0"
)

# Configuração do estado e do handler usando o limiter importado
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# --- Middlewares ---
app.add_middleware(GZipMiddleware, minimum_size=500)

origins_str = os.getenv("FRONTEND_URLS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in origins_str.split(',')]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusão das Rotas dos Controladores ---
app.include_router(auth_controller.router, prefix="/auth", tags=["auth"])
app.include_router(empresa_controller.router, prefix="/api")
app.include_router(regras_controller.router, prefix="/api")
app.include_router(embalagem_controller.router) 
app.include_router(dashboard_controller.router) 
app.include_router(cnpj_controller.router)
app.include_router(cadastros_controller.router)
app.include_router(produtos_controller.router)
app.include_router(opcao_controller.router)
app.include_router(orcamento_controller.router)
app.include_router(pedidos_controller.router)
app.include_router(nfe_controller.router)
app.include_router(contas_controller.router)
app.include_router(estoque_controller.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Bem-vindo à API do ERP Talatto!"}
