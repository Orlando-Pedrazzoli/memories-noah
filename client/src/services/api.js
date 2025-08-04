// client/src/services/api.js - VERSÃO CORRIGIDA COM FALLBACK

import axios from 'axios';
import Cookies from 'js-cookie';

// ⭐ CORREÇÃO: Adicionar fallback para produção quando VITE_API_URL não estiver definido
const getApiUrl = () => {
  // Se VITE_API_URL está definido, usar
  if (import.meta.env.VITE_API_URL) {
    console.log('🌐 Usando VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }

  // Fallback baseado no ambiente
  if (import.meta.env.PROD) {
    // Em produção, usar a mesma origem + /api
    const prodUrl = `${window.location.origin}/api`;
    console.log('🏭 Produção sem VITE_API_URL, usando fallback:', prodUrl);
    return prodUrl;
  }

  // Desenvolvimento
  const devUrl = 'http://localhost:3001/api';
  console.log('🛠️ Desenvolvimento, usando:', devUrl);
  return devUrl;
};

const API_URL = getApiUrl();

console.log('🌐 API_URL final configurada:', API_URL);
console.log('🏭 Ambiente:', import.meta.env.MODE);
console.log('🔧 Variáveis disponíveis:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  DEV: import.meta.env.DEV,
});

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // ⭐ AUMENTAR TIMEOUT PARA UPLOADS
});

// Request interceptor to add token
api.interceptors.request.use(
  config => {
    console.log(
      `📤 Fazendo requisição: ${config.method?.toUpperCase()} ${
        config.baseURL
      }${config.url}`
    );

    const token = Cookies.get('memory-token');
    console.log('🔑 Token encontrado:', token ? 'SIM' : 'NÃO');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('✅ Authorization header adicionado');
    } else {
      console.warn('⚠️ Nenhum token encontrado - requisição sem autenticação');
    }

    // ⭐ ADICIONAR TIMESTAMP PARA EVITAR CACHE (apenas GET)
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
    console.log(`📥 Resposta recebida: ${response.status}`, response.data);
    return response;
  },
  error => {
    console.error(
      '❌ Erro na resposta:',
      error.response?.status,
      error.response?.data
    );

    // ⭐ LOG DETALHADO DO ERRO
    console.error('❌ Detalhes do erro:', {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
      method: error.config?.method,
      baseURL: error.config?.baseURL,
    });

    // ⭐ DETECTAR HTML SENDO RETORNADO EM VEZ DE JSON
    if (
      error.response?.data &&
      typeof error.response.data === 'string' &&
      error.response.data.includes('<!DOCTYPE')
    ) {
      console.error('🚨 RECEBENDO HTML EM VEZ DE JSON!');
      console.error(
        '🔍 URL problemática:',
        error.config?.baseURL + error.config?.url
      );
      console.error('📄 Conteúdo HTML:', error.response.data.substring(0, 200));

      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          'Erro de roteamento da API. Verificar configuração do servidor.'
        );
      });
    }

    // ⭐ TRATAMENTO ESPECÍFICO DE ERROS
    if (error.response?.status === 401) {
      console.warn('🔒 Token expirado ou inválido');
      Cookies.remove('memory-token');

      // Evitar loop infinito se já estiver na página de login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 413) {
      console.error('📁 Payload muito grande');
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Arquivos muito grandes. Tente com imagens menores.');
      });
    } else if (
      error.code === 'ECONNABORTED' ||
      error.message.includes('timeout')
    ) {
      console.error('⏰ Timeout na requisição');
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          'Tempo limite excedido. Tente com menos imagens ou verifique sua conexão.'
        );
      });
    } else if (!error.response) {
      console.error('🌐 Erro de rede ou conexão');
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(
          'Erro de conexão. Verifique sua internet e tente novamente.'
        );
      });
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
    console.log(
      '🔍 Verificando autenticação:',
      hasToken ? 'autenticado' : 'não autenticado'
    );
    return hasToken;
  },
};

