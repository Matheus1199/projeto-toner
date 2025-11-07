require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const path = require('path');
const config = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// LOGIN
app.post('/login', async (req, res) => {
    const { usuario, senha } = req.body;

    try {
        await sql.connect(config);
        const result = await sql.query`
            SELECT token FROM Tbl_SupUsuarios
            WHERE usuario = ${usuario} AND senha = ${senha}
        `;

        if (result.recordset.length > 0) {
            const token = result.recordset[0].token;
            res.json({ success: true, token });
        } else {
            res.json({ success: false, message: 'Usuário ou senha inválidos' });
        }
    } catch (err) {
        console.error('Erro ao conectar no banco:', err);
        res.status(500).json({ success: false, error: 'Erro no servidor' });
    }
});

// VERIFICAR TOKEN (para proteger páginas)
app.post('/verificar-token', async (req, res) => {
    const { token } = req.body;

    try {
        await sql.connect(config);
        const result = await sql.query`
      SELECT * FROM Tbl_SupUsuarios WHERE Token = ${token}
    `;
        if (result.recordset.length > 0) {
            res.json({ valido: true });
        } else {
            res.json({ valido: false });
        }
    } catch (err) {
        console.error('Erro ao validar token:', err);
        res.status(500).json({ valido: false });
    }
});
// 🔹 Rota para cadastrar toner
app.post('/api/toners', async (req, res) => {
    const { modelo, marca, cor, tipo, valor } = req.body;

    try {
        const pool = await sql.connect(dbConfig);
        await pool.request()
            .input('modelo', sql.VarChar, modelo)
            .input('marca', sql.VarChar, marca)
            .input('cor', sql.VarChar, cor)
            .input('tipo', sql.VarChar, tipo)
            .input('valor', sql.Decimal(10, 2), valor)
            .query(`
        INSERT INTO Tbl_Toner (Modelo, Marca, Cor, Tipo )
        VALUES (@modelo, @marca, @cor, @tipo )
      `);

        res.status(200).json({ message: 'Toner cadastrado com sucesso!' });
    } catch (error) {
        console.error('Erro ao cadastrar toner:', error);
        res.status(500).json({ error: 'Erro ao cadastrar toner' });
    }
});

// 🔹 Rota para listar todos os toners
app.get('/api/toners', async (req, res) => {
    try {
        const pool = await sql.connect(dbConfig);
        const result = await pool.request().query('SELECT * FROM Tbl_Toner');
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Erro ao listar toners:', error);
        res.status(500).json({ error: 'Erro ao listar toners' });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
