<template>
  <div class="login-wrapper">
    <div class="login-bg-glow glow-1"></div>
    <div class="login-bg-glow glow-2"></div>

    <div class="login-card">
      <div class="login-header">
        <div class="login-brand">
          <img src="/img/logo-trueno.png" alt="Tuning 219 Trueno" class="login-logo-img" />
          <div class="brand-text">
            <h1 class="brand-name">TUNING <span class="brand-accent">219</span></h1>
            <span class="brand-sub">TRUENO MOTOS</span>
          </div>
        </div>
        <p class="login-subtitle">Sistema de Control de Inventario y Ventas</p>
      </div>

      <!-- Error Alert -->
      <transition name="fade">
        <div v-if="errorMessage" class="login-alert alert-danger" role="alert">
          <AlertCircle :size="18" class="alert-icon" />
          <div class="alert-content">
            <span class="alert-title">Acceso Denegado</span>
            <span class="alert-message">{{ errorMessage }}</span>
          </div>
        </div>
      </transition>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label" for="login-email">Correo Electrónico</label>
          <div class="input-with-icon">
            <Mail :size="18" class="field-icon" />
            <input
              id="login-email"
              v-model="email"
              type="email"
              class="form-control"
              placeholder="admin@trueno219.com"
              required
              autocomplete="email"
              :disabled="isLoading"
              autofocus
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="login-password">Contraseña</label>
          <div class="input-with-icon">
            <Lock :size="18" class="field-icon" />
            <input
              id="login-password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-control"
              placeholder="••••••••••••"
              required
              autocomplete="current-password"
              :disabled="isLoading"
            />
            <button
              type="button"
              class="toggle-password-btn"
              @click="showPassword = !showPassword"
              tabindex="-1"
              aria-label="Mostrar u ocultar contraseña"
            >
              <EyeOff v-if="showPassword" :size="18" />
              <Eye v-else :size="18" />
            </button>
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary login-btn"
          :disabled="isLoading || !email || !password"
        >
          <span v-if="isLoading" class="spinner"></span>
          <LogIn v-else :size="18" />
          <span>{{ isLoading ? 'Verificando...' : 'Iniciar Sesión' }}</span>
        </button>
      </form>

      <div class="login-footer">
        <span class="footer-badge">Seguridad 256-bit</span>
        <span class="footer-info">Acceso exclusivo para personal autorizado de Trueno 219</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AuthService from '../services/auth.service.js';
import store from '../stores/store.js';
import { Mail, Lock, LogIn, AlertCircle, Eye, EyeOff } from '@lucide/vue';

const router = useRouter();
const route = useRoute();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isLoading = ref(false);
const errorMessage = ref('');

const handleLogin = async () => {
  if (isLoading.value) return;
  errorMessage.value = '';
  isLoading.value = true;

  try {
    await AuthService.login(email.value.trim(), password.value);
    await store.init();
    const redirectPath = route.query.redirect || '/';
    router.push(redirectPath);
  } catch (err) {
    if (err.isNetworkError) {
      errorMessage.value = 'No se pudo conectar con el servidor backend. Verifique que esté activo en el puerto 3001.';
    } else if (err.status === 403 || err.message?.includes('desactivad')) {
      errorMessage.value = 'Su cuenta ha sido desactivada. Comuníquese con el administrador del sistema.';
    } else if (err.status === 401 || err.status === 422 || err.message?.includes('Credenciales')) {
      errorMessage.value = 'Credenciales inválidas. Por favor verifique correo y contraseña.';
    } else {
      errorMessage.value = err.message || 'Error al iniciar sesión. Inténtelo nuevamente.';
    }
    password.value = '';
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: var(--bg-primary);
  background-image: 
    radial-gradient(ellipse at 50% 0%, rgba(216, 235, 52, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 50% 100%, rgba(0, 184, 230, 0.06) 0%, transparent 60%);
  position: relative;
  overflow: hidden;
}

.login-bg-glow {
  position: absolute;
  width: 450px;
  height: 450px;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  opacity: 0.18;
}

.glow-1 {
  top: -100px;
  left: 20%;
  background: var(--accent);
}

.glow-2 {
  bottom: -100px;
  right: 20%;
  background: var(--cyan);
}

.login-card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 440px;
  background: rgba(18, 20, 31, 0.92);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: 40px 36px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.65), 0 0 30px rgba(216, 235, 52, 0.05);
  transition: var(--transition);
}

.login-card:hover {
  border-color: rgba(216, 235, 52, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 28px;
}

.login-brand {
  display: inline-flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}

.login-logo-img {
  height: 48px;
  width: auto;
  object-fit: contain;
  filter: drop-shadow(0 0 12px rgba(216, 235, 52, 0.45));
}

.brand-name {
  font-family: var(--font-brand);
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 2px;
  color: var(--text-primary);
  line-height: 1.1;
}

.brand-accent {
  color: var(--accent);
}

.brand-sub {
  font-family: var(--font-brand);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--cyan);
}

.login-subtitle {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.3px;
}

/* Alert */
.login-alert {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  margin-bottom: 22px;
  animation: slideDown 0.25s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.alert-danger {
  background: var(--danger-bg);
  border: 1px solid rgba(255, 59, 92, 0.35);
  color: #ff94a5;
}

.alert-icon {
  color: var(--danger);
  flex-shrink: 0;
  margin-top: 2px;
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.alert-title {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--danger);
}

.alert-message {
  font-size: 13px;
  line-height: 1.4;
  color: #ffc2cc;
}

/* Form */
.login-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.input-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.input-with-icon .field-icon {
  position: absolute;
  left: 14px;
  color: var(--text-muted);
  pointer-events: none;
  transition: var(--transition);
}

.input-with-icon .form-control {
  width: 100%;
  padding-left: 42px;
  padding-right: 42px;
  height: 48px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  transition: var(--transition);
}

.input-with-icon .form-control:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(216, 235, 52, 0.15);
  outline: none;
}

.input-with-icon .form-control:focus ~ .field-icon {
  color: var(--accent);
}

.toggle-password-btn {
  position: absolute;
  right: 12px;
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  transition: var(--transition);
}

.toggle-password-btn:hover {
  color: var(--accent);
}

.login-btn {
  width: 100%;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 10px;
  font-size: 15px;
  font-weight: 700;
  font-family: var(--font-brand);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.login-btn:hover:not(:disabled) {
  box-shadow: 0 4px 20px rgba(216, 235, 52, 0.4);
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(10, 11, 16, 0.3);
  border-radius: 50%;
  border-top-color: #0a0b10;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.login-footer {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  text-align: center;
}

.footer-badge {
  font-size: 10px;
  font-family: var(--font-brand);
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--cyan);
  background: var(--cyan-subtle);
  padding: 3px 10px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(0, 184, 230, 0.25);
}

.footer-info {
  font-size: 11px;
  color: var(--text-muted);
}
</style>

