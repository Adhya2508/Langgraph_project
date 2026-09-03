// src/services/api.ts
import axios, { AxiosError } from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
  errors?: any;
}

// Map HTTP Status Codes to user-friendly messages (hides stack traces)
export const mapErrorStatus = (status: number, originalMessage?: string): string => {
  switch (status) {
    case 400:
      return 'The request contains invalid parameters or data. Please verify inputs and try again.';
    case 401:
      return 'Unauthorized access. Please log in or verify credentials.';
    case 403:
      return 'Access forbidden. You do not have permission to execute this operation.';
    case 404:
      return 'The requested resource could not be found on the server.';
    case 422:
      return originalMessage || 'Validation error. The dataset contains columns or formats that the backend cannot parse.';
    case 429:
      return 'Too many requests. Please wait a moment and try again.';
    case 500:
      return 'Internal server error. The backend segmentation engine crashed or failed to complete.';
    default:
      return 'An unexpected server error occurred. Please try again.';
  }
};

const createAxiosInstance = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: BASE_URL,
    timeout: 120000, // 2-minute request timeout limit
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  // Request Interceptor: Logging & Auth hooks placeholder
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      // Future authentication token injection can go here
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (import.meta.env.DEV) {
        console.debug(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response Interceptor: Error mapper, timeout, and retry handler
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<any>) => {
      const config = error.config;
      
      // Retry logic: Retry on network failures or temporary 503/504 errors up to 2 times
      const maxRetries = 2;
      const retryCount = (config as any)?._retryCount || 0;

      const isNetworkOrTimeout = !error.response || error.code === 'ECONNABORTED';
      const isRetriableStatus = error.response?.status === 503 || error.response?.status === 504;

      if (config && (isNetworkOrTimeout || isRetriableStatus) && retryCount < maxRetries) {
        (config as any)._retryCount = retryCount + 1;
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s
        
        if (import.meta.env.DEV) {
          console.warn(`[API Retry] Attempt ${retryCount + 1} for ${config.url} after ${delay}ms delay...`);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        return instance(config);
      }

      // Handle actual response code mappings
      let status = 0;
      let userFriendlyMessage = 'Network error: Cannot reach the backend engine. Please ensure the server is running.';

      if (error.response) {
        status = error.response.status;
        const serverDetail = error.response.data?.detail || error.response.data?.message;
        userFriendlyMessage = mapErrorStatus(status, typeof serverDetail === 'string' ? serverDetail : undefined);
      } else if (error.code === 'ECONNABORTED') {
        userFriendlyMessage = 'Request timeout: The operation exceeded the maximum time limit (120s).';
      }

      const formattedError: ApiError = {
        status,
        message: userFriendlyMessage,
        detail: error.response?.data?.detail,
        errors: error.response?.data?.errors,
      };

      return Promise.reject(new Error(formattedError.message));
    }
  );

  return instance;
};

const apiClient = createAxiosInstance();

export default apiClient;
