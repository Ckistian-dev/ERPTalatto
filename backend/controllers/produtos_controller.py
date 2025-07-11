from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from fastapi import status
from typing import Optional, List, Dict
import os
import traceback
import mysql.connector.pooling
import decimal
import json
from datetime import datetime

# Pool de conexão MySQL
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="produto_pool",
    pool_size=10,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT"))
)

router = APIRouter()

class ProdutoCreate(BaseModel):
    sku: str
    descricao: str
    codigo_barras: Optional[str]
    unidade: str
    situacao: str
    tipo_produto: Optional[str] = None
    grupo: Optional[str] = None
    # REMOVIDO: estoque: Optional[int] = None
    # REMOVIDO: localizacao: Optional[str] = None
    permite_estoque_negativo: Optional[int] = None # Campo mantido
    peso_produto: Optional[float] = None
    peso_embalagem: Optional[float] = None
    unidade_caixa: Optional[int] = None
    largura_embalagem: Optional[float] = None
    altura_embalagem: Optional[float] = None
    comprimento_embalagem: Optional[float] = None
    diametro_embalagem: Optional[float] = None
    marca: Optional[str] = None
    garantia: Optional[str] = None
    slug: Optional[str] = None
    descricao_plataforma: Optional[str] = None
    largura_produto: Optional[float] = None
    altura_produto: Optional[float] = None
    comprimento_produto: Optional[float] = None
    diametro_produto: Optional[float] = None
    material_produto: Optional[str] = None
    fabricante: Optional[str] = None
    classificacao_fiscal: Optional[str] = None
    origem: Optional[str] = None
    valor_ipi: Optional[float] = None
    gtin: Optional[str] = None
    gtin_tributavel: Optional[str] = None
    tabela_precos: Optional[str] = None
    custo_produto: Optional[float] = None
    dias_preparacao: Optional[int] = None
    id_fornecedor: Optional[int] = None
    url_imagem: Optional[str] = None
    imagens_plataforma: Optional[str] = None
    imagens_variacoes: Optional[str] = None
    variacoes: Optional[str] = None
    quantidades: Optional[str] = None

@router.post("/produtos", status_code=status.HTTP_201_CREATED)
def criar_produto(produto: ProdutoCreate):
    conn = pool.get_connection()
    cursor = conn.cursor()

    try:
        produto_data = produto.model_dump() if hasattr(produto, 'model_dump') else produto.dict()
        
        campos = ", ".join(produto_data.keys())
        placeholders = ", ".join(["%s"] * len(produto_data))
        valores = list(produto_data.values())

        cursor.execute(f"""
            INSERT INTO produtos (
                {campos}
            ) VALUES (
                {placeholders}
            )
        """, valores)

        conn.commit()
        return {"mensagem": "Produto criado com sucesso"}

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro no servidor: {err}")

    finally:
        cursor.close()
        conn.close()

