import client from './client';

export const purchaseOrdersApi = {
  getAll: (params = {}) => client.get('/purchase-orders', { params }),
  getOne: (id) => client.get(`/purchase-orders/${id}`),
  create: (data) => client.post('/purchase-orders', data),
  updateStatus: (id, status) => client.patch(`/purchase-orders/${id}/status`, { status }),
};
