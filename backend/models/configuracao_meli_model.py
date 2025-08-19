from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from config.database import Base

class MeliConfiguracao(Base):
    """
    Modelo SQLAlchemy para armazenar as configurações da integração
    com o Mercado Livre no banco de dados.
    """
    __tablename__ = "meli_configuracoes"

    # Chave primária da tabela, com um valor padrão de 1 para garantir uma única linha.
    id = Column(Integer, primary_key=True, default=1)
    
    # Configuração para o aceite automático de pedidos. O padrão é 'False'.
    aceite_automatico_pedidos = Column(Boolean, default=False)
    
    # ID do cliente padrão no seu ERP para cadastrar compradores novos do ML.
    cliente_padrao_id = Column(Integer)
    
    # ID do vendedor padrão no seu ERP para associar às vendas do ML.
    vendedor_padrao_id = Column(Integer)
    
    # Situação padrão para um pedido do ML quando importado para o ERP.
    situacao_pedido_inicial = Column(String(100), default='Aguardando Faturamento')
    
    # Data da última atualização, preenchida e atualizada automaticamente pelo banco.
    atualizado_em = Column(DateTime, default=func.now(), onupdate=func.now())
