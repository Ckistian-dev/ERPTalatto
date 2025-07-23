CREATE TABLE regras_tributarias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    descricao VARCHAR(255) NOT NULL,
    natureza_operacao VARCHAR(100) NOT NULL,
    cfop VARCHAR(4) NOT NULL,
    
    -- Condições da Regra
    uf_origem VARCHAR(2) NOT NULL,
    uf_destino VARCHAR(2) NOT NULL,
    
    -- Resultados da Regra (Impostos)
    icms_csosn VARCHAR(3) NULL,
    icms_cst VARCHAR(2) NULL,
    icms_aliquota DECIMAL(5, 2) DEFAULT 0.00,
    icms_base_calculo DECIMAL(5, 2) DEFAULT 100.00,
    
    pis_cst VARCHAR(2) NULL,
    pis_aliquota DECIMAL(5, 2) DEFAULT 0.00,
    
    cofins_cst VARCHAR(2) NULL,
    cofins_aliquota DECIMAL(5, 2) DEFAULT 0.00,

    ipi_cst VARCHAR(2) NULL,
    ipi_aliquota DECIMAL(5, 2) DEFAULT 0.00,

    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);