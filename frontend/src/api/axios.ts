import axios from 'axios';

const API = axios.create({
  // This points your website to your new permanent Render server
  baseURL: 'https://tradara-backend.onrender.com/api', 
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization =`Bearer ${token}`;
  }
  return config;
});

export default API;