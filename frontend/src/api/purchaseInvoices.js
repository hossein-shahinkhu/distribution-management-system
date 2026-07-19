import client from './client';

export const purchaseInvoicesApi = {
  getAll: (params = {}) => client.get('/purchase-invoices', { params }),
  getOne: (id) => client.get(`/purchase-invoices/${id}`),
  create: (data) => client.post('/purchase-invoices', data),
};
