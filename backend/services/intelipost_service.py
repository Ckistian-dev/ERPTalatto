# services/intelipost_service.py

import os
import httpx
import json
import traceback
import asyncio
import math
import mysql.connector.pooling
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any, List
from datetime import datetime

from models.intelipost_model import IntelipostConfiguracao

# --- Pool de conexão MySQL ---
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
    if not formula:
        return 0.0
    
    valores = []
    operadores = []
    precedencia = {'+': 1, '-': 1, '*': 2, '/': 2}
    
    def aplicar_operador():
        op = operadores.pop()
        right = valores.pop()
        left = valores.pop()
        if op == '+': valores.append(left + right)
        elif op == '-': valores.append(left - right)
        elif op == '*': valores.append(left * right)
        elif op == '/': valores.append(left / right if right != 0 else 0)

    for comp in formula:
        tipo = comp['tipo']
        valor = comp['valor']

        if tipo == 'numero':
            valores.append(float(valor))
        elif tipo == 'variavel':
            if valor not in contexto:
                raise ValueError(f"Variável desconhecida na fórmula: {valor}")
            valores.append(float(contexto[valor]))
        elif tipo == 'operador':
            while (operadores and operadores[-1] in precedencia and precedencia.get(operadores[-1], 0) >= precedencia.get(valor, 0)):
                aplicar_operador()
            operadores.append(valor)

    while operadores:
        aplicar_operador()

    return round(valores[0], 4) if valores else 0.0

def _avaliar_condicao(condicao: str, valor_regra: Any, valor_real: int) -> bool:
    if condicao == "SEMPRE": return True
    if valor_regra is None: return False
    try:
        if condicao == "IGUAL_A": return valor_real == float(valor_regra)
        if condicao == "MAIOR_QUE": return valor_real > float(valor_regra)
        if condicao == "MAIOR_IGUAL_A": return valor_real >= float(valor_regra)
        if condicao == "MENOR_QUE": return valor_real < float(valor_regra)
        if condicao == "MENOR_IGUAL_A": return valor_real <= float(valor_regra)
        if condicao == "ENTRE":
            v1, v2 = map(float, str(valor_regra).split(','))
            return v1 <= valor_real <= v2
    except (ValueError, IndexError): return False
    return False

