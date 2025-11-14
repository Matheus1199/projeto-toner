require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');
const config = require('./db'); // ✅ configuração correta

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
let pool;
(async () => {
    try {
        pool = await sql.connect(config);
    } catch (err) {
        console.error("❌ Erro ao conectar ao banco:", err);
    }
})();

// ✅ LOGIN
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT usuario, senha, token FROM Tbl_SupUsuarios WHERE usuario = ${usuario} AND senha = ${senha}
        `;

        if (result.recordset.length > 0) {
            res.json({ success: true });
        } else {
            res.status(401).json({ success: false, message: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// ✅ CADASTRAR TONER
app.post('/toners', async (req, res) => {
    const { modelo, marca, tipo } = req.body;

    try {
        await pool.request()
            .input("modelo", sql.VarChar(50), modelo)
            .input("marca", sql.VarChar(50), marca)
            .input("tipo", sql.VarChar(50), tipo)
            .query(`
                INSERT INTO Tbl_Toner (Modelo, Marca, Tipo)
                VALUES (@modelo, @marca, @tipo)
            `);

        res.status(201).json({ message: "Toner cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar toner:", error);
        res.status(500).json({ error: "Erro ao cadastrar toner" });
    }
});

// ✅ PESQUISAR TONER (Modelo, Marca ou Tipo)
app.get('/toners/pesquisar', async (req, res) => {
    const { termo, tipo } = req.query;

    if (!termo || termo.trim() === "") {
        return res.status(400).json({ error: "Informe um termo para pesquisa." });
    }

    if (!["modelo", "marca", "tipo"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo de pesquisa inválido." });
    }

    try {

        // ========================================================
        // 🔍 PESQUISA POR MODELO — RETORNA DETALHES COMPLETOS
        // ========================================================
        if (tipo === "modelo") {

            const result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT TOP 1
                        T.Cod_Produto,
                        T.Modelo,
                        T.Marca,
                        T.Tipo,
                        ISNULL(SUM(CI.Saldo), 0) AS Estoque
                    FROM Tbl_Toner T
                    LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
                    WHERE T.Modelo LIKE @termo
                    GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
                `);

            if (result.recordset.length === 0)
                return res.status(404).json({ error: "Toner não encontrado." });

            const toner = result.recordset[0];

            // 🔄 Últimas 5 vendas desse toner
            const vendas = await pool.request()
                .input("cod", sql.Int, toner.Cod_Produto)
                .query(`
                    SELECT TOP 5
            P.Data AS Data_Venda,
                        C.Nome AS Cliente,
                           I.Quantidade,
                           I.Valor_Venda
                    FROM Tbl_PedidosItens I
                             JOIN Tbl_Pedidos P ON I.Cod_Pedido = P.Cod_Pedido
                             JOIN Tbl_Clientes C ON I.Cod_Cliente = C.Id_Cliente
                    WHERE I.Cod_Toner = @cod
                    ORDER BY P.Data DESC
                `);

            return res.json({
                tipo: "modelo",
                toner: {
                    modelo: toner.Modelo,
                    marca: toner.Marca,
                    tipo: toner.Tipo,
                    estoque: toner.Estoque
                },
                vendas: vendas.recordset
            });
        }

        // ========================================================
        // 🔍 PESQUISA POR MARCA / TIPO — RETORNA LISTA
        // ========================================================
        const campo = tipo === "marca" ? "T.Marca" : "T.Tipo";

        const result = await pool.request()
            .input("termo", sql.VarChar(100), `%${termo}%`)
            .query(`
                SELECT 
                    T.Cod_Produto,
                    T.Modelo,
                    T.Marca,
                    T.Tipo,
                    ISNULL(SUM(CI.Saldo), 0) AS Estoque
                FROM Tbl_Toner T
                LEFT JOIN Tbl_ComprasItens CI ON T.Cod_Produto = CI.Cod_Toner
                WHERE ${campo} LIKE @termo
                GROUP BY T.Cod_Produto, T.Modelo, T.Marca, T.Tipo
                ORDER BY T.Modelo
            `);

        return res.json({
            tipo,
            toners: result.recordset
        });

    } catch (error) {
        console.error("Erro ao pesquisar toner:", error);
        res.status(500).json({ error: "Erro ao pesquisar toner." });
    }
});

