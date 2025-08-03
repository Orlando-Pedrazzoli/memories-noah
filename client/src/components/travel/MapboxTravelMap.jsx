// client/src/components/travel/MapboxTravelMap.jsx - VERSÃO PARA PRODUÇÃO

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Image, Calendar, Navigation, AlertCircle } from 'lucide-react';

// ⭐ CONFIGURAÇÃO ROBUSTA DE TOKEN
const getMapboxToken = () => {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  console.log('🔍 Verificando token Mapbox:', {
    hasToken: !!token,
    tokenStart: token ? token.substring(0, 10) + '...' : 'undefined',
    environment: import.meta.env.MODE,
  });

  return token;
};

const MAPBOX_TOKEN = getMapboxToken();

// ⭐ VERIFICAR SE TOKEN É VÁLIDO
if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
  console.error('❌ Token Mapbox inválido ou ausente:', MAPBOX_TOKEN);
} else {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  console.log('✅ Token Mapbox configurado');
}

const MapboxTravelMap = ({ markers = [], onMarkerClick, loading = false }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRefs = useRef({});
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/satellite-streets-v12'
  );
  const [is3D, setIs3D] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [markersLoaded, setMarkersLoaded] = useState(false);

  // ⭐ ESTILOS DE MAPA DISPONÍVEIS
  const mapStyles = [
    {
      id: 'satellite-streets-v12',
      name: '🛰️ Satélite',
      description: 'Vista satélite com ruas',
    },
    {
      id: 'outdoors-v12',
      name: '🏔️ Aventura',
      description: 'Perfeito para viagens',
    },
    {
      id: 'streets-v12',
      name: '🗺️ Clássico',
      description: 'Estilo tradicional',
    },
    { id: 'dark-v11', name: '🌙 Escuro', description: 'Tema escuro elegante' },
    {
      id: 'light-v11',
      name: '☀️ Claro',
      description: 'Tema claro minimalista',
    },
  ];

  // ⭐ FUNÇÃO PARA VALIDAR COORDENADAS
  const isValidCoordinate = coord => {
    const isValid =
      coord &&
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) &&
      !isNaN(coord[1]) &&
      coord[0] >= -90 &&
      coord[0] <= 90 && // latitude
      coord[1] >= -180 &&
      coord[1] <= 180; // longitude

    if (!isValid) {
      console.warn('⚠️ Coordenada inválida:', coord);
    }

    return isValid;
  };

  // ⭐ DEBUG DETALHADO DE MARKERS
  const debugMarkers = markers => {
    console.log('\n🔍 === DEBUG DE MARKERS ===');
    console.log(`📊 Total de markers recebidos: ${markers.length}`);

    if (markers.length === 0) {
      console.warn('⚠️ Nenhum marker recebido');
      return;
    }

    markers.forEach((marker, index) => {
      console.log(`\n📍 Marker ${index + 1}:`, {
        id: marker.id || marker.travelId,
        name: marker.name,
        location: marker.location,
        coordinates: marker.coordinates,
        imageCount: marker.imageCount,
        valid: isValidCoordinate(marker.coordinates),
        lat: marker.coordinates?.[0],
        lng: marker.coordinates?.[1],
      });

      if (!isValidCoordinate(marker.coordinates)) {
        console.error(
          `❌ Marker ${marker.name} tem coordenadas inválidas:`,
          marker.coordinates
        );
      }
    });
  };

  // ⭐ INICIALIZAÇÃO DO MAPA COM TRATAMENTO DE ERRO
  useEffect(() => {
    if (map.current) return;

    console.log('\n🗺️ === INICIALIZANDO MAPA ===');
    console.log('Environment:', {
      mode: import.meta.env.MODE,
      dev: import.meta.env.DEV,
      prod: import.meta.env.PROD,
      apiUrl: import.meta.env.VITE_API_URL,
      hasMapboxToken: !!MAPBOX_TOKEN,
    });

    // ⭐ VERIFICAR TOKEN ANTES DE INICIALIZAR
    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
      const errorMsg =
        'Token Mapbox não configurado. Configure VITE_MAPBOX_TOKEN nas variáveis de ambiente.';
      console.error('❌', errorMsg);
      setMapError(errorMsg);
      return;
    }

    try {
      console.log('🚀 Criando instância do mapa...');

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [0, 20], // Centro mundial
        zoom: 2,
        pitch: is3D ? 45 : 0,
        bearing: 0,
        antialias: true,
        projection: 'globe',
      });

      // ⭐ TRATAMENTO DE ERROS DO MAPA
      map.current.on('error', e => {
        console.error('❌ Erro do Mapbox:', e);
        setMapError(`Erro do mapa: ${e.error?.message || 'Erro desconhecido'}`);
      });

      // ⭐ CONTROLES PADRÃO
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      // ⭐ QUANDO O ESTILO CARREGAR
      map.current.on('style.load', () => {
        console.log('🎨 Estilo do mapa carregado');
        setMapLoaded(true);
        setMapError(null);

        // Configurar atmosfera 3D
        try {
          map.current.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)',
            'star-intensity': 0.6,
          });
          console.log('✅ Atmosfera 3D configurada');
        } catch (fogError) {
          console.warn('⚠️ Erro ao configurar atmosfera:', fogError);
        }
      });

      // ⭐ EVENTOS DE INTERAÇÃO
      let userInteracting = false;

      map.current.on('mousedown', () => {
        userInteracting = true;
      });
      map.current.on('touchstart', () => {
        userInteracting = true;
      });
      map.current.on('mouseup', () => {
        userInteracting = false;
      });
      map.current.on('touchend', () => {
        userInteracting = false;
      });

      console.log('✅ Mapa inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro crítico ao inicializar mapa:', error);
      setMapError(`Falha na inicialização: ${error.message}`);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  // ⭐ ATUALIZAR ESTILO DO MAPA
  useEffect(() => {
    if (map.current && mapLoaded) {
      console.log('🎨 Mudando estilo do mapa para:', mapStyle);
      try {
        map.current.setStyle(mapStyle);
      } catch (error) {
        console.error('❌ Erro ao mudar estilo:', error);
      }
    }
  }, [mapStyle, mapLoaded]);

  // ⭐ ATUALIZAR PITCH (3D/2D)
  useEffect(() => {
    if (map.current && mapLoaded) {
      console.log('🔄 Mudando pitch para:', is3D ? '3D (45°)' : '2D (0°)');
      try {
        map.current.easeTo({
          pitch: is3D ? 45 : 0,
          duration: 1000,
        });
      } catch (error) {
        console.error('❌ Erro ao mudar pitch:', error);
      }
    }
  }, [is3D, mapLoaded]);

  // ⭐ ATUALIZAR MARKERS - VERSÃO ROBUSTA PARA PRODUÇÃO
  useEffect(() => {
    if (!map.current || !mapLoaded || !markers) {
      console.log('⏳ Aguardando mapa carregar ou markers...', {
        hasMap: !!map.current,
        mapLoaded,
        hasMarkers: !!markers,
        markersLength: markers?.length,
      });
      return;
    }

    console.log('\n📍 === PROCESSANDO MARKERS ===');
    setMarkersLoaded(false);
    debugMarkers(markers);

    // ⭐ REMOVER MARKERS ANTIGOS
    Object.values(markersRefs.current).forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        console.warn('⚠️ Erro ao remover marker:', error);
      }
    });
    markersRefs.current = {};

    // ⭐ FILTRAR APENAS MARKERS VÁLIDOS
    const validMarkers = markers.filter(marker => {
      const isValid = isValidCoordinate(marker.coordinates);
      if (!isValid && marker.coordinates) {
        console.warn('⚠️ Marker com coordenadas inválidas:', {
          name: marker.name,
          coordinates: marker.coordinates,
          type: typeof marker.coordinates,
          isArray: Array.isArray(marker.coordinates),
        });
      }
      return isValid;
    });

    console.log(`✅ ${validMarkers.length}/${markers.length} markers válidos`);

    if (validMarkers.length === 0) {
      console.warn('⚠️ Nenhum marker válido para exibir no mapa');
      setMarkersLoaded(true);
      return;
    }

    // ⭐ ADICIONAR MARKERS COM TRATAMENTO DE ERRO
    let addedMarkers = 0;

    validMarkers.forEach((markerData, index) => {
      try {
        console.log(`📍 Adicionando marker ${index + 1}: ${markerData.name}`);

        // ⭐ CONVERTER COORDENADAS: [lat, lng] -> [lng, lat]
        const lngLat = [markerData.coordinates[1], markerData.coordinates[0]];

        console.log(`🔄 Coordenadas:`, {
          original: markerData.coordinates,
          converted: lngLat,
          name: markerData.name,
        });

        // ⭐ VALIDAR CONVERSÃO
        if (!lngLat[0] || !lngLat[1] || isNaN(lngLat[0]) || isNaN(lngLat[1])) {
          console.error('❌ Coordenadas convertidas inválidas:', lngLat);
          return;
        }

        // ⭐ CRIAR ELEMENTO DO MARKER
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `
          <div class="marker-container" style="
            width: 60px; 
            height: 60px; 
            position: relative;
            cursor: pointer;
            transition: all 0.3s ease;
          ">
            <div class="marker-pulse" style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: rgba(239, 68, 68, 0.3);
              animation: pulse 2s infinite;
            "></div>
            <div class="marker-pin" style="
              position: absolute;
              top: 8px;
              left: 8px;
              width: 44px;
              height: 44px;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 16px;
              box-shadow: 0 6px 16px rgba(0,0,0,0.4);
              border: 4px solid white;
            ">
              ${markerData.imageCount || '📍'}
            </div>
          </div>
        `;

        // ⭐ ANIMAÇÃO DE ENTRADA
        setTimeout(() => {
          el.style.transform = 'scale(1.2)';
          setTimeout(() => {
            el.style.transform = 'scale(1)';
          }, 300);
        }, index * 200);

        // ⭐ EVENTOS DE HOVER
        el.addEventListener('mouseenter', () => {
          el.style.transform = 'scale(1.1)';
          el.style.zIndex = '1000';
        });

        el.addEventListener('mouseleave', () => {
          el.style.transform = 'scale(1)';
          el.style.zIndex = '1';
        });

        // ⭐ EVENTO DE CLICK
        el.addEventListener('click', e => {
          e.stopPropagation();

          console.log('🎯 Marker clicado:', markerData.name);

          // Voar para o marker
          try {
            map.current.flyTo({
              center: lngLat,
              zoom: 8,
              pitch: 60,
              bearing: 30,
              duration: 2000,
            });
          } catch (flyError) {
            console.error('❌ Erro ao voar para marker:', flyError);
          }

          // Callback
          if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        });

        // ⭐ CRIAR MARKER NO MAPA
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map.current);

        // ⭐ POPUP RICO
        const popup = new mapboxgl.Popup({
          offset: 30,
          closeButton: true,
          closeOnClick: false,
          className: 'custom-popup',
        }).setHTML(`
          <div style="padding: 20px; max-width: 300px; font-family: system-ui;">
            <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: bold; color: #1f2937;">
              ${markerData.name}
            </h3>
            
            <div style="display: flex; align-items: center; margin-bottom: 8px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 8px;">📍</span>
              ${markerData.location || 'Localização não especificada'}
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 8px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 8px;">📅</span>
              ${new Date(markerData.date).toLocaleDateString('pt-BR')}
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 8px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 8px;">📸</span>
              ${markerData.imageCount} ${
          markerData.imageCount === 1 ? 'foto' : 'fotos'
        }
            </div>

            <div style="display: flex; align-items: center; margin-bottom: 16px; color: #10b981; font-size: 12px;">
              <span style="margin-right: 8px;">🌍</span>
              ${markerData.coordinates[0].toFixed(
                4
              )}, ${markerData.coordinates[1].toFixed(4)}
            </div>
            
            <button onclick="if(window.currentMarkerClick) window.currentMarkerClick()" style="
              width: 100%;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: white;
              border: none;
              padding: 12px 20px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            ">
              Ver Álbum 🖼️
            </button>
          </div>
        `);

        // ⭐ CALLBACK GLOBAL
        window.currentMarkerClick = () => {
          if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        };

        marker.setPopup(popup);
        markersRefs.current[markerData.id || markerData.travelId] = marker;
        addedMarkers++;

        console.log(`✅ Marker ${markerData.name} adicionado com sucesso`);
      } catch (markerError) {
        console.error('❌ Erro ao criar marker:', markerError, markerData);
      }
    });

    console.log(`✅ ${addedMarkers} markers adicionados ao mapa`);

    // ⭐ AJUSTAR VISTA PARA MOSTRAR TODOS OS MARKERS
    if (addedMarkers > 0) {
      setTimeout(() => {
        try {
          if (validMarkers.length === 1) {
            // Um marker: voar diretamente
            const marker = validMarkers[0];
            const lngLat = [marker.coordinates[1], marker.coordinates[0]];

            console.log('🎯 Voando para marker único:', marker.name);

            map.current.flyTo({
              center: lngLat,
              zoom: 6,
              pitch: 45,
              duration: 3000,
            });
          } else {
            // Múltiplos markers: ajustar bounds
            const bounds = new mapboxgl.LngLatBounds();
            validMarkers.forEach(marker => {
              bounds.extend([marker.coordinates[1], marker.coordinates[0]]);
            });

            console.log('🗺️ Ajustando bounds para todos os markers');

            map.current.fitBounds(bounds, {
              padding: 80,
              maxZoom: 8,
              duration: 3000,
            });
          }
        } catch (boundsError) {
          console.error('❌ Erro ao ajustar vista:', boundsError);
        }
      }, 2000);
    }

    setMarkersLoaded(true);
  }, [markers, onMarkerClick, mapLoaded]);

  // ⭐ RENDER COM TRATAMENTO DE ERRO
  if (mapError) {
    return (
      <div className='relative w-full h-full bg-gray-100 flex items-center justify-center'>
        <div className='text-center p-8'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Erro no Mapa
          </h3>
          <p className='text-sm text-gray-600 mb-4'>{mapError}</p>
          <div className='text-xs text-gray-500 space-y-1'>
            <p>Verifique se o token Mapbox está configurado</p>
            <p>Environment: {import.meta.env.MODE}</p>
            <p>Token: {MAPBOX_TOKEN ? 'Configurado' : 'Ausente'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative w-full h-full'>
      {/* ⭐ CONTROLES PERSONALIZADOS */}
      <div className='absolute top-4 left-4 z-10 space-y-2'>
        {/* Seletor de Estilo */}
        <div className='bg-white rounded-lg shadow-lg p-2'>
          <select
            value={mapStyle.split('/').pop()}
            onChange={e =>
              setMapStyle(`mapbox://styles/mapbox/${e.target.value}`)
            }
            className='text-sm border-none outline-none bg-transparent cursor-pointer'
            disabled={!mapLoaded}
          >
            {mapStyles.map(style => (
              <option key={style.id} value={style.id}>
                {style.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle 3D */}
        <button
          onClick={() => setIs3D(!is3D)}
          disabled={!mapLoaded}
          className={`w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all ${
            is3D
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          } ${!mapLoaded ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={is3D ? 'Desativar 3D' : 'Ativar 3D'}
        >
          <Navigation
            className={`h-4 w-4 transition-transform ${
              is3D ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* ⭐ CONTADOR DE MARKERS MELHORADO */}
      {markers.length > 0 && (
        <div className='absolute top-4 right-4 z-10'>
          <div className='bg-white rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2'>
            <MapPin className='h-4 w-4 text-red-600' />
            <span className='text-sm font-medium'>
              {markers.filter(m => isValidCoordinate(m.coordinates)).length} de{' '}
              {markers.length} no mapa
            </span>
            {!markersLoaded && (
              <div className='animate-spin rounded-full h-3 w-3 border-b-2 border-red-600'></div>
            )}
          </div>
        </div>
      )}

      {/* ⭐ LOADING OVERLAY MELHORADO */}
      {(loading || !mapLoaded) && (
        <div className='absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2'></div>
            <p className='text-sm text-gray-600'>
              {loading ? 'Carregando dados...' : 'Inicializando mapa 3D...'}
            </p>
            <p className='text-xs text-gray-500 mt-1'>
              {import.meta.env.MODE} | Token: {MAPBOX_TOKEN ? '✓' : '✗'}
            </p>
          </div>
        </div>
      )}

      {/* ⭐ CONTAINER DO MAPA */}
      <div
        ref={mapContainer}
        className='w-full h-full rounded-lg overflow-hidden'
      />

      {/* ⭐ CSS PARA ANIMAÇÕES */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.6;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .custom-popup .mapboxgl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          border: none !important;
        }

        .custom-popup .mapboxgl-popup-tip {
          border-top-color: white !important;
        }
      `}</style>
    </div>
  );
};

export default MapboxTravelMap;
