import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { uploadService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import {
  Upload,
  ImageIcon,
  BookOpen,
  X,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const UploadPage = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('memories'); // 'memories' or 'travel'

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm();

  const watchedCategory = watch('category');

  const yearOptions = [
    { value: '0-12-months', label: '0-12 meses' },
    { value: '1-year', label: '1 ano' },
    { value: '2-years', label: '2 anos' },
    { value: '3-years', label: '3 anos' },
    { value: '4-years', label: '4 anos' },
    { value: '5-years', label: '5 anos' },
    { value: '6-years', label: '6 anos' },
    { value: '7-years', label: '7 anos' },
    { value: '8-years', label: '8 anos' },
    { value: '9-years', label: '9 anos' },
    { value: '10-years', label: '10 anos' },
  ];

  const handleFileSelection = e => {
    const files = Array.from(e.target.files);

    if (files.length > 10) {
      toast.error('Máximo de 10 imagens por vez');
      return;
    }

    setSelectedFiles(files);

    // Create previews
    const newPreviews = files.map(file => ({
      file,
      url: URL.createObjectURL(file),
      name: file.name,
    }));

    setPreviews(newPreviews);
  };

  const removeFile = index => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    // Clean up URL
    URL.revokeObjectURL(previews[index].url);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const onSubmit = async data => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();

      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      if (uploadType === 'memories') {
        formData.append('year', data.year);
        formData.append('category', data.category);
        formData.append('description', data.description || '');

        const response = await uploadService.uploadMemories(formData);

        if (response.success) {
          toast.success(
            `${response.images.length} imagens enviadas com sucesso!`
          );
          resetForm();
        }
      } else {
        formData.append('travelName', data.travelName);
        formData.append('location', data.location);
        formData.append('date', data.date);
        formData.append('description', data.description || '');

        const response = await uploadService.uploadTravel(formData);

        if (response.success) {
          toast.success(
            `Álbum de viagem "${data.travelName}" criado com sucesso!`
          );
          resetForm();
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar imagens');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    reset();
    setSelectedFiles([]);
    previews.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviews([]);
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 mb-4'>
            Adicionar Memórias
          </h1>
          <p className='text-gray-600'>
            Carregue novas fotos e trabalhos escolares para preservar momentos
            especiais
          </p>
        </div>

        {/* Upload Type Selector */}
        <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
          <h2 className='text-lg font-semibold text-gray-900 mb-4'>
            Tipo de Upload
          </h2>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <button
              type='button'
              onClick={() => setUploadType('memories')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                uploadType === 'memories'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className='flex items-center space-x-3'>
                <ImageIcon className='h-6 w-6' />
                <div className='text-left'>
                  <h3 className='font-medium'>Memórias do Ano</h3>
                  <p className='text-sm opacity-75'>
                    Fotos e trabalhos escolares
                  </p>
                </div>
              </div>
            </button>

            <button
              type='button'
              onClick={() => setUploadType('travel')}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                uploadType === 'travel'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className='flex items-center space-x-3'>
                <Upload className='h-6 w-6' />
                <div className='text-left'>
                  <h3 className='font-medium'>Álbum de Viagem</h3>
                  <p className='text-sm opacity-75'>
                    Fotos de uma viagem específica
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Upload Form */}
        <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Informações{' '}
              {uploadType === 'memories' ? 'da Memória' : 'da Viagem'}
            </h2>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
              {uploadType === 'memories' ? (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Ano da Criança *
                    </label>
                    <select
                      {...register('year', { required: 'Selecione o ano' })}
                      className={`input-field ${
                        errors.year ? 'border-red-500' : ''
                      }`}
                      disabled={uploading}
                    >
                      <option value=''>Selecione o ano</option>
                      {yearOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors.year && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.year.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Categoria *
                    </label>
                    <select
                      {...register('category', {
                        required: 'Selecione a categoria',
                      })}
                      className={`input-field ${
                        errors.category ? 'border-red-500' : ''
                      }`}
                      disabled={uploading}
                    >
                      <option value=''>Selecione a categoria</option>
                      <option value='photos'>Fotos Gerais</option>
                      <option value='school-work'>Trabalhos Escolares</option>
                    </select>
                    {errors.category && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.category.message}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Nome da Viagem *
                    </label>
                    <input
                      {...register('travelName', {
                        required: 'Nome da viagem é obrigatório',
                      })}
                      type='text'
                      className={`input-field ${
                        errors.travelName ? 'border-red-500' : ''
                      }`}
                      placeholder='Ex: Viagem para Paris'
                      disabled={uploading}
                    />
                    {errors.travelName && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.travelName.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Localização *
                    </label>
                    <input
                      {...register('location', {
                        required: 'Localização é obrigatória',
                      })}
                      type='text'
                      className={`input-field ${
                        errors.location ? 'border-red-500' : ''
                      }`}
                      placeholder='Ex: Paris, França'
                      disabled={uploading}
                    />
                    {errors.location && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.location.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Data da Viagem *
                    </label>
                    <input
                      {...register('date', { required: 'Data é obrigatória' })}
                      type='date'
                      className={`input-field ${
                        errors.date ? 'border-red-500' : ''
                      }`}
                      disabled={uploading}
                    />
                    {errors.date && (
                      <p className='mt-1 text-sm text-red-600'>
                        {errors.date.message}
                      </p>
                    )}
                  </div>
                </>
              )}

              <div className='md:col-span-2'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Descrição (Opcional)
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className='input-field resize-none'
                  placeholder='Adicione uma descrição ou comentário...'
                  disabled={uploading}
                />
              </div>
            </div>
          </div>

          {/* File Upload */}
          <div className='bg-white rounded-lg shadow-md p-6'>
            <h2 className='text-lg font-semibold text-gray-900 mb-4'>
              Selecionar Imagens
            </h2>

            <div className='mb-4'>
              <label className='block'>
                <input
                  type='file'
                  multiple
                  accept='image/*'
                  onChange={handleFileSelection}
                  className='hidden'
                  disabled={uploading}
                />
                <div className='border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-400 transition-colors duration-200 cursor-pointer'>
                  <Upload className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-lg font-medium text-gray-700 mb-2'>
                    Clique para selecionar imagens
                  </p>
                  <p className='text-sm text-gray-500'>
                    ou arraste e solte aqui (máximo 10 imagens)
                  </p>
                </div>
              </label>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className='space-y-4'>
                <h3 className='font-medium text-gray-900'>
                  Imagens Selecionadas ({previews.length})
                </h3>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  {previews.map((preview, index) => (
                    <div key={index} className='relative group'>
                      <img
                        src={preview.url}
                        alt={preview.name}
                        className='w-full aspect-square object-cover rounded-lg shadow-md'
                      />

                      <button
                        type='button'
                        onClick={() => removeFile(index)}
                        className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                        disabled={uploading}
                      >
                        <X className='h-4 w-4' />
                      </button>

                      <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                        <p className='truncate'>{preview.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className='flex justify-end space-x-4'>
            <button
              type='button'
              onClick={resetForm}
              className='btn-secondary'
              disabled={uploading}
            >
              Limpar
            </button>

            <button
              type='submit'
              disabled={uploading || selectedFiles.length === 0}
              className='btn-primary flex items-center space-x-2 min-w-[120px]'
            >
              {uploading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className='h-4 w-4' />
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default UploadPage;
