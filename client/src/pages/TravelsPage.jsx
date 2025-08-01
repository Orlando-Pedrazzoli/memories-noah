import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { travelService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import TravelAlbum from '../components/travel/TravelAlbum';
import { MapPin, ImageIcon, Calendar, Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// ⭐ FIX CRÍTICO: Corrigir ícones dos markers do Leaflet
import L from 'leaflet';

// Remover referência padrão quebrada
delete L.Icon.Default.prototype._getIconUrl;

// Configurar ícones corretos
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ⭐ CRIAR DIFERENTES ÍCONES PARA DIFERENTES PAÍSES
const createCustomIcon = (color = 'red') => {
  const colors = {
    red: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    blue: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    green:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    orange:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  };

  return new L.Icon({
    iconUrl: colors[color] || colors.red,
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

// ⭐ FUNÇÃO PARA ESCOLHER COR DO MARKER BASEADO NO PAÍS
const getMarkerColor = location => {
  if (!location) return 'red';

  const locationLower = location.toLowerCase();
  if (locationLower.includes('brasil') || locationLower.includes('brazil'))
    return 'green';
  if (locationLower.includes('portugal')) return 'red';
  if (locationLower.includes('frança') || locationLower.includes('france'))
    return 'blue';
  if (locationLower.includes('espanha') || locationLower.includes('spain'))
    return 'orange';

  return 'red'; // default
};

const TravelsPage = () => {
  const [travels, setTravels] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlbum, setShowAlbum] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');

  useEffect(() => {
    loadTravelsData();
  }, []);

  const loadTravelsData = async () => {
    try {
      setLoading(true);
      setDebugInfo('🗺️ Carregando dados...');

      console.log('🗺️ Loading travels data...');

      // Load travels and markers in parallel
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(),
        travelService.getTravelMarkers(),
      ]);

      if (travelsResponse.success) {
        console.log('✅ Travels loaded:', travelsResponse.travels.length);
        console.log('📋 Travels data:', travelsResponse.travels);
        setTravels(travelsResponse.travels);
      }

      if (markersResponse.success) {
        console.log('✅ Markers loaded:', markersResponse.markers.length);
        console.log('📍 Markers data:', markersResponse.markers);
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
      }
    } catch (error) {
      console.error('❌ Error loading travels data:', error);
      setDebugInfo('❌ Erro ao carregar dados');
      toast.error('Erro ao carregar viagens');
    } finally {
      setLoading(false);
    }
  };

  // ⭐ FUNÇÃO PARA RECARREGAR DADOS
  const handleRefresh = () => {
    toast.promise(loadTravelsData(), {
      loading: 'Recarregando...',
      success: 'Dados atualizados!',
      error: 'Erro ao recarregar',
    });
  };

  // ⭐ HANDLER PARA EXCLUSÃO DE ÁLBUM
  const handleTravelDeleted = deletedTravelId => {
    console.log('🗑️ Álbum deletado:', deletedTravelId);

    // Remover da lista de travels
    setTravels(prevTravels =>
      prevTravels.filter(travel => travel.id !== deletedTravelId)
    );

    // Remover da lista de markers
    setMarkers(prevMarkers =>
      prevMarkers.filter(marker => marker.travelId !== deletedTravelId)
    );

    // Atualizar debug info
    setDebugInfo('✅ Álbum excluído e listas atualizadas');

    toast.success('Página atualizada após exclusão do álbum');
  };

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

  // ⭐ FILTRAR MARKERS VÁLIDOS
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
              <MapPin className='h-6 w-6 text-primary-600' />
              <h1 className='text-3xl font-bold text-gray-900'>
                Nossas Viagens
              </h1>
            </div>

            {/* ⭐ BOTÃO DE REFRESH */}
            <button
              onClick={handleRefresh}
              className='flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
              <span className='text-sm'>Atualizar</span>
            </button>
          </div>

          <p className='text-gray-600 mt-2'>
            Explore os lugares que visitamos e reviva os momentos especiais de
            cada viagem
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
            {/* Map Section */}
            <div className='lg:col-span-2'>
              <div className='bg-white rounded-lg shadow-md overflow-hidden'>
                <div className='p-4 border-b border-gray-200'>
                  <h2 className='text-lg font-semibold text-gray-900'>
                    Mapa Mundial
                  </h2>
                  <p className='text-sm text-gray-600'>
                    Clique nos marcadores para ver o álbum da viagem •
                    {validMarkers.length} de {markers.length} viagem(ns) no mapa
                    • 🟢 Brasil 🔴 Portugal 🔵 França 🟠 Espanha
                  </p>
                </div>

                <div className='h-96 lg:h-[500px]'>
                  <MapContainer
                    center={[-15.7801, -47.9292]} // ⭐ CENTRALIZAR NO BRASIL
                    zoom={3} // ⭐ ZOOM MAIS PRÓXIMO
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={true} // ⭐ HABILITAR SCROLL ZOOM
                    zoomControl={true}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />

                    {/* ⭐ RENDERIZAR MARKERS VÁLIDOS */}
                    {validMarkers.map(marker => {
                      console.log(
                        '🔍 Rendering marker:',
                        marker.name,
                        marker.coordinates
                      );

                      return (
                        <Marker
                          key={marker.id}
                          position={marker.coordinates}
                          icon={createCustomIcon(
                            getMarkerColor(marker.location)
                          )}
                          eventHandlers={{
                            click: () => handleMarkerClick(marker),
                          }}
                        >
                          <Popup maxWidth={250}>
                            <div className='text-center'>
                              <h3 className='font-semibold text-gray-900 mb-2 text-base'>
                                {marker.name}
                              </h3>
                              <p className='text-sm text-gray-600 mb-2'>
                                📍 {marker.location}
                              </p>
                              <p className='text-sm text-gray-600 mb-2'>
                                📅{' '}
                                {new Date(marker.date).toLocaleDateString(
                                  'pt-BR'
                                )}
                              </p>
                              <p className='text-xs text-gray-500 mb-3'>
                                📸 {marker.imageCount} foto
                                {marker.imageCount !== 1 ? 's' : ''}
                              </p>
                              <button
                                className='w-full bg-primary-600 text-white px-3 py-2 rounded-md text-sm hover:bg-primary-700 transition-colors'
                                onClick={() => handleMarkerClick(marker)}
                              >
                                Ver Álbum 🖼️
                              </button>
                            </div>
                          </Popup>
                        </Marker>
                      );
                    })}
                  </MapContainer>
                </div>

                {/* ⭐ INFO DE DEBUG MELHORADA */}
                <div className='p-4 bg-gray-50 border-t border-gray-200'>
                  <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                    <div>
                      <span className='font-medium text-gray-900'>Total:</span>
                      <span className='ml-1 text-gray-600'>
                        {markers.length}
                      </span>
                    </div>
                    <div>
                      <span className='font-medium text-gray-900'>
                        No mapa:
                      </span>
                      <span className='ml-1 text-green-600'>
                        {validMarkers.length}
                      </span>
                    </div>
                    <div>
                      <span className='font-medium text-gray-900'>
                        Sem coordenadas:
                      </span>
                      <span className='ml-1 text-orange-600'>
                        {markers.length - validMarkers.length}
                      </span>
                    </div>
                    <div>
                      <span className='font-medium text-gray-900'>Países:</span>
                      <span className='ml-1 text-blue-600'>
                        {
                          new Set(
                            validMarkers
                              .map(m => m.location?.split(',').pop()?.trim())
                              .filter(Boolean)
                          ).size
                        }
                      </span>
                    </div>
                  </div>

                  {/* ⭐ LISTA DE MARKERS PARA DEBUG */}
                  {process.env.NODE_ENV === 'development' && (
                    <details className='mt-3'>
                      <summary className='text-xs text-gray-500 cursor-pointer hover:text-gray-700'>
                        🔍 Debug: Ver todos os markers
                      </summary>
                      <div className='mt-2 text-xs text-gray-600 bg-white p-2 rounded border max-h-32 overflow-y-auto'>
                        {markers.map(marker => (
                          <div key={marker.id} className='mb-1'>
                            <span
                              className={
                                marker.coordinates
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }
                            >
                              {marker.coordinates ? '✅' : '❌'}
                            </span>
                            <span className='ml-1'>{marker.name}</span>
                            {marker.coordinates && (
                              <span className='text-gray-400 ml-1'>
                                [{marker.coordinates[0]},{' '}
                                {marker.coordinates[1]}]
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
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

                        {/* ⭐ MOSTRAR STATUS DE COORDENADAS */}
                        <div className='flex items-center space-x-2 text-xs'>
                          {travel.coordinates ? (
                            <span className='text-green-600 flex items-center'>
                              <MapPin className='h-3 w-3 mr-1' />
                              No mapa
                            </span>
                          ) : (
                            <span className='text-gray-400 flex items-center'>
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
                    <MapPin className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      Nenhuma viagem ainda
                    </h3>
                    <p className='text-gray-600 mb-4'>
                      Adicione o primeiro álbum de viagem
                    </p>
                    <button className='btn-primary text-sm'>
                      Adicionar Viagem
                    </button>
                  </div>
                )}
              </div>

              {/* Statistics */}
              <div className='bg-white rounded-lg shadow-md p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>
                  Estatísticas
                </h3>

                <div className='space-y-3'>
                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Total de viagens:</span>
                    <span className='font-semibold text-gray-900'>
                      {travels.length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Total de fotos:</span>
                    <span className='font-semibold text-gray-900'>
                      {travels.reduce(
                        (acc, travel) => acc + travel.imageCount,
                        0
                      )}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>No mapa:</span>
                    <span className='font-semibold text-green-600'>
                      {validMarkers.length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Países visitados:</span>
                    <span className='font-semibold text-gray-900'>
                      {new Set(
                        validMarkers
                          .filter(m => m.location)
                          .map(m => m.location.split(',').pop()?.trim())
                      ).size || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ⭐ TRAVEL ALBUM MODAL COM PROP DE EXCLUSÃO */}
      {showAlbum && selectedTravel && (
        <TravelAlbum
          travel={selectedTravel}
          onClose={() => {
            setShowAlbum(false);
            setSelectedTravel(null);
          }}
          onTravelDeleted={handleTravelDeleted} // ⭐ PROP PARA EXCLUSÃO
        />
      )}

      <Footer />
    </div>
  );
};

export default TravelsPage;
