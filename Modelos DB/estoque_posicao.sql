-- estoque_posicao
-- Armazena o SALDO ATUAL de cada produto em sua localização/situação específica.
-- A chave primária composta garante que cada "endereço" de estoque seja único.
CREATE TABLE IF NOT EXISTS estoque_posicao (
    id_produto INT NOT NULL,
    lote VARCHAR(50) NOT NULL,
    deposito VARCHAR(100) NOT NULL,
    rua VARCHAR(50) NOT NULL,
    numero INT NOT NULL,
    nivel INT NOT NULL,
    cor VARCHAR(50) NOT NULL,
    situacao_estoque VARCHAR(100) NOT NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    data_ultima_modificacao DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Chave primária composta para garantir a unicidade da posição de estoque
    PRIMARY KEY (id_produto, lote, deposito, rua, numero, nivel, cor, situacao),
    
    -- Chave estrangeira ligando à tabela de produtos
    FOREIGN KEY (id_produto) REFERENCES produtos(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
