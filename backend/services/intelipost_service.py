# services/intelipost_service.py

import os
import httpx
import json
import traceback
import asyncio
import mysql.connector.pooling
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any, List

from models.intelipost_model import IntelipostConfiguracao

# --- Pool de conexão MySQL (adaptado de seus outros controllers) ---
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="intelipost_pool",
    pool_size=5,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

def _executar_formula(formula: List[Dict[str, Any]], contexto: Dict[str, float]) -> float:
    """Função auxiliar para executar as fórmulas de cálculo de dimensão/peso."""
    if not formula: return 0.0
    stack = []
    for comp in formula:
        if comp['tipo'] == 'variavel':
            if comp['valor'] not in contexto: raise ValueError(f"Variável desconhecida na fórmula: {comp['valor']}")
            stack.append(float(contexto[comp['valor']]))
        else:
            stack.append(float(comp['valor']))
            
    try:
        resultado = stack[0]
        i = 1
        while i < len(stack):
            operador, proximo_numero = stack[i], stack[i+1]
            if operador == '+': resultado += proximo_numero
            elif operador == '-': resultado -= proximo_numero
            elif operador == '*': resultado *= proximo_numero
            elif operador == '/': resultado /= proximo_numero if proximo_numero != 0 else 1
            i += 2
        return round(resultado, 4)
    except (IndexError, TypeError):
        raise ValueError("Fórmula de embalagem mal formatada.")

