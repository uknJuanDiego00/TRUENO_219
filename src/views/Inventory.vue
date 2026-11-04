<template>
  <div class="page-container">
    <div class="page-header">
      <div>
        <h1 class="page-title"><Package :size="24" /> Inventario</h1>
        <p class="page-subtitle">{{ store.products.length }} productos y accesorios registrados</p>
      </div>
      <button class="btn btn-primary" @click="openAddModal"><Plus :size="16" /> Agregar Producto / Accesorio</button>
    </div>

    <!-- Filters -->
    <div class="inv-filters">
      <div class="search-bar inv-search">
        <Search :size="16" class="search-icon" />
        <input v-model="searchQuery" placeholder="Buscar por nombre, SKU o categoría..." />
      </div>
      <select class="form-control inv-select" v-model="filterCategory">
        <option value="">Todas las categorías</option>
        <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
      </select>
      <select class="form-control inv-select" v-model="filterStatus">
        <option value="">Todos los estados</option>
        <option value="store_available">En Tienda (Disp. > 0)</option>
        <option value="warehouse_has">En Bodega (> 0)</option>
        <option value="store_low">Stock bajo en tienda</option>
        <option value="warehouse_only">Solo en bodega (0 en tienda)</option>
        <option value="out_all">Agotado total (0 tienda y 0 bodega)</option>
      </select>
    </div>

    <!-- Stats row -->
    <div class="inv-stats">
      <div class="inv-stat">
        <span class="inv-stat-icon"><Package :size="20" /></span>
        <div>
          <div class="inv-stat-val">{{ store.products.length }}</div>
          <div class="inv-stat-lbl">Productos</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-success"><Store :size="20" /></span>
        <div>
          <div class="inv-stat-val text-success">{{ formatNumber(store.totalStoreStock) }}</div>
          <div class="inv-stat-lbl">En Tienda (Disp.)</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-accent"><Warehouse :size="20" /></span>
        <div>
          <div class="inv-stat-val text-accent">{{ formatNumber(store.totalWarehouseStock) }}</div>
          <div class="inv-stat-lbl">En Bodega</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-warning"><AlertTriangle :size="20" /></span>
        <div>
          <div class="inv-stat-val text-warning">{{ store.lowStockProducts.length }}</div>
          <div class="inv-stat-lbl">Bajo en tienda</div>
        </div>
      </div>
      <div class="inv-stat">
        <span class="inv-stat-icon text-danger"><XCircle :size="20" /></span>
        <div>
          <div class="inv-stat-val text-danger">{{ store.outOfAllStockProducts.length }}</div>
          <div class="inv-stat-lbl">Agotados</div>
        </div>
      </div>
    </div>

    <!-- Table -->
    <div class="card" style="padding:0; overflow:hidden;">
      <div class="table-wrapper" style="border:none;">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio Venta</th>
              <th>Precio Compra</th>
              <th style="min-width: 250px;">Stock (Tienda / Bodega)</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="filteredProducts.length === 0">
              <td colspan="7">
                <div class="empty-state">
                  <div class="empty-state-icon"><Package :size="40" /></div>
                  <div class="empty-state-text">No se encontraron productos</div>
                </div>
              </td>
            </tr>
            <tr v-for="product in filteredProducts" :key="product.id">
              <td>
                <div class="prod-cell">
                  <div class="prod-image-thumb" :style="product.image ? `background-image:url(${product.image})` : ''">
                    <span v-if="!product.image">{{ product.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <div class="prod-name">{{ product.name }}</div>
                    <div class="prod-sku text-muted">{{ product.sku || 'Sin SKU' }}</div>
                    <!-- Quick location label hint -->
                    <div class="prod-location-summary">
                      <span class="loc-summary-item text-success">
                        <Store :size="11" /> {{ product.stock }} disp.
                      </span>
                      <span class="loc-summary-sep">•</span>
                      <span class="loc-summary-item text-accent">
                        <Warehouse :size="11" /> {{ product.warehouseStock || 0 }} bodega
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-secondary">{{ product.category }}</span></td>
              <td class="fw-600 text-success">{{ formatCurrency(product.sellPrice) }}</td>
              <td class="text-muted">{{ formatCurrency(product.buyPrice) }}</td>
              <td>
                <!-- Stock Controls (Tienda / Bodega & Traslados) -->
                <div class="stock-cell-vertical">
                  <!-- Tienda -->
                  <div class="stock-loc-badge store-badge-row">
                    <span class="stock-loc-label" title="Disponibles en tienda para venta">
                      <Store :size="12" /> Tienda:
                    </span>
                    <div class="stock-loc-controls">
                      <button class="qty-mini-btn" @click="adjustStock(product, -1)" :disabled="product.stock <= 0" title="Restar 1 en tienda">−</button>
                      <span class="stock-val-highlight" :class="product.stock <= 0 ? 'text-danger' : 'text-success'">
                        {{ formatNumber(product.stock) }} disp.
                      </span>
                      <button class="qty-mini-btn" @click="adjustStock(product, 1)" title="Sumar 1 a tienda">+</button>
                    </div>
                  </div>

                  <!-- Bodega -->
                  <div class="stock-loc-badge warehouse-badge-row">
                    <span class="stock-loc-label" title="Almacenados en bodega">
                      <Warehouse :size="12" /> Bodega:
                    </span>
                    <div class="stock-loc-controls">
                      <button class="qty-mini-btn" @click="adjustWarehouseStock(product, -1)" :disabled="(product.warehouseStock || 0) <= 0" title="Restar 1 en bodega">−</button>
                      <span class="stock-val-highlight text-accent">
                        {{ formatNumber(product.warehouseStock || 0) }} bodega
                      </span>
                      <button class="qty-mini-btn" @click="adjustWarehouseStock(product, 1)" title="Sumar 1 a bodega">+</button>
                    </div>
                  </div>

                  <!-- Traslados Rápidos -->
                  <div class="stock-transfer-bar">
                    <button
                      class="transfer-chip"
                      :disabled="(product.warehouseStock || 0) <= 0"
                      @click="transferStock(product, 'warehouse', 'store', 1)"
                      title="Pasar 1 unidad de Bodega a Tienda"
                    >
                      <ArrowUpRight :size="12" /> Bodega ➔ Tienda
                    </button>
                    <button
                      class="transfer-chip"
                      :disabled="product.stock <= 0"
                      @click="transferStock(product, 'store', 'warehouse', 1)"
                      title="Pasar 1 unidad de Tienda a Bodega"
                    >
                      <ArrowDownRight :size="12" /> Tienda ➔ Bodega
                    </button>
                    <button
                      class="transfer-chip-icon"
                      @click="openTransferModal(product)"
                      title="Abrir ventana de traslado personalizado"
                    >
                      <ArrowLeftRight :size="12" />
                    </button>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['badge', getStatus(product).badge]">
                  {{ getStatus(product).dot }} {{ getStatus(product).label }}
                </span>
                <div class="text-muted" style="font-size:11px; margin-top:4px">
                  Total: {{ (product.stock || 0) + (product.warehouseStock || 0) }} uds.
                </div>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn-icon" title="Trasladar stock" @click="openTransferModal(product)"><ArrowLeftRight :size="15" /></button>
                  <button class="btn-icon" title="Editar producto" @click="openEditModal(product)"><Pencil :size="15" /></button>
                  <button class="btn-icon btn-icon-danger" title="Eliminar" @click="confirmDelete(product)"><Trash2 :size="15" /></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">{{ editingProduct ? 'Editar Producto / Accesorio' : 'Nuevo Producto / Accesorio' }}</h3>
          <button class="modal-close" @click="closeModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Nombre del Producto / Accesorio *</label>
              <input v-model="form.name" class="form-control" placeholder="Ej: Luces LED para Moto" />
              <span v-if="errors.name" class="form-error">{{ errors.name }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Categoría *</label>
              <select v-model="form.category" class="form-control">
                <option value="">Seleccionar categoría</option>
                <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
              <span v-if="errors.category" class="form-error">{{ errors.category }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Precio de Compra *</label>
              <input v-model.number="form.buyPrice" type="number" min="0" class="form-control" placeholder="0" />
              <span v-if="errors.buyPrice" class="form-error">{{ errors.buyPrice }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">Precio de Venta *</label>
              <input v-model.number="form.sellPrice" type="number" min="0" class="form-control" placeholder="0" />
              <span v-if="errors.sellPrice" class="form-error">{{ errors.sellPrice }}</span>
            </div>
            <div class="form-group">
              <label class="form-label">SKU / Código</label>
              <input v-model="form.sku" class="form-control" placeholder="Ej: LUZ-001" />
            </div>
            <div class="form-group">
              <label class="form-label">Stock Mínimo en Tienda</label>
              <input v-model.number="form.minStock" type="number" min="0" class="form-control" placeholder="5" />
              <span class="form-hint">Avisa cuando queden pocas unidades en mostrador</span>
            </div>
          </div>

          <!-- Stock por Ubicación: Tienda vs Bodega -->
          <div class="stock-assignment-card">
            <div class="stock-card-title">
              <Boxes :size="16" /> Asignación de Ubicación de Stock
            </div>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">
                  <Store :size="14" class="text-success" /> Cantidad en Tienda (Disponibles para venta) *
                </label>
                <input v-model.number="form.stock" type="number" min="0" class="form-control" placeholder="0" />
                <span class="form-hint">Unidades listas en mostrador/vitrina para vender</span>
                <span v-if="errors.stock" class="form-error">{{ errors.stock }}</span>
              </div>
              <div class="form-group">
                <label class="form-label">
                  <Warehouse :size="14" class="text-accent" /> Cantidad en Bodega *
                </label>
                <input v-model.number="form.warehouseStock" type="number" min="0" class="form-control" placeholder="0" />
                <span class="form-hint">Unidades almacenadas en depósito o bodega</span>
                <span v-if="errors.warehouseStock" class="form-error">{{ errors.warehouseStock }}</span>
              </div>
            </div>

            <!-- Resumen de Stock Total -->
            <div class="stock-summary-badge">
              <span class="sum-text">
                Total Inventario: <strong>{{ (Number(form.stock) || 0) + (Number(form.warehouseStock) || 0) }} unidades</strong>
              </span>
              <span class="sum-detail">
                ({{ form.stock || 0 }} disponibles en tienda, {{ form.warehouseStock || 0 }} en bodega)
              </span>
            </div>
          </div>

          <div class="form-group" style="margin-top: 14px;">
            <label class="form-label">Descripción</label>
            <textarea v-model="form.description" class="form-control" placeholder="Detalles o especificaciones del producto..."></textarea>
          </div>

          <!-- Margin preview -->
          <div v-if="form.buyPrice > 0 && form.sellPrice > 0" class="margin-preview">
            <span>Margen: <strong class="text-success">{{ formatCurrency(form.sellPrice - form.buyPrice) }}</strong></span>
            <span>Margen %: <strong class="text-accent">{{ marginPct }}%</strong></span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">Cancelar</button>
          <button class="btn btn-primary" @click="saveProduct">{{ editingProduct ? 'Actualizar' : 'Agregar Producto' }}</button>
        </div>
      </div>
    </div>

    <!-- Modal Traslado de Stock (Bodega <-> Tienda) -->
    <div v-if="showTransferModal" class="modal-overlay" @click.self="closeTransferModal">
      <div class="modal" style="max-width: 490px;">
        <div class="modal-header">
          <h3 class="modal-title"><ArrowLeftRight :size="18" /> Trasladar Stock</h3>
          <button class="modal-close" @click="closeTransferModal"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="transfer-prod-card">
            <h4 class="transfer-pname">{{ transferTarget?.name }}</h4>
            <div class="transfer-cur-badges">
              <span class="badge badge-success"><Store :size="12" /> Tienda: {{ transferTarget?.stock }} disp.</span>
              <span class="badge badge-accent"><Warehouse :size="12" /> Bodega: {{ transferTarget?.warehouseStock || 0 }} bodega</span>
            </div>
          </div>

          <!-- Selector de Dirección -->
          <div class="form-group" style="margin-top:16px;">
            <label class="form-label">¿Hacia dónde deseas mover las unidades?</label>
            <div class="transfer-dir-selector">
              <button
                type="button"
                class="dir-opt-btn"
                :class="{ active: transferDirection === 'warehouse_to_store' }"
                @click="transferDirection = 'warehouse_to_store'"
              >
                <div class="dir-icon text-success"><ArrowUpRight :size="20" /></div>
                <div class="dir-content">
                  <div class="dir-name">Bodega ➔ Tienda</div>
                  <div class="dir-desc">Surtir vitrina/mostrador para vender</div>
                </div>
              </button>
              <button
                type="button"
                class="dir-opt-btn"
                :class="{ active: transferDirection === 'store_to_warehouse' }"
                @click="transferDirection = 'store_to_warehouse'"
              >
                <div class="dir-icon text-accent"><ArrowDownRight :size="20" /></div>
                <div class="dir-content">
                  <div class="dir-name">Tienda ➔ Bodega</div>
                  <div class="dir-desc">Guardar en depósito o bodega</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Cantidad a Trasladar -->
          <div class="form-group">
            <div class="transfer-qty-header">
              <label class="form-label" style="margin:0;">Cantidad a trasladar</label>
              <span class="avail-max-label">
                Disponible en origen: <strong>{{ maxTransferAvailable }} uds.</strong>
              </span>
            </div>
            <div class="transfer-stepper-box">
              <button
                type="button"
                class="qty-btn"
                @click="transferAmount = Math.max(1, transferAmount - 1)"
                :disabled="transferAmount <= 1"
              >−</button>
              <input
                v-model.number="transferAmount"
                type="number"
                min="1"
                :max="maxTransferAvailable"
                class="form-control transfer-input-number"
              />
              <button
                type="button"
                class="qty-btn"
                @click="transferAmount = Math.min(maxTransferAvailable, transferAmount + 1)"
                :disabled="transferAmount >= maxTransferAvailable"
              >+</button>
            </div>
            <!-- Atajos rápidos -->
            <div class="quick-qty-list">
              <button type="button" class="quick-chip" @click="setTransferAmount(1)" :disabled="maxTransferAvailable < 1">1</button>
              <button type="button" class="quick-chip" @click="setTransferAmount(2)" :disabled="maxTransferAvailable < 2">2</button>
              <button type="button" class="quick-chip" @click="setTransferAmount(5)" :disabled="maxTransferAvailable < 5">5</button>
              <button type="button" class="quick-chip" @click="setTransferAmount(10)" :disabled="maxTransferAvailable < 10">10</button>
              <button type="button" class="quick-chip chip-all" @click="setTransferAmount(maxTransferAvailable)" :disabled="maxTransferAvailable <= 0">
                Todo ({{ maxTransferAvailable }})
              </button>
            </div>
          </div>

          <!-- Preview de stock después de la transferencia -->
          <div class="transfer-preview-card">
            <div class="prev-heading">Resultado tras el traslado:</div>
            <div class="prev-rows">
              <div class="prev-row-item">
                <span>🏪 Tienda:</span>
                <span>
                  {{ transferTarget?.stock }} ➔
                  <strong class="text-success">{{ previewStoreStock }} disp.</strong>
                </span>
              </div>
              <div class="prev-row-item">
                <span>📦 Bodega:</span>
                <span>
                  {{ transferTarget?.warehouseStock || 0 }} ➔
                  <strong class="text-accent">{{ previewWarehouseStock }} bodega</strong>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeTransferModal">Cancelar</button>
          <button
            class="btn btn-primary"
            :disabled="maxTransferAvailable <= 0 || transferAmount <= 0"
            @click="executeTransfer"
          >
            <Check :size="16" /> Confirmar Traslado
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirm -->
    <div v-if="deleteTarget" class="modal-overlay" @click.self="deleteTarget = null">
      <div class="modal" style="max-width:400px">
        <div class="modal-body" style="text-align:center; padding:40px 24px">
          <div style="font-size:48px; margin-bottom:16px; display:flex; justify-content:center"><Trash2 :size="48" class="text-danger" /></div>
          <h3 class="modal-title" style="margin-bottom:8px">Eliminar producto</h3>
          <p class="text-secondary">¿Estás seguro de eliminar <strong>{{ deleteTarget.name }}</strong>?</p>
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
import { formatCurrency, formatNumber, getStockStatus } from '../utils/calculations.js'
import {
  Package, Plus, Search, CheckCircle, AlertTriangle, XCircle, Pencil, Trash2, X,
  Warehouse, Store, Boxes, ArrowLeftRight, ArrowUpRight, ArrowDownRight, Check
} from '@lucide/vue'

const searchQuery = ref('')
const filterCategory = ref('')
const filterStatus = ref('')
const showModal = ref(false)
const editingProduct = ref(null)
const deleteTarget = ref(null)

// Modal de Traslado
const showTransferModal = ref(false)
const transferTarget = ref(null)
const transferDirection = ref('warehouse_to_store') // 'warehouse_to_store' | 'store_to_warehouse'
const transferAmount = ref(1)

const categories = ['Accesorios', 'Luces', 'Espejos', 'Maniguetas', 'Direccionales', 'Frenos', 'Protección', 'Estética', 'Electrónica', 'Otros']

const emptyForm = () => ({
  name: '',
  category: '',
  description: '',
  buyPrice: 0,
  sellPrice: 0,
  stock: 0,
  warehouseStock: 0,
  minStock: 5,
  sku: '',
  image: null
})
const form = reactive(emptyForm())
const errors = reactive({})

const marginPct = computed(() => {
  const sell = Number(form.sellPrice) || 0
  const buy = Number(form.buyPrice) || 0
  if (sell <= 0) return 0
  return Math.round(((sell - buy) / sell) * 100)
})

const filteredProducts = computed(() => {
  const q = searchQuery.value.toLowerCase()
  const threshold = store.config.lowStockThreshold
  return store.products.filter(p => {
    const sStock = Number(p.stock) || 0
    const wStock = Number(p.warehouseStock) || 0
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || p.category.toLowerCase().includes(q)
    const matchCat = !filterCategory.value || p.category === filterCategory.value
    let matchStatus = true

    if (filterStatus.value === 'store_available') matchStatus = sStock > 0
    if (filterStatus.value === 'warehouse_has') matchStatus = wStock > 0
    if (filterStatus.value === 'store_low') matchStatus = sStock > 0 && sStock <= (p.minStock || threshold)
    if (filterStatus.value === 'warehouse_only') matchStatus = sStock <= 0 && wStock > 0
    if (filterStatus.value === 'out_all') matchStatus = sStock <= 0 && wStock <= 0

    return matchSearch && matchCat && matchStatus
  })
})

const getStatus = (p) => getStockStatus(p, store.config.lowStockThreshold)

// Ajustes directos de stock
function adjustStock(product, delta) {
  if (!store.adjustStock(product.id, delta)) {
    store.notify('No se puede reducir más el stock de tienda', 'warning')
  }
}

function adjustWarehouseStock(product, delta) {
  if (!store.adjustWarehouseStock(product.id, delta)) {
    store.notify('No se puede reducir más el stock de bodega', 'warning')
  }
}

// Traslado rápido de 1 unidad
function transferStock(product, from, to, qty = 1) {
  store.transferStock(product.id, from, to, qty)
}

// Modal de traslado personalizado
function openTransferModal(product) {
  transferTarget.value = product
  transferDirection.value = (product.warehouseStock || 0) > 0 ? 'warehouse_to_store' : 'store_to_warehouse'
  const max = transferDirection.value === 'warehouse_to_store' ? (product.warehouseStock || 0) : (product.stock || 0)
  transferAmount.value = max > 0 ? 1 : 0
  showTransferModal.value = true
}

function closeTransferModal() {
  showTransferModal.value = false
  transferTarget.value = null
}

const maxTransferAvailable = computed(() => {
  if (!transferTarget.value) return 0
  if (transferDirection.value === 'warehouse_to_store') {
    return Math.max(0, Number(transferTarget.value.warehouseStock) || 0)
  } else {
    return Math.max(0, Number(transferTarget.value.stock) || 0)
  }
})

function setTransferAmount(val) {
  transferAmount.value = Math.max(1, Math.min(maxTransferAvailable.value, val))
}

const previewStoreStock = computed(() => {
  if (!transferTarget.value) return 0
  const cur = Number(transferTarget.value.stock) || 0
  const qty = Number(transferAmount.value) || 0
  return transferDirection.value === 'warehouse_to_store' ? cur + qty : Math.max(0, cur - qty)
})

const previewWarehouseStock = computed(() => {
  if (!transferTarget.value) return 0
  const cur = Number(transferTarget.value.warehouseStock) || 0
  const qty = Number(transferAmount.value) || 0
  return transferDirection.value === 'warehouse_to_store' ? Math.max(0, cur - qty) : cur + qty
})

function executeTransfer() {
  if (!transferTarget.value || transferAmount.value <= 0) return
  const from = transferDirection.value === 'warehouse_to_store' ? 'warehouse' : 'store'
  const to = transferDirection.value === 'warehouse_to_store' ? 'store' : 'warehouse'
  if (store.transferStock(transferTarget.value.id, from, to, transferAmount.value)) {
    closeTransferModal()
  }
}

// Modal de agregar / editar producto
function openAddModal() {
  editingProduct.value = null
  Object.assign(form, emptyForm())
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}

function openEditModal(product) {
  editingProduct.value = product
  Object.assign(form, {
    ...product,
    stock: Number(product.stock) || 0,
    warehouseStock: Number(product.warehouseStock) || 0,
  })
  Object.keys(errors).forEach(k => delete errors[k])
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingProduct.value = null
}

function validate() {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.name || !form.name.trim()) errors.name = 'El nombre es requerido'
  if (!form.category) errors.category = 'La categoría es requerida'
  if (form.buyPrice < 0 || isNaN(form.buyPrice)) errors.buyPrice = 'El precio de compra no puede ser negativo'
  if (form.sellPrice <= 0 || isNaN(form.sellPrice)) errors.sellPrice = 'El precio de venta debe ser mayor a 0'
  if (form.stock < 0 || isNaN(form.stock)) errors.stock = 'El stock en tienda no puede ser negativo'
  if (form.warehouseStock < 0 || isNaN(form.warehouseStock)) errors.warehouseStock = 'El stock en bodega no puede ser negativo'
  return Object.keys(errors).length === 0
}

function saveProduct() {
  if (!validate()) return
  if (editingProduct.value) {
    store.updateProduct(editingProduct.value.id, { ...form })
  } else {
    store.addProduct({ ...form })
  }
  closeModal()
}

function confirmDelete(product) { deleteTarget.value = product }
function doDelete() {
  store.deleteProduct(deleteTarget.value.id)
  deleteTarget.value = null
}
</script>

<style scoped>
/* Filters */
.inv-filters {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  margin-bottom: 20px;
  align-items: center;
}
.inv-search { min-width: 0; }
.inv-select { width: auto; min-width: 170px; }

.inv-stats {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}
.inv-stat {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  flex: 1;
  min-width: 110px;
}
.inv-stat-icon { font-size: 22px; }
.inv-stat-val { font-family: var(--font-brand); font-size: 20px; font-weight: 700; }
.inv-stat-lbl { font-size: 11px; color: var(--text-muted); text-transform: uppercase; }

/* Product cell */
.prod-cell { display: flex; align-items: center; gap: 10px; }
.prod-image-thumb {
  width: 40px; height: 40px;
  border-radius: var(--radius-sm);
  background: var(--bg-secondary);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; color: var(--accent);
  background-size: cover; background-position: center;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
}
.prod-name { font-size: 14px; font-weight: 600; }
.prod-sku { font-size: 11px; }
.prod-location-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 11px;
}
.loc-summary-item {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-weight: 600;
}
.loc-summary-sep { color: var(--text-muted); opacity: 0.5; }

/* Stock Cell Vertical Controls */
.stock-cell-vertical {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 230px;
}

.stock-loc-badge {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  font-size: 12px;
}

.store-badge-row {
  border-left: 3px solid #22c55e;
}
.warehouse-badge-row {
  border-left: 3px solid #ff4500;
}

.stock-loc-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: var(--text-secondary);
}

.stock-loc-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.qty-mini-btn {
  width: 22px;
  height: 22px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background: var(--bg-card);
  color: var(--text-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
}
.qty-mini-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.qty-mini-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.stock-val-highlight {
  font-family: var(--font-brand);
  font-weight: 700;
  min-width: 50px;
  text-align: center;
  font-size: 13px;
}

/* Quick transfer chips bar */
.stock-transfer-bar {
  display: flex;
  gap: 4px;
  align-items: center;
}

.transfer-chip {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 11px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}
.transfer-chip:hover:not(:disabled) {
  background: rgba(255, 69, 0, 0.15);
  color: var(--text-primary);
  border-color: rgba(255, 69, 0, 0.4);
}
.transfer-chip:disabled {
  opacity: 0.25;
  cursor: not-allowed;
}

.transfer-chip-icon {
  width: 24px;
  height: 23px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}
.transfer-chip-icon:hover {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}

.action-btns { display: flex; gap: 6px; }

/* Stock assignment card in Add/Edit modal */
.stock-assignment-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 69, 0, 0.25);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-top: 14px;
}
.stock-card-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  font-size: 13px;
  color: var(--text-primary);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}
