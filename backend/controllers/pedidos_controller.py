from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, validator
from fastapi import status
from typing import Optional, List, Dict, Any
import os
import traceback
import mysql.connector.pooling
import decimal
import json

# Pool de conexão MySQL
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="pedido_pool",
    pool_size=10,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

router = APIRouter()

# --- Modelos Pydantic ---

class ItemPedido(BaseModel):
    produto_id: int
    produto: str
    quantidade_itens: int
    tabela_preco_id: Optional[str] = None
    tabela_preco: Optional[str] = None
    subtotal: float
    sku: Optional[str] = None
    classificacao_fiscal: Optional[str] = None
    origem: Optional[int] = None
    unidade: Optional[str] = None
    cfop: Optional[str] = None

class FormaPagamento(BaseModel):
    tipo: str
    valor_pix: Optional[float] = None
    valor_boleto: Optional[float] = None
    valor_dinheiro: Optional[float] = None
    parcelas: Optional[int] = None
    valor_parcela: Optional[float] = None

class PedidoCreate(BaseModel):
    data_emissao: str
    data_validade: str
    cliente_id: int
    cliente_nome: str
    vendedor_id: int
    vendedor_nome: str
    transportadora_id: Optional[int] = None
    transportadora_nome: Optional[str] = None
    origem_venda: str
    lista_itens: List[ItemPedido]
    total: float
    desconto_total: float
    total_com_desconto: float
    tipo_frete: str
    valor_frete: float
    prazo_entrega_dias: Optional[int] = None # <-- CAMPO ADICIONADO
    formas_pagamento: List[FormaPagamento]
    data_finalizacao: Optional[str] = None
    ordem_finalizacao: Optional[float] = None
    endereco_expedicao: Optional[Dict[str, Any]] = None
    hora_expedicao: Optional[str] = None
    usuario_expedicao: Optional[str] = None
    numero_nf: Optional[str] = None
    data_nf: Optional[str] = None
    observacao: Optional[str] = None
    situacao_pedido: str
    programacao: Optional[Dict[str, Any]] = None

    @validator('endereco_expedicao', 'programacao', 'lista_itens', 'formas_pagamento', pre=True)
    def parse_json_fields(cls, value):
        if isinstance(value, str):
            if not value: return None
            try: return json.loads(value)
            except json.JSONDecodeError: raise ValueError("JSON inválido")
        return value

class PedidoUpdate(BaseModel):
    data_emissao: Optional[str] = None
    data_validade: Optional[str] = None
    cliente_id: Optional[int] = None
    cliente_nome: Optional[str] = None
    vendedor_id: Optional[int] = None
    vendedor_nome: Optional[str] = None
    transportadora_id: Optional[int] = None
    transportadora_nome: Optional[str] = None
    origem_venda: Optional[str] = None
    lista_itens: Optional[List[ItemPedido]] = None
    total: Optional[float] = None
    desconto_total: Optional[float] = None
    total_com_desconto: Optional[float] = None
    tipo_frete: Optional[str] = None
    valor_frete: Optional[float] = None
    prazo_entrega_dias: Optional[int] = None # <-- CAMPO ADICIONADO
    formas_pagamento: Optional[List[FormaPagamento]] = None
    data_finalizacao: Optional[str] = None
    ordem_finalizacao: Optional[float] = None
    endereco_expedicao: Optional[Dict[str, Any]] = None
    hora_expedicao: Optional[str] = None
    usuario_expedicao: Optional[str] = None
    numero_nf: Optional[str] = None
    data_nf: Optional[str] = None
    observacao: Optional[str] = None
    situacao_pedido: Optional[str] = None
    programacao: Optional[Dict[str, Any]] = None

    @validator('endereco_expedicao', 'programacao', 'lista_itens', 'formas_pagamento', pre=True)
    def parse_json_fields(cls, value):
        if isinstance(value, str):
            if not value: return None
            try: return json.loads(value)
            except json.JSONDecodeError: raise ValueError("JSON inválido")
        return value

