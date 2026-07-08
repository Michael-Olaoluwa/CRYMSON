import axios from "axios";
import { getAuthToken, clearAuthSession } from "./authSession";
import { getApiBaseUrl } from "./apiBaseUrl";

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
