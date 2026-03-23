import axios from 'axios';

const BASE_URL = (process.env.REACT_APP_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
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

// Merchant Analytics
export const getMerchantAnalytics = () => API.get('/merchant/analytics');

// Admin
export const getAdminSummary = () => API.get('/admin/summary');
export const getAdminMerchants = () => API.get('/admin/merchants');
export const getAdminBuyers = () => API.get('/admin/buyers');
export const getAdminOrders = () => API.get('/admin/orders');
export const getAdminRevenueChart = () => API.get('/admin/revenue-chart');

export default API;
