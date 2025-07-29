import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Heart, MapPin, Upload, LogOut, Menu, X, Baby } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Memórias', path: '/', icon: Heart },
    { name: 'Viagens', path: '/travels', icon: MapPin },
    { name: 'Adicionar', path: '/upload', icon: Upload },
  ];

  const isActive = path => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    setMobileMenuOpen(false);
  };

  return (
    <nav className='sticky top-0 z-50 bg-white shadow-lg border-b border-gray-200'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='flex justify-between items-center h-16'>
          {/* Logo */}
          <Link to='/' className='flex items-center space-x-3'>
            <div className='bg-primary-600 p-2 rounded-lg'>
              <Baby className='h-6 w-6 text-white' />
            </div>
            <span className='text-xl font-bold text-gray-900'>
              Memórias do Nosso Filho
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className='hidden md:flex items-center space-x-8'>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                    isActive(item.path)
                      ? 'text-primary-600 bg-primary-50'
                      : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className='h-4 w-4' />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className='hidden md:flex items-center space-x-4'>
            <span className='text-sm text-gray-600'>Olá, {user?.username}</span>
            <button
              onClick={handleLogout}
              className='flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200'
            >
              <LogOut className='h-4 w-4' />
              <span>Sair</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className='md:hidden'>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className='p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-50 transition-colors duration-200'
            >
              {mobileMenuOpen ? (
                <X className='h-6 w-6' />
              ) : (
                <Menu className='h-6 w-6' />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className='md:hidden border-t border-gray-200 py-4 animate-slide-up'>
            <div className='space-y-2'>
              {navItems.map(item => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-md text-base font-medium transition-colors duration-200 ${
                      isActive(item.path)
                        ? 'text-primary-600 bg-primary-50'
                        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className='h-5 w-5' />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              <div className='border-t border-gray-200 pt-4 mt-4'>
                <div className='px-3 py-2'>
                  <p className='text-sm text-gray-600'>
                    Logado como {user?.username}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className='flex items-center space-x-3 px-3 py-2 w-full text-left text-base font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors duration-200'
                >
                  <LogOut className='h-5 w-5' />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
