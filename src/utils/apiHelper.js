/**
 * API Helper Utilities
 *
 * Helper functions for making authenticated API calls across the application.
 * This utility wraps fetch/axios calls with automatic authentication.
 */

import { Auth } from 'aws-amplify';
import API_CONFIG from '../config/api';

/**
 * Get authentication headers for API calls
 * @returns {Promise<Object>} Headers object with Authorization token
 */
export const getAuthHeaders = async () => {
  try {
    const session = await Auth.currentSession();
    const token = session.getIdToken().getJwtToken();

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  } catch (error) {
    console.error('Failed to get auth headers:', error);
    throw new Error('Authentication required');
  }
};

/**
 * Make an authenticated fetch request
 * @param {string} endpoint - API endpoint (e.g., '/v1/api/building-details')
 * @param {object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Response>}
 */
export const authenticatedFetch = async (endpoint, options = {}) => {
  const headers = await getAuthHeaders();
  const url = `${API_CONFIG.BACKEND_URL}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });
};

/**
 * Make an authenticated GET request with fetch
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Parsed JSON response
 */
export const get = async (endpoint) => {
  const response = await authenticatedFetch(endpoint, {
    method: 'GET',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

/**
 * Make an authenticated POST request with fetch
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @returns {Promise<any>} Parsed JSON response
 */
export const post = async (endpoint, data) => {
  const response = await authenticatedFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

/**
 * Make an authenticated DELETE request with fetch
 * @param {string} endpoint - API endpoint
 * @returns {Promise<any>} Parsed JSON response
 */
export const del = async (endpoint) => {
  const response = await authenticatedFetch(endpoint, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
};

/**
 * Legacy support - Get API base URL
 * @deprecated Use authenticatedFetch or get/post/del helpers instead
 */
export const getApiUrl = () => API_CONFIG.BACKEND_URL;

export default {
  get,
  post,
  del,
  authenticatedFetch,
  getAuthHeaders,
  getApiUrl,
};
