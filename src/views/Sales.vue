<template>
  <div class="page-container">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title"><ShoppingCart :size="24" /> Nueva Venta</h1>
        <p class="page-subtitle">Modo Propietario — Selecciona productos en stock y cobra al instante</p>
      </div>
      <!-- Quick badges and Pending sales button on header for desktop -->
      <div class="header-right-actions">
        <button
          type="button"
          class="btn-pending-sales-trigger"
          :class="{ 'has-pending': store.pendingSales.length > 0 }"
          @click="showPendingModal = true"
          title="Ver ventas pendientes"
        >
          <Clock :size="17" />
          <span>Ventas pendientes</span>
          <span class="pending-count-pill" v-if="store.pendingSales.length > 0">
            {{ store.pendingSales.length }}
          </span>
        </button>

        <div v-if="cart.length > 0" class="header-cart-summary desktop-only">
          <span class="badge badge-accent">{{ totalUnits }} uds.</span>
          <span class="header-total">{{ formatCurrency(cartTotal) }}</span>
        </div>
      </div>
    </div>

    <!-- Mobile View Tabs (Only visible on small screens < 900px) -->
    <div class="mobile-view-tabs mobile-only">
      <button
        class="tab-btn"
        :class="{ active: mobileTab === 'catalog' }"
        @click="mobileTab = 'catalog'"
      >
        <Package :size="16" /> Catálogo ({{ filteredProducts.length }})
      </button>
      <button
        class="tab-btn"
        :class="{ active: mobileTab === 'cart' }"
        @click="mobileTab = 'cart'"
      >
        <ShoppingCart :size="16" /> Carrito
        <span v-if="cart.length" class="tab-badge">{{ totalUnits }}</span>
        <span v-if="cart.length" class="tab-total">{{ formatCurrency(cartTotal) }}</span>
      </button>
      <button
        class="tab-btn pending-mobile-tab"
        :class="{ 'has-pending': store.pendingSales.length > 0 }"
        @click="showPendingModal = true"
      >
        <Clock :size="16" /> Pendientes
        <span v-if="store.pendingSales.length" class="tab-badge tab-badge-warning">{{ store.pendingSales.length }}</span>
      </button>
    </div>

    <!-- Main Layout -->
    <div class="pos-layout">
      <!-- ================= COLUMNA IZQUIERDA: CATÁLOGO EN STOCK ================= -->
      <div class="pos-catalog" :class="{ 'hidden-on-mobile': mobileTab === 'cart' }">
        <!-- Toolbar: Búsqueda, Filtro categoría y Filtro en Stock -->
        <div class="catalog-toolbar">
          <div class="search-input-wrapper">
            <span class="search-icon"><Search :size="18" /></span>
            <input
              v-model="productSearch"
              type="text"
              class="pos-search-input"
              placeholder="Buscar por nombre, categoría o código..."
            />
            <button v-if="productSearch" class="clear-btn" @click="productSearch = ''"><X :size="14" /></button>
          </div>

          <div class="toolbar-controls">
            <!-- Categoría -->
            <select v-model="selectedCategory" class="form-control category-select">
              <option value="">Todas las categorías</option>
              <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>

            <!-- Switch solo en stock -->
            <label class="stock-toggle" title="Mostrar solo productos con existencias en inventario">
              <input type="checkbox" v-model="onlyInStock" />
              <span class="toggle-label">Solo en stock ({{ inStockCount }})</span>
            </label>
          </div>
        </div>

        <!-- Categorías rápidas en chips -->
        <div class="category-chips">
          <button
            class="chip-btn"
            :class="{ active: selectedCategory === '' }"
            @click="selectedCategory = ''"
          >
            Todos ({{ totalProductsCount }})
          </button>
          <button
            v-for="cat in availableCategories"
            :key="cat"
            class="chip-btn"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = selectedCategory === cat ? '' : cat"
          >
            {{ cat }} ({{ categoryCount(cat) }})
          </button>
        </div>

        <!-- Grid de Productos -->
        <div v-if="filteredProducts.length === 0" class="empty-catalog card">
          <div class="empty-icon"><Package :size="40" /></div>
          <h3>No se encontraron productos</h3>
          <p class="text-secondary">Prueba cambiando los filtros o la búsqueda</p>
          <button v-if="onlyInStock" class="btn btn-secondary btn-sm" @click="onlyInStock = false">
            Mostrar productos sin stock
          </button>
        </div>

        <div v-else class="product-grid">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
            :class="{
              'is-in-cart': isInCart(product.id),
              'is-out-of-stock': product.stock <= 0
            }"
            @click="handleCardClick(product)"
          >
            <!-- Badge stock status: Tienda & Bodega -->
            <div class="card-top-row">
              <div class="card-stock-pill-group">
                <span
                  class="stock-badge stock-badge-store"
                  :class="product.stock <= 0 ? 'stock-empty' : product.stock <= (product.minStock || 5) ? 'stock-low' : 'stock-ok'"
                  title="Disponibles en tienda para venta"
                >
                  <Store :size="10" /> {{ formatNumber(product.stock) }} disp.
                </span>
                <span
                  class="stock-badge stock-badge-bodega"
                  :class="(product.warehouseStock || 0) <= 0 ? 'bodega-empty' : 'bodega-has'"
                  title="Unidades en bodega"
                >
                  <Warehouse :size="10" /> {{ formatNumber(product.warehouseStock || 0) }} bodega
                </span>
              </div>
              <span class="category-tag">{{ product.category }}</span>
            </div>

            <!-- Nombre y SKU -->
            <div class="card-main">
              <div class="card-avatar">{{ product.name.charAt(0).toUpperCase() }}</div>
              <div class="card-info">
                <h4 class="product-name" :title="product.name">{{ product.name }}</h4>
                <div v-if="product.sku" class="product-sku">Cód: {{ product.sku }}</div>
              </div>
            </div>

            <!-- Quick Restock button from bodega if 0 in store -->
            <div v-if="product.stock <= 0 && (product.warehouseStock || 0) > 0" class="card-bodega-restock" @click.stop>
              <span class="bodega-restock-text">Sin tienda ({{ product.warehouseStock }} en bodega)</span>
              <button class="btn-quick-pass" @click="quickPassToStore(product, 1)" title="Pasar 1 unidad de bodega a tienda">
                <ArrowUpRight :size="11" /> Pasar 1 a tienda
              </button>
            </div>

            <!-- Precio y Acción -->
            <div class="card-footer-row">
              <div class="price-container">
                <span class="price-label">Precio</span>
                <span class="product-price">{{ formatCurrency(product.sellPrice) }}</span>
              </div>

              <!-- Controles de agregación instantánea -->
              <div class="action-container" @click.stop>
                <div v-if="isInCart(product.id)" class="card-stepper">
                  <button
                    class="stepper-btn minus"
                    @click="decrementCart(product.id)"
                    title="Disminuir"
                  ><Minus :size="14" /></button>
                  <span class="stepper-qty">{{ getCartItemQty(product.id) }}</span>
                  <button
                    class="stepper-btn plus"
                    :disabled="getCartItemQty(product.id) >= product.stock"
                    @click="incrementCart(product.id)"
                    title="Aumentar"
                  ><Plus :size="14" /></button>
                </div>

                <button
                  v-else
                  class="btn-add-cart"
                  :disabled="product.stock <= 0"
                  @click="quickAddToCart(product)"
                >
                  <span class="add-icon"><Plus :size="15" /></span> Agregar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= COLUMNA DERECHA: SUMA DE PRODUCTOS Y COBRO ================= -->
      <div class="pos-ticket-col" :class="{ 'hidden-on-mobile': mobileTab === 'catalog' }">
        <div class="ticket-card card">
          <!-- Ticket Header -->
          <div class="ticket-header">
            <div class="ticket-title-row">
              <div class="ticket-title">
                <span style="display:flex; align-items:center; gap:8px"><Receipt :size="20" /> Resumen de Venta</span>
                <span v-if="cart.length" class="ticket-count-badge">{{ totalUnits }} uds.</span>
              </div>
              <button
                v-if="cart.length > 0"
                class="btn-clear-cart"
                @click="clearCart"
                title="Vaciar carrito"
              >
                Vaciar
              </button>
            </div>
            <div class="ticket-owner-tag">
              <span style="display:inline-flex; align-items:center; gap:6px"><User :size="14" /> Atendido por: Propietario</span>
              <span class="live-date">{{ currentTime }}</span>
            </div>
            <!-- Botón volver al catálogo en móviles -->
            <button
              class="btn-back-to-catalog mobile-only"
              @click="mobileTab = 'catalog'"
            >
              <ArrowLeft :size="15" /> Volver al catálogo para agregar más
            </button>

            <!-- Banner si estamos continuando una venta pendiente -->
            <div v-if="activePendingSaleId" class="active-pending-banner">
              <div class="apb-content">
                <Clock :size="15" class="text-warning" />
                <div class="apb-text">
                  <span class="apb-title">Continuando Venta <strong>#{{ activePendingSaleId }}</strong></span>
                  <span class="apb-sub">Estado: PENDIENTE</span>
                </div>
              </div>
              <button
                type="button"
                class="btn-apb-new"
                @click="promptNewSale"
                title="Dejar esta venta y comenzar otra nueva"
              >
                <Plus :size="12" /> Nueva venta
              </button>
            </div>
          </div>

          <!-- Ticket Body: Items / Suma de productos -->
          <div class="ticket-body">
            <!-- Carrito vacío -->
            <div v-if="cart.length === 0" class="ticket-empty">
              <div class="empty-cart-icon"><ShoppingCart :size="44" /></div>
              <h4>Carrito vacío</h4>
              <p class="text-secondary">Toca o haz clic en los productos del catálogo para sumarlos a la venta</p>
              <button
                v-if="mobileTab === 'cart'"
                class="btn btn-secondary btn-sm"
                @click="mobileTab = 'catalog'"
              >
                <ArrowLeft :size="14" /> Ir al catálogo
              </button>
            </div>

            <!-- Lista de productos sumados -->
            <div v-else class="ticket-items-list">
              <div
                v-for="(item, index) in cart"
                :key="item.productId"
                class="ticket-item"
              >
                <div class="item-header">
                  <div class="item-header-info">
                    <span class="item-name">{{ item.name }}</span>
                    <div class="item-stock-loc-text">
                      <span class="text-success"><Store :size="10" /> {{ getProductStock(item.productId) }} disp.</span>
                      <span class="loc-sep">•</span>
                      <span class="text-accent"><Warehouse :size="10" /> {{ getProductWarehouse(item.productId) }} bodega</span>
                    </div>
                  </div>
                  <button
                    class="item-delete-btn"
                    @click="removeFromCart(index)"
                    title="Eliminar producto"
                  ><X :size="14" /></button>
                </div>

                <div class="item-calc-row">
                  <!-- Stepper de cantidad -->
                  <div class="item-stepper">
                    <button
                      class="qty-btn"
                      @click="changeItemQty(index, -1)"
                      title="Quitar uno"
                    ><Minus :size="12" /></button>
                    <input
                      type="number"
                      class="qty-input"
                      v-model.number="item.qty"
                      min="1"
                      :max="getItemMaxStock(item.productId)"
                      @change="validateManualQty(index)"
                    />
                    <button
                      class="qty-btn"
                      :disabled="item.qty >= getItemMaxStock(item.productId)"
                      @click="changeItemQty(index, 1)"
                      title="Sumar uno"
                    ><Plus :size="12" /></button>
                  </div>

                  <!-- Cálculo: Precio x Cantidad = Subtotal -->
                  <div class="item-math">
                    <span class="unit-price">{{ formatCurrency(item.price) }} × {{ item.qty }}</span>
                    <span class="item-subtotal">{{ formatCurrency(item.subtotal) }}</span>
                  </div>
                </div>

                <!-- Aviso de stock máximo alcanzado -->
                <div
                  v-if="item.qty >= getItemMaxStock(item.productId)"
                  class="stock-warning-note"
                >
                  <div class="stock-warn-left">
                    <AlertTriangle :size="13" />
                    <span>Máximo disponible en tienda alcanzado ({{ getItemMaxStock(item.productId) }} disp.)</span>
                  </div>
                  <button
                    v-if="getProductWarehouse(item.productId) > 0"
                    type="button"
                    class="btn-inline-transfer"
                    @click="transferAndAdd(item.productId)"
                    title="Pasar 1 unidad de bodega a tienda y sumarla al carrito"
                  >
                    <ArrowUpRight :size="11" /> Pasar 1 de bodega (+1)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Ticket Footer: Suma Total, Descuento, Cobro -->
          <div v-if="cart.length > 0" class="ticket-footer">
            <!-- Panel de Cálculos / Sumas -->
            <div class="totals-panel">
              <div class="calc-row">
                <span class="calc-label">Total artículos</span>
                <span class="calc-value">{{ totalUnits }} unidades</span>
              </div>
              <div class="calc-row">
                <span class="calc-label">Subtotal</span>
                <span class="calc-value">{{ formatCurrency(cartSubtotal) }}</span>
              </div>

              <!-- Mano de obra -->
              <div class="calc-row discount-row">
                <span class="calc-label">Mano de obra ($)</span>
                <input
                  v-model.number="laborCost"
                  type="number"
                  min="0"
                  placeholder="0"
                  class="discount-input"
                />
              </div>

              <!-- Descuento opcional para el dueño -->
              <div class="calc-row discount-row">
                <span class="calc-label">Descuento ($)</span>
                <input
                  v-model.number="discountAmount"
                  type="number"
                  min="0"
                  :max="cartSubtotal + laborCost"
                  placeholder="0"
                  class="discount-input"
                />
              </div>

              <div class="calc-divider"></div>

              <div class="calc-row grand-total-row">
                <span class="grand-total-label">TOTAL A COBRAR</span>
                <span class="grand-total-value">{{ formatCurrency(cartTotal) }}</span>
              </div>
            </div>

            <!-- Selección de Cliente (Obligatorio) -->
            <div class="client-selection-section" :class="{ 'has-no-client': !selectedClientId }">
              <div class="section-label-row">
                <label class="section-label">
                  Cliente <span class="required-star">*</span>
                  <span class="badge-mandatory">Obligatorio</span>
                </label>
                <button
                  type="button"
                  class="btn-text-action"
                  @click="showQuickClientModal = true"
                >
                  <UserPlus :size="14" /> Registrar Cliente
                </button>
              </div>

              <!-- Buscador de cliente -->
              <div class="client-search-wrapper" ref="clientSearchRef">
                <div class="client-search-input-row">
                  <span class="client-search-icon"><Search :size="16" /></span>
                  <input
                    v-model="clientSearchQuery"
                    type="text"
                    class="form-control client-search-input"
                    :class="{ 'select-required-pending': !selectedClientId }"
                    placeholder="Buscar por cédula o nombre..."
                    @focus="clientDropdownOpen = true"
                    @input="clientDropdownOpen = true; selectedClientId = ''"
                    @blur="handleClientBlur"
                    autocomplete="off"
                  />
                  <button v-if="clientSearchQuery" class="clear-btn" @click="clearClientSearch"><X :size="14" /></button>
                </div>
                <div v-if="clientDropdownOpen && filteredClients.length > 0" class="client-dropdown">
                  <div
                    v-for="c in filteredClients"
                    :key="c.id"
                    class="client-dropdown-item"
                    @mousedown.prevent="selectClient(c)"
                  >
                    <span class="cdi-doc">{{ c.document }}</span>
                    <span class="cdi-name">{{ c.name }}</span>
                  </div>
                </div>
                <div v-if="clientDropdownOpen && clientSearchQuery && filteredClients.length === 0" class="client-dropdown">
                  <div class="cdi-empty">Sin resultados</div>
                </div>
              </div>

              <div v-if="selectedClientInfo" class="selected-client-badge">
                <User :size="13" />
                <span class="scb-doc">CC/NIT: {{ selectedClientInfo.document }}</span>
                <span class="scb-name">{{ selectedClientInfo.name }}</span>
              </div>
              <div v-else class="client-missing-alert">
                <AlertCircle :size="13" />
                <span>Debes elegir o registrar el cliente para confirmar la venta</span>
              </div>
            </div>

            <!-- Método de Pago -->
            <div class="payment-selection-section">
              <label class="section-label">Método de Pago *</label>
              <div class="payment-buttons-grid">
                <button
                  v-for="method in paymentMethods"
                  :key="method.id"
                  type="button"
                  class="payment-button"
                  :class="{ active: selectedPaymentMethod === method.id }"
                  @click="selectPayment(method.id)"
                >
                  <span class="pay-icon"><component :is="method.icon" :size="18" /></span>
                  <span class="pay-name">{{ method.name }}</span>
                </button>
              </div>
            </div>

            <!-- Calculadora de Cambio en Efectivo (Muy útil para el propietario) -->
            <div v-if="selectedPaymentMethod === 'Efectivo'" class="cash-calc-box">
              <div class="cash-row">
                <label class="cash-label">Paga con ($):</label>
                <input
                  v-model.number="cashReceived"
                  type="number"
                  class="form-control cash-input"
                  :placeholder="cartTotal.toString()"
                />
              </div>

              <!-- Atajos de billetes comunes -->
              <div class="cash-shortcuts">
                <button
                  type="button"
                  class="chip-cash"
                  @click="cashReceived = cartTotal"
                >
                  Exacto
                </button>
                <button
                  v-for="amt in cashShortcuts"
                  :key="amt"
                  type="button"
                  class="chip-cash"
                  @click="cashReceived = amt"
                >
                  {{ formatCurrency(amt) }}
                </button>
              </div>

              <div class="cash-change-display" :class="{ 'change-positive': cashChange >= 0 }">
                <span>Cambio / Vueltas:</span>
                <strong>{{ cashChange >= 0 ? formatCurrency(cashChange) : 'Monto insuficiente' }}</strong>
              </div>
            </div>

            <!-- Sección Crédito: Interés, Anticipo y saldo pendiente -->
            <div v-if="selectedPaymentMethod === 'Crédito'" class="credit-details-box">
              <!-- Interés personalizado -->
              <div class="interest-section">
                <div class="credit-row">
                  <label class="credit-label"><Percent :size="13" /> Interés (%):</label>
                  <div class="interest-input-wrapper">
                    <input
                      v-model.number="interestRate"
                      type="number"
                      min="0"
                      max="100"
                      class="form-control interest-input"
                      placeholder="0"
                    />
                    <span class="interest-suffix">%</span>
                  </div>
                </div>
                <div class="interest-quick-chips">
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 0 }" @click="interestRate = 0">0%</button>
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 5 }" @click="interestRate = 5">5%</button>
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 10 }" @click="interestRate = 10">10%</button>
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 15 }" @click="interestRate = 15">15%</button>
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 20 }" @click="interestRate = 20">20%</button>
                  <button type="button" class="chip-interest" :class="{ active: interestRate === 50 }" @click="interestRate = 50">50%</button>
                </div>
                <div v-if="interestRate > 0" class="interest-calc-summary">
                  <div class="ics-row">
                    <span>Subtotal base:</span>
                    <span>{{ formatCurrency(cartTotal) }}</span>
                  </div>
                  <div class="ics-row ics-interest">
                    <span>+ Interés ({{ interestRate }}%):</span>
                    <span class="text-warning">{{ formatCurrency(interestAmount) }}</span>
                  </div>
                  <div class="ics-row ics-total">
                    <span>Total con interés:</span>
                    <strong class="text-danger">{{ formatCurrency(totalWithInterest) }}</strong>
                  </div>
                </div>
              </div>

              <div class="credit-divider"></div>

              <div class="credit-row">
                <label class="credit-label">Anticipo recibido ($):</label>
                <input
                  v-model.number="creditAdvance"
                  type="number"
                  min="0"
                  :max="totalWithInterest"
                  class="form-control"
                  placeholder="$ 0"
                />
              </div>
              <div class="credit-balance-info">
                <span>Saldo pendiente:</span>
                <span class="text-danger fw-bold">{{ formatCurrency(creditPendingBalance) }}</span>
              </div>
            </div>

            <!-- Botón Guardar como pendiente -->
            <button
              type="button"
              class="btn-save-pending"
              :disabled="cart.length === 0"
              @click="saveAsPending"
            >
              <span class="bsp-icon"><Clock :size="20" /></span>
              <div class="bsp-text-col">
                <span class="bsp-main-text">
                  {{ activePendingSaleId ? 'Actualizar venta pendiente' : 'Guardar como pendiente' }}
                </span>
                <span class="bsp-sub-text">
                  Pausa la venta sin descontar inventario • Atiende a otro cliente
                </span>
              </div>
            </button>

            <!-- Botón Finalizar / Confirmar Venta -->
            <button
              class="btn-confirm-sale"
              :disabled="!canConfirmSale"
              @click="submitSale"
            >
              <span class="confirm-icon"><CheckCircle2 :size="24" /></span>
              <div class="confirm-text-col">
                <span class="confirm-main-text">CONFIRMAR VENTA</span>
                <span class="confirm-sub-text">
                  <template v-if="!selectedClientId">⚠️ Requiere seleccionar cliente</template>
                  <template v-else-if="!selectedPaymentMethod">⚠️ Selecciona método de pago</template>
                  <template v-else>
                    {{ formatCurrency(selectedPaymentMethod === 'Crédito' && interestRate > 0 ? totalWithInterest : cartTotal) }} • {{ selectedPaymentMethod }}
                  </template>
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Barra flotante fija para Móviles (< 900px) cuando hay productos -->
    <div
      v-if="cart.length > 0 && mobileTab === 'catalog'"
      class="mobile-bottom-bar mobile-only"
    >
      <div class="mbb-summary">
        <span class="mbb-count"><ShoppingCart :size="15" /> {{ totalUnits }} uds.</span>
        <span class="mbb-total">{{ formatCurrency(cartTotal) }}</span>
      </div>
      <button class="btn btn-primary mbb-action" @click="mobileTab = 'cart'">
        Ver Cuenta y Cobrar <ArrowRight :size="16" />
      </button>
    </div>

    <!-- ================= MODAL DE REGISTRO RÁPIDO DE CLIENTE ================= -->
    <div v-if="showQuickClientModal" class="modal-overlay" @click.self="showQuickClientModal = false">
      <div class="modal quick-client-modal">
        <div class="modal-header">
          <h3 class="modal-title"><UserPlus :size="20" /> Nuevo Cliente Rápido</h3>
          <button class="modal-close" @click="showQuickClientModal = false"><X :size="18" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Documento de Identidad (Cédula) *</label>
            <input
              v-model="quickClient.document"
              type="text"
              class="form-control"
              placeholder="Ej: 1001234567"
              autofocus
            />
          </div>
          <div class="form-group">
            <label class="form-label">Nombre Completo *</label>
            <input
              v-model="quickClient.name"
              type="text"
              class="form-control"
              placeholder="Ej: Camilo Mendoza"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Teléfono / WhatsApp</label>
            <input
              v-model="quickClient.phone"
              type="tel"
              class="form-control"
              placeholder="Ej: 310 123 4567"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Nota o Dirección (Opcional)</label>
            <input
              v-model="quickClient.notes"
              type="text"
              class="form-control"
              placeholder="Ej: Taller Motos del Norte"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showQuickClientModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="saveQuickClient">Guardar y Seleccionar</button>
        </div>
      </div>
    </div>

    <!-- ================= MODAL VENTA EXITOSA / COMPROBANTE ================= -->
    <div v-if="saleSuccessModal" class="modal-overlay">
      <div class="modal success-receipt-modal">
        <div class="modal-body text-center">
          <div class="success-check-badge"><CheckCircle2 :size="48" /></div>
          <h2 class="success-title">¡Venta Registrada con Éxito!</h2>
          <p class="receipt-id">Comprobante #{{ completedSale?.id }}</p>

          <div class="receipt-card">
            <div class="receipt-row">
              <span class="receipt-label">Fecha y Hora:</span>
              <span>{{ formatDate(completedSale?.date) }}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Cliente:</span>
              <strong>{{ completedSale?.clientName || 'Cliente General' }}</strong>
            </div>
            <div v-if="completedSale?.clientDocument" class="receipt-row">
              <span class="receipt-label">Documento:</span>
              <span class="receipt-doc-value">{{ completedSale?.clientDocument }}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Método de Pago:</span>
              <span class="badge badge-secondary">{{ completedSale?.paymentMethod }}</span>
            </div>
            <div class="receipt-divider"></div>

            <!-- Detalle de productos vendidos -->
            <div class="receipt-products-list">
              <div
                v-for="item in completedSale?.items"
                :key="item.productId"
                class="receipt-item-row"
              >
                <span>{{ item.qty }}x {{ item.name }}</span>
                <span>{{ formatCurrency(item.subtotal) }}</span>
              </div>
            </div>

            <div class="receipt-divider"></div>

            <!-- Interés aplicado -->
            <div v-if="completedSale?.interestRate > 0" class="receipt-interest-section">
              <div class="receipt-row">
                <span class="receipt-label">Subtotal base:</span>
                <span>{{ formatCurrency(completedSale?.baseTotal) }}</span>
              </div>
              <div class="receipt-row receipt-interest-row">
                <span class="receipt-label">Interés ({{ completedSale?.interestRate }}%):</span>
                <span class="text-warning fw-600">+ {{ formatCurrency(completedSale?.interestAmount) }}</span>
              </div>
              <div class="receipt-divider"></div>
            </div>

            <div class="receipt-row receipt-total-row">
              <span class="receipt-total-label">TOTAL COBRADO:</span>
              <span class="receipt-total-value">{{ formatCurrency(completedSale?.total) }}</span>
            </div>

            <div v-if="completedSale?.debt > 0" class="receipt-row text-danger">
              <span>Saldo a Crédito Pendiente:</span>
              <strong>{{ formatCurrency(completedSale?.debt) }}</strong>
            </div>

            <div v-if="completedSale?.isAccumulated" class="receipt-accumulated-note">
              <AlertTriangle :size="13" /> Esta venta fue acumulada a una compra anterior del día
            </div>
          </div>

          <div class="receipt-actions">
            <button class="btn btn-primary flex-1" @click="resetForNewSale">
              <RotateCcw :size="16" /> Siguiente Venta
            </button>
            <router-link to="/historial" class="btn btn-secondary flex-1" @click="saleSuccessModal = false">
              <ClipboardList :size="16" /> Ver en Historial
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- ================= MODAL VENTAS PENDIENTES ================= -->
    <div v-if="showPendingModal" class="modal-overlay" @click.self="showPendingModal = false">
      <div class="modal pending-sales-modal">
        <div class="modal-header">
          <div class="pending-modal-title">
            <Clock :size="22" class="text-warning" />
            <h3 class="modal-title">Ventas Pendientes</h3>
            <span class="badge badge-warning">{{ store.pendingSales.length }}</span>
          </div>
          <button class="modal-close" @click="showPendingModal = false"><X :size="18" /></button>
        </div>

        <div class="modal-body pending-modal-body">
          <div v-if="store.pendingSales.length === 0" class="empty-pending-state">
            <div class="empty-pending-icon"><Clock :size="48" /></div>
            <h4>No hay ventas pendientes</h4>
            <p class="text-secondary">
              Cuando comiences una venta y el cliente todavía no se decida, presiona
              <strong class="text-warning">"Guardar como pendiente"</strong> en el ticket para pausar la venta sin descontar inventario y poder atender a otros clientes.
            </p>
          </div>

          <div v-else class="pending-sales-list">
            <div
              v-for="pSale in store.pendingSales"
              :key="pSale.id"
              class="pending-sale-card"
              :class="{ 'is-active-sale': activePendingSaleId === pSale.id }"
            >
              <div class="psc-top-row">
                <div class="psc-id-group">
                  <span class="psc-id-badge">#{{ pSale.id }}</span>
                  <span class="badge badge-warning psc-status-pill">PENDIENTE</span>
                  <span v-if="activePendingSaleId === pSale.id" class="badge badge-accent psc-active-pill">En pantalla</span>
                </div>
                <span class="psc-time"><Clock :size="12" /> {{ formatDate(pSale.createdAt || pSale.updatedAt) }}</span>
              </div>

              <div class="psc-client-info">
                <User :size="15" class="text-secondary" />
                <span v-if="pSale.clientName" class="psc-client-name">
                  <strong>{{ pSale.clientName }}</strong>
                  <span v-if="pSale.clientDocument" class="psc-client-doc"> — CC/NIT: {{ pSale.clientDocument }}</span>
                </span>
                <span v-else class="text-muted psc-no-client">Sin cliente todavía</span>
              </div>

              <!-- Lista de productos -->
              <div class="psc-items-box">
                <div class="psc-items-count">
                  <Package :size="13" />
                  <span>{{ pSale.items ? pSale.items.reduce((s, i) => s + i.qty, 0) : 0 }} artículos en total:</span>
                </div>
                <div class="psc-items-chips">
                  <span
                    v-for="(item, idx) in pSale.items"
                    :key="idx"
                    class="psc-chip"
                  >
                    {{ item.name }} <strong class="text-accent">×{{ item.qty }}</strong>
                  </span>
                </div>
              </div>

              <!-- Resumen financiero -->
              <div class="psc-summary-row">
                <div class="psc-breakdown">
                  <span v-if="pSale.discount > 0" class="psc-sub-item text-success">Desc: -{{ formatCurrency(pSale.discount) }}</span>
                  <span v-if="pSale.laborCost > 0" class="psc-sub-item text-info">Mano de obra: +{{ formatCurrency(pSale.laborCost) }}</span>
                </div>
                <div class="psc-total-group">
                  <span class="psc-total-label">Total:</span>
                  <span class="psc-total-amount">{{ formatCurrency(pSale.total) }}</span>
                </div>
              </div>

              <!-- Acciones: Continuar o Cancelar -->
              <div class="psc-actions-row">
                <button
                  type="button"
                  class="btn btn-secondary btn-sm btn-psc-cancel"
                  @click="confirmCancelPending(pSale)"
                  title="Cancelar y eliminar esta venta pendiente"
                >
                  <Trash2 :size="14" /> Cancelar venta
                </button>
                <button
                  type="button"
                  class="btn btn-primary btn-sm btn-psc-continue"
                  @click="continuePendingSale(pSale)"
                  title="Cargar esta venta al carrito para continuarla"
                >
                  <Play :size="14" /> Continuar venta
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPendingModal = false">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import store from '../stores/store.js'
import { formatCurrency, formatDate, formatNumber } from '../utils/calculations.js'
import {
  ShoppingCart, Package, Search, X, CheckCircle2, AlertTriangle,
  AlertCircle, Check, Plus, Minus, Receipt, User, UserPlus,
  ArrowRight, ArrowLeft, RotateCcw, ClipboardList, Banknote,
  Smartphone, Building2, CreditCard, Clock, Percent,
  Store, Warehouse, ArrowUpRight, ArrowLeftRight, Trash2, Play
} from '@lucide/vue'

