import axios from 'axios';
import { handleApiError } from '../utils/api';
import logger from '../utils/logger';

const getBaseURL = () => {
  // Priority order:
  //   1. window.__APP_CONFIG__.apiUrl  — injected at container startup via docker-entrypoint.sh
  //      (runtime, no rebuild required — the correct approach for Railway deployments)
  //   2. import.meta.env.VITE_API_URL  — baked in at build time (local dev / CI overrides)
  //   3. Hard-coded public backend domain as a last-resort fallback
  let url =
    (typeof window !== 'undefined' && window.__APP_CONFIG__?.apiUrl) ||
    import.meta.env.VITE_API_URL ||
    'https://api.enrico.uz';

  // Normalise bare hostnames that are missing a protocol
  if (url && !url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('/')) {
    url = `https://${url}`;
  }
  return url;
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // Increased timeout for better reliability
});


export const AUTH_STORAGE_TYPE = 'localStorage'; // Options: 'localStorage', 'sessionStorage', 'cookie'

const getStorage = () => {
  if (typeof window === 'undefined') return null;
  if (AUTH_STORAGE_TYPE === 'localStorage') return window.localStorage;
  if (AUTH_STORAGE_TYPE === 'sessionStorage') return window.sessionStorage;
  return null;
};

export const getStoredAccessToken = () => {
  const storage = getStorage();
  return storage ? storage.getItem('access_token') : null;
};

export const getStoredRefreshToken = () => {
  const storage = getStorage();
  return storage ? storage.getItem('refresh_token') : null;
};

export const setStoredTokens = (accessToken, refreshToken) => {
  const storage = getStorage();
  if (storage) {
    if (accessToken) storage.setItem('access_token', accessToken);
    if (refreshToken) storage.setItem('refresh_token', refreshToken);
  }
};

export const clearStoredTokens = () => {
  const storage = getStorage();
  if (storage) {
    storage.removeItem('access_token');
    storage.removeItem('refresh_token');
  }
};

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(
  (config) => {
    logger.debug('API Request', {
      url: config.url,
      method: config.method,
      baseURL: config.baseURL,
      withCredentials: config.withCredentials,
    });

    // Inject Authorization header if we use storage and have an access token
    if (AUTH_STORAGE_TYPE !== 'cookie') {
      const token = getStoredAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => {
    logger.error('Request interceptor error', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    logger.debug('API Response', {
      url: response.config.url,
      status: response.status,
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    logger.error('API Error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.message,
      // Full response body only in dev — avoid leaking payloads to prod console
      ...(import.meta.env.MODE !== 'production' && { data: error.response?.data }),
    });

    if (error.response?.status === 401 && !originalRequest._retry) {
      // Check if we use token storage and the request is not already a refresh attempt
      if (AUTH_STORAGE_TYPE !== 'cookie' && originalRequest.url && !originalRequest.url.includes('/auth/refresh')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers['Authorization'] = 'Bearer ' + token;
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = getStoredRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token available in storage');
          }

          logger.info('Attempting silent token refresh using storage...');
          // Use a clean axios instance to avoid loops
          const response = await axios.post(`${getBaseURL()}/auth/refresh`, {
            refresh_token: refreshToken
          }, {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true
          });

          if (response.data && response.data.success && response.data.data) {
            const { access_token, refresh_token } = response.data.data;
            setStoredTokens(access_token, refresh_token);

            api.defaults.headers.common['Authorization'] = 'Bearer ' + access_token;
            originalRequest.headers['Authorization'] = 'Bearer ' + access_token;

            processQueue(null, access_token);
            isRefreshing = false;

            return api(originalRequest);
          } else {
            throw new Error('Token refresh response did not return new tokens');
          }
        } catch (refreshError) {
          logger.error('Silent token refresh failed, logging out...', refreshError);
          processQueue(refreshError, null);
          isRefreshing = false;
          clearStoredTokens();
          // Redirect to login page
          window.location.href = '/login';
          return Promise.reject(handleApiError(error));
        }
      }

      logger.info('401 Unauthorized - session expired');
    }

    return Promise.reject(handleApiError(error));
  }
);

export const apiClient = {
  get: async (url, config = {}) => {
    try {
      const response = await api.get(url, config);
      return response;
    } catch (error) {
      throw error;
    }
  },

  post: async (url, data = {}, config = {}) => {
    try {
      const response = await api.post(url, data, config);
      return response;
    } catch (error) {
      throw error;
    }
  },

  put: async (url, data = {}, config = {}) => {
    try {
      const response = await api.put(url, data, config);
      return response;
    } catch (error) {
      throw error;
    }
  },

  patch: async (url, data = {}, config = {}) => {
    try {
      const response = await api.patch(url, data, config);
      return response;
    } catch (error) {
      throw error;
    }
  },

  delete: async (url, config = {}) => {
    try {
      const response = await api.delete(url, config);
      return response;
    } catch (error) {
      throw error;
    }
  },
};

export default api; 