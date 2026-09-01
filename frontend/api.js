// ====================
// LUMINTERN API Configuration
// ====================
// This file automatically toggles API endpoints between
// development and production environments.

const config = {
  development: {
    apiBaseUrl: 'http://localhost:10000',
    socketUrl: 'http://localhost:10000',
  },
  production: {
    apiBaseUrl: import.meta.env.VITE_API_URL || 'https://lumintern-api.onrender.com',
    socketUrl: import.meta.env.VITE_SOCKET_URL || 'https://lumintern-api.onrender.com',
  },
};

// Determine current environment
const environment = import.meta.env.MODE || 'development';
const currentConfig = config[environment] || config.development;

// Export configuration
export const API_BASE_URL = currentConfig.apiBaseUrl;
export const SOCKET_URL = currentConfig.socketUrl;

// API Endpoints
export const ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    ME: `${API_BASE_URL}/api/auth/me`,
    UPDATE_ME: `${API_BASE_URL}/api/auth/updateMe`,
    UPDATE_PASSWORD: `${API_BASE_URL}/api/auth/updatePassword`,
  },
  
  // Tasks
  TASKS: {
    BASE: `${API_BASE_URL}/api/tasks`,
    MY_POSTED: `${API_BASE_URL}/api/tasks/my/posted`,
    MY_ASSIGNED: `${API_BASE_URL}/api/tasks/my/assigned`,
  },
  
  // Payments
  PAYMENTS: {
    BASE: `${API_BASE_URL}/api/payments`,
  },
  
  // Chat
  CHAT: {
    ROOMS: `${API_BASE_URL}/api/chat/rooms`,
    ROOM: `${API_BASE_URL}/api/chat/room`,
    UNREAD: `${API_BASE_URL}/api/chat/unread`,
  },
  
  // Wallet
  WALLET: {
    BALANCE: `${API_BASE_URL}/api/wallet/balance`,
    LEDGER: `${API_BASE_URL}/api/wallet/ledger`,
    STATS: `${API_BASE_URL}/api/wallet/stats`,
    ADD_FUNDS: `${API_BASE_URL}/api/wallet/add-funds`,
    WITHDRAW: `${API_BASE_URL}/api/wallet/withdraw`,
  },
  
  // Gamification
  GAMIFICATION: {
    PROFILE: `${API_BASE_URL}/api/gamification/profile`,
    LEADERBOARD: `${API_BASE_URL}/api/gamification/leaderboard`,
  },
  
  // Business
  BUSINESS: {
    QR_POSTER: `${API_BASE_URL}/api/business/qr-poster`,
  },
  
  // Contracts
  CONTRACTS: {
    BASE: `${API_BASE_URL}/api/contracts`,
  },
  
  // Admin
  ADMIN: {
    ANALYTICS: `${API_BASE_URL}/api/admin/analytics/overview`,
    USERS: `${API_BASE_URL}/api/admin/users`,
    DISPUTES: `${API_BASE_URL}/api/admin/disputes`,
    SETTINGS: `${API_BASE_URL}/api/admin/settings`,
    AUDIT_LOGS: `${API_BASE_URL}/api/admin/audit-logs`,
  },
};

// Helper function to create headers with auth token
export const createHeaders = (token = null) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
};

// Helper function for API calls
export const apiCall = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: createHeaders(token),
  };
  
  const response = await fetch(url, {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export default {
  API_BASE_URL,
  SOCKET_URL,
  ENDPOINTS,
  createHeaders,
  apiCall,
};