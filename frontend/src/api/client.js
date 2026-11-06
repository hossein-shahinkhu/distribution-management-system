import axios from 'axios';
import { FINANCIAL_CHANGE } from '../utils/financial';

const client = axios.create({
  baseURL: '/api',
  timeout: 20000,
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => {
    if (['post', 'put', 'patch', 'delete'].includes(response.config.method) &&
        /\/(treasury|invoices|orders|customers)(\/|$)/.test(response.config.url || '')) {
      window.dispatchEvent(new Event(FINANCIAL_CHANGE));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
