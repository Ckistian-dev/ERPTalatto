from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, EmailStr
from fastapi import status
from typing import Optional, List
import os
import traceback
import unicodedata
import mysql.connector.pooling
from dotenv import load_dotenv

load_dotenv()

# Pool de conexão MySQL
pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="cadastro_pool_v2", # Nome do pool atualizado para evitar conflitos se houver outro
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

class CadastroBase(BaseModel):
    nome_razao: str
    fantasia: Optional[str] = None
    tipo_pessoa: str
    tipo_cadastro: str
    telefone: Optional[str] = None
    celular: Optional[str] = None
    email: EmailStr
    cpf_cnpj: Optional[str] = None
    rg_ie: Optional[str] = None # Para NFe, este será a Inscrição Estadual
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    cep: str
    cidade: str
    estado: str # UF
    codigo_ibge_cidade: Optional[str] = None # Novo campo
    pais: Optional[str] = 'Brasil' # Novo campo
    codigo_pais: Optional[str] = '1058' # Novo campo
    indicador_ie: Optional[str] = '9' # Novo campo (1=Contribuinte ICMS; 2=Contribuinte isento; 9=Não Contribuinte)
    regiao: Optional[str] = None # Mantido, mas pode não ser usado ativamente pelo frontend
    situacao: str

class CadastroCreate(CadastroBase):
    pass

class CadastroUpdate(CadastroBase):
    pass

class CadastroResponse(CadastroBase):
    id: int
    criado_em: Optional[str] = None # Ajustado para ser opcional na resposta também

class CadastroCSV(CadastroBase): # Usado para importação, precisa ter todos os campos
    id: Optional[int] = None
    email: str # EmailStr não é usado aqui para permitir flexibilidade na importação
    criado_em: Optional[str] = None

class ImportacaoPayload(BaseModel):
    registros: List[CadastroCSV]


