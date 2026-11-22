CREATE DATABASE IF NOT EXISTS api_financas;
USE api_financas;

CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    senha VARCHAR(255) NOT NULL,
    CONSTRAINT uq_usuarios_email UNIQUE (email),
    CONSTRAINT uq_usuarios_cpf UNIQUE (cpf)
);

CREATE TABLE categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('entrada', 'saida') NOT NULL,
    id_usuario INT NOT NULL,
    CONSTRAINT uq_categorias_nome UNIQUE (id_usuario, nome, tipo),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE fontes_destinos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('renda', 'conta', 'cartao_credito') NOT NULL,
    dia_fechamento TINYINT NULL,
    dia_vencimento TINYINT NULL,
    limite DECIMAL(12, 2) NULL,
    id_usuario INT NOT NULL,
    CONSTRAINT uq_fontes_nome UNIQUE (id_usuario, nome),
    CONSTRAINT ck_dias CHECK (
        (dia_fechamento IS NULL OR dia_fechamento BETWEEN 1 AND 31) AND
        (dia_vencimento IS NULL OR dia_vencimento BETWEEN 1 AND 31)
    ),
    CONSTRAINT ck_cartao CHECK (
        tipo <> 'cartao_credito' OR
        (dia_fechamento IS NOT NULL AND dia_vencimento IS NOT NULL AND limite IS NOT NULL)
    ),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE lancamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    valor DECIMAL(10, 2) NOT NULL CHECK (valor > 0),
    data DATE NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    observacao TEXT NULL,
    tipo ENUM('entrada', 'saida') NOT NULL,
    parcela_atual INT NOT NULL DEFAULT 1,
    total_parcelas INT NOT NULL DEFAULT 1,
    grupo_parcelamento VARCHAR(36) NULL,
    id_categoria INT NOT NULL,
    id_fonte_destino INT NOT NULL,
    id_usuario INT NOT NULL,
    CONSTRAINT ck_parcelas CHECK (
        total_parcelas BETWEEN 1 AND 48 AND
        parcela_atual BETWEEN 1 AND total_parcelas
    ),
    FOREIGN KEY (id_categoria) REFERENCES categorias(id),
    FOREIGN KEY (id_fonte_destino) REFERENCES fontes_destinos(id),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE INDEX idx_lancamentos_usuario_data ON lancamentos (id_usuario, data);
