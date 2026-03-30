/* global state */
let allProducts = [];
let categories  = [];
let activeCategory = 'All';
let searchQuery    = '';
let deletePendingId = null;

const API = '/api';

/* ── helpers ───────────────────────────────────────────── */
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opts
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetWidth; // reflow
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

function formatPrice(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ── data loading ──────────────────────────────────────── */
async function loadCategories() {
  categories = await apiFetch(`${API}/categories`);
  renderCategoryPills();
}

async function loadProducts() {
  const params = new URLSearchParams();
  if (activeCategory !== 'All') params.set('category', activeCategory);
  if (searchQuery) params.set('search', searchQuery);

  allProducts = await apiFetch(`${API}/products?${params}`);
  renderGrid();
}

async function loadStats() {
  const stats = await apiFetch(`${API}/stats`);
  document.getElementById('statTotal').textContent = stats.total;
  document.getElementById('statLow').textContent   = stats.lowStock;
}

/* ── render ────────────────────────────────────────────── */
  const container = document.getElementById('categoryPills');
  container.innerHTML = categories.map(cat => `
    <button class="pill ${cat === activeCategory ? 'active' : ''}" data-cat="${cat}">${cat}</button>
  `).join('');

  container.querySelectorAll('.pill').forEach(btn =>
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat;
      renderCategoryPills();
      loadProducts();
    })
  );
}

function stockClass(qty) {
  if (qty === 0) return 'out-stock';
  if (qty <= 5)  return 'low-stock';
  return '';
}

function renderGrid() {
  const grid   = document.getElementById('productGrid');
  const empty  = document.getElementById('emptyState');

  if (allProducts.length === 0) {
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.innerHTML = allProducts.map(p => `
    <div class="product-card" data-id="${p.id}">
      <div class="card-top">
        <span class="card-badge">${p.category}</span>
        <div class="card-actions">
          <button class="btn-icon btn-edit" data-id="${p.id}" title="Edit product">✏️</button>
          <button class="btn-icon btn-delete" data-id="${p.id}" title="Delete product">🗑️</button>
        </div>
      </div>
      <div>
        <div class="card-title">${escHtml(p.name)}</div>
        <div class="card-brand">${escHtml(p.brand)}</div>
        <div class="card-sku">${escHtml(p.sku)}</div>
      </div>
      ${p.description ? `<div class="card-description">${escHtml(p.description)}</div>` : ''}
      <div class="card-footer">
        <div class="card-price">${formatPrice(p.price)}</div>
        <div>
          <div class="quantity-control">
            <button class="qty-btn btn-qty-dec" data-id="${p.id}">−</button>
            <div>
              <div class="qty-value ${stockClass(p.quantity)}">${p.quantity}</div>
            </div>
            <button class="qty-btn btn-qty-inc" data-id="${p.id}">+</button>
          </div>
          <span class="stock-label">${p.quantity === 0 ? 'Out of stock' : p.quantity <= 5 ? 'Low stock' : 'In stock'}</span>
        </div>
      </div>
    </div>
  `).join('');

  // Wire up card buttons
  grid.querySelectorAll('.btn-edit').forEach(btn =>
    btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)))
  );
  grid.querySelectorAll('.btn-delete').forEach(btn =>
    btn.addEventListener('click', () => openDeleteModal(parseInt(btn.dataset.id)))
  );
  grid.querySelectorAll('.btn-qty-dec').forEach(btn =>
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.id), -1))
  );
  grid.querySelectorAll('.btn-qty-inc').forEach(btn =>
    btn.addEventListener('click', () => changeQty(parseInt(btn.dataset.id), +1))
  );
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ── quantity controls ─────────────────────────────────── */
async function changeQty(id, delta) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;
  const newQty = Math.max(0, product.quantity + delta);
  try {
    await apiFetch(`${API}/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: newQty })
    });
    await loadProducts();
    await loadStats();
    showToast(`Quantity updated to ${newQty}`);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── add / edit modal ──────────────────────────────────── */
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Product';
  document.getElementById('btnSave').textContent = 'Add Product';
  document.getElementById('productForm').reset();
  document.getElementById('fieldId').value = '';
  document.getElementById('formError').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById('fieldName').focus();
}

function openEditModal(id) {
  const p = allProducts.find(pr => pr.id === id);
  if (!p) return;

  document.getElementById('modalTitle').textContent = 'Edit Product';
  document.getElementById('btnSave').textContent = 'Save Changes';
  document.getElementById('fieldId').value          = p.id;
  document.getElementById('fieldName').value        = p.name;
  document.getElementById('fieldSku').value         = p.sku;
  document.getElementById('fieldBrand').value       = p.brand;
  document.getElementById('fieldCategory').value    = p.category;
  document.getElementById('fieldPrice').value       = p.price;
  document.getElementById('fieldQuantity').value    = p.quantity;
  document.getElementById('fieldDescription').value = p.description;
  document.getElementById('formError').classList.add('hidden');
  document.getElementById('modalBackdrop').classList.remove('hidden');
  document.getElementById('fieldName').focus();
}

function closeModal() {
  document.getElementById('modalBackdrop').classList.add('hidden');
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const errEl = document.getElementById('formError');
  errEl.classList.add('hidden');

  const id = document.getElementById('fieldId').value;
  const payload = {
    name:        document.getElementById('fieldName').value.trim(),
    sku:         document.getElementById('fieldSku').value.trim(),
    brand:       document.getElementById('fieldBrand').value.trim(),
    category:    document.getElementById('fieldCategory').value.trim(),
    price:       parseFloat(document.getElementById('fieldPrice').value) || 0,
    quantity:    parseInt(document.getElementById('fieldQuantity').value)  || 0,
    description: document.getElementById('fieldDescription').value.trim()
  };

  try {
    if (id) {
      await apiFetch(`${API}/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Product updated ✓');
    } else {
      await apiFetch(`${API}/products`, { method: 'POST', body: JSON.stringify(payload) });
      showToast('Product added ✓');
    }
    closeModal();
    await loadCategories();
    await loadProducts();
    await loadStats();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove('hidden');
  }
});

