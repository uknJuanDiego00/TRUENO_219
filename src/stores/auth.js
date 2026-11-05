// =====================================================================
// TRUENO 219 - Pinia Auth Store
// Connected directly to Axios API
// =====================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthService } from '../services/auth.service.js';

export const useAuthStore = defineStore('auth', () => {
  const user = ref(AuthService.getUser());
  const token = ref(AuthService.getToken());
  const isLoading = ref(false);
  const error = ref(null);

  const isAuthenticated = computed(() => Boolean(token.value));
  const isAdmin = computed(() => user.value?.role === 'admin');

  async function login(email, password) {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await AuthService.login(email, password);
      user.value = data.user;
      token.value = data.token;
      return data;
    } catch (err) {
      error.value = err.message || 'Error al iniciar sesión';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchCurrentUser() {
    if (!token.value) return null;
    try {
      const currentUser = await AuthService.getMe();
      if (currentUser) {
        user.value = currentUser;
      }
      return currentUser;
    } catch (err) {
      logout();
      throw err;
    }
  }

  async function logout() {
    await AuthService.logout();
    user.value = null;
    token.value = null;
  }

  return {
    user,
    token,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    login,
    fetchCurrentUser,
    logout,
  };
});

