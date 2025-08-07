import { useState, useEffect } from 'react';

// Secure token management hook
export const useSecureAuth = () => {
  const [authState, setAuthState] = useState({
    token: null,
    isAuthenticated: false,
    user: null,
    loading: true
  });

  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  // Secure token storage with encryption (basic implementation)
  const setSecureToken = (token, user) => {
    if (token && !isTokenExpired(token)) {
      // In production, consider using a more secure storage mechanism
      // like httpOnly cookies or encrypted localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
      
      setAuthState({
        token,
        user,
        isAuthenticated: true,
        loading: false
      });
    }
  };

  // Get token with validation
  const getSecureToken = () => {
    const token = localStorage.getItem('auth_token');
    
    if (token && isTokenExpired(token)) {
      // Token expired, clear storage
      clearAuth();
      return null;
    }
    
    return token;
  };

  // Clear authentication data
  const clearAuth = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    localStorage.removeItem('is_admin');
    
    setAuthState({
      token: null,
      isAuthenticated: false,
      user: null,
      loading: false
    });
  };

  // Auto-logout when token expires
  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem('auth_token');
      if (token && isTokenExpired(token)) {
        clearAuth();
        // Optionally show a message to user
        console.warn('Session expired. Please login again.');
      }
    };

    // Check token expiry every minute
    const interval = setInterval(checkTokenExpiry, 60000);
    
    // Initial check
    const token = getSecureToken();
    if (token) {
      const userData = localStorage.getItem('user_data');
      setAuthState({
        token,
        user: userData ? JSON.parse(userData) : null,
        isAuthenticated: true,
        loading: false
      });
    } else {
      setAuthState(prev => ({ ...prev, loading: false }));
    }

    return () => clearInterval(interval);
  }, []);

  return {
    ...authState,
    setSecureToken,
    getSecureToken,
    clearAuth,
    isTokenExpired
  };
};

// Input sanitization hook
export const useInputSanitizer = () => {
  const sanitizeInput = (input) => {
    if (typeof input !== 'string') return input;
    
    // Basic XSS prevention
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .trim();
  };

  const sanitizeEmail = (email) => {
    // Email validation and sanitization
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = sanitizeInput(email);
    return emailRegex.test(sanitized) ? sanitized : '';
  };

  const sanitizePhone = (phone) => {
    // Remove all non-numeric characters except + and spaces
    return phone.replace(/[^\d+\s-()]/g, '').trim();
  };

  return {
    sanitizeInput,
    sanitizeEmail,
    sanitizePhone
  };
};

// Rate limiting hook for API calls
export const useRateLimit = (maxRequests = 10, timeWindow = 60000) => {
  const [requests, setRequests] = useState([]);

  const canMakeRequest = () => {
    const now = Date.now();
    const recentRequests = requests.filter(time => now - time < timeWindow);
    return recentRequests.length < maxRequests;
  };

  const makeRequest = () => {
    if (canMakeRequest()) {
      setRequests(prev => [...prev, Date.now()]);
      return true;
    }
    return false;
  };

  const getRemainingRequests = () => {
    const now = Date.now();
    const recentRequests = requests.filter(time => now - time < timeWindow);
    return Math.max(0, maxRequests - recentRequests.length);
  };

  return {
    canMakeRequest,
    makeRequest,
    getRemainingRequests
  };
};

// Security headers for API requests
export const getSecurityHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
};
