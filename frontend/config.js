// ====================
// LUMINTERN API Configuration
// ====================
// Backend URL is loaded from Netlify Environment Variable
// Set VITE_API_URL in Netlify Dashboard → Site Settings → Environment Variables

const LUMINTERN_CONFIG = {
  // Get backend URL from environment variable or use default
  API_URL: '%%API_URL%%',
  
  // Socket URL (same as API)
  SOCKET_URL: '%%API_URL%%',
};

// Check if API_URL is properly set
if (LUMINTERN_CONFIG.API_URL === '%%API_URL%%' || !LUMINTERN_CONFIG.API_URL) {
  // Fallback for local development
  LUMINTERN_CONFIG.API_URL = 'http://localhost:10000';
  LUMINTERN_CONFIG.SOCKET_URL = 'http://localhost:10000';
  console.warn('⚠️ API_URL not set. Using localhost:10000');
}

// Make it globally available
window.LUMINTERN_CONFIG = LUMINTERN_CONFIG;

// Helper function for API calls
window.luminternAPI = async function(endpoint, options = {}) {
  const url = `${LUMINTERN_CONFIG.API_URL}${endpoint}`;
  const token = localStorage.getItem('lumintern_token');
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Helper to save token
window.saveToken = function(token) {
  localStorage.setItem('lumintern_token', token);
};

// Helper to get token
window.getToken = function() {
  return localStorage.getItem('lumintern_token');
};

// Helper to remove token (logout)
window.logout = function() {
  localStorage.removeItem('lumintern_token');
  localStorage.removeItem('lumintern_user');
  window.location.href = '/index.html';
};

// Helper to save user data
window.saveUser = function(user) {
  localStorage.setItem('lumintern_user', JSON.stringify(user));
};

// Helper to get user data
window.getUser = function() {
  const user = localStorage.getItem('lumintern_user');
  return user ? JSON.parse(user) : null;
};

console.log('✅ LUMINTERN API configured:', LUMINTERN_CONFIG.API_URL);