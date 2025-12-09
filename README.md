
# 📦 TonerStock — Sistema de Controle de Toners

O **TonerStock** é um sistema completo de gestão de estoque, vendas, compras e controle financeiro de toners, desenvolvido em **Node.js** com **SQL Server**.  
Este README reflete a versão **mais recente** dos arquivos enviados e atualizados no projeto.

---

## 🚀 Tecnologias Utilizadas
### **Backend**
- Node.js
- Express.js
- MSSQL
- MVC (Controllers, Routes)

### **Frontend**
- HTML + TailwindCSS
- JavaScript (Fetch API)

### **Banco de Dados**
- SQL Server
- Tabelas integradas para estoque, vendas, compras e financeiro

---

## 🗂 Arquitetura do Projeto
```
projeto-toner/
├── public/
│   ├── controllers/
│   ├── views/
│   └── css/
│
├── src/
│   ├── routes/
│   ├── controllers/
│   ├── middlewares/
│   └── db/
│
└── server.js
```

---

## 📁 Funcionalidades
### **Clientes**
- Cadastro, edição, ativação
- Histórico de vendas e toners consumidos

### **Toners**
- Controle por modelo/marca/tipo
- Estoque automático (compra → aumenta, venda → reduz)
- Itens vinculados às compras

### **Compras**
- Registro da compra e itens
- Geração automática de contas a pagar
- Atualização de estoque por item comprado

### **Vendas**
- Criação de pedidos e itens
- Cálculo automático de custo, valor e lucro
- Geração de contas a receber

### **Financeiro (Pagar/Receber)**
- Baixas parciais e totais
- Contas vinculadas
- Dashboard financeiro consolidado

### **Dashboard**
- Saldo de contas
- Toners em locação
- Total comprado/vendido
- Pendências financeiras

---

## 🧮 Estrutura do Banco de Dados (Resumo)

### **Pedidos e Itens**
- `Tbl_Pedidos`: Informações gerais do pedido
- `Tbl_PedidosItens`: Itens vendidos ao cliente

### **Compras e Itens**
- `Tbl_Compras`: Registro da compra
- `Tbl_ComprasItens`: Atualização de estoque e custos

### **Financeiro**
- `Tbl_PagRec`: Lançamentos de pagar/receber
- `Tbl_Contas`: Contas bancárias com saldo e baixas

### **Entidades Principais**
- `Tbl_Clientes`
- `Tbl_Toner`
- `Tbl_Fornecedores`

---

## 🔌 Fluxo Geral do Sistema

### **1. Compra**
1. Cadastra compra  
2. Adiciona itens  
3. Estoque aumenta  
4. Gera contas a pagar  

### **2. Venda**
1. Escolhe cliente  
2. Adiciona toner  
3. Calcula lucro automático  
4. Estoque diminui  
5. Gera contas a receber  

### **3. Financeiro**
- Baixa atualiza títulos e conta bancária

---

## ▶️ Como Rodar o Projeto

```
npm install
npm start
```

Configurar `.env` ou arquivo de conexão em:  
`src/db/config.js`

---

## 📄 Autor
Desenvolvido por Matheus Bonafin.
