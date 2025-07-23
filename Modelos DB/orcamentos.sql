CREATE TABLE IF NOT EXISTS orcamentos (
    -- Chave Primária
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Dados Gerais do Pedido/Orçamento
    situacao_pedido VARCHAR(50) NOT NULL DEFAULT 'Em Aberto',
    data_emissao DATE NOT NULL,
    data_validade DATE,
    
    -- Dados do Cliente
    cliente_id INT,
    cliente_nome VARCHAR(255),
    
    -- Dados do Vendedor
    vendedor_id INT,
    vendedor_nome VARCHAR(255),
    
    -- Dados de Venda e Frete
    origem_venda VARCHAR(100),
    tipo_frete VARCHAR(100),
    transportadora_id INT,
    transportadora_nome VARCHAR(255),
    
    -- Valores Monetários
    valor_frete DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) DEFAULT 0.00,
    desconto_total DECIMAL(10, 2) DEFAULT 0.00,
    total_com_desconto DECIMAL(10, 2) DEFAULT 0.00,

    -- Dados Complexos (armazenados como JSON)
    lista_itens LONGTEXT,
    formas_pagamento LONGTEXT,
    endereco_expedicao TEXT,
    
    -- Observações e Timestamps
    observacao TEXT,
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    data_finalizacao DATETIME,

    -- Dados de Expedição e Finalização
    ordem_finalizacao DECIMAL(10, 2),
    hora_expedicao TIME,
    usuario_expedicao VARCHAR(100),
    
    -- Dados da Nota Fiscal Eletrônica (NF-e)
    natureza_operacao VARCHAR(255),
    numero_nf VARCHAR(20),
    serie_nfe VARCHAR(5),
    data_nf DATE,
    nfe_chave VARCHAR(44) UNIQUE, -- A chave da NF-e é única
    nfe_status VARCHAR(100),
    nfe_recibo VARCHAR(50),
    nfe_protocolo VARCHAR(50),
    nfe_data_autorizacao DATETIME,
    nfe_rejeicao_motivo TEXT,
    nfe_xml_path VARCHAR(512),
    nfe_danfe_path VARCHAR(512),

    -- Índices para otimizar buscas (opcional, mas recomendado)
    INDEX idx_cliente_id (cliente_id),
    INDEX idx_data_emissao (data_emissao),
    INDEX idx_nfe_chave (nfe_chave)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;