import os
from fastapi import APIRouter, HTTPException
from datetime import date, timedelta, datetime
import mysql.connector.pooling
from dotenv import load_dotenv
import json
from collections import defaultdict

# Carrega as variáveis de ambiente
load_dotenv()

# --- Pool de Conexão com o Banco de Dados ---
try:
    pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="dashboard_pool_v10", # Versão final e correta
        pool_size=20,
        pool_reset_session=True,
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=int(os.getenv("DB_PORT"))
    )
except mysql.connector.Error as err:
    raise RuntimeError(f"Não foi possível conectar ao banco de dados: {err}")

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard V10 Final"]
)

def get_db_connection():
    try:
        return pool.get_connection()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=503, detail=f"Serviço de banco de dados indisponível: {err}")

def execute_query(conn, query, params=None):
    """Executa uma query de forma segura, retornando lista vazia em caso de erro."""
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        return result
    except mysql.connector.Error as err:
        # Log do erro no terminal do backend para facilitar a depuração
        print(f"Erro na Query: {query[:150]}... | Erro: {err}") 
        return []
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()

# --- ENDPOINTS COM LÓGICA FINAL ---

@router.get("/kpis-gerais")
async def get_kpis_gerais():
    conn = get_db_connection()
    try:
        data_inicio_30d = date.today() - timedelta(days=30)
        
        pedidos_recentes = execute_query(conn, 
            "SELECT total_com_desconto, lista_itens FROM pedidos WHERE STR_TO_DATE(data_emissao, '%%d/%%m/%%Y') >= %s",
            (data_inicio_30d,)
        )
        
        faturamento_30d = sum(float(p['total_com_desconto'] or 0) for p in pedidos_recentes)

        produtos = execute_query(conn, "SELECT id, custo_produto FROM produtos")
        mapa_custos = {p['id']: float(p.get('custo_produto', 0) or 0) for p in produtos}
        
        custo_total_30d = 0
        for pedido in pedidos_recentes:
            if pedido.get('lista_itens'):
                try:
                    itens = json.loads(pedido['lista_itens'])
                    for item in itens:
                        custo = mapa_custos.get(item.get('produto_id'), 0)
                        qtd = item.get('quantidade_itens', 1)
                        custo_total_30d += custo * qtd
                except (json.JSONDecodeError, TypeError): continue
        
        lucratividade_bruta_30d = faturamento_30d - custo_total_30d
        ticket_medio = faturamento_30d / len(pedidos_recentes) if pedidos_recentes else 0
        
        orcamentos = execute_query(conn, "SELECT id FROM orcamentos WHERE STR_TO_DATE(data_emissao, '%%d/%%m/%%Y') >= %s", (data_inicio_30d,))
        taxa_conversao = (len(pedidos_recentes) / len(orcamentos)) * 100 if orcamentos else 0

        primeiros_pedidos = execute_query(conn, """
            WITH first_orders AS (SELECT cliente_id, MIN(STR_TO_DATE(data_emissao, '%%d/%%m/%%Y')) as first_order_date FROM pedidos GROUP BY cliente_id)
            SELECT cliente_id FROM first_orders WHERE first_order_date >= %s
        """, (data_inicio_30d,))
        novos_clientes_30d = len(primeiros_pedidos)

        contas_vencidas_res = execute_query(conn, 
            "SELECT SUM(valor_conta) as total FROM contas WHERE tipo_conta = 'A Receber' AND situacao_conta IN ('Em Aberto', 'Pendente') AND STR_TO_DATE(data_vencimento, '%%d/%%m/%%Y') < CURDATE()"
        )
        contas_vencidas = float(contas_vencidas_res[0]['total'] or 0) if contas_vencidas_res else 0

        return {
            "faturamento30d": faturamento_30d, "lucratividadeBruta30d": lucratividade_bruta_30d,
            "ticketMedio": ticket_medio, "novosClientes30d": novos_clientes_30d,
            "contasVencidas": contas_vencidas, "taxaConversao": taxa_conversao
        }
    finally:
        if conn: conn.close()