app.get("/toners/listar", async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT Cod_Produto, Marca, Modelo, Tipo
            FROM Tbl_Toner
            ORDER BY Marca, Modelo
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Erro ao buscar toner:", err);
        res.status(500).json({ error: "Erro ao buscar toners." });
    }
});


// ✅ EDITAR TONER
app.put('/toners/:Cod_Produto', async (req, res) => {
    const { Cod_Produto } = req.params;
    const { modelo, marca, tipo } = req.body;

    try {
        const result = await pool.request()
            .input("Cod_Produto", sql.Int, Cod_Produto)
            .input("modelo", sql.VarChar(50), modelo)
            .input("marca", sql.VarChar(50), marca)
            .input("tipo", sql.VarChar(50), tipo)
            .query(`
                UPDATE Tbl_Toner
                SET Modelo = @modelo,
                    Marca = @marca,
                    Tipo = @tipo
                WHERE Cod_Produto = @Cod_Produto
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Toner não encontrado." });
        }

        res.json({ message: "Toner atualizado com sucesso!" });

    } catch (error) {
        console.error("Erro ao atualizar toner:", error);
        res.status(500).json({ error: "Erro ao atualizar toner" });
    }
});


// ✅ EXCLUIR TONER
app.delete('/toners/:Cod_Produto', async (req, res) => {
    const { Cod_Produto } = req.params;

    try {
        const result = await pool.request()
            .input("Cod_Produto", sql.Int, Cod_Produto)
            .query(`DELETE FROM Tbl_Toner WHERE Cod_Produto = @Cod_Produto`);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Toner não encontrado." });
        }

        res.json({ message: "Toner excluído com sucesso!" });

    } catch (error) {
        console.error("Erro ao excluir toner:", error);
        res.status(500).json({ error: "Erro ao excluir toner" });
    }
});

// ✅ PESQUISAR TONER (por modelo, marca ou tipo)
app.get('/toners/pesquisar', async (req, res) => {
    const { termo, tipo } = req.query;

    if (!termo || termo.trim() === "") {
        return res.status(400).json({ error: "Informe um termo para pesquisa." });
    }

    if (!["modelo", "marca", "tipo"].includes(tipo)) {
        return res.status(400).json({ error: "Tipo de pesquisa inválido (use modelo, marca ou tipo)." });
    }

    try {
        let result;

        if (tipo === "modelo") {
            // 🔍 Busca toner por modelo
            result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT TOP 1 Cod_Produto, Modelo, Marca, Tipo
                    FROM Tbl_Toner
                    WHERE Modelo LIKE @termo
                `);

            if (result.recordset.length === 0)
                return res.status(404).json({ error: "Toner não encontrado." });

            const toner = result.recordset[0];

            /*/ 🔄 Busca últimas 5 vendas desse modelo
            const vendas = await pool.request()
                .input("modelo", sql.VarChar(100), toner.Modelo)
                .query(`
                    SELECT TOP 5 Cliente, Data_Venda, Quantidade
                    FROM Tbl_Compras
                    WHERE Modelo = @modelo
                    ORDER BY Data_Venda DESC
                `);*/

            return res.json({
                tipo: "modelo",
                toner: {
                    modelo: toner.Modelo,
                    marca: toner.Marca,
                    tipo: toner.Tipo,
                    estoque: toner.Estoque
                },
                vendas: []
            });

        } else if (tipo === "marca") {
            // 🔍 Busca por marca (até 15 toners)
            result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT TOP 15 Cod_Produto, Modelo, Marca, Tipo
                    FROM Tbl_Toner
                    WHERE Marca LIKE @termo
                    ORDER BY Modelo
                `);

            return res.json({
                tipo: "marca",
                toners: result.recordset
            });

        } else if (tipo === "tipo") {
            // 🔍 Busca por tipo (até 15 toners)
            result = await pool.request()
                .input("termo", sql.VarChar(100), `%${termo}%`)
                .query(`
                    SELECT TOP 15 Cod_Produto, Modelo, Marca, Tipo
                    FROM Tbl_Toner
                    WHERE Tipo LIKE @termo
                    ORDER BY Marca
                `);

            return res.json({
                tipo: "tipo",
                toners: result.recordset
            });
        }

    } catch (error) {
        console.error("Erro ao pesquisar toner:", error);
        res.status(500).json({ error: "Erro ao pesquisar toner." });
    }
});


// ✅ CADASTRAR CLIENTE
app.post('/clientes', async (req, res) => {
    const { nome, ativo, id_vendedor } = req.body;

    try {
        await pool.request()
            .input("nome", sql.VarChar(100), nome)
            .input("ativo", sql.Bit, ativo)
            .input("id_vendedor", sql.Int, id_vendedor)
            .query(`
                INSERT INTO Tbl_Clientes (Nome, Ativo, Id_vendedor)
                VALUES (@nome, @ativo, @id_vendedor)
            `);

        res.status(201).json({ message: "Cliente cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);
        res.status(500).json({ error: "Erro ao cadastrar cliente" });
    }
});

app.get('/clientes/pesquisar', async (req, res) => {
    const { nome } = req.query;

    try {
        // 🔍 Busca cliente
        const clienteResult = await pool.request()
            .input("nome", sql.VarChar, `%${nome}%`)
            .query(`
                SELECT TOP 1 
                    Id_cliente,
                    Nome,
                    Ativo,
                    Id_vendedor
                FROM Tbl_Clientes
                WHERE Nome LIKE @nome
            `);

        if (clienteResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }

        const cliente = clienteResult.recordset[0];

        // 🔍 Busca as últimas 5 vendas desse cliente
        const vendasResult = await pool.request()
            .input("id", sql.Int, cliente.Id_cliente)
            .query(`
                SELECT TOP 5
                    P.Cod_Pedido,
                    P.Data,
                    P.Valor_Total,
                    P.NDoc,
                    (
                        SELECT SUM(Quantidade) 
                        FROM Tbl_PedidosItens I 
                        WHERE I.Cod_Pedido = P.Cod_Pedido
                    ) AS QuantidadeTotal
                FROM Tbl_Pedidos P
                WHERE P.Cod_Cliente = @id
                ORDER BY P.Data DESC
            `);

        res.json({
            cliente,
            compras: vendasResult.recordset
        });

    } catch (error) {
        console.error("Erro ao pesquisar cliente:", error);
        res.status(500).json({ error: "Erro ao pesquisar cliente" });
    }
});

// ===============================================
// 📌 Buscar itens de um pedido específico
// GET /pedidos/:id/itens
// ===============================================
app.get("/pedidos/:id/itens", async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT 
                    I.Cod_Pedido,
                    I.Quantidade,
                    I.Valor_Venda,
                    T.Modelo,
                    T.Marca,
                    T.Tipo
                FROM Tbl_PedidosItens I
                INNER JOIN Tbl_Toner T ON T.Cod_Produto = I.Cod_Toner
                WHERE I.Cod_Pedido = @id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Nenhum item encontrado para este pedido." });
        }

        res.json(result.recordset);

    } catch (error) {
        console.error("Erro ao buscar itens do pedido:", error);
        res.status(500).json({ error: "Erro ao buscar itens do pedido." });
    }
});


// ✅ LISTAR CLIENTES
app.get('/clientes', async (req, res) => {
    try {
        const result = await pool.request().query("SELECT Id_cliente, Nome, Ativo, Id_vendedor FROM Tbl_Clientes");
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error("Erro ao listar clientes:", error);
        res.status(500).json({ error: "Erro ao listar clientes" });
    }
});


// ✅ LISTAR UM CLIENTE POR ID
app.get('/clientes/:Id_cliente', async (req, res) => {
    const { Id_cliente } = req.params;

    try {
        const result = await pool.request()
            .input("Id_cliente", sql.Int, Id_cliente)
            .query("SELECT Id_cliente, Nome, Ativo, Id_vendedor FROM Tbl_Clientes WHERE Id_cliente = @Id_cliente");

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado." });
        }

        res.json(result.recordset[0]);

    } catch (error) {
        console.error("Erro ao buscar cliente:", error);
        res.status(500).json({ error: "Erro ao buscar cliente" });
    }
});


// ✅ EDITAR CLIENTE
app.put('/clientes/:Id_cliente', async (req, res) => {
    const { Id_cliente } = req.params;
    const { nome, ativo, id_vendedor } = req.body;

    try {
        const result = await pool.request()
            .input("Id_cliente", sql.Int, Id_cliente)
            .input("nome", sql.VarChar(100), nome)
            .input("ativo", sql.Bit, ativo)
            .input("id_vendedor", sql.Int, id_vendedor)
            .query(`
                UPDATE Tbl_Clientes
                SET Nome = @nome,
                    Ativo = @ativo,
                    Id_vendedor = @id_vendedor
                WHERE Id_Cliente = @Id_cliente
            `);

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Cliente não encontrado." });
        }

        res.json({ message: "Cliente atualizado com sucesso!" });

    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        res.status(500).json({ error: "Erro ao atualizar cliente" });
    }
});


// ✅ EXCLUIR CLIENTE
app.delete('/clientes/:Id_cliente', async (req, res) => {
    const { Id_cliente } = req.params;

    try {
        const result = await pool.request()
            .input("Id_cliente", sql.Int, Id_cliente)
            .query("DELETE FROM Tbl_Clientes WHERE Id_Cliente = @Id_cliente");

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: "Cliente não encontrado." });
        }

        res.json({ message: "Cliente excluído com sucesso!" });

    } catch (error) {
        console.error("Erro ao excluir cliente:", error);
        res.status(500).json({ error: "Erro ao excluir cliente" });
    }
});

// ✅ --- FORNECEDORES --- ✅

// === ROTAS DE FORNECEDORES ===
app.get("/fornecedores", async (req, res) => {
    try {
        const result = await pool.request().query("SELECT * FROM Tbl_Fornecedores");
        res.json(result.recordset);
    } catch (err) {
        console.error("Erro ao buscar fornecedores:", err);
        res.status(500).send("Erro ao buscar fornecedores");
    }
});

app.get('/fornecedores/listar', async (req, res) => {
    try {
        const result = await pool.request().query(`
          SELECT Id_Fornecedor, Nome, Status
          FROM Tbl_Fornecedores
      `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Erro ao buscar fornecedor:", err);
        res.status(500).json({ error: "Erro ao buscar fornecedores." });
    }
});

app.get("/fornecedores/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT * FROM Tbl_Fornecedores WHERE Id_Fornecedor = @id");
        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Erro ao buscar fornecedor:", err);
        res.status(500).send("Erro ao buscar fornecedor");
    }
});


app.post("/fornecedores", async (req, res) => {
    try {
        const { nome, status } = req.body;
        await pool.request()
            .input("nome", sql.VarChar, nome)
            .input("status", sql.Bit, status)
            .query("INSERT INTO Tbl_Fornecedores (Nome, Status) VALUES (@nome, @status)");
        res.sendStatus(200);
    } catch (err) {
        console.error("Erro ao inserir fornecedor:", err);
        res.status(500).send("Erro ao inserir fornecedor");
    }
});

app.put("/fornecedores/:id", async (req, res) => {
    try {
        const { nome, status } = req.body;
        const id = req.params.id;

        await pool.request()
            .input("id", sql.Int, id)
            .input("nome", sql.VarChar, nome)
            .input("status", sql.Bit, status)
            .query("UPDATE Tbl_Fornecedores SET Nome = @nome, Status = @status WHERE Id_Fornecedor = @id");

        res.sendStatus(200);
    } catch (err) {
        console.error("Erro ao atualizar fornecedor:", err);
        res.status(500).send("Erro ao atualizar fornecedor");
    }
});

app.delete("/fornecedores/:id", async (req, res) => {
    try {
        const id = req.params.id;
        await pool.request()
            .input("id", sql.Int, id)
            .query("DELETE FROM Tbl_Fornecedores WHERE Id_Fornecedor = @id");
        res.sendStatus(200);
    } catch (err) {
        console.error("Erro ao excluir fornecedor:", err);
        res.status(500).send("Erro ao excluir fornecedor");
    }
});

// === DASHBOARD ===
app.get("/dashboard", async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT
                    (SELECT COUNT(Id_Cliente) FROM Tbl_Clientes WHERE Ativo = 1) AS totalClientes,
                    (SELECT COUNT(Id_Fornecedor) FROM Tbl_Fornecedores WHERE Status = 1) AS totalFornecedores,
                    (SELECT COUNT(DISTINCT Cod_Produto) FROM Tbl_Toner) AS totalModelos,
                    (SELECT ISNULL(SUM(Saldo), 0) FROM Tbl_ComprasItens) AS totalEstoque,
                    (SELECT ISNULL(SUM(Saldo * Valor_Compra), 0) FROM Tbl_ComprasItens) AS valorEstoque,
                    (SELECT ISNULL(SUM(Valor_Total), 0) FROM Tbl_Pedidos WHERE MONTH(Data) = MONTH(GETDATE()) AND YEAR(Data) = YEAR(GETDATE())) AS vendasMes,
                (SELECT COUNT(*) FROM Tbl_Pedidos WHERE MONTH(Data) = MONTH(GETDATE()) AND YEAR(Data) = YEAR(GETDATE())) AS qtdVendasMes,
                                                      (SELECT ISNULL(SUM(Valor_Total),0) FROM Tbl_Pedidos) AS vendasTotais,
                (SELECT COUNT(*) FROM Tbl_ComprasItens WHERE Saldo <= 2) AS alertasEstoque
        `);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
        res.status(500).send("Erro ao buscar dados do dashboard");
    }
});

