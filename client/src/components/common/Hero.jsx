import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { memoriesService, travelService } from '../../services/api';
import {
  Upload,
  MapPin,
  Calendar,
  ImageIcon,
  ArrowRight,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Hero = () => {
  const [recentMemories, setRecentMemories] = useState([]);
  const [stats, setStats] = useState({
    totalPhotos: 0,
    totalTravels: 0,
    loading: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Carregar dados em paralelo
      const [memoriesResponse, travelsResponse] = await Promise.all([
        memoriesService.getRecentMemories(),
        travelService.getAllTravels(),
      ]);

      // Processar memórias recentes
      if (memoriesResponse.success) {
        const memories = memoriesResponse.recentMemories || [];
        setRecentMemories(memories.slice(0, 8));

        // Contar total de fotos
        setStats(prev => ({
          ...prev,
          totalPhotos: memories.length,
        }));
      }

      // Processar viagens
      if (travelsResponse.success) {
        const travels = travelsResponse.travels || [];
        setStats(prev => ({
          ...prev,
          totalTravels: travels.length,
        }));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
      setStats(prev => ({
        ...prev,
        loading: false,
      }));
    }
  };

  return (
    <div className='bg-gradient-to-br from-primary-50 via-white to-secondary-50'>
      {/* Main Hero Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16'>
        <div className='text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-6'>
            Memórias do{' '}
            <span className='text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-secondary-600'>
              Nosso Filho
            </span>
          </h1>

          <p className='text-xl text-gray-600 max-w-3xl mx-auto mb-8'>
            Cada sorriso, cada conquista, cada momento especial guardado com
            carinho. Uma jornada única de crescimento e descobertas.
          </p>

          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
            <Link
              to='/upload'
              className='btn-primary flex items-center space-x-2 px-6 py-3 text-lg hover:scale-105 transition-transform duration-200'
            >
              <Upload className='h-5 w-5' />
              <span>Adicionar Memórias</span>
            </Link>

            <Link
              to='/travels'
              className='btn-secondary flex items-center space-x-2 px-6 py-3 text-lg hover:scale-105 transition-transform duration-200'
            >
              <MapPin className='h-5 w-5' />
              <span>Nossas Viagens</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Memories Section */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
        <div className='bg-white rounded-2xl shadow-lg p-8'>
          <div className='flex items-center justify-between mb-8'>
            <div className='flex items-center space-x-3'>
              <Calendar className='h-6 w-6 text-primary-600' />
              <h2 className='text-2xl font-bold text-gray-900'>
                Memórias Recentes
              </h2>
            </div>

            <Link
              to='/year/0-12-months'
              className='group inline-flex items-center space-x-2 bg-primary-100 hover:bg-primary-200 text-primary-700 hover:text-primary-800 px-4 py-2 rounded-full font-medium text-sm transition-all duration-200 hover:scale-105 shadow-sm hover:shadow-md'
            >
              <Eye className='h-4 w-4' />
              <span>Ver todas as fotos</span>
              <ArrowRight className='h-4 w-4 group-hover:translate-x-1 transition-transform duration-200' />
            </Link>
          </div>

          {loading ? (
            <div className='image-grid'>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className='animate-pulse'>
                  <div className='aspect-square bg-gray-200 rounded-lg'></div>
                </div>
              ))}
            </div>
          ) : recentMemories.length > 0 ? (
            <div className='image-grid'>
              {recentMemories.map((memory, index) => (
                <div
                  key={memory.public_id}
                  className='group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 animate-fade-in'
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <img
                    src={memory.url}
                    alt='Memória recente'
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    loading='lazy'
                  />

                  <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300'>
                    <div className='absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                      <div className='bg-white bg-opacity-90 backdrop-blur-sm rounded px-2 py-1'>
                        <p className='text-xs text-gray-700 truncate'>
                          {new Date(memory.created_at).toLocaleDateString(
                            'pt-BR'
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='text-center py-12'>
              <ImageIcon className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Nenhuma memória ainda
              </h3>
              <p className='text-gray-600 mb-6'>
                Comece adicionando as primeiras fotos do seu filho
              </p>
              <Link
                to='/upload'
                className='btn-primary inline-flex items-center space-x-2 hover:scale-105 transition-transform duration-200'
              >
                <Upload className='h-4 w-4' />
                <span>Adicionar Primeira Memória</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16'>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200'>
            <div className='bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4'>
              <ImageIcon className='h-6 w-6 text-primary-600' />
            </div>
            <h3 className='text-2xl font-bold text-gray-900 mb-2'>
              {stats.loading ? (
                <div className='animate-pulse bg-gray-200 h-8 w-16 rounded mx-auto'></div>
              ) : stats.totalPhotos > 0 ? (
                `${stats.totalPhotos}+`
              ) : (
                '0'
              )}
            </h3>
            <p className='text-gray-600'>Fotos Guardadas</p>
          </div>

          <div className='bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200'>
            <div className='bg-secondary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4'>
              <Calendar className='h-6 w-6 text-secondary-600' />
            </div>
            <h3 className='text-2xl font-bold text-gray-900 mb-2'>
              {new Date().getFullYear() - 2023}
            </h3>
            <p className='text-gray-600'>Anos de Vida</p>
          </div>

          <div className='bg-white rounded-xl shadow-md p-6 text-center hover:shadow-lg transition-shadow duration-200'>
            <div className='bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4'>
              <MapPin className='h-6 w-6 text-green-600' />
            </div>
            <h3 className='text-2xl font-bold text-gray-900 mb-2'>
              {stats.loading ? (
                <div className='animate-pulse bg-gray-200 h-8 w-16 rounded mx-auto'></div>
              ) : (
                stats.totalTravels
              )}
            </h3>
            <p className='text-gray-600'>Viagens Registradas</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
