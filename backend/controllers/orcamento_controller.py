from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi import status
from typing import Optional, List, Dict
import os
import traceback
import mysql.connector.pooling
import decimal
import json


# Pool de conexão MySQL (sem alterações)
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="orcamento_pool",
    pool_size=10,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

router = APIRouter()

# Modelos (Itemorcamento, FormaPagamento, orcamentoCreate, etc.) - Sem alterações
class Itemorcamento(BaseModel):
    produto_id: int
    produto: str
    quantidade_itens: int
    tabela_preco_id: Optional[str]
    tabela_preco: Optional[str]
    subtotal: float

class FormaPagamento(BaseModel):
    tipo: str
    valor_pix: Optional[float]
    valor_boleto: Optional[float]
    valor_dinheiro: Optional[float]
    parcelas: Optional[int]
    valor_parcela: Optional[float]

# ATUALIZADO: Campos renomeados para o padrão do banco
class orcamentoCreate(BaseModel):
    data_emissao: str
    data_validade: str
    cliente_id: int  # Renomeado de 'cliente'
    cliente_nome: str
    vendedor_id: int  # Renomeado de 'vendedor'
    vendedor_nome: str
    transportadora_id: int # Renomeado de 'transportadora'
    transportadora_nome: Optional[str]
    origem_venda: str
    lista_itens: List[Itemorcamento]
    total: float
    desconto_total: float
    total_com_desconto: float
    tipo_frete: str
    valor_frete: float
    formas_pagamento: List[FormaPagamento]
    data_finalizacao: Optional[str] = None
    ordem_finalizacao: Optional[float] = None
    observacao: Optional[str]
    situacao_pedido: Optional[str] = None


# ATUALIZADO: Campos renomeados para o padrão do banco
class orcamentoUpdate(BaseModel):
    data_emissao: Optional[str] = None
    data_validade: Optional[str] = None
    cliente_id: Optional[int] = None # Renomeado
    cliente_nome: Optional[str] = None
    vendedor_id: Optional[int] = None # Renomeado
    vendedor_nome: Optional[str] = None
    transportadora_id: Optional[int] = None # Renomeado
    transportadora_nome: Optional[str] = None
    origem_venda: Optional[str] = None
    lista_itens: Optional[List[Itemorcamento]] = None
    total: Optional[float] = None
    desconto_total: Optional[float] = None
    total_com_desconto: Optional[float] = None
    tipo_frete: Optional[str] = None
    valor_frete: Optional[float] = None
    formas_pagamento: Optional[List[FormaPagamento]] = None
    observacao: Optional[str] = None
    situacao_pedido: Optional[str] = None
    
    
class orcamentoCSV(BaseModel):
    id: Optional[int] = None
    situacao_pedido: str
    data_emissao: str
    data_validade: str
    cliente_id: Optional[int]
    cliente_nome: Optional[str]
    vendedor: Optional[int]
    vendedor_nome: Optional[str]
    origem_venda: Optional[str]
    tipo_frete: Optional[str]
    transportadora: Optional[int]
    transportadora_nome: Optional[str]
    valor_frete: Optional[float] = 0.00
    total: Optional[float] = 0.00
    desconto_total: Optional[float] = 0.00
    total_com_desconto: Optional[float] = 0.00
    lista_itens: Optional[Dict] = {}
    formas_pagamento: Optional[Dict] = {}
    observacao: Optional[str] = None
    criado_em: Optional[str]

class ImportacaoPayloadorcamento(BaseModel):
    registros: List[orcamentoCSV]