@router.post("/cadastros", response_model=CadastroResponse, status_code=status.HTTP_201_CREATED)
def criar_cadastro(cadastro: CadastroCreate):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        # Preparar os dados, garantindo que os campos opcionais tenham None se vazios
        # e formatando CPF/CNPJ e CEP (assumindo que o frontend já envia limpo, mas uma dupla checagem é boa)
        cpf_cnpj_limpo = cadastro.cpf_cnpj.replace('.', '').replace('-', '').replace('/', '') if cadastro.cpf_cnpj else None
        cep_limpo = cadastro.cep.replace('-', '') if cadastro.cep else None

        query = """
            INSERT INTO cadastros (
                nome_razao, fantasia, tipo_pessoa, tipo_cadastro,
                telefone, celular, email, cpf_cnpj, rg_ie,
                logradouro, numero, complemento, bairro,
                cep, cidade, estado, regiao, situacao,
                codigo_ibge_cidade, pais, codigo_pais, indicador_ie
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        values = (
            cadastro.nome_razao, cadastro.fantasia, cadastro.tipo_pessoa, cadastro.tipo_cadastro,
            cadastro.telefone, cadastro.celular, cadastro.email, cpf_cnpj_limpo, cadastro.rg_ie,
            cadastro.logradouro, cadastro.numero, cadastro.complemento, cadastro.bairro,
            cep_limpo, cadastro.cidade, cadastro.estado, cadastro.regiao, cadastro.situacao,
            cadastro.codigo_ibge_cidade, cadastro.pais, cadastro.codigo_pais, cadastro.indicador_ie
        )
        
        cursor.execute(query, values)
        cadastro_id = cursor.lastrowid
        conn.commit()

        # Retornar o cadastro criado
        cursor.execute("SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em FROM cadastros WHERE id = %s", (cadastro_id,))
        novo_cadastro_db = cursor.fetchone()
        return novo_cadastro_db

    except mysql.connector.Error as err:
        if conn: conn.rollback() # Importante para desfazer alterações em caso de erro
        if err.errno == 1062: 	# Código de erro para UNIQUE violation
            if "cpf_cnpj" in err.msg.lower(): # Ajustado para ser case-insensitive
                raise HTTPException(status_code=400, detail="CPF/CNPJ já cadastrado.")
            elif "email" in err.msg.lower():
                raise HTTPException(status_code=400, detail="E-mail já cadastrado.")
            else:
                raise HTTPException(status_code=400, detail=f"Valor duplicado já existente: {err.msg}")
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro no servidor ao criar cadastro: " + str(err))
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro inesperado no servidor: " + str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

    	
@router.get("/cadastros/paginado")
def listar_cadastros_paginado(
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
            "id", "nome_razao", "fantasia", "cpf_cnpj", "rg_ie", "tipo_pessoa",
            "tipo_cadastro", "celular", "telefone", "email", "cep", "logradouro",
            "numero", "complemento", "bairro", "cidade", "estado", "regiao", "situacao", 
            "codigo_ibge_cidade", "pais", "codigo_pais", "indicador_ie", # Novos campos adicionados
            "criado_em"
        ]

        coluna_ordenacao = ordenar_por if ordenar_por in colunas_validas else "id"
        direcao_ordenacao = "ASC" if ordenar_direcao and ordenar_direcao.lower() == "asc" else "DESC"

        if filtros:
            for par_filtro in filtros.split(";"):
                if ":" in par_filtro:
                    coluna, texto = par_filtro.split(":", 1)
                    if coluna in colunas_validas: # Segurança: validar coluna
                        where_clauses.append(f"`{coluna}` LIKE %s") # Usar backticks para nomes de colunas
                        valores.append(f"%{texto}%")
                    else:
                        print(f"Aviso: Tentativa de filtrar por coluna inválida: {coluna}")


        if filtro_rapido_coluna and filtro_rapido_texto:
            if filtro_rapido_coluna in colunas_validas:
                where_clauses.append(f"`{filtro_rapido_coluna}` LIKE %s")
                valores.append(f"%{filtro_rapido_texto}%")
            else:
                print(f"Aviso: Tentativa de filtro rápido por coluna inválida: {filtro_rapido_coluna}")


        if data_inicio:
            where_clauses.append("DATE(criado_em) >= %s") # Comparar apenas a data
            valores.append(data_inicio) # Formato YYYY-MM-DD
        if data_fim:
            where_clauses.append("DATE(criado_em) <= %s")
            valores.append(data_fim)

        where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

        query_total = f"SELECT COUNT(*) as total FROM cadastros {where_sql}"
        cursor.execute(query_total, valores)
        total_registros = cursor.fetchone()["total"]

        query_dados = f"""
            SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em 
            FROM cadastros
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
        raise HTTPException(status_code=500, detail=f"Erro ao listar cadastros: {str(err)}")
    except Exception as e:
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado no servidor: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.put("/cadastros/{cadastro_id}", response_model=CadastroResponse)
def atualizar_cadastro(cadastro_id: int, cadastro: CadastroUpdate):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM cadastros WHERE id = %s", (cadastro_id,))
        if not cursor.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cadastro não encontrado.")

        cpf_cnpj_limpo = cadastro.cpf_cnpj.replace('.', '').replace('-', '').replace('/', '') if cadastro.cpf_cnpj else None
        cep_limpo = cadastro.cep.replace('-', '') if cadastro.cep else None

        query = """
            UPDATE cadastros SET
                nome_razao = %s, fantasia = %s, tipo_pessoa = %s, tipo_cadastro = %s,
                telefone = %s, celular = %s, email = %s, cpf_cnpj = %s, rg_ie = %s,
                logradouro = %s, numero = %s, complemento = %s, bairro = %s,
                cep = %s, cidade = %s, estado = %s, regiao = %s, situacao = %s,
                codigo_ibge_cidade = %s, pais = %s, codigo_pais = %s, indicador_ie = %s
            WHERE id = %s
        """
        values = (
            cadastro.nome_razao, cadastro.fantasia, cadastro.tipo_pessoa, cadastro.tipo_cadastro,
            cadastro.telefone, cadastro.celular, cadastro.email, cpf_cnpj_limpo, cadastro.rg_ie,
            cadastro.logradouro, cadastro.numero, cadastro.complemento, cadastro.bairro,
            cep_limpo, cadastro.cidade, cadastro.estado, cadastro.regiao, cadastro.situacao,
            cadastro.codigo_ibge_cidade, cadastro.pais, cadastro.codigo_pais, cadastro.indicador_ie,
            cadastro_id
        )
        cursor.execute(query, values)
        conn.commit()

        if cursor.rowcount == 0: # Nenhuma linha foi alterada, pode ser um erro ou dados iguais
             print(f"Nenhuma linha alterada para o cadastro ID {cadastro_id}. Os dados podem ser os mesmos.")
             # Não necessariamente um erro 404 aqui, mas um log é útil.

        cursor.execute("SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em FROM cadastros WHERE id = %s", (cadastro_id,))
        cadastro_atualizado_db = cursor.fetchone()
        if not cadastro_atualizado_db: # Checagem extra
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cadastro não encontrado após atualização.")
        
        return cadastro_atualizado_db

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
        raise HTTPException(status_code=500, detail="Erro no servidor ao atualizar cadastro: " + str(err))
    except Exception as e:
        if conn: conn.rollback()
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail="Erro inesperado no servidor: " + str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.post("/cadastros/validar_importacao")
def validar_importacao(payload: ImportacaoPayload):
    conn = None
    cursor = None
    conflitos = []
    novos = []
    erros_validacao = [] # Renomeado de 'erros' para clareza

    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)

        for cadastro_csv in payload.registros:
            # cadastro_dict = cadastro_csv.dict(exclude_unset=True) # Pydantic v1
            cadastro_dict = cadastro_csv.model_dump(exclude_unset=True) # Pydantic v2
            
            # Remover campos que não devem ser usados para encontrar existente ou que são gerados
            cadastro_dict.pop("id", None) 
            cadastro_dict.pop("criado_em", None)

            cpf_cnpj_limpo = (cadastro_dict.get("cpf_cnpj") or '').strip().replace('.', '').replace('-', '').replace('/', '')

            if not cpf_cnpj_limpo:
                erros_validacao.append({"mensagem": "Cadastro sem CPF/CNPJ informado.", "dados_cadastro": cadastro_csv.model_dump()})
                continue

            cursor.execute("SELECT *, DATE_FORMAT(criado_em, '%Y-%m-%dT%H:%i:%S') as criado_em FROM cadastros WHERE cpf_cnpj = %s", (cpf_cnpj_limpo,))
            existente_db = cursor.fetchone()

            if existente_db:
                # Remover campos gerados do existente para comparação mais limpa
                existente_comparacao = {k: v for k, v in existente_db.items() if k not in ["id", "criado_em"]}
                conflitos.append({"original": existente_comparacao, "novo": cadastro_dict})
            else:
                novos.append(cadastro_dict)

        return {"conflitos": conflitos, "novos": novos, "erros": erros_validacao}

    except mysql.connector.Error as err:
        print(f"Erro de banco de dados: {err}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro ao validar cadastros: {str(err)}")
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


