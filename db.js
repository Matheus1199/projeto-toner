const sql = require('mssql');

// Configuração do seu banco SQL Server
const config = {
    user: 'sa',
    password: 'sql@964012',
    server: '192.168.10.250', // exemplo: '192.168.1.10'
    database: 'barsottisolucoes_teste',
    options: {
        encrypt: false, // true se usar Azure
        trustServerCertificate: true
    }
};

module.exports = config;
