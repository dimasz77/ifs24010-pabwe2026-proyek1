import { api } from './api';

export const listRentals = (params) => api.get('/rentals', params);
export const listRentalCustomers = (params) => api.get('/customers', params);
export const listAvailableMotorcycles = (params) => api.get('/motorcycles', params);
export const getRental = (id) => api.get(`/rentals/${id}`);
export const getRentalQuote = (params) => api.get('/rentals/quote', params);
export const createRental = (payload) => api.post('/rentals', payload);
export const updateRental = (id, payload) => api.put(`/rentals/${id}`, payload);
export const updateRentalStatus = (id, payload) => api.patch(`/rentals/${id}/status`, payload);
export const deleteRental = (id) => api.del(`/rentals/${id}`);
