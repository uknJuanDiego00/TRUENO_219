<template>
  <div class="page-container">
    <!-- Header & Hero Store Banner -->
    <div class="store-hero-banner card" style="margin-bottom: 24px;">
      <div class="hero-left">
        <img src="/img/logo-trueno.png" alt="Tuning 219 Trueno" class="hero-logo-img" />
        <div class="hero-info">
          <div class="hero-tag">SISTEMA DE GESTIÓN OFICIAL</div>
          <h1 class="hero-title">TUNING <span class="text-accent">219</span> <span class="text-cyan">TRUENO</span></h1>
          <p class="hero-subtitle">Accesorios, Lujos y Repuestos para Motos • {{ dateLabel }}</p>
        </div>
      </div>
      <div class="hero-actions">
        <router-link to="/ventas" class="btn btn-primary"><ShoppingCart :size="16" /> Nueva Venta</router-link>
        <router-link to="/inventario" class="btn btn-secondary"><Package :size="16" /> Inventario</router-link>
      </div>
    </div>

    <!-- Stats Row -->
    <div class="grid-4" style="margin-bottom:24px">
      <div class="stat-card" style="--card-color: var(--accent)">
        <div class="stat-icon"><Package :size="26" /></div>
        <div class="stat-value">{{ formatNumber(store.totalProducts) }}</div>
        <div class="stat-label">Total de Productos</div>
      </div>
      <div class="stat-card" style="--card-color: #f5a623">
        <div class="stat-icon"><AlertTriangle :size="26" /></div>
        <div class="stat-value text-warning">{{ formatNumber(store.lowStockProducts.length) }}</div>
        <div class="stat-label">Stock Bajo</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Banknote :size="26" /></div>
        <div class="stat-value text-success">{{ formatCurrency(store.todayTotal) }}</div>
        <div class="stat-label">Ventas del Día</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><TrendingUp :size="26" /></div>
        <div class="stat-value text-accent">{{ formatCurrency(store.monthTotal) }}</div>
        <div class="stat-label">Ventas del Mes</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Users :size="26" /></div>
        <div class="stat-value">{{ formatNumber(store.totalClients) }}</div>
        <div class="stat-label">Clientes Registrados</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Wallet :size="26" /></div>
        <div class="stat-value text-danger">{{ formatCurrency(store.totalPendingDebt) }}</div>
        <div class="stat-label">Total por Cobrar</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><ShoppingCart :size="26" /></div>
        <div class="stat-value">{{ formatNumber(store.sales.length) }}</div>
        <div class="stat-label">Ventas Totales</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon"><Target :size="26" /></div>
        <div class="stat-value text-info">{{ formatCurrency(avgTicket) }}</div>
        <div class="stat-label">Ticket Promedio</div>
      </div>
    </div>

    <!-- Charts + Side panels -->
    <div class="dash-grid" style="margin-bottom:24px">
      <!-- Weekly Chart -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><BarChart2 :size="18" /> Ventas Semanales</h3>
          <div class="tabs" style="margin-bottom:0; width: auto; flex: none;">
            <button class="tab" :class="{active: chartMode === 'week'}" @click="chartMode='week'">Semana</button>
            <button class="tab" :class="{active: chartMode === 'month'}" @click="chartMode='month'">Mes</button>
          </div>
        </div>
        <div class="chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>

      <!-- Top Products -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><Trophy :size="18" /> Productos más Vendidos</h3>
        </div>
        <div v-if="store.topProducts.length === 0" class="empty-state">
          <div class="empty-state-icon"><Package :size="40" /></div>
          <div class="empty-state-text">Sin ventas aún</div>
        </div>
        <div v-else class="top-products-list">
          <div v-for="(item, idx) in store.topProducts" :key="item.productId" class="top-product-item">
            <div class="top-rank" :class="`rank-${idx+1}`">#{{ idx + 1 }}</div>
            <div class="top-info">
              <div class="top-name">{{ item.name }}</div>
              <div class="top-sub">{{ item.qty }} unidades vendidas</div>
            </div>
            <div class="top-revenue text-success fw-600">{{ formatCurrency(item.revenue) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="grid-2">
      <!-- Stock Alerts -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><TriangleAlert :size="18" /> Alertas de Inventario</h3>
          <router-link to="/inventario" class="btn btn-secondary btn-sm">Ver inventario</router-link>
        </div>
        <div v-if="alertProducts.length === 0" class="empty-state">
          <div class="empty-state-icon"><CheckCircle :size="40" /></div>
          <div class="empty-state-text">Todos los productos tienen stock suficiente</div>
        </div>
        <div v-else class="alert-list">
          <div v-for="p in alertProducts" :key="p.id" class="alert-item" :class="p.stock <= 0 ? 'alert-danger' : 'alert-warning'">
            <span class="alert-dot">
              <XCircle v-if="p.stock <= 0" :size="18" class="text-danger" />
              <AlertTriangle v-else :size="18" class="text-warning" />
            </span>
            <div class="alert-info">
              <span class="alert-name">{{ p.name }}</span>
              <div class="alert-stock-breakdown">
                <span :class="p.stock <= 0 ? 'text-danger fw-600' : 'text-warning fw-600'">
                  <Store :size="12" /> {{ p.stock }} disponibles
                </span>
                <span class="alert-loc-sep">•</span>
                <span class="text-accent fw-600">
                  <Warehouse :size="12" /> {{ p.warehouseStock || 0 }} bodega
                </span>
              </div>
            </div>
            <div class="alert-actions-right">
              <button
                v-if="(p.warehouseStock || 0) > 0"
                class="btn-alert-restock"
                @click="passToStore(p, 1)"
                title="Pasar 1 unidad de Bodega a Tienda"
              >
                <ArrowUpRight :size="12" /> Pasar 1 a tienda
              </button>
              <span :class="p.stock <= 0 ? 'badge badge-danger' : 'badge badge-warning'">
                {{ p.stock <= 0 ? ((p.warehouseStock || 0) > 0 ? 'Solo bodega' : 'Agotado') : 'Stock bajo' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Sales -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title"><ShoppingCart :size="18" /> Ventas Recientes</h3>
          <router-link to="/historial" class="btn btn-secondary btn-sm">Ver historial</router-link>
        </div>
        <div v-if="recentSales.length === 0" class="empty-state">
          <div class="empty-state-icon"><ShoppingCart :size="40" /></div>
          <div class="empty-state-text">No hay ventas registradas</div>
        </div>
        <div v-else class="recent-sales-list">
          <div v-for="sale in recentSales" :key="sale.id" class="recent-sale-item">
            <div class="recent-sale-left">
              <div class="recent-sale-id text-accent fw-600">#{{ sale.id }}</div>
              <div class="recent-sale-client">{{ sale.clientName }}</div>
              <div class="recent-sale-date text-muted" style="font-size:12px">{{ formatDate(sale.date) }}</div>
            </div>
            <div class="recent-sale-right">
              <div class="recent-sale-total fw-bold">{{ formatCurrency(sale.total) }}</div>
              <span :class="sale.status === 'pagada' ? 'badge badge-success' : 'badge badge-warning'">
                {{ sale.status }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, formatDate, formatNumber, getWeeklySalesData, getMonthlySalesData } from '../utils/calculations.js'
import {
  Package, ShoppingCart, Users, Wallet, TrendingUp, Banknote,
  Target, Trophy, BarChart2, AlertTriangle, CheckCircle, XCircle, TriangleAlert,
  Store, Warehouse, ArrowUpRight
} from '@lucide/vue'

const chartMode = ref('week')
const chartCanvas = ref(null)
let chartInstance = null

const dateLabel = computed(() => {
  return new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
})

const avgTicket = computed(() => {
  if (!store.sales.length) return 0
  return store.sales.reduce((s, v) => s + v.total, 0) / store.sales.length
})

const alertProducts = computed(() => {
  const threshold = store.config.lowStockThreshold
  return store.products.filter(p => p.stock <= (p.minStock || threshold)).sort((a,b) => a.stock - b.stock)
})

function passToStore(product, qty = 1) {
  store.transferStock(product.id, 'warehouse', 'store', qty)
}

const recentSales = computed(() => [...store.sales].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 6))

// --- Chart ---
async function buildChart() {
  if (!chartCanvas.value) return
  const { Chart, registerables } = await import('chart.js')
  Chart.register(...registerables)
  if (chartInstance) { chartInstance.destroy(); chartInstance = null }

  const chartData = chartMode.value === 'week'
    ? getWeeklySalesData(store.sales)
    : getMonthlySalesData(store.sales)

  chartInstance = new Chart(chartCanvas.value, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Ventas',
        data: chartData.data,
        backgroundColor: 'rgba(255,69,0,0.5)',
        borderColor: '#ff4500',
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + formatCurrency(ctx.raw)
          }
        }
      },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888a0', font: { size: 11 } } },
        y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8888a0', font: { size: 11 }, callback: v => formatCurrency(v) } },
      }
    }
  })
}

