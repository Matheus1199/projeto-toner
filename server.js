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

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