# ATUALIZADO: Rota de criação para usar os novos nomes de campos
@router.post("/orcamentos", status_code=status.HTTP_201_CREATED)
def criar_orcamento(orcamento: orcamentoCreate):
    conn = pool.get_connection()
    cursor = conn.cursor()
    try:
        # Query usa os nomes de coluna corretos, que agora correspondem ao modelo
        cursor.execute("""
            INSERT INTO orcamentos (
                situacao_pedido, data_emissao, data_validade,
                cliente_id, cliente_nome, vendedor_id, vendedor_nome,
                origem_venda, tipo_frete, transportadora_id, transportadora_nome,
                valor_frete, total, desconto_total, total_com_desconto,
                lista_itens, formas_pagamento, data_finalizacao, ordem_finalizacao, observacao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            orcamento.situacao_pedido, orcamento.data_emissao, orcamento.data_validade,
            orcamento.cliente_id, orcamento.cliente_nome, orcamento.vendedor_id, orcamento.vendedor_nome,
            orcamento.origem_venda, orcamento.tipo_frete, orcamento.transportadora_id, orcamento.transportadora_nome,
            decimal.Decimal(str(orcamento.valor_frete or 0.00)),
            decimal.Decimal(str(orcamento.total or 0.00)),
            decimal.Decimal(str(orcamento.desconto_total or 0.00)),
            decimal.Decimal(str(orcamento.total_com_desconto or 0.00)),
            json.dumps([item.dict() for item in orcamento.lista_itens]),
            json.dumps([forma.dict() for forma in orcamento.formas_pagamento]),
            orcamento.data_finalizacao,
            decimal.Decimal(str(orcamento.ordem_finalizacao)) if orcamento.ordem_finalizacao is not None else None,
            orcamento.observacao,
        ))
        conn.commit()
        return {"mensagem": "orcamento criado com sucesso"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail="Erro no servidor: " + str(err))
    finally:
        cursor.close()
        conn.close()

# ATUALIZADO: Rota de atualização simplificada
@router.put("/orcamentos/{orcamento_id}")
def atualizar_orcamento(orcamento_id: int, orcamento_update: orcamentoUpdate):
    conn = pool.get_connection()
    cursor = conn.cursor()

    update_data = orcamento_update.dict(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado fornecido para atualização.")

    try:
        cursor.execute("SELECT id FROM orcamentos WHERE id = %s", (orcamento_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="orcamento não encontrado.")

        set_clauses = []
        valores = []
        
        # REMOVIDO: O dicionário 'campo_para_coluna' não é mais necessário.

        for campo, valor in update_data.items():
            # O nome do 'campo' agora corresponde diretamente ao nome da 'coluna'
            set_clauses.append(f"{campo} = %s")

            if campo in ['lista_itens', 'formas_pagamento']:
                valores.append(json.dumps(valor))
            elif campo == 'endereco_expedicao':
                valores.append(json.dumps(valor) if valor else None)
            elif isinstance(valor, (float, decimal.Decimal)):
                 valores.append(decimal.Decimal(str(valor)))
            else:
                 valores.append(valor)

        if not set_clauses:
             return {"mensagem": "Nenhum campo para atualizar."}

        query = f"UPDATE orcamentos SET {', '.join(set_clauses)} WHERE id = %s"
        valores.append(orcamento_id)

        cursor.execute(query, tuple(valores))
        conn.commit()

        return {"mensagem": "orcamento atualizado com sucesso."}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar orcamento: {str(err)}")

    finally:
        cursor.close()
        conn.close()


@router.get("/orcamentos/paginado")
def listar_orcamentos_paginado(
    page: int = 1,
    limit: int = 15,
    filtros: Optional[str] = None,
    filtro_rapido_coluna: Optional[str] = None,
    filtro_rapido_texto: Optional[str] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    ordenar_por: Optional[str] = None,
    ordenar_direcao: Optional[str] = "asc"
):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        offset = (page - 1) * limit
        where_clauses = []
        valores = []
        
        # Dicionário para agrupar filtros da mesma coluna
        filtros_agrupados: Dict[str, List[str]] = {}

        colunas_validas = [
            "id", "situacao_pedido", "data_emissao", "data_validade",
            "cliente_id", "cliente_nome", "vendedor_id", "vendedor_nome", "origem_venda", "tipo_frete",
            "transportadora_id", "transportadora_nome", "valor_frete", "total", "desconto_total",
            "total_com_desconto", "criado_em", "data_finalizacao", "ordem_finalizacao",
            "hora_expedicao", "usuario_expedicao", "numero_nf", "data_nf"
        ]

        colunas_ordenacao = ordenar_por.split(",") if ordenar_por else ["id"]
        colunas_ordenacao = [col.strip() for col in colunas_ordenacao if col.strip() in colunas_validas]
        direcao_ordenacao = "ASC" if ordenar_direcao and ordenar_direcao.lower() == "asc" else "DESC"
        ordem_sql = ", ".join([f"{col} {direcao_ordenacao}" for col in colunas_ordenacao]) if colunas_ordenacao else "id ASC"

        if filtros:
            for par in filtros.split(";"):
                if ":" in par:
                    coluna, texto = par.split(":", 1)
                    # Adiciona à lista de filtros agrupados
                    if coluna not in filtros_agrupados:
                        filtros_agrupados[coluna] = []
                    filtros_agrupados[coluna].append(texto)

        # Processa os filtros agrupados
        for coluna, textos in filtros_agrupados.items():
            if coluna in colunas_validas: # Garante que a coluna é válida para evitar injeção SQL
                if len(textos) > 1:
                    # Se houver múltiplos valores para a mesma coluna, usa OR
                    or_conditions = []
                    for texto in textos:
                        or_conditions.append(f"{coluna} LIKE %s")
                        valores.append(f"%{texto}%")
                    where_clauses.append(f"({' OR '.join(or_conditions)})")
                else:
                    # Se houver apenas um valor, usa LIKE
                    where_clauses.append(f"{coluna} LIKE %s")
                    valores.append(f"%{textos[0]}%")
            else:
                # Opcional: Logar ou levantar um erro se uma coluna inválida for passada
                print(f"Aviso: Coluna '{coluna}' no filtro não é válida e será ignorada.")


        if filtro_rapido_coluna and filtro_rapido_texto:
            if filtro_rapido_coluna in colunas_validas:
                where_clauses.append(f"{filtro_rapido_coluna} LIKE %s")
                valores.append(f"%{filtro_rapido_texto}%")
            else:
                print(f"Aviso: Coluna de filtro rápido '{filtro_rapido_coluna}' não é válida e será ignorada.")


        if data_inicio:
            where_clauses.append("criado_em >= %s")
            valores.append(f"{data_inicio} 00:00:00")
        if data_fim:
            where_clauses.append("criado_em <= %s")
            valores.append(f"{data_fim} 23:59:59")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query_total = f"SELECT COUNT(*) as total FROM orcamentos {where_sql}"
        cursor.execute(query_total, valores) # Os valores já contêm todos os parâmetros para as cláusulas WHERE
        total = cursor.fetchone()["total"]

        query = f"""
            SELECT * FROM orcamentos
            {where_sql}
            ORDER BY {ordem_sql}
            LIMIT %s OFFSET %s
        """

        cursor.execute(query, valores + [limit, offset])
        resultados = cursor.fetchall()

        return {
            "total": total,
            "resultados": resultados
        }

    except Exception as e:
        # Imprime o traceback completo para depuração
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao listar orcamentos paginados: {str(e)}")

    finally:
        cursor.close()
        conn.close()

@router.post("/orcamentos/validar_importacao")
def validar_importacao_orcamento(payload: ImportacaoPayloadorcamento):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    conflitos = []
    novos = []
    erros = []

    try:
        for orcamento in payload.registros:
            orcamento_dict = orcamento.dict()
            orcamento_dict.pop("id", None)
            orcamento_dict.pop("criado_em", None)

            cliente_nome = (orcamento_dict.get("cliente_nome") or '').strip()

            if not cliente_nome:
                erros.append({"mensagem": "orcamento sem cliente_nome informado", "orcamento": orcamento})
                continue

            cursor.execute("SELECT * FROM orcamentos WHERE cliente_nome = %s AND data_emissao = %s", 
                            (cliente_nome, orcamento_dict.get("data_emissao")))
            existente = cursor.fetchone()

            if existente:
                existente.pop("id", None)
                existente.pop("criado_em", None)
                conflitos.append({"original": existente, "novo": orcamento_dict})
            else:
                novos.append(orcamento_dict)

        return {"conflitos": conflitos, "novos": novos, "erros": erros}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao validar orçamentos: {str(e)}")

    finally:
        cursor.close()
        conn.close()
        
    	
@router.post("/orcamentos/importar_csv_confirmado")
def importar_csv_confirmado_orcamento(payload: ImportacaoPayloadorcamento):
    print(f"Total de registros recebidos: {len(payload.registros)}")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    BATCH_SIZE = 50

    erros_detalhados = []

    try:
        for i in range(0, len(payload.registros), BATCH_SIZE):
            lote = payload.registros[i:i + BATCH_SIZE]
            for idx, orcamento in enumerate(lote, start=i):
                try:
                    orcamento_dict = orcamento if isinstance(orcamento, dict) else orcamento.dict()
                    orcamento_dict.pop("id", None)
                    orcamento_dict.pop("criado_em", None)

                    cliente_nome = orcamento_dict.get("cliente_nome")
                    data_emissao = orcamento_dict.get("data_emissao")

                    cursor.execute("SELECT id FROM orcamentos WHERE cliente_nome = %s AND data_emissao = %s", 
                                    (cliente_nome, data_emissao))
                    existente = cursor.fetchone()

                    if existente:
                        print(f"Atualizando orçamento ID: {existente['id']}")
                        cursor.execute("""
                            UPDATE orcamentos SET
                                situacao_pedido = %s, data_validade = %s,
                                cliente_id = %s, vendedor_id = %s,
                                vendedor_nome = %s, origem_venda = %s, tipo_frete = %s,
                                transportadora_id = %s, transportadora_nome = %s,
                                valor_frete = %s, total = %s, desconto_total = %s,
                                total_com_desconto = %s, lista_itens = %s, formas_pagamento = %s, observacao = %s
                            WHERE id = %s
                        """, (
                            orcamento_dict.get("situacao_pedido"), orcamento_dict.get("data_validade"),
                            orcamento_dict.get("cliente"), orcamento_dict.get("vendedor"),
                            orcamento_dict.get("vendedor_nome"), orcamento_dict.get("origem_venda"), orcamento_dict.get("tipo_frete"),
                            orcamento_dict.get("transportadora"), orcamento_dict.get("transportadora_nome"),
                            decimal.Decimal(str(orcamento_dict.get("valor_frete") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("total") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("desconto_total") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("total_com_desconto") or 0.00)),
                            str(orcamento_dict.get("lista_itens")),
                            str(orcamento_dict.get("formas_pagamento")),
                            orcamento_dict.get("observacao"),
                            existente["id"]
                        ))
                    else:
                        print(f"Inserindo orçamento: {cliente_nome} - {data_emissao}")
                        cursor.execute("""
                            INSERT INTO orcamentos (
                                situacao_pedido, data_emissao, data_validade,
                                cliente_id, cliente_nome, vendedor_id, vendedor_nome,
                                origem_venda, tipo_frete, transportadora_id, transportadora_nome,
                                valor_frete, total, desconto_total, total_com_desconto,
                                lista_itens, formas_pagamento, observacao
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            orcamento_dict.get("situacao_pedido"), orcamento_dict.get("data_emissao"),
                            orcamento_dict.get("data_validade"), orcamento_dict.get("cliente"),
                            cliente_nome, orcamento_dict.get("vendedor"), orcamento_dict.get("vendedor_nome"),
                            orcamento_dict.get("origem_venda"), orcamento_dict.get("tipo_frete"),
                            orcamento_dict.get("transportadora"), orcamento_dict.get("transportadora_nome"),
                            decimal.Decimal(str(orcamento_dict.get("valor_frete") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("total") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("desconto_total") or 0.00)),
                            decimal.Decimal(str(orcamento_dict.get("total_com_desconto") or 0.00)),
                            str(orcamento_dict.get("lista_itens")),
                            str(orcamento_dict.get("formas_pagamento")),
                            orcamento_dict.get("observacao")
                        ))

                except Exception as e:
                    print(f"❌ ERRO na linha {idx+1}: {e}")
                    traceback.print_exc()
                    erros_detalhados.append(f"Linha {idx+1}: {str(e)}")

        conn.commit()

        if erros_detalhados:
            raise HTTPException(status_code=400, detail=erros_detalhados)

        return {"mensagem": "Importação de orçamentos concluída com sucesso"}

    except HTTPException as http_err:
        raise http_err

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro geral ao importar orçamentos: {str(e)}")

    finally:
        cursor.close()
        conn.close()

        
@router.get("/orcamentos_dropdown")
def listar_orcamentos_dropdown(id: Optional[int] = None):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        if id:
            cursor.execute("SELECT * FROM orcamentos WHERE id = %s", (id,))
            resultado = cursor.fetchone()
            return [resultado] if resultado else []

        cursor.execute("""
            SELECT 
                id,
                CONCAT('Orçamento #', id, ' - ', cliente_nome, ' - ', DATE_FORMAT(data_emissao, '%d/%m/%Y')) AS nome
            FROM orcamentos
            ORDER BY id DESC
        """)
        return cursor.fetchall()
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()