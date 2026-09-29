import api from './client';
import { validateApiResponse } from '../utils/api';

// Seller side of employees. CRUD stays in financeAPI (/finance/employees).
export const employeesAPI = {
  // Open to cashiers: the checkout seller picker.
  getSellers: async () => {
    const response = await api.get('/employees/sellers');
    return validateApiResponse(response.data);
  },

  // params: { start_date, end_date } (YYYY-MM-DD, inclusive)
  getKpi: async (params = {}) => {
    const response = await api.get('/employees/kpi', { params });
    return validateApiResponse(response.data);
  },

  getEmployeeKpi: async (id, params = {}) => {
    const response = await api.get(`/employees/${id}/kpi`, { params });
    return validateApiResponse(response.data);
  },
};
