import React from 'react';
import { Heart, Baby } from 'lucide-react';

const Footer = () => {
  return (
    <footer className='bg-gray-900 text-white'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='flex flex-col items-center space-y-4'>
          {/* Logo */}
          <div className='flex items-center space-x-3'>
            <div className='bg-primary-600 p-2 rounded-lg'>
              <Baby className='h-5 w-5 text-white' />
            </div>
            <span className='text-lg font-semibold'>
              Memórias do Nosso Filho
            </span>
          </div>

          {/* Description */}
          <p className='text-center text-gray-400 max-w-md'>
            Um lugar especial para guardar todos os momentos preciosos da
            jornada do nosso pequeno
          </p>

          {/* Divider */}
          <div className='w-full border-t border-gray-700 pt-6'>
            <div className='flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0'>
              {/* Copyright */}
              <div className='flex items-center space-x-2 text-sm text-gray-400'>
                <span>© {new Date().getFullYear()} Feito com</span>
                <Heart className='h-4 w-4 text-red-500 fill-current' />
                <span>para nossa família</span>
              </div>

              {/* Tech Info */}
              <div className='text-xs text-gray-500'>
                React + Node.js + Cloudinary
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
