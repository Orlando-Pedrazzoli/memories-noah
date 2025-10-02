import axios from 'axios';
import Cookies from 'js-cookie';

// Configuração da URL da API
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    console.log('🌐 Usando VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  if (import.meta.env.PROD) {
    const prodUrl = `${window.location.origin}/api`;
    console.log('🏭 Produção sem VITE_API_URL, usando fallback:', prodUrl);
    return prodUrl;
  }

  const devUrl = 'http://localhost:3001/api';
  console.log('🛠️ Desenvolvimento, usando:', devUrl);
  return devUrl;
};

const API_URL = getApiUrl();

console.log('🌐 API_URL configurada:', API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 120000, // 2 minutos para uploads grandes
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    const token = Cookies.get('memory-token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Adicionar timestamp para evitar cache (apenas GET)
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }

    return config;
  },
  error => {
    console.error('❌ Erro na configuração da requisição:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration and errors
api.interceptors.response.use(
  response => {
    console.log(`📥 Resposta recebida: ${response.status}`);
    return response;
  },
  error => {
    console.error(
      '❌ Erro na resposta:',
      error.response?.status,
      error.response?.data
    );

    if (error.response?.status === 401) {
      console.warn('🔒 Token expirado ou inválido');
      Cookies.remove('memory-token');

      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth services
export const authService = {
  login: async (username, password) => {
    console.log('🔐 authService.login chamado');

    try {
      const response = await api.post('/auth/login', { username, password });

      if (response.data.token) {
        Cookies.set('memory-token', response.data.token, { expires: 7 });
        console.log('🍪 Token salvo nos cookies');
      }

      return response.data;
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  },

  logout: () => {
    console.log('👋 Fazendo logout...');
    Cookies.remove('memory-token');
    window.location.href = '/login';
  },

  verifyToken: async () => {
    try {
      const response = await api.get('/auth/verify');
      return response.data;
    } catch (error) {
      console.error('❌ Erro na verificação de token:', error);
      throw error;
    }
  },

  isAuthenticated: () => {
    const hasToken = !!Cookies.get('memory-token');
    return hasToken;
  },
};

// ⭐ Upload services ATUALIZADO - Com suporte para modo "append"
export const uploadService = {
  uploadMemories: async formData => {
    console.log('📤 uploadService.uploadMemories iniciado');

    try {
      const files = formData.getAll('images');
      const year = formData.get('year');
      const category = formData.get('category');
      const mode = formData.get('mode'); // ⭐ NOVO: Detectar modo append

      console.log('📋 Dados para upload de memórias:', {
        arquivos: files.length,
        ano: year,
        categoria: category,
        modo: mode || 'create',
      });

      if (files.length === 0) {
        throw new Error('Nenhuma imagem selecionada para upload');
      }

      if (!year || !category) {
        throw new Error('Ano e categoria são obrigatórios');
      }

      const response = await api.post('/upload/memories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      console.log('✅ Upload de memórias concluído:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro no upload de memórias:', error);
      throw error;
    }
  },

  uploadTravel: async formData => {
    console.log('📤 uploadService.uploadTravel iniciado');

    try {
      const files = formData.getAll('images');
      const travelName = formData.get('travelName');
      const location = formData.get('location');
      const date = formData.get('date');
      const mode = formData.get('mode'); // ⭐ NOVO: Detectar modo append

      console.log('📋 Dados para upload de viagem:', {
        arquivos: files.length,
        nome: travelName,
        localizacao: location,
        data: date,
        modo: mode || 'create',
      });

      if (files.length === 0) {
        throw new Error('Nenhuma imagem selecionada para upload');
      }

      if (!travelName || travelName.trim() === '') {
        throw new Error('Nome da viagem é obrigatório');
      }

      if (!location || location.trim() === '') {
        throw new Error('Localização da viagem é obrigatória');
      }

      if (!date) {
        throw new Error('Data da viagem é obrigatória');
      }

      console.log('✅ Validações passaram, enviando para API...');

      const response = await api.post('/upload/travel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      console.log('✅ Upload de viagem concluído:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro no upload de viagem:', error);
      throw error;
    }
  },

  // ⭐ NOVO: Adicionar fotos a um álbum existente
  addToTravel: async (travelId, formData) => {
    console.log('📤 uploadService.addToTravel iniciado para:', travelId);

    try {
      const files = formData.getAll('images');

      console.log('📋 Adicionando fotos ao álbum:', {
        albumId: travelId,
        arquivos: files.length,
      });

      if (files.length === 0) {
        throw new Error('Nenhuma imagem selecionada');
      }

      const response = await api.post(
        `/upload/travel/${travelId}/add`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        }
      );

      console.log('✅ Fotos adicionadas com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao adicionar fotos:', error);
      throw error;
    }
  },

  // ⭐ NOVO: Adicionar fotos a um ano existente
  addToYear: async (year, category, formData) => {
    console.log('📤 uploadService.addToYear iniciado para:', year, category);

    try {
      const files = formData.getAll('images');

      console.log('📋 Adicionando memórias ao ano:', {
        ano: year,
        categoria: category,
        arquivos: files.length,
      });

      if (files.length === 0) {
        throw new Error('Nenhuma imagem selecionada');
      }

      const response = await api.post(
        `/upload/memories/${year}/${category}/add`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        }
      );

      console.log('✅ Memórias adicionadas com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao adicionar memórias:', error);
      throw error;
    }
  },

  deleteImage: async publicId => {
    console.log('🗑️ uploadService.deleteImage chamado para:', publicId);

    try {
      const response = await api.delete(
        `/upload/image/${encodeURIComponent(publicId)}`
      );
      console.log('✅ Imagem deletada com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      throw error;
    }
  },

  testHealth: async () => {
    console.log('🏥 Testando saúde do upload service...');

    try {
      const response = await api.get('/upload/health');
      console.log('✅ Upload service funcionando');
      return response.data;
    } catch (error) {
      console.error('❌ Upload service com problemas:', error);
      throw error;
    }
  },
};

// Memories services
export const memoriesService = {
  getMemoriesByYear: async year => {
    console.log('📅 memoriesService.getMemoriesByYear para:', year);

    try {
      const response = await api.get(`/memories/year/${year}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar memórias por ano:', error);
      throw error;
    }
  },

  getMemoriesSummary: async () => {
    console.log('📊 memoriesService.getMemoriesSummary chamado');

    try {
      const response = await api.get('/memories/summary');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar resumo de memórias:', error);
      throw error;
    }
  },

  getRecentMemories: async () => {
    console.log('🕒 memoriesService.getRecentMemories chamado');

    try {
      const response = await api.get('/memories/recent');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar memórias recentes:', error);
      throw error;
    }
  },
};

// Travel services
export const travelService = {
  getAllTravels: async (bypassCache = false) => {
    console.log('🗺️ travelService.getAllTravels, bypass cache:', bypassCache);

    try {
      const params = bypassCache ? { _refresh: Date.now() } : {};
      const response = await api.get('/travel', { params });
      console.log('✅ Viagens carregadas:', response.data.travels?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar viagens:', error);
      throw error;
    }
  },

  getTravelById: async travelId => {
    console.log('🎯 travelService.getTravelById para:', travelId);

    try {
      const response = await api.get(`/travel/${travelId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar viagem específica:', error);
      throw error;
    }
  },

  getTravelMarkers: async (bypassCache = false) => {
    console.log(
      '📍 travelService.getTravelMarkers, bypass cache:',
      bypassCache
    );

    try {
      const params = bypassCache ? { _refresh: Date.now() } : {};
      const response = await api.get('/travel/map/markers', { params });
      console.log('✅ Markers carregados:', response.data.markers?.length || 0);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar markers:', error);
      throw error;
    }
  },

  saveTravelMarker: async markerData => {
    console.log('💾 travelService.saveTravelMarker chamado:', markerData);

    try {
      const response = await api.post('/travel/markers', markerData);
      console.log('✅ Marker salvo com sucesso');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao salvar marker:', error);
      throw error;
    }
  },

  getTravelStats: async travelId => {
    console.log('📊 travelService.getTravelStats para:', travelId);

    try {
      const response = await api.get(`/travel/${travelId}/stats`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      throw error;
    }
  },

  deleteTravelAlbum: async travelId => {
    console.log('🗑️ travelService.deleteTravelAlbum para:', travelId);

    try {
      const response = await api.delete(`/travel/${travelId}`);
      console.log('✅ Álbum deletado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar álbum:', error);
      throw error;
    }
  },

  deleteTravelMarker: async travelId => {
    console.log('🗺️ travelService.deleteTravelMarker para:', travelId);

    try {
      const response = await api.delete(`/travel/markers/${travelId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar marker:', error);
      throw error;
    }
  },

  clearAllMarkers: async () => {
    console.log('🧹 travelService.clearAllMarkers chamado');

    try {
      const response = await api.delete('/travel/markers/clear-all');
      console.log('✅ Todos os markers limpos');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao limpar markers:', error);
      throw error;
    }
  },

  syncMarkers: async () => {
    console.log('🔄 travelService.syncMarkers chamado');

    try {
      const response = await api.post('/travel/sync');
      console.log('✅ Sincronização concluída:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro na sincronização:', error);
      throw error;
    }
  },

  refreshAllData: async () => {
    console.log('🔄 travelService.refreshAllData chamado');

    try {
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(true),
        travelService.getTravelMarkers(true),
      ]);

      const result = {
        success: true,
        travels: travelsResponse.success ? travelsResponse.travels : [],
        markers: markersResponse.success ? markersResponse.markers : [],
        travelsLoaded: travelsResponse.success,
        markersLoaded: markersResponse.success,
      };

      console.log('✅ Dados recarregados:', result);
      return result;
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
