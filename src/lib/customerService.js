import { api } from './api';

export const listCustomers = (params) => api.get('/customers', params);
export const createCustomer = (payload) => api.post('/customers', payload);
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload);
export const deleteCustomer = (id) => api.del(`/customers/${id}`);
