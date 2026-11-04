// =====================================================================
// TRUENO 219 - Frontend Authentication Service
// Manages login, logout, session persistence and backend validation
// =====================================================================

import ApiClient from './api.js';

export const AuthService = {
  /**
   * Authenticates user against backend API
   */
  async login(email, password) {
    const res = await ApiClient.post('/auth/login', { email, password });
    if (res.data?.token) {
      localStorage.setItem('trueno_token', res.data.token);
      localStorage.setItem('trueno_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  /**
   * Validates active session and retrieves updated profile from backend
   */
  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await ApiClient.get('/auth/me');
      if (res.data?.user) {
        localStorage.setItem('trueno_user', JSON.stringify(res.data.user));
        return res.data.user;
      }
      return null;
    } catch (err) {
      this.clearSession();
      throw err;
    }
  },

  /**
   * Real logout: notifies backend and purges local credentials
   */
  async logout() {
    try {
      await ApiClient.post('/auth/logout', {});
    } catch {
      // Best-effort notification to backend
    } finally {
      this.clearSession();
    }
  },

  clearSession() {
    localStorage.removeItem('trueno_token');
    localStorage.removeItem('trueno_user');
  },

  getToken() {
    return localStorage.getItem('trueno_token');
  },

  getUser() {
    try {
      const raw = localStorage.getItem('trueno_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(this.getToken());
  }
};

export default AuthService;

