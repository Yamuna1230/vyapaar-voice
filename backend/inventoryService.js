// ---------- Units ----------
// Different spellings that mean the same unit
const UNIT_ALIASES = {
  kg: 'kg', kgs: 'kg', kilo: 'kg', kilos: 'kg', kilogram: 'kg', kilograms: 'kg',
  g: 'g', gram: 'g', grams: 'g',
  quintal: 'quintal', quintals: 'quintal',
  ton: 'ton', tons: 'ton', tonne: 'ton', tonnes: 'ton',
  bag: 'bags', bags: 'bags',
  carton: 'cartons', cartons: 'cartons',
  box: 'boxes', boxes: 'boxes',
  dozen: 'dozen', dozens: 'dozen',
  piece: 'pieces', pieces: 'pieces', pcs: 'pieces',
  liter: 'liters', liters: 'liters', litre: 'liters', litres: 'liters', l: 'liters',
};

// Conversions that are always true.
// NOTE: we never convert "bag" to "kg", because bag sizes differ by product.
const FAMILIES = {
  weight: { g: 0.001, kg: 1, quintal: 100, ton: 1000 },
  count: { pieces: 1, dozen: 12 },
};

function normalizeUnit(unit) {
  if (!unit) return null;
  return UNIT_ALIASES[String(unit).trim().toLowerCase()] || null;
}

