DROP TABLE IF EXISTS info_empresa;

CREATE TABLE info_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    -- Dados da Empresa
    cnpj VARCHAR(14) NULL,
    razao_social VARCHAR(255) NULL,
    nome_fantasia VARCHAR(255) NULL,
    ie VARCHAR(20) NULL,
    im VARCHAR(20) NULL,
    -- Endereço
    logradouro VARCHAR(255) NULL,
    numero VARCHAR(20) NULL,
    complemento VARCHAR(255) NULL,
    bairro VARCHAR(100) NULL,
    codigo_municipio_ibge VARCHAR(10) NULL,
    cidade VARCHAR(100) NULL,
    uf VARCHAR(2) NULL,
    cep VARCHAR(8) NULL,
    -- Tributário
    cnae VARCHAR(10) NULL,
    crt INT NULL,
    -- Configurações de Emissão
    emissao_em_producao BOOLEAN DEFAULT FALSE,
    pynfe_uf VARCHAR(2) NULL,
    -- Responsável Técnico
    resp_tec_cnpj VARCHAR(14) NULL,
    resp_tec_contato VARCHAR(255) NULL,
    resp_tec_email VARCHAR(255) NULL,
    resp_tec_fone VARCHAR(20) NULL,
    -- Timestamps
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insere uma linha inicial com os dados do seu .env
INSERT INTO info_empresa (
    cnpj, razao_social, nome_fantasia, ie, im, cnae, crt, 
    logradouro, numero, complemento, bairro, codigo_municipio_ibge, cidade, uf, cep, 
    emissao_em_producao, pynfe_uf,
    resp_tec_cnpj, resp_tec_contato, resp_tec_email, resp_tec_fone
) VALUES (
    '29987353000109', 'TALATTO INDUSTRIA E COMERCIO LTDA', 'TALATTO INDUSTRIA E COMERCIO LTDA', '9088814603', '986272', '2229399', 1,
    'R ALBERTO DALCANALE', '3103', 'AO LADO DA TWR TRANSPORTADORA', 'JARDIM ANAPOLIS', '4127700', 'TOLEDO', 'PR', '85905415',
    FALSE, 'PR',
    '12345678000199', 'Nome Sobrenome', 'contato@minhaempresa.com', '45912345678'
);

COMMIT;