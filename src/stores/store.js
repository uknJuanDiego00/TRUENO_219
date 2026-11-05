// ============================================
//  TRUENO 219 - Central Store (Axios + Real Backend)
//  Fully integrated with MongoDB Atlas via Express API
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

// ---- Helpers for local cache fallback ----
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

// Fallback ID Generator for offline optimistic operations
let _idCounters = load('id_counters', {
  product: 100,
  client: 100,
  sale: 1000,
  debt: 100,
  payment: 100,
  pending_sale: 100,
});

function nextId(type) {
  _idCounters[type] = (_idCounters[type] || 100) + 1;
  persist('id_counters', _idCounters);
  return _idCounters[type];
}

const store = reactive({
  // Initial state loaded from cache (No mock demo data)
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

  // ============ INITIALIZE & SYNC WITH BACKEND ============
  async init() {
    const token = localStorage.getItem('trueno_token');
    if (!token) return;

    this.isLoading = true;
    try {
      const [productsData, clientsData, salesData, debtsData, pendingData, configData] =
        await Promise.allSettled([
          ProductsService.getAll({ all: 'true' }),
          ClientsService.getAll({ all: 'true' }),
          SalesService.getAll({ all: 'true' }),
          DebtsService.getAll({ all: 'true' }),
          PendingSalesService.getAll(),
          SettingsService.getSettings(),
        ]);

      if (productsData.status === 'fulfilled' && Array.isArray(productsData.value)) {
        this.products = productsData.value.map((p) => ({
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

      if (clientsData.status === 'fulfilled' && Array.isArray(clientsData.value)) {
        this.clients = clientsData.value.map((c) => ({
          ...c,
          id: c.originalId !== undefined ? c.originalId : c.id || c._id,
        }));
        this.saveClients();
      }

      if (salesData.status === 'fulfilled' && Array.isArray(salesData.value)) {
        this.sales = salesData.value.map((s) => ({
          ...s,
          id: s.originalId !== undefined ? s.originalId : s.id || s._id,
        }));
        this.saveSales();
      }

      if (debtsData.status === 'fulfilled' && Array.isArray(debtsData.value)) {
        this.debts = debtsData.value.map((d) => ({
          ...d,
          id: d.originalId !== undefined ? d.originalId : d.id || d._id,
        }));
        this.saveDebts();
      }

      if (pendingData.status === 'fulfilled' && Array.isArray(pendingData.value)) {
        this.pendingSales = pendingData.value.map((ps) => ({
          ...ps,
          id: ps.originalId !== undefined ? ps.originalId : ps.id || ps._id,
        }));
        this.savePendingSales();
      }

      if (configData.status === 'fulfilled' && configData.value) {
        Object.assign(this.config, configData.value);
        persist('config', this.config);
      }

      this.updateDebtStatuses();
      this.isInitialized = true;
    } catch (err) {
      console.error('[Store Init Error] Sincronización fallida:', err);
    } finally {
      this.isLoading = false;
    }
  },

  // ============ PRODUCTS ============
  async addProduct(product) {
    const tempId = nextId('product');
    const localProduct = {
      ...product,
      id: tempId,
      stock: Math.max(0, Number(product.stock) || 0),
      warehouseStock: Math.max(0, Number(product.warehouseStock) || 0),
      totalSold: 0,
      createdAt: new Date().toISOString(),
    };

    // Optimistic local add
    this.products.unshift(localProduct);
    this.saveProducts();
    this.notify('Guardando producto en la base de datos...', 'info');

    try {
      const created = await ProductsService.create(product);
      if (created) {
        const normalized = {
          ...created,
          id: created.originalId !== undefined ? created.originalId : created.id || created._id,
          stock: Math.max(0, Number(created.stock) || 0),
          warehouseStock: Math.max(0, Number(created.warehouseStock) || 0),
        };
        const idx = this.products.findIndex((p) => p.id === tempId);
        if (idx !== -1) {
          this.products[idx] = normalized;
        }
        this.saveProducts();
        this.notify('Producto registrado en MongoDB correctamente', 'success');
        return normalized;
      }
    } catch (err) {
      console.error('Error al crear producto en backend:', err);
      this.notify(err.message || 'Error al guardar el producto en el servidor', 'danger');
    }
    return localProduct;
  },

  async updateProduct(id, data) {
    const idx = this.products.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      const current = this.products[idx];
      const updatedLocal = {
        ...current,
        ...data,
        stock: Math.max(0, Number(data.stock !== undefined ? data.stock : current.stock) || 0),
        warehouseStock: Math.max(
          0,
          Number(data.warehouseStock !== undefined ? data.warehouseStock : current.warehouseStock) || 0
        ),
        updatedAt: new Date().toISOString(),
      };
      this.products[idx] = updatedLocal;
      this.saveProducts();

      try {
        const backendTargetId = current._id || id;
        const result = await ProductsService.update(backendTargetId, data);
        if (result) {
          this.products[idx] = {
            ...result,
            id: result.originalId !== undefined ? result.originalId : result.id || result._id,
          };
          this.saveProducts();
        }
        this.notify('Producto actualizado', 'success');
      } catch (err) {
        console.error('Error actualizando producto en backend:', err);
        this.notify(err.message || 'Error al actualizar producto en el servidor', 'danger');
      }
    }
  },

  async deleteProduct(id) {
    const idx = this.products.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      const target = this.products[idx];
      this.products.splice(idx, 1);
      this.saveProducts();
      this.notify('Producto eliminado', 'info');

      try {
        const backendTargetId = target._id || id;
        await ProductsService.delete(backendTargetId);
      } catch (err) {
        console.error('Error eliminando producto en backend:', err);
        this.notify(err.message || 'Error al eliminar producto en el servidor', 'danger');
      }
    }
  },

  async adjustStock(id, delta) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (p) {
      const newStock = (Number(p.stock) || 0) + delta;
      if (newStock < 0) return false;
      p.stock = newStock;
      p.updatedAt = new Date().toISOString();
      this.saveProducts();

      try {
        const targetId = p._id || id;
        await ProductsService.adjustStock(targetId, delta, 'store', 'Ajuste desde tienda');
      } catch (err) {
        console.warn('Ajuste de stock no sincronizado con backend:', err.message);
      }
      return true;
    }
    return false;
  },

  async adjustWarehouseStock(id, delta) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (p) {
      const newWarehouse = (Number(p.warehouseStock) || 0) + delta;
      if (newWarehouse < 0) return false;
      p.warehouseStock = newWarehouse;
      p.updatedAt = new Date().toISOString();
      this.saveProducts();

      try {
        const targetId = p._id || id;
        await ProductsService.adjustStock(targetId, delta, 'warehouse', 'Ajuste en bodega');
      } catch (err) {
        console.warn('Ajuste de bodega no sincronizado con backend:', err.message);
      }
      return true;
    }
    return false;
  },

  async transferStock(id, from, to, amount = 1) {
    const p = this.products.find((prod) => prod.id === id || prod._id === id);
    if (!p) return false;
    const qty = Math.max(1, parseInt(amount) || 1);
    p.stock = Math.max(0, Number(p.stock) || 0);
    p.warehouseStock = Math.max(0, Number(p.warehouseStock) || 0);

    if (from === 'warehouse' && to === 'store') {
      if (p.warehouseStock < qty) {
        this.notify(`No hay suficiente cantidad en bodega (disponible: ${p.warehouseStock})`, 'warning');
        return false;
      }
      p.warehouseStock -= qty;
      p.stock += qty;
      p.updatedAt = new Date().toISOString();
      this.saveProducts();
      this.notify(`Se pasaron ${qty} unidad(es) de Bodega a Tienda (${p.name})`, 'success');

      try {
        const targetId = p._id || id;
        await ProductsService.transferStock(targetId, from, to, qty, `Traslado de ${qty} unidad(es)`);
      } catch (err) {
        console.warn('Traslado no sincronizado con backend:', err.message);
      }
      return true;
    } else if (from === 'store' && to === 'warehouse') {
      if (p.stock < qty) {
        this.notify(`No hay suficiente cantidad en tienda (disponible: ${p.stock})`, 'warning');
        return false;
      }
      p.stock -= qty;
      p.warehouseStock += qty;
      p.updatedAt = new Date().toISOString();
      this.saveProducts();
      this.notify(`Se pasaron ${qty} unidad(es) de Tienda a Bodega (${p.name})`, 'success');

      try {
        const targetId = p._id || id;
        await ProductsService.transferStock(targetId, from, to, qty, `Traslado de ${qty} unidad(es)`);
      } catch (err) {
        console.warn('Traslado no sincronizado con backend:', err.message);
      }
      return true;
    }
    return false;
  },

  getProductById(id) {
    return this.products.find((p) => p.id === id || p._id === id) || null;
  },

  saveProducts() {
    persist('products', this.products);
  },

  // ============ CLIENTS ============
  async addClient(client) {
    if (client.document && client.document.trim()) {
      const existing = this.clients.find((c) => c.document === client.document.trim());
      if (existing) {
        this.notify(`Ya existe un cliente con documento ${client.document}: ${existing.name}`, 'warning');
        return null;
      }
    }

    const tempId = nextId('client');
    const localClient = {
      ...client,
      id: tempId,
      document: (client.document || '').trim(),
      totalBought: 0,
      createdAt: new Date().toISOString(),
    };
    this.clients.unshift(localClient);
    this.saveClients();

    try {
      const created = await ClientsService.create(client);
      if (created) {
        const normalized = {
          ...created,
          id: created.originalId !== undefined ? created.originalId : created.id || created._id,
        };
        const idx = this.clients.findIndex((c) => c.id === tempId);
        if (idx !== -1) {
          this.clients[idx] = normalized;
        }
        this.saveClients();
        this.notify('Cliente registrado exitosamente', 'success');
        return normalized;
      }
    } catch (err) {
      console.error('Error creando cliente en backend:', err);
      this.notify(err.message || 'Error al guardar cliente en el servidor', 'danger');
    }
    return localClient;
  },

  async updateClient(id, data) {
    const idx = this.clients.findIndex((c) => c.id === id || c._id === id);
    if (idx !== -1) {
      const current = this.clients[idx];
      this.clients[idx] = { ...current, ...data, updatedAt: new Date().toISOString() };
      this.saveClients();

      try {
        const targetId = current._id || id;
        const updated = await ClientsService.update(targetId, data);
        if (updated) {
          this.clients[idx] = {
            ...updated,
            id: updated.originalId !== undefined ? updated.originalId : updated.id || updated._id,
          };
          this.saveClients();
        }
        this.notify('Cliente actualizado', 'success');
      } catch (err) {
        console.error('Error actualizando cliente en backend:', err);
        this.notify(err.message || 'Error al actualizar cliente', 'danger');
      }
    }
  },

  async deleteClient(id) {
    const idx = this.clients.findIndex((c) => c.id === id || c._id === id);
    if (idx !== -1) {
      const target = this.clients[idx];
      this.clients.splice(idx, 1);
      this.saveClients();
      this.notify('Cliente eliminado', 'info');

      try {
        const targetId = target._id || id;
        await ClientsService.delete(targetId);
      } catch (err) {
        console.error('Error eliminando cliente en backend:', err);
        this.notify(err.message || 'Error al eliminar cliente en el servidor', 'danger');
      }
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

  // ============ SALES ============
  async registerSale({
    items,
    clientId,
    clientName,
    clientDocument,
    paymentMethod,
    paid,
    total: passedTotal,
    discount = 0,
    interestRate = 0,
  }) {
    if (!items || !items.length) {
      this.notify('El carrito no contiene productos', 'warning');
      return null;
    }

    // Verify stock locally
    for (const item of items) {
      const product = this.products.find((p) => p.id === item.productId || p._id === item.productId);
      if (!product) {
        this.notify(`Producto no encontrado: ${item.name}`, 'danger');
        return null;
      }
      if (product.stock < item.qty) {
        this.notify(`Stock insuficiente para: ${item.name} (disponibles: ${product.stock})`, 'danger');
        return null;
      }
    }

    const itemsSubtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0);
    const finalDiscount = Math.max(0, Number(discount) || 0);
    const baseTotal =
      passedTotal !== undefined
        ? Math.max(0, Number(passedTotal) || 0)
        : Math.max(0, itemsSubtotal - finalDiscount);

    const finalInterestRate =
      paymentMethod === 'Crédito' ? Math.max(0, Math.min(100, Number(interestRate) || 0)) : 0;
    const interestAmount =
      finalInterestRate > 0 ? Math.round((baseTotal * finalInterestRate) / 100) : 0;
    const finalTotal = baseTotal + interestAmount;
    const paidAmount =
      paymentMethod === 'Crédito' ? Math.max(0, Math.min(finalTotal, Number(paid) || 0)) : finalTotal;

    const salePayload = {
      clientId,
      clientName: clientName || 'Consumidor Final',
      clientDocument: clientDocument || '',
      items: items.map((i) => ({
        productId: i.productId,
        name: i.name,
        price: Number(i.price) || 0,
        qty: Number(i.qty) || 1,
        subtotal: Number(i.subtotal) || 0,
      })),
      subtotal: itemsSubtotal,
      discount: finalDiscount,
      total: finalTotal,
      baseTotal,
      interestRate: finalInterestRate,
      interestAmount,
      paid: paidAmount,
      paymentMethod,
    };

    try {
      const result = await SalesService.registerSale(salePayload);
      const savedSale = result?.sale || result;
      const normalizedSale = {
        ...savedSale,
        id: savedSale.originalId !== undefined ? savedSale.originalId : savedSale.id || savedSale._id,
      };

      // Deduct stock in local state
      items.forEach((item) => {
        const p = this.products.find((prod) => prod.id === item.productId || prod._id === item.productId);
        if (p) {
          p.stock = Math.max(0, p.stock - item.qty);
          p.totalSold = (Number(p.totalSold) || 0) + item.qty;
        }
      });
      this.saveProducts();

      // Update client total bought
      if (clientId) {
        const client = this.clients.find((c) => c.id === clientId || c._id === clientId);
        if (client) {
          client.totalBought = (Number(client.totalBought) || 0) + finalTotal;
          this.saveClients();
        }
      }

      // Add debt if credit and debt returned
      if (result?.debt) {
        const debtObj = {
          ...result.debt,
          id: result.debt.originalId !== undefined ? result.debt.originalId : result.debt.id || result.debt._id,
        };
        this.debts.unshift(debtObj);
        this.saveDebts();
      }

      this.sales.unshift(normalizedSale);
      this.saveSales();
      this.notify('Venta registrada correctamente en el sistema', 'success');
      return normalizedSale;
    } catch (err) {
      console.error('Error registrando venta en backend:', err);
      this.notify(err.message || 'Error al procesar la venta en el servidor', 'danger');
      return null;
    }
  },

  async cancelSale(id, reason = 'Anulada por usuario') {
    const sale = this.sales.find((s) => s.id === id || s._id === id);
    if (!sale) return;

    try {
      const targetId = sale._id || id;
      await SalesService.cancelSale(targetId, reason);
      sale.status = 'anulada';

      // Restore local stock
      sale.items.forEach((item) => {
        const p = this.products.find((prod) => prod.id === item.productId || prod._id === item.productId);
        if (p) {
          p.stock += item.qty;
          p.totalSold = Math.max(0, (p.totalSold || 0) - item.qty);
        }
      });

      this.saveProducts();
      this.saveSales();
      this.notify('Venta anulada correctamente', 'success');
    } catch (err) {
      console.error('Error anulando venta:', err);
      this.notify(err.message || 'Error al anular la venta', 'danger');
    }
  },

  saveSales() {
    persist('sales', this.sales);
  },

  // ============ PENDING SALES ============
  async savePendingSale(saleData) {
    if (saleData.id) {
      const idx = this.pendingSales.findIndex((p) => p.id === saleData.id || p._id === saleData.id);
      if (idx !== -1) {
        this.pendingSales[idx] = {
          ...this.pendingSales[idx],
          ...saleData,
          status: 'PENDIENTE',
          updatedAt: new Date().toISOString(),
        };
        this.savePendingSales();

        try {
          const targetId = this.pendingSales[idx]._id || saleData.id;
          await PendingSalesService.update(targetId, saleData);
        } catch (e) {
          console.warn('Pending sale update error:', e.message);
        }

        this.notify(`Venta pendiente #${saleData.id} actualizada`, 'success');
        return this.pendingSales[idx];
      }
    }

    const pendingNum = nextId('pending_sale');
    const formattedId = `PEND-${String(pendingNum).padStart(3, '0')}`;
    const pendingLocal = {
      ...saleData,
      id: formattedId,
      status: 'PENDIENTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.pendingSales.unshift(pendingLocal);
    this.savePendingSales();

    try {
      const created = await PendingSalesService.create(saleData);
      if (created) {
        const normalized = {
          ...created,
          id: created.originalId !== undefined ? created.originalId : created.id || created._id,
        };
        const idx = this.pendingSales.findIndex((p) => p.id === formattedId);
        if (idx !== -1) {
          this.pendingSales[idx] = normalized;
        }
        this.savePendingSales();
      }
    } catch (e) {
      console.warn('Pending sale create error:', e.message);
    }

    this.notify(`Venta guardada como pendiente`, 'success');
    return pendingLocal;
  },

  async confirmPendingSale(id, paymentMethod = 'Efectivo', paid) {
    const idx = this.pendingSales.findIndex((p) => p.id === id || p._id === id);
    if (idx === -1) return;

    const pending = this.pendingSales[idx];
    try {
      const targetId = pending._id || id;
      const result = await PendingSalesService.confirm(targetId, paymentMethod, paid);
      this.pendingSales.splice(idx, 1);
      this.savePendingSales();

      if (result?.sale) {
        const normalized = {
          ...result.sale,
          id: result.sale.originalId !== undefined ? result.sale.originalId : result.sale.id || result.sale._id,
        };
        this.sales.unshift(normalized);
        this.saveSales();
      }

      // Refresh products to ensure correct stock
      await this.init();
      this.notify('Venta en espera confirmada y procesada', 'success');
    } catch (err) {
      console.error('Error confirmando venta pendiente:', err);
      this.notify(err.message || 'Error al confirmar venta pendiente', 'danger');
    }
  },

  async deletePendingSale(id) {
    const idx = this.pendingSales.findIndex((p) => p.id === id || p._id === id);
    if (idx !== -1) {
      const target = this.pendingSales[idx];
      this.pendingSales.splice(idx, 1);
      this.savePendingSales();
      this.notify(`Venta pendiente eliminada`, 'info');

      try {
        const targetId = target._id || id;
        await PendingSalesService.delete(targetId);
      } catch (err) {
        console.warn('Error eliminando venta pendiente en servidor:', err.message);
      }
    }
  },

  getPendingSaleById(id) {
    return this.pendingSales.find((p) => p.id === id || p._id === id) || null;
  },

  savePendingSales() {
    persist('pending_sales', this.pendingSales);
  },

  // ============ DEBTS ============
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

    const now = new Date().toISOString();
    debt.paid = (Number(debt.paid) || 0) + numAmount;
    debt.balance = Math.max(0, (Number(debt.balance) || 0) - numAmount);
    if (!debt.payments) debt.payments = [];
    debt.payments.push({ id: nextId('payment'), amount: numAmount, date: now, note });
    debt.updatedAt = now;

    // Sync sale paid amount
    const sale = this.sales.find((s) => s.id === debt.saleId || s._id === debt.saleId);
    if (sale) {
      sale.paid = Math.min(sale.total, (Number(sale.paid) || 0) + numAmount);
      sale.updatedAt = now;
      if (debt.balance <= 0) {
        sale.status = 'pagada';
        sale.paid = sale.total;
      }
      this.saveSales();
    }

    if (debt.balance <= 0) {
      debt.status = 'pagada';
      this.notify('Deuda pagada completamente', 'success');
    } else {
      this.notify('Abono registrado correctamente', 'success');
    }

    this.saveDebts();

    try {
      const targetId = debt._id || debtId;
      await DebtsService.addPayment(targetId, numAmount, 'Efectivo', note);
    } catch (err) {
      console.warn('Error registrando abono en backend:', err.message);
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
    Object.assign(this.config, cfg);
    persist('config', this.config);
    this.notify('Configuración guardada', 'success');

    try {
      await SettingsService.updateSettings(cfg);
    } catch (err) {
      console.warn('Error guardando configuración en backend:', err.message);
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
