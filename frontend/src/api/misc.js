import client from './client';

export const invoicesApi = {
  getAll: () => client.get('/invoices'),
  getOne: (id) => client.get(`/invoices/${id}`),
  createFromOrder: (order_id) => client.post('/invoices', { order_id }),
  updatePaymentStatus: (id, payment_status) =>
    client.patch(`/invoices/${id}/payment-status`, { payment_status }),
};

export const distributorsApi = {
  getAll: () => client.get('/distributors'),
  create: (data) => client.post('/distributors', data),
  update: (id, data) => client.put(`/distributors/${id}`, data),
  remove: (id) => client.delete(`/distributors/${id}`),
};

export const reportsApi = {
  sales: (params) => client.get('/reports/sales', { params }),
  inventory: () => client.get('/reports/inventory'),
  distributorPerformance: () => client.get('/reports/distributor-performance'),
};