class IntelipostService:
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
            cursor.execute("SELECT * FROM orcamentos WHERE id = %s", (orcamento_id,))
            orcamento = cursor.fetchone()
            if not orcamento:
                raise HTTPException(status_code=404, detail=f"Orçamento com ID {orcamento_id} não encontrado.")

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
        """Lógica de cálculo de volumes para um único item, agora com o novo motor de regras."""
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

            unidade_caixa = int(produto_data.get('unidade_caixa') or 0)
            peso_embalagem_g = float(produto_data.get('peso_embalagem') or 0)
            altura_embalagem_cm = float(produto_data.get('altura_embalagem') or 0)
            largura_embalagem_cm = float(produto_data.get('largura_embalagem') or 0)
            comprimento_embalagem_cm = float(produto_data.get('comprimento_embalagem') or 0)

            if not all([unidade_caixa, peso_embalagem_g, altura_embalagem_cm, largura_embalagem_cm, comprimento_embalagem_cm]):
                raise HTTPException(status_code=400, detail=f"Produto ID {produto_id} com dados de embalagem padrão incompletos.")
            if unidade_caixa <= 0:
                raise HTTPException(status_code=400, detail=f"A 'unidade_caixa' do produto ID {produto_id} deve ser maior que zero.")

            # ####################################################################
            # INÍCIO DA CORREÇÃO: LÓGICA DE BUSCA DE PREÇO RESTAURADA
            # ####################################################################
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
                    print(f"Aviso: O campo 'valor' na tabela de preços para o produto ID {produto_id} não é um número válido: {first_price_entry.get('valor')}")
                    valor_unitario = 0.0
            # ####################################################################
            # FIM DA CORREÇÃO
            # ####################################################################

            volumes_finais = []
            volumes_cheios = quantidade // unidade_caixa
            quantidade_restante = quantidade % unidade_caixa
            peso_caixa_kg = peso_embalagem_g / 1000.0

            for _ in range(volumes_cheios):
                volumes_finais.append({
                    "weight": peso_caixa_kg, "cost_of_goods": round(valor_unitario * unidade_caixa, 2),
                    "width": largura_embalagem_cm, "height": altura_embalagem_cm,
                    "length": comprimento_embalagem_cm, "volume_type": "BOX",
                    "products_quantity": unidade_caixa,
                })
            
            if quantidade_restante > 0:
                regras_json = produto_data.get('regras')
                regras = json.loads(regras_json) if isinstance(regras_json, str) else regras_json
                
                peso_proporcional_kg = (peso_caixa_kg / unidade_caixa) * quantidade_restante
                altura_proporcional_cm = (altura_embalagem_cm / unidade_caixa) * quantidade_restante
                largura_proporcional_cm = (largura_embalagem_cm / unidade_caixa) * quantidade_restante
                comprimento_proporcional_cm = (comprimento_embalagem_cm / unidade_caixa) * quantidade_restante

                contexto = {
                    "QTD_RESTANTE": float(quantidade_restante), "QTD_EMBALAGEM": float(unidade_caixa),
                    "PESO_EMBALAGEM": float(peso_caixa_kg), "ALTURA_EMBALAGEM": float(altura_embalagem_cm),
                    "LARGURA_EMBALAGEM": float(largura_embalagem_cm), "COMPRIMENTO_EMBALAGEM": float(comprimento_embalagem_cm),
                    "PESO_PROPORCIONAL": float(peso_proporcional_kg), "ALTURA_PROPORCIONAL": float(altura_proporcional_cm),
                    "LARGURA_PROPORCIONAL": float(largura_proporcional_cm), "COMPRIMENTO_PROPORCIONAL": float(comprimento_proporcional_cm),
                    "ACRESCIMO_EMBALAGEM": 2.0
                }

                regra_aplicada = None
                if regras:
                    regras_sorted = sorted(regras, key=lambda r: r.get('prioridade', 0), reverse=True)
                    for regra in regras_sorted:
                        if _avaliar_condicao(regra.get('condicao_gatilho'), regra.get('valor_gatilho'), quantidade_restante):
                            regra_aplicada = regra
                            break
                
                altura_p, largura_p, comp_p, peso_p = contexto["ALTURA_EMBALAGEM"], contexto["LARGURA_EMBALAGEM"], contexto["COMPRIMENTO_EMBALAGEM"], contexto["PESO_PROPORCIONAL"]
                
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

    # --- NOVOS MÉTODOS PARA DESPACHO ---
    async def create_shipment_order(self, erp_order_id: int) -> Dict[str, Any]:
        """
        Cria um pedido de envio na Intelipost com base em um pedido do ERP.
        """
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            # 1. Buscar dados do pedido e do cliente
            cursor.execute("SELECT p.*, c.nome_razao, c.fantasia, c.cpf_cnpj, c.email, c.telefone, c.cep, c.rua, c.numero, c.bairro, c.cidade, c.estado FROM pedidos p JOIN cadastros c ON p.cliente_id = c.id WHERE p.id = %s", (erp_order_id,))
            pedido = cursor.fetchone()
            if not pedido:
                raise HTTPException(status_code=404, detail="Pedido do ERP não encontrado.")

            # 2. Calcular os volumes
            lista_itens = json.loads(pedido['lista_itens'])
            tasks = [self._calculate_volumes_for_item(item['produto_id'], item['quantidade_itens']) for item in lista_itens]
            results = await asyncio.gather(*tasks)
            all_volumes = [volume for sublist in results for volume in sublist]
            if not all_volumes:
                raise HTTPException(status_code=400, detail="Não foi possível calcular os volumes para o despacho.")

            # 3. Montar o payload para a Intelipost
            payload = {
                "order_number": str(pedido['id']),
                "end_customer": {
                    "first_name": pedido['nome_razao'].split()[0],
                    "last_name": ' '.join(pedido['nome_razao'].split()[1:]) if ' ' in pedido['nome_razao'] else "N/A",
                    "email": pedido['email'],
                    "phone": pedido['telefone'],
                    "cellphone": pedido['telefone'],
                    "is_company": len(pedido['cpf_cnpj']) > 11,
                    "federal_tax_payer_id": pedido['cpf_cnpj'],
                    "shipping_address": pedido['rua'],
                    "shipping_number": pedido['numero'],
                    "shipping_quarter": pedido['bairro'],
                    "shipping_city": pedido['cidade'],
                    "shipping_state_code": pedido['estado'],
                    "shipping_zip_code": pedido['cep'],
                    "shipping_country": "BR"
                },
                "volumes": all_volumes,
                "shipment_order_type": "ECOMMERCE",
                "delivery_method_id": 4, # Exemplo: 4 para Correios PAC
                "created": datetime.now().isoformat()
            }

            # 4. Enviar para a Intelipost
            response = await self.client.post('/shipment_order', json=payload)
            response.raise_for_status()
            
            # 5. Atualizar o pedido no ERP
            intelipost_data = response.json()
            intelipost_order_number = intelipost_data['content']['order_number']
            intelipost_status = intelipost_data['content']['status']

            cursor.execute("UPDATE pedidos SET intelipost_order_number = %s, intelipost_shipment_status = %s WHERE id = %s", (intelipost_order_number, intelipost_status, erp_order_id))
            conn.commit()

            return intelipost_data

        finally:
            cursor.close()
            conn.close()

    async def get_shipment_order_details(self, intelipost_order_number: str) -> Dict[str, Any]:
        """Consulta os detalhes de um pedido de envio na Intelipost."""
        try:
            response = await self.client.get(f'/shipment_order/{intelipost_order_number}')
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=e.response.json())