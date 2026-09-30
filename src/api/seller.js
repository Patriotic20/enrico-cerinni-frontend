import api from './client';
import { validateApiResponse } from '../utils/api';

const data = (response) => validateApiResponse(response.data);

// Seller mobile app (/m). Signed in with phone + PIN.
export const sellerAPI = {
  pinLogin: async (phone, pin) => data(await api.post('/auth/pin-login', { phone, pin })),
  // Own KPI; params: { start_date, end_date } (YYYY-MM-DD), default this month
  getMe: async (params = {}) => data(await api.get('/seller/me', { params })),
  getCarts: async () => data(await api.get('/seller/carts')),
  // { client_id, notes, items: [{ product_variant_id, quantity }] } — reserves stock
  createCart: async (cart) => data(await api.post('/seller/carts', cart)),
  cancelCart: async (id) => data(await api.delete(`/seller/carts/${id}`)),
};

// Till side: carts sellers sent over. Paying one is salesAPI.createSale with cart_id.
export const cartsAPI = {
  getPending: async () => data(await api.get('/carts/')),
  cancel: async (id) => data(await api.delete(`/carts/${id}`)),
};
