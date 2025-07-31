import React, { useEffect, useState } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Trash2,
} from 'lucide-react';
import { uploadService } from '../../services/api';
import toast from 'react-hot-toast';

const ImageModal = ({ image, onClose, onNext, onPrevious, onImageDeleted }) => {
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (showDeleteConfirm) {
          setShowDeleteConfirm(false);
        } else {
          onClose();
        }
      }
      if (e.key === 'ArrowRight' && !showDeleteConfirm) onNext();
      if (e.key === 'ArrowLeft' && !showDeleteConfirm) onPrevious();
      if (e.key === 'Delete' && !showDeleteConfirm) setShowDeleteConfirm(true);
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [onClose, onNext, onPrevious, showDeleteConfirm]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = `memoria-${
      new Date(image.created_at).toISOString().split('T')[0]
    }.${image.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      setDeleting(true);

      // ⭐ Excluir da API
      await uploadService.deleteImage(image.public_id);

      toast.success('Imagem excluída com sucesso!');

      // ⭐ MUDANÇA PRINCIPAL: Notificar o componente pai para atualizar a lista
      if (onImageDeleted) {
        onImageDeleted(image.public_id);
      }

      // ⭐ Fechar modal após exclusão
      onClose();
    } catch (error) {
      console.error('Error deleting image:', error);
      const errorMessage =
        error.response?.data?.error || 'Erro ao excluir imagem';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className='fixed inset-0 z-[99999] bg-black bg-opacity-90 flex items-center justify-center p-4'>
      {/* Header */}
      <div className='absolute top-4 left-4 right-4 flex items-center justify-between z-10'>
        <div className='flex items-center space-x-3 text-white'>
          <Calendar className='h-5 w-5' />
          <span className='text-sm'>
            {new Date(image.created_at).toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className='flex items-center space-x-3'>
          <button
            onClick={handleDownload}
            className='p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200'
            title='Baixar imagem'
            disabled={deleting}
          >
            <Download className='h-5 w-5' />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className='p-2 rounded-full bg-red-600 bg-opacity-80 text-white hover:bg-opacity-100 transition-all duration-200'
            title='Excluir imagem (Delete)'
            disabled={deleting}
          >
            <Trash2 className='h-5 w-5' />
          </button>

          <button
            onClick={onClose}
            className='p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200'
            title='Fechar (ESC)'
            disabled={deleting}
          >
            <X className='h-5 w-5' />
          </button>
        </div>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={onPrevious}
        className='absolute left-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200 z-10'
        title='Imagem anterior (←)'
        disabled={deleting || showDeleteConfirm}
      >
        <ChevronLeft className='h-6 w-6' />
      </button>

      <button
        onClick={onNext}
        className='absolute right-4 top-1/2 transform -translate-y-1/2 p-3 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-70 transition-all duration-200 z-10'
        title='Próxima imagem (→)'
        disabled={deleting || showDeleteConfirm}
      >
        <ChevronRight className='h-6 w-6' />
      </button>

      {/* Image */}
      <div className='max-w-7xl max-h-full flex items-center justify-center'>
        <img
          src={image.url}
          alt='Memória'
          className='max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-scale-in'
          style={{ maxHeight: 'calc(100vh - 120px)' }}
        />
      </div>

      {/* Footer Info */}
      <div className='absolute bottom-4 left-4 right-4 flex items-center justify-center'>
        <div className='bg-black bg-opacity-50 backdrop-blur-sm rounded-lg px-4 py-2 text-white text-sm'>
          {image.index + 1} de {image.images?.length || 1} imagens
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className='absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20'>
          <div className='bg-white rounded-lg p-6 max-w-md mx-4 animate-scale-in'>
            <div className='flex items-center space-x-3 mb-4'>
              <div className='flex-shrink-0'>
                <Trash2 className='h-6 w-6 text-red-600' />
              </div>
              <div>
                <h3 className='text-lg font-medium text-gray-900'>
                  Excluir Imagem
                </h3>
                <p className='text-sm text-gray-600'>
                  Esta ação não pode ser desfeita. A imagem será removida
                  permanentemente do Cloudinary.
                </p>
              </div>
            </div>

            <div className='flex justify-end space-x-3'>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className='btn-secondary text-sm'
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className='bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center space-x-2'
              >
                {deleting ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className='h-4 w-4' />
                    <span>Excluir Permanentemente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close */}
      <div
        className='absolute inset-0 -z-10'
        onClick={showDeleteConfirm ? () => {} : onClose}
      />
    </div>
  );
};

export default ImageModal;
