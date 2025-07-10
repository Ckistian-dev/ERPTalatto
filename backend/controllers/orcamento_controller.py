from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi import status
from typing import Optional
import os
import traceback
import mysql.connector.pooling
import decimal
from typing import List
import json
from datetime import datetime

def converter_data_para_iso(data_br: str):
    """Converte uma data string 'DD/MM/AAAA' para 'AAAA-MM-DD'."""
    if not data_br:
        return None
    try:
        # Converte a string para um objeto datetime e depois para o formato ISO
        return datetime.strptime(data_br, '%d/%m/%Y').strftime('%Y-%m-%d')
    except (ValueError, TypeError):
        # Retorna a data original se o formato for inválido, para evitar quebrar a aplicação
        return data_br


# Pool de conexão MySQL
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

class ItemOrcamento(BaseModel):
    produto_id: int
    produto: str
    variacao_id: Optional[str]
    variacao: Optional[str]
    quantidade_itens: int
    tabela_preco_id: Optional[str]
    tabela_preco: Optional[str]
    subtotal: float

class FormaPagamento(BaseModel):
    tipo: str
    valor_pix: Optional[float] = None
    valor_boleto: Optional[float] = None
    valor_dinheiro: Optional[float] = None
    parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None


class OrcamentoCreate(BaseModel):
    data_emissao: str
    data_validade: str
    cliente: int
    cliente_nome: str
    vendedor: int
    vendedor_nome: str
    origem_venda: str
    lista_itens: List[ItemOrcamento]
    total: float
    desconto_total: float
    total_com_desconto: float
    tipo_frete: str
    transportadora: int
    transportadora_nome: Optional[str]  # 👈 ADICIONE ESSA LINHA!
    valor_frete: float
    formas_pagamento: List[FormaPagamento]
    observacao: Optional[str]
    situacao_orcamento: str
    
    
class OrcamentoCSV(BaseModel):
    id: Optional[int] = None
    situacao_orcamento: str
    data_emissao: str
    data_validade: str
    cliente: Optional[int]
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
    lista_itens: Optional[dict] = {}
    formas_pagamento: Optional[dict] = {}
    observacao: Optional[str] = None
    criado_em: Optional[str]

class ImportacaoPayloadOrcamento(BaseModel):
    registros: List[OrcamentoCSV]

