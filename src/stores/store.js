// ============================================
//  TRUENO 219 - Central Store (Axios + Real MongoDB Backend)
//  Fully automated real-time persistence with MongoDB Atlas
// ============================================

import { reactive } from 'vue';
import {
  ProductsService,
  ClientsService,
  SalesService,
  DebtsService,
  PendingSalesService,
  SettingsService,
} from '../services/index.js';

function persist(key, data) {
  try {
    localStorage.setItem('trueno_' + key, JSON.stringify(data));
  } catch (e) {
    console.warn(`[Store Persist Error] ${key}:`, e);
  }
}

function load(key, fallback) {
  try {
    const raw = localStorage.getItem('trueno_' + key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const store = reactive({
  // State loaded initially from local cache, immediately refreshed from MongoDB Atlas
  products: load('products', []),
  clients: load('clients', []),
  sales: load('sales', []),
  debts: load('debts', []),
  pendingSales: load('pending_sales', []),

  config: load('config', {
    storeName: 'Trueno 219',
    lowStockThreshold: 5,
    currency: 'COP',
    taxRate: 0,
  }),

  notifications: [],
  isLoading: false,
  isInitialized: false,

  // ============ DATA LOADERS (REAL MONGODB SYNC) ============
  async loadProducts() {
    try {
      const data = await ProductsService.getAll({ all: 'true' });
      if (Array.isArray(data)) {
        this.products = data.map((p) => ({
          ...p,
          id: p.originalId !== undefined ? p.originalId : p.id || p._id,
          stock: Math.max(0, Number(p.stock) || 0),
          warehouseStock: Math.max(0, Number(p.warehouseStock) || 0),
          minStock: Number(p.minStock) || 5,
          buyPrice: Number(p.buyPrice ?? p.buy_price) || 0,
          sellPrice: Number(p.sellPrice ?? p.sell_price) || 0,
        }));
        this.saveProducts();
      }
      return this.products;
    } catch (err) {
      console.warn('[Store loadProducts Error]:', err.message);
      return this.products;
    }
  },

  async loadClients() {
    try {
      const data = await ClientsService.getAll({ all: 'true' });
      if (Array.isArray(data)) {
        this.clients = data.map((c) => ({
          ...c,
          id: c.originalId !== undefined ? c.originalId : c.id || c._id,
        }));
        this.saveClients();
      }
      return this.clients;
    } catch (err) {
      console.warn('[Store loadClients Error]:', err.message);
      return this.clients;
    }
  },

  async loadSales() {
    try {
      const data = await SalesService.getAll({ all: 'true' });
      if (Array.isArray(data)) {
        this.sales = data.map((s) => ({
          ...s,
          id: s.originalId !== undefined ? s.originalId : s.id || s._id,
        }));
        this.saveSales();
      }
      return this.sales;
    } catch (err) {
      console.warn('[Store loadSales Error]:', err.message);
      return this.sales;
    }
  },

  async loadDebts() {
    try {
      const data = await DebtsService.getAll({ all: 'true' });
      if (Array.isArray(data)) {
        this.debts = data.map((d) => ({
          ...d,
          id: d.originalId !== undefined ? d.originalId : d.id || d._id,
        }));
        this.updateDebtStatuses();
        this.saveDebts();
      }
      return this.debts;
    } catch (err) {
      console.warn('[Store loadDebts Error]:', err.message);
      return this.debts;
    }
  },

  async loadPendingSales() {
    try {
      const data = await PendingSalesService.getAll();
      if (Array.isArray(data)) {
        this.pendingSales = data.map((ps) => ({
          ...ps,
          id: ps.originalId !== undefined ? ps.originalId : ps.id || ps._id,
        }));
        this.savePendingSales();
      }
      return this.pendingSales;
    } catch (err) {
      console.warn('[Store loadPendingSales Error]:', err.message);
      return this.pendingSales;
    }
  },

  async loadSettings() {
    try {
      const data = await SettingsService.getSettings();
      if (data) {
        Object.assign(this.config, data);
        persist('config', this.config);
      }
      return this.config;
    } catch (err) {
      console.warn('[Store loadSettings Error]:', err.message);
      return this.config;
    }
  },

  async loadAll(force = false) {
    if (this.isLoading && !force) return;
    const token = localStorage.getItem('trueno_token');
    if (!token) return;

    this.isLoading = true;
    try {
      await Promise.allSettled([
        this.loadProducts(),
        this.loadClients(),
        this.loadSales(),
        this.loadDebts(),
        this.loadPendingSales(),
        this.loadSettings(),
      ]);
      this.isInitialized = true;
    } catch (err) {
      console.error('[Store loadAll Error]:', err);
    } finally {
      this.isLoading = false;
    }
  },

  async init() {
    return this.loadAll(true);
  },

  // ============ PRODUCTS (CRUD WITH MONGODB) ============
  async addProduct(product) {
    try {
      const created = await ProductsService.create(product);
      const normalized = {
        ...created,
        id: created.originalId !== undefined ? created.originalId : created.id || created._id,
        stock: Math.max(0, Number(created.stock) || 0),
        warehouseStock: Math.max(0, Number(created.warehouseStock) || 0),
        minStock: Number(created.minStock) || 5,
        buyPrice: Number(created.buyPrice ?? created.buy_price) || 0,
        sellPrice: Number(created.sellPrice ?? created.sell_price) || 0,
      };

      this.products.unshift(normalized);
      this.saveProducts();
      this.notify('Producto registrado en MongoDB correctamente', 'success');
      return normalized;
    } catch (err) {
      console.error('Error al registrar producto:', err);
      this.notify(err.message || 'Error al guardar producto en el servidor', 'danger');
      throw err;
    }
  },

  async updateProduct(id, data) {
    const idx = this.products.findIndex((p) => p.id === id || p._id === id);
    const target = idx !== -1 ? this.products[idx] : null;
    const targetId = target?._id || id;

    try {
      const updated = await ProductsService.update(targetId, data);
      const normalized = {
        ...updated,
        id: updated.originalId !== undefined ? updated.originalId : updated.id || updated._id,
      };

      if (idx !== -1) {
        this.products[idx] = normalized;
      } else {
        this.products.unshift(normalized);
      }
      this.saveProducts();
      this.notify('Producto actualizado en MongoDB', 'success');
      return normalized;
    } catch (err) {
      console.error('Error actualizando producto:', err);
      this.notify(err.message || 'Error al actualizar producto', 'danger');
      throw err;
    }
  },

  async deleteProduct(id) {
    const idx = this.products.findIndex((p) => p.id === id || p._id === id);
    const target = idx !== -1 ? this.products[idx] : null;
    const targetId = target?._id || id;

    try {
      await ProductsService.delete(targetId);
      if (idx !== -1) {
        this.products.splice(idx, 1);
        this.saveProducts();
      }
      this.notify('Producto eliminado de MongoDB', 'info');
      return true;
    } catch (err) {
      console.error('Error eliminando producto:', err);
      this.notify(err.message || 'Error al eliminar producto', 'danger');
      throw err;
    }
  },

  async adjustStock(id, delta) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (!p) return false;
    const targetId = p._id || id;

    try {
      const updatedProduct = await ProductsService.adjustStock(targetId, delta, 'store', 'Ajuste desde tienda');
      if (updatedProduct) {
        p.stock = updatedProduct.stock;
        p.warehouseStock = updatedProduct.warehouseStock;
        p.updatedAt = new Date().toISOString();
        this.saveProducts();
      }
      return true;
    } catch (err) {
      console.error('Error ajustando stock en backend:', err);
      this.notify(err.message || 'Error al ajustar stock en el servidor', 'danger');
      return false;
    }
  },

  async adjustWarehouseStock(id, delta) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (!p) return false;
    const targetId = p._id || id;

    try {
      const updatedProduct = await ProductsService.adjustStock(targetId, delta, 'warehouse', 'Ajuste en bodega');
      if (updatedProduct) {
        p.stock = updatedProduct.stock;
        p.warehouseStock = updatedProduct.warehouseStock;
        p.updatedAt = new Date().toISOString();
        this.saveProducts();
      }
      return true;
    } catch (err) {
      console.error('Error ajustando bodega en backend:', err);
      this.notify(err.message || 'Error al ajustar stock de bodega', 'danger');
      return false;
    }
  },

  async transferStock(id, from, to, amount = 1) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (!p) return false;
    const qty = Math.max(1, parseInt(amount) || 1);
    const targetId = p._id || id;

    try {
      const updatedProduct = await ProductsService.transferStock(
        targetId,
        from,
        to,
        qty,
        `Traslado de ${qty} unidad(es)`
      );
      if (updatedProduct) {
        p.stock = updatedProduct.stock;
        p.warehouseStock = updatedProduct.warehouseStock;
        p.updatedAt = new Date().toISOString();
        this.saveProducts();
      }
      this.notify(`Traslado de ${qty} unidad(es) registrado en MongoDB`, 'success');
      return true;
    } catch (err) {
      console.error('Error trasladando stock en backend:', err);
      this.notify(err.message || 'Error al registrar traslado', 'danger');
      return false;
    }
  },

  getProductById(id) {
    return this.products.find((p) => p.id === id || p._id === id) || null;
  },

  saveProducts() {
    persist('products', this.products);
  },

  // ============ CLIENTS (CRUD WITH MONGODB) ============
  async addClient(client) {
    try {
      const created = await ClientsService.create(client);
      const normalized = {
        ...created,
        id: created.originalId !== undefined ? created.originalId : created.id || created._id,
      };

      this.clients.unshift(normalized);
      this.saveClients();
      this.notify('Cliente guardado en MongoDB exitosamente', 'success');
      return normalized;
    } catch (err) {
      console.error('Error creando cliente:', err);
      this.notify(err.message || 'Error al registrar cliente', 'danger');
      throw err;
    }
  },

  async updateClient(id, data) {
    const idx = this.clients.findIndex((c) => c.id === id || c._id === id);
    const current = idx !== -1 ? this.clients[idx] : null;
    const targetId = current?._id || id;

    try {
      const updated = await ClientsService.update(targetId, data);
      const normalized = {
        ...updated,
        id: updated.originalId !== undefined ? updated.originalId : updated.id || updated._id,
      };

      if (idx !== -1) {
        this.clients[idx] = normalized;
      } else {
        this.clients.unshift(normalized);
      }
      this.saveClients();

      // If client name was modified, update local debts and sales immediately
      if (data.name) {
        const clientIdentifier = normalized.id;
        const clientRef = normalized._id;
        const clientDoc = normalized.document;

        this.debts.forEach((d) => {
          if (
            d.clientId === clientIdentifier ||
            d.clientRef === clientRef ||
            (clientDoc && d.clientDocument === clientDoc)
          ) {
            d.clientName = data.name;
          }
        });
        this.saveDebts();

        this.sales.forEach((s) => {
          if (
            s.clientId === clientIdentifier ||
            s.clientRef === clientRef ||
            (clientDoc && s.clientDocument === clientDoc)
          ) {
            s.clientName = data.name;
          }
        });
        this.saveSales();
      }

      this.notify('Cliente actualizado en MongoDB correctamente', 'success');
      return normalized;
    } catch (err) {
      console.error('Error actualizando cliente:', err);
      this.notify(err.message || 'Error al actualizar cliente', 'danger');
      throw err;
    }
  },

  async deleteClient(id) {
    const idx = this.clients.findIndex((c) => c.id === id || c._id === id);
    const current = idx !== -1 ? this.clients[idx] : null;
    const targetId = current?._id || id;

    try {
      await ClientsService.delete(targetId);
      if (idx !== -1) {
        this.clients.splice(idx, 1);
        this.saveClients();
      }
      this.notify('Cliente eliminado de MongoDB', 'info');
      return true;
    } catch (err) {
      console.error('Error eliminando cliente:', err);
      this.notify(err.message || 'Error al eliminar cliente', 'danger');
      throw err;
    }
  },

  getClientById(id) {
    return this.clients.find((c) => c.id === id || c._id === id) || null;
  },

  getClientByDocument(doc) {
    if (!doc) return null;
    return this.clients.find((c) => c.document === doc.trim()) || null;
  },

  saveClients() {
    persist('clients', this.clients);
  },

  // ============ SALES (CRUD WITH MONGODB) ============
  async registerSale(payload) {
    try {
      const result = await SalesService.registerSale(payload);
      const savedSale = result?.sale || result;
      const normalizedSale = {
        ...savedSale,
        id: savedSale.originalId !== undefined ? savedSale.originalId : savedSale.id || savedSale._id,
      };

      this.sales.unshift(normalizedSale);
      this.saveSales();

      // Refresh store inventory and debts from MongoDB
      await Promise.allSettled([this.loadProducts(), this.loadDebts(), this.loadClients()]);

      this.notify('Venta guardada en MongoDB exitosamente', 'success');
      return normalizedSale;
    } catch (err) {
      console.error('Error registrando venta:', err);
      this.notify(err.message || 'Error al procesar la venta en el servidor', 'danger');
      throw err;
    }
  },

  async cancelSale(id, reason = 'Anulada por usuario') {
    const sale = this.sales.find((s) => s.id === id || s._id === id);
    if (!sale) return;
    const targetId = sale._id || id;

    try {
      await SalesService.cancelSale(targetId, reason);
      sale.status = 'anulada';
      this.saveSales();

      // Refresh products from MongoDB to reflect restored stock
      await this.loadProducts();
      this.notify('Venta anulada e inventario repuesto en MongoDB', 'success');
    } catch (err) {
      console.error('Error anulando venta:', err);
      this.notify(err.message || 'Error al anular la venta', 'danger');
      throw err;
    }
  },

  saveSales() {
    persist('sales', this.sales);
  },

  // ============ PENDING SALES ============
  async savePendingSale(saleData) {
    try {
      if (saleData.id && !String(saleData.id).startsWith('PEND-')) {
        const targetId = saleData._id || saleData.id;
        const updated = await PendingSalesService.update(targetId, saleData);
        const normalized = {
          ...updated,
          id: updated.originalId !== undefined ? updated.originalId : updated.id || updated._id,
        };
        const idx = this.pendingSales.findIndex((p) => p.id === saleData.id || p._id === saleData.id);
        if (idx !== -1) this.pendingSales[idx] = normalized;
        this.savePendingSales();
        this.notify('Venta en espera actualizada en MongoDB', 'success');
        return normalized;
      } else {
        const created = await PendingSalesService.create(saleData);
        const normalized = {
          ...created,
          id: created.originalId !== undefined ? created.originalId : created.id || created._id,
        };
        this.pendingSales.unshift(normalized);
        this.savePendingSales();
        this.notify('Venta en espera guardada en MongoDB', 'success');
        return normalized;
      }
    } catch (err) {
      console.error('Error con venta en espera:', err);
      this.notify(err.message || 'Error al guardar venta en espera', 'danger');
      throw err;
    }
  },

  async confirmPendingSale(id, paymentMethod = 'Efectivo', paid) {
    const idx = this.pendingSales.findIndex((p) => p.id === id || p._id === id);
    const targetId = idx !== -1 ? this.pendingSales[idx]._id || id : id;

    try {
      const result = await PendingSalesService.confirm(targetId, paymentMethod, paid);
      if (idx !== -1) {
        this.pendingSales.splice(idx, 1);
        this.savePendingSales();
      }

      await Promise.allSettled([this.loadSales(), this.loadProducts(), this.loadDebts()]);
      this.notify('Venta en espera confirmada y guardada en MongoDB', 'success');
      return result;
    } catch (err) {
      console.error('Error confirmando venta en espera:', err);
      this.notify(err.message || 'Error al confirmar venta en espera', 'danger');
      throw err;
    }
  },

  async deletePendingSale(id) {
    const idx = this.pendingSales.findIndex((p) => p.id === id || p._id === id);
    const targetId = idx !== -1 ? this.pendingSales[idx]._id || id : id;

    try {
      await PendingSalesService.delete(targetId);
      if (idx !== -1) {
        this.pendingSales.splice(idx, 1);
        this.savePendingSales();
      }
      this.notify('Venta en espera eliminada de MongoDB', 'info');
    } catch (err) {
      console.error('Error eliminando venta pendiente:', err);
      this.notify(err.message || 'Error al eliminar venta pendiente', 'danger');
    }
  },

  getPendingSaleById(id) {
    return this.pendingSales.find((p) => p.id === id || p._id === id) || null;
  },

  savePendingSales() {
    persist('pending_sales', this.pendingSales);
  },

  // ============ DEBTS & PAYMENTS ============
  async addPayment(debtId, amount, note = '') {
    const debt = this.debts.find((d) => d.id === debtId || d._id === debtId);
    if (!debt) return;
    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      this.notify('El abono debe ser mayor a 0', 'warning');
      return;
    }
    if (numAmount > debt.balance) {
      this.notify('El abono supera el saldo pendiente', 'warning');
      return;
    }

    const targetId = debt._id || debtId;

    try {
      await DebtsService.addPayment(targetId, numAmount, 'Efectivo', note);
      await Promise.allSettled([this.loadDebts(), this.loadSales()]);
      this.notify('Abono registrado en MongoDB exitosamente', 'success');
    } catch (err) {
      console.error('Error registrando abono en backend:', err);
      this.notify(err.message || 'Error al guardar abono en el servidor', 'danger');
      throw err;
    }
  },

  updateDebtStatuses() {
    const now = new Date();
    this.debts.forEach((d) => {
      if (d.status === 'pendiente' && new Date(d.dueDate) < now) {
        d.status = 'vencida';
      }
    });
  },

  saveDebts() {
    persist('debts', this.debts);
  },

  // ============ CONFIG ============
  async updateConfig(cfg) {
    try {
      const updated = await SettingsService.updateSettings(cfg);
      if (updated) {
        Object.assign(this.config, updated);
        persist('config', this.config);
      }
      this.notify('Configuración guardada en MongoDB', 'success');
    } catch (err) {
      console.error('Error guardando configuración:', err);
      this.notify(err.message || 'Error al guardar configuración', 'danger');
    }
  },

  // ============ NOTIFICATIONS ============
  notify(message, type = 'info') {
    const id = Date.now();
    this.notifications.push({ id, message, type });
    setTimeout(() => {
      const idx = this.notifications.findIndex((n) => n.id === id);
      if (idx !== -1) this.notifications.splice(idx, 1);
    }, 4000);
  },

  // ============ COMPUTED STATS ============
  get totalProducts() {
    return this.products.length;
  },
  get totalStoreStock() {
    return this.products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
  },
  get totalWarehouseStock() {
    return this.products.reduce((s, p) => s + (Number(p.warehouseStock) || 0), 0);
  },
  get totalInventoryUnits() {
    return this.totalStoreStock + this.totalWarehouseStock;
  },
  get lowStockProducts() {
    return this.products.filter(
      (p) =>
        (Number(p.stock) || 0) > 0 &&
        (Number(p.stock) || 0) <= (p.minStock || this.config.lowStockThreshold || 5)
    );
  },
  get outOfStockProducts() {
    return this.products.filter((p) => (Number(p.stock) || 0) <= 0);
  },
  get outOfAllStockProducts() {
    return this.products.filter(
      (p) => (Number(p.stock) || 0) <= 0 && (Number(p.warehouseStock) || 0) <= 0
    );
  },
  get totalClients() {
    return this.clients.length;
  },
  get totalPendingDebt() {
    return this.debts
      .filter((d) => d.status !== 'pagada')
      .reduce((s, d) => s + (Number(d.balance) || 0), 0);
  },
  get todaySales() {
    const today = new Date().toDateString();
    return this.sales.filter((s) => new Date(s.date || s.createdAt).toDateString() === today);
  },
  get todayTotal() {
    return this.todaySales.reduce((s, v) => s + (Number(v.total) || 0), 0);
  },
  get monthSales() {
    const now = new Date();
    return this.sales.filter((s) => {
      const d = new Date(s.date || s.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  },
  get monthTotal() {
    return this.monthSales.reduce((s, v) => s + (Number(v.total) || 0), 0);
  },
  get topProducts() {
    const map = {};
    this.sales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const key = item.productId || item.name;
          if (!map[key]) map[key] = { name: item.name, qty: 0, revenue: 0 };
          map[key].qty += Number(item.qty) || 0;
          map[key].revenue += Number(item.subtotal) || 0;
        });
      }
    });
    return Object.entries(map)
      .map(([id, v]) => ({ productId: id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  },

  getClientSales(clientId) {
    return this.sales.filter((s) => s.clientId === clientId || s.clientRef === clientId);
  },
  getClientDebts(clientId) {
    return this.debts.filter((d) => d.clientId === clientId || d.clientRef === clientId);
  },
});

export default store;
