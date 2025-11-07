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
            SELECT * FROM Tbl_SupUsuarios WHERE usuario = ${usuario} AND senha = ${senha}
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



// ✅ CADASTRAR TONER (POST)
app.post('/api/toners', async (req, res) => {
    const { modelo, marca, tipo } = req.body;

    try {
        const pool = await sql.connect(config);
        await pool.request()
            .input("modelo", sql.VarChar(100), modelo)
            .input("tipo", sql.VarChar(100), tipo)
            .input("marca", sql.VarChar(50), marca)
            .query(`
                INSERT INTO Tbl_Toner (modelo, marca, tipo)
                VALUES (@modelo, @marca, @tipo)
            `);

        res.status(201).json({ message: "Toner cadastrado com sucesso!" });
    } catch (error) {
        console.error("Erro ao cadastrar toner:", error);
        res.status(500).json({ error: "Erro ao cadastrar toner" });
    }
});



// ✅ LISTAR TODOS OS TONERS (GET)
app.get('/api/toners', async (req, res) => {
    try {
        const pool = await sql.connect(config); // ✅ corrigido
        const result = await pool.request().query('SELECT Cod_Produto, Tipo, Marca, Modelo FROM Tbl_Toner');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar toners:', error);
        res.status(500).json({ error: 'Erro ao listar toners' });
    }
});



// ✅ ATUALIZAR TONER (PUT)
app.put('/api/toners/:id', async (req, res) => {
    const { Cod_Produto } = req.params;
    const { modelo, marca, tipo } = req.body;

    try {
        const pool = await sql.connect(config);

        const result = await pool.request()
            .input("Cod_Produto", sql.Int, Cod_Produto)
            .input("modelo", sql.VarChar(100), modelo)
            .input("marca", sql.VarChar(50), marca)
            .input("tipo", sql.VarChar(100), tipo)
            .query(`
                UPDATE Tbl_Toner 
                SET Modelo = @modelo,
                    tipo = @tipo
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



// ✅ EXCLUIR TONER (DELETE)
app.delete('/api/toners/:id', async (req, res) => {
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

// ✅ SERVIDOR
const PORT = 3000;
app.listen(PORT, () => console.log(`✅ Servidor rodando em http://localhost:${PORT}`));