app.get('/dashboard/locacao', async (req, res) => {
    try {
        const q = `
            WITH ClientesLocacao AS (
                SELECT Id_cliente
                FROM Tbl_Clientes
                WHERE Tipo = 4
            ),
                 TonersUsados AS (
                     SELECT DISTINCT PI.Cod_Toner
                     FROM Tbl_PedidosItens PI
                              JOIN Tbl_Pedidos P ON PI.Cod_Pedido = P.Cod_Pedido
                     WHERE P.Cod_Cliente IN (SELECT Id_cliente FROM ClientesLocacao)
                 ),
                 EstoquePorToner AS (
                     SELECT Cod_Toner, SUM(Saldo) AS Saldo
                     FROM Tbl_ComprasItens
                     GROUP BY Cod_Toner
                 )
            SELECT
                T.Cod_Produto,
                T.Modelo,
                T.Marca,
                ISNULL(E.Saldo, 0) AS Saldo_Disponivel
            FROM TonersUsados U
                     JOIN Tbl_Toner T ON T.Cod_Produto = U.Cod_Toner
                     LEFT JOIN EstoquePorToner E ON E.Cod_Toner = T.Cod_Produto
            WHERE E.Saldo > 0
            ORDER BY ISNULL(E.Saldo,0) DESC;

        `;
        const result = await pool.request().query(q);
        res.json(result.recordset);
    } catch (err) {
        console.error("Erro /dashboard/locacao:", err);
        res.status(500).json({ error: "Erro ao buscar toners de locação." });
    }
});
;


