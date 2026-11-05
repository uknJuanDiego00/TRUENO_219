// =====================================================================
// TRUENO 219 - Centralized Axios API Client
// Provides HTTP instance, interceptors, auth headers & error handling
// =====================================================================

import axios from 'axios';

// Get base URL from environment variable, fallback to local backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

/**
 * Axios instance configured for TRUENO API
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Request Interceptor: Injects JWT Bearer Token if present
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('trueno_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor: Manages 401s, session expiration & standard error format
 */
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      if (status === 401) {
        localStorage.removeItem('trueno_token');
        localStorage.removeItem('trueno_user');
        window.dispatchEvent(
          new CustomEvent('trueno-auth-expired', {
            detail: { message: data?.message || 'Sesión expirada. Inicie sesión nuevamente.' },
          })
        );
      }

      const formattedError = new Error(data?.message || error.message || 'Error en la solicitud');
      formattedError.status = status;
      formattedError.data = data;
      formattedError.details = data?.errors || data?.error;
      return Promise.reject(formattedError);
    } else if (error.request) {
      // Network error or timeout
      const netError = new Error(
        'No se pudo conectar con el servidor backend. Verifique que esté activo y con conexión a Internet.'
      );
      netError.isNetworkError = true;
      return Promise.reject(netError);
    }

    return Promise.reject(error);
  }
);

/**
 * ApiClient wrapper for existing services and convenient CRUD methods
 */
export class ApiClient {
  static getToken() {
    return localStorage.getItem('trueno_token');
  }

  static get client() {
    return api;
  }

  static async get(endpoint, params = {}, options = {}) {
    const response = await api.get(endpoint, { params, ...options });
    return response.data;
  }

  static async post(endpoint, body = {}, options = {}) {
    const response = await api.post(endpoint, body, options);
    return response.data;
  }

  static async put(endpoint, body = {}, options = {}) {
    const response = await api.put(endpoint, body, options);
    return response.data;
  }

  static async patch(endpoint, body = {}, options = {}) {
    const response = await api.patch(endpoint, body, options);
    return response.data;
  }

  static async delete(endpoint, options = {}) {
    const response = await api.delete(endpoint, options);
    return response.data;
  }
}

export default ApiClient;
