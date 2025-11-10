require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');
const config = require('./db'); // ✅ configuração correta

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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
        const pool = await sql.connect(config);
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

// ✅ EDITAR TONER
app.put('/toners/:Cod_Produto', async (req, res) => {
    const { Cod_Produto } = req.params;
    const { modelo, marca, tipo } = req.body;

    try {
        const pool = await sql.connect(config);
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
        const pool = await sql.connect(config);
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

// ✅ PESQUISAR TONER (estoque + últimas vendas)
app.get('/toners/pesquisar', async (req, res) => {
    const { termo } = req.query;

    if (!termo || termo.trim() === "") {
        return res.status(400).json({ error: "Informe um termo para pesquisa." });
    }

    try {
        const pool = await sql.connect(config);

        // 1️⃣ Busca toner correspondente (modelo, marca ou tipo)
        const tonerResult = await pool.request()
            .input("termo", sql.VarChar(100), `%${termo}%`)
            .query(`
                SELECT TOP 1 Cod_Produto, Modelo, Marca, Tipo
                FROM Tbl_Toner
                WHERE Modelo LIKE @termo OR Marca LIKE @termo OR Tipo LIKE @termo
            `);

        if (tonerResult.recordset.length === 0) {
            return res.status(404).json({ error: "Toner não encontrado." });
        }

        const toner = tonerResult.recordset[0];

        /*// 2️⃣ Busca as últimas 5 vendas desse toner
        const vendasResult = await pool.request()
            .input("Cod_Produto", sql.Int, toner.Cod_Produto)
            .query(`
                SELECT TOP 5 
                    v.Data_Venda AS data,
                    c.Nome AS cliente,
                    v.Quantidade AS quantidade
                FROM Tbl_Vendas v
                INNER JOIN Tbl_Clientes c ON v.Id_Cliente = c.Id_Cliente
                WHERE v.Cod_Produto = @Cod_Produto
                ORDER BY v.Data_Venda DESC
            `);*/

        res.json({
            toner: {
                modelo: toner.Modelo,
                marca: toner.Marca,
                tipo: toner.Tipo
            },
            vendas: [] // vazio por enquanto
        });

    } catch (error) {
        console.error("Erro ao pesquisar toner:", error);
        res.status(500).json({ error: "Erro ao pesquisar toner." });
    }
});


// ✅ CADASTRAR CLIENTE
app.post('/clientes', async (req, res) => {
    const { nome, ativo, id_vendedor } = req.body;

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input("nome", sql.VarChar(100), nome)
            .input("ativo", sql.Bit, ativo)
            .input("id_vendedor", sql.Int, id_vendedor)
            .query(`
                INSERT INTO Tbl_Clientes (Nome, Ativo, Id_Vendedor)
                VALUES (@nome, @ativo, @id_vendedor)
            `);

        res.status(201).json({ message: "Cliente cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar cliente:", error);
        res.status(500).json({ error: "Erro ao cadastrar cliente" });
    }
});


// ✅ LISTAR CLIENTES
app.get('/clientes', async (req, res) => {
    try {
        const pool = await sql.connect(config);
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
        const pool = await sql.connect(config);
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
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input("Id_cliente", sql.Int, Id_cliente)
            .input("nome", sql.VarChar(100), nome)
            .input("ativo", sql.Bit, ativo)
            .input("id_vendedor", sql.Int, id_vendedor)
            .query(`
                UPDATE Tbl_Clientes
                SET Nome = @nome,
                    Ativo = @ativo,
                    Id_Vendedor = @id_vendedor
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
        const pool = await sql.connect(config);
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

// ✅ SERVIDOR
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
