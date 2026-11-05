// =====================================================================
// TRUENO 219 - Pinia Products Store
// Connected directly to Axios API
// =====================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { ProductsService } from '../services/index.js';

export const useProductStore = defineStore('products', () => {
  const products = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  const totalProducts = computed(() => products.value.length);
  const lowStockProducts = computed(() =>
    products.value.filter((p) => (Number(p.stock) || 0) <= (Number(p.minStock) || 5))
  );

  async function fetchProducts() {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await ProductsService.getAll({ all: 'true' });
      products.value = data.map((p) => ({
        ...p,
        id: p.originalId || p.id || p._id,
      }));
      return products.value;
    } catch (err) {
      error.value = err.message;
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function createProduct(productData) {
    const created = await ProductsService.create(productData);
    const normalized = {
      ...created,
      id: created.originalId || created.id || created._id,
    };
    products.value.push(normalized);
    return normalized;
  }

  async function updateProduct(id, productData) {
    const updated = await ProductsService.update(id, productData);
    const normalized = {
      ...updated,
      id: updated.originalId || updated.id || updated._id,
    };
    const index = products.value.findIndex((p) => p.id === id || p._id === id);
    if (index !== -1) {
      products.value[index] = normalized;
    }
    return normalized;
  }

  async function deleteProduct(id) {
    await ProductsService.delete(id);
    products.value = products.value.filter((p) => p.id !== id && p._id !== id);
  }

  return {
    products,
    isLoading,
    error,
    totalProducts,
    lowStockProducts,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
  };
});

