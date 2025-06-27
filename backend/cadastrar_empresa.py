import os
import requests
from dotenv import load_dotenv

# Carregar variáveis do .env
load_dotenv()

# 🔧 Configurações iniciais
TOKEN = os.getenv("PLUGNOTAS_TOKEN") or "2da392a6-79d2-4304-a8b7-959572c7e44d"
CNPJ = os.getenv("EMIT_CNPJ") or "29987353000109"
RAZAO = os.getenv("EMIT_RAZAO") or "Talatto Indústria"
FANTASIA = os.getenv("EMIT_FANTASIA") or "Talatto Indústria"

print("🔑 TOKEN de autenticação:", TOKEN)
print("📦 Dados da empresa a serem enviados:")

payload = {
    "cpfCnpj": CNPJ,
    "inscricaoMunicipal": "123456",
    "inscricaoEstadual": "1234567890",
    "razaoSocial": RAZAO,
    "nomeFantasia": FANTASIA,
    "simplesNacional": True,
    "regimeTributario": 1,
    "incentivoFiscal": False,
    "incentivadorCultural": False,
    "regimeTributarioEspecial": 1,
    "email": "contato@talatto.com.br",
    "endereco": {
        "logradouro": "Rua Industrial",
        "numero": "100",
        "bairro": "Distrito",
        "municipio": "Toledo",
        "uf": "PR",
        "estado": "PR",
        "cep": "85900000",
        "codigoCidade": "4127700"
    },
    "telefone": {
        "numero": "45999999999"
    },
    "nfse": {},
    "nfe": {},
    "nfce": {},
    "mdfe": {},
    "cfe": {},
    "nfcom": {}
}

print("📤 Payload JSON:")
print(payload)

headers = {
    "Content-Type": "application/json",
    "X-API-KEY": TOKEN
}

url = "https://api.sandbox.plugnotas.com.br/empresa"
print(f"🌐 Enviando requisição para: {url}")

try:
    response = requests.post(url, headers=headers, json=payload)
    print("📥 Resposta da PlugNotas:")
    print("Status code:", response.status_code)
    print("Conteúdo:", response.text)

    if response.status_code == 201:
        print("✅ Empresa cadastrada com sucesso!")
    else:
        print("❌ Erro ao cadastrar empresa.")
except Exception as e:
    print("❌ Erro inesperado:", str(e))
