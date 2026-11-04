<template>
  <div id="trueno-app" :class="{ 'is-login-layout': isLoginPage }">
    <!-- Notifications -->
    <div class="notifications">
      <transition-group name="notif">
        <div
          v-for="n in store.notifications"
          :key="n.id"
          class="notification"
          :class="`notif-${n.type}`"
        >
          <component :is="notifIconComp(n.type)" class="notif-icon" :size="16" />
          <span class="notif-text">{{ n.message }}</span>
        </div>
      </transition-group>
    </div>

    <!-- Navbar (Hidden on Login) -->
    <nav v-if="!isLoginPage" class="navbar">
      <div class="navbar-left">
        <button class="hamburger-btn" @click="toggleSidebar" :class="{ active: sidebarOpen }" aria-label="Menú">
          <span></span><span></span><span></span>
        </button>
        <div class="brand">
          <img src="/img/logo-trueno.png" alt="Tuning 219 Trueno" class="brand-logo-img" />
          <div class="brand-text">
            <span class="brand-name">TUNING <span class="brand-accent">219</span></span>
            <span class="brand-sub">TRUENO</span>
          </div>
        </div>
      </div>
      <div class="navbar-center">
        <span class="current-section">{{ currentSection }}</span>
      </div>
      <div class="navbar-right">
        <!-- Authenticated User Menu Container -->
        <div class="user-menu-container">
          <div class="user-badge" @click="toggleUserMenu" :title="currentUser?.email ? `Sesión: ${currentUser.email}` : 'Sesión de Usuario'">
            <User :size="16" class="user-icon" />
            <span class="user-name">{{ currentUser?.full_name || 'Usuario' }}</span>
            <span v-if="currentUser?.role" class="user-role-pill">{{ currentUser.role }}</span>
            <ChevronDown :size="14" class="user-chevron" :class="{ 'chevron-rotated': userMenuOpen }" />
          </div>

          <!-- User Dropdown Menu -->
          <transition name="dropdown-fade">
            <div v-if="userMenuOpen" class="user-dropdown-menu">
              <div class="user-dropdown-header">
                <div class="udh-name">{{ currentUser?.full_name || 'Usuario Trueno' }}</div>
                <div class="udh-email">{{ currentUser?.email || 'admin@trueno219.com' }}</div>
                <span class="udh-role">{{ currentUser?.role === 'admin' ? 'Administrador' : 'Empleado' }}</span>
              </div>
              <div class="user-dropdown-divider"></div>
              <button class="user-dropdown-item logout-btn" @click="handleLogout">
                <LogOut :size="15" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </nav>

    <!-- Sidebar Overlay -->
    <transition name="overlay-fade">
      <div v-if="!isLoginPage && sidebarOpen" class="sidebar-overlay" @click="closeSidebar"></div>
    </transition>

    <!-- Sidebar (Hidden on Login) -->
    <transition name="sidebar-slide">
      <aside v-if="!isLoginPage && sidebarOpen" class="sidebar">
        <div class="sidebar-header">
          <div class="sidebar-brand">
            <img src="/img/logo-trueno.png" alt="Tuning 219 Trueno" class="sidebar-logo-img" />
            <div>
              <div class="sidebar-brand-name">TUNING <span class="brand-accent">219</span></div>
              <div class="sidebar-brand-sub">TRUENO MOTOS</div>
            </div>
          </div>
          <button class="sidebar-close" @click="closeSidebar"><XCircle :size="20" /></button>
        </div>

        <nav class="sidebar-nav">
          <router-link v-for="item in navItems" :key="item.path"
            :to="item.path"
            class="nav-item"
            @click="closeSidebar"
          >
            <component :is="item.iconComp" class="nav-icon" :size="18" />
            <span class="nav-label">{{ item.label }}</span>
            <span v-if="item.badge" class="nav-badge">{{ item.badge }}</span>
          </router-link>
        </nav>

        <div class="sidebar-footer">
          <div class="sidebar-stats">
            <div class="mini-stat">
              <span class="mini-stat-label">Hoy</span>
              <span class="mini-stat-value text-success">{{ formatCurrency(store.todayTotal) }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-stat-label">Pendiente</span>
              <span class="mini-stat-value text-warning">{{ formatCurrency(store.totalPendingDebt) }}</span>
            </div>
          </div>
        </div>
      </aside>
    </transition>

    <!-- Main Content -->
    <main class="main-content" :class="{ 'sidebar-open': sidebarOpen, 'login-layout-main': isLoginPage }">
      <router-view v-slot="{ Component }">
        <transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import store from './stores/store.js'
import AuthService from './services/auth.service.js'
import { formatCurrency } from './utils/calculations.js'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wallet,
  ClipboardList, Settings, CheckCircle2, AlertTriangle,
  XCircle, Info, User, ChevronDown, LogOut
} from '@lucide/vue'

