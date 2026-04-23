import api from './api';

export const dashboardService = {
  getAgentDashboard: () => api.get('/agent/dashboard'),
};
