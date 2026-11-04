// Utility functions for Trueno 219

// Formatear números con puntos para separar miles (ej: 1.500.000)
export function formatNumber(value, decimals = 0) {
  const num = Number.isFinite(Number(value)) ? Number(value) : 0
  const isNegative = num < 0
  const absVal = Math.abs(num)
  let res = ''
  if (decimals > 0) {
    const fixed = absVal.toFixed(decimals)
    const [intPart, decPart] = fixed.split('.')
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    res = `${formattedInt},${decPart}`
  } else {
    res = Math.round(absVal).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }
  return isNegative ? `-${res}` : res
}

// Formatear moneda ($ 1.500.000) siempre separando miles por puntos
export function formatCurrency(value, currency = '$') {
  const num = Number.isFinite(Number(value)) ? Number(value) : 0
  const isNegative = num < 0
  const formatted = formatNumber(Math.abs(num))
  const prefix = currency === 'COP' || currency === '$' ? '$' : currency
  return isNegative ? `-${prefix} ${formatted}` : `${prefix} ${formatted}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

export function getStockStatus(product, threshold = 5) {
  const min = product?.minStock || threshold
  const storeStock = Math.max(0, Number(product?.stock) || 0)
  const warehouseStock = Math.max(0, Number(product?.warehouseStock) || 0)

  if (storeStock <= 0 && warehouseStock <= 0) return { label: 'Agotado', badge: 'badge-danger', dot: '🔴' }
  if (storeStock <= 0 && warehouseStock > 0) return { label: 'Solo en bodega', badge: 'badge-warning', dot: '📦' }
  if (storeStock <= min) return { label: 'Stock bajo tienda', badge: 'badge-warning', dot: '⚠️' }
  return { label: 'Disponible', badge: 'badge-success', dot: '🟢' }
}

export function formatStockLabel(product) {
  const storeStock = Math.max(0, Number(product?.stock) || 0)
  const warehouseStock = Math.max(0, Number(product?.warehouseStock) || 0)
  return `${storeStock} disponibles, ${warehouseStock} bodega`
}

export function getDebtStatus(debt) {
  if (!debt) return { label: 'Desconocido', badge: 'badge-secondary' }
  if (debt.status === 'pagada') return { label: 'Pagada', badge: 'badge-success' }
  if (debt.status === 'vencida') return { label: 'Vencida', badge: 'badge-danger' }
  return { label: 'Pendiente', badge: 'badge-warning' }
}

export function getWeeklySalesData(sales) {
  const days = []
  const labels = []
  const now = new Date()
  const safeSales = Array.isArray(sales) ? sales.filter(s => s && s.date && !isNaN(new Date(s.date).getTime())) : []

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const dayStr = d.toDateString()
    labels.push(d.toLocaleDateString('es-CO', { weekday: 'short', day: '2-digit' }))
    const total = safeSales
      .filter(s => new Date(s.date).toDateString() === dayStr)
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0)
    days.push(total)
  }
  return { labels, data: days }
}

export function getMonthlySalesData(sales) {
  const now = new Date()
  const monthsMap = {}
  const safeSales = Array.isArray(sales) ? sales.filter(s => s && s.date && !isNaN(new Date(s.date).getTime())) : []

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    monthsMap[key] = { label: d.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }), total: 0 }
  }
  safeSales.forEach(s => {
    const d = new Date(s.date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (monthsMap[key]) monthsMap[key].total += (Number(s.total) || 0)
  })
  const entries = Object.values(monthsMap)
  return { labels: entries.map(e => e.label), data: entries.map(e => e.total) }
}
