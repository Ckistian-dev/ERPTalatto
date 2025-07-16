-- estoque_movimentacoes
-- Cria uma trilha de auditoria IMUTÁVEL com CADA transação de estoque.
-- Esta é a fonte de dados para a sua tela de "Histórico".
CREATE TABLE IF NOT EXISTS estoque_movimentacoes (
    id_movimentacao INT AUTO_INCREMENT PRIMARY KEY,
    id_produto INT NOT NULL,
    -- id_usuario INT, -- Descomente se você tiver uma tabela de usuários
    
    tipo_movimento ENUM('ENTRADA', 'SAIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA') NOT NULL,
    quantidade DECIMAL(10, 2) NOT NULL,
    
    -- Campos de localização para o registro histórico da transação
    lote VARCHAR(50) NOT NULL,
    deposito VARCHAR(100) NOT NULL,
    rua VARCHAR(50) NOT NULL,
    numero INT NOT NULL,
    nivel INT NOT NULL,
    cor VARCHAR(50) NOT NULL,
    situacao VARCHAR(100) NOT NULL,
    
    data_movimento DATETIME DEFAULT CURRENT_TIMESTAMP,
    observacao TEXT,
    
    -- Chaves estrangeiras e índices para otimização de consultas
    FOREIGN KEY (id_produto) REFERENCES produtos(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    -- FOREIGN KEY (id_usuario) REFERENCES usuarios(id), -- Descomente se aplicável
    INDEX idx_data_movimento (data_movimento),
    INDEX idx_produto (id_produto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;