// client/src/pages/UploadPage.jsx - VERSÃO CORRIGIDA

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { uploadService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import LocationPicker from '../components/travel/LocationPicker';
import {
  Upload,
  ImageIcon,
  BookOpen,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const UploadPage = () => {
  const navigate = useNavigate();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('memories');
  const [uploadProgress, setUploadProgress] = useState({
    step: 0,
    message: '',
    details: '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm();

  const watchedCategory = watch('category');
  const watchedLocation = watch('location');

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

    if (files.length > (uploadType === 'travel' ? 20 : 10)) {
      toast.error(
        `Máximo de ${uploadType === 'travel' ? 20 : 10} imagens por vez`
      );
      return;
    }

    setSelectedFiles(files);

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

    URL.revokeObjectURL(previews[index].url);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  const onSubmit = async data => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    console.log('🚀 Iniciando upload:', {
      uploadType,
      data,
      fileCount: selectedFiles.length,
    });

    setUploading(true);
    setUploadProgress({
      step: 1,
      message: 'Preparando upload...',
      details: `Processando ${selectedFiles.length} ${
        selectedFiles.length === 1 ? 'imagem' : 'imagens'
      }`,
    });

    try {
      const formData = new FormData();

      // ⭐ ADICIONAR ARQUIVOS AO FORMDATA
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      if (uploadType === 'memories') {
        // ⭐ UPLOAD DE MEMÓRIAS
        setUploadProgress({
          step: 2,
          message: 'Enviando memórias...',
          details: `Categoria: ${data.category} - Ano: ${data.year}`,
        });

        formData.append('year', data.year);
        formData.append('category', data.category);
        formData.append('description', data.description || '');

        console.log('📤 Enviando memórias:', {
          year: data.year,
          category: data.category,
        });

        const response = await uploadService.uploadMemories(formData);

        if (response.success) {
          setUploadProgress({
            step: 3,
            message: 'Upload concluído!',
            details: `${response.images.length} imagens salvas com sucesso`,
          });

          toast.success(
            `${response.images.length} imagens enviadas com sucesso!`
          );

          setTimeout(() => {
            navigate(`/year/${data.year}`, {
              replace: true,
              state: { fromUpload: true },
            });
          }, 1500);

          resetForm();
        } else {
          throw new Error(response.error || 'Falha no upload de memórias');
        }
      } else {
        // ⭐ UPLOAD DE VIAGEM
        setUploadProgress({
          step: 2,
          message: 'Criando álbum de viagem...',
          details: `Destino: ${data.location}`,
        });

        // ⭐ VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS
        if (!data.travelName || !data.location || !data.date) {
          throw new Error(
            'Nome da viagem, localização e data são obrigatórios'
          );
        }

        formData.append('travelName', data.travelName);
        formData.append('location', data.location);
        formData.append('date', data.date);
        formData.append('description', data.description || '');

        console.log('📤 Enviando viagem:', {
          travelName: data.travelName,
          location: data.location,
          date: data.date,
        });

        // ⭐ ADICIONAR COORDENADAS SE DISPONÍVEIS
        if (window.selectedLocationCoords) {
          formData.append('latitude', window.selectedLocationCoords.lat);
          formData.append('longitude', window.selectedLocationCoords.lon);
          console.log(
            '📍 Coordenadas incluídas:',
            window.selectedLocationCoords
          );
        }

        setUploadProgress({
          step: 3,
          message: 'Geocodificando localização...',
          details: 'Tentando encontrar coordenadas no mapa',
        });

        const response = await uploadService.uploadTravel(formData);

        console.log('📥 Resposta do upload:', response);

        if (response.success) {
          setUploadProgress({
            step: 4,
            message: 'Álbum criado com sucesso!',
            details: response.marker?.created
              ? response.marker.hasCoordinates
                ? '✅ Adicionado ao mapa com coordenadas'
                : '⚠️ Adicionado sem coordenadas (localização não encontrada)'
              : '⚠️ Álbum criado, mas marker não pôde ser adicionado',
          });

          // ⭐ TOAST BASEADO NO RESULTADO DO MARKER
          if (response.marker?.created) {
            if (response.marker.hasCoordinates) {
              toast.success(
                `Álbum "${data.travelName}" criado e adicionado ao mapa!`,
                { duration: 4000 }
              );
            } else {
              toast(
                `Álbum "${data.travelName}" criado! Localização "${data.location}" não foi encontrada no mapa.`,
                { duration: 6000, icon: '⚠️' }
              );
            }
          } else {
            toast.success(`Álbum "${data.travelName}" criado com sucesso!`, {
              duration: 4000,
            });
          }

          // ⭐ LIMPAR COORDENADAS TEMPORÁRIAS
          delete window.selectedLocationCoords;

          setTimeout(() => {
            navigate('/travels', {
              replace: true,
              state: { fromUpload: true },
            });
          }, 2000);

          resetForm();
        } else {
          throw new Error(response.error || 'Falha no upload de viagem');
        }
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      setUploadProgress({
        step: -1,
        message: 'Erro no upload',
        details:
          error.response?.data?.error || error.message || 'Erro desconhecido',
      });

      // ⭐ TOAST DE ERRO ESPECÍFICO
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        'Erro ao enviar imagens';
      toast.error(errorMessage, { duration: 5000 });

      setUploading(false);
    }
  };

  const resetForm = () => {
    reset();
    setSelectedFiles([]);
    previews.forEach(preview => URL.revokeObjectURL(preview.url));
    setPreviews([]);
    setUploading(false);
    setUploadProgress({ step: 0, message: '', details: '' });
    delete window.selectedLocationCoords;
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
              disabled={uploading}
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
              disabled={uploading}
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

        {/* ⭐ PROGRESS INDICATOR DURANTE UPLOAD */}
        {uploading && (
          <div className='bg-white rounded-lg shadow-md p-6 mb-6'>
            <div className='flex items-center space-x-3 mb-4'>
              {uploadProgress.step === -1 ? (
                <AlertCircle className='h-6 w-6 text-red-600' />
              ) : uploadProgress.step >= 4 ? (
                <CheckCircle className='h-6 w-6 text-green-600' />
              ) : (
                <Loader2 className='h-6 w-6 text-blue-600 animate-spin' />
              )}
              <h3
                className={`text-lg font-semibold ${
                  uploadProgress.step === -1
                    ? 'text-red-600'
                    : uploadProgress.step >= 4
                    ? 'text-green-600'
                    : 'text-blue-600'
                }`}
              >
                {uploadProgress.message}
              </h3>
            </div>

            {uploadProgress.details && (
              <p className='text-gray-600 text-sm mb-4'>
                {uploadProgress.details}
              </p>
            )}

            {/* Progress Bar */}
            {uploadProgress.step > 0 && uploadProgress.step !== -1 && (
              <div className='w-full bg-gray-200 rounded-full h-2'>
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    uploadProgress.step >= 4 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${Math.min((uploadProgress.step / 4) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            )}
          </div>
        )}

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
                    <LocationPicker
                      value={watchedLocation || ''}
                      onChange={value => setValue('location', value)}
                      disabled={uploading}
                      error={errors.location?.message}
                    />
                    <input
                      {...register('location', {
                        required: 'Localização é obrigatória',
                      })}
                      type='hidden'
                    />
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
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                    uploading
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-primary-400 cursor-pointer'
                  }`}
                >
                  <Upload className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-lg font-medium text-gray-700 mb-2'>
                    {uploading
                      ? 'Upload em andamento...'
                      : 'Clique para selecionar imagens'}
                  </p>
                  <p className='text-sm text-gray-500'>
                    {uploading
                      ? 'Por favor, aguarde o término do upload'
                      : `ou arraste e solte aqui (máximo ${
                          uploadType === 'travel' ? 20 : 10
                        } imagens)`}
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
