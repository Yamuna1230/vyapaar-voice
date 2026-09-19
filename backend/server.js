const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const inventory = require('./inventoryService');

async function main() {
  const db = await initDb();

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Quick check that the server is alive
  app.get('/api/health', (req, res) => {
    res.json({ ok: true });
  });

  // List all products, with a low_stock flag
  app.get('/api/inventory', async (req, res) => {
    try {
      const [products] = await db.query('SELECT * FROM products ORDER BY name');
      const result = products.map((p) => ({
        ...p,
        low_stock: p.current_quantity < p.minimum_quantity,
      }));
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Database error' });
    }
  });

  // Wrapper: turns any crash into a clean error message
  const safe = (fn) => async (req, res) => {
    try {
      res.json(await fn(req));
    } catch (err) {
      console.error(err);
      res.status(500).json({
        status: 'error',
        code: 'SERVER_ERROR',
        message: 'Something went wrong on the server.',
      });
    }
  };

  // Add stock
  app.post('/api/inventory/add', safe((req) => {
    const { product, quantity, unit } = req.body;
    return inventory.changeStock(db, { product, quantity, unit, action: 'ADD_STOCK' });
  }));

  // Remove stock (send "force": true after the user confirms a warning)
  app.post('/api/inventory/remove', safe((req) => {
    const { product, quantity, unit, force } = req.body;
    return inventory.changeStock(db, {
      product, quantity, unit, action: 'REMOVE_STOCK', force: force === true,
    });
  }));

  // Check one product, e.g. /api/inventory/rice
  app.get('/api/inventory/:product', safe((req) => {
    return inventory.checkStock(db, req.params.product);
  }));

  // Recent history
  app.get('/api/history', safe((req) => {
    return inventory.getHistory(db, req.query.limit);
  }));


  const PORT = 4000;
  app.listen(PORT, () => {
    console.log('Backend running on http://localhost:' + PORT);
  });
}

main().catch((err) => {
  console.error('Could not start the backend:', err.message);
  process.exit(1);
});