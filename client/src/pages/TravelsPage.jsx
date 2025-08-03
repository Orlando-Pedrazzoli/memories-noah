// client/src/pages/TravelsPage.jsx - VERSÃO COM MAPBOX 3D

import React, { useState, useEffect, useCallback } from 'react';
import { travelService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import TravelAlbum from '../components/travel/TravelAlbum';
import MapboxTravelMap from '../components/travel/MapboxTravelMap'; // ⭐ NOVO IMPORT
import {
  MapPin,
  ImageIcon,
  Calendar,
  Loader2,
  RefreshCw,
  Trash2,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TravelsPage = () => {
  const [travels, setTravels] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlbum, setShowAlbum] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // ⭐ USAR useCallback PARA FUNÇÃO DE CARREGAMENTO
  const loadTravelsData = useCallback(async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setDebugInfo('🗺️ Carregando dados...');

      console.log('🗺️ Loading travels data...');

      // Load travels and markers in parallel
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(),
        travelService.getTravelMarkers(),
      ]);

      if (travelsResponse.success) {
        console.log('✅ Travels loaded:', travelsResponse.travels.length);
        setTravels(travelsResponse.travels);
      } else {
        console.error('❌ Failed to load travels:', travelsResponse);
        setTravels([]);
      }

      if (markersResponse.success) {
        console.log('✅ Markers loaded:', markersResponse.markers.length);
        setMarkers(markersResponse.markers);

        // ⭐ DEBUG: Verificar coordenadas
        const validMarkers = markersResponse.markers.filter(
          m =>
            m.coordinates &&
            Array.isArray(m.coordinates) &&
            m.coordinates.length === 2 &&
            !isNaN(m.coordinates[0]) &&
            !isNaN(m.coordinates[1])
        );

        setDebugInfo(
          `✅ ${validMarkers.length}/${markersResponse.markers.length} marcadores válidos`
        );

        if (validMarkers.length !== markersResponse.markers.length) {
          console.warn(
            '⚠️ Alguns markers têm coordenadas inválidas:',
            markersResponse.markers.filter(m => !validMarkers.includes(m))
          );
        }
      } else {
        console.error('❌ Failed to load markers:', markersResponse);
        setMarkers([]);
      }

      if (showToast) {
        toast.success('Dados atualizados!');
      }
    } catch (error) {
      console.error('❌ Error loading travels data:', error);
      setDebugInfo('❌ Erro ao carregar dados');

      if (showToast) {
        toast.error('Erro ao recarregar dados');
      } else {
        toast.error('Erro ao carregar viagens');
      }

      setTravels([]);
      setMarkers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTravelsData();
  }, [loadTravelsData]);

  // ⭐ FUNÇÃO PARA RECARREGAR DADOS
  const handleRefresh = () => {
    loadTravelsData(true);
  };

  // ⭐ FUNÇÃO PARA LIMPEZA DE ÁLBUNS ÓRFÃOS (desenvolvimento)
  const handleCleanupOrphaned = async () => {
    if (process.env.NODE_ENV === 'production') {
      toast.error('Função disponível apenas em desenvolvimento');
      return;
    }

    try {
      const response = await travelService.cleanupOrphanedAlbums();
      if (response.success) {
        toast.success(
          `${response.details.totalCleaned} álbuns órfãos removidos`
        );
        loadTravelsData();
      }
    } catch (error) {
      console.error('Erro na limpeza:', error);
      toast.error('Erro ao limpar álbuns órfãos');
    }
  };

  // ⭐ HANDLER MELHORADO PARA EXCLUSÃO DE ÁLBUM
  const handleTravelDeleted = useCallback(
    (deletedTravelId, details) => {
      console.log('🗑️ Álbum deletado:', deletedTravelId, details);

      if (details?.cleanupComplete) {
        console.log('✅ Limpeza completa - removendo da interface');

        setTravels(prevTravels => {
          const updated = prevTravels.filter(
            travel => travel.id !== deletedTravelId
          );
          console.log('📋 Travels atualizados:', updated.length, 'restantes');
          return updated;
        });

        setMarkers(prevMarkers => {
          const updated = prevMarkers.filter(
            marker => marker.travelId !== deletedTravelId
          );
          console.log('🗺️ Markers atualizados:', updated.length, 'restantes');
          return updated;
        });

        setDebugInfo('✅ Álbum excluído - interface atualizada');
        toast.success('Álbum removido completamente!', { duration: 3000 });
      } else {
        console.warn(
          '⚠️ Limpeza incompleta - recarregando dados para sincronizar'
        );
        setDebugInfo('⚠️ Limpeza incompleta - recarregando...');

        setTimeout(() => {
          loadTravelsData(true);
        }, 1000);

        toast.warning('Álbum removido - sincronizando interface...', {
          duration: 3000,
        });
      }
    },
    [loadTravelsData]
  );

  // ⭐ HANDLER PARA CLICK NO MARKER DO MAPBOX
  const handleMarkerClick = async marker => {
    try {
      console.log('🎯 Clicked marker:', marker);
      const travelData = await travelService.getTravelById(marker.travelId);
      if (travelData.success) {
        setSelectedTravel(travelData.travel);
        setShowAlbum(true);
      }
    } catch (error) {
      console.error('Error loading travel details:', error);
      toast.error('Erro ao carregar álbum da viagem');
    }
  };

  const handleTravelCardClick = travel => {
    setSelectedTravel(travel);
    setShowAlbum(true);
  };

  // ⭐ FILTRAR MARKERS VÁLIDOS PARA O MAPBOX
  const validMarkers = markers.filter(
    marker =>
      marker.coordinates &&
      Array.isArray(marker.coordinates) &&
      marker.coordinates.length === 2 &&
      !isNaN(marker.coordinates[0]) &&
      !isNaN(marker.coordinates[1])
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center space-x-3'>
              <Globe className='h-6 w-6 text-primary-600' />
              <h1 className='text-3xl font-bold text-gray-900'>
                Nossas Viagens
              </h1>
              <div className='bg-gradient-to-r from-blue-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-medium'>
                Mapa 3D
              </div>
            </div>

            <div className='flex items-center space-x-2'>
              {/* ⭐ BOTÃO DE LIMPEZA (desenvolvimento) */}
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={handleCleanupOrphaned}
                  className='flex items-center space-x-2 px-3 py-2 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 transition-colors text-sm'
                  disabled={loading || refreshing}
                >
                  <Trash2 className='h-4 w-4' />
                  <span>Limpar Órfãos</span>
                </button>
              )}

              {/* ⭐ BOTÃO DE REFRESH */}
              <button
                onClick={handleRefresh}
                className='flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
                disabled={loading || refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span className='text-sm'>
                  {refreshing ? 'Atualizando...' : 'Atualizar'}
                </span>
              </button>
            </div>
          </div>

          <p className='text-gray-600 mt-2'>
            Explore os lugares que visitamos em um mapa 3D interativo
          </p>

          {/* ⭐ DEBUG INFO */}
          {debugInfo && (
            <div className='mt-2 text-sm text-blue-600 bg-blue-50 px-3 py-1 rounded'>
              {debugInfo}
            </div>
          )}
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <div className='flex flex-col items-center space-y-4'>
              <Loader2 className='h-8 w-8 animate-spin text-primary-600' />
              <p className='text-gray-600'>Carregando viagens...</p>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* ⭐ MAPBOX 3D SECTION */}
            <div className='lg:col-span-2'>
              <div className='bg-white rounded-lg shadow-md overflow-hidden'>
                <div className='p-4 border-b border-gray-200'>
                  <h2 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                    <Globe className='h-5 w-5 text-blue-600' />
                    <span>Mapa Mundial 3D</span>
                  </h2>
                  <p className='text-sm text-gray-600 mt-1'>
                    Clique nos marcadores para ver o álbum • Arraste para
                    navegar • Scroll para zoom
                    {validMarkers.length > 0 &&
                      ` • ${validMarkers.length} ${
                        validMarkers.length === 1 ? 'marcador' : 'marcadores'
                      } no mapa`}
                  </p>
                </div>

                {/* ⭐ MAPBOX COMPONENT */}
                <div className='h-96 lg:h-[500px]'>
                  <MapboxTravelMap
                    markers={validMarkers}
                    onMarkerClick={handleMarkerClick}
                    loading={loading || refreshing}
                  />
                </div>

                {/* ⭐ INFO DE STATUS MELHORADA */}
                <div className='p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200'>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div className='text-center'>
                      <div className='font-semibold text-gray-900'>
                        {markers.length}
                      </div>
                      <div className='text-gray-600'>Total</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold text-green-600'>
                        {validMarkers.length}
                      </div>
                      <div className='text-gray-600'>No Mapa</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold text-blue-600'>
                        {
                          new Set(
                            validMarkers
                              .map(m => m.location?.split(',').pop()?.trim())
                              .filter(Boolean)
                          ).size
                        }
                      </div>
                      <div className='text-gray-600'>Países</div>
                    </div>
                    <div className='text-center'>
                      <div className='font-semibold text-purple-600'>
                        {travels.reduce(
                          (acc, travel) => acc + travel.imageCount,
                          0
                        )}
                      </div>
                      <div className='text-gray-600'>Fotos</div>
                    </div>
                  </div>

                  {markers.length === 0 && (
                    <div className='text-center mt-4 p-4 bg-blue-100 rounded-lg'>
                      <p className='text-sm text-blue-800'>
                        🗺️ Nenhuma viagem adicionada ainda. Crie sua primeira
                        viagem para ver no mapa 3D!
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Travel Cards Section */}
            <div className='space-y-6'>
              <div className='bg-white rounded-lg shadow-md p-6'>
                <h2 className='text-lg font-semibold text-gray-900 mb-4'>
                  Álbuns de Viagem
                </h2>

                {travels.length > 0 ? (
                  <div className='space-y-4'>
                    {travels.map(travel => (
                      <div
                        key={travel.id}
                        className='border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer group'
                        onClick={() => handleTravelCardClick(travel)}
                      >
                        {travel.coverImage && (
                          <div className='aspect-video overflow-hidden rounded-md mb-3'>
                            <img
                              src={travel.coverImage}
                              alt={travel.name}
                              className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                            />
                          </div>
                        )}

                        <h3 className='font-medium text-gray-900 mb-2 group-hover:text-primary-600 transition-colors'>
                          {travel.name}
                        </h3>

                        <div className='flex items-center justify-between text-sm text-gray-600 mb-2'>
                          <div className='flex items-center space-x-1'>
                            <ImageIcon className='h-4 w-4' />
                            <span>{travel.imageCount} fotos</span>
                          </div>

                          {travel.images.length > 0 && (
                            <div className='flex items-center space-x-1'>
                              <Calendar className='h-4 w-4' />
                              <span>
                                {new Date(
                                  travel.images[0].created_at
                                ).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ⭐ STATUS DE COORDENADAS MELHORADO */}
                        <div className='flex items-center space-x-2 text-xs'>
                          {travel.coordinates ? (
                            <span className='text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full'>
                              <Globe className='h-3 w-3 mr-1' />
                              No mapa 3D
                            </span>
                          ) : (
                            <span className='text-gray-400 flex items-center bg-gray-50 px-2 py-1 rounded-full'>
                              <MapPin className='h-3 w-3 mr-1' />
                              Sem localização
                            </span>
                          )}
                          {travel.location && (
                            <span className='text-gray-500 truncate'>
                              📍 {travel.location}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-8'>
                    <Globe className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      Nenhuma viagem ainda
                    </h3>
                    <p className='text-gray-600 mb-4'>
                      Crie seu primeiro álbum de viagem para aparecer no mapa 3D
                    </p>
                    <a
                      href='/upload'
                      className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 transition-colors text-sm'
                    >
                      Adicionar Primeira Viagem
                    </a>
                  </div>
                )}
              </div>

              {/* ⭐ Statistics MELHORADAS */}
              <div className='bg-white rounded-lg shadow-md p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  Estatísticas Globais
                </h3>

                <div className='space-y-4'>
                  <div className='flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <Globe className='h-4 w-4 text-blue-600' />
                      <span className='text-gray-700'>Total de viagens:</span>
                    </div>
                    <span className='font-bold text-blue-600'>
                      {travels.length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <ImageIcon className='h-4 w-4 text-purple-600' />
                      <span className='text-gray-700'>Total de fotos:</span>
                    </div>
                    <span className='font-bold text-purple-600'>
                      {travels.reduce(
                        (acc, travel) => acc + travel.imageCount,
                        0
                      )}
                    </span>
                  </div>

                  <div className='flex justify-between items-center p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <MapPin className='h-4 w-4 text-green-600' />
                      <span className='text-gray-700'>No mapa 3D:</span>
                    </div>
                    <span className='font-bold text-green-600'>
                      {validMarkers.length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <Calendar className='h-4 w-4 text-orange-600' />
                      <span className='text-gray-700'>Países visitados:</span>
                    </div>
                    <span className='font-bold text-orange-600'>
                      {new Set(
                        validMarkers
                          .filter(m => m.location)
                          .map(m => m.location.split(',').pop()?.trim())
                      ).size || 0}
                    </span>
                  </div>
                </div>

                {/* ⭐ MAPA PROGRESS BAR */}
                {markers.length > 0 && (
                  <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
                    <div className='flex justify-between text-xs text-gray-600 mb-1'>
                      <span>Cobertura do Mapa</span>
                      <span>
                        {Math.round(
                          (validMarkers.length / markers.length) * 100
                        )}
                        %
                      </span>
                    </div>
                    <div className='w-full bg-gray-200 rounded-full h-2'>
                      <div
                        className='bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-500'
                        style={{
                          width: `${
                            (validMarkers.length / markers.length) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* ⭐ MAPBOX INFO CARD */}
              <div className='bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow-md p-6'>
                <div className='flex items-center space-x-3 mb-3'>
                  <Globe className='h-6 w-6' />
                  <h3 className='text-lg font-semibold'>Mapa 3D Interativo</h3>
                </div>
                <p className='text-blue-100 text-sm mb-4'>
                  Explore suas viagens em um mapa 3D com vista de satélite,
                  rotação automática e controles avançados.
                </p>
                <div className='space-y-2 text-xs text-blue-100'>
                  <div>🖱️ Arraste para mover o mapa</div>
                  <div>🔍 Scroll para zoom</div>
                  <div>📍 Clique nos markers para ver álbuns</div>
                  <div>🎛️ Use os controles para mudar estilo</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ⭐ TRAVEL ALBUM MODAL */}
      {showAlbum && selectedTravel && (
        <TravelAlbum
          travel={selectedTravel}
          onClose={() => {
            setShowAlbum(false);
            setSelectedTravel(null);
          }}
          onTravelDeleted={handleTravelDeleted}
        />
      )}

      <Footer />
    </div>
  );
};

export default TravelsPage;