// Retorna 10 últimas compras (com nome do fornecedor)
app.get("/compras/listar", async (req, res) => {
    const result = await pool.request().query(`
    SELECT TOP 10 
      C.Cod_Compra, 
      C.Data_Compra, 
      C.Cod_Fornecedor,
      F.Nome AS Nome_Fornecedor,
      C.NDocumento,
      C.Valor_Total,
      C.Cond_Pagamento,
      C.Obs
    FROM Tbl_Compras C
    LEFT JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
    ORDER BY C.Data_Compra DESC
  `);
    res.json(result.recordset);
});


// 🔹 Finalizar compra — grava Tbl_Compras e Tbl_CompraItens (com saldo)
app.post('/compras/finalizar', async (req, res) => {
    let { Cod_Fornecedor, NDocumento, Cond_Pagamento, Obs, carrinho } = req.body;

    if (!carrinho.length) {
        return res.status(400).json({ error: "O carrinho está vazio." });
    }

    try {
        const total = carrinho.reduce((sum, item) => sum + item.Subtotal, 0);

        // 🧾 1. Cria o registro principal da compra
        const compraResult = await pool.request()
            .input("Data_Compra", sql.Date, new Date())
            .input("Cod_Fornecedor", sql.Int, Cod_Fornecedor)
            .input("NDocumento", sql.VarChar(50), NDocumento)
            .input("Valor_Total", sql.Decimal(18, 2), total)
            .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento)
            .input("Obs", sql.VarChar(255), Obs)
            .query(`
                INSERT INTO Tbl_Compras (Data_Compra, Cod_Fornecedor, NDocumento, Valor_Total, Cond_Pagamento, Obs)
                    OUTPUT INSERTED.Cod_Compra
                VALUES (@Data_Compra, @Cod_Fornecedor, @NDocumento, @Valor_Total, @Cond_Pagamento, @Obs)
            `);

        const Cod_Compra = compraResult.recordset[0].Cod_Compra;

        // 🧾 2. Insere os itens da compra com Saldo = Quantidade
        for (const item of carrinho) {
            await pool.request()
                .input("Cod_Compra", sql.Int, Cod_Compra)
                .input("Cod_Toner", sql.Int, item.Cod_Produto || item.Cod_Toner)
                .input("Quantidade", sql.Int, item.Quantidade)
                .input("Valor_Compra", sql.Decimal(18, 2), item.ValorUnitario)
                .input("Saldo", sql.Int, item.Quantidade)
                .query(`
                    INSERT INTO Tbl_ComprasItens (Cod_Compra, Cod_Toner, Quantidade, Valor_Compra, Saldo)
                    VALUES (@Cod_Compra, @Cod_Toner, @Quantidade, @Valor_Compra, @Saldo)
                `);
        }

        // 🧹 3. Limpa o carrinho após finalizar
        carrinho = [];

        res.json({
            message: "Compra finalizada com sucesso!",
            Cod_Compra,
            Valor_Total: total
        });

    } catch (error) {
        console.error("Erro ao finalizar compra:", error);
        res.status(500).json({ error: "Erro ao finalizar compra." });
    }
});

