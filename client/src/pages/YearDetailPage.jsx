import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { memoriesService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';
import ImageModal from '../components/memories/ImageModal';
import { Calendar, ImageIcon, BookOpen, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const YearDetailPage = () => {
  const { year } = useParams();
  const [memories, setMemories] = useState({ photos: [], schoolWork: [] });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('photos');

  const yearLabels = {
    '0-12-months': '0-12 meses',
    '1-year': '1 ano',
    '2-years': '2 anos',
    '3-years': '3 anos',
    '4-years': '4 anos',
    '5-years': '5 anos',
    '6-years': '6 anos',
    '7-years': '7 anos',
    '8-years': '8 anos',
    '9-years': '9 anos',
    '10-years': '10 anos',
  };

  useEffect(() => {
    if (year) {
      loadMemories();
    }
  }, [year]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const response = await memoriesService.getMemoriesByYear(year);
      if (response.success) {
        setMemories(response.memories);
      }
    } catch (error) {
      console.error('Error loading memories:', error);
      toast.error('Erro ao carregar memórias');
    } finally {
      setLoading(false);
    }
  };

  const currentImages =
    activeTab === 'photos' ? memories.photos : memories.schoolWork;

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <div className='flex'>
        <Sidebar />

        <main className='flex-1 p-6'>
          {/* Header */}
          <div className='mb-8'>
            <div className='flex items-center space-x-3 mb-4'>
              <Calendar className='h-6 w-6 text-primary-600' />
              <h1 className='text-3xl font-bold text-gray-900'>
                {yearLabels[year] || year}
              </h1>
            </div>

            <p className='text-gray-600'>
              Todas as memórias guardadas durante este período especial
            </p>
          </div>

          {/* Tabs */}
          <div className='mb-6'>
            <div className='border-b border-gray-200'>
              <nav className='-mb-px flex space-x-8'>
                <button
                  onClick={() => setActiveTab('photos')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'photos'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center space-x-2'>
                    <ImageIcon className='h-4 w-4' />
                    <span>Fotos ({memories.photos.length})</span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('schoolWork')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    activeTab === 'schoolWork'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className='flex items-center space-x-2'>
                    <BookOpen className='h-4 w-4' />
                    <span>
                      Trabalhos Escolares ({memories.schoolWork.length})
                    </span>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className='flex items-center justify-center py-12'>
              <div className='flex flex-col items-center space-y-4'>
                <Loader2 className='h-8 w-8 animate-spin text-primary-600' />
                <p className='text-gray-600'>Carregando memórias...</p>
              </div>
            </div>
          ) : currentImages.length > 0 ? (
            <div className='image-grid'>
              {currentImages.map((image, index) => (
                <div
                  key={image.public_id}
                  className='group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in'
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() =>
                    setSelectedImage({ ...image, index, images: currentImages })
                  }
                >
                  <img
                    src={image.url}
                    alt={`Memória ${
                      activeTab === 'photos' ? 'foto' : 'trabalho escolar'
                    }`}
                    className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    loading='lazy'
                  />

                  <div className='absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300'>
                    <div className='absolute bottom-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                      <div className='bg-white bg-opacity-90 backdrop-blur-sm rounded px-2 py-1'>
                        <p className='text-xs text-gray-700 truncate'>
                          {new Date(image.created_at).toLocaleDateString(
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
              {activeTab === 'photos' ? (
                <ImageIcon className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              ) : (
                <BookOpen className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              )}

              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Nenhuma {activeTab === 'photos' ? 'foto' : 'trabalho escolar'}{' '}
                ainda
              </h3>

              <p className='text-gray-600 mb-6'>
                {activeTab === 'photos'
                  ? 'Adicione as primeiras fotos desta fase'
                  : 'Adicione os primeiros trabalhos escolares'}
              </p>

              <button className='btn-primary'>
                Adicionar {activeTab === 'photos' ? 'Fotos' : 'Trabalhos'}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNext={() => {
            const nextIndex =
              (selectedImage.index + 1) % selectedImage.images.length;
            setSelectedImage({
              ...selectedImage.images[nextIndex],
              index: nextIndex,
              images: selectedImage.images,
            });
          }}
          onPrevious={() => {
            const prevIndex =
              selectedImage.index === 0
                ? selectedImage.images.length - 1
                : selectedImage.index - 1;
            setSelectedImage({
              ...selectedImage.images[prevIndex],
              index: prevIndex,
              images: selectedImage.images,
            });
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default YearDetailPage;
