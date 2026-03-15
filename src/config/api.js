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

/**
 * Make an authenticated GET request
 * @param {string} endpoint - API endpoint (e.g., '/v1/api/building-details')
 * @param {object} config - Additional axios config
 */
export const authenticatedGet = async (endpoint, config = {}) => {
  try {
    const axiosInstance = await createAuthenticatedAxios();
    const response = await axiosInstance.get(endpoint, config);
    return response.data;
  } catch (error) {
    console.error(`GET ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Make an authenticated POST request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Additional axios config
 */
export const authenticatedPost = async (endpoint, data, config = {}) => {
  try {
    const axiosInstance = await createAuthenticatedAxios();
    const response = await axiosInstance.post(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error(`POST ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Make an authenticated DELETE request
 * @param {string} endpoint - API endpoint
 * @param {object} config - Additional axios config
 */
export const authenticatedDelete = async (endpoint, config = {}) => {
  try {
    const axiosInstance = await createAuthenticatedAxios();
    const response = await axiosInstance.delete(endpoint, config);
    return response.data;
  } catch (error) {
    console.error(`DELETE ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Make an authenticated PUT request
 * @param {string} endpoint - API endpoint
 * @param {object} data - Request body
 * @param {object} config - Additional axios config
 */
export const authenticatedPut = async (endpoint, data, config = {}) => {
  try {
    const axiosInstance = await createAuthenticatedAxios();
    const response = await axiosInstance.put(endpoint, data, config);
    return response.data;
  } catch (error) {
    console.error(`PUT ${endpoint} failed:`, error);
    throw error;
  }
};

/**
 * Legacy axios instance for backward compatibility
 * WARNING: This does not include authentication automatically
 * Use authenticatedGet/Post/Delete/Put instead
 */
export const axiosInstance = axios.create({
  baseURL: API_CONFIG.BACKEND_URL,
});

export default API_CONFIG;
