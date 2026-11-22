# Requisições de teste da API de Controle Financeiro

Base: `http://localhost:3000`

Substitua `SEU_TOKEN` pelo token devolvido no login. Os `id` usados (categoria 2 = Alimentação, fonte 2 = Conta corrente, fonte 3 = Cartão Nubank) são os do banco criado pelo `seed.sql`.

## 1. Cadastro e login

**Login do João (200, devolve token)**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@email.com", "senha": "Senha123!"}'
```

**Login sem senha (400)**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "joao@email.com"}'
```

**Cadastro com e-mail repetido, em maiúsculas (409, campo email)**
```bash
curl -X POST http://localhost:3000/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste", "email": "JOAO@email.com", "cpf": "39053344705", "senha": "senha12345"}'
```

**Cadastro com CPF repetido (409, campo cpf)**
```bash
curl -X POST http://localhost:3000/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste", "email": "outro@email.com", "cpf": "52998224725", "senha": "senha12345"}'
```

**Cadastro novo (201)**
```bash
curl -X POST http://localhost:3000/auth/cadastro \
  -H "Content-Type: application/json" \
  -d '{"nome": "Teste", "email": "novo@email.com", "cpf": "39053344705", "senha": "senha12345"}'
```

## 2. Acesso sem token

**Sem token (401)**
```bash
curl -X GET http://localhost:3000/categorias
```

## 3. Categorias e fontes/destinos

**Listar categorias (200)**
```bash
curl -X GET http://localhost:3000/categorias \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Listar fontes/destinos (200)**
```bash
curl -X GET http://localhost:3000/fontes-destinos \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 4. Lançamentos

**Lançamento simples (201)**
```bash
curl -X POST http://localhost:3000/lancamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"descricao": "Mercado teste", "valor": 50, "tipo": "saida", "data": "2026-11-10", "idCategoria": 2, "idFonteDestino": 2}'
```

**Categoria de tipo errado (400)**
```bash
curl -X POST http://localhost:3000/lancamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"descricao": "Mercado teste", "valor": 50, "tipo": "entrada", "data": "2026-11-10", "idCategoria": 2, "idFonteDestino": 2}'
```

**Compra parcelada em 3x no cartão (201, 3 parcelas com a mesma data)**
```bash
curl -X POST http://localhost:3000/lancamentos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{"descricao": "Teste parcelado", "valor": 100, "tipo": "saida", "data": "2026-11-28", "idCategoria": 2, "idFonteDestino": 3, "parcelas": 3}'
```

**Listar lançamentos com filtros (200)**
```bash
curl -X GET "http://localhost:3000/lancamentos?inicio=2026-09-01&fim=2026-09-30&tipo=saida&categoriaId=2&fonteDestinoId=2&pagina=1" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Excluir todas as parcelas de uma compra (204)**
```bash
curl -X DELETE "http://localhost:3000/lancamentos/ID_DA_PARCELA?todasParcelas=true" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 5. Relatórios

**Relatório por categoria (200)**
```bash
curl -X GET "http://localhost:3000/relatorios/categorias?inicio=2026-09-01&fim=2026-09-30" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Relatório por fonte/destino (200)**
```bash
curl -X GET "http://localhost:3000/relatorios/fontes-destinos?inicio=2026-09-01&fim=2026-09-30" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Previsão de faturas (200)**
```bash
curl -X GET "http://localhost:3000/relatorios/faturas?meses=3" \
  -H "Authorization: Bearer SEU_TOKEN"
```

**Saúde financeira (200)**
```bash
curl -X GET "http://localhost:3000/relatorios/saude-financeira?meses=3" \
  -H "Authorization: Bearer SEU_TOKEN"
```

## 6. Isolamento entre usuários

**Login da Maria**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "maria@email.com", "senha": "Senha123!"}'
```

**Maria tentando ler lançamento do João (404)**
```bash
curl -X GET http://localhost:3000/lancamentos/16 \
  -H "Authorization: Bearer TOKEN_DA_MARIA"
```