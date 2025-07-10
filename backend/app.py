# app.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os
from dotenv import load_dotenv

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
    dashboard_controller
)

app = FastAPI(
    title="Talatto ERP API",
    description="API para o sistema de gestão integrada Talatto.",
    version="1.0.0"
)

# --- Middlewares ---
app.add_middleware(GZipMiddleware, minimum_size=500)

# Configuração de CORS para permitir a comunicação com o frontend
origins_str = os.getenv("FRONTEND_URLS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in origins_str.split(',')]

print(f"INFO: Origens CORS permitidas: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Inclusão das Rotas dos Controladores ---
app.include_router(auth_controller.router, prefix="/auth", tags=["auth"])
app.include_router(dashboard_controller.router) 
app.include_router(cnpj_controller.router)
app.include_router(cadastros_controller.router)
app.include_router(produtos_controller.router)
app.include_router(opcao_controller.router)
app.include_router(orcamento_controller.router)
app.include_router(pedidos_controller.router)
app.include_router(nfe_controller.router)
app.include_router(contas_controller.router)

@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Bem-vindo à API do ERP Talatto!"}
