CREATE TABLE IF NOT EXISTS contas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo_conta VARCHAR(20) NOT NULL COMMENT 'Tipo da conta (ex: A Pagar, A Receber)',
    situacao_conta VARCHAR(20) NOT NULL DEFAULT 'Em Aberto' COMMENT 'Situação da conta (ex: Em Aberto, Paga, Vencida, Cancelada)',
    descricao_conta VARCHAR(255) NOT NULL COMMENT 'Descrição da conta (ex: Aluguel, Fatura de Internet)',
    num_conta INT NULL COMMENT 'Número da Conta (ex: número da NF)',
    id_cliente_fornecedor INT NOT NULL COMMENT 'ID do usuário associado à conta',
    nome_cliente_fornecedor VARCHAR(255) NOT NULL COMMENT 'Nome do cadastro associado à conta',
    data_emissao VARCHAR(10) NOT NULL COMMENT 'Data de emissao da conta',
    data_vencimento VARCHAR(10) NOT NULL COMMENT 'Data de vencimento da conta',
    data_baixa VARCHAR(10) NOT NULL COMMENT 'Data de baixa da conta',
    plano_contas VARCHAR(255) NOT NULL COMMENT 'Tipo de plano da conta (ex: Energia, Venda)',
    caixa_destino_origem VARCHAR(255) NOT NULL COMMENT 'Caixa/Origem da conta (ex: Sicoob, PagarME)',
    observacoes_conta TEXT NULL COMMENT 'Observações adicionais sobre a conta',
	forma_pagamento VARCHAR(255) NOT NULL COMMENT 'Forma de Pagamento (ex: Pix, Parcelamento 1/4)',
    valor_conta DECIMAL(13, 2) NOT NULL COMMENT 'Valor da conta',
	criado_em DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Data e hora de criação do registro',
	atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Data e hora da última atualização do registro',
    
    -- Chaves estrangeiras de tabelas relacionadas
    FOREIGN KEY (id_cliente_fornecedor) REFERENCES cadastros(id)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários explicativos sobre algumas escolhas:
-- IF NOT EXISTS: Evita erro caso a tabela já exista.
-- INT AUTO_INCREMENT PRIMARY KEY: Define 'id' como chave primária com auto incremento.
-- VARCHAR(255): Para textos de tamanho variável. Ajuste o tamanho conforme necessário.
-- DECIMAL(13, 2): Ideal para valores monetários, armazena até 13 dígitos no total, com 2 casas decimais.
-- DATETIME: Para armazenar data e hora.
-- NULL: Permite que o campo 'data_pagamento' e 'observacao' (e os IDs opcionais) fiquem vazios.
-- DEFAULT 'PENDENTE': Define 'PENDENTE' como valor padrão para 'situacao_conta' se nenhum for fornecido.
-- DEFAULT CURRENT_TIMESTAMP: Define a data/hora atual no momento da inserção.
-- ON UPDATE CURRENT_TIMESTAMP: Atualiza a data/hora automaticamente quando o registro é modificado.
-- ENGINE=InnoDB: Motor de armazenamento padrão que suporta transações e chaves estrangeiras.
-- DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci: Bom para suportar uma ampla gama de caracteres, incluindo emojis.

-- Para usar ENUM em vez de VARCHAR para tipo_conta ou situacao_conta (menos flexível para adicionar novos valores):
-- tipo_conta ENUM('PAGAR', 'RECEBER') NOT NULL,
-- situacao_conta ENUM('PENDENTE', 'PAGA', 'ATRASADA', 'CANCELADA') NOT NULL DEFAULT 'PENDENTE',