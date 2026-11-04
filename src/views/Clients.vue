<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><Users :size="24" /> Clientes</h1>
        <p class="page-subtitle">{{ formatNumber(store.clients.length) }} clientes registrados</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal"><Plus :size="16" /> Nuevo Cliente</button>
    </div>

    <div class="filter-row">
      <div class="search-bar">
        <Search :size="16" class="search-icon" />
        <input v-model="searchQuery" placeholder="Buscar por documento, nombre o teléfono..." />
      </div>
    </div>

    <div class="clients-grid">
      <div v-if="filteredClients.length === 0" class="card" style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-state-icon"><Users :size="40" /></div>
          <div class="empty-state-text">No se encontraron clientes</div>
        </div>
      </div>
      <div v-for="client in filteredClients" :key="client.id" class="client-card card">
        <div class="client-header">
          <div class="client-avatar">{{ initials(client.name) }}</div>
          <div class="client-info">
            <div class="client-name">{{ client.name }}</div>
            <div v-if="client.document" class="client-doc text-accent">CC: {{ client.document }}</div>
            <div class="client-phone-sub text-muted">{{ client.phone || 'Sin teléfono' }}</div>
          </div>
          <div class="client-actions">
            <button class="btn-icon" @click="openEditModal(client)" title="Editar"><Pencil :size="15" /></button>
            <button class="btn-icon" @click="viewHistory(client)" title="Ver historial"><ClipboardList :size="15" /></button>
            <button class="btn-icon btn-icon-danger" @click="confirmDelete(client)" title="Eliminar"><Trash2 :size="15" /></button>
          </div>
        </div>
        <hr class="divider" style="margin:12px 0" />
        <div class="client-details">
          <div class="cd-row" v-if="client.phone">
            <Phone :size="14" class="cd-icon" />
            <span>{{ client.phone }}</span>
          </div>
          <div class="cd-row" v-if="client.email">
            <Mail :size="14" class="cd-icon" />
            <span>{{ client.email }}</span>
          </div>
          <div class="cd-row" v-if="client.address">
            <MapPin :size="14" class="cd-icon" />
            <span>{{ client.address }}</span>
          </div>
        </div>
        <div class="client-stats">
          <div class="cs-stat">
            <span class="cs-label">Total comprado</span>
            <span class="cs-value text-success">{{ formatCurrency(client.totalBought) }}</span>
          </div>
          <div class="cs-stat">
            <span class="cs-label">Compras</span>
            <span class="cs-value">{{ formatNumber(clientSalesCount(client.id)) }}</span>
          </div>
          <div class="cs-stat">
            <span class="cs-label">Deuda</span>
            <span class="cs-value text-danger">{{ formatCurrency(clientDebt(client.id)) }}</span>
          </div>
        </div>
        <div class="client-since text-muted">Desde {{ formatDateShort(client.createdAt) }}</div>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingClient ? 'Editar Cliente' : 'Nuevo Cliente' }}</h3>
          <button class="modal-close" @click="closeModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Documento de Identidad *</label>
              <input v-model="form.document" class="form-control" placeholder="Ej: 1001234567" />
              <span v-if="errors.document" class="form-error">{{ errors.document }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Nombre completo *</label>
              <input v-model="form.name" class="form-control" placeholder="Nombre del cliente" />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input v-model="form.phone" class="form-control" placeholder="3100000000" />
            </div>
            <div class="form-group">
              <label class="form-label">Correo electrónico</label>
              <input v-model="form.email" type="email" class="form-control" placeholder="correo@email.com" />
            </div>
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input v-model="form.address" class="form-control" placeholder="Dirección del cliente" />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Notas</label>
              <textarea v-model="form.notes" class="form-control" placeholder="Notas adicionales..."></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveClient">{{ editingClient ? 'Actualizar' : 'Crear Cliente' }}</button>
        </div>
      </div>
    </div>

    <!-- History Modal -->
    <div v-if="historyClient" class="modal-overlay" @click.self="historyClient = null">
      <div class="modal modal-lg">
        <div class="modal-header">
          <h3 class="modal-title"><ClipboardList :size="18" /> Historial — {{ historyClient.name }}</h3>
          <button class="modal-close" @click="historyClient = null"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="history-summary">
            <div class="hs-stat">
              <div class="hs-label">Total comprado</div>
              <div class="hs-value text-success">{{ formatCurrency(historyClient.totalBought) }}</div>
            </div>
            <div class="hs-stat">
              <div class="hs-label">Nº de compras</div>
              <div class="hs-value">{{ formatNumber(clientSales.length) }}</div>
            </div>
            <div class="hs-stat">
              <div class="hs-label">Deuda activa</div>
              <div class="hs-value text-danger">{{ formatCurrency(clientDebt(historyClient.id)) }}</div>
            </div>
          </div>
          <div v-if="clientSales.length === 0" class="empty-state">
            <div class="empty-state-icon"><ShoppingCart :size="40" /></div>
            <div class="empty-state-text">Sin compras registradas</div>
          </div>
          <div v-else class="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Venta #</th>
                  <th>Fecha</th>
                  <th>Productos</th>
                  <th>Total</th>
                  <th>Método</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="sale in clientSales" :key="sale.id">
                  <td class="text-accent fw-600">#{{ sale.id }}</td>
                  <td class="text-muted">{{ formatDate(sale.date) }}</td>
                  <td>{{ sale.items.map(i => i.name).join(', ') }}</td>
                  <td class="fw-600">{{ formatCurrency(sale.total) }}</td>
                  <td>{{ sale.paymentMethod }}</td>
                  <td><span :class="sale.status === 'pagada' ? 'badge badge-success' : 'badge badge-warning'">{{ sale.status }}</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal" style="max-width:400px">
        <div class="modal-body" style="text-align:center; padding:40px 24px">
          <div style="display:flex;justify-content:center;margin-bottom:16px"><Trash2 :size="48" class="text-danger" /></div>
          <h3 class="modal-title" style="margin-bottom:8px">Eliminar cliente</h3>
          <p class="text-secondary">¿Eliminar a <strong>{{ deleteTarget.name }}</strong>?</p>
          <p v-if="clientDebt(deleteTarget.id) > 0" class="text-danger" style="margin-top:10px; font-size:13px; font-weight:600">
            <AlertTriangle :size="14" style="vertical-align:middle" /> Advertencia: Este cliente tiene una deuda pendiente de {{ formatCurrency(clientDebt(deleteTarget.id)) }}.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="deleteTarget = null">Cancelar</button>
          <button class="btn btn-danger" @click="doDelete">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, formatDate, formatDateShort, formatNumber } from '../utils/calculations.js'
