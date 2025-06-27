CREATE TABLE cadastros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome_razao VARCHAR(100) NOT NULL,
    fantasia VARCHAR(100) NULL,
    tipo_pessoa VARCHAR(20) NOT NULL,
    tipo_cadastro VARCHAR(20) NOT NULL,
    telefone VARCHAR(20) NULL,
    celular VARCHAR(20) NULL,
    email VARCHAR(100) NOT NULL,
    cpf_cnpj VARCHAR(20) NULL UNIQUE, -- Considerar NULL se não for sempre obrigatório ou se PF não tiver CNPJ e vice-versa
    rg_ie VARCHAR(30) NULL,           -- Aumentado para acomodar IE mais longas
    
    logradouro VARCHAR(100) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(60) NULL,    -- Ajustado para 60, conforme NFe
    bairro VARCHAR(60) NOT NULL,     -- Aumentado um pouco
    cep VARCHAR(10) NOT NULL,        -- Armazenar apenas números (8 dígitos)
    cidade VARCHAR(60) NOT NULL,     -- Aumentado um pouco
    estado VARCHAR(2) NOT NULL,      -- UF

    -- Novos campos para NFe e melhorias
    codigo_ibge_cidade VARCHAR(7) NULL, -- Código IBGE do município tem 7 dígitos
    pais VARCHAR(50) DEFAULT 'Brasil',
    codigo_pais VARCHAR(4) DEFAULT '1058', -- Código do país (Brasil)
    indicador_ie VARCHAR(1) DEFAULT '9',   -- 1, 2 ou 9

    regiao VARCHAR(20) NULL,
    situacao VARCHAR(20) NOT NULL DEFAULT 'Ativo',

    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_nome_razao (nome_razao),
    INDEX idx_tipo_cadastro (tipo_cadastro),
    INDEX idx_situacao (situacao)
    -- Outros índices podem ser adicionados conforme a necessidade de consulta
);

-- Comentários sobre a tabela:
-- - `cpf_cnpj` é UNIQUE. Se for opcional no seu sistema (ex: cadastro inicial sem CPF/CNPJ),
--   a constraint UNIQUE permitirá múltiplos nulos (comportamento padrão do MySQL),
--   mas não múltiplos valores iguais não nulos. Se CPF/CNPJ é sempre obrigatório e
--   preenchido, a constraint funcionará como esperado.
-- - Tamanhos de VARCHAR foram baseados nos modelos Pydantic e SQLAlchemy. Ajuste se necessário.
-- - `cep` e `cpf_cnpj`: Recomenda-se armazenar apenas os números para facilitar buscas e validações.
--   A formatação pode ser aplicada na interface do usuário.
-- - `indicador_ie`: '1' (Contribuinte ICMS), '2' (Contribuinte Isento), '9' (Não Contribuinte).
-- - `criado_em` e `atualizado_em` são úteis para auditoria.

