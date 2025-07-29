import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import ImageModal from '../memories/ImageModal';

const TravelAlbum = ({ travel, onClose }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [images, setImages] = useState(travel.images);

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
  };

  return (
    <div className='fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden z-[10000] relative'>
        {/* Header */}
        <div className='bg-primary-600 text-white p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-2xl font-bold mb-2'>{travel.name}</h2>
              <div className='flex items-center space-x-4 text-primary-100'>
                <div className='flex items-center space-x-1'>
                  <MapPin className='h-4 w-4' />
                  <span className='text-sm'>Localização</span>
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
                  <ImageIcon className='h-4 w-4' />
                  <span className='text-sm'>{images.length} fotos</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className='p-2 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all duration-200'
            >
              <X className='h-6 w-6' />
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className='p-6 overflow-y-auto'
          style={{ maxHeight: 'calc(90vh - 120px)' }}
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
              <ImageIcon className='h-12 w-12 text-gray-400 mx-auto mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>
                Nenhuma foto neste álbum
              </h3>
              <p className='text-gray-600'>
                Este álbum de viagem ainda não possui fotos
              </p>
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

            <button onClick={onClose} className='btn-secondary text-sm'>
              Fechar Álbum
            </button>
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
  );
};

export default TravelAlbum;