const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const userMenuOpen = ref(false)
const currentUser = ref(null)

const isLoginPage = computed(() => route.path === '/login')

const toggleSidebar = () => { sidebarOpen.value = !sidebarOpen.value }
const closeSidebar = () => { sidebarOpen.value = false }
const toggleUserMenu = () => { userMenuOpen.value = !userMenuOpen.value }

const navItems = computed(() => [
  { path: '/', iconComp: LayoutDashboard, label: 'Dashboard' },
  { path: '/inventario', iconComp: Package, label: 'Inventario', badge: store.lowStockProducts.length || null },
  { path: '/ventas', iconComp: ShoppingCart, label: 'Nueva Venta' },
  { path: '/clientes', iconComp: Users, label: 'Clientes' },
  { path: '/deudas', iconComp: Wallet, label: 'Deudas', badge: store.debts.filter(d => d.status === 'vencida').length || null },
  { path: '/historial', iconComp: ClipboardList, label: 'Historial de Ventas' },
  { path: '/configuracion', iconComp: Settings, label: 'Configuración' },
])

const currentSection = computed(() => route.meta?.title || 'Dashboard')

const notifIconComp = (type) => {
  const map = { success: CheckCircle2, warning: AlertTriangle, danger: XCircle, info: Info }
  return map[type] || Info
}

const syncUser = () => {
  currentUser.value = AuthService.getUser()
}

const handleLogout = async () => {
  userMenuOpen.value = false
  await AuthService.logout()
  store.notify('Sesión cerrada correctamente', 'info')
  router.push('/login')
}

const handleOutsideClick = (e) => {
  if (userMenuOpen.value && !e.target.closest('.user-menu-container')) {
    userMenuOpen.value = false
  }
}

const handleAuthExpired = (e) => {
  store.notify(e.detail?.message || 'Su sesión ha expirado. Inicie sesión nuevamente.', 'warning')
  router.push('/login')
}

watch(() => route.path, () => {
  syncUser()
  userMenuOpen.value = false
})

onMounted(() => {
  syncUser()
  window.addEventListener('click', handleOutsideClick)
  window.addEventListener('trueno-auth-expired', handleAuthExpired)
})

onUnmounted(() => {
  window.removeEventListener('click', handleOutsideClick)
  window.removeEventListener('trueno-auth-expired', handleAuthExpired)
})
</script>

<style>
#trueno-app { min-height: 100vh; }

.is-login-layout {
  background: var(--bg-primary);
}

.login-layout-main {
  padding: 0 !important;
  margin: 0 !important;
  max-width: 100% !important;
  min-height: 100vh;
}

/* ---- Navbar ---- */
.navbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: var(--navbar-height);
  background: rgba(10, 10, 15, 0.95);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  z-index: 500;
}
.navbar-left { display: flex; align-items: center; gap: 16px; }
.navbar-center { flex: 1; text-align: center; }
.current-section {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 1px;
  text-transform: uppercase;
}
.navbar-right { display: flex; align-items: center; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; }
.brand-logo-img {
  height: 38px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 8px rgba(216, 235, 52, 0.3));
  transition: var(--transition);
}
.brand:hover .brand-logo-img {
  transform: scale(1.05);
}
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 1.5px;
}
.brand-sub {
  font-family: var(--font-brand);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--cyan);
}
.brand-accent { color: var(--accent); }

/* User Menu & Dropdown */
.user-menu-container {
  position: relative;
}

.user-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
  user-select: none;
}
.user-badge:hover { 
  border-color: var(--accent); 
  background: var(--bg-card-hover);
}
.user-icon { display:flex; align-items:center; color: var(--accent); }
.user-name { font-weight: 600; }

.user-role-pill {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--cyan);
  background: var(--cyan-subtle);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  border: 1px solid rgba(0, 184, 230, 0.25);
}

.user-chevron {
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.chevron-rotated {
  transform: rotate(180deg);
}

.user-dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 230px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(216, 235, 52, 0.08);
  padding: 12px;
  z-index: 600;
  animation: dropdownIn 0.2s ease-out;
}

@keyframes dropdownIn {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-dropdown-header {
  padding: 6px 8px 10px 8px;
}

.udh-name {
  font-family: var(--font-brand);
  font-weight: 700;
  font-size: 14px;
  color: var(--text-primary);
}

.udh-email {
  font-size: 12px;
  color: var(--text-secondary);
  word-break: break-all;
  margin-top: 2px;
}

.udh-role {
  display: inline-block;
  margin-top: 6px;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--accent);
  background: var(--accent-subtle);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.user-dropdown-divider {
  height: 1px;
  background: var(--border-color);
  margin: 6px 0;
}

.user-dropdown-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition);
}

