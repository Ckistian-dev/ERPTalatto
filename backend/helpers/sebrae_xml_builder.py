# /helpers/sebrae_xml_builder.py

import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from lxml import etree
import json
from typing import List, Dict, Any

from models.pedidos_model import Pedido
from models.cadastro_model import Cadastro
from models.produtos_model import Produto
from controllers.empresa_controller import InfoEmpresa
# Importa o modelo de Embalagem para poder consultar as regras
from controllers.embalagem_controller import Embalagem, executar_formula, avaliar_condicao


logger = logging.getLogger(__name__)

def _limpar_numero(texto: str) -> str:
    if not texto: return ""
    return ''.join(filter(str.isdigit, str(texto)))

def _format_decimal(valor, casas=2):
    return f"{Decimal(valor):.{casas}f}"

def _calcular_volumes_do_pedido(db: Session, itens_pedido: list) -> List[Dict[str, Any]]:
    """
    Função auxiliar que replica a lógica do embalagem_controller para calcular
    os volumes de um pedido inteiro e retornar uma lista de volumes para o XML.
    """
    volumes_finais = []
    
    for item in itens_pedido:
        produto_id = item.get("produto_id") or item.get("id")
        quantidade = item.get("quantidade_itens", 0)

        if not produto_id or quantidade <= 0:
            continue

        produto_db = db.query(Produto).filter(Produto.id == produto_id).first()

        if not produto_db:
            logger.warning(f"Produto com ID {produto_id} não encontrado para cálculo de volume.")
            continue

        unidade_caixa = getattr(produto_db, 'unidade_caixa', 0)
        peso_embalagem_g = getattr(produto_db, 'peso_embalagem', 0)
        
        if not unidade_caixa or unidade_caixa <= 0:
            logger.warning(f"Produto SKU {produto_db.sku} com dados de embalagem padrão incompletos ou inválidos.")
            continue

        volumes_cheios = quantidade // unidade_caixa
        quantidade_restante = quantidade % unidade_caixa

        for _ in range(volumes_cheios):
            volumes_finais.append({
                "qVol": 1,
                "esp": "Caixa",
                "marca": "TALATTO",
                "pesoL": float(peso_embalagem_g / 1000.0),
                "pesoB": float(peso_embalagem_g / 1000.0)
            })

        if quantidade_restante > 0:
            peso_proporcional_kg = ((peso_embalagem_g / 1000.0) / unidade_caixa) * quantidade_restante
            volumes_finais.append({
                "qVol": 1,
                "esp": "Caixa Parcial",
                "marca": "TALATTO",
                "pesoL": round(peso_proporcional_kg, 3),
                "pesoB": round(peso_proporcional_kg, 3)
            })

    return volumes_finais


