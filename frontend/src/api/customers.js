import client from './client';

export const customersApi = {
  getAll: (params = {}) => client.get('/customers', { params }),
  getOne: (id) => client.get(`/customers/${id}`),
  create: (data) => client.post('/customers', data),
  update: (id, data) => client.put(`/customers/${id}`, data),
  remove: (id) => client.delete(`/customers/${id}`),
};
