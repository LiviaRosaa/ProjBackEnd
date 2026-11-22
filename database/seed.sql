USE api_financas;

INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
('João Silva', 'joao@email.com', '11144477735', '$2b$10$AKm2ychAC7AmZY3cd1.0bekECYGfFjH4syjPybZIVDria1NAcJMa6');
SET @joao_id = LAST_INSERT_ID();

INSERT INTO usuarios (nome, email, cpf, senha_hash) VALUES
('Maria Oliveira', 'maria@email.com', '52998224725', '$2b$10$AKm2ychAC7AmZY3cd1.0bekECYGfFjH4syjPybZIVDria1NAcJMa6');
SET @maria_id = LAST_INSERT_ID();


INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Salário', 'entrada', @joao_id);
SET @joao_cat_salario = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Alimentação', 'saida', @joao_id);
SET @joao_cat_alim = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Moradia', 'saida', @joao_id);
SET @joao_cat_moradia = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Lazer', 'saida', @joao_id);
SET @joao_cat_lazer = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Educação', 'saida', @joao_id);
SET @joao_cat_educ = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Salário', 'entrada', @maria_id);
SET @maria_cat_salario = LAST_INSERT_ID();

INSERT INTO categorias (nome, tipo, id_usuario) VALUES ('Alimentação', 'saida', @maria_id);
SET @maria_cat_alim = LAST_INSERT_ID();


INSERT INTO fontes_destinos (nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario) VALUES
('Empresa XPTO', 'renda', NULL, NULL, NULL, @joao_id);
SET @joao_fonte_renda = LAST_INSERT_ID();

INSERT INTO fontes_destinos (nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario) VALUES
('Conta corrente', 'conta', NULL, NULL, NULL, @joao_id);
SET @joao_fonte_conta = LAST_INSERT_ID();

INSERT INTO fontes_destinos (nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario) VALUES
('Cartão Nubank', 'cartao_credito', 10, 17, 3000.00, @joao_id);
SET @joao_fonte_cartao = LAST_INSERT_ID();


INSERT INTO fontes_destinos (nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario) VALUES
('Conta corrente', 'conta', NULL, NULL, NULL, @maria_id);
SET @maria_fonte_conta = LAST_INSERT_ID();


INSERT INTO lancamentos (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario) VALUES
(4500.00, '2026-09-05', 'Salário mensal', 'Pagamento setembro', 'entrada', 1, 1, NULL, @joao_cat_salario, @joao_fonte_renda, @joao_id),
(1500.00, '2026-09-10', 'Aluguel', 'Apartamento', 'saida', 1, 1, NULL, @joao_cat_moradia, @joao_fonte_conta, @joao_id),
(620.50,  '2026-09-14', 'Supermercado', 'Compra do mês', 'saida', 1, 1, NULL, @joao_cat_alim, @joao_fonte_conta, @joao_id),
(120.00,  '2026-09-20', 'Cinema e jantar', NULL, 'saida', 1, 1, NULL, @joao_cat_lazer, @joao_fonte_cartao, @joao_id);

INSERT INTO lancamentos (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario) VALUES
(4500.00, '2026-10-05', 'Salário mensal', 'Pagamento outubro', 'entrada', 1, 1, NULL, @joao_cat_salario, @joao_fonte_renda, @joao_id),
(1500.00, '2026-10-10', 'Aluguel', 'Apartamento', 'saida', 1, 1, NULL, @joao_cat_moradia, @joao_fonte_conta, @joao_id),
(580.00,  '2026-10-15', 'Supermercado', NULL, 'saida', 1, 1, NULL, @joao_cat_alim, @joao_fonte_conta, @joao_id);


INSERT INTO lancamentos (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario) VALUES
(4500.00, '2026-11-05', 'Salário mensal', 'Pagamento novembro', 'entrada', 1, 1, NULL, @joao_cat_salario, @joao_fonte_renda, @joao_id),
(1500.00, '2026-11-10', 'Aluguel', 'Apartamento', 'saida', 1, 1, NULL, @joao_cat_moradia, @joao_fonte_conta, @joao_id),
(640.00,  '2026-11-12', 'Supermercado', NULL, 'saida', 1, 1, NULL, @joao_cat_alim, @joao_fonte_conta, @joao_id);


INSERT INTO lancamentos (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario) VALUES
(33.34, '2026-09-18', 'Curso de Node.js (1/3)', 'Compra parcelada', 'saida', 1, 3, '550e8400-e29b-41d4-a716-446655440000', @joao_cat_educ, @joao_fonte_cartao, @joao_id),
(33.33, '2026-10-18', 'Curso de Node.js (2/3)', 'Compra parcelada', 'saida', 2, 3, '550e8400-e29b-41d4-a716-446655440000', @joao_cat_educ, @joao_fonte_cartao, @joao_id),
(33.33, '2026-11-18', 'Curso de Node.js (3/3)', 'Compra parcelada', 'saida', 3, 3, '550e8400-e29b-41d4-a716-446655440000', @joao_cat_educ, @joao_fonte_cartao, @joao_id);


INSERT INTO lancamentos (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario) VALUES
(3800.00, '2026-11-05', 'Salário mensal', NULL, 'entrada', 1, 1, NULL, @maria_cat_salario, @maria_fonte_conta, @maria_id),
(410.00,  '2026-11-11', 'Mercado', NULL, 'saida', 1, 1, NULL, @maria_cat_alim, @maria_fonte_conta, @maria_id);