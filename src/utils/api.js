import logger from './logger';

export const createApiResponse = (success, data = null, message = '', error = null) => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
});

export const handleApiError = (error) => {
  logger.error('API Error', error);
  if (error.response) {
    const { status, data } = error.response;
    const errorMessage = data?.message || data?.detail || `HTTP ${status} error`;
    return createApiResponse(false, null, errorMessage, error);
  }
  if (error.request) {
    return createApiResponse(false, null, 'Serverga ulanishda xatolik. Backend server ishga tushganligini tekshiring.', error);
  }
  return createApiResponse(false, null, error.message || 'Noma\'lum xatolik', error);
};

// Map known backend error messages to Uzbek. Falls back to a generic message.
const BACKEND_MESSAGE_UZ = {
  'Cannot delete product with existing sales':
    'Bu mahsulotni o\'chirib bo\'lmaydi: u sotuvlarda ishlatilgan. Sotuv tarixini saqlash uchun o\'chirish bloklangan.',
};

export const getApiErrorMessage = (error, fallback = 'Xatolik yuz berdi. Iltimos, qaytadan urinib ko\'ring.') => {
  // Interceptor rejects with wrapped { message }, raw axios errors carry response.data.message
  const raw = error?.message || error?.response?.data?.message || error?.response?.data?.detail;
  return (raw && BACKEND_MESSAGE_UZ[raw]) || fallback;
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