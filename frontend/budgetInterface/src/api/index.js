// src/api/index.js
import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT, API_HEADERS } from './config';

const API = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: API_HEADERS
});

// Add response interceptor for debugging
API.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default API;