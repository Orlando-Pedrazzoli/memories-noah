// client/src/pages/UploadPage.jsx - VERSÃO COM SUPORTE HEIC/HEIF

import React, { useState, useCallback } from 'react';
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
  Smartphone,
  Monitor,
  FileWarning,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ⭐ DETECTAR SE O ARQUIVO É HEIC/HEIF
const isHeicFile = file => {
  const extension = file.name.split('.').pop().toLowerCase();
  return extension === 'heic' || extension === 'heif';
};

// ⭐ CONVERTER HEIC PARA JPEG (usando biblioteca heic2any)
const convertHeicToJpeg = async file => {
  // Verificar se o navegador suporta HEIC nativamente
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

  console.log('⚠️ HEIC não suportado, tentando converter...');

  // Tentar usar a API nativa se disponível
  try {
    // Verificar se temos a biblioteca heic2any disponível
    if (typeof window.heic2any !== 'undefined') {
      const heic2any = window.heic2any;
      const jpegBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9,
      });

      const jpegFile = new File(
        [jpegBlob],
        file.name.replace(/\.(heic|heif)$/i, '.jpg'),
        { type: 'image/jpeg' }
      );

      console.log('✅ HEIC convertido para JPEG com sucesso');
      return jpegFile;
    }
  } catch (error) {
    console.warn('⚠️ Conversão HEIC falhou:', error);
  }

  // Se não conseguir converter, tentar processar no servidor
  console.log('⚠️ Enviando HEIC para conversão no servidor');
  return file;
};

// ⭐ PROCESSAR IMAGEM COM FALLBACK PARA FORMATOS NÃO SUPORTADOS
const processImageFile = async file => {
  const maxSize = 10 * 1024 * 1024; // 10MB

  // Verificar tamanho máximo
  if (file.size > maxSize) {
    throw new Error(
      `Arquivo muito grande: ${(file.size / 1024 / 1024).toFixed(
        2
      )}MB (máximo: 10MB)`
    );
  }

  // Se for HEIC, tentar converter
  if (isHeicFile(file)) {
    try {
      const convertedFile = await convertHeicToJpeg(file);
      return convertedFile;
    } catch (error) {
      console.warn('⚠️ Não foi possível converter HEIC, enviando original');
      return file;
    }
  }

  // Verificar se é um formato de imagem suportado
  const supportedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];
  if (!supportedFormats.includes(file.type) && !isHeicFile(file)) {
    // Tentar detectar pelo conteúdo se o type está vazio
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

// ⭐ UTILITÁRIO MELHORADO PARA COMPRESSÃO DE IMAGEM
const compressImage = async (
  file,
  maxWidth = 1920,
  maxHeight = 1920,
  quality = 0.85
) => {
  return new Promise((resolve, reject) => {
    // Se o arquivo já é pequeno, não comprimir
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

          // Calcular dimensões mantendo proporção
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

          // Desenhar e comprimir
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
        // Se falhar ao carregar, retornar arquivo original
        resolve(file);
      };

      img.src = e.target.result;
    };

    reader.onerror = error => {
      console.error('❌ Erro ao ler arquivo:', error);
      reject(error);
    };

    // Se for HEIC e não conseguir ler como data URL, retornar original
    if (isHeicFile(file)) {
      console.log('⚠️ Arquivo HEIC detectado, pulando compressão no cliente');
      resolve(file);
      return;
    }

    reader.readAsDataURL(file);
  });
};

// ⭐ DETECTAR SE É DISPOSITIVO MÓVEL
const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || window.innerWidth <= 768
  );
};

// ⭐ ADICIONAR SCRIPT HEIC2ANY SE NECESSÁRIO
const loadHeic2anyScript = () => {
  if (
    typeof window.heic2any === 'undefined' &&
    !document.getElementById('heic2any-script')
  ) {
    const script = document.createElement('script');
    script.id = 'heic2any-script';
    script.src = 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.js';
    script.async = true;
    document.head.appendChild(script);
    console.log('📦 Carregando biblioteca heic2any...');
  }
};

