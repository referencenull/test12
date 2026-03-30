'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// --- Simple in-memory rate limiter ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX       = 200;        // requests per window per IP
const rateLimitStore       = new Map();

function rateLimit(req, res, next) {
  const ip  = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  const rec = rateLimitStore.get(ip);

  if (!rec || now - rec.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { start: now, count: 1 });
    return next();
  }

  rec.count += 1;
  if (rec.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests – please slow down.' });
  }
  next();
}

// Middleware
app.use(express.json());
app.use(rateLimit);
app.use(express.static(path.join(__dirname, 'public')));

// --- DB helpers ---
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read database file:', err.message);
    throw new Error('Database unavailable');
  }
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function nextId(products) {
  return products.length === 0 ? 1 : Math.max(...products.map((p) => p.id)) + 1;
}

// --- API Routes ---

// GET /api/products  – list all (with optional search/filter)
app.get('/api/products', (req, res) => {
  const { search, category } = req.query;
  let products = readDB();

  if (category && category !== 'All') {
    products = products.filter((p) => p.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }

  res.json(products);
});

// GET /api/stats – total and low-stock counts across all products
app.get('/api/stats', (req, res) => {
  const products = readDB();
  res.json({
    total: products.length,
    lowStock: products.filter((p) => p.quantity <= 5).length
  });
});

// GET /api/categories – distinct category list
app.get('/api/categories', (req, res) => {
  const products = readDB();
  const categories = ['All', ...new Set(products.map((p) => p.category))];
  res.json(categories);
});

// GET /api/products/:id
app.get('/api/products/:id', (req, res) => {
  const products = readDB();
  const product = products.find((p) => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// POST /api/products – add a new product
app.post('/api/products', (req, res) => {
  const { name, sku, category, brand, price, quantity, description } = req.body;

  if (!name || !sku || !category) {
    return res.status(400).json({ error: 'name, sku and category are required' });
  }

  const products = readDB();

  if (products.find((p) => p.sku === sku)) {
    return res.status(409).json({ error: 'SKU already exists' });
  }

  const product = {
    id: nextId(products),
    sku,
    name,
    category,
    brand: brand || '',
    price: parseFloat(price) || 0,
    quantity: parseInt(quantity) || 0,
    description: description || ''
  };

  products.push(product);
  writeDB(products);
  res.status(201).json(product);
});

// PUT /api/products/:id – update a product
app.put('/api/products/:id', (req, res) => {
  const products = readDB();
  const idx = products.findIndex((p) => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  const { name, sku, category, brand, price, quantity, description } = req.body;

  // Check SKU uniqueness if SKU is being changed
  if (sku && sku !== products[idx].sku && products.find((p) => p.sku === sku)) {
    return res.status(409).json({ error: 'SKU already exists' });
  }

  products[idx] = {
    ...products[idx],
    ...(name !== undefined && { name }),
    ...(sku !== undefined && { sku }),
    ...(category !== undefined && { category }),
    ...(brand !== undefined && { brand }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(quantity !== undefined && { quantity: parseInt(quantity) }),
    ...(description !== undefined && { description })
  };

  writeDB(products);
  res.json(products[idx]);
});

// DELETE /api/products/:id
app.delete('/api/products/:id', (req, res) => {
  const products = readDB();
  const idx = products.findIndex((p) => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Product not found' });

  products.splice(idx, 1);
  writeDB(products);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`🏍️  MotoStock running at http://localhost:${PORT}`);
});
