// Turns what the shop owner said or typed into a structured command.
// Understands English, romanised Telugu ("vachindi", "entha undi") and Telugu script.
// Words that are specific to a shop (bastha = bags, nune = oil ...) come from the
// business_vocabulary table, so they can be edited without touching this file.
const { normalizeUnit } = require('./inventoryService');

const ADD_WORDS = new Set([
  'add', 'added', 'adding', 'received', 'receive', 'got', 'came', 'arrived',
  'bought', 'purchased', 'purchase', 'restock', 'restocked', 'stocked',
  'vachindi', 'vachayi', 'vachai', 'vacchindi', 'vacchayi', 'vachhindi', 'vachhayi',
  'konnanu', 'konnamu', 'techanu', 'techamu', 'jodinchu', 'cherchu',
  'వచ్చింది', 'వచ్చాయి', 'కొన్నాను', 'తెచ్చాను', 'జోడించు', 'చేర్చు', 'యాడ్',
]);

const REMOVE_WORDS = new Set([
  'remove', 'removed', 'sold', 'sell', 'sale', 'dispatch', 'dispatched', 'issued',
  'issue', 'delivered', 'deliver', 'used', 'deduct', 'minus', 'gone', 'went',
  'poyindi', 'poyayi', 'poyai', 'poindi', 'ammanu', 'ammamu', 'ammesanu', 'ammesamu',
  'icchanu', 'icchamu', 'tesesanu', 'teeseyi', 'teeseyyi', 'tiseyi',
  'తీసేయి', 'తీసేయ్', 'అమ్మాను', 'అమ్మేశాను', 'ఇచ్చాను', 'పోయింది', 'పోయాయి', 'రిమూవ్',
]);

const CHECK_WORDS = new Set([
  'entha', 'enta', 'ఎంత', 'kitna', 'check', 'balance', 'remaining', 'left', 'how', 'show', 'status',
]);

const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  okati: 1, rendu: 2, moodu: 3, mudu: 3, nalugu: 4, aidu: 5, aaru: 6, edu: 7,
  enimidi: 8, tommidi: 9, padi: 10, iravai: 20, muppai: 30, nalabhai: 40, yabhai: 50, nooru: 100,
};

// Words that are never part of a product name
const FILLER = new Set([
  'of', 'the', 'a', 'an', 'in', 'to', 'from', 'stock', 'my', 'is', 'are', 'was', 'did',
  'please', 'kindly', 'and', 'for', 'some', 'any', 'undi', 'ki', 'ni', 'lo', 'nundi',
  'yokka', 'it', 'now', 'today', 'new', 'more', 'total', 'much', 'many',
]);

function fail(code, message) {
  return { ok: false, error: { status: 'error', code, message } };
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u0C66-\u0C6F]/g, (d) => String(d.charCodeAt(0) - 0x0c66)) // Telugu digits -> 0-9
    .replace(/(\d)(\p{L})/gu, '$1 $2') // "20kg" -> "20 kg"
    .replace(/\.(?!\d)/g, ' ') // drop full stops, keep decimals like 2.5
    .replace(/[^\p{L}\p{M}\p{N}.\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Swap the shop's own words for the standard ones (bastha -> bags, nune -> oil)
function applyVocabulary(text, vocab) {
  let out = ' ' + text + ' ';
  const rows = vocab
    .map((v) => ({
      term: normalizeText(v.spoken_term),
      to: normalizeText(v.mapped_product || v.mapped_unit || ''),
    }))
    .filter((v) => v.term && v.to)
    .sort((a, b) => b.term.length - a.term.length);
  for (const { term, to } of rows) {
    out = out.replace(
      new RegExp('(\\s)' + escapeRegExp(term) + '(?=\\s)', 'gu'),
      (m, space) => space + to
    );
  }
  return out.trim();
}

function findProductInText(text, products) {
  const padded = ' ' + text + ' ';
  const names = products.map((p) => String(p.name).toLowerCase()).sort((a, b) => b.length - a.length);
  for (const name of names) {
    const variants = [name, name.endsWith('s') ? name.slice(0, -1) : name + 's'];
    for (const v of variants) {
      if (padded.includes(' ' + v + ' ')) return { name, matched: v };
    }
  }
  return null;
}

const HELP =
  'Try “20 bags rice vachindi”, “Rice stock entha undi?” or “Remove 50 bags of rice”.';

async function parseCommand(db, rawText) {
  const original = String(rawText || '').trim();
  if (!original) return fail('EMPTY_COMMAND', 'Say or type something first. ' + HELP);

  const [products] = await db.query('SELECT name FROM products');
  let vocab = [];
  try {
    [vocab] = await db.query(
      'SELECT spoken_term, mapped_unit, mapped_product FROM business_vocabulary'
    );
  } catch (err) {
    vocab = [];
  }

  let text = applyVocabulary(normalizeText(original), vocab);

  // Product: prefer a product we actually stock
  let product = null;
  const found = findProductInText(text, products);
  if (found) {
    product = found.name;
    text = (' ' + text + ' ').replace(' ' + found.matched + ' ', ' ').trim();
  }

  const tokens = text.split(' ').filter(Boolean);

  // Quantity: the first number (digits or a number word)
  let quantity = null;
  let qIndex = -1;
  tokens.forEach((t, i) => {
    if (quantity !== null) return;
    if (/^\d+(\.\d+)?$/.test(t)) {
      quantity = Number(t);
      qIndex = i;
    } else if (NUMBER_WORDS[t] !== undefined) {
      quantity = NUMBER_WORDS[t];
      qIndex = i;
    }
  });

  // Unit: prefer the word right after the number
  let unit = qIndex >= 0 ? normalizeUnit(tokens[qIndex + 1]) : null;
  if (!unit) {
    for (let i = 0; i < tokens.length; i++) {
      if (i === qIndex) continue;
      const u = normalizeUnit(tokens[i]);
      if (u) {
        unit = u;
        break;
      }
    }
  }

  // Intent
  let addAt = -1;
  let removeAt = -1;
  let hasCheck = false;
  tokens.forEach((t, i) => {
    if (ADD_WORDS.has(t) && addAt < 0) addAt = i;
    if (REMOVE_WORDS.has(t) && removeAt < 0) removeAt = i;
    if (CHECK_WORDS.has(t)) hasCheck = true;
  });

  let intent = null;
  if (quantity !== null && (addAt >= 0 || removeAt >= 0)) {
    intent = removeAt >= 0 && (addAt < 0 || removeAt < addAt) ? 'REMOVE_STOCK' : 'ADD_STOCK';
  } else if (hasCheck) {
    intent = 'CHECK_STOCK';
  } else if (addAt >= 0 || removeAt >= 0) {
    return fail('MISSING_QUANTITY', 'How many? For example: “20 bags rice vachindi”.');
  } else {
    return fail('UNKNOWN_COMMAND', "I didn't catch that. " + HELP);
  }

  // Product we don't stock: use what is left over, so the user hears "did you mean ...?"
  if (!product) {
    const rest = tokens.filter(
      (t, i) =>
        i !== qIndex &&
        !ADD_WORDS.has(t) &&
        !REMOVE_WORDS.has(t) &&
        !CHECK_WORDS.has(t) &&
        !FILLER.has(t) &&
        !normalizeUnit(t) &&
        NUMBER_WORDS[t] === undefined &&
        !/^\d+(\.\d+)?$/.test(t)
    );
    product = rest.join(' ') || null;
  }
  if (!product) return fail('MISSING_PRODUCT', 'Which product? ' + HELP);

  return { ok: true, intent, product, quantity, unit };
}

module.exports = { parseCommand, normalizeText };
