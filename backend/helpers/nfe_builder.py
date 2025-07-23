# /helpers/nfe_builder.py

import os
import random
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from sqlalchemy.orm import Session
from pynfe.entidades.cliente import Cliente
from pynfe.entidades.emitente import Emitente
from pynfe.entidades.notafiscal import NotaFiscal
from pynfe.utils.flags import CODIGO_BRASIL

from controllers.empresa_controller import InfoEmpresa
from controllers.regras_controller import RegraTributaria

def formatar_cpf_cnpj(cpf_cnpj: str) -> str:
    if not cpf_cnpj: return ""
    return ''.join(filter(str.isdigit, str(cpf_cnpj)))

def formatar_cep(cep: str) -> str:
    if not cep: return ""
    return ''.join(filter(str.isdigit, str(cep))).zfill(8)[:8]

def buscar_regra_tributaria(db: Session, ncm: str, tipo_cliente: str, uf_origem: str, uf_destino: str, natureza_operacao: str):
    """
    Busca a regra fiscal mais aplicável com um sistema de prioridades.
    """
    filtros_priorizados = [
        {'uf_destino': uf_destino, 'ncm': ncm, 'tipo_cliente': tipo_cliente},
        {'uf_destino': uf_destino, 'ncm': ncm, 'tipo_cliente': None},
        {'uf_destino': uf_destino, 'ncm': None, 'tipo_cliente': tipo_cliente},
        {'uf_destino': uf_destino, 'ncm': None, 'tipo_cliente': None},
        {'uf_destino': '**', 'ncm': ncm, 'tipo_cliente': tipo_cliente},
        {'uf_destino': '**', 'ncm': ncm, 'tipo_cliente': None},
        {'uf_destino': '**', 'ncm': None, 'tipo_cliente': tipo_cliente},
        {'uf_destino': '**', 'ncm': None, 'tipo_cliente': None},
    ]

    for filtro in filtros_priorizados:
        query = db.query(RegraTributaria).filter(
            RegraTributaria.natureza_operacao == natureza_operacao,
            RegraTributaria.uf_origem == uf_origem,
            RegraTributaria.uf_destino == filtro['uf_destino'],
            RegraTributaria.ncm == filtro['ncm'],
            RegraTributaria.tipo_cliente == filtro['tipo_cliente'],
            RegraTributaria.ativo == True
        )
        regra = query.first()
        if regra:
            return regra 

    raise ValueError(f"Nenhuma regra de tributação ativa encontrada para a operação '{natureza_operacao}' (Origem: {uf_origem}, Destino: {uf_destino}, NCM: {ncm}, Cliente: {tipo_cliente}).")

