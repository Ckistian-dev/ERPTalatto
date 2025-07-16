# /helpers/nfe_builder.py

import os
import random  # Importado para gerar o código aleatório
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from pynfe.entidades.cliente import Cliente
from pynfe.entidades.emitente import Emitente
from pynfe.entidades.notafiscal import NotaFiscal
from pynfe.utils.flags import CODIGO_BRASIL

def formatar_cep(cep: str) -> str:
    if not cep: return ""
    return ''.join(filter(str.isdigit, str(cep))).zfill(8)[:8]

def formatar_cpf_cnpj(cpf_cnpj: str) -> str:
    if not cpf_cnpj: return ""
    return ''.join(filter(str.isdigit, str(cpf_cnpj)))

def construir_objetos_pynfe(pedido: dict, cliente_db: dict, itens_pedido: list, pagamentos_pedido_db: list) -> NotaFiscal:
    """
    Constrói o objeto NotaFiscal completo, incluindo o código numérico (cNF),
    seguindo o padrão da documentação oficial da PyNFe.
    """
    # 1. Configurar o Emitente
    emitente = Emitente(
        razao_social='NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' if os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() != "true" else os.getenv("EMIT_RAZAO_SOCIAL"),
        nome_fantasia=os.getenv("EMIT_NOME_FANTASIA"),
        cnpj=formatar_cpf_cnpj(os.getenv("EMIT_CNPJ")),
        codigo_de_regime_tributario=os.getenv("EMIT_CRT", '1'),
        inscricao_estadual=os.getenv("EMIT_IE"),
        inscricao_municipal=os.getenv("EMIT_IM"),
        cnae_fiscal=os.getenv("EMIT_CNAE"),
        endereco_logradouro=os.getenv("EMIT_LOGRADOURO"),
        endereco_numero=os.getenv("EMIT_NUMERO"),
        endereco_bairro=os.getenv("EMIT_BAIRRO"),
        endereco_municipio=os.getenv("EMIT_CIDADE"),
        endereco_uf=os.getenv("EMIT_UF"),
        endereco_cep=formatar_cep(os.getenv("EMIT_CEP")),
        endereco_pais=CODIGO_BRASIL
    )

    # 2. Configurar o Cliente (Destinatário)
    cpf_cnpj_dest_formatado = formatar_cpf_cnpj(cliente_db.get("cpf_cnpj", ""))
    cliente = Cliente(
        razao_social='NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' if os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() != "true" else cliente_db.get("nome_razao", "CONSUMIDOR NAO IDENTIFICADO"),
        tipo_documento='CPF' if len(cpf_cnpj_dest_formatado) == 11 else 'CNPJ',
        numero_documento=cpf_cnpj_dest_formatado,
        indicador_ie=str(cliente_db.get("indicador_ie", "9")),
        inscricao_estadual=cliente_db.get("rg_ie", "") if str(cliente_db.get("indicador_ie", "9")) == "1" else None,
        email=cliente_db.get("email", ""),
        endereco_logradouro=cliente_db.get("rua", "Rua Não Informada"),
        endereco_numero=cliente_db.get("numero", "S/N"),
        endereco_bairro=cliente_db.get("bairro", "Bairro Não Informado"),
        endereco_municipio=cliente_db.get("cidade", "Cidade Não Informada"),
        endereco_uf=cliente_db.get("estado", "XX"),
        endereco_cep=formatar_cep(cliente_db.get("cep")),
        endereco_pais=CODIGO_BRASIL
    )

    # 3. Define a forma de pagamento geral (simplificado)
    forma_pagamento_pedido = 0 # 0=A Vista, 1=A Prazo, 2=Outros
    if pagamentos_pedido_db and len(pagamentos_pedido_db) > 1:
        forma_pagamento_pedido = 2
    
    # 4. Gera o Código Numérico (cNF) aleatório de 8 dígitos
    codigo_numerico_cnf = str(random.randint(10000000, 99999999))

    # 5. Cria o objeto principal da Nota Fiscal
    nota_fiscal = NotaFiscal(
       emitente=emitente,
       cliente=cliente,
       uf=os.getenv("EMIT_UF").upper(),
       natureza_operacao=pedido.get("natureza_operacao", "VENDA DE MERCADORIA"),
       forma_pagamento=forma_pagamento_pedido,
       modelo=55,
       serie=str(pedido.get("serie_nfe", 1)),
       numero_nf=str(pedido.get("numero_nfe", 0)),
       data_emissao=datetime.now(),
       data_saida_entrada=datetime.now(),
       codigo_numerico=codigo_numerico_cnf,
       tipo_documento=1, # 0=entrada; 1=saida
       municipio=os.getenv("EMIT_CODIGO_MUNICIPIO_IBGE"),
       tipo_impressao_danfe=1, # 1=DANFE normal, Retrato;
       forma_emissao='1', # 1=Emissão normal
       cliente_final=1 if cliente_db.get("is_consumidor_final", True) else 0,
       finalidade_emissao='1', # 1=NF-e normal
       indicador_presencial=1, # 1=Operação presencial
       informacoes_adicionais_interesse_fisco=pedido.get("info_fisco", ""),
       transporte_modalidade_frete=int(pedido.get("modalidade_frete", 9)),
    )
    
    # 6. Adiciona os produtos e seus tributos à nota fiscal
    for item_db in itens_pedido:
        nota_fiscal.adicionar_produto_servico(
            codigo=str(item_db.get("produto_id_ou_codigo_interno", f"PROD_{item_db.get('produto_id','UNK')}")),
            descricao='NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL' if os.getenv("EMISSAO_EM_PRODUCAO", "false").lower() != "true" else item_db.get("produto", "Produto sem descrição"),
            ncm=str(item_db.get("ncm", "00000000")).replace(".", ""),
            cfop=str(item_db.get("cfop", "5102")),
            unidade_comercial='UN',
            ean='SEM GTIN',
            ean_tributavel='SEM GTIN',
            quantidade_comercial=Decimal(str(item_db.get("quantidade_itens", "0"))),
            valor_unitario_comercial=Decimal(str(item_db.get("valor_unitario", "0"))),
            valor_total_bruto=(Decimal(str(item_db.get("quantidade_itens", "0"))) * Decimal(str(item_db.get("valor_unitario", "0")))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            unidade_tributavel='UN',
            quantidade_tributavel=Decimal(str(item_db.get("quantidade_itens", "0"))),
            valor_unitario_tributavel=Decimal(str(item_db.get("valor_unitario", "0"))),
            ind_total=1,
            icms_origem=str(item_db.get("icms_origem", os.getenv("ITEM_ICMS_ORIGEM_PADRAO", "0"))),
            icms_csosn=str(item_db.get("icms_csosn", os.getenv("ITEM_ICMS_CSOSN_PADRAO", "102"))) if os.getenv("EMIT_CRT") == '1' else None,
            icms_modalidade=str(item_db.get("icms_cst", os.getenv("ITEM_ICMS_CST_PADRAO", "00"))) if os.getenv("EMIT_CRT") != '1' else None,
            pis_modalidade=str(item_db.get("pis_cst", os.getenv("ITEM_PIS_CST_PADRAO", "07"))),
            cofins_modalidade=str(item_db.get("cofins_cst", os.getenv("ITEM_COFINS_CST_PADRAO", "07"))),
        )

    return nota_fiscal
