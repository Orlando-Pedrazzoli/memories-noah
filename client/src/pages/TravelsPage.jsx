import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { travelService } from '../services/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import TravelAlbum from '../components/travel/TravelAlbum';
import { MapPin, ImageIcon, Calendar, Loader2 } from 'lucide-react';
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

// ⭐ OPCIONAL: Criar ícone customizado (mais bonito)
const createCustomIcon = () => {
  return new L.Icon({
    iconUrl:
      'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });
};

const TravelsPage = () => {
  const [travels, setTravels] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [selectedTravel, setSelectedTravel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAlbum, setShowAlbum] = useState(false);

  useEffect(() => {
    loadTravelsData();
  }, []);

  const loadTravelsData = async () => {
    try {
      setLoading(true);

      console.log('🗺️ Loading travels data...');

      // Load travels and markers in parallel
      const [travelsResponse, markersResponse] = await Promise.all([
        travelService.getAllTravels(),
        travelService.getTravelMarkers(),
      ]);

      if (travelsResponse.success) {
        console.log('✅ Travels loaded:', travelsResponse.travels.length);
        setTravels(travelsResponse.travels);
      }

      if (markersResponse.success) {
        console.log('✅ Markers loaded:', markersResponse.markers.length);
        console.log('📍 Marker data:', markersResponse.markers);
        setMarkers(markersResponse.markers);
      }
    } catch (error) {
      console.error('❌ Error loading travels data:', error);
      toast.error('Erro ao carregar viagens');
    } finally {
      setLoading(false);
    }
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

  return (
    <div className='min-h-screen bg-gray-50'>
      <Navbar />

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {/* Header */}
        <div className='mb-8'>
          <div className='flex items-center space-x-3 mb-4'>
            <MapPin className='h-6 w-6 text-primary-600' />
            <h1 className='text-3xl font-bold text-gray-900'>Nossas Viagens</h1>
          </div>
          <p className='text-gray-600'>
            Explore os lugares que visitamos e reviva os momentos especiais de
            cada viagem
          </p>
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
                    Clique nos marcadores para ver o álbum da viagem (
                    {markers.length}{' '}
                    {markers.length === 1 ? 'marcador' : 'marcadores'})
                  </p>
                </div>

                <div className='h-96 lg:h-[500px]'>
                  <MapContainer
                    center={[20, 0]}
                    zoom={2}
                    style={{ height: '100%', width: '100%' }}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
                    />

                    {/* ⭐ RENDERIZAR MARKERS COM COORDENADAS VÁLIDAS */}
                    {markers
                      .filter(
                        marker =>
                          marker.coordinates && marker.coordinates.length === 2
                      )
                      .map(marker => {
                        console.log(
                          '🔍 Rendering marker:',
                          marker.name,
                          marker.coordinates
                        );
                        return (
                          <Marker
                            key={marker.id}
                            position={marker.coordinates}
                            icon={createCustomIcon()} // Usar ícone customizado
                            eventHandlers={{
                              click: () => handleMarkerClick(marker),
                            }}
                          >
                            <Popup>
                              <div className='text-center min-w-[200px]'>
                                <h3 className='font-semibold text-gray-900 mb-2'>
                                  {marker.name}
                                </h3>
                                <p className='text-sm text-gray-600 mb-2'>
                                  📍 {marker.location}
                                </p>
                                <p className='text-sm text-gray-600 mb-3'>
                                  📅{' '}
                                  {new Date(marker.date).toLocaleDateString(
                                    'pt-BR'
                                  )}
                                </p>
                                <p className='text-xs text-gray-500 mb-3'>
                                  📸 {marker.imageCount} fotos
                                </p>
                                <button
                                  className='w-full bg-primary-600 text-white px-3 py-2 rounded-md text-sm hover:bg-primary-700 transition-colors'
                                  onClick={() => handleMarkerClick(marker)}
                                >
                                  Ver Álbum
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })}
                  </MapContainer>
                </div>

                {/* ⭐ ADICIONAR INFO DE DEBUG */}
                {markers.length === 0 && (
                  <div className='p-4 bg-yellow-50 border-t border-yellow-200'>
                    <p className='text-sm text-yellow-800'>
                      ℹ️ Nenhum marcador encontrado. Crie uma viagem primeiro!
                    </p>
                  </div>
                )}

                {markers.length > 0 &&
                  markers.filter(m => !m.coordinates).length > 0 && (
                    <div className='p-4 bg-blue-50 border-t border-blue-200'>
                      <p className='text-sm text-blue-800'>
                        ℹ️ {markers.filter(m => !m.coordinates).length}{' '}
                        viagem(ns) sem coordenadas não aparece(m) no mapa
                      </p>
                    </div>
                  )}
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
                            <span className='text-gray-500'>
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
                    <span className='font-semibold text-gray-900'>
                      {markers.filter(m => m.coordinates).length}
                    </span>
                  </div>

                  <div className='flex justify-between items-center'>
                    <span className='text-gray-600'>Países visitados:</span>
                    <span className='font-semibold text-gray-900'>
                      {new Set(
                        markers
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

      {/* Travel Album Modal */}
      {showAlbum && selectedTravel && (
        <TravelAlbum
          travel={selectedTravel}
          onClose={() => {
            setShowAlbum(false);
            setSelectedTravel(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
};

export default TravelsPage;
