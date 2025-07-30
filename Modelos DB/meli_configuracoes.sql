-- Apaga a tabela se ela já existir, para garantir uma criação limpa.
DROP TABLE IF EXISTS meli_configuracoes;

-- Cria a tabela de configurações em um formato mais compatível.
CREATE TABLE meli_configuracoes (
    id INT PRIMARY KEY,
    aceite_automatico_pedidos BOOLEAN DEFAULT FALSE,
    cliente_padrao_id INT,
    vendedor_padrao_id INT,
    situacao_pedido_inicial VARCHAR(100) DEFAULT 'Aguardando Faturamento',
    atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insere a linha de configuração inicial com os valores padrão.
INSERT INTO meli_configuracoes (id, aceite_automatico_pedidos, cliente_padrao_id, vendedor_padrao_id) VALUES (1, FALSE, 1, 1);