const UploadPage = () => {
  const navigate = useNavigate();
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

  const isMobile = isMobileDevice();
  const maxFiles = isMobile ? 5 : uploadType === 'travel' ? 20 : 10;

  // Carregar biblioteca HEIC ao montar o componente
  React.useEffect(() => {
    loadHeic2anyScript();
  }, []);

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

  // ⭐ FUNÇÃO MELHORADA PARA SELEÇÃO E PROCESSAMENTO DE ARQUIVOS
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
            // ⭐ PROCESSAR ARQUIVO (converter HEIC se necessário)
            let processedFile = await processImageFile(file);

            // ⭐ COMPRIMIR IMAGEM SE HABILITADO E ARQUIVO FOR GRANDE
            if (
              compressionEnabled &&
              processedFile.size > 1024 * 1024 &&
              !isHeicFile(processedFile)
            ) {
              try {
                console.log(
                  `🔄 Comprimindo imagem ${i + 1}: ${processedFile.name}`
                );

                // Ajustar qualidade baseado no dispositivo
                const quality = isMobile ? 0.7 : 0.85;
                const maxDimension = isMobile ? 1280 : 1920;

                const compressedFile = await compressImage(
                  processedFile,
                  maxDimension,
                  maxDimension,
                  quality
                );

                if (compressedFile.size >= processedFile.size) {
                  // Se compressão não reduziu, manter original
                  console.log('⚠️ Mantendo original (compressão não efetiva)');
                } else {
                  processedFile = compressedFile;
                }
              } catch (error) {
                console.error('❌ Erro na compressão:', error);
                // Continuar com arquivo original se compressão falhar
              }
            }

            processedFiles.push(processedFile);

            // Criar preview (com fallback para HEIC)
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

        // Mostrar economia de espaço
        const originalTotal = files.reduce((acc, f) => acc + f.size, 0);
        const compressedTotal = processedFiles.reduce(
          (acc, f) => acc + f.size,
          0
        );
        const saved = originalTotal - compressedTotal;

        if (saved > 0) {
          toast.success(
            `Economizado ${(saved / 1024 / 1024).toFixed(1)}MB com compressão!`,
            {
              icon: '🗜️',
              duration: 3000,
            }
          );
        }

        // Avisar sobre arquivos HEIC
        const heicCount = newPreviews.filter(p => p.isHeic).length;
        if (heicCount > 0) {
          toast.success(
            `${heicCount} arquivo(s) HEIC detectado(s) e processado(s)`,
            {
              icon: '📱',
              duration: 3000,
            }
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

  // ⭐ FUNÇÃO DE UPLOAD COM PROGRESSO DETALHADO
  const onSubmit = async data => {
    if (selectedFiles.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    console.log('🚀 Iniciando upload:', {
      uploadType,
      data,
      fileCount: selectedFiles.length,
      device: isMobile ? 'mobile' : 'desktop',
      hasHeic: previews.some(p => p.isHeic),
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

      // ⭐ ADICIONAR ARQUIVOS AO FORMDATA
      selectedFiles.forEach(file => {
        formData.append('images', file);
      });

      if (uploadType === 'memories') {
        setUploadProgress({
          step: 2,
          message: 'Enviando memórias...',
          details: `Categoria: ${data.category} - Ano: ${data.year}`,
          percentage: 50,
        });

        formData.append('year', data.year);
        formData.append('category', data.category);
        formData.append('description', data.description || '');

        const response = await uploadService.uploadMemories(formData);

        if (response.success) {
          setUploadProgress({
            step: 3,
            message: 'Upload concluído!',
            details: `${response.images.length} imagens salvas com sucesso`,
            percentage: 100,
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
        setUploadProgress({
          step: 2,
          message: 'Criando álbum de viagem...',
          details: `Destino: ${data.location}`,
          percentage: 50,
        });

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
          <h1 className='text-3xl font-bold text-gray-900 mb-4'>
            Adicionar Memórias
          </h1>
          <p className='text-gray-600'>
            Carregue novas fotos e trabalhos escolares para preservar momentos
            especiais
          </p>

          {/* ⭐ INDICADOR DE DISPOSITIVO E CONFIGURAÇÕES */}
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

        {/* ⭐ PROGRESS INDICATOR */}
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

            {/* Progress Bar */}
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

        {/* ⭐ ARQUIVOS NÃO SUPORTADOS */}
        {unsupportedFiles.length > 0 && (
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
            <div className='flex items-start space-x-3'>
              <FileWarning className='h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5' />
              <div className='flex-1'>
                <h4 className='text-sm font-medium text-yellow-800 mb-2'>
                  Arquivos não processados ({unsupportedFiles.length})
                </h4>
                <ul className='text-sm text-yellow-700 space-y-1'>
                  {unsupportedFiles.map((file, index) => (
                    <li key={index}>
                      • {file.name}: {file.error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
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
                      disabled={uploading || processingImages}
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
                      disabled={uploading || processingImages}
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
                      disabled={uploading || processingImages}
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
                      disabled={uploading || processingImages}
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
                      disabled={uploading || processingImages}
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
              onClick={resetForm}
              className='btn-secondary'
              disabled={uploading || processingImages}
            >
              Limpar
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
