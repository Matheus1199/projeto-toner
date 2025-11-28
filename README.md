# 📦 BarsottiStock — Sistema de Controle de Estoque de Toners

O **BarsottiStock** é um sistema completo de controle de estoque de toners, desenvolvido em **Node.js + SQL Server**, que permite gerenciar todo o ciclo operacional:

- Cadastro de toners  
- Compras (entrada de estoque por lote)  
- Pedidos/Vendas (saída de estoque)  
- Controle de clientes e fornecedores  
- Cálculo automático de lucro  
- Dashboard com estatísticas  
- Controle de saldo por lote (FIFO)

O projeto foi criado para atender empresas que trabalham com toner, impressão e outsourcing, oferecendo rastreabilidade precisa e fluxo de estoque profissional.

## 🚀 Tecnologias Utilizadas

- **Node.js**
- **Express**
- **SQL Server (mssql)**
- **JavaScript**
- **Tailwind CSS**
- **HTML5**
- **Fetch API (AJAX)**

## 🧱 Arquitetura da Aplicação

```
/public
    /controllers  → Arquivos JS usados no frontend
    /css, /js, /img
/server
    /controllers → Lógica de negócios
    /routes      → Rotas da API
    /config      → Conexão com SQL Server
.env
server.js
```

## 🗄️ Estrutura do Banco de Dados

### Tbl_Toner
- Cod_Produto (PK)
- Tipo
- Marca
- Modelo
- Locação (bit)

### Tbl_Compras
- Cod_Compra (PK)
- Data_Compra
- Cod_Fornecedor
- NDocumento
- Valor_Total
- Cond_Pagamento

### Tbl_ComprasItens
- Id_ItemCompra (PK)
- Cod_Compra (FK)
- Cod_Toner (FK)
- Quantidade
- Valor_Compra
- Saldo

### Tbl_Pedidos
- Cod_Pedido (PK)
- Data
- Cod_Cliente
- Valor_Total
- Custo_Total
- Lucro_Total
- NDoc
- Cond_Pagamento
- NF

### Tbl_PedidosItens
- Cod_Venda (PK)
- Cod_Pedido (FK)
- Cod_Cliente (FK)
- Cod_Toner (FK)
- Id_ItemCompra (FK)
- Quantidade
- Valor_Compra
- Valor_Venda
- Valor_Lucro

### Tbl_Clientes
- Id_Cliente (PK)
- Nome
- Ativo
- Tipo
- Id_Vendedor
- Dat_Cad

### Tbl_Fornecedores
- Id_Fornecedor (PK)
- Nome
- Status

## 🔁 Fluxo de Funcionamento

### Cadastro de Toners
Registro com tipo, marca, modelo e locação.

### Entrada de Estoque (Compras)
Itens adicionados ao carrinho → geração de lotes com saldo.

### Saída do Estoque (Pedidos)
Consumo FIFO dos lotes, cálculo automático de lucro e atualização do saldo.

### Dashboard
Exibe estatísticas, pedidos recentes e status de estoque.

### Instalar dependências
```
npm install
```

### Configurar arquivo .env
```
DB_USER=seu_usuario
DB_PASS=sua_senha
DB_SERVER=localhost
DB_DATABASE=tonerstock
```

### Iniciar aplicação
```
npm start
```

## 📌 Regras de Negócio

- Lotes consumidos por FIFO  
- Cálculo de lucro item a item  
- Venda impedida sem saldo  
- Controle de toner de locação  

## 🗺️ Roadmap

- Autenticação  
- Perfis de usuário  
- Relatórios PDF  
- Módulo de locação de impressoras  
- Logs e auditorias  

## 🤝 Contribuição

Pull requests são bem-vindos.

## 📄 Licença

MIT License.

