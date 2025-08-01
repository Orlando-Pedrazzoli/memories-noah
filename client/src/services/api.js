import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL;

// ⭐ DEBUG - Ver se a URL está correta
console.log('🌐 API_URL configurada:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    // ⭐ DEBUG - Ver requisições
    console.log(
      `📤 Fazendo requisição: ${config.method?.toUpperCase()} ${config.url}`
    );
    console.log('📋 Dados:', config.data);

    // ⭐ VERIFICAÇÃO MELHORADA DO TOKEN
    const token = Cookies.get('memory-token');
    console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');
    console.log('🍪 Todos os cookies:', document.cookie);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header adicionado');
    } else {
      console.warn('⚠️ Nenhum token encontrado - requisição sem autenticação');
    }

    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
api.interceptors.response.use(
  response => {
    // ⭐ DEBUG - Ver respostas
    console.log(`📥 Resposta recebida: ${response.status}`, response.data);
    return response;
  },
  error => {
    console.error(
      '❌ Erro na resposta:',
      error.response?.status,
      error.response?.data
    );

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
    console.log('🔐 authService.login chamado com:', { username, password });

    const response = await api.post('/auth/login', { username, password });

    if (response.data.token) {
      Cookies.set('memory-token', response.data.token, { expires: 7 });
      console.log('🍪 Token salvo nos cookies');
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

// ⭐ TRAVEL SERVICES - UNIFICADO E COMPLETO
export const travelService = {
  // Métodos básicos
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

  // ⭐ NOVOS MÉTODOS PARA EXCLUSÃO
  getTravelStats: async travelId => {
    console.log('📊 Buscando estatísticas para:', travelId);
    const response = await api.get(`/travel/${travelId}/stats`);
    return response.data;
  },

  deleteTravelAlbum: async travelId => {
    console.log('🗑️ travelService.deleteTravelAlbum chamado para:', travelId);

    try {
      const response = await api.delete(`/travel/${travelId}`);
      console.log('✅ Resposta da API recebida:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro na chamada da API:', error);
      console.error('❌ Response data:', error.response?.data);
      console.error('❌ Status:', error.response?.status);

      // Re-throw para o componente lidar com o erro
      throw error;
    }
  },

  deleteTravelMarker: async travelId => {
    console.log('🗺️ Deletando apenas marker:', travelId);
    const response = await api.delete(`/travel/markers/${travelId}`);
    return response.data;
  },

  // ⭐ NOVO: Geocoding auxiliar
  geocodeLocation: async location => {
    console.log('🌍 Geocodificando:', location);
    const response = await api.post('/travel/geocode', { location });
    return response.data;
  },

  // ⭐ NOVO: Debug markers (desenvolvimento)
  getDebugMarkers: async () => {
    const response = await api.get('/travel/debug/markers');
    return response.data;
  },
};

export default api;