// ================= ESTADOS =================
const mobileTab = ref('catalog') // 'catalog' | 'cart'
const productSearch = ref('')
const selectedCategory = ref('')
const onlyInStock = ref(false) // Por defecto muestra todos los productos con sus insignias de stock
const cart = ref([])
const discountAmount = ref(0)
const laborCost = ref(0)
const selectedClientId = ref('')
const selectedPaymentMethod = ref('Efectivo')
const cashReceived = ref(null)
const creditAdvance = ref(0)
const interestRate = ref(0)
const showPendingModal = ref(false)
const activePendingSaleId = ref(null)

// Cliente search
const clientSearchQuery = ref('')
const clientDropdownOpen = ref(false)
const clientSearchRef = ref(null)

function clearClientSearch() {
  clientSearchQuery.value = ''
  selectedClientId.value = ''
  clientDropdownOpen.value = false
}

function selectClient(c) {
  selectedClientId.value = c.id
  clientSearchQuery.value = `${c.document} — ${c.name}`
  clientDropdownOpen.value = false
}

function handleClientBlur() {
  setTimeout(() => { clientDropdownOpen.value = false }, 150)
}

const filteredClients = computed(() => {
  const q = clientSearchQuery.value.trim().toLowerCase()
  if (!q) return store.clients.slice(0, 20)
  return store.clients.filter(c =>
    c.document.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
  ).slice(0, 20)
})