class PedidoCSV(BaseModel):
    id: Optional[int] = None
    situacao_pedido: str
    data_emissao: str
    data_validade: str
    cliente: Optional[int] = None
    cliente_nome: Optional[str] = None
    vendedor: Optional[int] = None
    vendedor_nome: Optional[str] = None
    origem_venda: Optional[str] = None
    tipo_frete: Optional[str] = None
    transportadora: Optional[int] = None
    transportadora_nome: Optional[str] = None
    valor_frete: Optional[float] = 0.00
    prazo_entrega_dias: Optional[int] = None # <-- CAMPO ADICIONADO
    total: Optional[float] = 0.00
    desconto_total: Optional[float] = 0.00
    total_com_desconto: Optional[float] = 0.00
    lista_itens: Optional[Any] = {}
    formas_pagamento: Optional[Any] = {}
    observacao: Optional[str] = None
    criado_em: Optional[str] = None

class ImportacaoPayloadPedido(BaseModel):
    registros: List[PedidoCSV]

# --- Endpoints da API ---

@router.post("/pedidos", status_code=status.HTTP_201_CREATED)
def criar_pedido(pedido: PedidoCreate):
    conn = pool.get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO pedidos (
                situacao_pedido, data_emissao, data_validade,
                cliente_id, cliente_nome, vendedor_id, vendedor_nome,
                origem_venda, tipo_frete, transportadora_id, transportadora_nome,
                valor_frete, prazo_entrega_dias, total, desconto_total, total_com_desconto,
                lista_itens, formas_pagamento, data_finalizacao, ordem_finalizacao, observacao,
                endereco_expedicao, hora_expedicao, usuario_expedicao,
                numero_nf, data_nf, programacao
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            pedido.situacao_pedido, pedido.data_emissao, pedido.data_validade,
            pedido.cliente_id, pedido.cliente_nome, pedido.vendedor_id, pedido.vendedor_nome,
            pedido.origem_venda, pedido.tipo_frete, pedido.transportadora_id, pedido.transportadora_nome,
            decimal.Decimal(str(pedido.valor_frete or 0.00)),
            pedido.prazo_entrega_dias,
            decimal.Decimal(str(pedido.total or 0.00)),
            decimal.Decimal(str(pedido.desconto_total or 0.00)),
            decimal.Decimal(str(pedido.total_com_desconto or 0.00)),
            json.dumps([item.model_dump() for item in pedido.lista_itens]),
            json.dumps([forma.model_dump() for forma in pedido.formas_pagamento]),
            pedido.data_finalizacao,
            decimal.Decimal(str(pedido.ordem_finalizacao)) if pedido.ordem_finalizacao is not None else None,
            pedido.observacao,
            json.dumps(pedido.endereco_expedicao) if pedido.endereco_expedicao else None,
            pedido.hora_expedicao, pedido.usuario_expedicao,
            pedido.numero_nf, pedido.data_nf,
            json.dumps(pedido.programacao) if pedido.programacao else None,
        ))
        conn.commit()
        return {"mensagem": "Pedido criado com sucesso"}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail="Erro no servidor: " + str(err))
    finally:
        cursor.close()
        conn.close()

