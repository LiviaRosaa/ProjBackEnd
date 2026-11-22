# API de Controle Financeiro

Projeto final da disciplina de Programação Web Back-end (UTFPR). É uma API REST de finanças pessoais: cada usuário se cadastra, faz login e registra suas entradas e saídas de dinheiro, classificadas por categoria e por fonte/destino (conta, renda ou cartão de crédito). Não há interface gráfica; o produto é a API, testada com Postman, Insomnia, Thunder Client ou `curl`.

## Tecnologias

- Node.js e NPM (CommonJS)
- Express 5
- MySQL 8.0.16 ou superior, com o driver `mysql2`
- Autenticação com JWT (`jsonwebtoken` + `express-jwt`)
- `bcrypt` para o hash das senhas
- `dotenv` para as variáveis de ambiente
- `nodemon` (desenvolvimento)

## Pré-requisitos

- [Node.js](https://nodejs.org) (versão LTS)
- [MySQL Server](https://dev.mysql.com/downloads/) 8.0.16 ou superior. Versões anteriores ignoram as restrições `CHECK` do banco.
- MySQL Workbench (opcional, para rodar os scripts SQL)

## Como rodar o projeto

**1. Clonar o repositório e instalar as dependências**

```bash
git clone https://github.com/LiviaRosaa/ProjBackEnd.git
cd ProjBackEnd
npm install
```

**2. Configurar as variáveis de ambiente**

Copie o arquivo de exemplo e preencha com os seus dados:

```bash
cp .env.example .env
```

No Windows (PowerShell), use `copy .env.example .env`.

| Variável | Descrição |
|---|---|
| `PORT` | Porta da API (padrão: `3000`) |
| `DB_HOST` | Endereço do MySQL (normalmente `localhost`) |
| `DB_USER` | Usuário do MySQL (normalmente `root`) |
| `DB_PASSWORD` | Senha do seu MySQL |
| `DB_NAME` | Nome do banco: `api_financas` |
| `JWT_SECRET` | Frase longa e difícil de adivinhar, usada para assinar os tokens |

O arquivo `.env` não é versionado (está no `.gitignore`).

**3. Criar o banco de dados**

Execute, nesta ordem, os scripts `database/schema.sql` e `database/seed.sql`, pelo Workbench (**File → Open SQL Script** e depois o botão de executar) ou pelo terminal:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

O `schema.sql` cria o banco e as tabelas. O `seed.sql` insere dados de exemplo.

Se o banco já existir e você quiser recriar do zero (por exemplo, depois de uma mudança no schema), apague antes:

```sql
DROP DATABASE IF EXISTS api_financas;
```

**Usuários de teste (do `seed.sql`)**

| E-mail | Senha |
|---|---|
| `joao@email.com` | `Senha123!` |
| `maria@email.com` | `Senha123!` |

**4. Subir a API**

```bash
npm run dev     # desenvolvimento, reinicia sozinho ao salvar (nodemon)
npm start       # execução normal
```

Se tudo estiver certo, o terminal mostra `Servidor rodando na porta 3000`.

## Estrutura do projeto

```
├── database/
│   ├── connection.js     # pool de conexões com o MySQL (lê o .env)
│   ├── schema.sql        # criação do banco e das tabelas
│   └── seed.sql          # dados de exemplo
├── middleware/
│   └── auth.js           # protegerRota: valida o token JWT (express-jwt)
├── models/
│   ├── Usuario.js        # SQL de usuários e cadastro com transação
│   ├── Categoria.js      # SQL de categorias
│   ├── FonteDestino.js   # SQL de fontes/destinos
│   ├── Lancamento.js     # SQL de lançamentos e parcelas
│   └── Relatorio.js      # SQL dos relatórios (SUM, GROUP BY)
├── routes/
│   ├── usuarios.js       # /auth (cadastro, login, me)
│   ├── categorias.js     # /categorias
│   ├── fontesDestinos.js # /fontes-destinos
│   ├── lancamentos.js    # /lancamentos
│   └── relatorios.js     # /relatorios (categorias, fontes, faturas, saúde financeira)
├── utils/
│   ├── cpf.js            # validação do CPF
│   ├── datas.js          # validação de datas e soma de meses
│   └── faturas.js        # cálculo da fatura do cartão
├── testes/
│   └── requisicoes.md    # requisições de teste das rotas
├── .env.example
├── .gitignore
├── package.json
└── server.js
```

O SQL fica somente em `models/`. As rotas validam os dados, chamam os métodos dos models e montam a resposta.

## Autenticação

Todas as rotas, exceto o cadastro e o login, exigem um token JWT no cabeçalho:

```
Authorization: Bearer SEU_TOKEN
```

O token é obtido no login e expira em 8 horas. O id do usuário vem sempre do token, nunca do corpo da requisição, e cada usuário enxerga apenas os próprios dados. Pedir o registro de outro usuário devolve `404`.

## Rotas

### Autenticação (`/auth`)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `POST` | `/auth/cadastro` | Cadastra um usuário (`nome`, `email`, `cpf`, `senha`) | `201` |
| `POST` | `/auth/login` | Login (`email`, `senha`); devolve o token | `200` |
| `GET` | `/auth/me` | Dados do usuário dono do token | `200` |

Regras do cadastro:
- E-mail em formato válido (gravado em minúsculas, sem espaços nas pontas).
- CPF com dígitos verificadores válidos (gravado só com dígitos; pode ser enviado com pontuação).
- Senha com no mínimo 8 caracteres, contendo letras e números. Ela é gravada apenas como hash (`bcrypt`).
- E-mail ou CPF já cadastrado devolve `409`, indicando qual campo está duplicado.
- No cadastro, são criadas na mesma transação as categorias padrão (Salário e Outras entradas; Alimentação, Moradia, Saúde, Mobilidade, Lazer, Educação e Outras saídas) e a fonte "Conta corrente".

A resposta de sucesso do cadastro traz `id`, `nome` e `email`. A do login traz o `token` e os dados básicos do usuário. Se faltar e-mail ou senha no login, a resposta é `400`. Credenciais erradas devolvem `401`.

Exemplo de cadastro:

```json
{
  "nome": "Maria Silva",
  "email": "maria@email.com",
  "cpf": "52998224725",
  "senha": "senha12345"
}
```

### Categorias (`/categorias`)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/categorias?tipo=saida` | Lista as categorias do usuário (filtro `tipo` opcional) | `200` |
| `POST` | `/categorias` | Cria uma categoria (`nome`, `tipo`) | `201` |
| `PUT` | `/categorias/:id` | Atualiza o nome da categoria | `200` |
| `DELETE` | `/categorias/:id` | Exclui a categoria | `204` |

- `tipo` é `entrada` ou `saida`.
- Nome repetido para o mesmo tipo devolve `409`.
- Excluir uma categoria que tem lançamentos vinculados devolve `409`.

### Fontes e destinos (`/fontes-destinos`)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/fontes-destinos?tipo=conta` | Lista as fontes/destinos do usuário (filtro `tipo` opcional) | `200` |
| `POST` | `/fontes-destinos` | Cria uma fonte/destino | `201` |
| `PUT` | `/fontes-destinos/:id` | Atualiza a fonte/destino (todos os campos) | `200` |
| `DELETE` | `/fontes-destinos/:id` | Exclui a fonte/destino | `204` |

- `tipo` é `renda`, `conta` ou `cartao_credito`.
- Para `cartao_credito`, são obrigatórios `dia_fechamento` e `dia_vencimento` (de 1 a 31) e `limite` (maior que zero).
- Nome repetido devolve `409`, assim como excluir uma fonte com lançamentos vinculados.

Exemplo de cartão de crédito:

```json
{
  "nome": "Cartão Nubank",
  "tipo": "cartao_credito",
  "dia_fechamento": 3,
  "dia_vencimento": 10,
  "limite": 5000
}
```

### Lançamentos (`/lancamentos`)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/lancamentos` | Lista os lançamentos do usuário com filtros e paginação | `200` |
| `GET` | `/lancamentos/:id` | Busca um lançamento específico do usuário | `200` |
| `POST` | `/lancamentos` | Cria um lançamento simples ou uma compra parcelada no cartão | `201` |
| `PUT` | `/lancamentos/:id` | Atualiza um lançamento existente | `200` |
| `DELETE` | `/lancamentos/:id` | Exclui um lançamento (ou todas as parcelas da compra com `?todasParcelas=true`) | `204` |

**Criação e alteração**

- Campos obrigatórios: `descricao`, `valor`, `tipo`, `data`, `idCategoria` e `idFonteDestino`. `observacao` é opcional.
- `tipo` é `entrada` ou `saida`, `valor` deve ser maior que zero e `data` deve estar no formato `AAAA-MM-DD`.
- A categoria e a fonte/destino devem pertencer ao usuário, e o `tipo` da categoria deve ser igual ao `tipo` do lançamento.
- No `PUT`, um lançamento parcelado não pode ser alterado para `entrada` nem trocado para uma fonte que não seja `cartao_credito`.

**Parcelamento**

- O campo `parcelas` (opcional, inteiro de `1` a `48`, padrão `1`) define o número de parcelas.
- Parcelar exige `tipo: "saida"` e uma fonte do tipo `cartao_credito`.
- Todas as parcelas recebem a **mesma data da compra**. A fatura em que cada parcela cai é calculada pela data e pelo número da parcela.
- Os centavos são divididos em partes iguais, e a diferença de arredondamento vai para a primeira parcela. Exemplo: R$ 100,00 em 3x gera 33,34 + 33,33 + 33,33.
- Todas as parcelas da compra compartilham o mesmo `grupoParcelamento` (UUID).
- Resposta: compra simples devolve o lançamento; compra parcelada devolve `mensagem`, `grupoParcelamento` e a lista `parcelas`.

**Listagem (`GET /lancamentos`)**

- Filtros opcionais: `inicio` e `fim` (`AAAA-MM-DD`), `tipo`, `categoriaId`, `fonteDestinoId` e `pagina`.
- Se `inicio` e `fim` não forem informados, a listagem usa o mês corrente.
- Retorna 20 itens por página, com `itens`, `paginacao` e `resumo` (total de entradas, total de saídas e saldo do período filtrado).

Exemplo de compra parcelada no cartão:

```json
{
  "descricao": "Notebook Dell",
  "valor": 3600.00,
  "data": "2026-11-15",
  "tipo": "saida",
  "idCategoria": 8,
  "idFonteDestino": 2,
  "parcelas": 12,
  "observacao": "Compra para a faculdade"
}
```

### Relatórios (`/relatorios`)

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| `GET` | `/relatorios/categorias?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Totais de entradas e saídas por categoria, percentual e variação em relação ao período anterior | `200` |
| `GET` | `/relatorios/fontes-destinos?inicio=AAAA-MM-DD&fim=AAAA-MM-DD` | Entradas por fonte, saídas por destino e saldo das contas no período | `200` |
| `GET` | `/relatorios/faturas?meses=3` | Faturas atuais e futuras de cada cartão de crédito, com limite utilizado e disponível | `200` |
| `GET` | `/saude-financeira?meses=3` | Indicadores, projeção mês a mês e dicas a partir dos dados do usuário (desafio) | `200` |

- Nos relatórios de categorias e fontes/destinos, `inicio` e `fim` são obrigatórios, com `inicio` menor ou igual a `fim`.
- O período anterior do relatório de categorias tem o mesmo tamanho do período pedido, imediatamente antes dele. Quando não havia gasto na categoria no período anterior, a variação é 100%.
- No relatório de faturas, `meses` é opcional (inteiro de `1` a `12`, padrão `3`).
- Cada fatura tem data de fechamento, data de vencimento, referência (`AAAA-MM`, mês do vencimento), lançamentos e valor total.
- **Regra de fechamento:** compras feitas **antes** do dia de fechamento entram na fatura do mês corrente; compras feitas **no dia ou depois** entram na fatura do mês seguinte. A parcela *k* cai *k* − 1 meses depois da primeira.
- `limiteUtilizado` soma as parcelas cuja fatura ainda não venceu, e `limiteDisponivel = limiteTotal - limiteUtilizado`.
- Na saúde financeira, `meses` é opcional (inteiro de `1` a `12`, padrão `3`). O relatório analisa os últimos 3 meses e projeta o saldo para os meses seguintes, somando a média de saídas às parcelas já agendadas.
- A resposta da saúde financeira traz `aviso` (informações educativas, não são recomendação financeira), `classificacao`, `indicadores`, `projecaoMensal` e `dicas`.
- A `classificacao` é `critica` se o comprometimento da renda passa de 90%, a poupança é negativa ou o uso do limite passa de 80%; é `atencao` se o comprometimento passa de 70%, a poupança fica abaixo de 15% ou o uso do limite passa de 50%; nos outros casos é `saudavel`.

## Padrão de respostas

Os erros de validação seguem este formato:

```json
{
  "erro": "Dados inválidos.",
  "campos": {
    "tipo": "Use entrada ou saida."
  }
}
```

| Código | Quando acontece |
|---|---|
| `200` | Consulta, atualização ou login bem-sucedidos |
| `201` | Registro criado |
| `204` | Exclusão bem-sucedida (sem corpo) |
| `400` | Campo ausente, formato inválido ou regra violada |
| `401` | Token ausente, inválido ou expirado; login com credenciais erradas |
| `404` | Registro inexistente ou de outro usuário; rota inexistente |
| `409` | E-mail, CPF ou nome já cadastrado; exclusão de registro com lançamentos vinculados |
| `500` | Erro inesperado do servidor |

## Modelo de dados

- `usuarios` (id, nome, email único, cpf único, senha em hash)
- `categorias` (id, nome, tipo, id_usuario), com nome único por usuário e tipo
- `fontes_destinos` (id, nome, tipo, dia_fechamento, dia_vencimento, limite, id_usuario), com nome único por usuário e restrições `CHECK` para os dados do cartão
- `lancamentos` (valor, data, descricao, observacao, tipo, parcela_atual, total_parcelas, grupo_parcelamento, id_categoria, id_fonte_destino, id_usuario), com restrições `CHECK` para o valor e as parcelas

As tabelas ligadas a um usuário usam `ON DELETE CASCADE` na chave `id_usuario`. Categorias e fontes/destinos não podem ser apagadas enquanto houver lançamentos vinculados.

## Testes

As requisições de teste de todas as rotas estão em `testes/requisicoes.md`. Para testar, rode o `seed.sql`, suba a API e use os usuários de teste da seção "Como rodar o projeto".

## Equipe

| Integrante | Responsabilidade |
|---|---|
| Patricia Lacerda | Infraestrutura, autenticação e usuários |
| Livia Rosa | Categorias e fontes/destinos |
| Ilanna Corado | Lançamentos e relatórios |

O desafio de saúde financeira é desenvolvido pelas três integrantes em conjunto.
