// API Configuration for BookNest Hotel Management System
// Centralized API URL management

import axios from 'axios';

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.headers.common['Content-Type'] = 'application/json';

const getAPIBaseURL = () => {
  // You can set REACT_APP_API_BASE_URL in your .env file or deployment environment
  return process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';
};

const getFrontendBaseURL = () => {
  return process.env.REACT_APP_FRONTEND_BASE_URL || 'http://localhost:3000';
};

// Base configuration
const config = {
  API_BASE_URL: getAPIBaseURL(),
  FRONTEND_BASE_URL: getFrontendBaseURL(),
  
  // API endpoint definitions
  endpoints: {
    // Auth endpoints
    LOGIN: '/accounts/login/',
    REGISTER: '/accounts/register/',
    PROFILE: '/accounts/profile/',
    PASSWORD_RESET: '/accounts/password-reset/',
    PASSWORD_RESET_WITH_EMAIL: '/accounts/password-reset/with-email-update/',
    PASSWORD_RESET_CONFIRM: '/accounts/password-reset/confirm/',
    
    // Hotel endpoints
    ROOMS_LIST: '/hotel/get_room_list/',
    ROOM_AVAILABILITY: '/hotel/room-availability/',
    BOOKING_CREATE: '/hotel/book/',
    BOOKING_DETAIL: (id) => `/hotel/booking-detail/${id}/`,
    USER_BOOKINGS: '/hotel/user-bookings/',
    CHECKOUT: '/hotel/checkout/',
    CHECKED_IN_ROOMS: '/hotel/get_current_checked_in_rooms/',
    
    // Management endpoints
    MANAGER_DASHBOARD: '/hotel/management/dashboard/',
    ADMIN_DASHBOARD: '/hotel/admin/dashboard/',
    BOOKING_MANAGEMENT: '/hotel/management/bookings/',
    ROOM_MANAGEMENT: '/hotel/management/rooms/',
    ROOM_MANAGEMENT_DETAIL: (id) => `/hotel/management/rooms/${id}/`,
    CATEGORIES_LIST: '/hotel/management/categories/',
    STAFF_MANAGEMENT: '/hotel/management/staff/',
    GUEST_MANAGEMENT: '/hotel/management/guests/',
    PAYMENT_MANAGEMENT: '/hotel/management/payments/',
    
    // Admin endpoints
    ASSIGN_MANAGER: '/hotel/admin/assign-manager/',
    REMOVE_MANAGER: '/hotel/admin/remove-manager/',
    
    // Payment endpoints
    PAYMENT_INTENT: '/hotel/payment/create-intent/',
    PAYMENT_CONFIRM: '/hotel/payment/confirm/',
    PAYMENT_HISTORY: '/hotel/payment/history/',
  },
  
  // Media URL builder
  getMediaURL: (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${config.API_BASE_URL}${path}`;
  },
  
  // Default images
  DEFAULT_ROOM_IMAGE: '/media/default/room_default.jpg',
  DEFAULT_USER_AVATAR: '/media/default/user_default.jpg',
};

// Helper functions to build full URLs
export const buildURL = (endpoint, params = {}) => {
  let url = `${config.API_BASE_URL}${endpoint}`;
  
  // Replace URL parameters
  Object.keys(params).forEach(key => {
    url = url.replace(`:${key}`, params[key]);
  });
  
  return url;
};

export const buildMediaURL = (mediaPath) => {
  return config.getMediaURL(mediaPath);
};

export const getDefaultImage = (type = 'room') => {
  const defaults = {
    room: config.DEFAULT_ROOM_IMAGE,
    user: config.DEFAULT_USER_AVATAR,
  };
  
  return buildMediaURL(defaults[type] || defaults.room);
};

// Export the configuration
export default config;

// Named exports for convenience
export const API_BASE_URL = config.API_BASE_URL;
export const FRONTEND_BASE_URL = config.FRONTEND_BASE_URL;
export const endpoints = config.endpoints;

// Export config as named export for backward compatibility
export { config };
