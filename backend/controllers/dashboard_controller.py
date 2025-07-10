import os
from fastapi import APIRouter, HTTPException
from datetime import date, timedelta
import mysql.connector.pooling
from dotenv import load_dotenv

# Carrega as variáveis de ambiente do seu arquivo .env
load_dotenv()

# --- Pool de Conexão com o Banco de Dados ---
# Replicando o mesmo padrão de conexão do seu controller de contas
# para garantir consistência.
try:
    pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="dashboard_pool",
        pool_size=5,
        pool_reset_session=True,
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME"),
        port=os.getenv("DB_PORT")
    )
except mysql.connector.Error as err:
    print(f"Erro ao criar o pool de conexões do MySQL: {err}")
    # Se o pool não puder ser criado, a aplicação não deve iniciar.
    # Lançar uma exceção aqui é uma abordagem.
    raise RuntimeError("Não foi possível conectar ao banco de dados.") from err

# Cria o roteador para o dashboard
router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)

# Função auxiliar para converter Decimal em float para serialização JSON
def processar_resultados(resultados):
    """Converte valores Decimal do DB para float."""
    if isinstance(resultados, list):
        for linha in resultados:
            for chave, valor in linha.items():
                if hasattr(valor, 'is_decimal'): # Checa se é um tipo Decimal
                    linha[chave] = float(valor)
    elif isinstance(resultados, dict):
        for chave, valor in resultados.items():
            if hasattr(valor, 'is_decimal'):
                resultados[chave] = float(valor)
    return resultados


@router.get("/indicadores-gerais")
async def get_indicadores_gerais():
    """
    Busca os principais indicadores (KPIs) para os cards do topo do dashboard.
    """
    query_pedidos = """
        SELECT 
            COALESCE(SUM(total_com_desconto), 0) as totalFaturado,
            COUNT(id) as numeroPedidos
        FROM pedidos
        WHERE data_emissao >= %s;
    """
    query_pagar = """
        SELECT COALESCE(SUM(valor_conta), 0) as total FROM contas 
        WHERE tipo_conta = 'A Pagar' AND situacao_conta = 'Em Aberto';
    """
    query_receber = """
        SELECT COALESCE(SUM(valor_conta), 0) as total FROM contas 
        WHERE tipo_conta = 'A Receber' AND situacao_conta = 'Em Aberto';
    """
    
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        # Faturamento e Ticket Médio
        data_inicio_30d = date.today() - timedelta(days=30)
        cursor.execute(query_pedidos, (data_inicio_30d,))
        resultado_pedidos = cursor.fetchone()
        
        total_faturado = float(resultado_pedidos['totalFaturado'])
        num_pedidos = resultado_pedidos['numeroPedidos']
        ticket_medio = total_faturado / num_pedidos if num_pedidos > 0 else 0

        # Contas a Pagar
        cursor.execute(query_pagar)
        total_a_pagar = float(cursor.fetchone()['total'])

        # Contas a Receber
        cursor.execute(query_receber)
        total_a_receber = float(cursor.fetchone()['total'])

        return {
            "totalFaturado": total_faturado,
            "ticketMedio": ticket_medio,
            "contasAPagar": total_a_pagar,
            "contasAReceber": total_a_receber
        }
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/faturamento-mensal")
async def get_faturamento_mensal():
    """
    Calcula o faturamento total por mês dos últimos 12 meses.
    """
    # CORREÇÃO: A query foi reescrita para ser compatível com o sql_mode 'only_full_group_by'
    query = """
        SELECT 
            DATE_FORMAT(data_emissao, '%%b/%%y') as mes, 
            SUM(total_com_desconto) as faturamento
        FROM pedidos
        WHERE data_emissao >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
        GROUP BY 
            YEAR(data_emissao),  -- Agrupa pelo ano
            MONTH(data_emissao), -- Agrupa pelo mês
            mes                  -- Inclui a coluna selecionada 'mes' no grupo
        ORDER BY 
            YEAR(data_emissao), MONTH(data_emissao) ASC;
    """
    
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        resultados = cursor.fetchall()
        return processar_resultados(resultados)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/situacao-financeira")
async def get_situacao_financeira():
    """
    Retorna a soma de contas a pagar e a receber que estão 'Em Aberto'.
    """
    query = """
        SELECT tipo_conta as tipo, COALESCE(SUM(valor_conta), 0) as valor 
        FROM contas 
        WHERE situacao_conta = 'Em Aberto' 
        GROUP BY tipo_conta;
    """
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        resultados = cursor.fetchall()

        # Garante que ambos os tipos estejam presentes no resultado para o gráfico
        tipos_presentes = {item['tipo'] for item in resultados}
        if 'A Pagar' not in tipos_presentes:
            resultados.append({'tipo': 'A Pagar', 'valor': 0})
        if 'A Receber' not in tipos_presentes:
            resultados.append({'tipo': 'A Receber', 'valor': 0})

        return processar_resultados(resultados)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/vendas-por-vendedor")
async def get_vendas_por_vendedor():
    """
    Retorna o número de vendas por vendedor, ordenado pelos top 5.
    """
    query = """
        SELECT vendedor_nome as vendedor, COUNT(id) as totalVendas 
        FROM pedidos 
        WHERE vendedor_nome IS NOT NULL AND vendedor_nome != ''
        GROUP BY vendedor_nome 
        ORDER BY totalVendas DESC 
        LIMIT 5;
    """
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        resultados = cursor.fetchall()
        return processar_resultados(resultados)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/top-produtos-estoque")
async def get_top_produtos_estoque():
    """
    Retorna os 5 produtos com maior quantidade em estoque.
    """
    query = """
        SELECT descricao as produto, estoque FROM produtos 
        WHERE estoque > 0 
        ORDER BY estoque DESC 
        LIMIT 5;
    """
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query)
        resultados = cursor.fetchall()
        return processar_resultados(resultados)
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()