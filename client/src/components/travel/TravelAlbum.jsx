import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Image,
  ChevronLeft,
  ChevronRight,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import ImageModal from '../memories/ImageModal';
import DeleteTravelModal from './DeleteTravelModal';
import { travelService } from '../../services/api';
import toast from 'react-hot-toast';

const TravelAlbum = ({ travel, onClose, onTravelDeleted }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState(travel.images);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleImageClick = (image, index) => {
    setSelectedImage({
      ...image,
      index,
      images: images,
    });
  };

  const handleImageDeleted = deletedPublicId => {
    // Remove the deleted image from the local state
    const updatedImages = images.filter(
      img => img.public_id !== deletedPublicId
    );
    setImages(updatedImages);
    setSelectedImage(null);

    // Update the travel object
    travel.images = updatedImages;
    travel.imageCount = updatedImages.length;

    // ⭐ Se não sobrou nenhuma imagem, sugerir excluir o álbum
    if (updatedImages.length === 0) {
      toast(
        t => (
          <div className='flex flex-col space-y-2'>
            <div className='font-medium'>Álbum vazio!</div>
            <div className='text-sm text-gray-600'>
              Este álbum não possui mais imagens.
            </div>
            <div className='flex space-x-2'>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  handleOpenDeleteModal();
                }}
                className='bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700'
              >
                Excluir Álbum
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className='bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300'
              >
                Manter
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      );
    }
  };

  // ⭐ FUNÇÃO PARA ABRIR MODAL DE EXCLUSÃO (com delay para evitar conflito de z-index)
  const handleOpenDeleteModal = () => {
    setShowMenu(false); // Fechar menu primeiro
    setTimeout(() => {
      // Delay pequeno para animação
      setShowDeleteModal(true);
    }, 150);
  };

  // ⭐ HANDLER para exclusão do álbum completo
  const handleAlbumDeleted = (travelId, details) => {
    toast.success(
      `Álbum "${travel.name}" excluído com sucesso! ${details.imagesDeleted} imagens removidas.`,
      { duration: 5000 }
    );

    // Notificar componente pai para atualizar a lista
    if (onTravelDeleted) {
      onTravelDeleted(travelId);
    }

    // Fechar modal
    onClose();
  };

  return (
    <>
      <div className='fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4'>
        <div className='bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-[9999] relative'>
          {/* Header */}
          <div className='bg-primary-600 text-white p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <h2 className='text-2xl font-bold mb-2'>{travel.name}</h2>
                <div className='flex items-center space-x-4 text-primary-100'>
                  <div className='flex items-center space-x-1'>
                    <MapPin className='h-4 w-4' />
                    <span className='text-sm'>
                      {travel.location || 'Localização não especificada'}
                    </span>
                  </div>
                  <div className='flex items-center space-x-1'>
                    <Calendar className='h-4 w-4' />
                    <span className='text-sm'>
                      {images.length > 0 &&
                        new Date(images[0].created_at).toLocaleDateString(
                          'pt-BR'
                        )}
                    </span>
                  </div>
                  <div className='flex items-center space-x-1'>
                    <Image className='h-4 w-4' />
                    <span className='text-sm'>{images.length} fotos</span>
                  </div>
                </div>
              </div>

              <div className='flex items-center space-x-2'>
                {/* ⭐ MENU DE OPÇÕES COM Z-INDEX CORRIGIDO */}
                <div className='relative'>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className='p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200'
                  >
                    <MoreVertical className='h-5 w-5' />
                  </button>

                  {/* ⭐ DROPDOWN COM Z-INDEX ALTO */}
                  {showMenu && (
                    <div className='absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border z-[10001] min-w-[160px]'>
                      <button
                        onClick={handleOpenDeleteModal}
                        className='w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 flex items-center space-x-2 rounded-lg transition-colors'
                      >
                        <Trash2 className='h-4 w-4' />
                        <span className='text-sm font-medium'>
                          Excluir Álbum
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                <button
                  onClick={onClose}
                  className='p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200'
                >
                  <X className='h-6 w-6' />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            className='p-6 overflow-y-auto'
            style={{ maxHeight: 'calc(90vh - 120px)' }}
            onClick={() => setShowMenu(false)} // ⭐ Fechar menu ao clicar fora
          >
            {images.length > 0 ? (
              <div className='image-grid'>
                {images.map((image, index) => (
                  <div
                    key={image.public_id}
                    className='group relative aspect-square overflow-hidden rounded-lg shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer animate-fade-in'
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => handleImageClick(image, index)}
                  >
                    <img
                      src={image.url}
                      alt={`${travel.name} - Foto ${index + 1}`}
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

                    {/* Image Number Overlay */}
                    <div className='absolute top-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className='text-center py-12'>
                <Image className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  Nenhuma foto neste álbum
                </h3>
                <p className='text-gray-600 mb-6'>
                  Este álbum de viagem não possui mais fotos
                </p>

                {/* ⭐ BOTÃO PARA EXCLUIR ÁLBUM VAZIO */}
                <button
                  onClick={handleOpenDeleteModal}
                  className='bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors flex items-center space-x-2 mx-auto'
                >
                  <Trash2 className='h-4 w-4' />
                  <span>Excluir Álbum Vazio</span>
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className='bg-gray-50 px-6 py-4 border-t border-gray-200'>
            <div className='flex items-center justify-between'>
              <p className='text-sm text-gray-600'>
                {images.length} {images.length === 1 ? 'foto' : 'fotos'} nesta
                viagem
              </p>

              <div className='flex items-center space-x-3'>
                {images.length === 0 && (
                  <span className='text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full'>
                    ⚠️ Álbum vazio
                  </span>
                )}

                <button onClick={onClose} className='btn-secondary text-sm'>
                  Fechar Álbum
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Image Modal */}
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

      {/* ⭐ MODAL DE EXCLUSÃO COM Z-INDEX MAIS ALTO */}
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
