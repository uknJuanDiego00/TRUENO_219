import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import AuthService from './services/auth.service.js'

// Views
import Login from './views/Login.vue'
import Dashboard from './views/Dashboard.vue'
import Inventory from './views/Inventory.vue'
import Sales from './views/Sales.vue'
import Clients from './views/Clients.vue'
import Debts from './views/Debts.vue'
import SalesHistory from './views/SalesHistory.vue'
import Settings from './views/Settings.vue'

const routes = [
  { path: '/login', component: Login, meta: { title: 'Iniciar Sesión', requiresAuth: false } },
  { path: '/', component: Dashboard, meta: { title: 'Dashboard', requiresAuth: true } },
  { path: '/inventario', component: Inventory, meta: { title: 'Inventario', requiresAuth: true } },
  { path: '/ventas', component: Sales, meta: { title: 'Nueva Venta', requiresAuth: true } },
  { path: '/clientes', component: Clients, meta: { title: 'Clientes', requiresAuth: true } },
  { path: '/deudas', component: Debts, meta: { title: 'Deudas', requiresAuth: true } },
  { path: '/historial', component: SalesHistory, meta: { title: 'Historial de Ventas', requiresAuth: true } },
  { path: '/configuracion', component: Settings, meta: { title: 'Configuración', requiresAuth: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// Navigation Guard for Secure Route Protection
router.beforeEach(async (to, from, next) => {
  document.title = to.meta?.title ? `${to.meta.title} — Trueno 219` : 'Trueno 219';

  const requiresAuth = to.matched.some(record => record.meta.requiresAuth !== false);
  const token = AuthService.getToken();

  if (!requiresAuth) {
    if (token && to.path === '/login') {
      return next('/');
    }
    return next();
  }

  // Route requires authentication
  if (!token) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }

  // Validate session against backend
  try {
    const user = await AuthService.getMe();
    if (!user || user.is_active === false) {
      AuthService.clearSession();
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
    return next();
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      AuthService.clearSession();
      return next({ path: '/login', query: { redirect: to.fullPath } });
    }
    // In case of backend connection loss, allow if cached profile exists
    const cachedUser = AuthService.getUser();
    if (cachedUser && cachedUser.is_active !== false) {
      return next();
    }
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }
})

const app = createApp(App)
app.use(router)
app.mount('#app')
