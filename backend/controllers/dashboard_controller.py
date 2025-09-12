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
        pool_name="dashboard_pool_v13_final_layout", # Nova versão
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
    tags=["Dashboard V13 Final Layout"]
)

def get_db_connection():
    try:
        return pool.get_connection()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=503, detail=f"Serviço de banco de dados indisponível: {err}")

def execute_query(conn, query, params=None):
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params)
        result = cursor.fetchall()
        return result
    except mysql.connector.Error as err:
        print(f"Erro na Query: {query[:250]}... | Erro: {err}") 
        return []
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()

def parse_date_robustly(date_str):
    if not date_str: return None
    try:
        return datetime.fromisoformat(str(date_str)).date()
    except (ValueError, TypeError):
        try:
            return datetime.strptime(str(date_str), '%d/%m/%Y').date()
        except (ValueError, TypeError):
            return None

# --- ENDPOINTS COM LÓGICA FINAL E NOVO LAYOUT ---

@router.get("/kpis-gerais")
async def get_kpis_gerais():
    conn = get_db_connection()
    try:
        data_inicio_30d = date.today() - timedelta(days=30)
        todos_pedidos_raw = execute_query(conn, "SELECT total_com_desconto, lista_itens, data_emissao, cliente_id FROM pedidos")
        todos_orcamentos_raw = execute_query(conn, "SELECT id, data_emissao FROM orcamentos")
        
        pedidos_recentes = [p for p in todos_pedidos_raw if (data_pedido := parse_date_robustly(p.get('data_emissao'))) and data_pedido >= data_inicio_30d]
        orcamentos_recentes = [o for o in todos_orcamentos_raw if (data_orcamento := parse_date_robustly(o.get('data_emissao'))) and data_orcamento >= data_inicio_30d]
        
        faturamento_30d = sum(float(p['total_com_desconto'] or 0) for p in pedidos_recentes)

        produtos_mapa = {p['id']: p for p in execute_query(conn, "SELECT id, custo_produto FROM produtos")}
        custo_total_30d = 0
        for pedido in pedidos_recentes:
            if pedido.get('lista_itens'):
                try:
                    itens = json.loads(pedido['lista_itens'])
                    for item in itens:
                        custo_total_30d += float(produtos_mapa.get(item.get('produto_id'), {}).get('custo_produto', 0) or 0) * item.get('quantidade_itens', 1)
                except (json.JSONDecodeError, TypeError): continue
        
        lucratividade_bruta_30d = faturamento_30d - custo_total_30d
        ticket_medio = faturamento_30d / len(pedidos_recentes) if pedidos_recentes else 0
        taxa_conversao = (len(pedidos_recentes) / len(orcamentos_recentes)) * 100 if orcamentos_recentes else 0

        primeiros_pedidos_map = {}
        for p in todos_pedidos_raw:
            data_pedido = parse_date_robustly(p.get('data_emissao'))
            cliente_id = p.get('cliente_id')
            if data_pedido and cliente_id:
                if cliente_id not in primeiros_pedidos_map or data_pedido < primeiros_pedidos_map[cliente_id]:
                    primeiros_pedidos_map[cliente_id] = data_pedido
        
        novos_clientes_30d = sum(1 for data_pedido in primeiros_pedidos_map.values() if data_pedido >= data_inicio_30d)
        
        contas_vencidas_res = execute_query(conn, "SELECT SUM(valor_conta) as total FROM contas WHERE tipo_conta = 'A Receber' AND situacao_conta IN ('Em Aberto', 'Pendente') AND STR_TO_DATE(data_vencimento, '%%d/%%m/%%Y') < CURDATE()")
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
        data_inicio_12m = date.today() - timedelta(days=365)
        
        query_pedidos = """
            SELECT p.total_com_desconto, p.lista_itens, p.data_emissao, p.cliente_id, 
                   p.endereco_expedicao, u.nome as vendedor_nome
            FROM pedidos p
            LEFT JOIN usuarios u ON p.vendedor_id = u.id
        """
        todos_pedidos_raw = execute_query(conn, query_pedidos)
        
        pedidos_12m = [p for p in todos_pedidos_raw if (data_pedido := parse_date_robustly(p.get('data_emissao'))) and data_pedido >= data_inicio_12m]

        # --- Cálculos baseados nos pedidos filtrados ---
        evolucao_data = defaultdict(lambda: {"faturamento": 0})
        vendas_por_vendedor = defaultdict(float)
        vendas_por_estado = defaultdict(float)

        for p in pedidos_12m:
            mes_chave = parse_date_robustly(p['data_emissao']).strftime('%Y-%m')
            valor_pedido = float(p.get('total_com_desconto') or 0)
            evolucao_data[mes_chave]['faturamento'] += valor_pedido
            
            # --- MELHORIA AQUI ---
            # Se o vendedor for nulo, agrupa em "Não Informado"
            vendedor = p.get('vendedor_nome') or "Não Informado"
            vendas_por_vendedor[vendedor] += valor_pedido
            
            # --- MELHORIA AQUI ---
            estado = "Não Informado"
            if p.get('endereco_expedicao'):
                try:
                    endereco = json.loads(p['endereco_expedicao'])
                    if endereco.get('estado'):
                        estado = endereco['estado']
                except (json.JSONDecodeError, TypeError):
                    pass # Mantém "Não Informado" se o JSON for inválido
            vendas_por_estado[estado] += valor_pedido
        
        evolucao_final = [{"mes": k, "faturamento": v['faturamento']} for k,v in evolucao_data.items()]
        top_vendedores = [{"nome": nome, "faturamento": faturamento} for nome, faturamento in sorted(vendas_por_vendedor.items(), key=lambda item: item[1], reverse=True)[:5]]
        vendas_estado_final = [{"estado": uf, "faturamento": faturamento} for uf, faturamento in vendas_por_estado.items()]

        # --- LTV e Churn (usam todos os pedidos) ---
        total_faturamento_pedidos = sum(float(p['total_com_desconto'] or 0) for p in todos_pedidos_raw)
        unique_clientes = {p['cliente_id'] for p in todos_pedidos_raw if p.get('cliente_id')}
        total_clientes = len(unique_clientes)
        ltv_medio = total_faturamento_pedidos / total_clientes if total_clientes > 0 else 0
        
        pedidos_por_cliente = defaultdict(list)
        for p in todos_pedidos_raw:
            if (data_pedido := parse_date_robustly(p.get('data_emissao'))):
                pedidos_por_cliente[p['cliente_id']].append(data_pedido)

        clientes_ativos_90d = 0
        data_limite_90d = date.today() - timedelta(days=90)
        for cliente_id in unique_clientes:
            if (datas := pedidos_por_cliente.get(cliente_id, [])) and max(datas) >= data_limite_90d:
                clientes_ativos_90d += 1
        
        churn_rate_90d = ((total_clientes - clientes_ativos_90d) / total_clientes) * 100 if total_clientes > 0 else 0
        
        return {
            "evolucaoFaturamentoCusto": sorted(evolucao_final, key=lambda x: x['mes']), 
            "ltv": ltv_medio,
            "churnRate": churn_rate_90d, 
            "vendasPorEstado": vendas_estado_final, 
            "topVendedores": top_vendedores
        }
    finally:
        if conn: conn.close()

