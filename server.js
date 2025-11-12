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

            /*// 🔄 Busca últimas 5 vendas desse modelo
            const vendas = await pool.request()
                .input("modelo", sql.VarChar(100), toner.Modelo)
                .query(`
                    SELECT TOP 5 Cliente, Data_Venda, Quantidade
                    FROM Tbl_Vendas
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
        const clienteResult = await pool.request()
            .input("nome", sql.VarChar, `%${nome}%`)
            .query("SELECT TOP 1 Id_cliente, Nome, Ativo, Id_vendedor FROM Tbl_Clientes WHERE Nome LIKE @nome");

        if (clienteResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cliente não encontrado" });
        }

        const cliente = clienteResult.recordset[0];

        /*const comprasResult = await pool.request()
            .input("id", sql.Int, cliente.Id_cliente)
            .query(`
                SELECT TOP 5 c.Data, t.Modelo AS Produto, c.Quantidade
                FROM Tbl_Compra c
                JOIN Tbl_Toner t ON c.Id_toner = t.Cod_Produto
                WHERE c.Id_cliente = @id
                ORDER BY c.Data DESC
            `); */

        res.json({ cliente, compras: [] });
    } catch (error) {
        console.error("Erro ao pesquisar cliente:", error);
        res.status(500).json({ error: "Erro ao pesquisar cliente" });
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
                (SELECT COUNT(Id_Fornecedor) FROM Tbl_Fornecedores WHERE Status = 1) AS totalFornecedores
        `);

        res.json(result.recordset[0]);
    } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
        res.status(500).send("Erro ao buscar dados do dashboard");
    }
});

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
                .input("Cod_Toner", sql.Int, item.Cod_Produto)
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



// ✅ SERVIDOR
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
