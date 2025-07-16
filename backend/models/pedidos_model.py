# /models/pedidos_model.py

from sqlalchemy import Column, Integer, String, DateTime, Numeric, Text
from config.database import Base
from datetime import datetime

class Pedido(Base):
    """
    Modelo SQLAlchemy completo para a tabela 'pedidos', incluindo os campos
    originais e os novos campos para a emissão de NF-e via PyNFe.
    """
    __tablename__ = 'pedidos'

    # --- CAMPOS ORIGINAIS DO SEU SISTEMA ---
    id = Column(Integer, primary_key=True, index=True)
    situacao_pedido = Column(String(100))
    data_emissao = Column(DateTime, default=datetime.utcnow)
    data_validade = Column(DateTime, nullable=True)
    cliente_id = Column(Integer, index=True)
    cliente_nome = Column(String(255))
    vendedor_id = Column(Integer, index=True, nullable=True)
    vendedor_nome = Column(String(255), nullable=True)
    origem_venda = Column(String(100), nullable=True)
    tipo_frete = Column(String(100), nullable=True)
    transportadora_id = Column(Integer, nullable=True)
    transportadora_nome = Column(String(255), nullable=True)
    valor_frete = Column(Numeric(10, 2), default=0.00)
    total = Column(Numeric(10, 2))
    desconto_total = Column(Numeric(10, 2), default=0.00)
    total_com_desconto = Column(Numeric(10, 2))
    lista_itens = Column(Text) # Armazena o JSON dos itens como texto
    formas_pagamento = Column(Text) # Armazena o JSON dos pagamentos como texto
    data_finalizacao = Column(DateTime, nullable=True)
    ordem_finalizacao = Column(Integer, nullable=True)
    observacao = Column(Text, nullable=True)
    criado_em = Column(DateTime, default=datetime.utcnow)
    
    # --- NOVOS CAMPOS PARA EMISSÃO DIRETA COM PyNFe ---
    nfe_chave = Column(String(44), index=True, nullable=True, comment="Chave de acesso da NF-e autorizada")
    nfe_status = Column(String(50), nullable=True, comment="Status do processo: AGUARDANDO_CONSULTA, AUTORIZADO, etc.")
    numero_nf = Column(Integer, nullable=True, comment="Número da NF-e autorizada")
    serie_nfe = Column(Integer, nullable=True, comment="Série da NF-e")
    nfe_recibo = Column(String(50), nullable=True, comment="Número do recibo do lote enviado à SEFAZ")
    nfe_protocolo = Column(String(50), nullable=True, comment="Número do protocolo de autorização da SEFAZ")
    nfe_data_autorizacao = Column(DateTime, nullable=True, comment="Data e hora da autorização")
    nfe_rejeicao_motivo = Column(Text, nullable=True, comment="Motivo completo da rejeição, caso ocorra")
    nfe_xml_path = Column(String(255), nullable=True, comment="Caminho para o arquivo XML autorizado armazenado")
    nfe_danfe_path = Column(String(255), nullable=True, comment="Caminho para o arquivo PDF do DANFE armazenado")