// === LISTAR VENDAS ===
app.get("/vendas/listar", async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT TOP 10 
                P.Cod_Pedido, 
                P.Data, 
                C.Nome AS Nome_Cliente,
                P.Valor_Total,
                P.NDoc
            FROM Tbl_Pedidos P
            LEFT JOIN Tbl_Clientes C ON P.Cod_Cliente = C.Id_Cliente
            ORDER BY P.Data DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("Erro ao buscar vendas:", err);
        res.status(500).json({ error: "Erro ao buscar vendas." });
    }
});


app.post("/vendas/finalizar", async (req, res) => {
    const { Cod_Cliente, NDoc, Cond_Pagamento, Obs, Itens } = req.body;

    if (!Itens || Itens.length === 0)
        return res.status(400).json({ error: "Nenhum item informado." });

    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        const totalVenda = Itens.reduce((sum, item) => sum + item.Subtotal, 0);
        let totalCusto = 0;
        let totalLucro = 0;

        // Cria o pedido principal
        const pedidoResult = await transaction.request()
            .input("Data", sql.Date, new Date())
            .input("Cod_Cliente", sql.Int, Cod_Cliente)
            .input("Valor_Total", sql.Decimal(18, 2), totalVenda)
            .input("Custo_Total", sql.Decimal(18, 2), 0)
            .input("Lucro_Total", sql.Decimal(18, 2), 0)
            .input("NDoc", sql.VarChar(50), NDoc)
            .input("Cond_Pagamento", sql.VarChar(50), Cond_Pagamento)
            .input("NF", sql.Bit, 0)
            .query(`
                INSERT INTO Tbl_Pedidos (Data, Cod_Cliente, Valor_Total, Custo_Total, Lucro_Total, NDoc, Cond_Pagamento, NF)
                OUTPUT INSERTED.Cod_Pedido
                VALUES (@Data, @Cod_Cliente, @Valor_Total, @Custo_Total, @Lucro_Total, @NDoc, @Cond_Pagamento, @NF)
            `);

        const Cod_Pedido = pedidoResult.recordset[0].Cod_Pedido;

        // Percorre os itens vendidos
        for (const item of Itens) {
            let qtdRestante = item.Quantidade;

            // Busca os lotes disponíveis (FIFO)
            const lotes = await transaction.request()
                .input("Cod_Toner", sql.Int, item.Cod_Toner)
                .query(`
                    SELECT TOP 100 Id_ItemCompra, Valor_Compra, Saldo
                    FROM Tbl_ComprasItens
                    WHERE Cod_Toner = @Cod_Toner AND Saldo > 0
                    ORDER BY Id_ItemCompra ASC
                `);

            if (lotes.recordset.length === 0) {
                throw new Error(`Sem saldo disponível para o toner ${item.Cod_Toner}.`);
            }

            // Consome os lotes até suprir a quantidade vendida
            for (const lote of lotes.recordset) {
                if (qtdRestante <= 0) break;

                const usar = Math.min(lote.Saldo, qtdRestante);
                const valorCompra = parseFloat(lote.Valor_Compra);
                const valorVenda = parseFloat(item.Valor_Venda);
                const lucro = (valorVenda - valorCompra) * usar;

                totalCusto += valorCompra * usar;
                totalLucro += lucro;

                // Insere item de venda vinculado ao lote de compra
                await transaction.request()
                    .input("Cod_Pedido", sql.Int, Cod_Pedido)
                    .input("Cod_Cliente", sql.Int, Cod_Cliente)
                    .input("Cod_Toner", sql.Int, item.Cod_Toner)
                    .input("Id_ItemCompra", sql.Int, lote.Id_ItemCompra)
                    .input("Quantidade", sql.Int, usar)
                    .input("Valor_Compra", sql.Decimal(18, 2), valorCompra)
                    .input("Valor_Venda", sql.Decimal(18, 2), valorVenda)
                    .input("Valor_Lucro", sql.Decimal(18, 2), lucro)
                    .query(`
                        INSERT INTO Tbl_PedidosItens 
                        (Cod_Pedido, Cod_Cliente, Cod_Toner, Id_ItemCompra, Quantidade, Valor_Compra, Valor_Venda, Valor_Lucro)
                        VALUES (@Cod_Pedido, @Cod_Cliente, @Cod_Toner, @Id_ItemCompra, @Quantidade, @Valor_Compra, @Valor_Venda, @Valor_Lucro)
                    `);

                // Atualiza saldo do lote
                await transaction.request()
                    .input("Id_ItemCompra", sql.Int, lote.Id_ItemCompra)
                    .input("NovaQtd", sql.Int, lote.Saldo - usar)
                    .query(`
                        UPDATE Tbl_ComprasItens SET Saldo = @NovaQtd WHERE Id_ItemCompra = @Id_ItemCompra
                    `);

                qtdRestante -= usar;
            }

            if (qtdRestante > 0) {
                throw new Error(`Saldo insuficiente para o toner ${item.Cod_Toner}.`);
            }
        }

        // Atualiza totais da venda
        await transaction.request()
            .input("Cod_Pedido", sql.Int, Cod_Pedido)
            .input("Custo_Total", sql.Decimal(18, 2), totalCusto)
            .input("Lucro_Total", sql.Decimal(18, 2), totalLucro)
            .query(`
                UPDATE Tbl_Pedidos
                SET Custo_Total = @Custo_Total, Lucro_Total = @Lucro_Total
                WHERE Cod_Pedido = @Cod_Pedido
            `);

        await transaction.commit();

        res.json({
            message: "Venda registrada com sucesso!",
            Cod_Pedido,
            Valor_Total: totalVenda,
            Lucro_Total: totalLucro
        });
    } catch (err) {
        console.error("Erro ao finalizar venda:", err);
        await transaction.rollback();
        res.status(500).json({ error: err.message || "Erro ao finalizar venda." });
    }
});