// Modales
const showQuickClientModal = ref(false)
const quickClient = ref({ document: '', name: '', phone: '', notes: '' })
const saleSuccessModal = ref(false)
const completedSale = ref(null)

// Métodos de Pago
const paymentMethods = [
  { id: 'Efectivo', name: 'Efectivo', icon: Banknote },
  { id: 'Nequi', name: 'Nequi', icon: Smartphone },
  { id: 'Daviplata', name: 'Daviplata', icon: Smartphone },
  { id: 'Transferencia', name: 'Bancolombia/Transf.', icon: Building2 },
  { id: 'Tarjeta', name: 'Datáfono / Tarjeta', icon: CreditCard },
  { id: 'Crédito', name: 'Venta a Crédito', icon: Clock },
]

// Hora actual en tiempo real
const currentTime = ref(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }))
let timeInterval = null
onMounted(() => {
  timeInterval = setInterval(() => {
    currentTime.value = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  }, 10000)
})
onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})

// ================= COMPUTED =================
const totalProductsCount = computed(() => store.products.length)

const inStockCount = computed(() => {
  return store.products.filter(p => p.stock > 0).length
})

const availableCategories = computed(() => {
  const cats = new Set(store.products.map(p => p.category).filter(Boolean))
  return [...cats].sort()
})

