// ==========================================
// FILE: src/services/apiClient.ts
// ==========================================

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

declare const process: any;

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

class ApiClient {
  public client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:5000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private processQueue(error: any, token: string | null = null) {
    this.failedQueue.forEach((prom) => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token!);
      }
    });
    this.failedQueue = [];
  }

  private setupInterceptors() {
    // Request Interceptor: Attach Token securely
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('tradara_access_token');
        if (token && config.headers) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response Interceptor: Catch Expired Token / 401 Unauthorized Loops
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (!originalRequest) {
          return Promise.reject(error);
        }

        // If error is 401 (Unauthorized) and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('tradara_refresh_token');
            if (!refreshToken) {
              throw new Error('No refresh token available');
            }

            // Request new token pair from backend refresh endpoint
            const baseURL = (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) || 'http://localhost:5000/api';
            const response = await axios.post(`${baseURL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken, newRefreshToken } = response.data;

            localStorage.setItem('tradara_access_token', accessToken);
            if (newRefreshToken) {
              localStorage.setItem('tradara_refresh_token', newRefreshToken);
            }

            this.client.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
            this.processQueue(null, accessToken);
            this.isRefreshing = false;

            if (originalRequest.headers) {
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.isRefreshing = false;

            // Clear credentials & force graceful redirect to login without crashing state
            localStorage.removeItem('tradara_access_token');
            localStorage.removeItem('tradara_refresh_token');
            
            if (window.location.pathname !== '/login') {
              window.location.href = '/login?expired=true';
            }

            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }
}

export const apiClient = new ApiClient().client;