@router.put("/pedidos/{pedido_id}")
def atualizar_pedido(pedido_id: int, pedido_update: PedidoUpdate):
    conn = pool.get_connection()
    cursor = conn.cursor()
    update_data = pedido_update.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhum dado fornecido para atualização.")

    try:
        cursor.execute("SELECT id FROM pedidos WHERE id = %s", (pedido_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Pedido não encontrado.")

        set_clauses = []
        valores = []
        for campo, valor in update_data.items():
            set_clauses.append(f"{campo} = %s")
            if campo in ['lista_itens', 'formas_pagamento', 'endereco_expedicao', 'programacao']:
                valores.append(json.dumps(valor) if valor is not None else None)
            elif isinstance(valor, (float, decimal.Decimal)):
                valores.append(decimal.Decimal(str(valor)))
            else:
                valores.append(valor)

        if not set_clauses:
            return {"mensagem": "Nenhum campo para atualizar."}

        query = f"UPDATE pedidos SET {', '.join(set_clauses)} WHERE id = %s"
        valores.append(pedido_id)

        cursor.execute(query, tuple(valores))
        conn.commit()
        return {"mensagem": "Pedido atualizado com sucesso."}
    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar pedido: {str(err)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/pedidos/paginado")
def listar_pedidos_paginado(
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
        filtros_agrupados: Dict[str, List[str]] = {}

        colunas_validas = [
            "id", "situacao_pedido", "data_emissao", "data_validade",
            "cliente_id", "cliente_nome", "vendedor_id", "vendedor_nome", "origem_venda", "tipo_frete",
            "transportadora_id", "transportadora_nome", "valor_frete", "prazo_entrega_dias", # <-- CAMPO ADICIONADO
            "total", "desconto_total", "total_com_desconto", "criado_em", "data_finalizacao", "ordem_finalizacao",
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
                    if coluna not in filtros_agrupados:
                        filtros_agrupados[coluna] = []
                    filtros_agrupados[coluna].append(texto)

        for coluna, textos in filtros_agrupados.items():
            if coluna in colunas_validas:
                if len(textos) > 1:
                    or_conditions = [f"{coluna} LIKE %s" for _ in textos]
                    valores.extend([f"%{texto}%" for texto in textos])
                    where_clauses.append(f"({' OR '.join(or_conditions)})")
                else:
                    where_clauses.append(f"{coluna} LIKE %s")
                    valores.append(f"%{textos[0]}%")
            else:
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

        query_total = f"SELECT COUNT(*) as total FROM pedidos {where_sql}"
        cursor.execute(query_total, tuple(valores))
        total = cursor.fetchone()["total"]

        query = f"SELECT * FROM pedidos {where_sql} ORDER BY {ordem_sql} LIMIT %s OFFSET %s"
        cursor.execute(query, tuple(valores + [limit, offset]))
        resultados = cursor.fetchall()

        return {"total": total, "resultados": resultados}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro ao listar pedidos paginados: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.post("/pedidos/validar_importacao")
def validar_importacao_pedido(payload: ImportacaoPayloadPedido):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    conflitos = []
    novos = []
    erros = []

    try:
        for pedido in payload.registros:
            pedido_dict = pedido.dict()
            pedido_dict.pop("id", None)
            pedido_dict.pop("criado_em", None)

            cliente_nome = (pedido_dict.get("cliente_nome") or '').strip()

            if not cliente_nome:
                erros.append({"mensagem": "Pedido sem cliente_nome informado", "pedido": pedido})
                continue

            cursor.execute("SELECT * FROM pedidos WHERE cliente_nome = %s AND data_emissao = %s", 
                           (cliente_nome, pedido_dict.get("data_emissao")))
            existente = cursor.fetchone()

            if existente:
                existente.pop("id", None)
                existente.pop("criado_em", None)
                conflitos.append({"original": existente, "novo": pedido_dict})
            else:
                novos.append(pedido_dict)

        return {"conflitos": conflitos, "novos": novos, "erros": erros}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao validar orçamentos: {str(e)}")

    finally:
        cursor.close()
        conn.close()
        
        
@router.post("/pedidos/importar_csv_confirmado")
def importar_csv_confirmado_pedido(payload: ImportacaoPayloadPedido):
    print(f"Total de registros recebidos: {len(payload.registros)}")

    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    BATCH_SIZE = 50

    erros_detalhados = []

    try:
        for i in range(0, len(payload.registros), BATCH_SIZE):
            lote = payload.registros[i:i + BATCH_SIZE]
            for idx, pedido in enumerate(lote, start=i):
                try:
                    pedido_dict = pedido if isinstance(pedido, dict) else pedido.dict()
                    pedido_dict.pop("id", None)
                    pedido_dict.pop("criado_em", None)

                    cliente_nome = pedido_dict.get("cliente_nome")
                    data_emissao = pedido_dict.get("data_emissao")

                    cursor.execute("SELECT id FROM pedidos WHERE cliente_nome = %s AND data_emissao = %s", 
                                   (cliente_nome, data_emissao))
                    existente = cursor.fetchone()

                    if existente:
                        print(f"Atualizando orçamento ID: {existente['id']}")
                        cursor.execute("""
                            UPDATE pedidos SET
                                situacao_pedido = %s, data_validade = %s,
                                cliente_id = %s, vendedor_id = %s,
                                vendedor_nome = %s, origem_venda = %s, tipo_frete = %s,
                                transportadora_id = %s, transportadora_nome = %s,
                                valor_frete = %s, total = %s, desconto_total = %s,
                                total_com_desconto = %s, lista_itens = %s, formas_pagamento = %s, observacao = %s
                            WHERE id = %s
                        """, (
                            pedido_dict.get("situacao_pedido"), pedido_dict.get("data_validade"),
                            pedido_dict.get("cliente"), pedido_dict.get("vendedor"),
                            pedido_dict.get("vendedor_nome"), pedido_dict.get("origem_venda"), pedido_dict.get("tipo_frete"),
                            pedido_dict.get("transportadora"), pedido_dict.get("transportadora_nome"),
                            decimal.Decimal(str(pedido_dict.get("valor_frete") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("total") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("desconto_total") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("total_com_desconto") or 0.00)),
                            str(pedido_dict.get("lista_itens")),
                            str(pedido_dict.get("formas_pagamento")),
                            pedido_dict.get("observacao"),
                            existente["id"]
                        ))
                    else:
                        print(f"Inserindo orçamento: {cliente_nome} - {data_emissao}")
                        cursor.execute("""
                            INSERT INTO pedidos (
                                situacao_pedido, data_emissao, data_validade,
                                cliente_id, cliente_nome, vendedor_id, vendedor_nome,
                                origem_venda, tipo_frete, transportadora_id, transportadora_nome,
                                valor_frete, total, desconto_total, total_com_desconto,
                                lista_itens, formas_pagamento, observacao
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            pedido_dict.get("situacao_pedido"), pedido_dict.get("data_emissao"),
                            pedido_dict.get("data_validade"), pedido_dict.get("cliente"),
                            cliente_nome, pedido_dict.get("vendedor"), pedido_dict.get("vendedor_nome"),
                            pedido_dict.get("origem_venda"), pedido_dict.get("tipo_frete"),
                            pedido_dict.get("transportadora"), pedido_dict.get("transportadora_nome"),
                            decimal.Decimal(str(pedido_dict.get("valor_frete") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("total") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("desconto_total") or 0.00)),
                            decimal.Decimal(str(pedido_dict.get("total_com_desconto") or 0.00)),
                            str(pedido_dict.get("lista_itens")),
                            str(pedido_dict.get("formas_pagamento")),
                            pedido_dict.get("observacao")
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
        
        
@router.get("/pedidos/{pedido_id}/analise_estoque")
def analisar_estoque_para_pedido(pedido_id: int):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute("SELECT lista_itens FROM pedidos WHERE id = %s", (pedido_id,))
        pedido = cursor.fetchone()
        if not pedido or not pedido['lista_itens']:
            raise HTTPException(status_code=404, detail="Pedido não encontrado ou sem itens.")
        
        itens_pedido = json.loads(pedido['lista_itens'])
        
        analise_produtos = []
        
        for item in itens_pedido:
            produto_id = item.get('produto_id')
            quantidade_necessaria = item.get('quantidade_itens', 0)
            
            if not produto_id:
                continue

            cursor.execute("SELECT id, descricao, permite_estoque_negativo FROM produtos WHERE id = %s", (produto_id,))
            produto_info = cursor.fetchone()
            
            if not produto_info:
                analise_produtos.append({
                    "produto_id": produto_id,
                    "produto_nome": item.get('produto', 'Produto não encontrado'),
                    "quantidade_necessaria": quantidade_necessaria,
                    "permite_producao": False,
                    "estoque_disponivel": [],
                    "estoque_total": 0
                })
                continue
                
            cursor.execute("""
                SELECT 
                    id_produto, lote, deposito, rua, numero, nivel, cor, 
                    situacao_estoque, quantidade
                FROM estoque
                WHERE id_produto = %s AND quantidade > 0
            """, (produto_id,))
            posicoes_estoque = cursor.fetchall()

            estoque_total = sum(p['quantidade'] for p in posicoes_estoque)

            analise_produtos.append({
                "produto_id": produto_id,
                "produto_nome": produto_info['descricao'],
                "quantidade_necessaria": quantidade_necessaria,
                "permite_producao": produto_info['permite_estoque_negativo'],
                "estoque_disponivel": posicoes_estoque,
                "estoque_total": estoque_total
            })
            
        return analise_produtos

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Erro interno do servidor: {e}")
    finally:
        cursor.close()
        conn.close()
