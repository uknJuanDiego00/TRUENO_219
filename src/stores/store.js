// ============================================
//  TRUENO 219 - Central Data Store
//  Uses localStorage for full persistence
// ============================================

import { reactive, watch } from 'vue'

// ---- Helper: persist to localStorage ----
function persist(key, data) {
  localStorage.setItem('trueno_' + key, JSON.stringify(data))
}
function load(key, fallback) {
  try {
    const raw = localStorage.getItem('trueno_' + key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

// ---- ID Generator ----
let _idCounters = load('id_counters', { product: 100, client: 100, sale: 1000, debt: 100, payment: 100, pending_sale: 100 })
function nextId(type) {
  _idCounters[type] = (_idCounters[type] || 100) + 1
  persist('id_counters', _idCounters)
  return _idCounters[type]
}

// ---- Initial Clean Data (All metrics starting at 0) ----
function generateDemoData() {
  const products = [
    { id: 1, name: 'Espejos Deportivos CNC', category: 'Espejos', description: 'Espejos de aluminio CNC anodizado', buyPrice: 18000, sellPrice: 35000, stock: 12, warehouseStock: 8, minStock: 5, sku: 'ESP-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 2, name: 'Maniguetas CNC Plegables', category: 'Maniguetas', description: 'Maniguetas plegables de alta resistencia', buyPrice: 22000, sellPrice: 45000, stock: 10, warehouseStock: 6, minStock: 3, sku: 'MAN-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 3, name: 'Direccionales LED Ámbar', category: 'Direccionales', description: 'Direccionales LED de alta visibilidad', buyPrice: 12000, sellPrice: 25000, stock: 15, warehouseStock: 10, minStock: 5, sku: 'DIR-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 4, name: 'Luces LED para Moto', category: 'Luces', description: 'Kit de luces LED multicolor', buyPrice: 15000, sellPrice: 30000, stock: 3, warehouseStock: 5, minStock: 4, sku: 'LUZ-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 5, name: 'Protector de Motor', category: 'Protección', description: 'Jaula de protección de motor aluminio', buyPrice: 45000, sellPrice: 90000, stock: 5, warehouseStock: 4, minStock: 2, sku: 'PRO-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 6, name: 'Soporte para Celular', category: 'Accesorios', description: 'Soporte universal resistente al agua', buyPrice: 10000, sellPrice: 22000, stock: 20, warehouseStock: 15, minStock: 5, sku: 'SOC-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 7, name: 'Slider para Moto', category: 'Protección', description: 'Sliders anticaída de poliamida', buyPrice: 25000, sellPrice: 55000, stock: 7, warehouseStock: 5, minStock: 3, sku: 'SLI-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
    { id: 8, name: 'Porta Placa Deportivo', category: 'Estética', description: 'Porta placa con led integrado', buyPrice: 8000, sellPrice: 18000, stock: 14, warehouseStock: 10, minStock: 4, sku: 'POR-001', image: null, totalSold: 0, createdAt: new Date().toISOString() },
  ]

  const clients = [
    { id: 1, document: '1001234567', name: 'Juan Pérez', phone: '3101234567', address: 'Cra 15 #20-30, Bogotá', email: 'juan@email.com', notes: 'Cliente frecuente', createdAt: new Date().toISOString(), totalBought: 0 },
    { id: 2, document: '1007654321', name: 'María García', phone: '3157654321', address: 'Cll 45 #12-10, Medellín', email: 'maria@email.com', notes: '', createdAt: new Date().toISOString(), totalBought: 0 },
    { id: 3, document: '1009876543', name: 'Carlos Rodríguez', phone: '3209876543', address: 'Av. 30 #45-67, Cali', email: '', notes: 'Mecánico de motos', createdAt: new Date().toISOString(), totalBought: 0 },
  ]

  const sales = []
  const debts = []

  return { products, clients, sales, debts }
}

// ---- Initialize Store ----
const isFirstRun = !localStorage.getItem('trueno_initialized')
let demoData = {}
if (isFirstRun) {
  demoData = generateDemoData()
  localStorage.setItem('trueno_initialized', '1')
}

// Load products and ensure warehouseStock is defined on all items
const initialProducts = load('products', demoData.products || [])
initialProducts.forEach(p => {
  p.stock = Math.max(0, Number(p.stock) || 0)
  if (p.warehouseStock === undefined || p.warehouseStock === null || isNaN(p.warehouseStock)) {
    // If it's the demo lights or previously loaded without warehouseStock
    p.warehouseStock = p.name?.toLowerCase().includes('luces') ? 5 : 4
  } else {
    p.warehouseStock = Math.max(0, Number(p.warehouseStock) || 0)
  }
})

const store = reactive({
  products: initialProducts,
  clients: load('clients', demoData.clients || []),
  sales: load('sales', demoData.sales || []),
  debts: load('debts', demoData.debts || []),
  pendingSales: load('pending_sales', []),

  config: load('config', {
    storeName: 'Trueno 219',
    lowStockThreshold: 5,
    currency: 'COP',
    taxRate: 0,
  }),

  notifications: [],

  // ============ PRODUCTS ============
  addProduct(product) {
    const p = {
      ...product,
      id: nextId('product'),
      stock: Math.max(0, Number(product.stock) || 0),
      warehouseStock: Math.max(0, Number(product.warehouseStock) || 0),
      totalSold: 0,
      createdAt: new Date().toISOString(),
    }
    this.products.push(p)
    this.saveProducts()
    this.notify('Producto agregado al inventario', 'success')
    return p
  },

  updateProduct(id, data) {
    const idx = this.products.findIndex(p => p.id === id)
    if (idx !== -1) {
      const current = this.products[idx]
      this.products[idx] = {
        ...current,
        ...data,
        stock: Math.max(0, Number(data.stock !== undefined ? data.stock : current.stock) || 0),
        warehouseStock: Math.max(0, Number(data.warehouseStock !== undefined ? data.warehouseStock : current.warehouseStock) || 0),
        updatedAt: new Date().toISOString(),
      }
      this.saveProducts()
      this.notify('Producto actualizado', 'success')
    }
  },

  deleteProduct(id) {
    const idx = this.products.findIndex(p => p.id === id)
    if (idx !== -1) {
      this.products.splice(idx, 1)
      this.saveProducts()
      this.notify('Producto eliminado', 'info')
    }
  },

  // Ajustar stock disponible en tienda
  adjustStock(id, delta) {
    const p = this.products.find(p => p.id === id)
    if (p) {
      const newStock = (Number(p.stock) || 0) + delta
      if (newStock < 0) return false
      p.stock = newStock
      p.updatedAt = new Date().toISOString()
      this.saveProducts()
      return true
    }
    return false
  },

  // Ajustar stock en bodega
  adjustWarehouseStock(id, delta) {
    const p = this.products.find(p => p.id === id)
    if (p) {
      const newWarehouse = (Number(p.warehouseStock) || 0) + delta
      if (newWarehouse < 0) return false
      p.warehouseStock = newWarehouse
      p.updatedAt = new Date().toISOString()
      this.saveProducts()
      return true
    }
    return false
  },

  // Trasladar stock entre bodega y tienda
  transferStock(id, from, to, amount = 1) {
    const p = this.products.find(p => p.id === id)
    if (!p) return false
    const qty = Math.max(1, parseInt(amount) || 1)
    p.stock = Math.max(0, Number(p.stock) || 0)
    p.warehouseStock = Math.max(0, Number(p.warehouseStock) || 0)

    if (from === 'warehouse' && to === 'store') {
      if (p.warehouseStock < qty) {
        this.notify(`No hay suficiente cantidad en bodega (disponible en bodega: ${p.warehouseStock})`, 'warning')
        return false
      }
      p.warehouseStock -= qty
      p.stock += qty
      p.updatedAt = new Date().toISOString()
      this.saveProducts()
      this.notify(`Se pasaron ${qty} unidad(es) de Bodega a Tienda (${p.name})`, 'success')
      return true
    } else if (from === 'store' && to === 'warehouse') {
      if (p.stock < qty) {
        this.notify(`No hay suficiente cantidad en tienda (disponible en tienda: ${p.stock})`, 'warning')
        return false
      }
      p.stock -= qty
      p.warehouseStock += qty
      p.updatedAt = new Date().toISOString()
      this.saveProducts()
      this.notify(`Se pasaron ${qty} unidad(es) de Tienda a Bodega (${p.name})`, 'success')
      return true
    }
    return false
  },

  getProductById(id) {
    return this.products.find(p => p.id === id) || null
  },

  saveProducts() {
    persist('products', this.products)
  },

  // ============ CLIENTS ============
  addClient(client) {
    // Validate unique document
    if (client.document && client.document.trim()) {
      const existing = this.clients.find(c => c.document === client.document.trim())
      if (existing) {
        this.notify(`Ya existe un cliente con documento ${client.document}: ${existing.name}`, 'warning')
        return null
      }
    }
    const c = {
      ...client,
      id: nextId('client'),
      document: (client.document || '').trim(),
      totalBought: 0,
      createdAt: new Date().toISOString(),
    }
    this.clients.push(c)
    this.saveClients()
    this.notify('Cliente registrado', 'success')
    return c
  },

  updateClient(id, data) {
    const idx = this.clients.findIndex(c => c.id === id)
    if (idx !== -1) {
      this.clients[idx] = { ...this.clients[idx], ...data, updatedAt: new Date().toISOString() }
      this.saveClients()
      this.notify('Cliente actualizado', 'success')
    }
  },

  deleteClient(id) {
    const idx = this.clients.findIndex(c => c.id === id)
    if (idx !== -1) {
      this.clients.splice(idx, 1)
      this.saveClients()
      this.notify('Cliente eliminado', 'info')
    }
  },

  getClientById(id) {
    return this.clients.find(c => c.id === id) || null
  },

  getClientByDocument(doc) {
    if (!doc) return null
    return this.clients.find(c => c.document === doc.trim()) || null
  },

  saveClients() {
    persist('clients', this.clients)
  },

  // ============ SALES ============
  registerSale({ items, clientId, clientName, clientDocument, paymentMethod, paid, total: passedTotal, discount = 0, interestRate = 0 }) {
    if (!items || !items.length) {
      this.notify('El carrito no contiene productos', 'warning')
      return null
    }

    // Verify product existence and stock
    for (const item of items) {
      const product = this.products.find(p => p.id === item.productId)
      if (!product) {
        this.notify(`Producto no encontrado: ${item.name}`, 'danger')
        return null
      }
      if (product.stock < item.qty) {
        this.notify(`Stock insuficiente para: ${item.name} (disponibles: ${product.stock})`, 'danger')
        return null
      }
    }

    const itemsSubtotal = items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
    const finalDiscount = Math.max(0, Number(discount) || 0)
    const baseTotal = passedTotal !== undefined ? Math.max(0, Number(passedTotal) || 0) : Math.max(0, itemsSubtotal - finalDiscount)

    // Apply interest for credit sales
    const finalInterestRate = paymentMethod === 'Crédito' ? Math.max(0, Math.min(100, Number(interestRate) || 0)) : 0
    const interestAmount = finalInterestRate > 0 ? Math.round(baseTotal * finalInterestRate / 100) : 0
    const finalTotal = baseTotal + interestAmount

    const paidAmount = paymentMethod === 'Crédito' ? Math.max(0, Math.min(finalTotal, Number(paid) || 0)) : finalTotal

    // Check if there is an existing same-day sale for this registered client to accumulate
    let existingSale = null
    if (clientId) {
      const today = new Date().toDateString()
      existingSale = this.sales.find(s =>
        s.clientId === Number(clientId) &&
        new Date(s.date).toDateString() === today &&
        s.status !== 'pendiente' &&
        s.paymentMethod === paymentMethod &&
        paymentMethod !== 'Crédito' // Credit sales are always separate since they have debts
      )
    }

    // Deduct stock safely
    items.forEach(item => {
      const p = this.products.find(p => p.id === item.productId)
      if (p) {
        p.stock = Math.max(0, p.stock - item.qty)
        p.totalSold = (Number(p.totalSold) || 0) + item.qty
        if (p.stock <= 0) this.notify(`${p.name} está AGOTADO`, 'danger')
        else if (p.stock <= (p.minStock || this.config.lowStockThreshold))
          this.notify(`Stock bajo: ${p.name} — quedan ${p.stock}`, 'warning')
      }
    })
    this.saveProducts()

    // Update client total
    if (clientId) {
      const client = this.clients.find(c => c.id === Number(clientId))
      if (client) {
        client.totalBought = (Number(client.totalBought) || 0) + finalTotal
        this.saveClients()
      }
    }

    // Accumulate to existing sale if applicable
    if (existingSale) {
      // Merge items: add quantities for existing products, add new products
      items.forEach(newItem => {
        const existingItem = existingSale.items.find(ei => ei.productId === newItem.productId)
        if (existingItem) {
          existingItem.qty += newItem.qty
          existingItem.subtotal = existingItem.qty * existingItem.price
        } else {
          existingSale.items.push({ ...newItem })
        }
      })
      existingSale.subtotal = existingSale.items.reduce((s, i) => s + (Number(i.subtotal) || 0), 0)
      existingSale.discount = (Number(existingSale.discount) || 0) + finalDiscount
      existingSale.total = (Number(existingSale.total) || 0) + finalTotal
      existingSale.paid = existingSale.total
      existingSale.date = new Date().toISOString() // Update timestamp
      this.saveSales()
      this.notify('Venta acumulada al cliente correctamente', 'success')
      return existingSale
    }

    // Create new sale
    const sale = {
      id: nextId('sale'),
      clientId: clientId ? Number(clientId) : null,
      clientName: clientName || 'Cliente General',
      clientDocument: clientDocument || '',
      items: items.map(i => ({ ...i })),
      subtotal: itemsSubtotal,
      discount: finalDiscount,
      total: finalTotal,
      baseTotal: baseTotal,
      interestRate: finalInterestRate,
      interestAmount: interestAmount,
      paid: paidAmount,
      paymentMethod,
      status: paidAmount >= finalTotal ? 'pagada' : 'pendiente',
      date: new Date().toISOString(),
      debt: null,
    }

    // Create debt if credit
    if (paymentMethod === 'Crédito' && paidAmount < finalTotal) {
      const debt = this.createDebt({
        saleId: sale.id,
        clientId: clientId ? Number(clientId) : null,
        clientName: clientName || 'Cliente General',
        clientDocument: clientDocument || '',
        total: finalTotal,
        baseTotal: baseTotal,
        interestRate: finalInterestRate,
        interestAmount: interestAmount,
        paid: paidAmount,
        items,
      })
      sale.debt = debt.id
    }

    this.sales.push(sale)
    this.saveSales()
    this.notify('Venta registrada correctamente', 'success')
    return sale
  },

  saveSales() {
    persist('sales', this.sales)
  },

  // ============ PENDING SALES ============
  savePendingSale(saleData) {
    if (saleData.id) {
      const idx = this.pendingSales.findIndex(p => p.id === saleData.id)
      if (idx !== -1) {
        this.pendingSales[idx] = {
          ...this.pendingSales[idx],
          ...saleData,
          status: 'PENDIENTE',
          updatedAt: new Date().toISOString(),
        }
        this.savePendingSales()
        this.notify(`Venta pendiente #${saleData.id} actualizada`, 'success')
        return this.pendingSales[idx]
      }
    }

    const pendingNum = nextId('pending_sale')
    const formattedId = `PEND-${String(pendingNum).padStart(3, '0')}`
    const pending = {
      ...saleData,
      id: formattedId,
      status: 'PENDIENTE',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    this.pendingSales.unshift(pending)
    this.savePendingSales()
    this.notify(`Venta guardada como pendiente (#${pending.id})`, 'success')
    return pending
  },

  deletePendingSale(id) {
    const idx = this.pendingSales.findIndex(p => p.id === id)
    if (idx !== -1) {
      const removed = this.pendingSales.splice(idx, 1)[0]
      this.savePendingSales()
      this.notify(`Venta pendiente #${id} eliminada`, 'info')
      return removed
    }
    return null
  },

  getPendingSaleById(id) {
    return this.pendingSales.find(p => p.id === id) || null
  },

  savePendingSales() {
    persist('pending_sales', this.pendingSales)
  },

  // ============ DEBTS ============
  createDebt({ saleId, clientId, clientName, clientDocument, total, baseTotal, interestRate, interestAmount, paid, items }) {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 30)
    const numTotal = Number(total) || 0
    const numPaid = Number(paid) || 0

    const debt = {
      id: nextId('debt'),
      saleId,
      clientId: clientId ? Number(clientId) : null,
      clientName: clientName || 'Cliente General',
      clientDocument: clientDocument || '',
      total: numTotal,
      baseTotal: Number(baseTotal) || numTotal,
      interestRate: Number(interestRate) || 0,
      interestAmount: Number(interestAmount) || 0,
      paid: numPaid,
      balance: Math.max(0, numTotal - numPaid),
      dueDate: dueDate.toISOString(),
      status: 'pendiente',
      createdAt: new Date().toISOString(),
      payments: numPaid > 0 ? [{ id: nextId('payment'), amount: numPaid, date: new Date().toISOString(), note: 'Pago inicial' }] : [],
      items: items ? items.map(i => ({ ...i })) : [],
    }
    this.debts.push(debt)
    this.saveDebts()
    return debt
  },

  addPayment(debtId, amount, note = '') {
    const debt = this.debts.find(d => d.id === debtId)
    if (!debt) return
    const numAmount = Number(amount) || 0
    if (numAmount <= 0) {
      this.notify('El abono debe ser mayor a 0', 'warning')
      return
    }
    if (numAmount > debt.balance) {
      this.notify('El abono supera el saldo pendiente', 'warning')
      return
    }
    const now = new Date().toISOString()
    debt.paid = (Number(debt.paid) || 0) + numAmount
    debt.balance = Math.max(0, (Number(debt.balance) || 0) - numAmount)
    debt.payments.push({ id: nextId('payment'), amount: numAmount, date: now, note })
    debt.updatedAt = now

    // Always sync the sale's paid field with the new payment amount
    const sale = this.sales.find(s => s.id === debt.saleId)
    if (sale) {
      sale.paid = Math.min(sale.total, (Number(sale.paid) || 0) + numAmount)
      sale.updatedAt = now
    }

    if (debt.balance <= 0) {
      debt.balance = 0
      debt.status = 'pagada'
      if (sale) { sale.status = 'pagada'; sale.paid = sale.total }
      this.notify('Deuda pagada completamente', 'success')
    } else {
      this.notify('Abono registrado correctamente', 'success')
    }

    this.saveSales()
    this.updateDebtStatuses()
    this.saveDebts()
  },

  updateDebtStatuses() {
    const now = new Date()
    this.debts.forEach(d => {
      if (d.status === 'pendiente' && new Date(d.dueDate) < now) {
        d.status = 'vencida'
      }
    })
  },

  saveDebts() {
    persist('debts', this.debts)
  },

  // ============ CONFIG ============
  updateConfig(cfg) {
    Object.assign(this.config, cfg)
    persist('config', this.config)
    this.notify('Configuración guardada', 'success')
  },

  // ============ NOTIFICATIONS ============
  notify(message, type = 'info') {
    const id = Date.now()
    this.notifications.push({ id, message, type })
    setTimeout(() => {
      const idx = this.notifications.findIndex(n => n.id === id)
      if (idx !== -1) this.notifications.splice(idx, 1)
    }, 4000)
  },

  // ============ COMPUTED STATS ============
  get totalProducts() { return this.products.length },
  get totalStoreStock() { return this.products.reduce((s, p) => s + (Number(p.stock) || 0), 0) },
  get totalWarehouseStock() { return this.products.reduce((s, p) => s + (Number(p.warehouseStock) || 0), 0) },
  get totalInventoryUnits() { return this.totalStoreStock + this.totalWarehouseStock },
  get lowStockProducts() {
    return this.products.filter(p => (Number(p.stock) || 0) > 0 && (Number(p.stock) || 0) <= (p.minStock || this.config.lowStockThreshold))
  },
  get outOfStockProducts() { return this.products.filter(p => (Number(p.stock) || 0) <= 0) },
  get outOfAllStockProducts() { return this.products.filter(p => (Number(p.stock) || 0) <= 0 && (Number(p.warehouseStock) || 0) <= 0) },
  get totalClients() { return this.clients.length },
  get totalPendingDebt() {
    return this.debts.filter(d => d.status !== 'pagada').reduce((s, d) => s + d.balance, 0)
  },
  get todaySales() {
    const today = new Date().toDateString()
    return this.sales.filter(s => new Date(s.date).toDateString() === today)
  },
  get todayTotal() { return this.todaySales.reduce((s, v) => s + v.total, 0) },
  get monthSales() {
    const now = new Date()
    return this.sales.filter(s => {
      const d = new Date(s.date)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
  },
  get monthTotal() { return this.monthSales.reduce((s, v) => s + v.total, 0) },
  get topProducts() {
    const map = {}
    this.sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!map[item.productId]) map[item.productId] = { name: item.name, qty: 0, revenue: 0 }
        map[item.productId].qty += item.qty
        map[item.productId].revenue += item.subtotal
      })
    })
    return Object.entries(map)
      .map(([id, v]) => ({ productId: +id, ...v }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
  },
  resetAllDataToZero() {
    this.products.forEach(p => {
      p.stock = 0
      p.warehouseStock = 0
      p.totalSold = 0
    })
    this.clients.forEach(c => {
      c.totalBought = 0
    })
    this.sales.splice(0)
    this.debts.splice(0)
    this.pendingSales.splice(0)

    this.saveProducts()
    this.saveClients()
    this.saveSales()
    this.saveDebts()
    this.savePendingSales()
    localStorage.setItem('trueno_initialized', '1')
  },
  getClientSales(clientId) {
    return this.sales.filter(s => s.clientId === clientId)
  },
  getClientDebts(clientId) {
    return this.debts.filter(d => d.clientId === clientId)
  },
})

// Ensure demo products have stock if all products are 0
if (store.products.length > 0 && store.products.every(p => p.stock === 0 && (p.warehouseStock || 0) === 0)) {
  const defaultStocks = [12, 10, 15, 3, 5, 20, 7, 14]
  const defaultWarehouse = [8, 6, 10, 5, 4, 15, 5, 10]
  store.products.forEach((p, i) => {
    p.stock = defaultStocks[i % defaultStocks.length]
    p.warehouseStock = defaultWarehouse[i % defaultWarehouse.length]
  })
  store.saveProducts()
}

// Update debt statuses on load
store.updateDebtStatuses()

export default store
