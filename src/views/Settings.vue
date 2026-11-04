<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><SettingsIcon :size="24" /> Configuración</h1>
        <p class="page-subtitle">Personaliza el sistema Trueno 219</p>
      </div>
    </div>

    <div class="settings-grid">
      <!-- General Settings -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px; display:flex; align-items:center; gap:8px">
          <Store :size="20" /> Configuración General
        </h3>
        <div class="form-group">
          <label class="form-label">Nombre de la tienda</label>
          <input v-model="cfg.storeName" class="form-control" placeholder="Trueno 219" />
        </div>
        <div class="form-group">
          <label class="form-label">Umbral de stock bajo (unidades)</label>
          <input v-model.number="cfg.lowStockThreshold" type="number" min="1" max="50" class="form-control" />
          <span class="form-hint">Productos con stock igual o menor a este valor se marcarán como stock bajo</span>
        </div>
        <div class="form-group">
          <label class="form-label">Moneda</label>
          <select v-model="cfg.currency" class="form-control">
            <option value="COP">COP — Peso Colombiano</option>
            <option value="USD">USD — Dólar</option>
            <option value="EUR">EUR — Euro</option>
          </select>
        </div>
        <button class="btn btn-primary" @click="saveConfig">
          <Save :size="16" /> Guardar Configuración
        </button>
      </div>

      <!-- Data Summary -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px; display:flex; align-items:center; gap:8px">
          <BarChart3 :size="20" /> Resumen de Datos
        </h3>
        <div class="data-summary">
          <div class="ds-item">
            <span class="ds-icon"><Package :size="20" /></span>
            <div>
              <div class="ds-label">Productos</div>
              <div class="ds-value">{{ store.products.length }}</div>
            </div>
          </div>
          <div class="ds-item">
            <span class="ds-icon"><Users :size="20" /></span>
            <div>
              <div class="ds-label">Clientes</div>
              <div class="ds-value">{{ store.clients.length }}</div>
            </div>
          </div>
          <div class="ds-item">
            <span class="ds-icon"><ShoppingCart :size="20" /></span>
            <div>
              <div class="ds-label">Ventas totales</div>
              <div class="ds-value">{{ store.sales.length }}</div>
            </div>
          </div>
          <div class="ds-item">
            <span class="ds-icon"><Wallet :size="20" /></span>
            <div>
              <div class="ds-label">Deudas activas</div>
              <div class="ds-value">{{ store.debts.filter(d => d.status !== 'pagada').length }}</div>
            </div>
          </div>
          <div class="ds-item">
            <span class="ds-icon"><Banknote :size="20" /></span>
            <div>
              <div class="ds-label">Total en ventas</div>
              <div class="ds-value text-success">{{ formatCurrency(totalRevenue) }}</div>
            </div>
          </div>
          <div class="ds-item">
            <span class="ds-icon"><AlertTriangle :size="20" /></span>
            <div>
              <div class="ds-label">Por cobrar</div>
              <div class="ds-value text-danger">{{ formatCurrency(store.totalPendingDebt) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Export / Import -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:20px; display:flex; align-items:center; gap:8px">
          <Database :size="20" /> Exportar / Importar Datos
        </h3>
        <p class="text-secondary" style="margin-bottom:16px; font-size:14px">Exporta todos los datos del sistema como un archivo JSON de respaldo.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap">
          <button class="btn btn-primary" @click="exportData">
            <Upload :size="16" /> Exportar Datos
          </button>
          <label class="btn btn-secondary" style="cursor:pointer; display:inline-flex; align-items:center; gap:6px">
            <Download :size="16" /> Importar Datos
            <input type="file" accept=".json" @change="importData" style="display:none" />
          </label>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="card danger-card">
        <h3 class="card-title text-danger" style="margin-bottom:16px; display:flex; align-items:center; gap:8px">
          <AlertTriangle :size="20" /> Zona de Peligro
        </h3>
        <p class="text-secondary" style="font-size:14px; margin-bottom:16px">
          Estas acciones son irreversibles. Úsalas con precaución.
        </p>
        <div style="display:flex; gap:12px; flex-wrap:wrap">
          <button class="btn btn-danger btn-sm" @click="confirmReset('sales')">
            <Trash2 :size="15" /> Borrar ventas
          </button>
          <button class="btn btn-danger btn-sm" @click="confirmReset('all')">
            <RotateCcw :size="15" /> Reiniciar todo
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm Reset Modal -->
    <div v-if="resetTarget" class="modal-overlay" @click.self="resetTarget = null">
      <div class="modal" style="max-width:400px">
        <div class="modal-body" style="text-align:center; padding:40px 24px">
          <div style="display:flex; justify-content:center; margin-bottom:16px; color:var(--danger)">
            <AlertTriangle :size="48" />
          </div>
          <h3 class="modal-title" style="margin-bottom:8px; color:var(--danger)">¿Estás seguro?</h3>
          <p class="text-secondary">
            {{ resetTarget === 'all' ? 'Esto eliminará TODOS los datos del sistema.' : 'Esto eliminará todas las ventas y deudas.' }}
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="resetTarget = null">Cancelar</button>
          <button class="btn btn-danger" @click="doReset">Sí, eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import store from '../stores/store.js'
import { formatCurrency } from '../utils/calculations.js'
import {
  Settings as SettingsIcon, Store, Save, BarChart3, Package, Users,
  ShoppingCart, Wallet, Banknote, AlertTriangle, Database, Upload,
  Download, Trash2, RotateCcw
} from '@lucide/vue'

const cfg = reactive({ ...store.config })
const resetTarget = ref(null)

const totalRevenue = computed(() => store.sales.reduce((s, v) => s + v.total, 0))

function saveConfig() {
  store.updateConfig({ ...cfg })
}

function exportData() {
  const data = {
    products: store.products,
    clients: store.clients,
    sales: store.sales,
    debts: store.debts,
    config: store.config,
    exportedAt: new Date().toISOString(),
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trueno219-backup-${new Date().toISOString().split('T')[0]}.json`
  a.click()
  URL.revokeObjectURL(url)
  store.notify('Datos exportados correctamente', 'success')
}

function importData(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result)
      if (Array.isArray(data.products)) { store.products.splice(0); store.products.push(...data.products); store.saveProducts() }
      if (Array.isArray(data.clients)) { store.clients.splice(0); store.clients.push(...data.clients); store.saveClients() }
      if (Array.isArray(data.sales)) { store.sales.splice(0); store.sales.push(...data.sales); store.saveSales() }
      if (Array.isArray(data.debts)) { store.debts.splice(0); store.debts.push(...data.debts); store.saveDebts() }
      if (data.config && typeof data.config === 'object') {
        store.updateConfig(data.config)
        Object.assign(cfg, store.config)
      }
      store.notify('Datos importados correctamente', 'success')
    } catch {
      store.notify('Error al importar el archivo JSON', 'danger')
    } finally {
      e.target.value = ''
    }
  }
  reader.readAsText(file)
}

function confirmReset(type) { resetTarget.value = type }
function doReset() {
  if (resetTarget.value === 'all') {
    localStorage.clear()
    window.location.reload()
  } else if (resetTarget.value === 'sales') {
    store.sales.splice(0)
    store.debts.splice(0)
    store.clients.forEach(c => { c.totalBought = 0 })
    store.saveSales()
    store.saveDebts()
    store.saveClients()
    store.notify('Ventas y deudas eliminadas', 'info')
  }
  resetTarget.value = null
}
</script>

<style scoped>
.settings-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
@media (max-width: 768px) { .settings-grid { grid-template-columns: 1fr; } }

.form-hint { font-size: 12px; color: var(--text-muted); margin-top: 4px; display: block; }

.data-summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.ds-item { display: flex; align-items: center; gap: 12px; background: var(--bg-secondary); border-radius: var(--radius-md); padding: 12px; }
.ds-icon { font-size: 22px; }
.ds-label { font-size: 12px; color: var(--text-muted); }
.ds-value { font-family: var(--font-brand); font-size: 18px; font-weight: 700; }

.danger-card { border-color: rgba(255, 59, 92, 0.3); background: rgba(255, 59, 92, 0.03); }

/* Responsive */
@media (max-width: 480px) {
  .data-summary { grid-template-columns: 1fr; }
  .settings-grid { gap: 16px; }
}
</style>
