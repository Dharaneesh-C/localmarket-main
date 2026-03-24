import axios from 'axios';

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const API = axios.create({ baseURL: `${BASE_URL}/api` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global response interceptor — 401 logout + toast error events
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;

    // 401 — token expired, force logout
    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
      return Promise.reject(error);
    }

    // Don't toast on cancelled requests, background polls, or silent calls
    if (error.code === 'ERR_CANCELED') return Promise.reject(error);
    if (error.config?.silent) return Promise.reject(error);

    // Derive a human-readable message
    const detail = error.response?.data?.detail;
    const message =
      typeof detail === 'string' ? detail
      : status === 404 ? 'Resource not found'
      : status === 403 ? 'You don\'t have permission to do that'
      : status === 500 ? 'Server error — please try again'
      : status === 0 || !status ? 'Network error — check your connection'
      : `Request failed (${status})`;

    // Fire a custom DOM event — picked up by ToastListener in App.js
    window.dispatchEvent(new CustomEvent('api-error', { detail: { message } }));

    return Promise.reject(error);
  }
);

export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');
export const updateFCMToken = (fcm_token) => API.put('/auth/fcm-token', { fcm_token });
export const updateLocation = (location) => API.put('/auth/location', { location });

export const createProduct = (data) => API.post('/products', data);
export const getMyProducts = () => API.get('/products/merchant/my-products');
export const getNearbyProducts = (lat, lng, radius = 20) =>
  API.get(`/products/nearby?lat=${lat}&lng=${lng}&radius_km=${radius}`);
export const getProduct = (id) => API.get(`/products/${id}`);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

export const getMerchantDashboard = () => API.get('/merchant/dashboard');

export const getNearbyMerchants = (lat, lng, radius = 5) =>
  API.get(`/buyer/nearby-merchants?lat=${lat}&lng=${lng}&radius_km=${radius}`);

// Orders
export const placeOrder = (data) => API.post('/orders/', data);
export const getMyOrders = () => API.get('/orders/my-orders');
export const getMerchantOrders = () => API.get('/orders/merchant-orders');
export const updateOrderStatus = (orderId, status) => API.put(`/orders/${orderId}/status`, { status });
export const merchantArrived = (orderId) => API.post(`/orders/${orderId}/arrived`);
export const cancelOrder = (orderId) => API.post(`/orders/${orderId}/cancel`);

// Reviews
export const submitReview = (data) => API.post('/reviews/', data);
export const getProductReviews = (productId) => API.get(`/reviews/product/${productId}`);
export const getMerchantReviews = (merchantId) => API.get(`/reviews/merchant/${merchantId}`);

// Merchant revenue history
export const getMerchantOrderHistory = () => API.get('/orders/merchant-orders');

// Merchant profile
export const updateMerchantProfile = (data) => API.put('/auth/merchant-profile', data);
export const getMerchantProfile = (merchantId) => API.get(`/auth/merchant/${merchantId}`);

// Favourites
export const toggleFavourite = (data) => API.post('/auth/favourites/toggle', data);
export const getFavourites = () => API.get('/auth/favourites');

// COD
export const confirmPayment = (orderId) => API.post(`/orders/${orderId}/confirm-payment`);

// Address Book
export const getAddresses = () => API.get('/auth/addresses');
export const saveAddress = (data) => API.post('/auth/addresses', data);
export const deleteAddress = (id) => API.delete(`/auth/addresses/${id}`);

// Live Location Tracking
export const updateMerchantLiveLocation = (orderId, lat, lng) =>
  API.put(`/orders/${orderId}/location?lat=${lat}&lng=${lng}`, {}, { silent: true });
export const getMerchantLiveLocation = (orderId) =>
  API.get(`/orders/${orderId}/merchant-location`, { silent: true });

// Merchant Analytics
export const getMerchantAnalytics = () => API.get('/merchant/analytics');

// Admin
export const getAdminSummary = () => API.get('/admin/summary');
export const getAdminMerchants = () => API.get('/admin/merchants');
export const getAdminBuyers = () => API.get('/admin/buyers');
export const getAdminOrders = () => API.get('/admin/orders');
export const getAdminRevenueChart = () => API.get('/admin/revenue-chart');

// Order Chat
export const sendMessage = (orderId, text) => API.post(`/orders/${orderId}/messages`, { text });
export const getMessages = (orderId) => API.get(`/orders/${orderId}/messages`);

// Availability window check
export const checkAvailability = () => API.post('/products/check-availability');

// Bulk upload
export const bulkUploadProducts = (products) => API.post('/products/bulk-upload', products);

export default API;
