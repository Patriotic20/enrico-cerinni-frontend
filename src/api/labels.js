import api from './client';
import { validateApiResponse } from '../utils/api';

export const labelsAPI = {
  getTemplate: async () => {
    const response = await api.get('/labels/template');
    return validateApiResponse(response.data);
  },

  saveTemplate: async (template) => {
    const response = await api.put('/labels/template', template);
    return validateApiResponse(response.data);
  },
};