onMounted(() => buildChart())
watch([chartMode, () => store.sales.length], () => buildChart(), { flush: 'post' })
onUnmounted(() => {
  if (chartInstance) {
    chartInstance.destroy()
    chartInstance = null
  }
})
</script>

<style scoped>
/* Hero Banner */
.store-hero-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: linear-gradient(135deg, rgba(18, 20, 31, 0.95), rgba(24, 27, 40, 0.98));
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 22px 24px;
  position: relative;
  overflow: hidden;
}

.store-hero-banner::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 4px; height: 100%;
  background: linear-gradient(to bottom, var(--accent), var(--cyan));
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 18px;
  flex: 1;
  min-width: 0;
}

.hero-logo-img {
  height: 56px;
  max-height: 56px;
  width: auto;
  max-width: 80px;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(216, 235, 52, 0.3));
  flex-shrink: 0;
}

.hero-info {
  flex: 1;
  min-width: 0;
}

.hero-tag {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--cyan);
  text-transform: uppercase;
  margin-bottom: 4px;
}

.hero-title {
  font-family: var(--font-brand);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 1px;
  line-height: 1.2;
  margin-bottom: 4px;
}

.hero-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
}

.hero-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

@media (max-width: 860px) {
  .store-hero-banner {
    flex-direction: column;
    align-items: stretch;
    padding: 18px;
    gap: 16px;
  }
  .hero-actions {
    width: 100%;
  }
  .hero-actions .btn {
    flex: 1;
    justify-content: center;
  }
}

