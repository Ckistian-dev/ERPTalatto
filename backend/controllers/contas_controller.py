from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from fastapi import status
from typing import Optional, List
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
import os
import traceback
import unicodedata
import mysql.connector.pooling
from dotenv import load_dotenv
from urllib.parse import unquote

load_dotenv()

# Pool de conexão MySQL
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="conta_pool_v2", # Nome do pool atualizado para evitar conflitos se houver outro
    pool_size=10,
    pool_reset_session=True,
    host=os.getenv("DB_HOST"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    database=os.getenv("DB_NAME"),
    port=int(os.getenv("DB_PORT")), # ✅ Adicionado para puxar a porta da variável de ambiente
    charset='utf8mb4', # Adicionado para melhor suporte a caracteres
    collation='utf8mb4_unicode_ci' # Adicionado para melhor suporte a caracteres
)

router = APIRouter()

class FormaPagamentoDetalhe(BaseModel):
    tipo: str
    parcelas: Optional[int] = 1
    valor_parcela: Optional[float] = None
    valor_boleto: Optional[float] = None
    valor_dinheiro: Optional[float] = None
    valor_pix: Optional[float] = None

class ContaBase(BaseModel):
    tipo_conta: str
    situacao_conta: str
    descricao_conta: str
    num_conta: int
    id_cliente_fornecedor: int
    nome_cliente_fornecedor: str
    data_emissao: str
    data_vencimento: str
    data_baixa: Optional[str] = None
    plano_contas: str
    caixa_destino_origem: str
    observacoes_conta: Optional[str] = None
    formas_pagamento: str
    criado_em: Optional[datetime] = None
    atualizado_em: Optional[datetime] = None
    
class ContaResponse(BaseModel): # Adapte conforme seu modelo de resposta
    id: int
    tipo_conta: str
    situacao_conta: str
    descricao_conta: str
    num_conta: int
    id_cliente_fornecedor: int
    nome_cliente_fornecedor: str
    data_emissao: str
    data_vencimento: str
    data_baixa: Optional[str] = None
    plano_contas: str
    caixa_destino_origem: str
    observacoes_conta: Optional[str] = None
    forma_pagamento: str
    valor_conta: float
    criado_em: datetime # A query formata para string. Se o model espera datetime, Pydantic tentará converter.
    atualizado_em: datetime # Ou str, dependendo de como o DB retorna e o model espera.

    class Config:
        from_attributes = True # Para Pydantic v2+ (ou orm_mode = True para v1)

class ContaCreate(BaseModel):
    tipo_conta: str
    situacao_conta: str
    descricao_conta: str
    num_conta: int
    id_cliente_fornecedor: int
    nome_cliente_fornecedor: str
    data_emissao: str
    data_vencimento: str # Data de vencimento base para a primeira parcela ou conta única
    data_baixa: Optional[str] = None
    plano_contas: str
    caixa_destino_origem: str
    observacoes_conta: Optional[str] = None
    formas_pagamento: List[FormaPagamentoDetalhe] # Array de formas de pagamento
    # Se criado_em e atualizado_em não vierem no payload, você pode gerá-los com datetime.now()
    # Sua query original sugere que eles vêm do payload 'conta'.

class ContaUpdate(ContaBase):
    pass

class ContaResponse(BaseModel): # Adapte conforme seu modelo de resposta
    id: int
    tipo_conta: str
    situacao_conta: str
    descricao_conta: str
    num_conta: int
    id_cliente_fornecedor: int
    nome_cliente_fornecedor: str
    data_emissao: str
    data_vencimento: str
    data_baixa: Optional[str] = None
    plano_contas: str
    caixa_destino_origem: str
    observacoes: Optional[str] = None
    forma_pagamento: str
    valor_conta: float
    criado_em: str # A query formata para string. Se o model espera datetime, Pydantic tentará converter.
    atualizado_em: datetime # Ou str, dependendo de como o DB retorna e o model espera.
    
    class Config:
        from_attributes = True # Para Pydantic v2+ (ou orm_mode = True para v1)