@router.post("/orcamentos", status_code=status.HTTP_201_CREATED)
def criar_orcamento(orcamento: OrcamentoCreate):
    conn = pool.get_connection()
    cursor = conn.cursor()

    try:
        # ✅ CONVERTE AS DATAS ANTES DE USAR
        data_emissao_iso = converter_data_para_iso(orcamento.data_emissao)
        data_validade_iso = converter_data_para_iso(orcamento.data_validade)

        cursor.execute("""
            INSERT INTO orcamentos (
                situacao_orcamento, data_emissao, data_validade,
                # ... outros campos
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            orcamento.situacao_orcamento,
            data_emissao_iso,      # USA A DATA CONVERTIDA
            data_validade_iso,     # USA A DATA CONVERTIDA
            # ... outros valores
            orcamento.cliente,
            orcamento.cliente_nome,
            # ... etc
        ))

        conn.commit()
        return {"mensagem": "Orçamento criado com sucesso"}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail="Erro no servidor: " + str(err))

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

        colunas_validas = [
            "id", "situacao_orcamento", "data_emissao", "data_validade",
            "cliente_nome", "vendedor_nome", "origem_venda", "tipo_frete",
            "transportadora_nome", "valor_frete", "total", "desconto_total",
            "total_com_desconto", "criado_em"
        ]

        coluna_ordenacao = ordenar_por if ordenar_por in colunas_validas else "id"
        direcao_ordenacao = "ASC" if ordenar_direcao and ordenar_direcao.lower() == "asc" else "DESC"

        if filtros:
            for par in filtros.split(";"):
                if ":" in par:
                    coluna, texto = par.split(":", 1)
                    where_clauses.append(f"{coluna} LIKE %s")
                    valores.append(f"%{texto}%")

        if filtro_rapido_coluna and filtro_rapido_texto:
            where_clauses.append(f"{filtro_rapido_coluna} LIKE %s")
            valores.append(f"%{filtro_rapido_texto}%")

        if data_inicio:
            where_clauses.append("criado_em >= %s")
            valores.append(f"{data_inicio} 00:00:00")
        if data_fim:
            where_clauses.append("criado_em <= %s")
            valores.append(f"{data_fim} 23:59:59")

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query_total = f"SELECT COUNT(*) as total FROM orcamentos {where_sql}"
        cursor.execute(query_total, valores)
        total = cursor.fetchone()["total"]

        query = f"""
            SELECT * FROM orcamentos
            {where_sql}
            ORDER BY {coluna_ordenacao} {direcao_ordenacao}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query, valores + [limit, offset])
        resultados = cursor.fetchall()

        return {
            "total": total,
            "resultados": resultados
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar orçamentos paginados: {str(e)}")

    finally:
        cursor.close()
        conn.close()


@router.put("/orcamentos/{orcamento_id}")
def atualizar_orcamento(orcamento_id: int, orcamento: OrcamentoCreate):
    conn = pool.get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM orcamentos WHERE id = %s", (orcamento_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Orçamento não encontrado.")

        cursor.execute("""
            UPDATE orcamentos SET
                situacao_orcamento = %s,
                data_emissao = %s,
                data_validade = %s,
                cliente_id = %s,
                cliente_nome = %s,
                vendedor_id = %s,
                vendedor_nome = %s,
                origem_venda = %s,
                tipo_frete = %s,
                transportadora_id = %s,
                transportadora_nome = %s,
                valor_frete = %s,
                total = %s,
                desconto_total = %s,
                total_com_desconto = %s,
                lista_itens = %s,
                formas_pagamento = %s,
                observacao = %s
            WHERE id = %s
        """, (
            orcamento.situacao_orcamento,
            orcamento.data_emissao,
            orcamento.data_validade,
            orcamento.cliente,
            orcamento.cliente_nome,
            orcamento.vendedor,
            orcamento.vendedor_nome,
            orcamento.origem_venda,
            orcamento.tipo_frete,
            orcamento.transportadora,
            orcamento.transportadora_nome,
            decimal.Decimal(str(orcamento.valor_frete or 0.00)),
            decimal.Decimal(str(orcamento.total or 0.00)),
            decimal.Decimal(str(orcamento.desconto_total or 0.00)),
            decimal.Decimal(str(orcamento.total_com_desconto or 0.00)),
            json.dumps([item.dict() for item in orcamento.lista_itens]),
            json.dumps([forma.dict() for forma in orcamento.formas_pagamento]),
            orcamento.observacao,
            orcamento_id
        ))

        conn.commit()
        return {"mensagem": "Orçamento atualizado com sucesso."}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail="Erro ao atualizar orçamento: " + str(err))

    finally:
        cursor.close()
        conn.close()


@router.post("/orcamentos/validar_importacao")
def validar_importacao_orcamento(payload: ImportacaoPayloadOrcamento):
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
                erros.append({"mensagem": "Orçamento sem cliente_nome informado", "orcamento": orcamento})
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
def importar_csv_confirmado_orcamento(payload: ImportacaoPayloadOrcamento):
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
                                situacao_orcamento = %s, data_validade = %s,
                                cliente_id = %s, vendedor_id = %s,
                                vendedor_nome = %s, origem_venda = %s, tipo_frete = %s,
                                transportadora_id = %s, transportadora_nome = %s,
                                valor_frete = %s, total = %s, desconto_total = %s,
                                total_com_desconto = %s, lista_itens = %s, formas_pagamento = %s, observacao = %s
                            WHERE id = %s
                        """, (
                            orcamento_dict.get("situacao_orcamento"), orcamento_dict.get("data_validade"),
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
                                situacao_orcamento, data_emissao, data_validade,
                                cliente_id, cliente_nome, vendedor_id, vendedor_nome,
                                origem_venda, tipo_frete, transportadora_id, transportadora_nome,
                                valor_frete, total, desconto_total, total_com_desconto,
                                lista_itens, formas_pagamento, observacao
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            orcamento_dict.get("situacao_orcamento"), orcamento_dict.get("data_emissao"),
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
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
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
        cursor.close()
        conn.close()
