// client/src/components/travel/TravelAlbum.jsx - VERSÃO MELHORADA

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  MapPin,
  Calendar,
  Image,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
  Download,
  Share2,
  Info,
  Grid,
  List,
  ZoomIn,
  AlertCircle,
} from 'lucide-react';
import ImageModal from '../memories/ImageModal';
import DeleteTravelModal from './DeleteTravelModal';
import { travelService, uploadService } from '../../services/api';
import toast from 'react-hot-toast';

const TravelAlbum = ({ travel, onClose, onTravelDeleted }) => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState(travel.images || []);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [showInfo, setShowInfo] = useState(false);
  const [deletingImage, setDeletingImage] = useState(null);
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState(false);

  // ⭐ CALCULAR ESTATÍSTICAS DO ÁLBUM
  const albumStats = {
    totalImages: images.length,
    albumSize: images.reduce((acc, img) => acc + (img.bytes || 0), 0),
    oldestPhoto:
      images.length > 0
        ? new Date(Math.min(...images.map(img => new Date(img.created_at))))
        : null,
    newestPhoto:
      images.length > 0
        ? new Date(Math.max(...images.map(img => new Date(img.created_at))))
        : null,
  };

  // ⭐ FECHAR MENU AO CLICAR FORA
  useEffect(() => {
    const handleClickOutside = e => {
      if (showMenu && !e.target.closest('.menu-container')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMenu]);

  // ⭐ FUNÇÃO PARA DELETAR IMAGEM INDIVIDUAL
  const handleDeleteImage = async imageToDelete => {
    if (!imageToDelete) return;

    // Mostrar confirmação
    setDeletingImage(imageToDelete);
    setShowDeleteImageConfirm(true);
  };

  // ⭐ CONFIRMAR EXCLUSÃO DE IMAGEM
  const confirmDeleteImage = async () => {
    if (!deletingImage) return;

    try {
      console.log('🗑️ Deletando imagem:', deletingImage.public_id);

      // Deletar via API
      await uploadService.deleteImage(deletingImage.public_id);

      // Atualizar estado local
      const updatedImages = images.filter(
        img => img.public_id !== deletingImage.public_id
      );
      setImages(updatedImages);

      // Atualizar objeto travel
      travel.images = updatedImages;
      travel.imageCount = updatedImages.length;

      // Fechar modal de confirmação
      setShowDeleteImageConfirm(false);
      setDeletingImage(null);

      toast.success('Foto removida do álbum');

      // Se não sobrou nenhuma imagem, sugerir exclusão do álbum
      if (updatedImages.length === 0) {
        setTimeout(() => {
          toast(
            t => (
              <div className='flex flex-col space-y-2'>
                <div className='font-semibold'>Álbum Vazio</div>
                <div className='text-sm'>Este álbum não possui mais fotos.</div>
                <div className='flex space-x-2 mt-2'>
                  <button
                    onClick={() => {
                      toast.dismiss(t.id);
                      handleOpenDeleteModal();
                    }}
                    className='bg-red-600 text-white px-3 py-1.5 rounded text-sm hover:bg-red-700 transition-colors'
                  >
                    Excluir Álbum
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className='bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-300 transition-colors'
                  >
                    Manter Vazio
                  </button>
                </div>
              </div>
            ),
            { duration: 10000 }
          );
        }, 500);
      }
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      toast.error('Erro ao remover foto');
    }
  };

  // ⭐ FUNÇÃO PARA ABRIR IMAGEM COM NAVEGAÇÃO
  const handleImageClick = (image, index) => {
    setSelectedImage({
      ...image,
      index,
      images: images,
    });
  };

  // ⭐ CALLBACK QUANDO IMAGEM É DELETADA NO MODAL
  const handleImageDeleted = deletedPublicId => {
    const updatedImages = images.filter(
      img => img.public_id !== deletedPublicId
    );
    setImages(updatedImages);
    travel.images = updatedImages;
    travel.imageCount = updatedImages.length;
    setSelectedImage(null);

    if (updatedImages.length === 0) {
      toast('Álbum ficou vazio. Considere excluí-lo.', { icon: '⚠️' });
    }
  };

  // ⭐ ABRIR MODAL DE EXCLUSÃO DO ÁLBUM
  const handleOpenDeleteModal = () => {
    setShowMenu(false);
    setTimeout(() => {
      setShowDeleteModal(true);
    }, 100);
  };

  // ⭐ CALLBACK APÓS EXCLUSÃO DO ÁLBUM
  const handleAlbumDeleted = (travelId, details) => {
    console.log('✅ Álbum excluído:', travelId);
    setShowDeleteModal(false);

    setTimeout(() => {
      onClose();
      if (onTravelDeleted) {
        onTravelDeleted(travelId, details);
      }
    }, 100);
  };

  // ⭐ DOWNLOAD DE TODAS AS FOTOS
  const handleDownloadAll = async () => {
    if (images.length === 0) {
      toast.error('Nenhuma foto para baixar');
      return;
    }

    toast.loading('Preparando download...', { id: 'download-all' });

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const link = document.createElement('a');
        link.href = image.url;
        link.download = `${travel.name}-foto-${i + 1}.${image.format || 'jpg'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Pequeno delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast.success(`${images.length} fotos baixadas!`, { id: 'download-all' });
    } catch (error) {
      console.error('Erro no download:', error);
      toast.error('Erro ao baixar fotos', { id: 'download-all' });
    }
  };

  return (
    <>
      <div className='fixed inset-0 z-[9999] bg-black bg-opacity-60 flex items-center justify-center p-4'>
        <div className='bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[90vh] overflow-hidden z-[9999] relative'>
          {/* ⭐ HEADER MELHORADO */}
          <div className='bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex-1'>
                <h2 className='text-2xl font-bold mb-3'>{travel.name}</h2>
                <div className='flex flex-wrap items-center gap-4 text-blue-100'>
                  <div className='flex items-center space-x-2'>
                    <MapPin className='h-4 w-4' />
                    <span className='text-sm'>
                      {travel.location || 'Localização não especificada'}
                    </span>
                  </div>
                  {travel.date && (
                    <div className='flex items-center space-x-2'>
                      <Calendar className='h-4 w-4' />
                      <span className='text-sm'>
                        {new Date(travel.date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  )}
                  <div className='flex items-center space-x-2'>
                    <Image className='h-4 w-4' />
                    <span className='text-sm font-medium'>
                      {images.length} {images.length === 1 ? 'foto' : 'fotos'}
                    </span>
                  </div>
                </div>
              </div>

              {/* ⭐ AÇÕES DO HEADER */}
              <div className='flex items-center space-x-2'>
                {/* View Mode Toggle */}
                <div className='flex bg-white bg-opacity-20 rounded-lg p-1'>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'grid'
                        ? 'bg-white text-blue-600'
                        : 'text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                    title='Visualização em grade'
                  >
                    <Grid className='h-4 w-4' />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-all ${
                      viewMode === 'list'
                        ? 'bg-white text-blue-600'
                        : 'text-white hover:bg-white hover:bg-opacity-10'
                    }`}
                    title='Visualização em lista'
                  >
                    <List className='h-4 w-4' />
                  </button>
                </div>

                {/* Info Button */}
                <button
                  onClick={() => setShowInfo(!showInfo)}
                  className='p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all'
                  title='Informações do álbum'
                >
                  <Info className='h-5 w-5' />
                </button>

                {/* Menu Dropdown */}
                <div className='relative menu-container'>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setShowMenu(!showMenu);
                    }}
                    className='p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all'
                  >
                    <MoreVertical className='h-5 w-5' />
                  </button>

                  {/* ⭐ DROPDOWN MENU MELHORADO */}
                  {showMenu && (
                    <div className='absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border z-[10001] min-w-[200px] overflow-hidden'>
                      <button
                        onClick={handleDownloadAll}
                        className='w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors'
                      >
                        <Download className='h-4 w-4' />
                        <span className='text-sm'>Baixar todas as fotos</span>
                      </button>

                      <button
                        onClick={() => {
                          navigator
                            .share({
                              title: travel.name,
                              text: `Álbum de viagem: ${travel.name}`,
                              url: window.location.href,
                            })
                            .catch(() => {
                              toast('Link copiado!');
                            });
                          setShowMenu(false);
                        }}
                        className='w-full px-4 py-3 text-left text-gray-700 hover:bg-gray-50 flex items-center space-x-3 transition-colors border-t'
                      >
                        <Share2 className='h-4 w-4' />
                        <span className='text-sm'>Compartilhar</span>
                      </button>

                      <button
                        onClick={handleOpenDeleteModal}
                        className='w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors border-t'
                      >
                        <Trash2 className='h-4 w-4' />
                        <span className='text-sm font-medium'>
                          Excluir álbum
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className='p-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition-all ml-2'
                >
                  <X className='h-6 w-6' />
                </button>
              </div>
            </div>
          </div>

          {/* ⭐ INFO PANEL */}
          {showInfo && (
            <div className='bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200 p-4'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                <div>
                  <div className='text-gray-600'>Total de fotos</div>
                  <div className='font-semibold text-gray-900'>
                    {albumStats.totalImages}
                  </div>
                </div>
                <div>
                  <div className='text-gray-600'>Tamanho do álbum</div>
                  <div className='font-semibold text-gray-900'>
                    {(albumStats.albumSize / (1024 * 1024)).toFixed(2)} MB
                  </div>
                </div>
                {albumStats.oldestPhoto && (
                  <div>
                    <div className='text-gray-600'>Foto mais antiga</div>
                    <div className='font-semibold text-gray-900'>
                      {albumStats.oldestPhoto.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
                {albumStats.newestPhoto && (
                  <div>
                    <div className='text-gray-600'>Foto mais recente</div>
                    <div className='font-semibold text-gray-900'>
                      {albumStats.newestPhoto.toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ⭐ CONTENT AREA */}
          <div
            className='p-6 overflow-y-auto bg-gray-50'
            style={{ maxHeight: 'calc(90vh - 200px)' }}
          >
            {images.length > 0 ? (
              <>
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4'>
                    {images.map((image, index) => (
                      <div
                        key={image.public_id}
                        className='group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white animate-fade-in'
                        style={{
                          animationDelay: `${Math.min(index * 50, 1000)}ms`,
                        }}
                      >
                        <img
                          src={image.url}
                          alt={`${travel.name} - Foto ${index + 1}`}
                          className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                          loading='lazy'
                          onClick={() => handleImageClick(image, index)}
                        />

                        {/* ⭐ OVERLAY COM AÇÕES */}
                        <div className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300'>
                          {/* Número da foto */}
                          <div className='absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded'>
                            {index + 1}
                          </div>

                          {/* Botões de ação */}
                          <div className='absolute top-2 right-2 flex space-x-1'>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                const link = document.createElement('a');
                                link.href = image.url;
                                link.download = `${travel.name}-foto-${
                                  index + 1
                                }.jpg`;
                                link.click();
                              }}
                              className='p-1.5 bg-white bg-opacity-90 rounded-lg hover:bg-opacity-100 transition-all'
                              title='Baixar foto'
                            >
                              <Download className='h-3 w-3 text-gray-700' />
                            </button>

                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDeleteImage(image);
                              }}
                              className='p-1.5 bg-red-600 bg-opacity-90 text-white rounded-lg hover:bg-opacity-100 transition-all'
                              title='Excluir foto'
                            >
                              <Trash2 className='h-3 w-3' />
                            </button>
                          </div>

                          {/* Info da foto */}
                          <div className='absolute bottom-2 left-2 right-2'>
                            <div className='bg-white bg-opacity-90 backdrop-blur-sm rounded px-2 py-1'>
                              <p className='text-xs text-gray-700'>
                                {new Date(image.created_at).toLocaleDateString(
                                  'pt-BR'
                                )}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Botão de zoom */}
                        <button
                          onClick={() => handleImageClick(image, index)}
                          className='absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300'
                        >
                          <ZoomIn className='h-8 w-8 text-white opacity-0 group-hover:opacity-100 transform scale-0 group-hover:scale-100 transition-all duration-300' />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <div className='space-y-2'>
                    {images.map((image, index) => (
                      <div
                        key={image.public_id}
                        className='flex items-center bg-white rounded-lg shadow hover:shadow-md transition-all p-3 group'
                      >
                        <div
                          className='w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 cursor-pointer'
                          onClick={() => handleImageClick(image, index)}
                        >
                          <img
                            src={image.url}
                            alt={`Foto ${index + 1}`}
                            className='w-full h-full object-cover group-hover:scale-105 transition-transform'
                          />
                        </div>

                        <div className='flex-1 ml-4'>
                          <div className='font-medium text-gray-900'>
                            Foto {index + 1}
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
                          <div className='text-xs text-gray-500 mt-1'>
                            {image.width} x {image.height} px
                          </div>
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
                              link.download = `${travel.name}-foto-${
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
                            onClick={() => handleDeleteImage(image)}
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
              // ⭐ ESTADO VAZIO MELHORADO
              <div className='text-center py-16'>
                <div className='bg-gray-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Image className='h-12 w-12 text-gray-400' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Álbum Vazio
                </h3>
                <p className='text-gray-600 mb-6 max-w-md mx-auto'>
                  Este álbum de viagem não possui fotos. Você pode adicionar
                  novas fotos ou excluir o álbum vazio.
                </p>
                <div className='flex items-center justify-center space-x-3'>
                  <button
                    onClick={() => navigate('/upload')}
                    className='bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2'
                  >
                    <Image className='h-4 w-4' />
                    <span>Adicionar Fotos</span>
                  </button>
                  <button
                    onClick={handleOpenDeleteModal}
                    className='bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2'
                  >
                    <Trash2 className='h-4 w-4' />
                    <span>Excluir Álbum</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ⭐ FOOTER */}
          <div className='bg-white px-6 py-4 border-t border-gray-200'>
            <div className='flex items-center justify-between'>
              <div className='text-sm text-gray-600'>
                {images.length > 0 ? (
                  <>
                    {images.length} {images.length === 1 ? 'foto' : 'fotos'} •{' '}
                    {(
                      images.reduce((acc, img) => acc + (img.bytes || 0), 0) /
                      (1024 * 1024)
                    ).toFixed(2)}{' '}
                    MB
                  </>
                ) : (
                  <span className='text-orange-600'>Álbum vazio</span>
                )}
              </div>

              <button
                onClick={onClose}
                className='px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium'
              >
                Fechar Álbum
              </button>
            </div>
          </div>
        </div>

        {/* ⭐ MODAL DE CONFIRMAÇÃO DE EXCLUSÃO DE FOTO */}
        {showDeleteImageConfirm && deletingImage && (
          <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10002] p-4'>
            <div className='bg-white rounded-lg p-6 max-w-md w-full'>
              <div className='flex items-start space-x-3 mb-4'>
                <AlertCircle className='h-6 w-6 text-red-600 flex-shrink-0' />
                <div>
                  <h3 className='text-lg font-semibold text-gray-900'>
                    Excluir Foto
                  </h3>
                  <p className='text-sm text-gray-600 mt-1'>
                    Esta ação não pode ser desfeita. A foto será removida
                    permanentemente do álbum.
                  </p>
                </div>
              </div>

              {/* Preview da imagem a ser deletada */}
              <div className='mb-4 p-2 bg-gray-50 rounded-lg'>
                <img
                  src={deletingImage.url}
                  alt='Foto a ser excluída'
                  className='w-full h-32 object-cover rounded'
                />
              </div>

              <div className='flex justify-end space-x-3'>
                <button
                  onClick={() => {
                    setShowDeleteImageConfirm(false);
                    setDeletingImage(null);
                  }}
                  className='px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteImage}
                  className='px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2'
                >
                  <Trash2 className='h-4 w-4' />
                  <span>Excluir Foto</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ⭐ MODAL DE VISUALIZAÇÃO DE IMAGEM */}
        {selectedImage && (
          <ImageModal
            image={selectedImage}
            onClose={() => setSelectedImage(null)}
            onImageDeleted={handleImageDeleted}
            onNext={() => {
              const nextIndex = (selectedImage.index + 1) % images.length;
              setSelectedImage({
                ...images[nextIndex],
                index: nextIndex,
                images: images,
              });
            }}
            onPrevious={() => {
              const prevIndex =
                selectedImage.index === 0
                  ? images.length - 1
                  : selectedImage.index - 1;
              setSelectedImage({
                ...images[prevIndex],
                index: prevIndex,
                images: images,
              });
            }}
          />
        )}
      </div>

      {/* ⭐ MODAL DE EXCLUSÃO DO ÁLBUM */}
      {showDeleteModal && (
        <DeleteTravelModal
          travel={travel}
          onClose={() => setShowDeleteModal(false)}
          onDeleted={handleAlbumDeleted}
          travelService={travelService}
        />
      )}
    </>
  );
};

export default TravelAlbum;
