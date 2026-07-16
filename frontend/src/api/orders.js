import client from './client';

export const ordersApi = {
  getAll: (params = {}) => client.get('/orders', { params }),
  getOne: (id) => client.get(`/orders/${id}`),
  create: (data) => client.post('/orders', data),
  updateStatus: (id, status) => client.patch(`/orders/${id}/status`, { status }),
  assignDistributor: (id, distributor_id) =>
    client.patch(`/orders/${id}/assign-distributor`, { distributor_id }),
  convertToOrder: (id) => client.post(`/orders/${id}/convert-to-order`),
};
