import api from "./api.js";

export const catalogApi = {
  categories: () => api.get("/categories/"),
  products: (params) => api.get("/products/", { params }),
  product: (id) => api.get(`/products/${id}/`),
};

export const cartApi = {
  get: () => api.get("/cart/"),
  add: (product_id, quantity = 1) => api.post("/cart/items/", { product_id, quantity }),
  update: (id, quantity) => api.patch(`/cart/items/${id}/`, { quantity }),
  remove: (id) => api.delete(`/cart/items/${id}/`),
};

export const wishlistApi = {
  get: () => api.get("/wishlist/"),
  add: (product_id) => api.post("/wishlist/", { product_id }),
  remove: (product_id) => api.delete(`/wishlist/${product_id}/`),
};

export const ordersApi = {
  list: () => api.get("/orders/"),
  cancel: (id) => api.post(`/orders/${id}/cancel/`),
  checkout: (payload) => api.post("/orders/", payload),
  applyCoupon: (code) => api.post("/coupons/apply/", { code }),
  addresses: () => api.get("/shipping-addresses/"),
  saveAddress: (payload) => api.post("/shipping-addresses/", payload),
  updateAddress: (id, payload) => api.patch(`/shipping-addresses/${id}/`, payload),
  deleteAddress: (id) => api.delete(`/shipping-addresses/${id}/`),
  createPayment: (orderId) => api.post(`/payments/razorpay/${orderId}/create/`),
  verifyPayment: (orderId, payload) => api.post(`/payments/razorpay/${orderId}/verify/`, payload),
  paymentFailed: (orderId, payload = {}) => api.post(`/payments/razorpay/${orderId}/failure/`, payload),
};

export const sellerApi = {
  stats: () => api.get("/seller/stats/"),
  products: (params) => api.get("/seller/products/", { params }),
  createProduct: (data) => api.post("/seller/products/", data),
  updateProduct: (id, data) => api.patch(`/seller/products/${id}/`, data),
  deleteProduct: (id) => api.delete(`/seller/products/${id}/`),
  orders: (params) => api.get("/seller/orders/", { params }),
  updateOrder: (id, status) => api.patch(`/seller/orders/${id}/`, { status }),
  notifications: () => api.get("/seller/notifications/"),
  markNotificationRead: (id) => api.patch(`/seller/notifications/${id}/read/`),
  savePushSubscription: (subscription) => api.post("/seller/push-subscription/", subscription),
  deletePushSubscription: (endpoint) => api.delete("/seller/push-subscription/", { data: { endpoint } }),
  coupons: () => api.get("/seller/coupons/"),
  createCoupon: (payload) => api.post("/seller/coupons/", payload),
  updateCoupon: (id, payload) => api.patch(`/seller/coupons/${id}/`, payload),
  deleteCoupon: (id) => api.delete(`/seller/coupons/${id}/`),
};