function categoryCount(cat) {
  return store.products.filter(p => p.category === cat && (!onlyInStock.value || p.stock > 0)).length
}

// Productos filtrados según búsqueda, categoría y condición de stock
const filteredProducts = computed(() => {
  const q = productSearch.value.trim().toLowerCase()
  return store.products.filter(p => {
    // Filtro de solo en stock
    if (onlyInStock.value && p.stock <= 0) return false

    // Filtro por categoría
    if (selectedCategory.value && p.category !== selectedCategory.value) return false

    // Filtro por búsqueda
    if (q) {
      const matchName = p.name.toLowerCase().includes(q)
      const matchCat = (p.category || '').toLowerCase().includes(q)
      const matchSku = (p.sku || '').toLowerCase().includes(q)
      if (!matchName && !matchCat && !matchSku) return false
    }

    return true
  })
})

// Cálculos del Carrito
const totalUnits = computed(() => cart.value.reduce((sum, item) => sum + item.qty, 0))

const cartSubtotal = computed(() => cart.value.reduce((sum, item) => sum + item.subtotal, 0))

const cartTotal = computed(() => {
  const disc = Math.max(0, Number(discountAmount.value) || 0)
  const labor = Math.max(0, Number(laborCost.value) || 0)
  return Math.max(0, cartSubtotal.value + labor - disc)
})

// Atajos para cambio de efectivo según el total
const cashShortcuts = computed(() => {
  const tot = cartTotal.value
  if (tot <= 0) return [20000, 50000, 100000]
  const shortcuts = []
  const roundUp = (step) => Math.ceil(tot / step) * step
  const next10k = roundUp(10000)
  const next20k = roundUp(20000)
  const next50k = roundUp(50000)
  const next100k = roundUp(100000)

  if (next10k > tot) shortcuts.push(next10k)
  if (next20k > tot && !shortcuts.includes(next20k)) shortcuts.push(next20k)
  if (next50k > tot && !shortcuts.includes(next50k)) shortcuts.push(next50k)
  if (next100k > tot && !shortcuts.includes(next100k)) shortcuts.push(next100k)
  return shortcuts.slice(0, 4)
})

const cashChange = computed(() => {
  if (cashReceived.value === null || cashReceived.value === undefined) return 0
  return Number(cashReceived.value) - cartTotal.value
})

// Info del cliente seleccionado
const selectedClientInfo = computed(() => {
  if (!selectedClientId.value) return null
  return store.getClientById(Number(selectedClientId.value))
})

// Cálculos de interés para crédito
const interestAmount = computed(() => {
  const rate = Math.max(0, Math.min(100, Number(interestRate.value) || 0))
  if (rate <= 0) return 0
  return Math.round(cartTotal.value * rate / 100)
})

const totalWithInterest = computed(() => {
  return cartTotal.value + interestAmount.value
})

const creditPendingBalance = computed(() => {
  const adv = Math.max(0, Number(creditAdvance.value) || 0)
  return Math.max(0, totalWithInterest.value - adv)
})

const canConfirmSale = computed(() => {
  if (cart.value.length === 0) return false
  if (!selectedClientId.value) return false // Cliente obligatorio
  if (!selectedPaymentMethod.value) return false
  if (selectedPaymentMethod.value === 'Efectivo' && cashReceived.value !== null && cashReceived.value !== undefined) {
    if (cashReceived.value < cartTotal.value) return false
  }
  return true
})

// ================= ACCIONES DEL CARRITO =================
function isInCart(productId) {
  return cart.value.some(i => i.productId === productId)
}

function getCartItemQty(productId) {
  const item = cart.value.find(i => i.productId === productId)
  return item ? item.qty : 0
}

function getProductStock(productId) {
  const product = store.getProductById(productId)
  return product ? (Number(product.stock) || 0) : 0
}

function getProductWarehouse(productId) {
  const product = store.getProductById(productId)
  return product ? (Number(product.warehouseStock) || 0) : 0
}

function getItemMaxStock(productId) {
  const product = store.getProductById(productId)
  return product ? (Number(product.stock) || 0) : 0
}

function quickPassToStore(product, qty = 1) {
  store.transferStock(product.id, 'warehouse', 'store', qty)
}

function transferAndAdd(productId) {
  const product = store.getProductById(productId)
  if (!product) return
  if ((Number(product.warehouseStock) || 0) <= 0) {
    store.notify('No hay unidades en bodega para trasladar', 'warning')
    return
  }
  if (store.transferStock(productId, 'warehouse', 'store', 1)) {
    const item = cart.value.find(i => i.productId === productId)
    if (item) {
      item.qty++
      item.subtotal = item.qty * item.price
    }
  }
}

function handleCardClick(product) {
  if (product.stock <= 0) {
    if ((product.warehouseStock || 0) > 0) {
      store.notify(`"${product.name}" no tiene unidades en tienda, pero hay ${product.warehouseStock} en bodega. Usa el botón "Pasar 1 a tienda" en la tarjeta.`, 'info')
    } else {
      store.notify(`"${product.name}" está totalmente agotado`, 'warning')
    }
    return
  }
  // Si no está en carrito, agregarlo directamente
  if (!isInCart(product.id)) {
    quickAddToCart(product)
  }
}