class ContaCSV(ContaBase): # Usado para importação, precisa ter todos os campos
    id: Optional[int] = None
    criado_em: Optional[str] = None

class ImportacaoPayload(BaseModel):
    registros: List[ContaCSV]


@router.post("/contas", response_model=ContaResponse, status_code=status.HTTP_201_CREATED)
def criar_conta(conta: ContaCreate):
    conn = None
    cursor = None
    conta_id_para_retorno = None # ID da última conta inserida para o response_model

    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            data_vencimento_base_obj = datetime.strptime(conta.data_vencimento, "%d/%m/%Y").date()
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Formato de data_vencimento base inválido: {conta.data_vencimento}. Use dd/mm/YYYY.")
        
        query_insert = """
            INSERT INTO contas (
                tipo_conta, situacao_conta, descricao_conta, num_conta, 
                id_cliente_fornecedor, nome_cliente_fornecedor, data_emissao, data_vencimento, data_baixa,
                plano_contas, caixa_destino_origem, observacoes_conta,
                forma_pagamento, valor_conta,
                criado_em, atualizado_em
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        if not conta.formas_pagamento:
            raise HTTPException(status_code=400, detail="A lista de formas de pagamento não pode estar vazia.")

        for forma_pgto_item in conta.formas_pagamento:
            valor_conta_atual = 0.0
            data_vencimento_final_str_db = None # Para armazenar a data de vencimento desta iteração
            if forma_pgto_item.tipo == "Parcelamento":
                if forma_pgto_item.valor_parcela is None or forma_pgto_item.parcelas is None or forma_pgto_item.parcelas <= 0:
                    raise HTTPException(status_code=400, detail="Para tipo 'Parcelamento', 'valor_parcela' e 'parcelas' válidas são obrigatórios.")
                valor_conta_atual = forma_pgto_item.valor_parcela
                
                for i in range(1, forma_pgto_item.parcelas + 1):
                    # ✅ ALTERAÇÃO: Vencimento a cada 28 dias, em vez de mês a mês.
                    data_vencimento_parcela_obj = data_vencimento_base_obj + timedelta(days=(i-1) * 28)
                    
                    data_vencimento_final_str_db = data_vencimento_parcela_obj.strftime("%d/%m/%Y")
                    forma_pagamento_db = f"Parcelamento {i}/{forma_pgto_item.parcelas}"
                    
                    values = (
                        conta.tipo_conta, conta.situacao_conta, conta.descricao_conta,
                        conta.num_conta, conta.id_cliente_fornecedor, conta.nome_cliente_fornecedor,
                        conta.data_emissao, data_vencimento_final_str_db, conta.data_baixa,
                        conta.plano_contas, conta.caixa_destino_origem, conta.observacoes_conta,
                        forma_pagamento_db, valor_conta_atual,
                        datetime.now(), datetime.now()
                    )
                    cursor.execute(query_insert, values)
                    conta_id_para_retorno = cursor.lastrowid
            else:
                forma_pagamento_db = forma_pgto_item.tipo
                if forma_pgto_item.tipo == "Pix" and forma_pgto_item.valor_pix is not None:
                    valor_conta_atual = forma_pgto_item.valor_pix
                elif forma_pgto_item.tipo == "Dinheiro" and forma_pgto_item.valor_dinheiro is not None:
                    valor_conta_atual = forma_pgto_item.valor_dinheiro
                elif forma_pgto_item.tipo == "Boleto" and forma_pgto_item.valor_boleto is not None:
                    valor_conta_atual = forma_pgto_item.valor_boleto
                else:
                    raise HTTPException(status_code=400, detail=f"Valor não especificado para o tipo de pagamento: {forma_pgto_item.tipo}")

                if valor_conta_atual <= 0:
                    pass

                values = (
                    conta.tipo_conta, conta.situacao_conta, conta.descricao_conta,
                    conta.num_conta, conta.id_cliente_fornecedor, conta.nome_cliente_fornecedor,
                    # ✅ ALTERAÇÃO: Vencimento no mesmo dia da emissão para pagamentos únicos.
                    conta.data_emissao, conta.data_emissao, conta.data_baixa, 
                    conta.plano_contas, conta.caixa_destino_origem, conta.observacoes_conta,
                    forma_pagamento_db, valor_conta_atual,
                    datetime.now(), datetime.now()
                )
                cursor.execute(query_insert, values)
                conta_id_para_retorno = cursor.lastrowid
        
        conn.commit()

        if conta_id_para_retorno is None:
            raise HTTPException(status_code=500, detail="Nenhuma conta foi criada, erro interno.")

        cursor.execute("SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em_str FROM contas WHERE id = %s", (conta_id_para_retorno,))
        novo_conta_db_dict = cursor.fetchone()

        if novo_conta_db_dict is None:
            raise HTTPException(status_code=404, detail="Conta criada mas não encontrada para retorno.")
        
        novo_conta_db_dict['criado_em'] = novo_conta_db_dict.pop('criado_em_str')

        return ContaResponse(**novo_conta_db_dict)

    except mysql.connector.Error as err:
        if conn: conn.rollback()
        if err.errno == 1062: 
            raise HTTPException(status_code=400, detail=f"Valor duplicado já existente: {err.msg}")
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro no servidor ao criar conta: " + str(err))
    except HTTPException as http_exc:
        if conn: conn.rollback()
        raise http_exc
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro inesperado no servidor: " + str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

    	
@router.get("/contas/paginado")
def listar_contas_paginado(
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
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        offset = (page - 1) * limit
        where_clauses = []
        valores = []
        
        colunas_validas = [
            "tipo_conta",
            "situacao_conta",
            "id_cliente_fornecedor",
            "data_emissao",
            "data_vencimento",
            "data_baixa",
            "plano_contas",
            "caixa_destino_origem",
            "observacoes_conta",
            "forma_pagamento",
            "valor_conta",
            "criado_em",
            "atualizado_em",
        ]

        coluna_ordenacao = ordenar_por if ordenar_por in colunas_validas else "id"
        direcao_ordenacao = "ASC" if ordenar_direcao and ordenar_direcao.lower() == "asc" else "DESC"

        if filtros:
            for par_filtro in filtros.split(";"):
                if ":" in par_filtro:
                    coluna, texto_codificado = par_filtro.split(":", 1)
                    # <<< MUDANÇA AQUI: Decodificar o texto da URL >>>
                    texto = unquote(texto_codificado) 
                    if coluna in colunas_validas:
                        where_clauses.append(f"`{coluna}` LIKE %s")
                        valores.append(f"%{texto}%")
                    else:
                        print(f"Aviso: Tentativa de filtrar por coluna inválida: {coluna}")

        if filtro_rapido_coluna and filtro_rapido_texto:
            if filtro_rapido_coluna in colunas_validas:
                where_clauses.append(f"`{filtro_rapido_coluna}` LIKE %s")
                # <<< MUDANÇA AQUI: Decodificar o filtro rápido também >>>
                valores.append(f"%{unquote(filtro_rapido_texto)}%") 
            else:
                print(f"Aviso: Tentativa de filtro rápido por coluna inválida: {filtro_rapido_coluna}")


        if data_inicio:
            where_clauses.append("DATE(criado_em) >= %s")
            valores.append(data_inicio)
        if data_fim:
            where_clauses.append("DATE(criado_em) <= %s")
            valores.append(data_fim)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query_total = f"SELECT COUNT(*) as total FROM contas {where_sql}"
        cursor.execute(query_total, valores)
        total_registros = cursor.fetchone()["total"]

        query_dados = f"""
            SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em 
            FROM contas
            {where_sql}
            ORDER BY `{coluna_ordenacao}` {direcao_ordenacao}
            LIMIT %s OFFSET %s
        """
        cursor.execute(query_dados, valores + [limit, offset])
        resultados = cursor.fetchall()

        return {
            "total": total_registros,
            "resultados": resultados
        }

    except mysql.connector.Error as err:
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar contas: {str(err)}")
    except Exception as e:
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado no servidor: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.put("/contas/{conta_id}", response_model=ContaResponse)
def atualizar_conta(conta_id: int, conta: ContaUpdate):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM contas WHERE id = %s", (conta_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrado.")

        cpf_cnpj_limpo = conta.cpf_cnpj.replace('.', '').replace('-', '').replace('/', '') if conta.cpf_cnpj else None
        cep_limpo = conta.cep.replace('-', '') if conta.cep else None

        query = """
            UPDATE contas SET
                nome_razao = %s, fantasia = %s, tipo_pessoa = %s, tipo_conta = %s,
                telefone = %s, celular = %s, email = %s, cpf_cnpj = %s, rg_ie = %s,
                logradouro = %s, numero = %s, complemento = %s, bairro = %s,
                cep = %s, cidade = %s, estado = %s, regiao = %s, situacao = %s,
                codigo_ibge_cidade = %s, pais = %s, codigo_pais = %s, indicador_ie = %s
            WHERE id = %s
        """
        values = (
            conta.nome_razao, conta.fantasia, conta.tipo_pessoa, conta.tipo_conta,
            conta.telefone, conta.celular, conta.email, cpf_cnpj_limpo, conta.rg_ie,
            conta.logradouro, conta.numero, conta.complemento, conta.bairro,
            cep_limpo, conta.cidade, conta.estado, conta.regiao, conta.situacao,
            conta.codigo_ibge_cidade, conta.pais, conta.codigo_pais, conta.indicador_ie,
            conta_id
        )
        cursor.execute(query, values)
        conn.commit()

        if cursor.rowcount == 0: # Nenhuma linha foi alterada, pode ser um erro ou dados iguais
             print(f"Nenhuma linha alterada para o conta ID {conta_id}. Os dados podem ser os mesmos.")
             # Não necessariamente um erro 404 aqui, mas um log é útil.

        cursor.execute("SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em FROM contas WHERE id = %s", (conta_id,))
        conta_atualizado_db = cursor.fetchone()
        if not conta_atualizado_db: # Checagem extra
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conta não encontrado após atualização.")
        
        return conta_atualizado_db

    except mysql.connector.Error as err:
        if conn: conn.rollback()
        if err.errno == 1062:
             if "cpf_cnpj" in err.msg.lower():
                 raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado para outro registro.")
             elif "email" in err.msg.lower():
                 raise HTTPException(status_code=400, detail="E-mail já cadastrado para outro registro.")
             else:
                 raise HTTPException(status_code=400, detail=f"Valor duplicado já existente: {err.msg}")
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro no servidor ao atualizar conta: " + str(err))
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro inesperado no servidor: " + str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.post("/contas/validar_importacao")
def validar_importacao(payload: ImportacaoPayload):
    conn = None
    cursor = None
    conflitos = []
    novos = []
    erros_validacao = [] # Renomeado de 'erros' para clareza

    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        for conta_csv in payload.registros:
            # conta_dict = conta_csv.dict(exclude_unset=True) # Pydantic v1
            conta_dict = conta_csv.model_dump(exclude_unset=True) # Pydantic v2
            
            # Remover campos que não devem ser usados para encontrar existente ou que são gerados
            conta_dict.pop("id", None) 
            conta_dict.pop("criado_em", None)

            cpf_cnpj_limpo = (conta_dict.get("cpf_cnpj") or '').strip().replace('.', '').replace('-', '').replace('/', '')

            if not cpf_cnpj_limpo:
                erros_validacao.append({"mensagem": "Conta sem CPF/CNPJ informado.", "dados_conta": conta_csv.model_dump()})
                continue

            cursor.execute("SELECT id FROM contas WHERE cpf_cnpj = %s", (cpf_cnpj_limpo,))
            existente_db = cursor.fetchone()

            if existente_db:
                # Remover campos gerados do existente para comparação mais limpa
                existente_comparacao = {k: v for k, v in existente_db.items() if k not in ["id", "criado_em"]}
                conflitos.append({"original": existente_comparacao, "novo": conta_dict})
            else:
                novos.append(conta_dict)

        return {"conflitos": conflitos, "novos": novos, "erros": erros_validacao}

    except mysql.connector.Error as err:
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao validar contas: {str(err)}")
    except Exception as e:
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado no servidor: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def limpar_acentos(texto: Optional[str]) -> Optional[str]:
    if not isinstance(texto, str):
        return texto
    return unicodedata.normalize('NFKD', texto).encode('ASCII', 'ignore').decode('ASCII')


@router.post("/contas/importar_csv_confirmado")
def importar_csv_confirmado(payload: ImportacaoPayload):
    conn = None
    cursor = None
    erros_importacao = []
    sucessos_count = 0
    atualizados_count = 0
    inseridos_count = 0
    BATCH_SIZE = 50 # Definir tamanho do lote para processamento

    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        for i in range(0, len(payload.registros), BATCH_SIZE):
            lote_registros = payload.registros[i:i + BATCH_SIZE]
            
            for idx_no_lote, conta_csv in enumerate(lote_registros):
                linha_global = i + idx_no_lote + 1 # Para mensagens de erro mais claras
                try:
                    # conta_dict = conta_csv.dict(exclude_unset=True) # Pydantic v1
                    conta_dict = conta_csv.model_dump(exclude_unset=True, exclude_none=True) # Pydantic v2, exclude_none para não sobrescrever com None
                    
                    cpf_cnpj_limpo = (conta_dict.get("cpf_cnpj") or '').strip().replace('.', '').replace('-', '').replace('/', '')
                    cep_limpo = (conta_dict.get("cep") or '').strip().replace('-', '')
                    complemento_tratado = (conta_dict.get("complemento") or '')[:60] # Limite do campo na NFe é 60

                    if not cpf_cnpj_limpo:
                        erros_importacao.append({"linha": linha_global, "erro": "CPF/CNPJ não informado.", "dados": conta_csv.model_dump()})
                        continue

                    # Valores padrão para novos campos se não vierem do CSV
                    indicador_ie_val = conta_dict.get("indicador_ie", '9')
                    pais_val = conta_dict.get("pais", 'Brasil')
                    codigo_pais_val = conta_dict.get("codigo_pais", '1058')
                    codigo_ibge_val = conta_dict.get("codigo_ibge_cidade")


                    cursor.execute("SELECT id FROM contas WHERE cpf_cnpj = %s", (cpf_cnpj_limpo,))
                    existente = cursor.fetchone()

                    if existente:
                        # UPDATE
                        update_query = """
                            UPDATE contas SET
                            nome_razao=%s, fantasia=%s, tipo_pessoa=%s, tipo_conta=%s, telefone=%s, celular=%s, email=%s, 
                            rg_ie=%s, logradouro=%s, numero=%s, complemento=%s, bairro=%s, cep=%s, cidade=%s, estado=%s, 
                            regiao=%s, situacao=%s, codigo_ibge_cidade=%s, pais=%s, codigo_pais=%s, indicador_ie=%s
                            WHERE id = %s
                        """
                        update_values = (
                            conta_dict.get("nome_razao"), conta_dict.get("fantasia"), conta_dict.get("tipo_pessoa"),
                            conta_dict.get("tipo_conta"), conta_dict.get("telefone"), conta_dict.get("celular"),
                            conta_dict.get("email"), conta_dict.get("rg_ie"),
                            conta_dict.get("logradouro"), conta_dict.get("numero"), complemento_tratado,
                            conta_dict.get("bairro"), cep_limpo, conta_dict.get("cidade"), conta_dict.get("estado"),
                            conta_dict.get("regiao"), conta_dict.get("situacao"), codigo_ibge_val,
                            pais_val, codigo_pais_val, indicador_ie_val,
                            existente["id"]
                        )
                        cursor.execute(update_query, update_values)
                        atualizados_count += 1
                    else:
                        # INSERT
                        insert_query = """
                            INSERT INTO contas (
                                nome_razao, fantasia, tipo_pessoa, tipo_conta, telefone, celular, email, cpf_cnpj, rg_ie,
                                logradouro, numero, complemento, bairro, cep, cidade, estado, regiao, situacao,
                                codigo_ibge_cidade, pais, codigo_pais, indicador_ie
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """
                        insert_values = (
                            conta_dict.get("nome_razao"), conta_dict.get("fantasia"), conta_dict.get("tipo_pessoa"),
                            conta_dict.get("tipo_conta"), conta_dict.get("telefone"), conta_dict.get("celular"),
                            conta_dict.get("email"), cpf_cnpj_limpo, conta_dict.get("rg_ie"),
                            conta_dict.get("logradouro"), conta_dict.get("numero"), complemento_tratado,
                            conta_dict.get("bairro"), cep_limpo, conta_dict.get("cidade"), conta_dict.get("estado"),
                            conta_dict.get("regiao"), conta_dict.get("situacao"), codigo_ibge_val,
                            pais_val, codigo_pais_val, indicador_ie_val
                        )
                        cursor.execute(insert_query, insert_values)
                        inseridos_count +=1
                    
                    sucessos_count += 1

                except mysql.connector.Error as db_err:
                    conn.rollback() # Rollback para este item específico do lote
                    print(f"Erro DB na linha {linha_global} (CPF/CNPJ: {conta_dict.get('cpf_cnpj', 'N/A')}): {db_err}")
                    erros_importacao.append({"linha": linha_global, "erro": f"Erro no banco: {db_err.msg}", "dados": conta_csv.model_dump()})
                except Exception as e:
                    conn.rollback()
                    print(f"Erro geral na linha {linha_global} (CPF/CNPJ: {conta_dict.get('cpf_cnpj', 'N/A')}): {e}")
                    erros_importacao.append({"linha": linha_global, "erro": str(e), "dados": conta_csv.model_dump()})
            
            conn.commit() # Commit ao final de cada lote processado

        mensagem_final = f"Importação concluída. Registros processados: {sucessos_count} (Inseridos: {inseridos_count}, Atualizados: {atualizados_count})."
        if erros_importacao:
            # Não levanta HTTPException aqui para permitir que os sucessos sejam contabilizados
            # O frontend deve verificar a lista de erros.
            return {"mensagem": mensagem_final + f" Erros encontrados: {len(erros_importacao)}.", "erros": erros_importacao, "sucessos": sucessos_count}

        return {"mensagem": mensagem_final, "erros": [], "sucessos": sucessos_count}

    except Exception as e:
        if conn: conn.rollback() # Rollback geral se algo der muito errado
        print(f"Erro crítico durante a importação: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro crítico ao importar contas: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/contas_dropdown")
def listar_contas_dropdown(tipo_conta: Optional[str] = None): # Tornar tipo_conta opcional
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT id, nome_razao, cpf_cnpj FROM contas WHERE situacao = 'Ativo'"
        params = []

        if tipo_conta:
            query += " AND tipo_conta = %s"
            params.append(tipo_conta)
        
        query += " ORDER BY nome_razao ASC"

        cursor.execute(query, tuple(params))
        return cursor.fetchall()

    except mysql.connector.Error as err:
        print(f"Erro de banco de dados: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
