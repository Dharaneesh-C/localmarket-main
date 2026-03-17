import axios from 'axios';

const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API = axios.create({ baseURL: `${BASE_URL}/api` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const updateFCMToken = (fcm_token) => API.put('/auth/fcm-token', { fcm_token });
export const updateLocation = (location) => API.put('/auth/location', { location });

export const createProduct = (data) => API.post('/products', data);
export const getMyProducts = () => API.get('/products/merchant/my-products');
export const getNearbyProducts = (lat, lng) =>
  API.get(`/products/nearby?lat=${lat}&lng=${lng}`);
export const getProduct = (id) => API.get(`/products/${id}`);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

export const getMerchantDashboard = () => API.get('/merchant/dashboard');

export const getNearbyMerchants = (lat, lng, radius = 5) =>
  API.get(`/buyer/nearby-merchants?lat=${lat}&lng=${lng}&radius_km=${radius}`);

export default API;