// === LISTAR ESTOQUE DISPONÍVEL PARA VENDA ===
app.get("/estoque/disponivel", async (req, res) => {
    try {
        const result = await pool.request().query(`
            SELECT 
                CI.Id_ItemCompra,
                T.Cod_Produto,
                T.Marca,
                T.Modelo,
                T.Tipo,
                F.Nome AS Fornecedor,
                CI.Valor_Compra,
                CI.Saldo,
                C.Cod_Compra,
                C.NDocumento
            FROM Tbl_ComprasItens CI
            INNER JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
            LEFT JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
            LEFT JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
            WHERE CI.Saldo > 0
            ORDER BY T.Marca, T.Modelo
        `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Erro ao buscar estoque disponível:", error);
        res.status(500).json({ error: "Erro ao buscar estoque disponível." });
    }
});

app.get("/estoque/buscar", async (req, res) => {
    const { termo } = req.query;

    if (!termo || termo.trim() === "")
        return res.status(400).json({ error: "Informe um modelo para pesquisar." });

    try {
        const result = await pool.request()
            .input("termo", sql.VarChar(100), `%${termo}%`)
            .query(`
                SELECT 
                    CI.Id_ItemCompra,
                    CI.Cod_Toner,
                    CI.Saldo,
                    CI.Valor_Compra,
                    T.Modelo,
                    T.Marca,
                    T.Tipo,
                    C.Cod_Compra,
                    F.Nome AS Fornecedor
                FROM Tbl_ComprasItens CI
                JOIN Tbl_Toner T ON CI.Cod_Toner = T.Cod_Produto
                JOIN Tbl_Compras C ON CI.Cod_Compra = C.Cod_Compra
                JOIN Tbl_Fornecedores F ON C.Cod_Fornecedor = F.Id_Fornecedor
                WHERE T.Modelo LIKE @termo AND CI.Saldo > 0
                ORDER BY T.Modelo ASC, CI.Id_ItemCompra ASC
            `);

        res.json(result.recordset);

    } catch (err) {
        console.error("Erro ao buscar estoque:", err);
        res.status(500).json({ error: "Erro ao buscar estoque." });
    }
});



// ✅ SERVIDOR
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