.stock-summary-badge {
  margin-top: 12px;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}
.sum-text strong { color: var(--accent); font-size: 14px; }
.sum-detail { font-size: 12px; color: var(--text-secondary); }

/* Transfer modal styles */
.transfer-prod-card {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  border: 1px solid var(--border-color);
}
.transfer-pname {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
}
.transfer-cur-badges {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.transfer-dir-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 6px;
}
.dir-opt-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}
.dir-opt-btn:hover {
  border-color: rgba(255, 69, 0, 0.4);
}
.dir-opt-btn.active {
  border-color: var(--accent);
  background: rgba(255, 69, 0, 0.1);
}
.dir-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.dir-desc { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

.transfer-qty-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.avail-max-label { font-size: 12px; color: var(--text-secondary); }
.avail-max-label strong { color: var(--accent); }

.transfer-stepper-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 10px;
}
.transfer-input-number {
  max-width: 100px;
  text-align: center;
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
}

.quick-qty-list {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}
.quick-chip {
  padding: 4px 10px;
  font-size: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.quick-chip:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.quick-chip:disabled { opacity: 0.3; cursor: not-allowed; }
.quick-chip.chip-all { font-weight: 600; color: var(--text-primary); }

.transfer-preview-card {
  margin-top: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px 14px;
}
.prev-heading {
  font-size: 12px;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 6px;
  font-weight: 600;
}
.prev-rows {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
}
.prev-row-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.margin-preview {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 10px;
}

/* Responsive */
@media (max-width: 768px) {
  .inv-filters { grid-template-columns: 1fr 1fr; }
  .inv-search { grid-column: 1 / -1; }
  .inv-select { width: 100%; }
  .inv-stat-val { font-size: 18px; }
  .page-header { align-items: flex-start; }
  .page-header .btn { white-space: nowrap; }
  .transfer-dir-selector { grid-template-columns: 1fr; }
}

@media (max-width: 480px) {
  .inv-filters { grid-template-columns: 1fr; }
  .inv-search { grid-column: 1; }
  .inv-stats { gap: 8px; }
  .inv-stat { padding: 10px 12px; }
  .inv-stat-val { font-size: 16px; }
}
</style>
