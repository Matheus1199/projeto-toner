const sql = require('mssql');

//const fs = require("fs");

//const DB_HOST = fs.readFileSync("/run/secrets/DB_SERVER", "utf8").trim();
//const DB_PASS = fs.readFileSync("/run/secrets/DB_PASSWORD", "utf8").trim();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10),
  options: {
    encrypt: false, // ou true se usar SSL
    trustServerCertificate: true,
  },
};

async function connectDB() {
    try {
        await sql.connect(config);
        console.log('Conectado ao banco de dados com sucesso!');
    } catch (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    }
}

connectDB();

