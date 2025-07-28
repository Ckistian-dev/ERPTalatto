-- Comando para criar a tabela que armazenará as credenciais do Mercado Livre.
-- Esta tabela corresponde ao modelo SQLAlchemy definido no controller.

CREATE TABLE meli_credentials (
    -- Chave primária auto-incrementável
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- ID do usuário do Mercado Livre. Deve ser único para não salvar
    -- credenciais duplicadas para o mesmo usuário.
    user_id BIGINT NOT NULL UNIQUE,

    -- O token de acesso para fazer chamadas à API.
    access_token VARCHAR(255) NOT NULL,

    -- O token para renovar o access_token sem nova autenticação do usuário.
    refresh_token VARCHAR(255) NOT NULL,

    -- Tempo de vida do access_token em segundos (geralmente 21600).
    expires_in INT NOT NULL,

    -- Registra a data e hora da criação e da última atualização automaticamente.
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Cria um índice na coluna user_id para otimizar as buscas.
    INDEX idx_user_id (user_id)
);

