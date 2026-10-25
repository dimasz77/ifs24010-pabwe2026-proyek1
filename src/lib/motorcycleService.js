import { api } from './api';

export const listMotorcycles = (params) => api.get('/motorcycles', params);
export const createMotorcycle = (payload) => api.post('/motorcycles', payload);
export const updateMotorcycle = (id, payload) => api.put(`/motorcycles/${id}`, payload);
export const deleteMotorcycle = (id) => api.del(`/motorcycles/${id}`);