function quickAddToCart(product) {
  if (product.stock <= 0) {
    if ((product.warehouseStock || 0) > 0) {
      store.notify(`"${product.name}" no tiene stock en tienda. Pásalo desde bodega primero con el botón en la tarjeta.`, 'warning')
    } else {
      store.notify(`"${product.name}" no tiene stock disponible`, 'warning')
    }
    return
  }

  const existing = cart.value.find(i => i.productId === product.id)
  if (existing) {
    if (existing.qty < product.stock) {
      existing.qty++
      existing.subtotal = existing.qty * existing.price
    } else {
      store.notify(`Solo hay ${product.stock} unidades en tienda. Hay ${product.warehouseStock || 0} en bodega.`, 'warning')
    }
  } else {
    cart.value.push({
      productId: product.id,
      name: product.name,
      price: product.sellPrice,
      qty: 1,
      subtotal: product.sellPrice,
    })
    store.notify(`Agregado: ${product.name}`, 'success')
  }
}

function incrementCart(productId) {
  const product = store.getProductById(productId)
  if (!product) return
  const item = cart.value.find(i => i.productId === productId)
  if (!item) {
    quickAddToCart(product)
    return
  }
  if (item.qty < product.stock) {
    item.qty++
    item.subtotal = item.qty * item.price
  } else {
    store.notify(`Límite de stock alcanzado (${product.stock} uds.)`, 'warning')
  }
}

function decrementCart(productId) {
  const itemIndex = cart.value.findIndex(i => i.productId === productId)
  if (itemIndex === -1) return
  if (cart.value[itemIndex].qty > 1) {
    cart.value[itemIndex].qty--
    cart.value[itemIndex].subtotal = cart.value[itemIndex].qty * cart.value[itemIndex].price
  } else {
    cart.value.splice(itemIndex, 1)
  }
}

function changeItemQty(index, delta) {
  const item = cart.value[index]
  if (!item) return
  const max = getItemMaxStock(item.productId)
  const newQty = item.qty + delta
  if (newQty <= 0) {
    removeFromCart(index)
    return
  }
  if (newQty > max) {
    store.notify(`Stock máximo disponible: ${max} unidades`, 'warning')
    return
  }
  item.qty = newQty
  item.subtotal = item.qty * item.price
}

function validateManualQty(index) {
  const item = cart.value[index]
  if (!item) return
  const max = getItemMaxStock(item.productId)
  let q = Math.floor(Number(item.qty))
  if (isNaN(q) || q < 1) {
    q = 1
  } else if (q > max) {
    q = max
    store.notify(`Ajustado al stock máximo disponible (${max} uds.)`, 'warning')
  }
  item.qty = q
  item.subtotal = item.qty * item.price
}

function removeFromCart(index) {
  cart.value.splice(index, 1)
}

function clearCart() {
  cart.value = []
  discountAmount.value = 0
  laborCost.value = 0
  cashReceived.value = null
  creditAdvance.value = 0
  activePendingSaleId.value = null
  clearActiveDraft()
}

function selectPayment(methodId) {
  selectedPaymentMethod.value = methodId
  if (methodId === 'Efectivo') {
    cashReceived.value = cartTotal.value
  } else if (methodId === 'Crédito') {
    creditAdvance.value = 0
  }
}

// ================= VENTAS PENDIENTES =================
function saveAsPending() {
  if (cart.value.length === 0) {
    store.notify('Agrega al menos un producto al carrito para guardarla como pendiente', 'warning')
    return
  }

  const client = selectedClientId.value ? store.getClientById(Number(selectedClientId.value)) : null

  const pendingData = {
    id: activePendingSaleId.value || undefined,
    items: cart.value.map(i => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
    clientId: client ? client.id : (selectedClientId.value ? Number(selectedClientId.value) : null),
    clientName: client ? client.name : (selectedClientId.value ? 'Cliente' : ''),
    clientDocument: client ? client.document : '',
    discount: Number(discountAmount.value) || 0,
    laborCost: Number(laborCost.value) || 0,
    subtotal: cartSubtotal.value,
    total: cartTotal.value,
    paymentMethod: selectedPaymentMethod.value,
    interestRate: Number(interestRate.value) || 0,
    creditAdvance: Number(creditAdvance.value) || 0,
    cashReceived: cashReceived.value,
    status: 'PENDIENTE',
  }

  const saved = store.savePendingSale(pendingData)

  // Dejar libre el módulo de venta inmediatamente para poder atender a otro cliente
  resetSaleForm()
  activePendingSaleId.value = null
  store.notify(`Venta guardada como pendiente (#${saved.id}). Módulo libre para una nueva venta.`, 'success')
}

function continuePendingSale(sale) {
  if (cart.value.length > 0 && activePendingSaleId.value !== sale.id) {
    const ok = window.confirm('Tienes productos en el carrito actual. ¿Deseas descartarlos y abrir esta venta pendiente?')
    if (!ok) return
  }

  activePendingSaleId.value = sale.id
  cart.value = (sale.items || []).map(i => ({
    productId: i.productId,
    name: i.name,
    price: Number(i.price) || 0,
    qty: Number(i.qty) || 1,
    subtotal: (Number(i.price) || 0) * (Number(i.qty) || 1),
  }))
  discountAmount.value = Number(sale.discount) || 0
  laborCost.value = Number(sale.laborCost) || 0
  selectedPaymentMethod.value = sale.paymentMethod || 'Efectivo'
  interestRate.value = Number(sale.interestRate) || 0
  creditAdvance.value = Number(sale.creditAdvance) || 0
  cashReceived.value = sale.cashReceived !== undefined ? sale.cashReceived : null

  if (sale.clientId) {
    selectedClientId.value = sale.clientId
    const c = store.getClientById(Number(sale.clientId))
    if (c) {
      clientSearchQuery.value = `${c.document} — ${c.name}`
    } else if (sale.clientName) {
      clientSearchQuery.value = sale.clientDocument ? `${sale.clientDocument} — ${sale.clientName}` : sale.clientName
    }
  } else {
    selectedClientId.value = ''
    clientSearchQuery.value = ''
  }

  showPendingModal.value = false
  mobileTab.value = 'cart'
  store.notify(`Venta pendiente #${sale.id} cargada. Puedes agregar más productos o confirmarla.`, 'info')
}

function confirmCancelPending(sale) {
  const ok = window.confirm(`¿Estás seguro de cancelar la venta pendiente #${sale.id}? Esta acción no se puede deshacer y no modificará el inventario.`)
  if (!ok) return

  store.deletePendingSale(sale.id)
  if (activePendingSaleId.value === sale.id) {
    resetSaleForm()
    activePendingSaleId.value = null
  }
}

function promptNewSale() {
  if (cart.value.length > 0) {
    const ok = window.confirm(`¿Deseas iniciar una nueva venta? La venta pendiente #${activePendingSaleId.value} permanecerá guardada.`)
    if (!ok) return
  }
  resetSaleForm()
  activePendingSaleId.value = null
  store.notify('Listo para iniciar una nueva venta', 'info')
}

function resetSaleForm() {
  cart.value = []
  discountAmount.value = 0
  laborCost.value = 0
  selectedClientId.value = ''
  clientSearchQuery.value = ''
  clientDropdownOpen.value = false
  selectedPaymentMethod.value = 'Efectivo'
  cashReceived.value = null
  creditAdvance.value = 0
  interestRate.value = 0
  activePendingSaleId.value = null
  clearActiveDraft()
}

// ================= PERSISTENCIA LOCAL DEL BORRADOR ACTIVO =================
const DRAFT_KEY = 'trueno_active_pos_draft'
let isRestoring = false

function saveActiveDraft() {
  if (isRestoring) return
  if (cart.value.length === 0 && !selectedClientId.value && !activePendingSaleId.value) {
    clearActiveDraft()
    return
  }
  try {
    const draft = {
      cart: cart.value,
      discountAmount: discountAmount.value,
      laborCost: laborCost.value,
      selectedClientId: selectedClientId.value,
      clientSearchQuery: clientSearchQuery.value,
      selectedPaymentMethod: selectedPaymentMethod.value,
      cashReceived: cashReceived.value,
      creditAdvance: creditAdvance.value,
      interestRate: interestRate.value,
      activePendingSaleId: activePendingSaleId.value,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {}
}

function clearActiveDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY)
  } catch {}
}

function restoreActiveDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (!raw) return
    isRestoring = true
    const draft = JSON.parse(raw)
    if (draft.cart && Array.isArray(draft.cart)) cart.value = draft.cart
    if (draft.discountAmount !== undefined) discountAmount.value = draft.discountAmount
    if (draft.laborCost !== undefined) laborCost.value = draft.laborCost
    if (draft.selectedClientId) selectedClientId.value = draft.selectedClientId
    if (draft.clientSearchQuery) clientSearchQuery.value = draft.clientSearchQuery
    if (draft.selectedPaymentMethod) selectedPaymentMethod.value = draft.selectedPaymentMethod
    if (draft.cashReceived !== undefined) cashReceived.value = draft.cashReceived
    if (draft.creditAdvance !== undefined) creditAdvance.value = draft.creditAdvance
    if (draft.interestRate !== undefined) interestRate.value = draft.interestRate
    if (draft.activePendingSaleId) activePendingSaleId.value = draft.activePendingSaleId
  } catch (e) {
    console.error('Error al restaurar borrador', e)
  } finally {
    isRestoring = false
  }
}

watch(
  [cart, discountAmount, laborCost, selectedClientId, clientSearchQuery, selectedPaymentMethod, cashReceived, creditAdvance, interestRate, activePendingSaleId],
  () => {
    saveActiveDraft()
  },
  { deep: true }
)