.user-dropdown-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.user-dropdown-item.logout-btn:hover {
  background: var(--danger-bg);
  color: var(--danger);
}

.dropdown-fade-enter-active,
.dropdown-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* ---- Hamburger ---- */
.hamburger-btn {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}
.hamburger-btn span {
  display: block;
  width: 22px;
  height: 2px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: var(--transition);
  transform-origin: center;
}
.hamburger-btn:hover span { background: var(--accent); }
.hamburger-btn.active span:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
.hamburger-btn.active span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.hamburger-btn.active span:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

/* ---- Sidebar ---- */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(2px);
  z-index: 600;
}
.sidebar {
  position: fixed;
  top: 0; left: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  z-index: 700;
  display: flex;
  flex-direction: column;
  box-shadow: 4px 0 30px rgba(0,0,0,0.5);
}
.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 16px;
  border-bottom: 1px solid var(--border-color);
}
.sidebar-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}
.sidebar-logo-img {
  height: 44px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(216, 235, 52, 0.35));
}
.sidebar-brand-name {
  font-family: var(--font-brand);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--text-primary);
}
.sidebar-brand-sub { font-size: 11px; font-weight: 700; color: var(--cyan); letter-spacing: 1.5px; }
.sidebar-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  padding: 4px;
  transition: var(--transition);
}
.sidebar-close:hover { color: var(--danger); }
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: var(--transition);
  position: relative;
}
.nav-item:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}
.nav-item.router-link-exact-active {
  background: var(--accent-subtle);
  color: var(--accent);
  border: 1px solid rgba(255,69,0,0.2);
}
.nav-icon { display:flex; align-items:center; flex-shrink:0; }
.nav-label { flex: 1; }
.nav-badge {
  background: var(--danger);
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 10px;
  min-width: 20px;
  text-align: center;
}
.sidebar-footer { padding: 16px; border-top: 1px solid var(--border-color); }
.sidebar-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.mini-stat {
  background: var(--bg-card);
  border-radius: var(--radius-md);
  padding: 10px;
  text-align: center;
}
.mini-stat-label { display: block; font-size: 10px; color: var(--text-muted); text-transform: uppercase; margin-bottom: 4px; }
.mini-stat-value { display: block; font-family: var(--font-brand); font-size: 14px; font-weight: 700; }

/* ---- Main ---- */
.main-content {
  padding-top: var(--navbar-height);
  min-height: 100vh;
  transition: var(--transition);
}

/* ---- Sidebar Transitions ---- */
.sidebar-slide-enter-active,
.sidebar-slide-leave-active { transition: transform 0.3s ease; }
.sidebar-slide-enter-from,
.sidebar-slide-leave-to { transform: translateX(-100%); }

.overlay-fade-enter-active,
.overlay-fade-leave-active { transition: opacity 0.3s ease; }
.overlay-fade-enter-from,
.overlay-fade-leave-to { opacity: 0; }

/* ---- Page Transition ---- */
.page-fade-enter-active, .page-fade-leave-active { transition: opacity 0.2s ease; }
.page-fade-enter-from, .page-fade-leave-to { opacity: 0; }

/* ---- Notif Transition ---- */
.notif-enter-active { animation: notifIn 0.35s ease; }
.notif-leave-active { animation: notifOut 0.35s ease forwards; }

/* ---- Responsive Navbar & Brand ---- */
@media (max-width: 768px) {
  .navbar {
    padding: 0 12px;
  }
  .navbar-left {
    gap: 10px;
  }
  .navbar-center {
    display: none;
  }
  .brand-logo-img {
    height: 30px;
    max-width: 44px;
  }
  .brand-name {
    font-size: 13px;
    letter-spacing: 1px;
  }
  .brand-sub {
    font-size: 8px;
    letter-spacing: 1.2px;
  }
  .user-badge {
    padding: 6px 10px;
    font-size: 12px;
  }
}

@media (max-width: 420px) {
  .navbar {
    padding: 0 10px;
  }
  .navbar-left {
    gap: 8px;
  }
  .brand-logo-img {
    height: 26px;
    max-width: 38px;
  }
  .brand-name {
    font-size: 12px;
    letter-spacing: 0.5px;
  }
  .brand-sub {
    font-size: 8px;
    letter-spacing: 1px;
  }
  .user-badge .user-name {
    display: none;
  }
  .user-badge {
    padding: 6px;
    border-radius: 50%;
  }
}
</style>