@router.get("/produtos/paginado")
def listar_produtos_paginado(
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
            "id", "sku", "codigo_barras", "descricao", "unidade", "situacao", "peso_produto",
            "tipo_produto", "grupo", "subgrupo1", "subgrupo2", "subgrupo3", "subgrupo4", "subgrupo5",
            "classificacao_fiscal", "origem", "valor_ipi", "gtin", "gtin_tributavel",
            # REMOVIDO: "estoque", "localizacao",
            "permite_estoque_negativo", # Campo mantido
            "tipo_embalagem", "peso_embalagem", "unidade_caixa",
            "largura_embalagem", "altura_embalagem", "comprimento_embalagem", "diametro_embalagem",
            "custo_produto", "id_fornecedor", "dias_preparacao", "marca", "garantia", "slug",
            "largura_produto", "altura_produto", "comprimento_produto", "diametro_produto",
            "fabricante", "criado_em"
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

        query_total = f"SELECT COUNT(*) as total FROM produtos {where_sql}"
        cursor.execute(query_total, valores)
        total = cursor.fetchone()["total"]

        query = f"""
            SELECT * FROM produtos
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
        raise HTTPException(status_code=500, detail=f"Erro ao listar produtos paginados: {str(e)}")

    finally:
        cursor.close()
        conn.close()

@router.put("/produtos/{produto_id}")
def atualizar_produto(produto_id: int, produto: dict):
    conn = pool.get_connection()
    cursor = conn.cursor()

    try:
        cursor.execute("SELECT id FROM produtos WHERE id = %s", (produto_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=404, detail="Produto não encontrado.")

        campos = ", ".join(f"{k} = %s" for k in produto.keys())
        valores = list(produto.values()) + [produto_id]

        cursor.execute(f"UPDATE produtos SET {campos} WHERE id = %s", valores)
        conn.commit()

        return { "mensagem": "Produto atualizado com sucesso." }

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail="Erro ao atualizar produto: " + str(err))

    finally:
        cursor.close()
        conn.close()

@router.post("/produtos/validar_importacao")
def validar_importacao_produtos(payload: dict):
    registros = payload.get("registros", [])
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    conflitos, novos, erros = [], [], []

    try:
        for produto in registros:
            sku = produto.get("sku")
            if not sku:
                erros.append({"mensagem": "Produto sem SKU", "produto": produto})
                continue

            cursor.execute("SELECT * FROM produtos WHERE sku = %s", (sku,))
            existente = cursor.fetchone()

            if existente:
                conflitos.append({"original": existente, "novo": produto})
            else:
                novos.append(produto)

        return {"conflitos": conflitos, "novos": novos, "erros": erros}

    finally:
        cursor.close()
        conn.close()

@router.post("/produtos/importar_csv_confirmado")
def importar_produtos_confirmado(payload: dict):
    registros = payload.get("registros", [])
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        for produto in registros:
            produto.pop("id", None)

            if "criado_em" not in produto:
                produto["criado_em"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            if "permite_estoque_negativo" in produto:
                if isinstance(produto["permite_estoque_negativo"], str):
                    produto["permite_estoque_negativo"] = 1 if produto["permite_estoque_negativo"].lower() == 'sim' else 0

            # REMOVIDO: Não precisamos mais tratar 'estoque' ou 'localizacao' aqui para importação

            cursor.execute("SELECT id FROM produtos WHERE sku = %s", (produto["sku"],))
            existente = cursor.fetchone()

            colunas = ", ".join(produto.keys())
            valores = list(produto.values())
            placeholders = ", ".join(["%s"] * len(produto))

            if existente:
                update_stmt = ", ".join([f"{k} = %s" for k in produto])
                cursor.execute(f"UPDATE produtos SET {update_stmt} WHERE id = %s", valores + [existente["id"]])
            else:
                cursor.execute(f"INSERT INTO produtos ({colunas}) VALUES ({placeholders})", valores)

        conn.commit()
        return {"mensagem": "Importação de produtos concluída com sucesso"}

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Erro na importação: {str(e)}")
    finally:
        cursor.close()
        conn.close()

@router.get("/produtos_dropdown")
def listar_produtos_dropdown():
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT 
                id,
                descricao,
                JSON_UNQUOTE(JSON_EXTRACT(url_imagem, '$[0]')) AS url_imagem
            FROM produtos
            WHERE situacao = 'Ativo'
            """
        )
        return cursor.fetchall()

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=str(err))

    finally:
        cursor.close()
        conn.close()

@router.get("/variacoes_por_produto")
def listar_variacoes(produto_id: int):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT variacoes FROM produtos WHERE id = %s", (produto_id,))
        resultado = cursor.fetchone()
        if not resultado:
            return []
        variacoes = json.loads(resultado["variacoes"]) if resultado["variacoes"] else []
        return [{"id": v, "descricao": v} for v in variacoes]
    finally:
        cursor.close()
        conn.close()

@router.get("/quantidades_por_produto")
def listar_quantidades(produto_id: int):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT quantidades FROM produtos WHERE id = %s", (produto_id,))
        resultado = cursor.fetchone()
        if not resultado:
            return []
        quantidades = json.loads(resultado["quantidades"]) if resultado["quantidades"] else []
        return [{"id": q, "quantidade": q} for q in quantidades]
    finally:
        cursor.close()
        conn.close()
        
@router.get("/tabela_precos_por_produto")
def listar_tabela_precos(produto_id: int):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT tabela_precos FROM produtos WHERE id = %s", (produto_id,))
        resultado = cursor.fetchone()
        if not resultado or not resultado["tabela_precos"]:
            return []

        try:
            tabelas_precos = json.loads(resultado["tabela_precos"])
            response_data = []
            for nome, valor in tabelas_precos.items():
                if isinstance(valor, (int, float, decimal.Decimal)):
                    response_data.append({"id": nome, "nome": nome, "valor": float(valor)})
            return response_data
        except (json.JSONDecodeError, TypeError):
            raise HTTPException(status_code=500, detail="Estrutura de dados da tabela de preços é inválida.")

    except mysql.connector.Error as err:
        raise HTTPException(status_code=500, detail=f"Erro de banco de dados: {err}")
    finally:
        cursor.close()
        conn.close()

@router.get("/produtos/{produto_id}")
def obter_produto_por_id(produto_id: int):
    conn = pool.get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM produtos WHERE id = %s", (produto_id,))
        produto = cursor.fetchone()
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")
        return produto
    finally:
        cursor.close()
        conn.close()