onMounted(() => {
  restoreActiveDraft()
})

// ================= REGISTRO RÁPIDO DE CLIENTE =================
function saveQuickClient() {
  if (!quickClient.value.document.trim()) {
    store.notify('El documento de identidad es requerido', 'warning')
    return
  }
  if (!quickClient.value.name.trim()) {
    store.notify('El nombre del cliente es requerido', 'warning')
    return
  }
  const newC = store.addClient({
    document: quickClient.value.document.trim(),
    name: quickClient.value.name.trim(),
    phone: quickClient.value.phone.trim(),
    notes: quickClient.value.notes.trim(),
    address: '',
    email: '',
  })
  if (!newC) return // Duplicate document prevented
  selectedClientId.value = newC.id
  clientSearchQuery.value = `${newC.document} — ${newC.name}`
  clientDropdownOpen.value = false
  showQuickClientModal.value = false
  quickClient.value = { document: '', name: '', phone: '', notes: '' }
  store.notify(`Cliente ${newC.name} (${newC.document}) creado y seleccionado`, 'success')
}

// ================= CONFIRMAR VENTA =================
function submitSale() {
  if (cart.value.length === 0) {
    store.notify('Agrega productos al carrito antes de confirmar', 'warning')
    return
  }
  if (!selectedClientId.value) {
    store.notify('Debes seleccionar un cliente obligatoriamente para realizar la venta', 'warning')
    return
  }
  if (!selectedPaymentMethod.value) {
    store.notify('Selecciona un método de pago', 'warning')
    return
  }

  // Pre-check stock before final submission
  for (const item of cart.value) {
    const p = store.getProductById(item.productId)
    if (!p || p.stock < item.qty) {
      store.notify(`Stock insuficiente para ${item.name}. Disponibles: ${p ? p.stock : 0}`, 'danger')
      return
    }
  }

  const client = selectedClientId.value ? store.getClientById(Number(selectedClientId.value)) : null
  const isCredit = selectedPaymentMethod.value === 'Crédito'
  const currentInterest = isCredit ? Math.max(0, Math.min(100, Number(interestRate.value) || 0)) : 0
  const effectiveTotal = isCredit && currentInterest > 0 ? totalWithInterest.value : cartTotal.value
  const paidAmount = isCredit ? Math.max(0, Number(creditAdvance.value) || 0) : effectiveTotal

  const saleData = {
    items: cart.value.map(i => ({
      productId: i.productId,
      name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
    clientId: client ? client.id : null,
    clientName: client ? client.name : 'Cliente General',
    clientDocument: client ? (client.document || '') : '',
    paymentMethod: selectedPaymentMethod.value,
    total: cartTotal.value,
    paid: paidAmount,
    discount: Number(discountAmount.value) || 0,
    laborCost: Number(laborCost.value) || 0,
    interestRate: currentInterest,
  }

  const registeredSale = store.registerSale(saleData)
  if (registeredSale) {
    if (activePendingSaleId.value) {
      store.deletePendingSale(activePendingSaleId.value)
      activePendingSaleId.value = null
    }
    clearActiveDraft()
    const isAccumulated = !registeredSale.__isNew && registeredSale.items.length > cart.value.length
    completedSale.value = {
      ...registeredSale,
      debt: registeredSale.total - registeredSale.paid,
      isAccumulated,
    }
    saleSuccessModal.value = true
  }
}

function resetForNewSale() {
  saleSuccessModal.value = false
  completedSale.value = null
  resetSaleForm()
  mobileTab.value = 'catalog'
}
</script>

<style scoped>
/* ================= ESTRUCTURA Y LAYOUT ================= */
.pos-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 20px;
  align-items: start;
}

.header-cart-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  padding: 6px 16px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}
.header-total {
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
  color: var(--success);
}

/* Tabs solo para móvil */
.mobile-view-tabs {
  display: none;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 14px;
  width: 100%;
  position: sticky;
  top: calc(var(--navbar-height) - 1px);
  z-index: 120;
  background: rgba(10, 11, 16, 0.96);
  backdrop-filter: blur(12px);
  padding: 8px 0;
}
.tab-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 12px 8px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: var(--transition);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.tab-btn.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}
.tab-badge {
  background: var(--accent);
  color: #0b0c10;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 12px;
  font-size: 11px;
}
.tab-total {
  font-family: var(--font-brand);
  color: var(--success);
  font-weight: 700;
}

.btn-back-to-catalog {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  background: var(--accent-subtle);
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 10px 14px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 600;
  margin-top: 10px;
  cursor: pointer;
  justify-content: center;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.btn-back-to-catalog:hover {
  background: var(--accent);
  color: #0b0c10;
}

/* ================= TOOLBAR CATÁLOGO ================= */
.catalog-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--bg-card);
  padding: 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  margin-bottom: 14px;
}

.search-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 14px;
  font-size: 16px;
  color: var(--text-muted);
}
.pos-search-input {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  padding: 12px 38px 12px 42px;
  border-radius: var(--radius-md);
  font-size: 14px;
  transition: var(--transition);
}
.pos-search-input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.clear-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
}

.toolbar-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}
.category-select {
  flex: 1;
  min-width: 140px;
}
.stock-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  background: var(--bg-secondary);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  flex-shrink: 0;
}
.stock-toggle input[type="checkbox"] {
  accent-color: var(--accent);
  width: 16px;
  height: 16px;
  cursor: pointer;
}
.stock-toggle:hover {
  border-color: var(--accent-hover);
  color: var(--text-primary);
}

/* Category chips */
.category-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 8px;
  margin-bottom: 14px;
  scrollbar-width: thin;
}
.chip-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: var(--radius-xl);
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: var(--transition);
}
.chip-btn:hover {
  border-color: var(--accent-hover);
  color: var(--text-primary);
}
.chip-btn.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
  box-shadow: var(--shadow-accent);
}

/* ================= GRID DE PRODUCTOS ================= */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
}

.product-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 14px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 12px;
  cursor: pointer;
  transition: var(--transition);
  position: relative;
}
.product-card:hover {
  transform: translateY(-3px);
  border-color: var(--border-hover);
  box-shadow: var(--shadow-md);
}
.product-card.is-in-cart {
  border-color: var(--accent);
  background: rgba(255, 69, 0, 0.04);
  box-shadow: 0 0 16px rgba(255, 69, 0, 0.15);
}
.product-card.is-out-of-stock {
  opacity: 0.6;
  border-style: dashed;
}

.card-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  font-size: 11px;
}
.card-stock-pill-group {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  align-items: center;
}
.stock-badge {
  font-weight: 600;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
}
.stock-badge-store.stock-ok {
  background: rgba(0, 217, 126, 0.15);
  color: var(--success);
  border: 1px solid rgba(0, 217, 126, 0.3);
}
.stock-badge-store.stock-low {
  background: rgba(245, 166, 35, 0.18);
  color: var(--warning);
  border: 1px solid rgba(245, 166, 35, 0.35);
}
.stock-badge-store.stock-empty {
  background: rgba(255, 59, 92, 0.15);
  color: var(--danger);
  border: 1px solid rgba(255, 59, 92, 0.3);
}
.stock-badge-bodega.bodega-has {
  background: rgba(255, 69, 0, 0.15);
  color: var(--accent);
  border: 1px solid rgba(255, 69, 0, 0.3);
}
.stock-badge-bodega.bodega-empty {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}
.card-bodega-restock {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  background: rgba(255, 69, 0, 0.08);
  border: 1px dashed rgba(255, 69, 0, 0.3);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: 11px;
}
.bodega-restock-text {
  color: var(--text-secondary);
  font-size: 10px;
}
.btn-quick-pass {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  transition: opacity 0.15s;
}
.btn-quick-pass:hover {
  opacity: 0.9;
}
.category-tag {
  color: var(--text-muted);
  font-size: 11px;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--bg-secondary), #242436);
  border: 1px solid var(--border-color);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
}
.card-info {
  flex: 1;
  min-width: 0;
}
.product-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.product-sku {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.card-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-color);
}
.price-container {
  display: flex;
  flex-direction: column;
}
.price-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
}
.product-price {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 700;
  color: var(--success);
}

/* Stepper en la tarjeta */
.card-stepper {
  display: inline-flex;
  align-items: center;
  background: var(--bg-secondary);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.stepper-btn {
  background: transparent;
  border: none;
  color: var(--accent);
  width: 28px;
  height: 28px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition);
}
.stepper-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}
.stepper-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.stepper-qty {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
  min-width: 24px;
  text-align: center;
}

.btn-add-cart {
  background: var(--accent-subtle);
  border: 1px solid var(--accent-glow);
  color: var(--accent);
  padding: 6px 12px;
  border-radius: var(--radius-md);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: var(--transition);
}
.btn-add-cart:hover:not(:disabled) {
  background: var(--accent);
  color: white;
  box-shadow: var(--shadow-accent);
}
.btn-add-cart:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--border-color);
  color: var(--text-muted);
  background: var(--bg-secondary);
}

.empty-catalog {
  text-align: center;
  padding: 40px 20px;
}
.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

/* ================= COLUMNA DERECHA: TICKET Y SUMA DE PRODUCTOS ================= */
.ticket-card {
  position: sticky;
  top: calc(var(--navbar-height) + 16px);
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - var(--navbar-height) - 32px);
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.ticket-header {
  padding: 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}
