import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { sellerAPI } from '../api/seller';
import { getApiErrorMessage } from '../utils/api';
import { AUTH_STORAGE_TYPE, setStoredTokens, clearStoredTokens, getStoredAccessToken } from '../api/client';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);

      // Optimisation: skip validation if we are in storage mode and don't have an access token
      if (AUTH_STORAGE_TYPE !== 'cookie' && !getStoredAccessToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      
      const response = await authAPI.validateToken();
      
      if (response && response.success && response.data) {
        setUser(response.data);
      } else {
        setUser(null);
        if (response && response.message) {
          setError(response.message);
        }
      }
    } catch (error) {
      console.error('Auth validation error:', error);
      setUser(null);
      // Don't set error for validation failures as they're expected when not logged in
      if (error.message && !error.message.includes('401')) {
        setError(error.message || 'Authentication failed');
      }
    } finally {
      setLoading(false);
    }
  };

  // signIn: back office (email + password) and seller app (phone + PIN) share
  // everything after the credentials check.
  const signIn = async (request) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await request();
      
      if (response && response.success) {
        // Save tokens if we are using storage mode
        if (AUTH_STORAGE_TYPE !== 'cookie' && response.data) {
          const { access_token, refresh_token } = response.data;
          setStoredTokens(access_token, refresh_token);
        }

        // After successful login, validate the token to get user data
        const validateResponse = await authAPI.validateToken();
        
        if (validateResponse && validateResponse.success && validateResponse.data) {
          setUser(validateResponse.data);
          return { success: true };
        } else {
          setUser(null);
          return { success: false, error: 'Login successful but user validation failed' };
        }
      } else {
        setUser(null);
        const errorMessage = getApiErrorMessage(
          { message: response?.message, status: 200 },
          response?.message || 'Kirish amalga oshmadi'
        );
        setError(errorMessage);
        return { 
          success: false, 
          error: errorMessage
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      // handleApiError already resolves the server message into error.message.
      const errorMessage = getApiErrorMessage(error, error?.message || 'Tarmoq xatosi');
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  const login = (email, password) => signIn(() => authAPI.login(email, password));
  const pinLogin = (phone, pin) => signIn(() => sellerAPI.pinLogin(phone, pin));

  const logout = async () => {
    try {
      setLoading(true);
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens from storage if using storage mode
      if (AUTH_STORAGE_TYPE !== 'cookie') {
        clearStoredTokens();
      }
      setUser(null);
      setError(null);
      setLoading(false);
      navigate(user?.role === 'seller' ? '/m/login' : '/login');
    }
  };

  // Single source of truth for "is this session authenticated".
  // `error` is deliberately not part of it: a transient network failure while
  // already signed in must not log the user out. ProtectedRoute in App.jsx
  // gates on the same `loading`/`user` pair.
  const isAuthenticated = () => !loading && !!user;

  const refreshAuth = async () => {
    await checkAuthStatus();
  };

  return {
    user,
    loading,
    error,
    login,
    pinLogin,
    logout,
    isAuthenticated,
    refreshAuth,
  };
}; 