import { Users, Plus, Search, Pencil, ClipboardList, Trash2, Phone, Mail, MapPin, ShoppingCart, AlertTriangle, X } from '@lucide/vue'

const searchQuery = ref('')
const showModal = ref(false)
const editingClient = ref(null)
const deleteTarget = ref(null)
const historyClient = ref(null)

const emptyForm = () => ({ document: '', name: '', phone: '', address: '', email: '', notes: '' })
const form = reactive(emptyForm())
const errors = reactive({})

const filteredClients = computed(() => {
  const q = searchQuery.value.toLowerCase()
  if (!q) return store.clients
  return store.clients.filter(c =>
    c.name.toLowerCase().includes(q) ||
    (c.document || '').toLowerCase().includes(q) ||
    (c.phone || '').includes(q)
  )
})

const clientSales = computed(() => historyClient.value ? store.getClientSales(historyClient.value.id) : [])

const initials = (name) => name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

const clientSalesCount = (id) => store.sales.filter(s => s.clientId === id).length
const clientDebt = (id) => store.debts.filter(d => d.clientId === id && d.status !== 'pagada').reduce((s, d) => s + d.balance, 0)

function openAddModal() {
  editingClient.value = null
  Object.assign(form, emptyForm())
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}
function openEditModal(client) {
  editingClient.value = client
  Object.assign(form, { ...client })
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}
function closeModal() { showModal.value = false; editingClient.value = null }

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.document.trim()) errors.document = 'El documento es requerido'
  if (!form.name.trim()) errors.name = 'El nombre es requerido'
  // Check unique document
  if (form.document.trim()) {
    const existing = store.clients.find(c => c.document === form.document.trim())
    if (existing && (!editingClient.value || existing.id !== editingClient.value.id)) {
      errors.document = `Ya existe un cliente con este documento: ${existing.name}`
    }
  }
  return Object.keys(errors).length === 0
}

function saveClient() {
  if (!validate()) return
  if (editingClient.value) store.updateClient(editingClient.value.id, { ...form })
  else store.addClient({ ...form })
  closeModal()
}

function viewHistory(client) { historyClient.value = client }
function confirmDelete(client) { deleteTarget.value = client }
function doDelete() { store.deleteClient(deleteTarget.value.id); deleteTarget.value = null }
</script>

<style scoped>
.clients-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }

.client-card { transition: var(--transition); }
.client-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }

.client-header { display: flex; align-items: center; gap: 12px; }
.client-avatar {
  width: 46px; height: 46px;
  background: linear-gradient(135deg, var(--accent), #ff6030);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--font-brand); font-size: 16px; font-weight: 700; color: white;
  flex-shrink: 0;
}
.client-info { flex: 1; min-width: 0; }
.client-name { font-size: 15px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.client-doc { font-size: 12px; font-weight: 700; }
.client-actions { display: flex; gap: 4px; }

.client-details { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.cd-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.cd-icon { font-size: 14px; }

.client-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.cs-stat { background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 8px; text-align: center; }
.cs-label { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2px; }
.cs-value { font-family: var(--font-brand); font-size: 14px; font-weight: 700; }
.client-since { font-size: 11px; }

.history-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
.hs-stat { background: var(--bg-secondary); border-radius: var(--radius-md); padding: 14px; text-align: center; }
.hs-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
.hs-value { font-family: var(--font-brand); font-size: 20px; font-weight: 700; }

/* Responsive */
@media (max-width: 600px) {
  .clients-grid { grid-template-columns: 1fr; }
  .client-stats { grid-template-columns: 1fr 1fr; }
  .history-summary { grid-template-columns: 1fr; }
  .filter-row { flex-direction: column; }
  .filter-row .search-bar { width: 100%; }
  .page-header .btn { width: 100%; justify-content: center; }
}
</style>
