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
// 🔐 MIDDLEWARE DE AUTENTICAÇÃO + INATIVIDADE
// =====================
function authMiddleware(req, res, next) {
  const rotasLiberadas = ["/login", "/login/", "/login.html"];

  // rota liberada
  if (rotasLiberadas.includes(req.path) || req.path.startsWith("/login")) {
    return next();
  }


  // se não estiver logado, volta ao login
  if (!req.session.usuario) {
    return res.redirect("/login");
  }

  // controle de inatividade
  const agora = Date.now();
  const limite = 15 * 60 * 1000;

  if (req.session.ultimoAcesso && agora - req.session.ultimoAcesso > limite) {
    req.session.destroy(() => {
      return res.redirect("/login?expirou=1");
    });
    return;
  }

  req.session.ultimoAcesso = agora;

  next();
}

// =====================
// BLOQUEIO DE ARQUIVOS HTML
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
// ARQUIVOS ESTÁTICOS
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

app.use(authMiddleware);

// redirecionamento padrão
app.get("/", (req, res) => {
  if (req.session.usuario) {
    return res.redirect("/dashboard.html");
  }
  return res.redirect("/login");
});

// =====================
// BANCO
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
// ROTAS
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
app.use("/contagem", require("./public/routes/contagem.routes"));


// =====================
// SERVIDOR
// =====================
const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Servidor rodando em http://localhost:${PORT}`)
);