/* ── delete modal ──────────────────────────────────────── */
function openDeleteModal(id) {
  const p = allProducts.find(pr => pr.id === id);
  if (!p) return;
  deletePendingId = id;
  document.getElementById('deleteName').textContent = p.name;
  document.getElementById('deleteBackdrop').classList.remove('hidden');
}

function closeDeleteModal() {
  deletePendingId = null;
  document.getElementById('deleteBackdrop').classList.add('hidden');
}

document.getElementById('deleteConfirmBtn').addEventListener('click', async () => {
  if (!deletePendingId) return;
  try {
    await apiFetch(`${API}/products/${deletePendingId}`, { method: 'DELETE' });
    showToast('Product deleted');
    closeDeleteModal();
    await loadCategories();
    await loadProducts();
    await loadStats();
  } catch (err) {
    showToast(err.message, 'error');
    closeDeleteModal();
  }
});

/* ── event wiring ──────────────────────────────────────── */
document.getElementById('btnAddProduct').addEventListener('click', openAddModal);
document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('btnCancel').addEventListener('click', closeModal);
document.getElementById('deleteClose').addEventListener('click', closeDeleteModal);
document.getElementById('deleteCancelBtn').addEventListener('click', closeDeleteModal);

// Close modal on backdrop click
document.getElementById('modalBackdrop').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('deleteBackdrop').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeDeleteModal();
});

// Search – debounced
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.trim();
    loadProducts();
  }, 250);
});

// Keyboard close
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeDeleteModal();
  }
});

/* ── init ──────────────────────────────────────────────── */
(async function init() {
  await loadCategories();
  await Promise.all([loadProducts(), loadStats()]);
})();
