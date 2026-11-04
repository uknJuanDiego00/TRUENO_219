<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><ClipboardList :size="24" /> Historial de Ventas</h1>
        <p class="page-subtitle">{{ store.sales.length }} ventas registradas</p>
      </div>
      <div class="header-stats">
        <span class="hs-badge">Hoy: <strong class="text-success">{{ formatCurrency(store.todayTotal) }}</strong></span>
        <span class="hs-badge">Mes: <strong class="text-accent">{{ formatCurrency(store.monthTotal) }}</strong></span>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-grid">
      <div class="search-bar">
        <Search :size="16" class="search-icon" />
        <input v-model="searchQuery" placeholder="Buscar por cliente, # venta o producto..." />
      </div>
      <select class="form-control" v-model="filterMethod">
        <option value="">Todos los métodos</option>
        <option v-for="m in methods" :key="m" :value="m">{{ m }}</option>
      </select>
      <select class="form-control" v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="pagada">Pagada</option>
        <option value="pendiente">Pendiente</option>
      </select>
      <input v-model="filterDate" type="date" class="form-control" />
    </div>

    <!-- Desktop Table -->
    <div class="card desktop-table" style="padding:0; overflow:hidden">
      <div class="table-wrapper" style="border:none">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Modificado</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Ver</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredSales.length === 0">
              <td colspan="9">
                <div class="empty-state">
                  <div class="empty-state-icon"><ClipboardList :size="40" /></div>
                  <div class="empty-state-text">No se encontraron ventas</div>
                </div>
              </td>
            </tr>
            <tr v-for="sale in filteredSales" :key="sale.id" @click="viewSale(sale)" style="cursor:pointer">
              <td class="text-accent fw-600">#{{ sale.id }}</td>
              <td class="text-muted" style="white-space:nowrap">{{ formatDate(sale.date) }}</td>
              <td class="text-muted" style="white-space:nowrap; font-size:11px">
                <span v-if="sale.updatedAt" class="updated-badge">✏️ {{ formatDate(sale.updatedAt) }}</span>
                <span v-else class="text-muted">—</span>
              </td>
              <td>
                <div class="fw-600">{{ sale.clientName }}</div>
              </td>
              <td style="max-width:200px">
                <div class="products-cell">
                  <span v-for="(item, i) in sale.items" :key="i" class="product-chip">{{ item.name }} ×{{ item.qty }}</span>
                </div>
              </td>
              <td class="fw-bold">{{ formatCurrency(sale.total) }}</td>
              <td class="text-success">{{ formatCurrency(sale.paid) }}</td>
              <td>
                <span class="badge badge-secondary">{{ sale.paymentMethod }}</span>
              </td>
              <td>
                <span :class="sale.status === 'pagada' ? 'badge badge-success' : 'badge badge-warning'">
                  {{ sale.status === 'pagada' ? 'Pagada' : 'Pendiente' }}
                </span>
              </td>
              <td>
                <button class="btn-icon" @click.stop="viewSale(sale)"><Eye :size="15" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Mobile Cards (visible < 768px) -->
    <div class="mobile-cards">
      <div v-if="filteredSales.length === 0" class="card">
        <div class="empty-state">
          <div class="empty-state-icon"><ClipboardList :size="40" /></div>
          <div class="empty-state-text">No se encontraron ventas</div>
        </div>
      </div>
      <div
        v-for="sale in filteredSales"
        :key="sale.id"
        class="sale-card card"
        @click="viewSale(sale)"
      >
        <div class="sc-header">
          <span class="sc-id text-accent fw-600">#{{ sale.id }}</span>
          <span :class="sale.status === 'pagada' ? 'badge badge-success' : 'badge badge-warning'">
            {{ sale.status === 'pagada' ? 'Pagada' : 'Pendiente' }}
          </span>
        </div>
        <div class="sc-client fw-600">{{ sale.clientName }}</div>
        <div class="sc-date text-muted">{{ formatDate(sale.date) }}</div>
        <div class="products-cell" style="margin:6px 0">
          <span v-for="(item, i) in sale.items" :key="i" class="product-chip">{{ item.name }} ×{{ item.qty }}</span>
        </div>
        <div class="sc-footer">
          <div class="sc-money">
            <span class="sc-money-label text-muted">Total</span>
            <span class="sc-money-value fw-bold">{{ formatCurrency(sale.total) }}</span>
          </div>
          <div class="sc-money">
            <span class="sc-money-label text-muted">Pagado</span>
            <span class="sc-money-value text-success">{{ formatCurrency(sale.paid) }}</span>
          </div>
          <div class="sc-money">
            <span class="sc-money-label text-muted">Método</span>
            <span class="sc-money-value">
              <span class="badge badge-secondary" style="font-size:11px">{{ sale.paymentMethod }}</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Sale Detail Modal -->
    <div v-if="selectedSale" class="modal-overlay" @click.self="selectedSale = null">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title"><Receipt :size="20" /> Venta #{{ selectedSale.id }}</h3>
          <button class="modal-close" @click="selectedSale = null"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="sale-detail-grid">
            <div class="sd-item">
              <span class="sd-label">Cliente</span>
              <span class="sd-value fw-600">{{ selectedSale.clientName }}</span>
            </div>
            <div class="sd-item">
              <span class="sd-label">Fecha de venta</span>
              <span class="sd-value">{{ formatDate(selectedSale.date) }}</span>
            </div>
            <div class="sd-item">
              <span class="sd-label">Método de pago</span>
              <span class="sd-value">{{ selectedSale.paymentMethod }}</span>
            </div>
            <div class="sd-item">
              <span class="sd-label">Estado</span>
              <span :class="selectedSale.status === 'pagada' ? 'badge badge-success' : 'badge badge-warning'">{{ selectedSale.status }}</span>
            </div>
            <div v-if="selectedSale.updatedAt" class="sd-item" style="grid-column:1/-1; background:rgba(216,235,52,0.06); border:1px solid rgba(216,235,52,0.2)">
              <span class="sd-label">✏️ Última modificación</span>
              <span class="sd-value fw-600" style="color:var(--accent)">{{ formatDate(selectedSale.updatedAt) }}</span>
            </div>
          </div>
          <hr class="divider" />
          <h4 style="margin-bottom:12px; font-family:var(--font-brand)">Productos</h4>
          <div class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, i) in selectedSale.items" :key="i">
                  <td>{{ item.name }}</td>
                  <td>{{ item.qty }}</td>
                  <td>{{ formatCurrency(item.price) }}</td>
                  <td class="fw-600 text-success">{{ formatCurrency(item.subtotal) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <hr class="divider" />
          <div class="sale-totals">
            <div class="st-row">
              <span class="text-secondary">Total de la venta</span>
              <span class="fw-bold" style="font-size:20px">{{ formatCurrency(selectedSale.total) }}</span>
            </div>
            <div class="st-row">
              <span class="text-secondary">Valor pagado</span>
              <span class="text-success fw-600">{{ formatCurrency(selectedSale.paid) }}</span>
            </div>
            <div v-if="selectedSale.total > selectedSale.paid" class="st-row">
              <span class="text-secondary">Saldo pendiente</span>
              <span class="text-danger fw-600">{{ formatCurrency(selectedSale.total - selectedSale.paid) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, formatDate } from '../utils/calculations.js'
import { ClipboardList, Search, Eye, Receipt, X } from '@lucide/vue'

const searchQuery = ref('')
const filterMethod = ref('')
const filterStatus = ref('')
const filterDate = ref('')
const selectedSale = ref(null)

const methods = ['Efectivo', 'Transferencia', 'Nequi', 'Daviplata', 'Tarjeta', 'Crédito']

const filteredSales = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return [...store.sales]
    .filter(s => {
      const matchSearch = !q ||
        s.clientName.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        s.items.some(i => i.name.toLowerCase().includes(q))
      const matchMethod = !filterMethod.value || s.paymentMethod === filterMethod.value
      const matchStatus = !filterStatus.value || s.status === filterStatus.value
      const matchDate = !filterDate.value || s.date.startsWith(filterDate.value)
      return matchSearch && matchMethod && matchStatus && matchDate
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
})

const viewSale = (sale) => { selectedSale.value = sale }
</script>

<style scoped>
.header-stats { display: flex; gap: 12px; flex-wrap: wrap; }
.hs-badge {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-secondary);
}
.updated-badge {
  font-size: 10px;
  color: var(--accent);
  background: rgba(216,235,52,0.08);
  border: 1px solid rgba(216,235,52,0.2);
  border-radius: 4px;
  padding: 2px 5px;
  white-space: nowrap;
}

/* Filters */
.filters-grid {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}
.filters-grid .search-bar { min-width: 0; }

/* Desktop only table */
.desktop-table { display: block; }
.mobile-cards { display: none; }

.products-cell { display: flex; flex-wrap: wrap; gap: 4px; }
.product-chip {
  background: var(--bg-secondary);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.sale-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.sd-item { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 12px; }
.sd-label { display: block; font-size: 11px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
.sd-value { font-size: 14px; }

.sale-totals { display: flex; flex-direction: column; gap: 8px; }
.st-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }

/* Mobile sale card */
.sale-card {
  cursor: pointer;
  transition: var(--transition);
}
.sale-card:hover { transform: translateY(-2px); border-color: rgba(216, 235, 52, 0.35); }

.sc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.sc-id { font-size: 13px; }
.sc-client { font-size: 15px; margin-bottom: 2px; }
.sc-date { font-size: 12px; margin-bottom: 2px; }

.sc-footer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}
.sc-money { display: flex; flex-direction: column; align-items: center; text-align: center; }
.sc-money-label { font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
.sc-money-value { font-family: var(--font-brand); font-size: 13px; font-weight: 700; }

/* Responsive */
@media (max-width: 900px) {
  .filters-grid {
    grid-template-columns: 1fr 1fr;
  }
  .filters-grid .search-bar {
    grid-column: 1 / -1;
  }
}

@media (max-width: 768px) {
  .desktop-table { display: none; }
  .mobile-cards { display: flex; flex-direction: column; gap: 12px; }

  .header-stats { gap: 8px; }
  .hs-badge { padding: 6px 10px; font-size: 12px; }

  .sale-detail-grid { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .filters-grid {
    grid-template-columns: 1fr;
  }
  .filters-grid .search-bar { grid-column: 1; }
}
</style>
