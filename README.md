
# 📦 BarsottiStock — Sistema de Gestão de Toners, Vendas, Compras e Financeiro

O **BarsottiStock** é um sistema completo desenvolvido para controle operacional de uma empresa de suprimentos de impressão. Ele oferece gestão de **clientes, fornecedores, toners, estoque por lotes, compras, vendas, financeiro (Pag/Rec) e contas bancárias**, tudo integrado em um fluxo simples e eficiente.

O sistema foi construído utilizando **Node.js + Express**, **SQL Server**, sessões autenticadas, e uma interface moderna com **TailwindCSS**.

---

# 🧩 Principais Módulos do Sistema

- 📦 Estoque com rastreamento por lote (Id_ItemCompra)  
- 🛒 Vendas com frete, lucro, NF, financeiro integrado e comissões  
- 🧾 Compras com itens, financeiro opcional e atualização automática de estoque  
- 👥 Clientes (incluindo clientes de locação)  
- 🚚 Fornecedores  
- 🖨 Toners cadastrados com marca, modelo, tipo e flag de locação  
- 💰 Pagamentos e Recebimentos – incluindo locação e comissão automática  
- 🏦 Contas bancárias com saldo atualizado automaticamente  
- 📊 Dashboard completo com KPIs operacionais e financeiros  
- 🔐 Login com sessão e bloqueio automático de páginas  

---

# 🔐 Autenticação e Sessão

O login valida usuário e senha em `Tbl_SupUsuarios`.  
A sessão armazena:

- `usuario`
- `token`
- `ultimoAcesso`

Todas as páginas HTML são bloqueadas sem sessão ativa.

---

# 🌐 Rotas Backend (API)

### 🔑 Autenticação
```
POST /login
GET /login
```

### 👥 Clientes
```
POST   /clientes/cadastrar
GET    /clientes/pesquisar
GET    /clientes/listarTodos
GET    /clientes/detalhes/:id
PUT    /clientes/editar/:Id_cliente
DELETE /clientes/excluir/:Id_cliente
GET    /clientes/pedido/:id/itens
```

### 🖨 Toners
```
POST   /toners
GET    /toners/pesquisar
GET    /toners/listar
PUT    /toners/:Cod_Produto
DELETE /toners/:Cod_Produto
```

### 🚚 Fornecedores
```
GET    /fornecedores
GET    /fornecedores/listar
GET    /fornecedores/:id
POST   /fornecedores
PUT    /fornecedores/:id
DELETE /fornecedores/:id
```

### 🛒 Compras
```
GET  /compras/listar
POST /compras/finalizar
```

### 📦 Estoque
```
GET  /estoque/disponivel
POST /estoque/buscar
```

### 🛍 Vendas
```
GET  /vendas/listar
GET  /vendas/pesquisar/:codigo
POST /vendas/finalizar
```

### 💰 Pagamentos / Recebimentos
```
GET    /pagrec/listar
GET    /pagrec/buscar/:id
POST   /pagrec/editar/:id
DELETE /pagrec/excluir/:id
```

### 🏦 Contas Bancárias
```
GET  /contas/listar
POST /contas/lancar
GET  /contas/soma
```

### 📊 Dashboard
```
GET /dashboard
GET /dashboard/locacao
GET /dashboard/vendas-recentes
GET /dashboard/resumo-pagrec
```

---

# ⚙️ Como Rodar

### 1. Instale dependências
```bash
npm install
```

### 2. Configure `.env`
```env
DB_HOST=SEU_SERVIDOR
DB_USER=SEU_USUARIO
DB_PASS=SUA_SENHA
DB_NAME=SEU_BANCO
DB_PORT=1433
```

### 3. Inicie o servidor
```bash
npm start
```

Acesse: **http://localhost:3000/login**

---

# 👤 Autor
Desenvolvido por **Matheus Bonafin** — Barsotti Soluções.
