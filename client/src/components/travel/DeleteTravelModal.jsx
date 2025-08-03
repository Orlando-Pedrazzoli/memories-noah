import React, { useState, useEffect } from 'react';
import {
  Trash2,
  AlertTriangle,
  Loader2,
  X,
  Image,
  MapPin,
  Calendar,
  CheckCircle,
} from 'lucide-react';

const DeleteTravelModal = ({ travel, onClose, onDeleted, travelService }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [confirmText, setConfirmText] = useState('');
  const [step, setStep] = useState(1); // 1: info, 2: confirm, 3: deleting, 4: success
  const [deleteResult, setDeleteResult] = useState(null);

  const expectedText = travel.name.toLowerCase().replace(/\s+/g, '');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await travelService.getTravelStats(travel.id);
      if (response.success) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleDelete = async () => {
    if (confirmText.toLowerCase().replace(/\s+/g, '') !== expectedText) {
      console.warn('❌ Nome não confere:', { confirmText, expectedText });
      return;
    }

    console.log('🗑️ Iniciando exclusão do álbum:', travel.id);

    // ⭐ VERIFICAR TOKEN ANTES DE CONTINUAR
    const token = document.cookie.match(/memory-token=([^;]+)/)?.[1];
    if (!token) {
      console.error('❌ Token não encontrado nos cookies');
      import('react-hot-toast').then(({ default: toast }) => {
        toast.error('Sessão expirada. Faça login novamente.', {
          duration: 5000,
        });
      });

      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return;
    }

    console.log('✅ Token encontrado, prosseguindo com exclusão...');

    setStep(3); // Mostrar loading
    setLoading(true);

    try {
      console.log('📡 Chamando travelService.deleteTravelAlbum...');
      const response = await travelService.deleteTravelAlbum(travel.id);

      console.log('📥 Resposta recebida:', response);

      if (response.success) {
        console.log('✅ Exclusão bem-sucedida:', response.details);

        // ⭐ MOSTRAR TELA DE SUCESSO
        setDeleteResult(response.details);
        setStep(4);
        setLoading(false);

        // ⭐ FECHAR MODAL APÓS 3 SEGUNDOS E NOTIFICAR COMPONENTE PAI
        setTimeout(() => {
          console.log('🔄 Notificando componente pai e fechando modal...');
          onDeleted(travel.id, response.details);
          onClose();
        }, 3000);
      } else {
        console.error('❌ Resposta de erro do servidor:', response);
        throw new Error(response.error || 'Falha na exclusão');
      }
    } catch (error) {
      console.error('❌ Erro completo ao deletar álbum:', error);
      console.error('❌ Error response:', error.response?.data);
      console.error('❌ Error status:', error.response?.status);

      // ⭐ VOLTAR PARA O STEP 2 E MOSTRAR ERRO
      setStep(2);
      setLoading(false);

      // Verificar se é erro de autenticação
      if (error.response?.status === 401) {
        import('react-hot-toast').then(({ default: toast }) => {
          toast.error(
            'Sessão expirada. Você será redirecionado para o login.',
            {
              duration: 3000,
            }
          );
        });

        setTimeout(() => {
          window.location.href = '/login';
        }, 3000);
        return;
      }

      // Mostrar erro específico
      const errorMessage =
        error.response?.data?.error || error.message || 'Erro desconhecido';

      import('react-hot-toast').then(({ default: toast }) => {
        toast.error(`Erro ao excluir álbum: ${errorMessage}`, {
          duration: 5000,
          position: 'top-center',
        });
      });
    }
  };

  const canDelete =
    confirmText.toLowerCase().replace(/\s+/g, '') === expectedText;

  // ⭐ FUNÇÃO PARA FECHAR MODAL IMEDIATAMENTE
  const handleForceClose = () => {
    if (step === 3) {
      // Se estiver deletando, mostrar confirmação
      const confirmed = window.confirm(
        'A exclusão está em andamento. Tem certeza que deseja fechar? A operação continuará em segundo plano.'
      );
      if (confirmed) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <div className='fixed inset-0 z-[10001] bg-black bg-opacity-50 flex items-center justify-center p-4'>
      <div className='bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden z-[10002]'>
        {/* Header */}
        <div
          className={`text-white p-4 ${
            step === 4 ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-2'>
              {step === 4 ? (
                <CheckCircle className='h-5 w-5' />
              ) : (
                <Trash2 className='h-5 w-5' />
              )}
              <h2 className='text-lg font-semibold'>
                {step === 3
                  ? 'Excluindo Álbum...'
                  : step === 4
                  ? 'Álbum Excluído!'
                  : 'Excluir Álbum'}
              </h2>
            </div>

            {/* ⭐ BOTÃO DE FECHAR SEMPRE VISÍVEL (exceto no loading) */}
            {step !== 3 && (
              <button
                onClick={handleForceClose}
                className={`p-1 rounded transition-colors ${
                  step === 4 ? 'hover:bg-green-700' : 'hover:bg-red-700'
                }`}
              >
                <X className='h-4 w-4' />
              </button>
            )}
          </div>
        </div>

        <div className='p-6'>
          {/* Step 1: Informações do álbum */}
          {step === 1 && (
            <div className='space-y-4'>
              <div className='flex items-start space-x-3'>
                <AlertTriangle className='h-6 w-6 text-red-500 flex-shrink-0 mt-1' />
                <div>
                  <h3 className='font-medium text-gray-900 mb-2'>
                    Você tem certeza?
                  </h3>
                  <p className='text-sm text-gray-600 mb-4'>
                    Esta ação irá excluir permanentemente o álbum "{travel.name}
                    " e todas as suas imagens. Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>

              {/* Estatísticas do álbum */}
              {stats && (
                <div className='bg-gray-50 rounded-lg p-4 space-y-3'>
                  <h4 className='font-medium text-gray-900 text-sm'>
                    O que será excluído:
                  </h4>

                  <div className='space-y-2 text-sm'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <Image className='h-4 w-4 text-gray-400' />
                        <span>Imagens</span>
                      </div>
                      <span className='font-medium'>{stats.imageCount}</span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='flex items-center space-x-2'>
                        <div className='h-4 w-4 bg-gray-400 rounded'></div>
                        <span>Tamanho total</span>
                      </div>
                      <span className='font-medium'>
                        {stats.totalSizeMB} MB
                      </span>
                    </div>

                    {stats.hasMarker && (
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <MapPin className='h-4 w-4 text-gray-400' />
                          <span>Localização no mapa</span>
                        </div>
                        <span className='font-medium text-red-600'>
                          Será removida
                        </span>
                      </div>
                    )}

                    {stats.createdAt && (
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center space-x-2'>
                          <Calendar className='h-4 w-4 text-gray-400' />
                          <span>Criado em</span>
                        </div>
                        <span className='text-gray-600'>
                          {new Date(stats.createdAt).toLocaleDateString(
                            'pt-BR'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className='flex space-x-3 pt-4'>
                <button
                  onClick={onClose}
                  className='flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors'
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setStep(2)}
                  className='flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors'
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Confirmação com texto */}
          {step === 2 && (
            <div className='space-y-4'>
              <div className='text-center'>
                <AlertTriangle className='h-12 w-12 text-red-500 mx-auto mb-4' />
                <h3 className='font-medium text-gray-900 mb-2'>
                  Confirmação Final
                </h3>
                <p className='text-sm text-gray-600 mb-4'>
                  Para confirmar a exclusão, digite o nome do álbum:
                </p>
                <p className='font-medium text-gray-900 bg-gray-100 px-3 py-2 rounded'>
                  {travel.name}
                </p>
              </div>

              <div>
                <input
                  type='text'
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  placeholder='Digite o nome do álbum...'
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    confirmText && !canDelete
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  autoFocus
                />
                {confirmText && !canDelete && (
                  <p className='mt-1 text-sm text-red-600'>
                    O nome não confere. Digite exatamente: "{travel.name}"
                  </p>
                )}
                {canDelete && (
                  <p className='mt-1 text-sm text-green-600'>
                    ✓ Nome confirmado
                  </p>
                )}
              </div>

              <div className='flex space-x-3 pt-4'>
                <button
                  onClick={() => setStep(1)}
                  className='flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors'
                >
                  Voltar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={!canDelete}
                  className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                    canDelete
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Excluir Definitivamente
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Excluindo */}
          {step === 3 && (
            <div className='text-center py-8'>
              <Loader2 className='h-12 w-12 text-red-600 mx-auto mb-4 animate-spin' />
              <h3 className='font-medium text-gray-900 mb-2'>
                Excluindo álbum...
              </h3>
              <p className='text-sm text-gray-600 mb-4'>
                Removendo {stats?.imageCount || 0} imagens e limpando dados. Por
                favor, aguarde.
              </p>
              <div className='text-xs text-gray-500'>
                Esta operação pode levar alguns segundos.
              </div>
            </div>
          )}

          {/* ⭐ Step 4: Sucesso */}
          {step === 4 && (
            <div className='text-center py-8'>
              <CheckCircle className='h-12 w-12 text-green-600 mx-auto mb-4' />
              <h3 className='font-medium text-gray-900 mb-2'>
                Álbum excluído com sucesso!
              </h3>

              {deleteResult && (
                <div className='text-sm text-gray-600 mb-4 space-y-1'>
                  <p>✅ {deleteResult.imagesDeleted} imagens removidas</p>
                  {deleteResult.markerRemoved && (
                    <p>✅ Localização removida do mapa</p>
                  )}
                  {deleteResult.folderDeleted && (
                    <p>✅ Pasta limpa do servidor</p>
                  )}
                </div>
              )}

              <div className='text-xs text-gray-500 mb-4'>
                Fechando automaticamente em 3 segundos...
              </div>

              <button
                onClick={() => {
                  onDeleted(travel.id, deleteResult);
                  onClose();
                }}
                className='px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm'
              >
                Fechar Agora
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteTravelModal;
