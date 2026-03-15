/**
 * API Configuration
 *
 * Centralized API configuration for all backend calls.
 * SECURITY: All API calls should go through authenticated axios instance.
 */

import axios from 'axios';
import { Auth } from 'aws-amplify';

// API Base URLs from environment variables
export const API_CONFIG = {
  // Backend API (Node.js server)
  BACKEND_URL: process.env.REACT_APP_API_URL || 'http://localhost:3002',

  // AWS API Gateway (if still needed for file operations)
  // SECURITY: This should ideally also be moved to backend
  FILE_API_URL: process.env.REACT_APP_FILE_API_URL || '',
};

/**
 * Create an authenticated axios instance
 * Automatically adds JWT token to all requests
 */
export const createAuthenticatedAxios = async () => {
  try {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    return axios.create({
      baseURL: API_CONFIG.BACKEND_URL,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Failed to create authenticated axios instance:', error);
    throw new Error('Authentication required');
  }
};

// Private helper – creates authenticated axios instance and dispatches any method
const authRequest = async (method, endpoint, data, config = {}) => {
  const ax   = await createAuthenticatedAxios();
  const args = data !== undefined ? [endpoint, data, config] : [endpoint, config];
  return (await ax[method](...args)).data;
};

export const authenticatedGet    = (ep, cfg)       => authRequest('get',    ep, undefined, cfg);
export const authenticatedPost   = (ep, data, cfg) => authRequest('post',   ep, data,      cfg);
export const authenticatedDelete = (ep, cfg)       => authRequest('delete', ep, undefined, cfg);
export const authenticatedPut    = (ep, data, cfg) => authRequest('put',    ep, data,      cfg);

/**
 * Legacy axios instance for backward compatibility
 * WARNING: This does not include authentication automatically
 * Use authenticatedGet/Post/Delete/Put instead
 */
export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BACKEND_URL,
});

export default API_CONFIG;
