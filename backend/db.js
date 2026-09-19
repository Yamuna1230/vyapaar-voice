require('dotenv').config();
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'vyapaarvoice';

// name, unit, current quantity, minimum quantity
const DEMO_PRODUCTS = [
  ['rice', 'bags', 45, 10],
  ['oil', 'liters', 8, 10],
  ['biscuits', 'boxes', 30, 15],
];

// product, action, quantity, time of day (today)
const DEMO_ACTIVITY = [
  ['oil', 'ADD_STOCK', 10, '10:05:00'],
  ['biscuits', 'REMOVE_STOCK', 5, '12:40:00'],
  ['rice', 'ADD_STOCK', 20, '15:15:00'],
];

// The shop's own words: spoken term, standard unit, standard product
const DEMO_VOCABULARY = [
  ['bastha', 'bags', null],
  ['basta', 'bags', null],
  ['bastalu', 'bags', null],
  ['బస్తా', 'bags', null],
  ['బస్తాలు', 'bags', null],
  ['sack', 'bags', null],
  ['sacks', 'bags', null],
  ['dabba', 'boxes', null],
  ['dabbalu', 'boxes', null],
  ['డబ్బా', 'boxes', null],
  ['డబ్బాలు', 'boxes', null],
  ['nune', null, 'oil'],
  ['నూనె', null, 'oil'],
  ['biyyam', null, 'rice'],
  ['biyam', null, 'rice'],
  ['బియ్యం', null, 'rice'],
  ['biscuitlu', null, 'biscuits'],
  ['బిస్కెట్లు', null, 'biscuits'],
  ['బిస్కెట్', null, 'biscuits'],
];

async function seedDemo(pool) {
  await pool.query(
    'INSERT INTO products (name, unit, current_quantity, minimum_quantity) VALUES ?',
    [DEMO_PRODUCTS]
  );
  const [rows] = await pool.query('SELECT id, name, unit FROM products');
  const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
  for (const [name, action, quantity, time] of DEMO_ACTIVITY) {
    const p = byName[name];
    if (!p) continue;
    await pool.query(
      `INSERT INTO transactions (product_id, action, quantity, unit, source, created_at)
       VALUES (?, ?, ?, ?, 'typed', TIMESTAMP(CURDATE(), ?))`,
      [p.id, action, quantity, p.unit, time]
    );
  }
}

// Wipes stock + history and puts the demo data back (used by the "Reset demo" link)
async function resetDemo(pool) {
  await pool.query('DELETE FROM transactions');
  await pool.query('DELETE FROM products');
  await seedDemo(pool);
}

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

  // 4. Add demo data only if the tables are empty
  const [products] = await pool.query('SELECT COUNT(*) AS c FROM products');
  if (products[0].c === 0) await seedDemo(pool);

  const [vocab] = await pool.query('SELECT COUNT(*) AS c FROM business_vocabulary');
  if (vocab[0].c === 0) {
    await pool.query(
      'INSERT INTO business_vocabulary (spoken_term, mapped_unit, mapped_product) VALUES ?',
      [DEMO_VOCABULARY]
    );
  }

  return pool;
}

module.exports = { initDb, resetDemo };
