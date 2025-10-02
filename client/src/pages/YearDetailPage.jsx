import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { memoriesService, uploadService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Sidebar from '../components/layout/Sidebar';
import Footer from '../components/layout/Footer';
import ImageModal from '../components/memories/ImageModal';
import {
  Calendar,
  ImageIcon,
  BookOpen,
  Loader2,
  Plus,
  Upload,
  Grid,
  List,
  Download,
  Trash2,
  ZoomIn,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const YearDetailPage = () => {
  const { year } = useParams();
  const navigate = useNavigate();
  const [memories, setMemories] = useState({ photos: [], schoolWork: [] });
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('photos');
  const [viewMode, setViewMode] = useState('grid');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

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

  // ⭐ NOVA FUNÇÃO: Adicionar mais memórias ao ano existente
  const handleAddMoreMemories = () => {
    navigate('/upload', {
      state: {
        mode: 'add-to-year',
        existingYear: {
          year: year,
          category: activeTab === 'photos' ? 'photos' : 'school-work',
          yearLabel: yearLabels[year] || year,
        },
      },
    });
  };

  // ⭐ NOVA FUNÇÃO: Upload rápido direto na página
  const handleQuickUpload = async e => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    if (files.length > 10) {
      toast.error('Máximo de 10 imagens por vez');
      return;
    }

    setUploadingPhotos(true);

    try {
      const formData = new FormData();

      files.forEach(file => {
        formData.append('images', file);
      });

      formData.append('year', year);
      formData.append(
        'category',
        activeTab === 'photos' ? 'photos' : 'school-work'
      );
      formData.append(
        'description',
        `Adicionado em ${new Date().toLocaleDateString('pt-BR')}`
      );

      const response = await uploadService.uploadMemories(formData);

      if (response.success) {
        toast.success(
          `${files.length} ${
            activeTab === 'photos' ? 'fotos' : 'trabalhos'
          } adicionados com sucesso!`
        );

        // Atualizar lista de imagens localmente
        const newImages = response.images || [];

        if (activeTab === 'photos') {
          setMemories(prev => ({
            ...prev,
            photos: [...prev.photos, ...newImages],
          }));
        } else {
          setMemories(prev => ({
            ...prev,
            schoolWork: [...prev.schoolWork, ...newImages],
          }));
        }

        // Resetar input
        e.target.value = '';
      }
    } catch (error) {
      console.error('Erro ao adicionar imagens:', error);
      toast.error(
        `Erro ao adicionar ${activeTab === 'photos' ? 'fotos' : 'trabalhos'}`
      );
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleImageDeleted = deletedPublicId => {
    setMemories(prevMemories => ({
      photos: prevMemories.photos.filter(
        img => img.public_id !== deletedPublicId
      ),
      schoolWork: prevMemories.schoolWork.filter(
        img => img.public_id !== deletedPublicId
      ),
    }));

    if (selectedImage && selectedImage.public_id === deletedPublicId) {
      setSelectedImage(null);
    }
  };

  const handleNextImage = () => {
    const currentImages =
      activeTab === 'photos' ? memories.photos : memories.schoolWork;
    const nextIndex = (selectedImage.index + 1) % currentImages.length;

    setSelectedImage({
      ...currentImages[nextIndex],
      index: nextIndex,
      images: currentImages,
    });
  };

  const handlePreviousImage = () => {
    const currentImages =
      activeTab === 'photos' ? memories.photos : memories.schoolWork;
    const prevIndex =
      selectedImage.index === 0
        ? currentImages.length - 1
        : selectedImage.index - 1;

    setSelectedImage({
      ...currentImages[prevIndex],
      index: prevIndex,
      images: currentImages,
    });
  };

  const handleImageClick = (image, index) => {
    const currentImages =
      activeTab === 'photos' ? memories.photos : memories.schoolWork;
    setSelectedImage({ ...image, index, images: currentImages });
  };

  const handleDownloadAll = async () => {
    const currentImages =
      activeTab === 'photos' ? memories.photos : memories.schoolWork;

    if (currentImages.length === 0) {
      toast.error(
        `Nenhuma ${activeTab === 'photos' ? 'foto' : 'trabalho'} para baixar`
      );
      return;
    }

    toast.loading('Preparando download...', { id: 'download-all' });

    try {
      for (let i = 0; i < currentImages.length; i++) {
        const image = currentImages[i];
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `${yearLabels[year]}-${activeTab}-${i + 1}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`${currentImages.length} imagens baixadas!`, {
        id: 'download-all',
      });
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao baixar imagens', { id: 'download-all' });
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
            <div className='flex items-center justify-between'>
              <div>
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

              {/* ⭐ BOTÕES DE AÇÃO */}
              <div className='flex items-center space-x-3'>
                <button
                  onClick={handleDownloadAll}
                  className='btn-secondary flex items-center space-x-2'
                  disabled={currentImages.length === 0}
                >
                  <Download className='h-4 w-4' />
                  <span className='hidden sm:inline'>Baixar Tudo</span>
                </button>

                <button
                  onClick={handleAddMoreMemories}
                  className='btn-primary flex items-center space-x-2'
                  disabled={uploadingPhotos}
                >
                  {uploadingPhotos ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <Plus className='h-4 w-4' />
                  )}
                  <span>Adicionar</span>
                </button>

                {/* Input hidden para upload rápido */}
                <input
                  type='file'
                  id='quick-upload-year'
                  multiple
                  accept='image/*'
                  onChange={handleQuickUpload}
                  className='hidden'
                  disabled={uploadingPhotos}
                />
              </div>
            </div>

            {/* ⭐ BARRA DE FERRAMENTAS */}
            <div className='flex items-center justify-between mt-6'>
              {/* Tabs */}
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

              {/* View Mode Toggle */}
              <div className='flex bg-gray-100 rounded-lg p-1'>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'grid'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title='Visualização em grade'
                >
                  <Grid className='h-4 w-4' />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-all ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  title='Visualização em lista'
                >
                  <List className='h-4 w-4' />
                </button>
              </div>
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
          ) : currentImages.length > 0 || viewMode === 'grid' ? (
            <>
              {/* Grid View */}
              {viewMode === 'grid' && (
                <div className='grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
                  {/* ⭐ CARD DE ADICIONAR MAIS MEMÓRIAS */}
                  <div
                    onClick={() =>
                      document.getElementById('quick-upload-year').click()
                    }
                    className='aspect-square border-2 border-dashed border-gray-300 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all duration-200 cursor-pointer flex flex-col items-center justify-center group'
                  >
                    <Upload className='h-8 w-8 text-gray-400 group-hover:text-primary-500 mb-2' />
                    <span className='text-sm text-gray-600 group-hover:text-primary-600 font-medium'>
                      Upload Rápido
                    </span>
                    <span className='text-xs text-gray-500 mt-1'>
                      {activeTab === 'photos'
                        ? 'Adicionar fotos'
                        : 'Adicionar trabalhos'}
                    </span>
                  </div>

                  {currentImages.map((image, index) => (
                    <div
                      key={image.public_id}
                      className='group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in'
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => handleImageClick(image, index)}
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
                        <div className='absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity'>
                          {index + 1}
                        </div>

                        <div className='absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity'>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              const link = document.createElement('a');
                              link.href = image.url;
                              link.download = `${
                                yearLabels[year]
                              }-${activeTab}-${index + 1}.jpg`;
                              link.click();
                            }}
                            className='p-1.5 bg-white bg-opacity-90 rounded hover:bg-opacity-100 transition-all'
                            title='Baixar'
                          >
                            <Download className='h-3 w-3 text-gray-700' />
                          </button>

                          <button
                            onClick={async e => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  'Tem certeza que deseja excluir esta imagem?'
                                )
                              ) {
                                try {
                                  await uploadService.deleteImage(
                                    image.public_id
                                  );
                                  handleImageDeleted(image.public_id);
                                  toast.success('Imagem excluída com sucesso');
                                } catch (error) {
                                  toast.error('Erro ao excluir imagem');
                                }
                              }
                            }}
                            className='p-1.5 bg-red-600 bg-opacity-90 text-white rounded hover:bg-opacity-100 transition-all'
                            title='Excluir'
                          >
                            <Trash2 className='h-3 w-3' />
                          </button>
                        </div>

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
              )}

              {/* List View */}
              {viewMode === 'list' && (
                <div className='space-y-2'>
                  {/* ⭐ ITEM DE ADICIONAR MAIS MEMÓRIAS */}
                  <div
                    onClick={() =>
                      document.getElementById('quick-upload-year').click()
                    }
                    className='flex items-center bg-white rounded-lg shadow hover:shadow-md transition-all p-4 group cursor-pointer border-2 border-dashed border-gray-300 hover:border-primary-500'
                  >
                    <div className='w-20 h-20 rounded-lg flex items-center justify-center bg-gray-50 group-hover:bg-primary-50'>
                      <Upload className='h-8 w-8 text-gray-400 group-hover:text-primary-500' />
                    </div>
                    <div className='flex-1 ml-4'>
                      <div className='font-medium text-gray-900 group-hover:text-primary-600'>
                        Upload Rápido
                      </div>
                      <div className='text-sm text-gray-600'>
                        Clique para adicionar mais{' '}
                        {activeTab === 'photos'
                          ? 'fotos'
                          : 'trabalhos escolares'}
                      </div>
                    </div>
                    <ChevronRight className='h-5 w-5 text-gray-400 group-hover:text-primary-500' />
                  </div>

                  {currentImages.map((image, index) => (
                    <div
                      key={image.public_id}
                      className='flex items-center bg-white rounded-lg shadow hover:shadow-md transition-all p-4 group'
                    >
                      <div
                        className='w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer'
                        onClick={() => handleImageClick(image, index)}
                      >
                        <img
                          src={image.url}
                          alt={`${
                            activeTab === 'photos' ? 'Foto' : 'Trabalho'
                          } ${index + 1}`}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                        />
                      </div>

                      <div className='flex-1 ml-4'>
                        <div className='font-medium text-gray-900'>
                          {activeTab === 'photos' ? 'Foto' : 'Trabalho'}{' '}
                          {index + 1}
                        </div>
                        <div className='text-sm text-gray-600'>
                          {new Date(image.created_at).toLocaleDateString(
                            'pt-BR',
                            {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </div>
                        {image.width && image.height && (
                          <div className='text-xs text-gray-500 mt-1'>
                            {image.width} x {image.height} px
                          </div>
                        )}
                      </div>

                      <div className='flex items-center space-x-2'>
                        <button
                          onClick={() => handleImageClick(image, index)}
                          className='p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                          title='Visualizar'
                        >
                          <ZoomIn className='h-4 w-4' />
                        </button>

                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = image.url;
                            link.download = `${yearLabels[year]}-${activeTab}-${
                              index + 1
                            }.jpg`;
                            link.click();
                          }}
                          className='p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors'
                          title='Baixar'
                        >
                          <Download className='h-4 w-4' />
                        </button>

                        <button
                          onClick={async () => {
                            if (
                              window.confirm(
                                'Tem certeza que deseja excluir esta imagem?'
                              )
                            ) {
                              try {
                                await uploadService.deleteImage(
                                  image.public_id
                                );
                                handleImageDeleted(image.public_id);
                                toast.success('Imagem excluída com sucesso');
                              } catch (error) {
                                toast.error('Erro ao excluir imagem');
                              }
                            }
                          }}
                          className='p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                          title='Excluir'
                        >
                          <Trash2 className='h-4 w-4' />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
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

              <div className='flex items-center justify-center space-x-3'>
                <label
                  htmlFor='quick-upload-year'
                  className='btn-secondary flex items-center space-x-2 cursor-pointer'
                >
                  <Upload className='h-4 w-4' />
                  <span>Upload Rápido</span>
                </label>

                <button
                  onClick={handleAddMoreMemories}
                  className='btn-primary flex items-center space-x-2'
                >
                  <Plus className='h-4 w-4' />
                  <span>
                    Adicionar {activeTab === 'photos' ? 'Fotos' : 'Trabalhos'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          onNext={handleNextImage}
          onPrevious={handlePreviousImage}
          onImageDeleted={handleImageDeleted}
        />
      )}

      <Footer />
    </div>
  );
};

export default YearDetailPage;
