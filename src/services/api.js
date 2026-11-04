// =====================================================================
// TRUENO 219 - Frontend HTTP Client
// Centralized API client with JWT Bearer authentication & error handling
// =====================================================================

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  static getToken() {
    return localStorage.getItem('trueno_token');
  }

  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const config = {
      ...options,
      headers
    };

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkError) {
      console.error(`[API Network Error] No se pudo conectar a ${url}:`, networkError);
      const error = new Error('No se pudo establecer conexión con el servidor backend. Verifique que esté en ejecución.');
      error.isNetworkError = true;
      throw error;
    }

    let data;
    try {
      data = await response.json();
    } catch {
      data = { message: response.statusText || 'Error en la respuesta del servidor' };
    }

    if (response.status === 401) {
      localStorage.removeItem('trueno_token');
      localStorage.removeItem('trueno_user');
      window.dispatchEvent(new CustomEvent('trueno-auth-expired', { detail: { message: data.message } }));
    }

    if (!response.ok) {
      const error = new Error(data.message || 'Error en la solicitud al servidor');
      error.status = response.status;
      error.details = data.error;
      throw error;
    }

    return data;
  }

  static get(endpoint, params) {
    let url = endpoint;
    if (params) {
      const query = new URLSearchParams(params).toString();
      url += `?${query}`;
    }
    return this.request(url, { method: 'GET' });
  }

  static post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  static patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  }

  static delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export default ApiClient;

