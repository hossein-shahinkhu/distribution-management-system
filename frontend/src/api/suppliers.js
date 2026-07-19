import client from './client';

export const suppliersApi = {
  getAll: (params = {}) => client.get('/suppliers', { params }),
  getOne: (id) => client.get(`/suppliers/${id}`),
  create: (data) => client.post('/suppliers', data),
  update: (id, data) => client.put(`/suppliers/${id}`, data),
  remove: (id) => client.delete(`/suppliers/${id}`),
};
