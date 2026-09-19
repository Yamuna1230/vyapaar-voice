const express = require('express');
const cors = require('cors');
const { initDb, resetDemo } = require('./db');
const inventory = require('./inventoryService');
const { parseCommand } = require('./commandParser');

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

  // Voice / typed command, e.g. "20 bags rice vachindi"
  // Send "force": true (with the same text) after the user confirms a warning.
  app.post('/api/command', safe(async (req) => {
    const { text, force, source } = req.body;
    const parsed = await parseCommand(db, text);
    if (!parsed.ok) return parsed.error;

    const { intent, product, quantity, unit } = parsed;

    if (intent === 'CHECK_STOCK') {
      const result = await inventory.checkStock(db, product);
      if (result.status === 'done') {
        const p = result.product;
        const name = p.name.charAt(0).toUpperCase() + p.name.slice(1);
        result.message = name + ': ' + p.current_quantity + ' ' + p.unit + ' in stock.';
        if (p.low_stock) {
          result.message += ' That is below your minimum of ' + p.minimum_quantity + ' ' + p.unit + '.';
        }
      }
      return { ...result, intent };
    }

    const result = await inventory.changeStock(db, {
      product,
      quantity,
      unit,
      action: intent,
      force: force === true,
      source: source === 'voice' ? 'voice' : 'typed',
    });
    return { ...result, intent };
  }));

  // Put the demo stock and history back
  app.post('/api/reset-demo', safe(async () => {
    await resetDemo(db);
    return { status: 'done', message: 'Demo data restored.' };
  }));

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