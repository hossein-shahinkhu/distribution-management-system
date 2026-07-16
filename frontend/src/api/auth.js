import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  me: () => client.get('/auth/me'),
  changePassword: (current_password, new_password) =>
    client.patch('/auth/change-password', { current_password, new_password }),
};
