import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5000/api', // Update to your production URL later
});

// Attach Token to every request for security
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

// GOAT Feature: Logout Utility
export const logoutUser = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
};
export const uselogout = () => {
  localStorage.removeItem('token');
  window.location.href = '/login';
}

// Global Item Posting with High-Quality Image Support
/*const uploadItem = async (endpoint: string, files: File[], data: any) => {
  const formData = new FormData();
  
  Quality preservation: append raw binary unchanged
  files.forEach(file => {
    formData.append('images', file); 
  });
  
  Object.keys(data).forEach(key => {
    formData.append(key, data[key]);
  });

  return axios.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' } // Crucial for binary transmission
  });
};
*/

export default API;