@router.post("/cadastros/importar_csv_confirmado")
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
            
            for idx_no_lote, cadastro_csv in enumerate(lote_registros):
                linha_global = i + idx_no_lote + 1 # Para mensagens de erro mais claras
                try:
                    # cadastro_dict = cadastro_csv.dict(exclude_unset=True) # Pydantic v1
                    cadastro_dict = cadastro_csv.model_dump(exclude_unset=True, exclude_none=True) # Pydantic v2, exclude_none para não sobrescrever com None
                    
                    cpf_cnpj_limpo = (cadastro_dict.get("cpf_cnpj") or '').strip().replace('.', '').replace('-', '').replace('/', '')
                    cep_limpo = (cadastro_dict.get("cep") or '').strip().replace('-', '')
                    complemento_tratado = (cadastro_dict.get("complemento") or '')[:60] # Limite do campo na NFe é 60

                    if not cpf_cnpj_limpo:
                        erros_importacao.append({"linha": linha_global, "erro": "CPF/CNPJ não informado.", "dados": cadastro_csv.model_dump()})
                        continue

                    # Valores padrão para novos campos se não vierem do CSV
                    indicador_ie_val = cadastro_dict.get("indicador_ie", '9')
                    pais_val = cadastro_dict.get("pais", 'Brasil')
                    codigo_pais_val = cadastro_dict.get("codigo_pais", '1058')
                    codigo_ibge_val = cadastro_dict.get("codigo_ibge_cidade")


                    cursor.execute("SELECT id FROM cadastros WHERE cpf_cnpj = %s", (cpf_cnpj_limpo,))
                    existente = cursor.fetchone()

                    if existente:
                        # UPDATE
                        update_query = """
                            UPDATE cadastros SET
                            nome_razao=%s, fantasia=%s, tipo_pessoa=%s, tipo_cadastro=%s, telefone=%s, celular=%s, email=%s, 
                            rg_ie=%s, logradouro=%s, numero=%s, complemento=%s, bairro=%s, cep=%s, cidade=%s, estado=%s, 
                            regiao=%s, situacao=%s, codigo_ibge_cidade=%s, pais=%s, codigo_pais=%s, indicador_ie=%s
                            WHERE id = %s
                        """
                        update_values = (
                            cadastro_dict.get("nome_razao"), cadastro_dict.get("fantasia"), cadastro_dict.get("tipo_pessoa"),
                            cadastro_dict.get("tipo_cadastro"), cadastro_dict.get("telefone"), cadastro_dict.get("celular"),
                            cadastro_dict.get("email"), cadastro_dict.get("rg_ie"),
                            cadastro_dict.get("logradouro"), cadastro_dict.get("numero"), complemento_tratado,
                            cadastro_dict.get("bairro"), cep_limpo, cadastro_dict.get("cidade"), cadastro_dict.get("estado"),
                            cadastro_dict.get("regiao"), cadastro_dict.get("situacao"), codigo_ibge_val,
                            pais_val, codigo_pais_val, indicador_ie_val,
                            existente["id"]
                        )
                        cursor.execute(update_query, update_values)
                        atualizados_count += 1
                    else:
                        # INSERT
                        insert_query = """
                            INSERT INTO cadastros (
                                nome_razao, fantasia, tipo_pessoa, tipo_cadastro, telefone, celular, email, cpf_cnpj, rg_ie,
                                logradouro, numero, complemento, bairro, cep, cidade, estado, regiao, situacao,
                                codigo_ibge_cidade, pais, codigo_pais, indicador_ie
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                        """
                        insert_values = (
                            cadastro_dict.get("nome_razao"), cadastro_dict.get("fantasia"), cadastro_dict.get("tipo_pessoa"),
                            cadastro_dict.get("tipo_cadastro"), cadastro_dict.get("telefone"), cadastro_dict.get("celular"),
                            cadastro_dict.get("email"), cpf_cnpj_limpo, cadastro_dict.get("rg_ie"),
                            cadastro_dict.get("logradouro"), cadastro_dict.get("numero"), complemento_tratado,
                            cadastro_dict.get("bairro"), cep_limpo, cadastro_dict.get("cidade"), cadastro_dict.get("estado"),
                            cadastro_dict.get("regiao"), cadastro_dict.get("situacao"), codigo_ibge_val,
                            pais_val, codigo_pais_val, indicador_ie_val
                        )
                        cursor.execute(insert_query, insert_values)
                        inseridos_count +=1
                    
                    sucessos_count += 1

                except mysql.connector.Error as db_err:
                    conn.rollback() # Rollback para este item específico do lote
                    print(f"Erro DB na linha {linha_global} (CPF/CNPJ: {cadastro_dict.get('cpf_cnpj', 'N/A')}): {db_err}")
                    erros_importacao.append({"linha": linha_global, "erro": f"Erro no banco: {db_err.msg}", "dados": cadastro_csv.model_dump()})
                except Exception as e:
                    conn.rollback()
                    print(f"Erro geral na linha {linha_global} (CPF/CNPJ: {cadastro_dict.get('cpf_cnpj', 'N/A')}): {e}")
                    erros_importacao.append({"linha": linha_global, "erro": str(e), "dados": cadastro_csv.model_dump()})
            
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
        raise HTTPException(status_code=500, detail=f"Erro crítico ao importar cadastros: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@router.get("/cadastros_dropdown")
async def listar_cadastros_dropdown(
    tipo_cadastro: Optional[List[str]] = Query(None) # <--- ALTERADO AQUI
):
    conn = None
    cursor = None
    try:
        conn = pool.get_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = "SELECT id, nome_razao, cpf_cnpj FROM cadastros WHERE situacao = 'Ativo'"
        params = []

        if tipo_cadastro: # Se tipo_cadastro for uma lista (ex: ["Cliente", "Fornecedor"])
            # Constrói a cláusula WHERE para múltiplos valores (ex: "IN ('Cliente', 'Fornecedor')")
            placeholders = ', '.join(['%s'] * len(tipo_cadastro))
            query += f" AND tipo_cadastro IN ({placeholders})"
            params.extend(tipo_cadastro) # Adiciona todos os valores da lista aos parâmetros
        
        query += " ORDER BY nome_razao ASC"

        print(f"DEBUG SQL Query: {query}") # Para depuração no backend
        print(f"DEBUG SQL Params: {params}") # Para depuração no backend

        cursor.execute(query, tuple(params))
        return cursor.fetchall()

    except mysql.connector.Error as err:
        print(f"Erro de banco de dados: {err}")
        raise HTTPException(status_code=500, detail=str(err))
    except Exception as e:
        print(f"Erro inesperado: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erro inesperado no servidor: {str(e)}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
