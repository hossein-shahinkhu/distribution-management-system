import client from './client';

export const customersApi = {
  getAll:          (params = {}) => client.get('/customers', { params }),
  getOne:          (id)          => client.get(`/customers/${id}`),
  getCreditUsage:  (id)          => client.get(`/customers/${id}/credit-usage`),
  getStatement:    (id, params = {}) => client.get(`/customers/${id}/statement`, { params }),
  create:          (data)        => client.post('/customers', data),
  update:          (id, data)    => client.put(`/customers/${id}`, data),
  remove:          (id)          => client.delete(`/customers/${id}`),
};
