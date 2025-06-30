from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
import os # Importe o módulo os para acessar variáveis de ambiente

from controllers import auth_controller, cnpj_controller, opcao_controller, cadastros_controller, produtos_controller, orcamento_controller, pedidos_controller, nfe_controller, contas_controller

app = FastAPI()

# ✅ Adicione GZip para comprimir respostas grandes
app.add_middleware(GZipMiddleware, minimum_size=500)

# --- Configuração CORS ---
allowed_origins_str = os.environ.get("FRONTEND_URLS", "https://erp-talatto.vercel.app,https://erptalatto-production.up.railway.app") # ✅ Adicionada a URL do Railway
# Se houver múltiplas URLs, elas devem ser separadas por vírgula no .env ou no Railway.
# split(',') as transforma em uma lista.
allowed_origins = [origin.strip() for origin in allowed_origins_str.split(',')]

# Se você deseja permitir *TODAS* as origens (APENAS PARA FINS DE DESENVOLVIMENTO/TESTE INICIAL, CUIDADO EM PRODUÇÃO!)
# Descomente a linha abaixo e comente as linhas acima de `allowed_origins_str` e `allowed_origins`
# allowed_origins = ["*"]

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=allowed_origins, # Usando a lista de origens obtida das variáveis de ambiente
#     allow_credentials=True,        # Permite cookies, headers de autorização (Bearer Token), etc.
#     allow_methods=["*"],           # Permite todos os métodos (GET, POST, PUT, DELETE, OPTIONS)
#     allow_headers=["*"],           # Permite todos os headers (incluindo Content-Type, Authorization, etc.)
# )

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