.ticket-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.ticket-title {
  font-family: var(--font-brand);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.ticket-count-badge {
  background: var(--accent);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
}
.btn-clear-cart {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
.btn-clear-cart:hover {
  color: var(--danger);
}
.ticket-owner-tag {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-secondary);
}

/* Ticket Body / Items */
.ticket-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
  min-height: 140px;
}
.ticket-empty {
  text-align: center;
  padding: 30px 10px;
  color: var(--text-secondary);
}
.empty-cart-icon {
  font-size: 40px;
  margin-bottom: 10px;
  opacity: 0.6;
}
.ticket-empty h4 {
  font-size: 16px;
  color: var(--text-primary);
  margin-bottom: 6px;
}
.ticket-empty p {
  font-size: 13px;
  margin-bottom: 14px;
}

.ticket-items-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.ticket-item {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  transition: var(--transition);
}
.ticket-item:hover {
  border-color: rgba(255, 69, 0, 0.4);
}
.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.item-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}
.item-delete-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
  transition: var(--transition);
}
.item-delete-btn:hover {
  color: var(--danger);
}

.item-calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}
.item-stepper {
  display: inline-flex;
  align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  overflow: hidden;
}
.qty-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  width: 26px;
  height: 26px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.qty-btn:hover:not(:disabled) {
  background: var(--accent);
  color: white;
}
.qty-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
.qty-input {
  width: 38px;
  height: 26px;
  background: transparent;
  border: none;
  text-align: center;
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  -moz-appearance: textfield;
}
.qty-input::-webkit-outer-spin-button,
.qty-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.item-math {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}
.unit-price {
  font-size: 11px;
  color: var(--text-muted);
}
.item-subtotal {
  font-family: var(--font-brand);
  font-size: 15px;
  font-weight: 700;
  color: var(--success);
}
.item-header-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.item-stock-loc-text {
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.loc-sep {
  color: var(--text-muted);
  opacity: 0.5;
}
.stock-warning-note {
  font-size: 11px;
  color: var(--warning);
  margin-top: 6px;
  background: rgba(245, 166, 35, 0.08);
  border: 1px solid rgba(245, 166, 35, 0.25);
  border-radius: var(--radius-sm);
  padding: 6px 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.stock-warn-left {
  display: flex;
  align-items: center;
  gap: 5px;
}
.btn-inline-transfer {
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
  transition: opacity 0.15s;
}
.btn-inline-transfer:hover {
  opacity: 0.9;
}

/* Ticket Footer & Cálculos */
.ticket-footer {
  border-top: 1px solid var(--border-color);
  padding: 14px;
  background: var(--bg-card);
  overflow-y: auto;
  max-height: 52vh;
}

.totals-panel {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 12px;
  margin-bottom: 14px;
}
.calc-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}
.calc-value {
  font-weight: 600;
  color: var(--text-primary);
}
.discount-row {
  margin-top: 4px;
}
.discount-input {
  width: 90px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  color: var(--accent);
  font-weight: 700;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  text-align: right;
  font-size: 13px;
}
.calc-divider {
  height: 1px;
  background: var(--border-color);
  margin: 8px 0;
}
.grand-total-row {
  margin-bottom: 0;
  margin-top: 4px;
}
.grand-total-label {
  font-family: var(--font-brand);
  font-size: 15px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}
.grand-total-value {
  font-family: var(--font-brand);
  font-size: 24px;
  font-weight: 700;
  color: var(--success);
  text-shadow: 0 0 12px rgba(0, 217, 126, 0.3);
}

/* Sección Cliente */
.client-selection-section {
  margin-bottom: 12px;
}
.section-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.section-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.btn-text-action {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}
.btn-text-action:hover {
  text-decoration: underline;
}
.client-select {
  font-size: 13px;
  padding: 8px 12px;
}

/* Sección Métodos de Pago */
.payment-selection-section {
  margin-bottom: 14px;
}
.payment-buttons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 6px;
}
.payment-button {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: var(--transition);
}
.payment-button:hover {
  border-color: var(--accent-hover);
}
.payment-button.active {
  background: var(--accent-subtle);
  border-color: var(--accent);
  box-shadow: 0 0 8px rgba(255, 69, 0, 0.2);
}
.pay-icon {
  font-size: 16px;
}
.pay-name {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
}

/* Efectivo / Cambio */
.cash-calc-box {
  background: rgba(0, 217, 126, 0.05);
  border: 1px solid rgba(0, 217, 126, 0.2);
  border-radius: var(--radius-md);
  padding: 10px;
  margin-bottom: 12px;
}
.cash-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}
.cash-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
}
.cash-input {
  width: 140px;
  padding: 6px 10px;
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 700;
  text-align: right;
  color: var(--success);
}
.cash-shortcuts {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.chip-cash {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: pointer;
}
.chip-cash:hover {
  border-color: var(--success);
  color: var(--success);
}
.cash-change-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding-top: 6px;
  border-top: 1px dashed rgba(0, 217, 126, 0.2);
}
.change-positive strong {
  font-family: var(--font-brand);
  font-size: 18px;
  color: var(--success);
}

/* Crédito */
.credit-details-box {
  background: rgba(245, 166, 35, 0.06);
  border: 1px solid rgba(245, 166, 35, 0.25);
  border-radius: var(--radius-md);
  padding: 10px;
  margin-bottom: 12px;
}
.credit-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.credit-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--warning);
}
.credit-balance-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  padding-top: 6px;
  border-top: 1px dashed rgba(245, 166, 35, 0.2);
}
.credit-divider {
  height: 1px;
  background: rgba(245, 166, 35, 0.15);
  margin: 10px 0;
}

/* Badge del cliente seleccionado y aviso obligatorio */
.required-star {
  color: var(--accent);
  font-weight: bold;
  margin-left: 2px;
}
.badge-mandatory {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(255, 69, 0, 0.18);
  color: var(--accent);
  border: 1px solid rgba(255, 69, 0, 0.35);
  border-radius: 4px;
  padding: 1px 5px;
  margin-left: 6px;
  vertical-align: middle;
}
.select-required-pending {
  border-color: rgba(255, 69, 0, 0.45) !important;
  background-color: rgba(255, 69, 0, 0.03);
}
.select-required-pending:focus {
  border-color: var(--accent) !important;
  box-shadow: 0 0 0 2px rgba(255, 69, 0, 0.2) !important;
}
.client-missing-alert {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 6px 10px;
  background: rgba(255, 69, 0, 0.08);
  border: 1px dashed rgba(255, 69, 0, 0.35);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: #ff7a50;
  font-weight: 500;
}
.selected-client-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  padding: 6px 10px;
  background: var(--accent-subtle);
  border: 1px solid rgba(255, 69, 0, 0.2);
  border-radius: var(--radius-sm);
  font-size: 12px;
  color: var(--text-primary);
}
.scb-doc {
  font-family: var(--font-brand);
  font-weight: 700;
  color: var(--accent);
}
.scb-name {
  color: var(--text-secondary);
  font-weight: 500;
}

/* Buscador de cliente */
.client-search-wrapper { position: relative; }
.client-search-input-row {
  display: flex;
  align-items: center;
  position: relative;
}
.client-search-icon {
  position: absolute;
  left: 10px;
  color: var(--text-muted);
  pointer-events: none;
  z-index: 1;
}
.client-search-input {
  padding-left: 34px !important;
  padding-right: 32px !important;
}
.client-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  z-index: 300;
  max-height: 200px;
  overflow-y: auto;
}
.client-dropdown-item {
  display: flex;
  gap: 10px;
  align-items: baseline;
  padding: 9px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--border-color);
  transition: background 0.15s;
}
.client-dropdown-item:last-child { border-bottom: none; }
.client-dropdown-item:hover { background: var(--accent-subtle); }
.cdi-doc {
  font-family: var(--font-brand);
  font-size: 12px;
  font-weight: 700;
  color: var(--accent);
  flex-shrink: 0;
}
.cdi-name { font-size: 13px; color: var(--text-primary); }
.cdi-empty { padding: 10px 12px; font-size: 13px; color: var(--text-muted); text-align: center; }

/* Sección de Interés */
.interest-section {
  margin-bottom: 4px;
}
.interest-input-wrapper {
  display: flex;
  align-items: center;
  gap: 4px;
}
.interest-input {
  width: 80px;
  padding: 5px 8px;
  font-family: var(--font-brand);
  font-size: 15px;
  font-weight: 700;
  text-align: right;
  color: var(--warning);
}
.interest-suffix {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 700;
  color: var(--warning);
}
.interest-quick-chips {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  margin-top: 6px;
  margin-bottom: 8px;
}
.chip-interest {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-size: 10px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: var(--transition);
}
.chip-interest:hover {
  border-color: var(--warning);
  color: var(--warning);
}
.chip-interest.active {
  background: rgba(245, 166, 35, 0.15);
  border-color: var(--warning);
  color: var(--warning);
}
.interest-calc-summary {
  background: rgba(245, 166, 35, 0.04);
  border: 1px dashed rgba(245, 166, 35, 0.2);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}
.ics-row {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 3px;
}
.ics-row:last-child {
  margin-bottom: 0;
}
.ics-interest {
  color: var(--warning);
}
.ics-total {
  padding-top: 4px;
  border-top: 1px dashed rgba(245, 166, 35, 0.15);
  margin-top: 3px;
  font-size: 13px;
}
.ics-total strong {
  font-family: var(--font-brand);
  font-size: 15px;
}

/* Receipt extras */
.receipt-doc-value {
  font-family: var(--font-brand);
  font-weight: 700;
  color: var(--accent);
}
.receipt-interest-section {
  margin-bottom: 4px;
}
.receipt-interest-row {
  font-size: 12px;
}
.receipt-accumulated-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  padding: 8px 10px;
  background: rgba(0, 168, 255, 0.08);
  border: 1px solid rgba(0, 168, 255, 0.2);
  border-radius: var(--radius-sm);
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
}
.fw-600 { font-weight: 600; }
.text-warning { color: var(--warning); }

