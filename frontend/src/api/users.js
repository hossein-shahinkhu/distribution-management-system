import client from './client';

export const usersApi = {
  getAll: () => client.get('/auth/users'),
  register: (data) => client.post('/auth/register', data),
  update: (id, data) => client.patch(`/auth/users/${id}`, data),
};
