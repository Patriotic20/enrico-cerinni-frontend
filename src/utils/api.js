import logger from './logger';

export const createApiResponse = (success, data = null, message = '', error = null) => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
});

/**
 * Error thrown by the axios interceptor.
 *
 * It is a real Error (so `instanceof Error`, `.message` and stack traces work)
 * while still exposing the `{ success, data, message }` shape older call sites
 * read, plus `status`/`response` for callers that inspect the HTTP result.
 */
export class ApiError extends Error {
  constructor(message, { status = null, response = null, data = null, cause = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.success = false;
    this.data = data;
    this.status = status;
    this.response = response;
    this.cause = cause;
    this.timestamp = new Date().toISOString();
  }
}

export const handleApiError = (error) => {
  logger.error('API Error', error);
  if (error.response) {
    const { status, data } = error.response;
    const errorMessage = data?.message || data?.detail || `HTTP ${status} error`;
    return new ApiError(errorMessage, { status, response: error.response, cause: error });
  }
  if (error.request) {
    return new ApiError(
      'Serverga ulanishda xatolik. Backend server ishga tushganligini tekshiring.',
      { cause: error }
    );
  }
  return new ApiError(error.message || 'Noma\'lum xatolik', { cause: error });
};

/**
 * Coerce an API payload into an array.
 *
 * List endpoints are inconsistent: some return a bare array, others a paginated
 * `{ items: [...] }` envelope. Rendering code does `.map` on the result, so a
 * shape change must not take the whole page down with it.
 */
export const toArray = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  return [];
};

// Map known backend error messages to Uzbek. Falls back to a generic message.
const BACKEND_MESSAGE_UZ = {
  'Cannot delete product with existing sales':
    'Bu mahsulotni o\'chirib bo\'lmaydi: u sotuvlarda ishlatilgan. Sotuv tarixini saqlash uchun o\'chirish bloklangan.',
  'Client not found': 'Mijoz topilmadi',
  'Payment amount exceeds debt amount':
    'To\'lov summasi qarzdorlikdan ko\'p bo\'lishi mumkin emas',
  'Payment amount must be greater than zero':
    'To\'lov summasi noldan katta bo\'lishi kerak',
  'Sale not found': 'Sotuv topilmadi',
  'Internal server error':
    'Serverda xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.',
};

export const getApiErrorMessage = (error, fallback = 'Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.') => {
  // Interceptor rejects with wrapped { message }, raw axios errors carry response.data.message
  const raw = error?.message || error?.response?.data?.message || error?.response?.data?.detail;

  if (raw && BACKEND_MESSAGE_UZ[raw]) return BACKEND_MESSAGE_UZ[raw];

  // Network failures and timeouts never reach the backend, so there is no
  // server message to translate — the interceptor already produced a localized
  // one. Showing it beats the generic fallback, which hides the real cause.
  if (raw && !error?.status && !error?.response) return raw;

  return fallback;
};

export const validateApiResponse = (response) => {
  if (!response) {
    return createApiResponse(false, null, 'Javob mavjud emas');
  }
  
  if (typeof response === 'object') {
    if (response.success !== undefined) {
      return createApiResponse(response.success, response.data, response.message || 'Operatsiya muvaffaqiyatli');
    }
    
    return createApiResponse(true, response, 'Operatsiya muvaffaqiyatli');
  }
  
  return createApiResponse(false, null, 'Noto\'g\'ri javob formati');
};

export const retryApiCall = async (apiFunction, maxRetries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiFunction();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
}; 