// Upload services
export const uploadService = {
  uploadMemories: async formData => {
    console.log('📤 uploadService.uploadMemories iniciado');

    try {
      // ⭐ VERIFICAR SE FORMDATA TEM DADOS
      const files = formData.getAll('images');
      const year = formData.get('year');
      const category = formData.get('category');

      console.log('📋 Dados para upload de memórias:', {
        arquivos: files.length,
        ano: year,
        categoria: category,
      });

      if (files.length === 0) {
        throw new Error('Nenhuma imagem selecionada para upload');
      }

      if (!year || !category) {
        throw new Error('Ano e categoria são obrigatórios');
      }

      const response = await api.post('/upload/memories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 minutos para uploads
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
      // ⭐ VERIFICAR SE FORMDATA TEM DADOS NECESSÁRIOS
      const files = formData.getAll('images');
      const travelName = formData.get('travelName');
      const location = formData.get('location');
      const date = formData.get('date');

      console.log('📋 Dados para upload de viagem:', {
        arquivos: files.length,
        nome: travelName,
        localizacao: location,
        data: date,
      });

      // ⭐ VALIDAÇÕES ANTES DO ENVIO
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
        timeout: 120000, // 2 minutos para uploads
      });

      console.log('✅ Upload de viagem concluído:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro no upload de viagem:', error);

      // ⭐ LOG EXTRA PARA DEBUGGING
      if (error.response) {
        console.error('📋 Detalhes da resposta de erro:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        });
      }

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

  // ⭐ NOVO: Testar saúde do serviço de upload
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
  // ⭐ MÉTODO PRINCIPAL: Obter todas as viagens (com cache buster)
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

  // ⭐ MÉTODO PRINCIPAL: Obter markers (com cache buster)
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

  // ⭐ ESTATÍSTICAS DE VIAGEM
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

  // ⭐ EXCLUSÃO COMPLETA DE ÁLBUM
  deleteTravelAlbum: async travelId => {
    console.log('🗑️ travelService.deleteTravelAlbum para:', travelId);

    try {
      const response = await api.delete(`/travel/${travelId}`);
      console.log('✅ Álbum deletado com sucesso:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao deletar álbum:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Data:', error.response?.data);
      throw error;
    }
  },

  // ⭐ EXCLUSÃO APENAS DO MARKER
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

  // ⭐ GEOCODING AUXILIAR
  geocodeLocation: async location => {
    console.log('🌍 travelService.geocodeLocation para:', location);

    try {
      const response = await api.post('/travel/geocode', { location });
      return response.data;
    } catch (error) {
      console.error('❌ Erro no geocoding:', error);
      throw error;
    }
  },

  // ⭐ LIMPEZA DE ÁLBUNS ÓRFÃOS (desenvolvimento)
  cleanupOrphanedAlbums: async () => {
    console.log('🧹 travelService.cleanupOrphanedAlbums chamado');

    try {
      const response = await api.delete('/travel/cleanup/orphaned');
      console.log('✅ Limpeza concluída:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      throw error;
    }
  },

  // ⭐ DEBUG MARKERS (desenvolvimento)
  getDebugMarkers: async () => {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('Debug markers only available in development');
    }

    console.log('🔍 travelService.getDebugMarkers chamado');

    try {
      const response = await api.get('/travel/debug/markers');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao carregar debug markers:', error);
      throw error;
    }
  },

  // ⭐ MÉTODO PARA RECARREGAR DADOS FORÇANDO BYPASS DE CACHE
  refreshAllData: async () => {
    console.log('🔄 travelService.refreshAllData chamado');

    try {
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(true), // bypass cache
        travelService.getTravelMarkers(true), // bypass cache
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

// ⭐ NOVO: Serviço de diagnóstico
export const diagnosticService = {
  // Testar conectividade geral da API
  testApiConnection: async () => {
    console.log('🔍 Testando conectividade da API...');

    try {
      const response = await api.get('/');
      console.log('✅ API respondendo:', response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('❌ API não está respondendo:', error);
      return { success: false, error: error.message };
    }
  },

  // Verificar status de todos os serviços
  checkAllServices: async () => {
    console.log('🏥 Verificando status de todos os serviços...');

    const results = {
      api: { status: 'checking...' },
      auth: { status: 'checking...' },
      upload: { status: 'checking...' },
      travel: { status: 'checking...' },
    };

    // Testar API base
    try {
      await diagnosticService.testApiConnection();
      results.api = { status: 'ok' };
    } catch (error) {
      results.api = { status: 'error', error: error.message };
    }

    // Testar Auth
    try {
      if (authService.isAuthenticated()) {
        await authService.verifyToken();
        results.auth = { status: 'ok' };
      } else {
        results.auth = { status: 'not_authenticated' };
      }
    } catch (error) {
      results.auth = { status: 'error', error: error.message };
    }

    // Testar Upload
    try {
      await uploadService.testHealth();
      results.upload = { status: 'ok' };
    } catch (error) {
      results.upload = { status: 'error', error: error.message };
    }

    // Testar Travel
    try {
      await travelService.getTravelMarkers();
      results.travel = { status: 'ok' };
    } catch (error) {
      results.travel = { status: 'error', error: error.message };
    }

    console.log('🏥 Resultado do diagnóstico:', results);
    return results;
  },

  // Log informações do ambiente
  logEnvironmentInfo: () => {
    const info = {
      environment: {
        API_URL: API_URL,
        VITE_API_URL: import.meta.env.VITE_API_URL,
        MODE: import.meta.env.MODE,
        DEV: import.meta.env.DEV,
        PROD: import.meta.env.PROD,
      },
      browser: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        cookiesEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
      },
      auth: {
        hasToken: !!Cookies.get('memory-token'),
        tokenValue: Cookies.get('memory-token') ? 'present' : 'absent',
      },
    };

    console.log('🌍 Informações do ambiente:', info);
    return info;
  },
};

export default api;