function convertQuantity(quantity, fromUnit, toUnit) {
  if (fromUnit === toUnit) return quantity;
  for (const family of Object.values(FAMILIES)) {
    if (family[fromUnit] && family[toUnit]) {
      return (quantity * family[fromUnit]) / family[toUnit];
    }
  }
  return null; // these two units can't be converted
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function error(code, message, extra = {}) {
  return { status: 'error', code, message, ...extra };
}

// ---------- Finding a product ----------
async function findProduct(db, name) {
  const wanted = String(name || '').trim().toLowerCase();
  if (!wanted) return { product: null, suggestions: [] };
  const [rows] = await db.query('SELECT * FROM products');
  const exact = rows.find((p) => p.name === wanted);
  if (exact) return { product: exact, suggestions: [] };
  const suggestions = rows.filter(
    (p) => p.name.includes(wanted) || wanted.includes(p.name)
  );
  return { product: null, suggestions };
}

function productNotFound(name, suggestions) {
  if (suggestions.length > 0) {
    const names = suggestions.map((p) => p.name).join(' or ');
    return error(
      'PRODUCT_NOT_FOUND',
      "I couldn't find '" + name + "'. Did you mean " + names + '?',
      { suggestions: suggestions.map((p) => p.name) }
    );
  }
  return error('PRODUCT_NOT_FOUND', "I couldn't find '" + name + "' in your stock.");
}

// ---------- Create a product ----------
// Used when the shop owner adds stock for something we don't carry yet.
// The unit is required: without it we would not know what the number means.
async function createProduct(db, { name, unit, quantity, minimum = 0, source = 'typed' }) {
  const cleanName = String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!cleanName) return error('MISSING_PRODUCT', 'Which product should I add?');
  if (cleanName.length > 100) {
    return error('INVALID_PRODUCT', "That product name is too long. Try a shorter one.");
  }

  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return error('INVALID_QUANTITY', 'Quantity must be a number greater than zero.');
  }

  // No unit said: count it in pieces, which the owner can change later.
  let stockUnit = 'pieces';
  if (unit) {
    stockUnit = normalizeUnit(unit);
    if (!stockUnit) return error('UNKNOWN_UNIT', "I don't know the unit '" + unit + "'.");
  }

  const amount = round(qty);
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // ON DUPLICATE KEY covers the race where the same product is created twice
    // at once; products.name is UNIQUE, so the second call just tops up instead.
    await conn.query(
      `INSERT INTO products (name, unit, current_quantity, minimum_quantity)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE current_quantity = current_quantity + VALUES(current_quantity)`,
      [cleanName, stockUnit, amount, Number(minimum) || 0]
    );

    const [rows] = await conn.query('SELECT * FROM products WHERE name = ?', [cleanName]);
    const p = rows[0];

    await conn.query(
      'INSERT INTO transactions (product_id, action, quantity, unit, source) VALUES (?, ?, ?, ?, ?)',
      [p.id, 'ADD_STOCK', amount, p.unit, source]
    );
    await conn.commit();

    return {
      status: 'done',
      created: true,
      message:
        'Added ' + cap(p.name) + ' to your stock: ' + p.current_quantity + ' ' + p.unit +
        '. Say “set minimum for ' + p.name + '” later to get low-stock warnings.',
      product: {
        name: p.name,
        unit: p.unit,
        current_quantity: p.current_quantity,
        minimum_quantity: p.minimum_quantity,
        low_stock: p.current_quantity < p.minimum_quantity,
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- Add / Remove stock ----------
// action: 'ADD_STOCK' or 'REMOVE_STOCK'
// force: true means "yes, I confirm, continue anyway"
async function changeStock(db, { product, quantity, unit, action, force = false, source = 'typed' }) {
  // 1. Check the numbers (we never trust the input)
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return error('INVALID_QUANTITY', 'Quantity must be a number greater than zero.');
  }

  // 2. Find the product.
  // Not stocked yet + the owner is adding? Offer to create it instead of failing.
  const found = await findProduct(db, product);
  if (!found.product) {
    // Removing something we don't have is still an error.
    if (action !== 'ADD_STOCK') return productNotFound(product, found.suggestions);

    // Close to an existing name: more likely a mis-hearing than a new product.
    if (found.suggestions.length > 0 && !force) {
      return productNotFound(product, found.suggestions);
    }

    if (!force) {
      return {
        status: 'needs_confirmation',
        code: 'NEW_PRODUCT',
        message:
          "'" + product + "' is not in your stock yet. Add it as a new product with " +
          qty + ' ' + (normalizeUnit(unit) || 'pieces') + '?',
      };
    }

    return createProduct(db, { name: product, unit, quantity: qty, source });
  }
  const stockUnit = normalizeUnit(found.product.unit) || found.product.unit;

  // 3. Check the unit. If none was said, use the product's own unit.
  let givenUnit = stockUnit;
  if (unit) {
    givenUnit = normalizeUnit(unit);
    if (!givenUnit) {
      return error('UNKNOWN_UNIT', "I don't know the unit '" + unit + "'.");
    }
  }
  const converted = convertQuantity(qty, givenUnit, stockUnit);
  if (converted === null) {
    return error(
      'UNIT_MISMATCH',
      found.product.name + ' is counted in ' + found.product.unit +
        ". I can't convert " + givenUnit + ' to ' + found.product.unit + '.'
    );
  }
  const amount = round(converted);

  // 4. Update stock and write the history entry together (all or nothing)
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT * FROM products WHERE id = ? FOR UPDATE',
      [found.product.id]
    );
    const p = rows[0];
    const current = p.current_quantity;
    let newQty;
    let changed = amount;
    let message;

    if (action === 'ADD_STOCK') {
      newQty = round(current + amount);
      message = 'Added ' + amount + ' ' + p.unit + ' of ' + p.name + '.';
    } else if (action === 'REMOVE_STOCK') {
      if (amount > current && !force) {
        await conn.rollback();
        return {
          status: 'needs_confirmation',
          code: 'INSUFFICIENT_STOCK',
          message: 'You only have ' + current + ' ' + p.unit + ' of ' + p.name +
            '. Do you still want to continue?',
        };
      }
      changed = Math.min(amount, current);
      newQty = round(current - changed);
      message = 'Removed ' + changed + ' ' + p.unit + ' of ' + p.name + '.';
    } else {
      await conn.rollback();
      return error('UNKNOWN_ACTION', 'Unknown action.');
    }

    await conn.query('UPDATE products SET current_quantity = ? WHERE id = ?', [newQty, p.id]);
    await conn.query(
      'INSERT INTO transactions (product_id, action, quantity, unit, source) VALUES (?, ?, ?, ?, ?)',
      [p.id, action, changed, p.unit, source]
    );
    await conn.commit();

    const low = newQty < p.minimum_quantity;
    message += ' ' + cap(p.name) + ' now: ' + newQty + ' ' + p.unit + '.';
    if (low) message += ' ' + cap(p.name) + ' is below your minimum stock level.';

    return {
      status: 'done',
      message,
      product: {
        name: p.name,
        unit: p.unit,
        current_quantity: newQty,
        minimum_quantity: p.minimum_quantity,
        low_stock: low,
      },
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// ---------- Check one product ----------
async function checkStock(db, name) {
  const found = await findProduct(db, name);
  if (!found.product) return productNotFound(name, found.suggestions);
  const p = found.product;
  const low = p.current_quantity < p.minimum_quantity;
  return {
    status: 'done',
    message: p.name + ': ' + p.current_quantity + ' ' + p.unit,
    product: { ...p, low_stock: low },
  };
}

// ---------- History ----------
async function getHistory(db, limit = 20) {
  const [rows] = await db.query(
    `SELECT t.id, p.name AS product, t.action, t.quantity, t.unit, t.source, t.created_at
     FROM transactions t JOIN products p ON p.id = t.product_id
     ORDER BY t.id DESC LIMIT ?`,
    [Number(limit) || 20]
  );
  return rows;
}

module.exports = {
  changeStock,
  createProduct,
  checkStock,
  getHistory,
  findProduct,
  normalizeUnit,
};