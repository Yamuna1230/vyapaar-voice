require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'vyapaarvoice';

async function initDb() {
  // 1. Connect without choosing a database, so we can create it if needed
  const first = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
  });
  await first.query('CREATE DATABASE IF NOT EXISTS `' + DB_NAME + '`');
  await first.end();

  // 2. Now connect to our database
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
  });

  // 3. Create the tables (only if they don't exist yet)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      unit VARCHAR(30) NOT NULL,
      current_quantity DOUBLE NOT NULL DEFAULT 0,
      minimum_quantity DOUBLE NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      action VARCHAR(20) NOT NULL,
      quantity DOUBLE NOT NULL,
      unit VARCHAR(30) NOT NULL,
      source VARCHAR(20) DEFAULT 'typed',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS business_vocabulary (
      id INT AUTO_INCREMENT PRIMARY KEY,
      spoken_term VARCHAR(100) NOT NULL UNIQUE,
      mapped_unit VARCHAR(30),
      mapped_product VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Add demo products only if the table is empty
  const [rows] = await pool.query('SELECT COUNT(*) AS c FROM products');
  if (rows[0].c === 0) {
    await pool.query(
      'INSERT INTO products (name, unit, current_quantity, minimum_quantity) VALUES ?',
      [[
        ['rice', 'bags', 25, 10],
        ['oil', 'liters', 8, 10],
        ['biscuits', 'boxes', 30, 15],
      ]]
    );
  }

  return pool;
}

module.exports = { initDb };