@media (max-width: 550px) {
  .hero-left {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
  }
  .hero-logo-img {
    height: 44px;
    max-height: 44px;
    max-width: 65px;
  }
  .hero-title {
    font-size: 19px;
  }
  .hero-subtitle {
    font-size: 12px;
  }
  .hero-actions {
    flex-direction: column;
  }
}

.dash-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
@media (max-width: 900px) { .dash-grid { grid-template-columns: 1fr; } }

.chart-container { height: 220px; position: relative; }

.top-products-list { display: flex; flex-direction: column; gap: 10px; }
.top-product-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  transition: var(--transition);
}
.top-product-item:hover { background: var(--bg-card-hover); }
.top-rank {
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 700;
  min-width: 36px;
  text-align: center;
}
.rank-1 { color: #ffd700; }
.rank-2 { color: #c0c0c0; }
.rank-3 { color: #cd7f32; }
.top-info { flex: 1; }
.top-name { font-size: 14px; font-weight: 600; }
.top-sub { font-size: 12px; color: var(--text-muted); }
.top-revenue { font-size: 14px; }

.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  border: 1px solid;
}
.alert-warning { background: var(--warning-bg); border-color: rgba(245,166,35,0.2); }
.alert-danger { background: var(--danger-bg); border-color: rgba(255,59,92,0.2); }
.alert-dot { font-size: 18px; }
.alert-info { flex: 1; min-width: 0; }
.alert-name { display: block; font-size: 14px; font-weight: 600; color: var(--text-primary); }
.alert-stock-breakdown {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  margin-top: 2px;
}
.alert-loc-store, .alert-loc-bodega {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.alert-loc-sep {
  color: var(--text-muted);
  opacity: 0.5;
}
.alert-actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.btn-alert-restock {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: opacity 0.15s ease;
  white-space: nowrap;
}
.btn-alert-restock:hover {
  opacity: 0.9;
}

.recent-sales-list { display: flex; flex-direction: column; gap: 8px; }
.recent-sale-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}
.recent-sale-left, .recent-sale-right { display: flex; flex-direction: column; gap: 2px; }
.recent-sale-right { align-items: flex-end; }
.recent-sale-id { font-size: 13px; }
.recent-sale-client { font-size: 13px; font-weight: 500; }
.recent-sale-total { font-size: 15px; }

/* Override stat-card grid for 4-col */
@media (max-width: 1200px) {
  .grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 600px) {
  .grid-4 { grid-template-columns: 1fr 1fr; }
}
</style>
