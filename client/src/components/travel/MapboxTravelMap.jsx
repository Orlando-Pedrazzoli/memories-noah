// client/src/components/travel/MapboxTravelMap.jsx - VERSÃO SIMPLIFICADA E CORRIGIDA

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import {
  MapPin,
  Image,
  Calendar,
  Navigation,
  AlertCircle,
  Globe,
  Compass,
} from 'lucide-react';

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

if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
  console.error('❌ Token Mapbox inválido ou ausente:', MAPBOX_TOKEN);
} else {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  console.log('✅ Token Mapbox configurado');
}

const MapboxTravelMap = ({
  markers = [],
  onMarkerClick,
  loading = false,
  selectedTravelId = null,
}) => {
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
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);

  const mapStyles = [
    { id: 'satellite-streets-v12', name: '🛰️ Satélite' },
    { id: 'outdoors-v12', name: '🏔️ Aventura' },
    { id: 'streets-v12', name: '🗺️ Clássico' },
    { id: 'dark-v11', name: '🌙 Escuro' },
    { id: 'light-v11', name: '☀️ Claro' },
  ];

  // ⭐ FUNÇÃO PARA VALIDAR COORDENADAS
  const isValidCoordinate = coord => {
    return (
      coord &&
      Array.isArray(coord) &&
      coord.length === 2 &&
      typeof coord[0] === 'number' &&
      typeof coord[1] === 'number' &&
      !isNaN(coord[0]) &&
      !isNaN(coord[1]) &&
      coord[0] >= -90 &&
      coord[0] <= 90 &&
      coord[1] >= -180 &&
      coord[1] <= 180
    );
  };

  // ⭐ INICIALIZAÇÃO DO MAPA
  useEffect(() => {
    if (map.current) return;

    console.log('🗺️ Inicializando mapa 3D interativo...');

    if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
      setMapError(
        'Token Mapbox não configurado. Configure VITE_MAPBOX_TOKEN nas variáveis de ambiente.'
      );
      return;
    }

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [0, 20],
        zoom: 2,
        pitch: is3D ? 45 : 0,
        bearing: 0,
        antialias: true,
        projection: 'globe',
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      map.current.on('style.load', () => {
        console.log('✅ Mapa carregado com sucesso');
        setMapLoaded(true);
        setMapError(null);

        try {
          map.current.setFog({
            color: 'rgb(186, 210, 235)',
            'high-color': 'rgb(36, 92, 223)',
            'horizon-blend': 0.02,
            'space-color': 'rgb(11, 11, 25)',
            'star-intensity': 0.6,
          });
        } catch (fogError) {
          console.warn('⚠️ Erro ao configurar atmosfera:', fogError);
        }
      });

      map.current.on('error', e => {
        console.error('❌ Erro do Mapbox:', e);
        setMapError(`Erro do mapa: ${e.error?.message || 'Erro desconhecido'}`);
      });
    } catch (error) {
      console.error('❌ Erro ao inicializar mapa:', error);
      setMapError(`Falha na inicialização: ${error.message}`);
    }

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
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);

  // ⭐ ATUALIZAR PITCH (3D/2D)
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.easeTo({
        pitch: is3D ? 45 : 0,
        duration: 1000,
      });
    }
  }, [is3D, mapLoaded]);

  // ⭐⭐⭐ FUNÇÃO SIMPLIFICADA PARA CRIAR MARKER
  const createMarkerElement = (markerData, index) => {
    const el = document.createElement('div');

    // SOLUÇÃO SIMPLES: Usar um div com background-image SVG
    el.innerHTML = `
      <div style="
        width: 40px;
        height: 60px;
        position: relative;
      ">
        <!-- Pin SVG simples -->
        <svg width="40" height="60" viewBox="0 0 40 60" xmlns="http://www.w3.org/2000/svg">
          <!-- Sombra -->
          <ellipse cx="20" cy="58" rx="10" ry="3" fill="black" opacity="0.3"/>
          <!-- Pin -->
          <path d="M20 0 C8.95 0 0 8.95 0 20 C0 35 20 60 20 60 C20 60 40 35 40 20 C40 8.95 31.05 0 20 0 Z" 
                fill="#ef4444" 
                stroke="white" 
                stroke-width="2"/>
          <!-- Círculo interno -->
          <circle cx="20" cy="20" r="8" fill="white"/>
          <!-- Número -->
          <text x="20" y="25" text-anchor="middle" font-family="Arial, sans-serif" 
                font-size="12" font-weight="bold" fill="#ef4444">
            ${markerData.imageCount || ''}
          </text>
        </svg>
        
        <!-- Label -->
        <div style="
          position: absolute;
          top: 65px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 11px;
          white-space: nowrap;
          pointer-events: none;
        ">
          ${markerData.name}
        </div>
      </div>
    `;

    // Click handler
    el.addEventListener('click', e => {
      e.stopPropagation();
      console.log('🎯 Marker clicado:', markerData.name);
      if (onMarkerClick) {
        onMarkerClick(markerData);
      }
    });

    // Hover effects
    el.style.cursor = 'pointer';
    el.addEventListener('mouseenter', () => {
      el.style.transform = 'scale(1.1)';
      setHoveredMarkerId(markerData.id || markerData.travelId);
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'scale(1)';
      setHoveredMarkerId(null);
    });

    return el;
  };

  // ⭐⭐⭐ ATUALIZAR MARKERS - VERSÃO CORRIGIDA
  useEffect(() => {
    if (!map.current || !mapLoaded || !markers) return;

    console.log('📍 Atualizando markers no mapa...');
    setMarkersLoaded(false);

    // Remover markers antigos
    Object.values(markersRefs.current).forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        console.warn('⚠️ Erro ao remover marker:', error);
      }
    });
    markersRefs.current = {};

    // Filtrar markers válidos
    const validMarkers = markers.filter(marker => {
      const valid = isValidCoordinate(marker.coordinates);
      if (!valid && marker.name) {
        console.warn(
          '⚠️ Marker sem coordenadas válidas:',
          marker.name,
          marker.coordinates
        );
      }
      return valid;
    });

    if (validMarkers.length === 0) {
      console.warn('⚠️ Nenhum marker válido para exibir');
      setMarkersLoaded(true);
      return;
    }

    console.log('✅ Markers válidos para exibir:', validMarkers.length);

    // ⭐⭐⭐ ADICIONAR NOVOS MARKERS COM POSICIONAMENTO CORRETO
    validMarkers.forEach((markerData, index) => {
      try {
        // IMPORTANTE: Converter coordenadas [lat, lng] para [lng, lat] para Mapbox
        const lngLat = [markerData.coordinates[1], markerData.coordinates[0]];

        console.log(`📍 Adicionando marker ${markerData.name} em:`, lngLat);

        // Criar elemento do marker
        const el = createMarkerElement(markerData, index);

        // ⭐⭐⭐ SOLUÇÃO DEFINITIVA: anchor bottom com offset correto
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom', // Pin aponta para baixo
          offset: [0, -10], // Ajuste fino para compensar a sombra
        })
          .setLngLat(lngLat)
          .addTo(map.current);

        // Adicionar popup simples
        const popup = new mapboxgl.Popup({
          offset: [0, -50],
          closeButton: true,
          closeOnClick: false,
        }).setHTML(`
          <div style="padding: 10px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold;">
              ${markerData.name}
            </h3>
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #666;">
              📍 ${markerData.location || 'Local desconhecido'}
            </p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
              📸 ${markerData.imageCount} ${
          markerData.imageCount === 1 ? 'foto' : 'fotos'
        }
            </p>
            ${
              markerData.date
                ? `
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
                📅 ${new Date(markerData.date).toLocaleDateString('pt-BR')}
              </p>
            `
                : ''
            }
            <button 
              onclick="window.openTravelAlbum && window.openTravelAlbum('${
                markerData.id || markerData.travelId
              }')"
              style="
                width: 100%;
                padding: 8px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
              ">
              Ver Álbum
            </button>
          </div>
        `);

        // Registrar handler global para o botão do popup
        window.openTravelAlbum = travelId => {
          const travel = markers.find(m => (m.id || m.travelId) === travelId);
          if (travel && onMarkerClick) {
            onMarkerClick(travel);
          }
        };

        marker.setPopup(popup);
        markersRefs.current[markerData.id || markerData.travelId] = marker;
      } catch (markerError) {
        console.error('❌ Erro ao criar marker:', markerError, markerData);
      }
    });

    // ⭐ AJUSTAR VISTA PARA MOSTRAR TODOS OS MARKERS
    if (validMarkers.length > 0) {
      setTimeout(() => {
        try {
          if (validMarkers.length === 1) {
            const marker = validMarkers[0];
            const lngLat = [marker.coordinates[1], marker.coordinates[0]];
            map.current.flyTo({
              center: lngLat,
              zoom: 6,
              pitch: 45,
              duration: 2000,
            });
          } else {
            const bounds = new mapboxgl.LngLatBounds();
            validMarkers.forEach(marker => {
              bounds.extend([marker.coordinates[1], marker.coordinates[0]]);
            });
            map.current.fitBounds(bounds, {
              padding: { top: 100, bottom: 100, left: 100, right: 100 },
              maxZoom: 8,
              duration: 2000,
            });
          }
        } catch (boundsError) {
          console.error('❌ Erro ao ajustar vista:', boundsError);
        }
      }, 1500);
    }

    setMarkersLoaded(true);
  }, [markers, onMarkerClick, mapLoaded]);

  // ⭐ DESTACAR MARKER SELECIONADO
  useEffect(() => {
    if (!selectedTravelId || !markersRefs.current[selectedTravelId]) return;

    const markerData = markers.find(
      m => (m.id || m.travelId) === selectedTravelId
    );

    if (markerData && markerData.coordinates) {
      map.current.flyTo({
        center: [markerData.coordinates[1], markerData.coordinates[0]],
        zoom: 10,
        pitch: 60,
        bearing: 30,
        duration: 2000,
      });
    }
  }, [selectedTravelId, markers]);

  // ⭐ RENDER
  if (mapError) {
    return (
      <div className='relative w-full h-full bg-gray-100 flex items-center justify-center'>
        <div className='text-center p-8'>
          <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
          <h3 className='text-lg font-semibold text-gray-900 mb-2'>
            Erro no Mapa
          </h3>
          <p className='text-sm text-gray-600 mb-4'>{mapError}</p>
          <div className='text-xs text-gray-500'>
            <p>Configure VITE_MAPBOX_TOKEN no arquivo .env</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='relative w-full h-full'>
      {/* CONTROLES */}
      <div className='absolute top-4 left-4 z-10 space-y-2'>
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
          <Compass
            className={`h-4 w-4 transition-transform ${
              is3D ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* CONTADOR */}
      {markers.length > 0 && (
        <div className='absolute top-4 right-4 z-10'>
          <div className='bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-3'>
            <MapPin className='h-4 w-4 text-red-600' />
            <span className='text-sm font-medium'>
              {markers.filter(m => isValidCoordinate(m.coordinates)).length}{' '}
              lugares no mapa
            </span>
            {hoveredMarkerId && (
              <span className='text-xs text-gray-500'>
                •{' '}
                {
                  markers.find(m => (m.id || m.travelId) === hoveredMarkerId)
                    ?.name
                }
              </span>
            )}
          </div>
        </div>
      )}

      {/* LOADING */}
      {(loading || !mapLoaded) && (
        <div className='absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20'>
          <div className='text-center'>
            <Globe className='h-12 w-12 text-blue-600 animate-pulse mx-auto mb-3' />
            <p className='text-sm font-medium text-gray-700'>
              {loading ? 'Carregando viagens...' : 'Inicializando mapa 3D...'}
            </p>
            <p className='text-xs text-gray-500 mt-2'>Powered by Mapbox</p>
          </div>
        </div>
      )}

      {/* MAPA */}
      <div
        ref={mapContainer}
        className='w-full h-full rounded-lg overflow-hidden'
      />
    </div>
  );
};

export default MapboxTravelMap;
