# controllers/cnpj_controller.py

from fastapi import APIRouter, HTTPException
import requests
import re
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api") # Adicionei o prefixo /api aqui para consistência

# --- Endpoint de consulta de dados cadastrais (mantido) ---
@router.get("/consulta/cnpj/{cnpj}")
def consultar_cnpj(cnpj: str):
    """Consulta dados de um CNPJ na API da ReceitaWS."""
    cnpj_limpo = re.sub(r'\D', '', cnpj)
    url = f"https://receitaws.com.br/v1/cnpj/{cnpj_limpo}"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Erro ao conectar com o serviço de CNPJ: {e}")


@router.get("/consulta/ie")
def consultar_inscricao_estadual(documento: str, uf: str):
    """
    Consulta a Inscrição Estadual (IE) de um documento para uma UF específica,
    utilizando a API pública CNPJ.ws.
    """
    doc_limpo = re.sub(r'\D', '', documento)
    uf_upper = uf.upper()
    print(f"--- [LOG] Iniciando consulta de IE com CNPJ.ws para: {doc_limpo}, UF: {uf_upper} ---")

    # Esta API não suporta consulta por CPF para IE
    if len(doc_limpo) == 11:
         raise HTTPException(
             status_code=501, 
             detail="A consulta de IE por CPF não é suportada por esta API pública."
        )
    if len(doc_limpo) != 14:
        raise HTTPException(status_code=400, detail="A consulta de IE só é válida para CNPJ.")
    
    # URL da nova API
    url = f"https://cnpj.ws/cnpj/{doc_limpo}"
    print(f"[LOG] Chamando API externa: {url}")

    try:
        response = requests.get(url, timeout=15)
        print(f"[LOG] Resposta da CNPJ.ws com Status Code: {response.status_code}")

        if response.status_code == 404:
            return {"situacao_cadastral": "Não Contribuinte"}
        
        response.raise_for_status()
        data = response.json()

        # A resposta da CNPJ.ws é mais complexa. Precisamos procurar a IE para a UF correta.
        estabelecimentos = data.get("estabelecimentos", [])
        for est in estabelecimentos:
            if est.get("uf") == uf_upper:
                inscricoes_estaduais = est.get("inscricoes_estaduais", [])
                for ie_info in inscricoes_estaduais:
                    if ie_info.get("ativo") is True:
                        print(f"[LOG] Encontrada IE ativa para {uf_upper}: {ie_info.get('inscricao_estadual')}")
                        return {
                            "situacao_cadastral": "Habilitado",
                            "inscricao_estadual": ie_info.get("inscricao_estadual")
                        }
        
        # Se o loop terminar e não encontrar nenhuma IE ativa para a UF especificada
        print(f"[LOG] Nenhuma IE ativa encontrada para a UF {uf_upper} neste CNPJ.")
        return {
            "situacao_cadastral": "Não Contribuinte ou Isento",
            "inscricao_estadual": "ISENTO"
        }

    except requests.exceptions.HTTPError as e:
        print(f"[LOG] ERRO HTTP da API externa: {e.response.status_code} - {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Erro na API externa (CNPJ.ws): {e.response.text}")
    except requests.exceptions.RequestException as e:
        print(f"[LOG] ERRO de Conexão com a API externa: {e}")
        raise HTTPException(status_code=503, detail=f"Erro de comunicação com o serviço de consulta: {e}")