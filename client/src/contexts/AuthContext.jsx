import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/api';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (authService.isAuthenticated()) {
        const response = await authService.verifyToken();
        if (response.valid) {
          setUser(response.user);
          setIsAuthenticated(true);
        } else {
          authService.logout();
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);

      // ⭐ DEBUG - Ver o que está sendo enviado
      console.log('🔐 Tentando login com:', { username, password });
      console.log('🌐 API URL:', import.meta.env.VITE_API_URL);

      const response = await authService.login(username, password);

      // ⭐ DEBUG - Ver a resposta
      console.log('📤 Resposta do login:', response);

      if (response.success) {
        setUser(response.user);
        setIsAuthenticated(true);
        toast.success('Login realizado com sucesso!');
        console.log('✅ Login bem-sucedido!');
        return { success: true };
      } else {
        console.log('❌ Login falhou - success: false');
        toast.error('Credenciais inválidas');
        return { success: false, error: 'Login failed' };
      }
    } catch (error) {
      console.error('❌ Erro no login:', error);
      console.log('📋 Detalhes do erro:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const message = error.response?.data?.error || 'Erro ao fazer login';
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    authService.logout();
    toast.success('Logout realizado com sucesso!');
  };

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
