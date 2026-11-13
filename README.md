# API de Controle Financeiro

Projeto final da disciplina de Programação Web Back-end (UTFPR). É uma API REST de finanças pessoais: cada usuário se cadastra, faz login e registra suas entradas e saídas de dinheiro, classificadas por categoria e por fonte/destino (conta, renda ou cartão de crédito). Não há interface gráfica; o produto é a API, testada com Postman, Insomnia, Thunder Client ou `curl`.

## Tecnologias

- Node.js e NPM (CommonJS)
- Express
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

Execute o script `database/schema.sql` no MySQL, pelo Workbench (**File → Open SQL Script** e depois o botão de executar) ou pelo terminal:

```bash
mysql -u root -p < database/schema.sql
```

O script não apaga o banco existente. Para recriar do zero (por exemplo, depois de uma mudança no schema), rode antes:

```sql
DROP DATABASE api_financas;
```

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
├── models/               # classes com o SQL (Usuario, Categoria, FonteDestino)
├── routes/               # um Router por recurso
├── utils/
│   └── cpf.js            # validação do CPF
├── testes/
│   └── requisicoes.md    # requisições de teste das rotas
├── .env.example
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
| `PUT` | `/fontes-destinos/:id` | Atualiza | `200` |
| `DELETE` | `/fontes-destinos/:id` | Exclui | `204` |

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

### Lançamentos e relatórios

> **Em desenvolvimento.** Rotas previstas: `/lancamentos` (CRUD com filtros, paginação e compras parceladas), `/relatorios/categorias`, `/relatorios/fontes-destinos`, `/relatorios/faturas` e o desafio `/saude-financeira`.

## Padrão de respostas

Os erros têm sempre o mesmo formato:

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
- `lancamentos` (valor, data, descrição, tipo, id_categoria, id_fonte_destino, id_usuario)

Todas as tabelas ligadas a um usuário usam `ON DELETE CASCADE` na chave estrangeira `id_usuario`.

## Equipe

| Integrante | Responsabilidade |
|---|---|
| Patricia Lacerda | Infraestrutura, autenticação e usuários |
| Livia Rosa | Categorias e fontes/destinos |
| [Ilanna Karolyna] | Lançamentos e relatórios |

O desafio de saúde financeira é desenvolvido pelas três integrantes em conjunto.
