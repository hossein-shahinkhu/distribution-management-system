import client from './client';

export const invoicesApi = {
  getAll: () => client.get('/invoices'),
  getOne: (id) => client.get(`/invoices/${id}`),
  createFromOrder: (order_id, tax_rate) =>
    client.post('/invoices', { order_id, ...(tax_rate !== undefined ? { tax_rate } : {}) }),
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
  commissions: (params) => client.get('/reports/commissions', { params }),
  treasuryBalance: (params) => client.get('/reports/treasury-balance', { params }),
  purchasing: (params) => client.get('/reports/purchasing', { params }),
  overview: () => client.get('/reports/overview'),
};

export const routesApi = {
  getAll: () => client.get('/routes'),
  create: (data) => client.post('/routes', data),
  update: (id, data) => client.put(`/routes/${id}`, data),
  remove: (id) => client.delete(`/routes/${id}`),
};

export const treasuryApi = {
  getAll: (params = {}) => client.get('/treasury', { params }),
  create: (data) => client.post('/treasury', data),
  void: (id) => client.patch(`/treasury/${id}/void`),
};
