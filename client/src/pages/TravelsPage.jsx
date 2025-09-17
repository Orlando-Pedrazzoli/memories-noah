// client/src/pages/TravelsPage.jsx - VERSÃO COMPLETA COM RELOAD AUTOMÁTICO

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { travelService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import TravelAlbum from '../components/travel/TravelAlbum';
import MapboxTravelMap from '../components/travel/MapboxTravelMap';
import {
  MapPin,
  ImageIcon,
  Calendar,
  Loader2,
  RefreshCw,
  Plus,
  Globe,
  Filter,
  Search,
  Grid,
  List,
  Info,
  AlertCircle,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TravelsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [travels, setTravels] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlbum, setShowAlbum] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('cards');
  const [selectedTravelId, setSelectedTravelId] = useState(null);
  const [showStats, setShowStats] = useState(true);

  // ⭐ FUNÇÃO DE CARREGAMENTO DE DADOS COM FORCE RELOAD
  const loadTravelsData = useCallback(
    async (showToast = false, forceReload = false) => {
      try {
        if (showToast || forceReload) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        console.log('🗺️ Carregando dados de viagens...', { forceReload });

        // Carregar viagens e marcadores em paralelo (com bypass de cache se forceReload)
        const [travelsResponse, markersResponse] = await Promise.all([
          travelService.getAllTravels(forceReload),
          travelService.getTravelMarkers(forceReload),
        ]);

        if (travelsResponse.success) {
          console.log('✅ Viagens carregadas:', travelsResponse.travels.length);

          // Ordenar por data mais recente
          const sortedTravels = (travelsResponse.travels || []).sort((a, b) => {
            const dateA = a.date ? new Date(a.date) : new Date(0);
            const dateB = b.date ? new Date(b.date) : new Date(0);
            return dateB - dateA;
          });
          setTravels(sortedTravels);
        } else {
          console.error('❌ Falha ao carregar viagens');
          setTravels([]);
        }

        if (markersResponse.success) {
          console.log(
            '✅ Marcadores carregados:',
            markersResponse.markers.length
          );

          // Enriquecer marcadores com dados das viagens
          const enrichedMarkers = (markersResponse.markers || []).map(
            marker => {
              const travel = travelsResponse.travels?.find(
                t => t.id === marker.travelId
              );
              return {
                ...marker,
                coverImage: travel?.coverImage || travel?.images?.[0]?.url,
                date: marker.date || travel?.date,
                imageCount: marker.imageCount || travel?.imageCount || 0,
              };
            }
          );

          setMarkers(enrichedMarkers);
        } else {
          console.error('❌ Falha ao carregar marcadores');
          setMarkers([]);
        }

        if (showToast) {
          toast.success('Dados atualizados!');
        }

        if (forceReload) {
          console.log('✅ Reload forçado completo');
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        toast.error('Erro ao carregar viagens');
        setTravels([]);
        setMarkers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  // ⭐ DETECTAR NOVO UPLOAD E FORÇAR RELOAD
  useEffect(() => {
    const locationState = location.state;

    if (locationState?.fromUpload || locationState?.forceReload) {
      console.log('🔄 Detectado novo upload, forçando recarga...');

      // Limpar estado da location para evitar reload infinito
      window.history.replaceState({}, document.title);

      // Forçar recarga completa com bypass de cache
      setTimeout(() => {
        loadTravelsData(false, true);
      }, 500);

      // Se houver novo travel, destacá-lo
      if (locationState?.newTravelId) {
        setSelectedTravelId(locationState.newTravelId);

        // Mostrar toast de sucesso
        toast.success('Nova viagem adicionada ao mapa!', {
          duration: 4000,
          icon: '🗺️',
        });
      }
    } else {
      loadTravelsData();
    }
  }, [location.state, loadTravelsData]);

  // ⭐ FUNÇÃO DE REFRESH MANUAL
  const handleRefresh = () => {
    loadTravelsData(true, true);
  };

  // ⭐ HANDLER PARA EXCLUSÃO DE ÁLBUM
  const handleTravelDeleted = useCallback(
    (deletedTravelId, details) => {
      console.log('🗑️ Álbum excluído:', deletedTravelId, details);

      // Atualizar lista de viagens
      setTravels(prevTravels =>
        prevTravels.filter(travel => travel.id !== deletedTravelId)
      );

      // Atualizar marcadores
      setMarkers(prevMarkers =>
        prevMarkers.filter(marker => marker.travelId !== deletedTravelId)
      );

      // Fechar modal se estiver aberto
      if (selectedTravel?.id === deletedTravelId) {
        setShowAlbum(false);
        setSelectedTravel(null);
      }

      toast.success('Álbum removido com sucesso!');
    },
    [selectedTravel]
  );

  // ⭐ HANDLER PARA CLIQUE NO MARCADOR DO MAPA
  const handleMarkerClick = async marker => {
    console.log('📍 Marcador clicado:', marker);

    // Destacar o marcador selecionado
    setSelectedTravelId(marker.travelId || marker.id);

    // Buscar dados completos da viagem
    try {
      setLoading(true);
      const travelData = await travelService.getTravelById(marker.travelId);

      if (travelData.success) {
        setSelectedTravel(travelData.travel);
        setShowAlbum(true);
      }
    } catch (error) {
      console.error('Erro ao carregar álbum:', error);

      // Tentar usar dados locais como fallback
      const localTravel = travels.find(t => t.id === marker.travelId);
      if (localTravel) {
        setSelectedTravel(localTravel);
        setShowAlbum(true);
      } else {
        toast.error('Erro ao carregar álbum da viagem');
      }
    } finally {
      setLoading(false);
    }
  };

  // ⭐ HANDLER PARA CLIQUE NO CARD DE VIAGEM
  const handleTravelCardClick = travel => {
    setSelectedTravel(travel);
    setSelectedTravelId(travel.id);
    setShowAlbum(true);
  };

  // ⭐ FILTRAR VIAGENS PELA BUSCA
  const filteredTravels = travels.filter(
    travel =>
      travel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      travel.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ⭐ FILTRAR MARCADORES VÁLIDOS
  const validMarkers = markers.filter(
    marker =>
      marker.coordinates &&
      Array.isArray(marker.coordinates) &&
      marker.coordinates.length === 2 &&
      !isNaN(marker.coordinates[0]) &&
      !isNaN(marker.coordinates[1])
  );

  // ⭐ CALCULAR ESTATÍSTICAS
  const stats = {
    totalTravels: travels.length,
    totalPhotos: travels.reduce(
      (acc, travel) => acc + (travel.imageCount || 0),
      0
    ),
    markersOnMap: validMarkers.length,
    countries: new Set(
      validMarkers
        .filter(m => m.location)
        .map(m => {
          const parts = m.location.split(',');
          return parts[parts.length - 1]?.trim();
        })
        .filter(Boolean)
    ).size,
  };

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* ⭐ HEADER MELHORADO */}
        <div className='mb-8'>
          <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
            <div className='flex items-center space-x-3'>
              <div className='p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg'>
                <Globe className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-3xl font-bold text-gray-900'>
                  Nossas Viagens
                </h1>
                <p className='text-gray-600 mt-1'>
                  Explore os lugares que visitamos em família
                </p>
              </div>
            </div>

            <div className='flex items-center space-x-3'>
              {/* Barra de busca */}
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  placeholder='Buscar viagens...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all'
                />
              </div>

              {/* Botão de refresh */}
              <button
                onClick={handleRefresh}
                disabled={loading || refreshing}
                className='flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50'
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span className='hidden sm:inline text-sm'>
                  {refreshing ? 'Atualizando...' : 'Atualizar'}
                </span>
              </button>

              {/* Botão de adicionar */}
              <button
                onClick={() => navigate('/upload')}
                className='flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all shadow-md hover:shadow-lg'
              >
                <Plus className='h-4 w-4' />
                <span className='hidden sm:inline'>Nova Viagem</span>
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className='flex items-center justify-center py-32'>
            <div className='flex flex-col items-center space-y-4'>
              <Loader2 className='h-12 w-12 animate-spin text-blue-600' />
              <p className='text-gray-600 font-medium'>Carregando viagens...</p>
            </div>
          </div>
        ) : (
          <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
            {/* ⭐ SEÇÃO DO MAPA 3D */}
            <div className='lg:col-span-2'>
              <div className='bg-white rounded-xl shadow-lg overflow-hidden'>
                <div className='p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50'>
                  <div className='flex items-center justify-between'>
                    <h2 className='text-lg font-semibold text-gray-900 flex items-center space-x-2'>
                      <Globe className='h-5 w-5 text-blue-600' />
                      <span>Mapa Interativo 3D</span>
                    </h2>
                    {validMarkers.length > 0 && (
                      <div className='text-sm text-gray-600'>
                        {validMarkers.length}{' '}
                        {validMarkers.length === 1 ? 'lugar' : 'lugares'}
                      </div>
                    )}
                  </div>
                  <p className='text-sm text-gray-600 mt-1'>
                    Clique nos marcadores para explorar os álbuns
                  </p>
                </div>

                {/* Mapa Mapbox */}
                <div className='h-96 lg:h-[500px]'>
                  <MapboxTravelMap
                    markers={validMarkers}
                    onMarkerClick={handleMarkerClick}
                    loading={loading || refreshing}
                    selectedTravelId={selectedTravelId}
                  />
                </div>

                {/* Estatísticas do mapa */}
                {showStats && (
                  <div className='p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-t border-gray-200'>
                    <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-gray-900'>
                          {stats.totalTravels}
                        </div>
                        <div className='text-xs text-gray-600'>Viagens</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-blue-600'>
                          {stats.markersOnMap}
                        </div>
                        <div className='text-xs text-gray-600'>No Mapa</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-purple-600'>
                          {stats.countries}
                        </div>
                        <div className='text-xs text-gray-600'>Países</div>
                      </div>
                      <div className='text-center'>
                        <div className='text-2xl font-bold text-green-600'>
                          {stats.totalPhotos}
                        </div>
                        <div className='text-xs text-gray-600'>Fotos</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ⭐ LISTA DE ÁLBUNS */}
            <div className='space-y-6'>
              {/* Controles de visualização */}
              <div className='bg-white rounded-lg shadow-md p-4'>
                <div className='flex items-center justify-between mb-4'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Álbuns de Viagem
                  </h2>

                  {/* Toggle View Mode */}
                  <div className='flex bg-gray-100 rounded-lg p-1'>
                    <button
                      onClick={() => setViewMode('cards')}
                      className={`p-2 rounded transition-all ${
                        viewMode === 'cards'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      title='Visualização em cards'
                    >
                      <Grid className='h-4 w-4' />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 rounded transition-all ${
                        viewMode === 'list'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                      title='Visualização em lista'
                    >
                      <List className='h-4 w-4' />
                    </button>
                  </div>
                </div>

                {/* Lista de viagens */}
                {filteredTravels.length > 0 ? (
                  <div
                    className={viewMode === 'cards' ? 'space-y-4' : 'space-y-2'}
                  >
                    {filteredTravels.map(travel => (
                      <div
                        key={travel.id}
                        className={`
                          ${
                            viewMode === 'cards'
                              ? 'border border-gray-200 rounded-lg p-4 hover:shadow-md'
                              : 'flex items-center p-3 hover:bg-gray-50 rounded-lg'
                          }
                          transition-all duration-200 cursor-pointer group
                          ${
                            selectedTravelId === travel.id
                              ? 'ring-2 ring-blue-500 bg-blue-50'
                              : ''
                          }
                        `}
                        onClick={() => handleTravelCardClick(travel)}
                      >
                        {viewMode === 'cards' ? (
                          <>
                            {/* Card View */}
                            {travel.coverImage && (
                              <div className='aspect-video overflow-hidden rounded-md mb-3'>
                                <img
                                  src={travel.coverImage}
                                  alt={travel.name}
                                  className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                                  loading='lazy'
                                />
                              </div>
                            )}

                            <h3 className='font-medium text-gray-900 mb-2 group-hover:text-blue-600 transition-colors'>
                              {travel.name}
                            </h3>

                            <div className='space-y-2'>
                              <div className='flex items-center justify-between text-sm text-gray-600'>
                                <div className='flex items-center space-x-1'>
                                  <ImageIcon className='h-4 w-4' />
                                  <span>{travel.imageCount} fotos</span>
                                </div>

                                {travel.date && (
                                  <div className='flex items-center space-x-1'>
                                    <Calendar className='h-4 w-4' />
                                    <span>
                                      {new Date(travel.date).toLocaleDateString(
                                        'pt-BR',
                                        {
                                          month: 'short',
                                          year: 'numeric',
                                        }
                                      )}
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Status de localização */}
                              <div className='flex items-center space-x-2 text-xs'>
                                {travel.coordinates ? (
                                  <span className='text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full'>
                                    <Globe className='h-3 w-3 mr-1' />
                                    No mapa
                                  </span>
                                ) : (
                                  <span className='text-gray-400 flex items-center bg-gray-50 px-2 py-1 rounded-full'>
                                    <MapPin className='h-3 w-3 mr-1' />
                                    Sem localização
                                  </span>
                                )}
                                {travel.location && (
                                  <span
                                    className='text-gray-500 truncate flex-1'
                                    title={travel.location}
                                  >
                                    {travel.location.split(',')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* List View */}
                            <div className='flex items-center flex-1'>
                              {travel.coverImage && (
                                <div className='w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-4'>
                                  <img
                                    src={travel.coverImage}
                                    alt={travel.name}
                                    className='w-full h-full object-cover'
                                    loading='lazy'
                                  />
                                </div>
                              )}

                              <div className='flex-1'>
                                <h3 className='font-medium text-gray-900 group-hover:text-blue-600 transition-colors'>
                                  {travel.name}
                                </h3>
                                <div className='text-sm text-gray-600 mt-1'>
                                  {travel.location?.split(',')[0]} •{' '}
                                  {travel.imageCount} fotos
                                </div>
                              </div>

                              <div className='flex items-center space-x-2'>
                                {travel.coordinates && (
                                  <Globe className='h-4 w-4 text-green-600' />
                                )}
                                <ChevronRight className='h-4 w-4 text-gray-400' />
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-center py-12'>
                    {searchTerm ? (
                      <>
                        <Search className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                        <h3 className='text-lg font-medium text-gray-900 mb-2'>
                          Nenhuma viagem encontrada
                        </h3>
                        <p className='text-gray-600'>
                          Tente buscar por outro termo
                        </p>
                      </>
                    ) : (
                      <>
                        <Globe className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                        <h3 className='text-lg font-medium text-gray-900 mb-2'>
                          Nenhuma viagem ainda
                        </h3>
                        <p className='text-gray-600 mb-4'>
                          Crie seu primeiro álbum de viagem
                        </p>
                        <button
                          onClick={() => navigate('/upload')}
                          className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all'
                        >
                          <Plus className='h-4 w-4 mr-2' />
                          Adicionar Primeira Viagem
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ⭐ CARD DE ESTATÍSTICAS GLOBAIS */}
              <div className='bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6'>
                <div className='flex items-center space-x-3 mb-4'>
                  <Info className='h-6 w-6' />
                  <h3 className='text-lg font-semibold'>Resumo das Viagens</h3>
                </div>

                <div className='space-y-3'>
                  <div className='flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg'>
                    <span>Total de viagens</span>
                    <span className='font-bold text-lg'>
                      {stats.totalTravels}
                    </span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg'>
                    <span>Fotos no total</span>
                    <span className='font-bold text-lg'>
                      {stats.totalPhotos}
                    </span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg'>
                    <span>Países visitados</span>
                    <span className='font-bold text-lg'>{stats.countries}</span>
                  </div>
                  <div className='flex justify-between items-center p-3 bg-white bg-opacity-10 rounded-lg'>
                    <span>Marcadores no mapa</span>
                    <span className='font-bold text-lg'>
                      {stats.markersOnMap}
                    </span>
                  </div>
                </div>

                {stats.markersOnMap < stats.totalTravels && (
                  <div className='mt-4 p-3 bg-orange-500 bg-opacity-20 rounded-lg text-sm'>
                    <AlertCircle className='h-4 w-4 inline mr-2' />
                    {stats.totalTravels - stats.markersOnMap} viagens sem
                    localização no mapa
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ⭐ MODAL DO ÁLBUM DE VIAGEM */}
      {showAlbum && selectedTravel && (
        <TravelAlbum
          travel={selectedTravel}
          onClose={() => {
            setShowAlbum(false);
            setSelectedTravel(null);
            setSelectedTravelId(null);
          }}
          onTravelDeleted={handleTravelDeleted}
        />
      )}

      <Footer />
    </div>
  );
};

export default TravelsPage;
