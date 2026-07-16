import client from './client';

export const productsApi = {
  getAll: (params = {}) => client.get('/products', { params }),
  getOne: (id) => client.get(`/products/${id}`),
  lowStock: () => client.get('/products/low-stock'),
  create: (data) => client.post('/products', data),
  update: (id, data) => client.put(`/products/${id}`, data),
  remove: (id) => client.delete(`/products/${id}`),
};

export const categoriesApi = {
  getAll: () => client.get('/categories'),
  create: (data) => client.post('/categories', data),
  remove: (id) => client.delete(`/categories/${id}`),
};
