import api from './api';

export const policyService = {
  list: (params?: any) => api.get('/policies', { params }),
  getById: (id: string) => api.get(`/policies/${id}`),
  bulkCreate: (data: any) => api.post('/policies/bulk', data),
  updateStatus: (id: string, status: string) => api.patch(`/policies/${id}/status`, { status }),
  delete: (id: string) => api.delete(`/policies/${id}`),
};

export const customerService = {
  list: (params?: any) => api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.patch(`/customers/${id}`, data),
};

export const productService = {
  list: () => api.get('/products'),
};
