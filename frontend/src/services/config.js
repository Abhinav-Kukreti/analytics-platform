// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://1p8kqmp511.execute-api.us-east-1.amazonaws.com/dev';

// WebSocket Configuration  
export const WEBSOCKET_URL = process.env.REACT_APP_WS_URL || 'wss://q6s7133e0e.execute-api.us-east-1.amazonaws.com/dev';

// Application Configuration
export const APP_CONFIG = {
  name: 'Analytics Platform',
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
};

// Export default configuration
export default {
  API_BASE_URL,
  WEBSOCKET_URL,
  APP_CONFIG
};