class IntelipostService:
    """
    Encapsula toda a lógica de comunicação com a API da Intelipost.
    """
    def __init__(self, db: Session):
        self.db = db
        self.base_url = "https://api.intelipost.com.br/api/v1"
        
        config = self.db.query(IntelipostConfiguracao).filter(IntelipostConfiguracao.id == 1).first()

        if not config or not config.api_key or not config.origin_zip_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="A api-key ou o CEP de Origem da Intelipost não estão configurados no sistema."
            )
        
        self.api_key = config.api_key
        self.origin_zip_code = config.origin_zip_code
        
        self.headers = {
            'api-key': self.api_key,
            'Content-Type': 'application/json',
            'platform': 'SeuSistemaERP',
            'platform-version': '1.0.0'
        }
        
        self.client = httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0)

    def _get_orcamento_data(self, orcamento_id: int) -> Dict[str, Any]:
        """Busca os dados de um orçamento e o CEP do cliente associado."""
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # Busca o orçamento
            cursor.execute("SELECT * FROM orcamentos WHERE id = %s", (orcamento_id,))
            orcamento = cursor.fetchone()
            if not orcamento:
                raise HTTPException(status_code=404, detail=f"Orçamento com ID {orcamento_id} não encontrado.")

            # Busca o CEP do cliente do orçamento
            cursor.execute("SELECT cep FROM cadastros WHERE id = %s", (orcamento['cliente_id'],))
            cliente = cursor.fetchone()
            if not cliente or not cliente.get('cep'):
                 raise HTTPException(status_code=404, detail=f"Cliente com ID {orcamento['cliente_id']} ou seu CEP não foram encontrados.")

            orcamento['destination_zip_code'] = cliente['cep']
            return orcamento
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
            
    async def _calculate_volumes_for_item(self, produto_id: int, quantidade: int) -> List[Dict[str, Any]]:
        """Lógica de cálculo de volumes para um único item."""
        if quantidade <= 0:
            raise ValueError("A quantidade do item deve ser maior que zero.")

        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            query = """
                SELECT 
                    p.unidade_caixa, p.peso_embalagem, p.altura_embalagem,
                    p.largura_embalagem, p.comprimento_embalagem,
                    p.tabela_precos, e.regras
                FROM produtos p
                LEFT JOIN embalagem e ON p.id_logica_embalagem = e.id
                WHERE p.id = %s
            """
            cursor.execute(query, (produto_id,))
            produto_data = cursor.fetchone()

            if not produto_data:
                raise HTTPException(status_code=404, detail=f"Produto com ID {produto_id} não encontrado.")

            if not all(k in produto_data and produto_data[k] is not None for k in ['unidade_caixa', 'peso_embalagem', 'altura_embalagem', 'largura_embalagem', 'comprimento_embalagem']) or produto_data['unidade_caixa'] <= 0:
                raise HTTPException(status_code=400, detail=f"Produto ID {produto_id} com dados de embalagem padrão incompletos ou inválidos.")
            
            tabela_precos_raw = produto_data.get('tabela_precos')
            tabela_precos = json.loads(tabela_precos_raw) if isinstance(tabela_precos_raw, str) else tabela_precos_raw
            valor_unitario = 0.0
            first_price_entry = None

            if isinstance(tabela_precos, list) and len(tabela_precos) > 0:
                first_price_entry = tabela_precos[0]
            elif isinstance(tabela_precos, dict) and len(tabela_precos) > 0:
                first_price_entry = next(iter(tabela_precos.values()), None)

            if first_price_entry and isinstance(first_price_entry, dict) and 'valor' in first_price_entry:
                try:
                    valor_unitario = float(first_price_entry['valor'])
                except (ValueError, TypeError):
                    print(f"Aviso: O campo 'valor' na tabela de preços para o produto ID {produto_id} não é um número válido: {first_price_entry['valor']}")
                    valor_unitario = 0.0

            volumes_finais = []
            unidade_caixa = int(produto_data['unidade_caixa'])
            peso_caixa_kg = float(produto_data['peso_embalagem']) / 1000.0
            volumes_cheios = quantidade // unidade_caixa
            quantidade_restante = quantidade % unidade_caixa

            for _ in range(volumes_cheios):
                volumes_finais.append({
                    "weight": peso_caixa_kg, "cost_of_goods": round(valor_unitario * unidade_caixa, 2),
                    "width": float(produto_data['largura_embalagem']), "height": float(produto_data['altura_embalagem']),
                    "length": float(produto_data['comprimento_embalagem']), "volume_type": "BOX",
                    "products_quantity": unidade_caixa,
                })
            
            if quantidade_restante > 0:
                regras_json = produto_data.get('regras')
                regras = json.loads(regras_json) if isinstance(regras_json, str) else regras_json
                regra_aplicada = None
                if regras:
                    regras_sorted = sorted(regras, key=lambda r: r.get('prioridade', 0))
                    for regra in regras_sorted:
                        if regra.get('condicao_gatilho') == 'SEMPRE':
                            regra_aplicada = regra
                            break
                
                peso_proporcional = (peso_caixa_kg / unidade_caixa) * quantidade_restante
                contexto = {
                    "QTD_RESTANTE": quantidade_restante, "QTD_POR_EMBALAGEM": unidade_caixa,
                    "PESO_PROPORCIONAL": peso_proporcional, "ALTURA_BASE": float(produto_data['altura_embalagem']),
                    "LARGURA_BASE": float(produto_data['largura_embalagem']), "COMPRIMENTO_BASE": float(produto_data['comprimento_embalagem'])
                }
                altura_p, largura_p, comp_p, peso_p = (contexto["ALTURA_BASE"] / unidade_caixa) * quantidade_restante, contexto["LARGURA_BASE"], contexto["COMPRIMENTO_BASE"], peso_proporcional

                if regra_aplicada:
                    try:
                        if regra_aplicada.get('formula_altura'): altura_p = _executar_formula(regra_aplicada['formula_altura'], contexto)
                        if regra_aplicada.get('formula_largura'): largura_p = _executar_formula(regra_aplicada['formula_largura'], contexto)
                        if regra_aplicada.get('formula_comprimento'): comp_p = _executar_formula(regra_aplicada['formula_comprimento'], contexto)
                        if regra_aplicada.get('formula_peso'): peso_p = _executar_formula(regra_aplicada['formula_peso'], contexto)
                    except ValueError as e:
                        raise HTTPException(status_code=400, detail=f"Erro ao processar fórmula da lógica de embalagem: {e}")

                volumes_finais.append({
                    "weight": round(peso_p, 3), "cost_of_goods": round(valor_unitario * quantidade_restante, 2),
                    "width": round(largura_p, 2), "height": round(altura_p, 2),
                    "length": round(comp_p, 2), "volume_type": "BOX",
                    "products_quantity": quantidade_restante,
                })
            
            return volumes_finais
        finally:
            if cursor: cursor.close()
            if conn: conn.close()

    async def get_quote_for_orcamento(self, orcamento_id: int) -> Dict[str, Any]:
        """
        Busca um orçamento, calcula os volumes e retorna tanto os volumes
        quanto a resposta da cotação da Intelipost.
        """
        try:
            orcamento = self._get_orcamento_data(orcamento_id)
            lista_itens = json.loads(orcamento['lista_itens']) if isinstance(orcamento['lista_itens'], str) else orcamento['lista_itens']

            if not lista_itens:
                raise HTTPException(status_code=400, detail="Orçamento não contém itens para cotação.")

            tasks = [self._calculate_volumes_for_item(item['produto_id'], item['quantidade_itens']) for item in lista_itens]
            results = await asyncio.gather(*tasks)
            all_volumes = [volume for sublist in results for volume in sublist]

            if not all_volumes:
                raise HTTPException(status_code=400, detail="Não foi possível calcular os volumes para a cotação.")

            quote_payload = {
                "origin_zip_code": self.origin_zip_code,
                "destination_zip_code": ''.join(filter(str.isdigit, orcamento['destination_zip_code'])),
                "volumes": all_volumes
            }

            response = await self.client.post('/quote', json=quote_payload)
            response.raise_for_status()
            
            return {
                "volumes": all_volumes,
                "cotacao": response.json()
            }

        except httpx.HTTPStatusError as e:
            error_details = e.response.json()
            raise HTTPException(
                status_code=e.response.status_code,
                detail=error_details.get("messages", "Erro na comunicação com a API da Intelipost.")
            )
        except (ValueError, HTTPException) as e:
            raise e
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro inesperado no serviço Intelipost: {str(e)}")

    # --- NOVO MÉTODO ADICIONADO ---
    async def get_quote_for_items(self, items: List[Dict], destination_zip_code: str) -> Dict[str, Any]:
        """
        Calcula volumes para uma lista de itens e um CEP, e retorna a cotação.
        """
        try:
            if not items:
                raise HTTPException(status_code=400, detail="A lista de itens não pode estar vazia.")

            tasks = [self._calculate_volumes_for_item(item['produto_id'], item['quantidade_itens']) for item in items]
            results = await asyncio.gather(*tasks)
            all_volumes = [volume for sublist in results for volume in sublist]

            if not all_volumes:
                raise HTTPException(status_code=400, detail="Não foi possível calcular os volumes para a cotação.")

            quote_payload = {
                "origin_zip_code": self.origin_zip_code,
                "destination_zip_code": ''.join(filter(str.isdigit, destination_zip_code)),
                "volumes": all_volumes
            }

            response = await self.client.post('/quote', json=quote_payload)
            response.raise_for_status()
            
            return {
                "volumes": all_volumes,
                "cotacao": response.json()
            }
        except (ValueError, HTTPException) as e:
            raise e
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Erro inesperado ao cotar itens: {str(e)}")
    # --- FIM DO NOVO MÉTODO ---

    async def get_shipment_status(self, order_number: str) -> Dict[str, Any]:
        """Consulta o status de um pedido na Intelipost."""
        print(f"Método get_shipment_status chamado para o pedido {order_number}, mas ainda não implementado.")
        return {"message": "Funcionalidade de rastreamento a ser implementada."}
