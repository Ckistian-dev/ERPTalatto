from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware  # ✅ importe aqui

from controllers import auth_controller, cnpj_controller, opcao_controller, cadastros_controller, produtos_controller, orcamento_controller, pedidos_controller, nfe_controller, contas_controller

app = FastAPI()

# ✅ Adicione GZip para comprimir respostas grandes
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rotas
app.include_router(auth_controller.router, prefix="/auth", tags=["auth"])
app.include_router(cnpj_controller.router)
app.include_router(cadastros_controller.router)
app.include_router(produtos_controller.router)
app.include_router(opcao_controller.router)
app.include_router(orcamento_controller.router)
app.include_router(pedidos_controller.router)
app.include_router(nfe_controller.router)
app.include_router(contas_controller.router)