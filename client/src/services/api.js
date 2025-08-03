// client/src/services/api.js - VERSÃO CORRIGIDA

import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = import.meta.env.VITE_API_URL;

console.log('🌐 API_URL configurada:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    console.log(
      `📤 Fazendo requisição: ${config.method?.toUpperCase()} ${config.url}`
    );

    const token = Cookies.get('memory-token');
    console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header adicionado');
    } else {
      console.warn('⚠️ Nenhum token encontrado - requisição sem autenticação');
    }

    // ⭐ ADICIONAR TIMESTAMP PARA EVITAR CACHE
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
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

// ⭐ TRAVEL SERVICES - CORRIGIDO E MELHORADO
export const travelService = {
  // ⭐ MÉTODO PRINCIPAL: Obter todas as viagens (com cache buster)
  getAllTravels: async (bypassCache = false) => {
    const params = bypassCache ? { _refresh: Date.now() } : {};
    const response = await api.get('/travel', { params });
    return response.data;
  },

  getTravelById: async travelId => {
    const response = await api.get(`/travel/${travelId}`);
    return response.data;
  },

  // ⭐ MÉTODO PRINCIPAL: Obter markers (com cache buster)
  getTravelMarkers: async (bypassCache = false) => {
    const params = bypassCache ? { _refresh: Date.now() } : {};
    const response = await api.get('/travel/map/markers', { params });
    return response.data;
  },

  saveTravelMarker: async markerData => {
    const response = await api.post('/travel/markers', markerData);
    return response.data;
  },

  // ⭐ ESTATÍSTICAS DE VIAGEM
  getTravelStats: async travelId => {
    console.log('📊 Buscando estatísticas para:', travelId);
    const response = await api.get(`/travel/${travelId}/stats`);
    return response.data;
  },

  // ⭐ EXCLUSÃO COMPLETA DE ÁLBUM
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
      throw error;
    }
  },

  // ⭐ EXCLUSÃO APENAS DO MARKER
  deleteTravelMarker: async travelId => {
    console.log('🗺️ Deletando apenas marker:', travelId);
    const response = await api.delete(`/travel/markers/${travelId}`);
    return response.data;
  },

  // ⭐ GEOCODING AUXILIAR
  geocodeLocation: async location => {
    console.log('🌍 Geocodificando:', location);
    const response = await api.post('/travel/geocode', { location });
    return response.data;
  },

  // ⭐ LIMPEZA DE ÁLBUNS ÓRFÃOS (desenvolvimento)
  cleanupOrphanedAlbums: async () => {
    console.log('🧹 Limpando álbuns órfãos...');
    const response = await api.delete('/travel/cleanup/orphaned');
    return response.data;
  },

  // ⭐ DEBUG MARKERS (desenvolvimento)
  getDebugMarkers: async () => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Debug markers only available in development');
    }
    const response = await api.get('/travel/debug/markers');
    return response.data;
  },

  // ⭐ MÉTODO PARA RECARREGAR DADOS FORÇANDO BYPASS DE CACHE
  refreshAllData: async () => {
    console.log('🔄 Recarregando todos os dados de viagem...');

    try {
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(true), // bypass cache
        travelService.getTravelMarkers(true), // bypass cache
      ]);

      return {
        success: true,
        travels: travelsResponse.success ? travelsResponse.travels : [],
        markers: markersResponse.success ? markersResponse.markers : [],
        travelsLoaded: travelsResponse.success,
        markersLoaded: markersResponse.success,
      };
    } catch (error) {
      console.error('❌ Erro ao recarregar dados:', error);
      return {
        success: false,
        error: error.message,
        travels: [],
        markers: [],
        travelsLoaded: false,
        markersLoaded: false,
      };
    }
  },
};

export default api;