/* Botón Confirmar Venta */
.btn-confirm-sale {
  width: 100%;
  background: linear-gradient(135deg, #00d97e, #009955);
  border: none;
  border-radius: var(--radius-md);
  padding: 14px;
  color: #05140b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 4px 20px rgba(0, 217, 126, 0.35);
  transition: var(--transition);
}
.btn-confirm-sale:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 217, 126, 0.5);
}
.btn-confirm-sale:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.5);
  transform: none;
}
.confirm-icon {
  font-size: 24px;
}
.confirm-text-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
.confirm-main-text {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.5px;
}
.confirm-sub-text {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.9;
}

/* ================= MODALES ================= */
.quick-client-modal {
  max-width: 420px;
}
.success-receipt-modal {
  max-width: 440px;
}
.success-check-badge {
  font-size: 48px;
  margin-bottom: 10px;
}
.success-title {
  font-family: var(--font-brand);
  font-size: 22px;
  font-weight: 700;
  color: var(--success);
  margin-bottom: 4px;
}
.receipt-id {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 14px;
}
.receipt-card {
  background: var(--bg-secondary);
  border: 1px dashed var(--border-color);
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: left;
  margin-bottom: 20px;
}
.receipt-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  margin-bottom: 6px;
}
.receipt-label {
  color: var(--text-secondary);
}
.receipt-divider {
  height: 1px;
  background: var(--border-color);
  margin: 10px 0;
}
.receipt-products-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.receipt-item-row {
  display: flex;
  justify-content: space-between;
  color: var(--text-primary);
}
.receipt-total-row {
  margin-top: 6px;
  margin-bottom: 4px;
}
.receipt-total-label {
  font-family: var(--font-brand);
  font-size: 15px;
  font-weight: 700;
}
.receipt-total-value {
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
  color: var(--success);
}
.receipt-actions {
  display: flex;
  gap: 10px;
}
.flex-1 {
  flex: 1;
}

/* Barra flotante para móviles */
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(24, 27, 40, 0.96);
  backdrop-filter: blur(12px);
  border-top: 2px solid var(--accent);
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 12px));
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 200;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.6);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.mbb-summary {
  display: flex;
  flex-direction: column;
}
.mbb-count {
  font-size: 12px;
  color: var(--text-secondary);
}
.mbb-total {
  font-family: var(--font-brand);
  font-size: 20px;
  font-weight: 700;
  color: var(--success);
}
.mbb-action {
  padding: 10px 18px;
  font-weight: 700;
  font-size: 14px;
}

/* ================= RESPONSIVIDAD PARA TODOS LOS EQUIPOS ================= */
@media (min-width: 901px) {
  .mobile-only {
    display: none !important;
  }
  .mobile-view-tabs {
    display: none !important;
  }
}

@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }
  /* Mostrar tabs de navegación móvil */
  .mobile-view-tabs {
    display: grid !important;
  }
  .mobile-only {
    display: flex;
  }
  .pos-layout {
    grid-template-columns: minmax(0, 1fr) !important;
    gap: 0;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
  }
  .pos-catalog,
  .pos-ticket-col {
    min-width: 0;
    max-width: 100%;
    width: 100%;
    box-sizing: border-box;
  }
  .hidden-on-mobile {
    display: none !important;
  }
  .ticket-card {
    position: static;
    max-height: none;
    border-radius: var(--radius-lg);
    width: 100%;
    box-sizing: border-box;
  }
  .ticket-footer {
    max-height: none;
    overflow-y: visible;
  }
  .ticket-body {
    min-height: auto;
    max-height: none;
    overflow-y: visible;
  }
  /* Padding extra en móvil para que la barra flotante no tape el contenido */
  .pos-catalog {
    padding-bottom: 100px;
  }
  /* Catalog toolbar en móvil */
  .catalog-toolbar {
    padding: 12px;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  .category-chips {
    margin-bottom: 10px;
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
  }

  /* Prevenir Auto-zoom de iOS Safari manteniendo tamaño mínimo de letra a 16px en inputs */
  .pos-search-input,
  .category-select,
  .client-select,
  .discount-input,
  .cash-input,
  .qty-input,
  .form-control {
    font-size: 16px !important;
    box-sizing: border-box;
  }
}

/* Tablet rango 651–900px: grid de 2 a 3 columnas */
@media (min-width: 651px) and (max-width: 900px) {
  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }
}

/* Teléfono y pantallas pequeñas (< 650px): DE A UN PRODUCTO POR FILA */
@media (max-width: 650px) {
  .product-grid {
    grid-template-columns: 1fr !important;
    gap: 10px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
  .product-card {
    padding: 12px 14px;
    gap: 10px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
  }
  .card-avatar {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .product-name {
    font-size: 14px;
  }
  .product-price {
    font-size: 16px;
  }
  .category-tag {
    max-width: 120px;
  }
  /* Toolbar controles en columna */
  .toolbar-controls {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    width: 100%;
    box-sizing: border-box;
  }
  .category-select {
    width: 100%;
    box-sizing: border-box;
  }
  .stock-toggle {
    justify-content: center;
    white-space: normal;
    width: 100%;
    box-sizing: border-box;
    text-align: center;
  }
  /* Pagos en 2 columnas */
  .payment-buttons-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .payment-button {
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    padding: 10px 6px;
  }
  /* Acciones del recibo en columna */
  .receipt-actions {
    flex-direction: column;
  }
  /* Reducir padding del page en móvil */
  .pos-catalog {
    padding-bottom: 110px;
  }
  /* Cash input responsivo en móvil */
  .cash-input {
    width: 130px;
    font-size: 16px !important;
  }
  /* Ticket header compacto */
  .ticket-header {
    padding: 12px;
  }
  .ticket-body {
    padding: 10px;
  }
  .ticket-footer {
    padding: 10px;
  }
  /* Totals grand value más pequeño en móvil */
  .grand-total-value {
    font-size: 20px;
  }
}

/* ================= ESTILOS VENTAS PENDIENTES ================= */
.header-right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-pending-sales-trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  padding: 8px 14px;
  border-radius: var(--radius-xl);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
}

.btn-pending-sales-trigger:hover {
  background: var(--bg-card-hover);
  color: var(--text-primary);
  border-color: var(--warning);
}

.btn-pending-sales-trigger.has-pending {
  background: rgba(245, 166, 35, 0.12);
  border-color: rgba(245, 166, 35, 0.4);
  color: var(--warning);
}

.pending-count-pill {
  background: var(--warning);
  color: #0b0c10;
  font-weight: 800;
  font-size: 11px;
  padding: 1px 7px;
  border-radius: 10px;
}

.tab-badge-warning {
  background: var(--warning) !important;
  color: #0b0c10 !important;
}

.active-pending-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: rgba(245, 166, 35, 0.1);
  border: 1px solid rgba(245, 166, 35, 0.35);
  border-radius: var(--radius-md);
  padding: 8px 12px;
  margin-top: 10px;
}

.apb-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.apb-text {
  display: flex;
  flex-direction: column;
}

.apb-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--warning);
}

.apb-sub {
  font-size: 11px;
  color: var(--text-secondary);
}

.btn-apb-new {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-card);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  white-space: nowrap;
}

.btn-apb-new:hover {
  background: var(--accent-subtle);
  border-color: var(--accent);
  color: var(--accent);
}

/* Botón Guardar como pendiente en ticket */
.btn-save-pending {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(245, 166, 35, 0.12);
  border: 1px dashed rgba(245, 166, 35, 0.5);
  color: var(--warning);
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: var(--transition);
  margin-bottom: 12px;
}

.btn-save-pending:hover:not(:disabled) {
  background: rgba(245, 166, 35, 0.22);
  border-color: var(--warning);
  transform: translateY(-1px);
}

.btn-save-pending:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  border-color: var(--border-color);
  color: var(--text-muted);
  background: var(--bg-card);
}

.bsp-text-col {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.bsp-main-text {
  font-family: var(--font-brand);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.bsp-sub-text {
  font-size: 11px;
  opacity: 0.85;
}

/* Modal Ventas Pendientes */
.pending-sales-modal {
  max-width: 680px;
  width: 95%;
}

.pending-modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pending-modal-body {
  max-height: 70vh;
  overflow-y: auto;
  padding: 16px;
}

.empty-pending-state {
  text-align: center;
  padding: 40px 20px;
}

.empty-pending-icon {
  margin-bottom: 16px;
  color: var(--text-muted);
}

.pending-sales-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.pending-sale-card {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: var(--transition);
}

.pending-sale-card:hover {
  border-color: rgba(245, 166, 35, 0.4);
}

.pending-sale-card.is-active-sale {
  border-color: var(--warning);
  box-shadow: 0 0 12px rgba(245, 166, 35, 0.15);
}

.psc-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.psc-id-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.psc-id-badge {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 15px;
  color: var(--accent);
}

.psc-status-pill {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.psc-active-pill {
  font-size: 10px;
  font-weight: 700;
}

.psc-time {
  font-size: 12px;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.psc-client-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.psc-client-name {
  color: var(--text-primary);
}

.psc-client-doc {
  font-size: 12px;
}

.psc-no-client {
  font-size: 12px;
  font-style: italic;
}

.psc-items-box {
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
}

.psc-items-count {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.psc-items-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.psc-chip {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 11px;
  color: var(--text-primary);
}

.psc-summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border-color);
  padding-top: 8px;
}

.psc-breakdown {
  display: flex;
  gap: 10px;
  font-size: 12px;
}

.psc-total-group {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.psc-total-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.psc-total-amount {
  font-family: var(--font-brand);
  font-size: 17px;
  font-weight: 700;
  color: var(--success);
}

.psc-actions-row {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.btn-psc-cancel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--danger) !important;
}

.btn-psc-cancel:hover {
  background: var(--danger-bg) !important;
  border-color: var(--danger) !important;
}

.btn-psc-continue {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}
</style>
