const mysql = require('mysql2/promise');
require('dotenv').config();

// Verifica se existe a variável DATABASE_URL (Render) ou usa os parâmetros separados (local)
let poolConfig;

if (process.env.DATABASE_URL) {
  // Modo produção (Render, Railway, etc.) – usa string de conexão única
  poolConfig = process.env.DATABASE_URL;
} else {
  // Modo desenvolvimento local – usa variáveis separadas
  poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
  };
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;
