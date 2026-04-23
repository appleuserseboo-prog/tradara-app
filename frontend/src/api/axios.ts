import axios from 'axios';

const API = axios.create({
  // Pointing back to your local backend
  baseURL: 'http://localhost:5000/api', 
});

// Automatically attaches token for authenticated requests
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization =` Bearer ${token}`;
  }
  return config;
});

export default API;