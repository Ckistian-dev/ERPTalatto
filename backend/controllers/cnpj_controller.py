# controllers/cnpj_controller.py
from fastapi import APIRouter
import requests

router = APIRouter()

@router.get("/consulta/cnpj/{cnpj}")
def consultar_cnpj(cnpj: str):
    url = f"https://receitaws.com.br/v1/cnpj/{cnpj}"
    headers = {"User-Agent": "ERP-Talatto"}
    try:
        response = requests.get(url, headers=headers)
        return response.json()
    except:
        return {"erro": "Erro na consulta"}