def construir_xml_para_sebrae(db: Session, info_empresa: InfoEmpresa, pedido: Pedido, cliente: Cadastro, itens_pedido: list, pagamentos_pedido: list) -> str:
    """
    Gera uma string XML de uma NF-e, usando os nomes de campo corretos do modelo Cadastro.
    """
    ns = "http://www.portalfiscal.inf.br/nfe"
    NFE = etree.Element("NFe", xmlns=ns)
    infNFe = etree.SubElement(NFE, "infNFe", versao="4.00")

    # --- 1. Bloco de Identificação (ide) ---
    ide = etree.SubElement(infNFe, "ide")
    tz = timezone(timedelta(hours=-3))
    now = datetime.now(tz)
    
    # --- CORREÇÃO APLICADA AQUI ---
    # Gera um código numérico único baseado no tempo para evitar o erro "XML já importado".
    codigo_numerico_aleatorio = now.strftime('%H%M%S%f')[:8]

    etree.SubElement(ide, "cUF").text = "41"
    etree.SubElement(ide, "cNF").text = codigo_numerico_aleatorio
    etree.SubElement(ide, "natOp").text = getattr(pedido, 'natureza_operacao', "Venda de mercadoria")
    etree.SubElement(ide, "mod").text = "55"
    etree.SubElement(ide, "serie").text = "1" # O Sebrae irá ajustar se necessário
    etree.SubElement(ide, "nNF").text = str(pedido.id) # Usa o ID do pedido como número temporário
    etree.SubElement(ide, "dhEmi").text = now.isoformat(timespec='seconds')
    etree.SubElement(ide, "dhSaiEnt").text = now.isoformat(timespec='seconds')
    etree.SubElement(ide, "tpNF").text = "1"
    etree.SubElement(ide, "idDest").text = "2" if info_empresa.uf != cliente.estado else "1"
    etree.SubElement(ide, "cMunFG").text = _limpar_numero(info_empresa.codigo_municipio_ibge)
    etree.SubElement(ide, "tpImp").text = "1"
    etree.SubElement(ide, "tpEmis").text = "1"
    etree.SubElement(ide, "cDV").text = "0" # O Sebrae irá calcular o dígito verificador correto
    etree.SubElement(ide, "tpAmb").text = "2" if not info_empresa.emissao_em_producao else "1"
    etree.SubElement(ide, "finNFe").text = "1"
    etree.SubElement(ide, "indFinal").text = "1" if cliente.is_consumidor_final else "0"
    etree.SubElement(ide, "indPres").text = "1"
    etree.SubElement(ide, "procEmi").text = "0"
    etree.SubElement(ide, "verProc").text = "1.0"
    
    # --- 2. Bloco do Emitente (emit) ---
    emit = etree.SubElement(infNFe, "emit")
    etree.SubElement(emit, "CNPJ").text = _limpar_numero(info_empresa.cnpj)
    etree.SubElement(emit, "xNome").text = info_empresa.razao_social
    enderEmit = etree.SubElement(emit, "enderEmit")
    etree.SubElement(enderEmit, "xLgr").text = info_empresa.logradouro
    etree.SubElement(enderEmit, "nro").text = info_empresa.numero
    etree.SubElement(enderEmit, "xBairro").text = info_empresa.bairro
    etree.SubElement(enderEmit, "cMun").text = _limpar_numero(info_empresa.codigo_municipio_ibge)
    etree.SubElement(enderEmit, "xMun").text = info_empresa.cidade
    etree.SubElement(enderEmit, "UF").text = info_empresa.uf
    etree.SubElement(enderEmit, "CEP").text = _limpar_numero(info_empresa.cep)
    etree.SubElement(enderEmit, "cPais").text = "1058"
    etree.SubElement(enderEmit, "xPais").text = "Brasil"
    etree.SubElement(emit, "IE").text = _limpar_numero(info_empresa.ie)
    etree.SubElement(emit, "CRT").text = str(info_empresa.crt)

    # --- 3. Bloco do Destinatário (dest) ---
    dest = etree.SubElement(infNFe, "dest")
    cpf_cnpj = _limpar_numero(cliente.cpf_cnpj)
    if len(cpf_cnpj) == 14:
        etree.SubElement(dest, "CNPJ").text = cpf_cnpj
    else:
        etree.SubElement(dest, "CPF").text = cpf_cnpj
    etree.SubElement(dest, "xNome").text = cliente.nome_razao
    enderDest = etree.SubElement(dest, "enderDest")
    etree.SubElement(enderDest, "xLgr").text = cliente.logradouro
    etree.SubElement(enderDest, "nro").text = cliente.numero
    etree.SubElement(enderDest, "xBairro").text = cliente.bairro
    etree.SubElement(enderDest, "cMun").text = _limpar_numero(cliente.codigo_ibge_cidade)
    etree.SubElement(enderDest, "xMun").text = cliente.cidade
    etree.SubElement(enderDest, "UF").text = cliente.estado
    etree.SubElement(enderDest, "CEP").text = _limpar_numero(cliente.cep)
    etree.SubElement(enderDest, "cPais").text = "1058"
    etree.SubElement(enderDest, "xPais").text = "Brasil"
    etree.SubElement(dest, "indIEDest").text = str(cliente.indicador_ie or 9)
    if cliente.email:
        etree.SubElement(dest, "email").text = cliente.email

    # --- 4. Bloco de Itens (det) ---
    vProdTotal = Decimal("0.00")
    vDescTotal = Decimal(getattr(pedido, 'desconto_total', "0.00") or "0.00")
    is_interestadual = info_empresa.uf != cliente.estado
    cfop_padrao = info_empresa.cfop_interestadual if is_interestadual else info_empresa.cfop_interno

    for i, item_do_pedido in enumerate(itens_pedido, 1):
        produto_id = item_do_pedido.get("produto_id") or item_do_pedido.get("id")
        produto_db = db.query(Produto).filter(Produto.id == produto_id).first()
        
        det = etree.SubElement(infNFe, "det", nItem=str(i))
        prod = etree.SubElement(det, "prod")
        
        etree.SubElement(prod, "cProd").text = produto_db.sku
        etree.SubElement(prod, "cEAN").text = _limpar_numero(produto_db.gtin) or "SEM GTIN"
        etree.SubElement(prod, "xProd").text = produto_db.descricao
        etree.SubElement(prod, "NCM").text = _limpar_numero(produto_db.classificacao_fiscal)
        etree.SubElement(prod, "CFOP").text = cfop_padrao
        etree.SubElement(prod, "uCom").text = produto_db.unidade
        
        qtd = Decimal(str(item_do_pedido.get("quantidade_itens", 0)))
        vUnit = Decimal(str(item_do_pedido.get("valor_unitario", 0)))
        vProd = qtd * vUnit
        vProdTotal += vProd

        etree.SubElement(prod, "qCom").text = f"{qtd:.4f}"
        etree.SubElement(prod, "vUnCom").text = f"{vUnit:.10f}"
        etree.SubElement(prod, "vProd").text = _format_decimal(vProd)
        etree.SubElement(prod, "cEANTrib").text = _limpar_numero(produto_db.gtin_tributavel) or "SEM GTIN"
        etree.SubElement(prod, "uTrib").text = produto_db.unidade
        etree.SubElement(prod, "qTrib").text = f"{qtd:.4f}"
        etree.SubElement(prod, "vUnTrib").text = f"{vUnit:.10f}"
        etree.SubElement(prod, "indTot").text = "1"
        
        vDescItem = Decimal(item_do_pedido.get("valor_desconto", "0.00") or "0.00")
        if vDescItem > 0:
            etree.SubElement(prod, "vDesc").text = _format_decimal(vDescItem)

        imposto = etree.SubElement(det, "imposto")
        ICMS = etree.SubElement(imposto, "ICMS")
        if info_empresa.crt == 1:
            ICMSSN = etree.SubElement(ICMS, "ICMSSN")
            etree.SubElement(ICMSSN, "orig").text = "0"
            etree.SubElement(ICMSSN, "CSOSN").text = "102"
        else:
            ICMS00 = etree.SubElement(ICMS, "ICMS00")
            etree.SubElement(ICMS00, "orig").text = "0"
            etree.SubElement(ICMS00, "CST").text = "00"
            etree.SubElement(ICMS00, "modBC").text = "3"
            etree.SubElement(ICMS00, "vBC").text = _format_decimal(vProd)
            etree.SubElement(ICMS00, "pICMS").text = "0.00"
            etree.SubElement(ICMS00, "vICMS").text = "0.00"
        PIS = etree.SubElement(imposto, "PIS")
        PISNT = etree.SubElement(PIS, "PISNT")
        etree.SubElement(PISNT, "CST").text = "07"
        COFINS = etree.SubElement(imposto, "COFINS")
        COFINSNT = etree.SubElement(COFINS, "COFINSNT")
        etree.SubElement(COFINSNT, "CST").text = "07"

    # --- 5. Bloco de Totais (total) ---
    vFrete = Decimal(getattr(pedido, 'valor_frete', "0.00") or "0.00")
    vSeg = Decimal(getattr(pedido, 'valor_seguro', "0.00") or "0.00")
    vOutro = Decimal(getattr(pedido, 'outras_despesas', "0.00") or "0.00")
    vNF = vProdTotal - vDescTotal + vFrete + vSeg + vOutro

    total = etree.SubElement(infNFe, "total")
    ICMSTot = etree.SubElement(total, "ICMSTot")
    etree.SubElement(ICMSTot, "vBC").text = "0.00"
    etree.SubElement(ICMSTot, "vICMS").text = "0.00"
    etree.SubElement(ICMSTot, "vICMSDeson").text = "0.00"
    etree.SubElement(ICMSTot, "vFCP").text = "0.00"
    etree.SubElement(ICMSTot, "vBCST").text = "0.00"
    etree.SubElement(ICMSTot, "vST").text = "0.00"
    etree.SubElement(ICMSTot, "vFCPST").text = "0.00"
    etree.SubElement(ICMSTot, "vFCPSTRet").text = "0.00"
    etree.SubElement(ICMSTot, "vProd").text = _format_decimal(vProdTotal)
    etree.SubElement(ICMSTot, "vFrete").text = _format_decimal(vFrete)
    etree.SubElement(ICMSTot, "vSeg").text = _format_decimal(vSeg)
    etree.SubElement(ICMSTot, "vDesc").text = _format_decimal(vDescTotal)
    etree.SubElement(ICMSTot, "vII").text = "0.00"
    etree.SubElement(ICMSTot, "vIPI").text = "0.00"
    etree.SubElement(ICMSTot, "vIPIDevol").text = "0.00"
    etree.SubElement(ICMSTot, "vPIS").text = "0.00"
    etree.SubElement(ICMSTot, "vCOFINS").text = "0.00"
    etree.SubElement(ICMSTot, "vOutro").text = _format_decimal(vOutro)
    etree.SubElement(ICMSTot, "vNF").text = _format_decimal(vNF)

    # --- 6. Bloco de Transporte (transp) ---
    transp = etree.SubElement(infNFe, "transp")
    etree.SubElement(transp, "modFrete").text = str(getattr(pedido, 'modalidade_frete', 9))
    
    if getattr(pedido, 'transportadora_cnpj', None):
        transporta = etree.SubElement(transp, "transporta")
        etree.SubElement(transporta, "CNPJ").text = _limpar_numero(getattr(pedido, 'transportadora_cnpj'))
        etree.SubElement(transporta, "xNome").text = getattr(pedido, 'transportadora_nome', '')
        etree.SubElement(transporta, "IE").text = _limpar_numero(getattr(pedido, 'transportadora_ie', ''))
        etree.SubElement(transporta, "xEnder").text = getattr(pedido, 'transportadora_endereco', '')
        etree.SubElement(transporta, "xMun").text = getattr(pedido, 'transportadora_cidade', '')
        etree.SubElement(transporta, "UF").text = getattr(pedido, 'transportadora_uf', '')

    if getattr(pedido, 'veiculo_placa', None):
        veicTransp = etree.SubElement(transp, "veicTransp")
        etree.SubElement(veicTransp, "placa").text = getattr(pedido, 'veiculo_placa')
        etree.SubElement(veicTransp, "UF").text = getattr(pedido, 'veiculo_uf')

    volumes = _calcular_volumes_do_pedido(db, itens_pedido)
    if volumes:
        vol = etree.SubElement(transp, "vol")
        peso_bruto_total = sum(v['pesoB'] for v in volumes)
        peso_liquido_total = sum(v['pesoL'] for v in volumes)
        
        etree.SubElement(vol, "qVol").text = str(len(volumes))
        etree.SubElement(vol, "esp").text = "Caixas"
        etree.SubElement(vol, "marca").text = "TALATTO"
        etree.SubElement(vol, "pesoL").text = _format_decimal(peso_liquido_total, 3)
        etree.SubElement(vol, "pesoB").text = _format_decimal(peso_bruto_total, 3)

    # --- 7. Bloco de Pagamento (pag) ---
    pag = etree.SubElement(infNFe, "pag")
    mapa_pagamento = {
        "Dinheiro": "01", "Pix": "17", "Boleto": "15", 
        "Parcelamento": "03", "Credit_card": "03" # Mapeia ambos para Cartão de Crédito
    }
    
    total_a_prazo = Decimal("0.00")
    parcelas_info = []

    for pag_db in pagamentos_pedido:
        tipo = pag_db.get("tipo")
        if tipo:
            detPag = etree.SubElement(pag, "detPag")
            etree.SubElement(detPag, "tPag").text = mapa_pagamento.get(tipo, "99")

            valor_pago = Decimal("0.00")
            if tipo in ["Parcelamento", "Credit_card"]:
                parcelas = int(pag_db.get("parcelas", 1))
                valor_parcela = Decimal(str(pag_db.get("valor_parcela", 0)))
                valor_pago = valor_parcela * parcelas
                total_a_prazo += valor_pago
                
                for i in range(1, parcelas + 1):
                    vencimento = datetime.now() + timedelta(days=30 * i)
                    parcelas_info.append({
                        "nDup": f"{pedido.id}-{i}",
                        "dVenc": vencimento.strftime('%Y-%m-%d'),
                        "vDup": _format_decimal(valor_parcela)
                    })
            else:
                # Busca o valor em chaves como 'valor_pix', 'valor_boleto', etc.
                valor_pago = Decimal(str(pag_db.get(f"valor_{tipo.lower()}", 0) or 0))

            etree.SubElement(detPag, "vPag").text = _format_decimal(valor_pago)
    
    # --- 7.1 Bloco de Cobrança (cobr) para parcelamentos ---
    if total_a_prazo > 0:
        cobr = etree.SubElement(infNFe, "cobr")
        fat = etree.SubElement(cobr, "fat")
        etree.SubElement(fat, "nFat").text = str(pedido.id)
        etree.SubElement(fat, "vOrig").text = _format_decimal(total_a_prazo)
        etree.SubElement(fat, "vDesc").text = "0.00"
        etree.SubElement(fat, "vLiq").text = _format_decimal(total_a_prazo)
        
        for info in parcelas_info:
            dup = etree.SubElement(cobr, "dup")
            etree.SubElement(dup, "nDup").text = info["nDup"]
            etree.SubElement(dup, "dVenc").text = info["dVenc"]
            etree.SubElement(dup, "vDup").text = info["vDup"]

    # --- 8. Informações Adicionais ---
    infAdic = etree.SubElement(infNFe, "infAdic")
    etree.SubElement(infAdic, "infCpl").text = f"Pedido: {pedido.id}. {pedido.observacao or ''}".strip()

    chave_provisoria = f"NFe{ide.find('cUF').text}{now.strftime('%y%m')}{emit.find('CNPJ').text}{ide.find('mod').text}{ide.find('serie').text.zfill(3)}{ide.find('nNF').text.zfill(9)}{ide.find('tpEmis').text}{ide.find('cNF').text}0"
    infNFe.set("Id", chave_provisoria)

    return etree.tostring(NFE, pretty_print=True, xml_declaration=True, encoding='UTF-8').decode('utf-8')
