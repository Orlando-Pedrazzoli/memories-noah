import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Smartphone,
  Monitor,
  FileWarning,
  Plus,
  ArrowLeft,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

const UploadPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState('memories');
  const [compressionEnabled, setCompressionEnabled] = useState(true);
  const [processingImages, setProcessingImages] = useState(false);
  const [unsupportedFiles, setUnsupportedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({
    step: 0,
    message: '',
    details: '',
    percentage: 0,
  });

  // ⭐ DETECTAR MODO DE ADIÇÃO A ÁLBUM EXISTENTE
  const isAddingToExisting =
    location.state?.mode === 'add-to-travel' ||
    location.state?.mode === 'add-to-year';
  const existingTravel = location.state?.existingTravel;
  const existingYear = location.state?.existingYear;

  const isMobileDevice = () => {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth <= 768
    );
  };

  const isMobile = isMobileDevice();
  const maxFiles = isMobile ? 5 : uploadType === 'travel' ? 20 : 10;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      // ⭐ PRÉ-PREENCHER CAMPOS SE ESTIVER ADICIONANDO A ÁLBUM EXISTENTE
      travelName: existingTravel?.name || '',
      location: existingTravel?.location || '',
      date: existingTravel?.date || '',
      year: existingYear?.year || '',
      category: existingYear?.category || '',
    },
  });

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

  // ⭐ CONFIGURAR TIPO DE UPLOAD BASEADO NO MODO
  useEffect(() => {
    if (location.state?.mode === 'add-to-travel') {
      setUploadType('travel');
    } else if (location.state?.mode === 'add-to-year') {
      setUploadType('memories');
    }
  }, [location.state]);

  const isHeicFile = file => {
    const extension = file.name.split('.').pop().toLowerCase();
    return extension === 'heic' || extension === 'heif';
  };

  const convertHeicToJpeg = async file => {
    const testImg = new Image();
    const canDecodeHeic = await new Promise(resolve => {
      testImg.onload = () => resolve(true);
      testImg.onerror = () => resolve(false);
      testImg.src = URL.createObjectURL(file);
    });

    if (canDecodeHeic) {
      console.log('✅ Navegador suporta HEIC nativamente');
      return file;
    }

    console.log('⚠️ HEIC não suportado, enviando para servidor processar');
    return file;
  };

  const processImageFile = async file => {
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      throw new Error(
        `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(
          2
        )}MB (máximo: 10MB)`
      );
    }

    if (isHeicFile(file)) {
      try {
        const convertedFile = await convertHeicToJpeg(file);
        return convertedFile;
      } catch (error) {
        console.warn('⚠️ Não foi possível converter HEIC, enviando original');
        return file;
      }
    }

    const supportedFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
    ];

    if (!supportedFormats.includes(file.type) && !isHeicFile(file)) {
      if (!file.type) {
        console.warn(
          '⚠️ Tipo MIME não detectado, tentando processar mesmo assim'
        );
      } else {
        throw new Error(`Formato não suportado: ${file.type}`);
      }
    }

    return file;
  };

  const compressImage = async (
    file,
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.85
  ) => {
    return new Promise((resolve, reject) => {
      if (file.size < 500 * 1024) {
        // < 500KB
        console.log('📸 Arquivo pequeno, mantendo original');
        resolve(file);
        return;
      }

      const reader = new FileReader();

      reader.onload = e => {
        const img = new Image();

        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > maxWidth) {
                height = height * (maxWidth / width);
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = width * (maxHeight / height);
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
              blob => {
                if (blob) {
                  const compressedFile = new File(
                    [blob],
                    file.name.replace(/\.(heic|heif)$/i, '.jpg'),
                    {
                      type: 'image/jpeg',
                      lastModified: Date.now(),
                    }
                  );

                  console.log(
                    `📸 Compressão: ${(file.size / 1024 / 1024).toFixed(
                      2
                    )}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
                  );

                  resolve(compressedFile);
                } else {
                  reject(new Error('Falha na compressão'));
                }
              },
              'image/jpeg',
              quality
            );
          } catch (error) {
            console.error('❌ Erro no processamento canvas:', error);
            reject(error);
          }
        };

        img.onerror = error => {
          console.error('❌ Erro ao carregar imagem:', error);
          resolve(file);
        };

        img.src = e.target.result;
      };

      reader.onerror = error => {
        console.error('❌ Erro ao ler arquivo:', error);
        reject(error);
      };

      if (isHeicFile(file)) {
        console.log('⚠️ Arquivo HEIC detectado, pulando compressão no cliente');
        resolve(file);
        return;
      }

      reader.readAsDataURL(file);
    });
  };

  const handleFileSelection = useCallback(
    async e => {
      const files = Array.from(e.target.files);

      if (files.length > maxFiles) {
        toast.error(
          `Máximo de ${maxFiles} imagens por vez${isMobile ? ' no mobile' : ''}`
        );
        return;
      }

      setProcessingImages(true);
      setUnsupportedFiles([]);
      setUploadProgress({
        step: 0,
        message: 'Processando imagens...',
        details: `Preparando ${files.length} ${
          files.length === 1 ? 'imagem' : 'imagens'
        }`,
        percentage: 0,
      });

      try {
        const processedFiles = [];
        const newPreviews = [];
        const unsupported = [];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          setUploadProgress({
            step: 0,
            message: 'Processando imagens...',
            details: `Processando ${file.name} (${i + 1} de ${files.length})`,
            percentage: Math.round((i / files.length) * 100),
          });

          try {
            let processedFile = await processImageFile(file);

            if (
              compressionEnabled &&
              processedFile.size > 1024 * 1024 &&
              !isHeicFile(processedFile)
            ) {
              try {
                console.log(
                  `🔄 Comprimindo imagem ${i + 1}: ${processedFile.name}`
                );

                const quality = isMobile ? 0.7 : 0.85;
                const maxDimension = isMobile ? 1280 : 1920;

                const compressedFile = await compressImage(
                  processedFile,
                  maxDimension,
                  maxDimension,
                  quality
                );

                if (compressedFile.size >= processedFile.size) {
                  console.log('⚠️ Mantendo original (compressão não efetiva)');
                } else {
                  processedFile = compressedFile;
                }
              } catch (error) {
                console.error('❌ Erro na compressão:', error);
              }
            }

            processedFiles.push(processedFile);

            let previewUrl;
            try {
              previewUrl = URL.createObjectURL(processedFile);
            } catch (error) {
              console.warn('⚠️ Não foi possível criar preview:', error);
              previewUrl = null;
            }

            const preview = {
              file: processedFile,
              url: previewUrl,
              name: processedFile.name,
              originalSize: file.size,
              compressedSize: processedFile.size,
              isHeic: isHeicFile(file),
            };

            newPreviews.push(preview);
          } catch (error) {
            console.error(`❌ Erro ao processar ${file.name}:`, error);
            unsupported.push({
              name: file.name,
              error: error.message,
            });
            toast.error(`Erro ao processar ${file.name}: ${error.message}`);
          }
        }

        setSelectedFiles(processedFiles);
        setPreviews(newPreviews);
        setUnsupportedFiles(unsupported);

        const originalTotal = files.reduce((acc, f) => acc + f.size, 0);
        const compressedTotal = processedFiles.reduce(
          (acc, f) => acc + f.size,
          0
        );
        const saved = originalTotal - compressedTotal;

        if (saved > 0) {
          toast.success(
            `Economizado ${(saved / 1024 / 1024).toFixed(1)}MB com compressão!`,
            { icon: '🗜️', duration: 3000 }
          );
        }

        const heicCount = newPreviews.filter(p => p.isHeic).length;
        if (heicCount > 0) {
          toast.success(
            `${heicCount} arquivo(s) HEIC detectado(s) e processado(s)`,
            { icon: '📱', duration: 3000 }
          );
        }

        setUploadProgress({
          step: 0,
          message: '',
          details: '',
          percentage: 0,
        });
      } catch (error) {
        console.error('❌ Erro ao processar imagens:', error);
        toast.error('Erro ao processar imagens');
      } finally {
        setProcessingImages(false);
      }
    },
    [compressionEnabled, maxFiles, isMobile]
  );

  const removeFile = index => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);

    if (previews[index].url) {
      URL.revokeObjectURL(previews[index].url);
    }

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
  };

  // ⭐ CORREÇÃO PARA O ARQUIVO UploadPage.jsx
  // No método onSubmit, corrija a parte que lida com adicionar fotos a álbum existente:

  const onSubmit = async data => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    console.log('🚀 Iniciando upload:', {
      uploadType,
      data,
      fileCount: selectedFiles.length,
      isAddingToExisting,
      existingTravel,
      existingYear,
    });

    setUploading(true);
    setUploadProgress({
      step: 1,
      message: 'Preparando upload...',
      details: `Processando ${selectedFiles.length} ${
        selectedFiles.length === 1 ? 'imagem' : 'imagens'
      }`,
      percentage: 10,
    });

    try {
      const formData = new FormData();

      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      if (uploadType === 'memories') {
        // ... código para memories (mantém como está) ...
      } else {
        // UPLOAD DE VIAGEM
        setUploadProgress({
          step: 2,
          message: isAddingToExisting
            ? 'Adicionando ao álbum existente...'
            : 'Criando álbum de viagem...',
          details: `Destino: ${data.location}`,
          percentage: 50,
        });

        // ⭐ CORREÇÃO: Usar método diferente se estiver adicionando a álbum existente
        if (isAddingToExisting && existingTravel) {
          // Usar o método específico para adicionar a álbum existente
          formData.append('description', data.description || '');

          const response = await uploadService.addToTravel(
            existingTravel.id,
            formData
          );

          if (response.success) {
            setUploadProgress({
              step: 4,
              message: 'Fotos adicionadas!',
              details: 'Redirecionando...',
              percentage: 100,
            });

            toast.success(
              `${
                response.images?.length || selectedFiles.length
              } fotos adicionadas ao álbum "${existingTravel.name}"!`
            );

            setTimeout(() => {
              navigate('/travels', {
                replace: true,
                state: {
                  fromUpload: true,
                  updatedTravelId: existingTravel.id,
                  forceReload: true,
                },
              });
            }, 2000);

            resetForm();
          } else {
            throw new Error(response.error || 'Falha ao adicionar fotos');
          }
        } else {
          // Criar novo álbum (código existente)
          if (!data.travelName || !data.location || !data.date) {
            throw new Error(
              'Nome da viagem, localização e data são obrigatórios'
            );
          }

          formData.append('travelName', data.travelName);
          formData.append('location', data.location);
          formData.append('date', data.date);
          formData.append('description', data.description || '');

          if (window.selectedLocationCoords) {
            formData.append('latitude', window.selectedLocationCoords.lat);
            formData.append('longitude', window.selectedLocationCoords.lon);
          }

          const response = await uploadService.uploadTravel(formData);

          if (response.success) {
            setUploadProgress({
              step: 4,
              message: 'Álbum criado com sucesso!',
              details: 'Redirecionando...',
              percentage: 100,
            });

            toast.success(`Álbum "${data.travelName}" criado com sucesso!`);

            const travelId = data.travelName.toLowerCase().replace(/\s+/g, '-');

            setTimeout(() => {
              navigate('/travels', {
                replace: true,
                state: {
                  fromUpload: true,
                  newTravelId: response.travel?.id || travelId,
                  forceReload: true,
                },
              });
            }, 2000);

            resetForm();
          } else {
            throw new Error(response.error || 'Falha no upload de viagem');
          }
        }
      }
    } catch (error) {
      console.error('❌ Upload error:', error);

      setUploadProgress({
        step: -1,
        message: 'Erro no upload',
        details:
          error.response?.data?.error || error.message || 'Erro desconhecido',
        percentage: 0,
      });

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
    previews.forEach(preview => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });
    setPreviews([]);
    setUnsupportedFiles([]);
    setUploading(false);
    setUploadProgress({ step: 0, message: '', details: '', percentage: 0 });
    delete window.selectedLocationCoords;
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <main className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='mb-8'>
          {/* ⭐ HEADER COM INDICAÇÃO DE MODO */}
          {isAddingToExisting && (
            <button
              onClick={() => navigate(-1)}
              className='flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4'
            >
              <ArrowLeft className='h-4 w-4' />
              <span>Voltar ao álbum</span>
            </button>
          )}

          <h1 className='text-3xl font-bold text-gray-900 mb-4'>
            {isAddingToExisting ? (
              <>
                <span className='text-blue-600'>Adicionar a: </span>
                {existingTravel?.name || existingYear?.yearLabel}
              </>
            ) : (
              'Adicionar Memórias'
            )}
          </h1>

          <p className='text-gray-600'>
            {isAddingToExisting
              ? 'Selecione mais fotos para adicionar ao álbum existente'
              : 'Carregue novas fotos e trabalhos escolares para preservar momentos especiais'}
          </p>

          {/* ⭐ INFORMAÇÃO DO ÁLBUM EXISTENTE */}
          {isAddingToExisting && (
            <div className='mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg'>
              <div className='flex items-start space-x-3'>
                <Info className='h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5' />
                <div className='text-sm'>
                  <p className='font-medium text-blue-900'>
                    Adicionando ao álbum existente
                  </p>
                  {existingTravel && (
                    <div className='text-blue-700 mt-1'>
                      <p>📍 {existingTravel.location}</p>
                      {existingTravel.date && (
                        <p>
                          📅{' '}
                          {new Date(existingTravel.date).toLocaleDateString(
                            'pt-BR'
                          )}
                        </p>
                      )}
                    </div>
                  )}
                  {existingYear && (
                    <div className='text-blue-700 mt-1'>
                      <p>👶 {existingYear.yearLabel}</p>
                      <p>
                        📁{' '}
                        {existingYear.category === 'photos'
                          ? 'Fotos'
                          : 'Trabalhos Escolares'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Indicador de dispositivo e configurações */}
          <div className='mt-4 flex flex-wrap items-center gap-4'>
            <div className='flex items-center space-x-2 text-sm'>
              {isMobile ? (
                <>
                  <Smartphone className='h-4 w-4 text-blue-600' />
                  <span className='text-gray-600'>Modo Mobile</span>
                </>
              ) : (
                <>
                  <Monitor className='h-4 w-4 text-gray-600' />
                  <span className='text-gray-600'>Modo Desktop</span>
                </>
              )}
            </div>

            <label className='flex items-center space-x-2 cursor-pointer'>
              <input
                type='checkbox'
                checked={compressionEnabled}
                onChange={e => setCompressionEnabled(e.target.checked)}
                className='rounded text-primary-600 focus:ring-primary-500'
              />
              <span className='text-sm text-gray-600'>
                Comprimir imagens {isMobile && '(recomendado)'}
              </span>
            </label>

            <div className='text-sm text-gray-500'>
              Máx: {maxFiles} imagens | HEIC/HEIF suportado
            </div>
          </div>
        </div>

        {/* Upload Type Selector - Ocultar se estiver adicionando a existente */}
        {!isAddingToExisting && (
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
                disabled={uploading || processingImages}
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
                disabled={uploading || processingImages}
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
        )}

        {/* Progress Indicator */}
        {(uploading || processingImages) && (
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

            {uploadProgress.percentage > 0 && uploadProgress.step !== -1 && (
              <div className='w-full bg-gray-200 rounded-full h-2'>
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    uploadProgress.step >= 4 ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{
                    width: `${uploadProgress.percentage}%`,
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
                      disabled={
                        uploading || processingImages || isAddingToExisting
                      }
                    >
                      {isAddingToExisting && existingYear ? (
                        <option value={existingYear.year}>
                          {existingYear.yearLabel}
                        </option>
                      ) : (
                        <>
                          <option value=''>Selecione o ano</option>
                          {yearOptions.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </>
                      )}
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
                      disabled={
                        uploading || processingImages || isAddingToExisting
                      }
                    >
                      {isAddingToExisting && existingYear ? (
                        <option value={existingYear.category}>
                          {existingYear.category === 'photos'
                            ? 'Fotos Gerais'
                            : 'Trabalhos Escolares'}
                        </option>
                      ) : (
                        <>
                          <option value=''>Selecione a categoria</option>
                          <option value='photos'>Fotos Gerais</option>
                          <option value='school-work'>
                            Trabalhos Escolares
                          </option>
                        </>
                      )}
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
                      disabled={
                        uploading || processingImages || isAddingToExisting
                      }
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
                    {isAddingToExisting && existingTravel ? (
                      <input
                        {...register('location', {
                          required: 'Localização é obrigatória',
                        })}
                        type='text'
                        className='input-field'
                        value={existingTravel.location}
                        disabled
                      />
                    ) : (
                      <LocationPicker
                        value={watchedLocation || ''}
                        onChange={value => setValue('location', value)}
                        disabled={uploading || processingImages}
                        error={errors.location?.message}
                      />
                    )}
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
                      disabled={
                        uploading || processingImages || isAddingToExisting
                      }
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
                  disabled={uploading || processingImages}
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
                  accept='image/*,.heic,.heif'
                  onChange={handleFileSelection}
                  className='hidden'
                  disabled={uploading || processingImages}
                  capture={isMobile ? 'environment' : undefined}
                />
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
                    uploading || processingImages
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-primary-400 cursor-pointer'
                  }`}
                >
                  <Upload className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                  <p className='text-lg font-medium text-gray-700 mb-2'>
                    {processingImages
                      ? 'Processando imagens...'
                      : uploading
                      ? 'Upload em andamento...'
                      : isMobile
                      ? 'Toque para selecionar ou tirar fotos'
                      : 'Clique para selecionar imagens'}
                  </p>
                  <p className='text-sm text-gray-500'>
                    {uploading || processingImages
                      ? 'Por favor, aguarde...'
                      : `Máximo de ${maxFiles} imagens${
                          compressionEnabled
                            ? ' (com compressão automática)'
                            : ''
                        }`}
                  </p>
                  <p className='text-xs text-gray-400 mt-2'>
                    Formatos: JPG, PNG, GIF, WebP, BMP, HEIC/HEIF (iPhone)
                  </p>
                </div>
              </label>
            </div>

            {/* Image Previews */}
            {previews.length > 0 && (
              <div className='space-y-4'>
                <h3 className='font-medium text-gray-900'>
                  Imagens Selecionadas ({previews.length})
                  {compressionEnabled && (
                    <span className='text-sm text-gray-500 ml-2'>
                      Total:{' '}
                      {(
                        selectedFiles.reduce((acc, f) => acc + f.size, 0) /
                        1024 /
                        1024
                      ).toFixed(1)}
                      MB
                    </span>
                  )}
                </h3>

                <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                  {previews.map((preview, index) => (
                    <div key={index} className='relative group'>
                      {preview.url ? (
                        <img
                          src={preview.url}
                          alt={preview.name}
                          className='w-full aspect-square object-cover rounded-lg shadow-md'
                        />
                      ) : (
                        <div className='w-full aspect-square bg-gray-200 rounded-lg shadow-md flex items-center justify-center'>
                          <div className='text-center p-2'>
                            <FileWarning className='h-8 w-8 text-gray-400 mx-auto mb-2' />
                            <p className='text-xs text-gray-500'>
                              {preview.isHeic ? 'HEIC' : 'Sem preview'}
                            </p>
                          </div>
                        </div>
                      )}

                      <button
                        type='button'
                        onClick={() => removeFile(index)}
                        className='absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200'
                        disabled={uploading || processingImages}
                      >
                        <X className='h-4 w-4' />
                      </button>

                      <div className='absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
                        <p className='truncate'>{preview.name}</p>
                        {preview.originalSize !== preview.compressedSize && (
                          <p className='text-green-400'>
                            {(preview.compressedSize / 1024 / 1024).toFixed(1)}
                            MB (−
                            {Math.round(
                              (1 -
                                preview.compressedSize / preview.originalSize) *
                                100
                            )}
                            %)
                          </p>
                        )}
                        {preview.isHeic && (
                          <p className='text-blue-400'>Formato iPhone</p>
                        )}
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
              onClick={() => {
                if (isAddingToExisting) {
                  navigate(-1);
                } else {
                  resetForm();
                }
              }}
              className='btn-secondary'
              disabled={uploading || processingImages}
            >
              {isAddingToExisting ? 'Cancelar' : 'Limpar'}
            </button>

            <button
              type='submit'
              disabled={
                uploading || processingImages || selectedFiles.length === 0
              }
              className='btn-primary flex items-center space-x-2 min-w-[120px]'
            >
              {uploading ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>Enviando...</span>
                </>
              ) : processingImages ? (
                <>
                  <Loader2 className='h-4 w-4 animate-spin' />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className='h-4 w-4' />
                  <span>{isAddingToExisting ? 'Adicionar' : 'Enviar'}</span>
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
