import axios from 'axios';

// ✅ Updated baseURL to point to your live Render backend
const API = axios.create({
  baseURL: 'https://tradara-backend.onrender.com/api', 
});

// Attach Token to every request for security
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// Logout Utilities
export const logoutUser = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export const uselogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};

export default API;