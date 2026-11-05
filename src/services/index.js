// =====================================================================
// TRUENO 219 - Frontend Services Bundle (Axios Powered)
// =====================================================================

import ApiClient from './api.js';

export const AuthService = {
  async login(email, password) {
    const res = await ApiClient.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('trueno_token', res.data.token);
      localStorage.setItem('trueno_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register(fullName, email, password, role = 'empleado') {
    const res = await ApiClient.post('/auth/register', { full_name: fullName, email, password, role });
    if (res.data?.token) {
      localStorage.setItem('trueno_token', res.data.token);
      localStorage.setItem('trueno_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe() {
    const res = await ApiClient.get('/auth/me');
    return res.data?.user || res.data;
  },

  logout() {
    localStorage.removeItem('trueno_token');
    localStorage.removeItem('trueno_user');
  },
};

export const ProductsService = {
  async getAll(params = {}) {
    const res = await ApiClient.get('/products', params);
    return Array.isArray(res) ? res : res.data || [];
  },

  async getById(id) {
    const res = await ApiClient.get(`/products/${id}`);
    return res.data || res;
  },

  async create(product) {
    const res = await ApiClient.post('/products', {
      name: product.name,
      category: product.category,
      description: product.description || '',
      buy_price: Number(product.buyPrice ?? product.buy_price) || 0,
      sell_price: Number(product.sellPrice ?? product.sell_price) || 0,
      stock: Number(product.stock) || 0,
      warehouse_stock: Number(product.warehouseStock ?? product.warehouse_stock) || 0,
      min_stock: Number(product.minStock ?? product.min_stock) || 5,
      sku: product.sku || '',
      image_url: product.image || product.image_url || null,
    });
    return res.data || res;
  },

  async update(id, data) {
    const payload = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.category !== undefined) payload.category = data.category;
    if (data.description !== undefined) payload.description = data.description;
    if (data.buyPrice !== undefined || data.buy_price !== undefined)
      payload.buy_price = Number(data.buyPrice ?? data.buy_price);
    if (data.sellPrice !== undefined || data.sell_price !== undefined)
      payload.sell_price = Number(data.sellPrice ?? data.sell_price);
    if (data.stock !== undefined) payload.stock = Number(data.stock);
    if (data.warehouseStock !== undefined || data.warehouse_stock !== undefined)
      payload.warehouse_stock = Number(data.warehouseStock ?? data.warehouse_stock);
    if (data.minStock !== undefined || data.min_stock !== undefined)
      payload.min_stock = Number(data.minStock ?? data.min_stock);
    if (data.sku !== undefined) payload.sku = data.sku;
    if (data.image !== undefined || data.image_url !== undefined)
      payload.image_url = data.image ?? data.image_url;

    const res = await ApiClient.patch(`/products/${id}`, payload);
    return res.data || res;
  },

  async delete(id) {
    const res = await ApiClient.delete(`/products/${id}`);
    return res.data || res;
  },

  async adjustStock(id, delta, location = 'store', notes = '') {
    const res = await ApiClient.post(`/products/${id}/adjust-stock`, { delta, location, notes });
    return res.data || res;
  },

  async transferStock(id, from, to, quantity, notes = '') {
    const res = await ApiClient.post(`/products/${id}/transfer-stock`, { from, to, quantity, notes });
    return res.data || res;
  },

  async getLowStock() {
    const res = await ApiClient.get('/products/low-stock');
    return Array.isArray(res) ? res : res.data || [];
  },
};

export const ClientsService = {
  async getAll(params = {}) {
    const res = await ApiClient.get('/clients', params);
    return Array.isArray(res) ? res : res.data || [];
  },

  async getById(id) {
    const res = await ApiClient.get(`/clients/${id}`);
    return res.data || res;
  },

  async create(client) {
    const res = await ApiClient.post('/clients', client);
    return res.data || res;
  },

  async update(id, data) {
    const res = await ApiClient.patch(`/clients/${id}`, data);
    return res.data || res;
  },

  async delete(id) {
    const res = await ApiClient.delete(`/clients/${id}`);
    return res.data || res;
  },

  async getSales(clientId) {
    const res = await ApiClient.get(`/clients/${clientId}/sales`);
    return Array.isArray(res) ? res : res.data || [];
  },

  async getDebts(clientId) {
    const res = await ApiClient.get(`/clients/${clientId}/debts`);
    return Array.isArray(res) ? res : res.data || [];
  },
};

export const SalesService = {
  async getAll(params = {}) {
    const res = await ApiClient.get('/sales', params);
    return Array.isArray(res) ? res : res.data || [];
  },

  async getById(id) {
    const res = await ApiClient.get(`/sales/${id}`);
    return res.data || res;
  },

  async registerSale(payload) {
    const res = await ApiClient.post('/sales', payload);
    return res.data || res;
  },

  async cancelSale(id, reason = 'Anulación solicitada por usuario') {
    const res = await ApiClient.post(`/sales/${id}/cancel`, { reason });
    return res.data || res;
  },
};

export const DebtsService = {
  async getAll(params = {}) {
    const res = await ApiClient.get('/debts', params);
    return Array.isArray(res) ? res : res.data || [];
  },

  async getById(id) {
    const res = await ApiClient.get(`/debts/${id}`);
    return res.data || res;
  },

  async addPayment(debtId, amount, paymentMethod = 'Efectivo', note = '') {
    const res = await ApiClient.post(`/debts/${debtId}/payments`, { amount, paymentMethod, note });
    return res.data || res;
  },

  async getSummary() {
    const res = await ApiClient.get('/debts/summary');
    return res.data || res;
  },
};

export const PendingSalesService = {
  async getAll() {
    const res = await ApiClient.get('/pending-sales');
    return Array.isArray(res) ? res : res.data || [];
  },

  async create(pendingData) {
    const res = await ApiClient.post('/pending-sales', pendingData);
    return res.data || res;
  },

  async update(id, updates) {
    const res = await ApiClient.patch(`/pending-sales/${id}`, updates);
    return res.data || res;
  },

  async delete(id) {
    const res = await ApiClient.delete(`/pending-sales/${id}`);
    return res.data || res;
  },

  async confirm(id, paymentMethod, paid) {
    const res = await ApiClient.post(`/pending-sales/${id}/confirm`, { paymentMethod, paid });
    return res.data || res;
  },
};

export const SettingsService = {
  async getSettings() {
    const res = await ApiClient.get('/settings');
    return res.data || res;
  },

  async updateSettings(settings) {
    const res = await ApiClient.patch('/settings', settings);
    return res.data || res;
  },
};

export const DashboardService = {
  async getSummary() {
    const res = await ApiClient.get('/dashboard/summary');
    return res.data || res;
  },

  async getTopProducts(limit = 5) {
    const res = await ApiClient.get('/dashboard/top-products', { limit });
    return Array.isArray(res) ? res : res.data || [];
  },

  async getSalesByPeriod(days = 7) {
    const res = await ApiClient.get('/dashboard/sales-by-period', { days });
    return Array.isArray(res) ? res : res.data || [];
  },
};

export const CategoriesService = {
  async getAll() {
    const res = await ApiClient.get('/categories');
    return Array.isArray(res) ? res : res.data || [];
  },

  async create(name) {
    const res = await ApiClient.post('/categories', { name });
    return res.data || res;
  },

  async delete(name) {
    const res = await ApiClient.delete(`/categories/${encodeURIComponent(name)}`);
    return res.data || res;
  },
};

export const InventoryService = {
  async getMovements(params = {}) {
    const res = await ApiClient.get('/inventory/movements', params);
    return Array.isArray(res) ? res : res.data || [];
  },
};
