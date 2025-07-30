import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, LogIn, Baby, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async data => {
    console.log('🚀 onSubmit chamado com dados:', data);
    console.log('👤 Username:', data.username);
    console.log('🔒 Password:', data.password);

    setIsLoggingIn(true);

    try {
      const result = await login(data.username, data.password);
      console.log('📝 Resultado do login:', result);

      if (!result.success) {
        console.log('❌ Login falhou, parando loading...');
        setIsLoggingIn(false);
      } else {
        console.log('✅ Login sucesso! Deveria redirecionar...');
      }
    } catch (error) {
      console.error('💥 Erro no onSubmit:', error);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-primary-50 via-white to-secondary-50 flex items-center justify-center px-4 sm:px-6 lg:px-8'>
      <div className='max-w-md w-full space-y-8'>
        {/* Header */}
        <div className='text-center'>
          <div className='flex justify-center items-center space-x-3 mb-6'>
            <div className='bg-primary-600 p-3 rounded-full'>
              <Baby className='h-8 w-8 text-white' />
            </div>
          </div>

          <h2 className='text-3xl font-bold text-gray-900 mb-2'>Bem-vindos</h2>

          <p className='text-gray-600 mb-2'>
            Acesse as memórias do nosso filho
          </p>

          <div className='flex items-center justify-center space-x-2 text-sm text-gray-500'>
            <span>Feito com</span>
            <Heart className='h-4 w-4 text-red-500 fill-current' />
            <span>para nossa família</span>
          </div>
        </div>

        {/* Login Form */}
        <div className='bg-white py-8 px-6 shadow-xl rounded-lg'>
          {/* ⭐ DEBUG INFO */}
          <div className='mb-4 p-2 bg-gray-100 rounded text-xs'>
            <div>
              <strong>Debug Info:</strong>
            </div>
            <div>API URL: {import.meta.env.VITE_API_URL}</div>
            <div>isAuthenticated: {isAuthenticated.toString()}</div>
            <div>loading: {loading.toString()}</div>
            <div>isLoggingIn: {isLoggingIn.toString()}</div>
          </div>

          <form className='space-y-6' onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label
                htmlFor='username'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Usuário
              </label>
              <input
                {...register('username', {
                  required: 'Usuário é obrigatório',
                  minLength: {
                    value: 3,
                    message: 'Usuário deve ter pelo menos 3 caracteres',
                  },
                })}
                type='text'
                id='username'
                name='username'
                autoComplete='username'
                defaultValue='admin_memories'
                className={`input-field ${
                  errors.username ? 'border-red-500 focus:ring-red-500' : ''
                }`}
                placeholder='Digite seu usuário'
                disabled={isLoggingIn}
              />
              {errors.username && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor='password'
                className='block text-sm font-medium text-gray-700 mb-2'
              >
                Senha
              </label>
              <div className='relative'>
                <input
                  {...register('password', {
                    required: 'Senha é obrigatória',
                    minLength: {
                      value: 6,
                      message: 'Senha deve ter pelo menos 6 caracteres',
                    },
                  })}
                  type={showPassword ? 'text' : 'password'}
                  id='password'
                  name='password'
                  autoComplete='current-password'
                  defaultValue='33167960Riviera'
                  className={`input-field pr-10 ${
                    errors.password ? 'border-red-500 focus:ring-red-500' : ''
                  }`}
                  placeholder='Digite sua senha'
                  disabled={isLoggingIn}
                />
                <button
                  type='button'
                  className='absolute inset-y-0 right-0 pr-3 flex items-center'
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoggingIn}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4 text-gray-400 hover:text-gray-600' />
                  ) : (
                    <Eye className='h-4 w-4 text-gray-400 hover:text-gray-600' />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className='mt-1 text-sm text-red-600'>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type='submit'
              disabled={isLoggingIn || loading}
              className='w-full flex justify-center items-center space-x-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200'
            >
              {isLoggingIn ? (
                <>
                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <LogIn className='h-4 w-4' />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Help Text */}
          <div className='mt-6 text-center'>
            <p className='text-xs text-gray-500'>
              Acesso restrito apenas para os pais
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='text-center'>
          <p className='text-xs text-gray-400'>
            Site privado de memórias familiares
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