def construir_objetos_pynfe(db: Session, info_empresa: InfoEmpresa, pedido: dict, cliente_db: dict, itens_pedido: list, pagamentos_pedido_db: list) -> NotaFiscal:
    is_homologacao = not info_empresa.emissao_em_producao
    razao_social_ficticia = 'NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL'
    natureza_operacao_pedido = pedido.get("natureza_operacao", "VENDA")

    emitente = Emitente(
        razao_social=razao_social_ficticia if is_homologacao else info_empresa.razao_social,
        nome_fantasia=info_empresa.nome_fantasia,
        cnpj=info_empresa.cnpj,
        codigo_de_regime_tributario=str(info_empresa.crt),
        inscricao_estadual=info_empresa.ie,
        inscricao_municipal=info_empresa.im,
        cnae_fiscal=info_empresa.cnae,
        endereco_logradouro=info_empresa.logradouro,
        endereco_numero=info_empresa.numero,
        endereco_bairro=info_empresa.bairro,
        endereco_municipio=info_empresa.cidade,
        endereco_uf=info_empresa.uf,
        endereco_cep=info_empresa.cep,
        endereco_pais=CODIGO_BRASIL
    )

    cpf_cnpj_dest_formatado = formatar_cpf_cnpj(cliente_db.get("cpf_cnpj", ""))
    cliente_args = {
        'razao_social': razao_social_ficticia if is_homologacao else cliente_db.get("nome_razao", "CONSUMIDOR NAO IDENTIFICADO"),
        'tipo_documento': 'CPF' if len(cpf_cnpj_dest_formatado) == 11 else 'CNPJ',
        'numero_documento': cpf_cnpj_dest_formatado,
        'indicador_ie': int(cliente_db.get("indicador_ie") or 9),
        'email': cliente_db.get("email", ""),
        'endereco_logradouro': cliente_db.get("rua", "Rua Não Informada"),
        'endereco_numero': cliente_db.get("numero", "S/N"),
        'endereco_bairro': cliente_db.get("bairro", "Bairro Não Informado"),
        'endereco_municipio': cliente_db.get("cidade", "Cidade Não Informada"),
        'endereco_uf': cliente_db.get("estado", "XX"),
        'endereco_cep': formatar_cep(cliente_db.get("cep")),
        'endereco_pais': CODIGO_BRASIL,
    }
    if cliente_args['indicador_ie'] == 1:
        ie_valor = ''.join(filter(str.isdigit, str(cliente_db.get("rg_ie") or "")))
        if not ie_valor:
            raise ValueError("Cliente é 'Contribuinte ICMS' mas a Inscrição Estadual não foi informada.")
        cliente_args['inscricao_estadual'] = ie_valor
    
    cliente = Cliente(**cliente_args)

    forma_pagamento_pedido = 0 
    if pagamentos_pedido_db and len(pagamentos_pedido_db) > 1:
        forma_pagamento_pedido = 2
    
    codigo_numerico_cnf = str(random.randint(10000000, 99999999))

    nota_fiscal = NotaFiscal(
       emitente=emitente,
       cliente=cliente,
       uf=info_empresa.pynfe_uf.upper(),
       natureza_operacao=natureza_operacao_pedido,
       forma_pagamento=forma_pagamento_pedido,
       tipo_pagamento=1,
       modelo=55,
       serie=str(pedido.get("serie_nfe", 1)),
       numero_nf=str(pedido.get("numero_nfe", 0)),
       data_emissao=datetime.now(),
       data_saida_entrada=datetime.now(),
       codigo_numerico=codigo_numerico_cnf,
       tipo_documento=1,
       municipio=info_empresa.codigo_municipio_ibge,
       tipo_impressao_danfe=1,
       forma_emissao='1',
       cliente_final=1 if cliente_db.get("is_consumidor_final", True) else 0,
       indicador_destino=1,
       indicador_presencial=1,
       finalidade_emissao='1',
       processo_emissao='0',
       transporte_modalidade_frete=int(pedido.get("modalidade_frete", 9)),
    )
    
    valor_total_tributos_aproximado = Decimal('0.00')
    
    for item_db in itens_pedido:
        ncm_produto = str(item_db.get("classificacao_fiscal") or "").replace(".", "")
        tipo_cliente = 'F' if len(cpf_cnpj_dest_formatado) == 11 else 'J'
        uf_destino_cliente = cliente_db.get("estado", "")
        
        regra_aplicavel = buscar_regra_tributaria(
            db=db, 
            ncm=ncm_produto,
            tipo_cliente=tipo_cliente,
            uf_origem=info_empresa.uf, 
            uf_destino=uf_destino_cliente, 
            natureza_operacao=natureza_operacao_pedido
        )
        
        subtotal_item = (Decimal(str(item_db.get("quantidade_itens", "0"))) * Decimal(str(item_db.get("valor_unitario", "0"))))
        aliquota_ibpt = Decimal(str(item_db.get("ibpt_aliquota") or '0.0'))
        imposto_do_item = subtotal_item * (aliquota_ibpt / Decimal('100.0'))
        valor_total_tributos_aproximado += imposto_do_item
        
        params_tributos = {
            'icms_origem': str(item_db.get("origem") or '0')
        }

        csosn_st = ['201', '202', '203', '500']
        cst_st = ['10', '30', '70', '90']
        
        is_st_simples = info_empresa.crt == 1 and regra_aplicavel.icms_csosn in csosn_st
        is_st_normal = info_empresa.crt != 1 and regra_aplicavel.icms_cst in cst_st
        
        if (is_st_simples or is_st_normal) and regra_aplicavel.icms_mva_st is not None and regra_aplicavel.icms_aliquota_st is not None:
            params_tributos['icms_csosn'] = regra_aplicavel.icms_csosn if is_st_simples else None
            params_tributos['icms_modalidade'] = regra_aplicavel.icms_cst if is_st_normal else regra_aplicavel.icms_csosn
            
            bc_proprio = subtotal_item * (Decimal(str(regra_aplicavel.icms_base_calculo)) / 100)
            icms_proprio = bc_proprio * (Decimal(str(regra_aplicavel.icms_aliquota)) / 100)
            
            # --- CORREÇÃO APLICADA AQUI ---
            # O nome da variável foi padronizado para 'bc_st'
            bc_st = subtotal_item * (1 + (Decimal(str(regra_aplicavel.icms_mva_st)) / 100))
            if regra_aplicavel.icms_reducao_bc_st:
                bc_st *= (1 - (Decimal(str(regra_aplicavel.icms_reducao_bc_st)) / 100))
            
            icms_st_total = (bc_st * (Decimal(str(regra_aplicavel.icms_aliquota_st)) / 100)) - icms_proprio
            # -------------------------------
            
            icms_st_total = max(icms_st_total, Decimal('0.00'))

            params_tributos['icms_modalidade_st'] = regra_aplicavel.icms_modalidade_st or '4'
            params_tributos['icms_percentual_mva_st'] = regra_aplicavel.icms_mva_st
            params_tributos['icms_reducao_base_calculo_st'] = regra_aplicavel.icms_reducao_bc_st
            params_tributos['icms_valor_base_calculo_st'] = bc_st.quantize(Decimal('0.01'))
            params_tributos['icms_aliquota_st'] = regra_aplicavel.icms_aliquota_st
            params_tributos['icms_valor_st'] = icms_st_total.quantize(Decimal('0.01'))
        else:
            if info_empresa.crt == 1:
                params_tributos['icms_modalidade'] = regra_aplicavel.icms_csosn
                params_tributos['icms_csosn'] = regra_aplicavel.icms_csosn
            else:
                params_tributos['icms_modalidade'] = regra_aplicavel.icms_cst

        nota_fiscal.adicionar_produto_servico(
            codigo=str(item_db.get("sku", "")),
            descricao=razao_social_ficticia if is_homologacao else item_db.get("descricao", "Produto sem descrição"),
            ncm=ncm_produto,
            cfop=regra_aplicavel.cfop,
            unidade_comercial=item_db.get("unidade", "UN"),
            ean=item_db.get("gtin") or 'SEM GTIN',
            ean_tributavel=item_db.get("gtin_tributavel") or 'SEM GTIN',
            quantidade_comercial=Decimal(str(item_db.get("quantidade_itens", "0"))),
            valor_unitario_comercial=Decimal(str(item_db.get("valor_unitario", "0"))),
            valor_total_bruto=subtotal_item.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            unidade_tributavel=item_db.get("unidade", "UN"),
            quantidade_tributavel=Decimal(str(item_db.get("quantidade_itens", "0"))),
            valor_unitario_tributavel=Decimal(str(item_db.get("valor_unitario", "0"))),
            ind_total=1,
            pis_modalidade=regra_aplicavel.pis_cst,
            cofins_modalidade=regra_aplicavel.cofins_cst,
            valor_tributos_aprox=imposto_do_item.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
            **params_tributos
        )

    valor_total_tributos_formatado = valor_total_tributos_aproximado.quantize(Decimal('0.01'))
    nota_fiscal.totais_tributos_aproximado = valor_total_tributos_formatado
    
    mensagem_ibpt = f"Valor Aprox. Tributos R$ {valor_total_tributos_formatado} Fonte: IBPT"
    info_adicionais_existente = pedido.get("info_contribuinte", f"Pedido: {pedido['id']}")
    nota_fiscal.informacoes_adicionais_interesse_fisco = f"{info_adicionais_existente} | {mensagem_ibpt}".strip()

    if info_empresa.resp_tec_cnpj:
        nota_fiscal.adicionar_responsavel_tecnico(
            cnpj=info_empresa.resp_tec_cnpj,
            contato=info_empresa.resp_tec_contato,
            email=info_empresa.resp_tec_email,
            fone=info_empresa.resp_tec_fone
        )

    return nota_fiscal
