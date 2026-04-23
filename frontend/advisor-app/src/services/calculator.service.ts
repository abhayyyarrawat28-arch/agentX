import api from './api';

export const calculatorService = {
  forwardCalc: (data: any) => api.post('/calculator/forward', data),
  forwardCalcBulk: (data: any) => api.post('/calculator/forward/bulk', data),
  reverseCalc: (data: any) => api.post('/calculator/reverse', data),
  mdrtTracker: (data?: any) => data ? api.post('/calculator/mdrt', data) : api.get('/calculator/mdrt'),
  activityPredictor: (data: any) => api.post('/calculator/activity', data),
};