@router.get("/analise-produtos-estoque")
async def get_analise_produtos_estoque():
    conn = get_db_connection()
    try:
        # --- NOVO: Top 10 Produtos Mais Vendidos (90 dias) ---
        data_inicio_90d = date.today() - timedelta(days=90)
        todos_pedidos_raw = execute_query(conn, "SELECT lista_itens, data_emissao FROM pedidos")
        produtos_mapa = {p['id']: p for p in execute_query(conn, "SELECT id, descricao, custo_produto FROM produtos")}

        pedidos_90d = [p for p in todos_pedidos_raw if (data_pedido := parse_date_robustly(p.get('data_emissao'))) and data_pedido >= data_inicio_90d]
        
        produtos_vendidos_qtd = defaultdict(int)
        custo_produtos_vendidos_90d = 0

        for p in pedidos_90d:
            if p.get('lista_itens'):
                try:
                    itens = json.loads(p['lista_itens'])
                    for item in itens:
                        pid = item.get('produto_id')
                        qtd = item.get('quantidade_itens', 1)
                        if pid:
                            produtos_vendidos_qtd[pid] += qtd
                            custo_produtos_vendidos_90d += float(produtos_mapa.get(pid, {}).get('custo_produto', 0) or 0) * qtd
                except (json.JSONDecodeError, TypeError): continue
        
        top_produtos_vendidos = sorted(produtos_vendidos_qtd.items(), key=lambda item: item[1], reverse=True)[:10]
        top_produtos_final = [{"descricao": produtos_mapa.get(pid, {}).get('descricao', f'ID {pid}'), "quantidade": qtd} for pid, qtd in top_produtos_vendidos]

        # --- Cálculos de Estoque ---
        estoque_atual = execute_query(conn, "SELECT p.custo_produto, e.quantidade FROM produtos p JOIN estoque e ON p.id = e.id_produto WHERE e.situacao_estoque = 'Disponível'")
        valor_total_estoque = sum(float(i['custo_produto'] or 0) * float(i['quantidade'] or 0) for i in estoque_atual)
        giro_estoque = custo_produtos_vendidos_90d / valor_total_estoque if valor_total_estoque > 0 else 0
        
        # --- Pipeline de Pedidos ---
        pipeline = execute_query(conn, "SELECT situacao_pedido as name, COUNT(id) as value FROM pedidos GROUP BY name ORDER BY value DESC")
        
        return {
            "topProdutosVendidos": top_produtos_final,
            "valorTotalEstoque": valor_total_estoque, 
            "giroEstoque90d": giro_estoque, 
            "pipelinePedidos": pipeline
        }
    finally:
        if conn: conn.close()