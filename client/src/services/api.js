import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL;

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    const token = Cookies.get('memory-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      Cookies.remove('memory-token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    if (response.data.token) {
      Cookies.set('memory-token', response.data.token, { expires: 7 });
    }
    return response.data;
  },

  logout: () => {
    Cookies.remove('memory-token');
    window.location.href = '/login';
  },

  verifyToken: async () => {
    const response = await api.get('/auth/verify');
    return response.data;
  },

  isAuthenticated: () => {
    return !!Cookies.get('memory-token');
  },
};

// Upload services
export const uploadService = {
  uploadMemories: async formData => {
    const response = await api.post('/upload/memories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  uploadTravel: async formData => {
    const response = await api.post('/upload/travel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteImage: async publicId => {
    const response = await api.delete(
      `/upload/image/${encodeURIComponent(publicId)}`
    );
    return response.data;
  },
};

// Memories services
export const memoriesService = {
  getMemoriesByYear: async year => {
    const response = await api.get(`/memories/year/${year}`);
    return response.data;
  },

  getMemoriesSummary: async () => {
    const response = await api.get('/memories/summary');
    return response.data;
  },

  getRecentMemories: async () => {
    const response = await api.get('/memories/recent');
    return response.data;
  },
};

// Travel services
export const travelService = {
  getAllTravels: async () => {
    const response = await api.get('/travel');
    return response.data;
  },

  getTravelById: async travelId => {
    const response = await api.get(`/travel/${travelId}`);
    return response.data;
  },

  getTravelMarkers: async () => {
    const response = await api.get('/travel/map/markers');
    return response.data;
  },

  saveTravelMarker: async markerData => {
    const response = await api.post('/travel/markers', markerData);
    return response.data;
  },
};

export default api;
