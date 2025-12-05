require("dotenv").config();
const express = require("express");
const sql = require("mssql");
const path = require("path");
const config = require("./db");

// =====================
// 🔐 SESSÃO
// =====================
const session = require("express-session");

const app = express();
app.use(express.json());

// =====================
// CONFIGURAÇÃO DA SESSÃO
// =====================
app.use(
  session({
    secret: "segredo_toner_2025",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 60 * 1000,
      httpOnly: true,
    },
  })
);

// =====================
// SERVE ARQUIVOS ESTÁTICOS (AGORA NO LUGAR CERTO)
// =====================
app.use(express.static(path.join(__dirname, "public")));

// =====================
// 🔐 MIDDLEWARE LOGIN + INATIVIDADE
// =====================
function authMiddleware(req, res, next) {
  const rotasLiberadas = ["/login"];

  if (rotasLiberadas.includes(req.path)) {
    return next();
  }

  // 🔒 Verifica se existe sessão e token
  if (!req.session.usuario || !req.session.usuario.token) {
    return res.redirect("/login");
  }

  // Controle de inatividade
  const agora = Date.now();
  if (!req.session.ultimoAcesso) {
    req.session.ultimoAcesso = agora;
  } else {
    if (agora - req.session.ultimoAcesso > 15 * 60 * 1000) {
      req.session.destroy(() => res.redirect("/login?expirou=1"));
      return;
    }
    req.session.ultimoAcesso = agora;
  }

  next();
}


app.use(authMiddleware);

// =====================
// BLOQUEIO DE HTML
// =====================
app.use((req, res, next) => {
  if (req.path.endsWith(".html") && req.path !== "/login") {
    if (!req.session.usuario) {
      return res.redirect("/login");
    }
  }
  next();
});

// =====================
// BANCO E ROTAS (SEU CÓDIGO ORIGINAL)
// =====================

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
app.use("/contas", require("./public/routes/contas.routes"));

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`)
);
