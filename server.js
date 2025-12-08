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
      maxAge: 30 * 60 * 1000, // 30 minutos
      httpOnly: true,
    },
  })
);

// =====================
// BLOQUEIO DE ARQUIVOS HTML (ANTES DO STATIC)
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
// SERVE ARQUIVOS ESTÁTICOS (img, css, js)
// =====================
app.use(
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-store");
      }
    },
  })
);

// =====================
// 🔐 MIDDLEWARE DE AUTENTICAÇÃO + INATIVIDADE
// =====================
function authMiddleware(req, res, next) {
  const rotasLiberadas = ["/login"];

  if (rotasLiberadas.includes(req.path)) {
    return next();
  }

  if (!req.session.usuario) {
    return res.redirect("/login");
  }

  const agora = Date.now();
  const limite = 15 * 60 * 1000; // 15 minutos

  if (req.session.ultimoAcesso && agora - req.session.ultimoAcesso > limite) {
    req.session.destroy(() => {
      return res.redirect("/login?expirou=1");
    });
    return;
  }

  req.session.ultimoAcesso = agora;

  next();
}

app.use(authMiddleware);

// =====================
// BANCO (SEU CÓDIGO ORIGINAL)
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

// =====================
// ROTAS (SUAS ROTAS ORIGINAIS)
// =====================
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

// =====================
// SERVIDOR
// =====================
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`)
);