@router.get("/analise-vendas")
async def get_analise_vendas():
    conn = get_db_connection()
    try:
        pedidos_evolucao = execute_query(conn, """
            SELECT 
                DATE_FORMAT(STR_TO_DATE(data_emissao, '%%d/%%m/%%Y'), '%%Y-%%m') as mes,
                total_com_desconto,
                lista_itens
            FROM pedidos WHERE STR_TO_DATE(data_emissao, '%%d/%%m/%%Y') >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        """)
        
        produtos = execute_query(conn, "SELECT id, custo_produto FROM produtos")
        mapa_custos = {p['id']: float(p.get('custo_produto', 0) or 0) for p in produtos}
        
        evolucao_data = defaultdict(lambda: {"faturamento": 0, "custo": 0})
        for pedido in pedidos_evolucao:
            mes = pedido['mes']
            if not mes: continue
            evolucao_data[mes]['faturamento'] += float(pedido.get('total_com_desconto') or 0)
            if pedido.get('lista_itens'):
                try:
                    itens = json.loads(pedido['lista_itens'])
                    for item in itens:
                        custo = mapa_custos.get(item.get('produto_id'), 0)
                        qtd = item.get('quantidade_itens', 1)
                        evolucao_data[mes]['custo'] += custo * qtd
                except (json.JSONDecodeError, TypeError): continue
        
        evolucao_final = [{"mes": k, "faturamento": v['faturamento'], "custo": v['custo']} for k,v in evolucao_data.items()]
        
        todos_pedidos = execute_query(conn, "SELECT cliente_id, total_com_desconto, data_emissao FROM pedidos")
        total_faturamento_pedidos = sum(float(p['total_com_desconto'] or 0) for p in todos_pedidos)
        unique_clientes = {p['cliente_id'] for p in todos_pedidos}
        total_clientes = len(unique_clientes)
        ltv_medio = total_faturamento_pedidos / total_clientes if total_clientes > 0 else 0
        
        pedidos_por_cliente = defaultdict(list)
        for p in todos_pedidos:
            try: pedidos_por_cliente[p['cliente_id']].append(datetime.strptime(p['data_emissao'], '%d/%m/%Y').date())
            except (ValueError, TypeError): continue

        clientes_ativos_90d = 0
        data_limite_90d = date.today() - timedelta(days=90)
        for datas in pedidos_por_cliente.values():
            if datas and max(datas) >= data_limite_90d: clientes_ativos_90d += 1
        
        churn_rate_90d = ((total_clientes - clientes_ativos_90d) / total_clientes) * 100 if total_clientes > 0 else 0
        
        # ## INÍCIO DA CORREÇÃO FINAL ##
        # Query ajustada para extrair o estado (UF) de dentro da coluna JSON 'endereco_expedicao'
        vendas_estado = execute_query(conn, """
            SELECT 
                JSON_UNQUOTE(JSON_EXTRACT(endereco_expedicao, '$.estado')) as estado, 
                SUM(total_com_desconto) as faturamento 
            FROM pedidos 
            WHERE JSON_EXTRACT(endereco_expedicao, '$.estado') IS NOT NULL
            GROUP BY estado 
            HAVING faturamento > 0
        """)
        # ## FIM DA CORREÇÃO FINAL ##

        top_vendedores = execute_query(conn, "SELECT u.nome, SUM(p.total_com_desconto) as faturamento FROM pedidos p JOIN usuarios u ON p.vendedor_id = u.id GROUP BY u.nome ORDER BY faturamento DESC LIMIT 5")

        return {
            "evolucaoFaturamentoCusto": sorted(evolucao_final, key=lambda x: x['mes']), "ltv": ltv_medio,
            "churnRate": churn_rate_90d, "vendasPorEstado": vendas_estado, "topVendedores": top_vendedores
        }
    finally:
        if conn: conn.close()

@router.get("/analise-produtos-estoque")
async def get_analise_produtos_estoque():
    conn = get_db_connection()
    try:
        produtos = execute_query(conn, "SELECT id, grupo, custo_produto FROM produtos")
        mapa_custos = {p['id']: float(p.get('custo_produto', 0) or 0) for p in produtos}
        mapa_grupos = {p['id']: p.get('grupo', 'N/A') for p in produtos}

        pedidos = execute_query(conn, "SELECT lista_itens FROM pedidos")
        lucro_categoria = defaultdict(lambda: {'faturamento': 0, 'custo': 0})
        for pedido in pedidos:
            if pedido.get('lista_itens'):
                try:
                    itens = json.loads(pedido['lista_itens'])
                    for item in itens:
                        pid = item.get('produto_id')
                        if pid and mapa_grupos.get(pid):
                            grupo = mapa_grupos[pid]
                            lucro_categoria[grupo]['faturamento'] += float(item.get('subtotal', 0) or 0)
                            lucro_categoria[grupo]['custo'] += mapa_custos.get(pid, 0) * item.get('quantidade_itens', 1)
                except (json.JSONDecodeError, TypeError): continue
        
        lucro_categoria_final = [{"categoria": k, "faturamento": v['faturamento'], "custo": v['custo'], "lucro": v['faturamento'] - v['custo']} for k, v in lucro_categoria.items()]

        estoque_atual = execute_query(conn, "SELECT p.custo_produto, e.quantidade FROM produtos p JOIN estoque e ON p.id = e.id_produto WHERE e.situacao_estoque = 'Disponível'")
        valor_total_estoque = sum(float(i['custo_produto'] or 0) * float(i['quantidade'] or 0) for i in estoque_atual)

        pedidos_90d = execute_query(conn, "SELECT lista_itens FROM pedidos WHERE STR_TO_DATE(data_emissao, '%%d/%%m/%%Y') >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)")
        custo_produtos_vendidos_90d = 0
        for pedido in pedidos_90d:
             if pedido.get('lista_itens'):
                try:
                    itens = json.loads(pedido['lista_itens'])
                    for item in itens: custo_produtos_vendidos_90d += mapa_custos.get(item.get('produto_id'), 0) * item.get('quantidade_itens', 1)
                except (json.JSONDecodeError, TypeError): continue
        
        giro_estoque = custo_produtos_vendidos_90d / valor_total_estoque if valor_total_estoque > 0 else 0
        pipeline = execute_query(conn, "SELECT situacao_pedido as name, COUNT(id) as value FROM pedidos GROUP BY name ORDER BY value DESC")
        
        return {
            "lucratividadePorCategoria": sorted(lucro_categoria_final, key=lambda x: x['lucro'], reverse=True),
            "valorTotalEstoque": valor_total_estoque, "giroEstoque90d": giro_estoque, "pipelinePedidos": pipeline
        }
    finally:
        if conn: conn.close()