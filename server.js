require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const path = require("path");
const config = require("./db");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function initDatabase() {
    try {
        const pool = await sql.connect(config);

        app.set("db", pool);
        app.set("sql", sql);

    } catch (err) {
        console.error("❌ Erro ao conectar no banco:", err);
        process.exit(1);
    }
}

initDatabase();

// ROTAS
app.use("/login", require("./public/routes/auth.routes"));
app.use("/toners", require("./public/routes/toners.routes"));
app.use("/clientes", require("./public/routes/clientes.routes"));
app.use("/fornecedores", require("./public/routes/fornecedores.routes"));
app.use("/dashboard", require("./public/routes/dashboard.routes"));
app.use("/compras", require("./public/routes/compras.routes"));
app.use("/vendas", require("./public/routes/vendas.routes"));
app.use("/estoque", require("./public/routes/estoque.routes"));
app.use("/pagrec", require("./public/routes/pagrec.routes"));

const PORT = 3000;
app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
