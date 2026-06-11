const mysql = require('mysql2/promise');
require('dotenv').config();

let poolConfig;

if (process.env.DATABASE_URL) {
  // Produção (Render)
  poolConfig = process.env.DATABASE_URL;
} else {
  // Desenvolvimento local
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
