// client/src/components/travel/MapboxTravelMap.jsx - VERSÃO OTIMIZADA PARA MOBILE

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
  Smartphone,
  Monitor,
} from 'lucide-react';

// ⭐ CONFIGURAÇÃO DE TOKEN
const getMapboxToken = () => {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  return token;
};

const MAPBOX_TOKEN = getMapboxToken();

if (!MAPBOX_TOKEN || !MAPBOX_TOKEN.startsWith('pk.')) {
  console.error('❌ Token Mapbox inválido ou ausente:', MAPBOX_TOKEN);
} else {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

// ⭐ DETECÇÃO DE DISPOSITIVO MÓVEL
const isMobileDevice = () => {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 768
  );
};

// ⭐ CRIAR MARKER SIMPLES PARA MOBILE
const createMobileMarker = markerData => {
  const el = document.createElement('div');
  el.className = 'mapbox-marker-mobile';

  // Usar design mais simples para mobile
  el.innerHTML = `
    <div style="
      width: 40px; 
      height: 40px; 
      position: relative;
      cursor: pointer;
      transform: translate(-20px, -40px);
    ">
      <!-- Pin simples SVG -->
      <svg width="40" height="40" viewBox="0 0 40 40" style="
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
      ">
        <!-- Base do pin -->
        <path d="M20 0 C9 0 0 9 0 20 C0 35 20 40 20 40 S40 35 40 20 C40 9 31 0 20 0 Z" 
              fill="#ef4444" 
              stroke="white" 
              stroke-width="2"/>
        <!-- Círculo interno -->
        <circle cx="20" cy="18" r="8" fill="white"/>
        <!-- Número de fotos -->
        <text x="20" y="23" text-anchor="middle" 
              font-family="Arial" font-size="12" font-weight="bold" fill="#ef4444">
          ${markerData.imageCount || ''}
        </text>
      </svg>
      
      <!-- Label simples (sempre visível no mobile) -->
      <div style="
        position: absolute;
        top: 42px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.75);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 10px;
        white-space: nowrap;
        max-width: 100px;
        overflow: hidden;
        text-overflow: ellipsis;
        pointer-events: none;
      ">
        ${markerData.name}
      </div>
    </div>
  `;

  return el;
};

// ⭐ CRIAR MARKER DESKTOP (mantém o design original)
const createDesktopMarker = markerData => {
  const el = document.createElement('div');

  el.innerHTML = `
    <div style="
      width: 50px; 
      height: 70px; 
      position: relative;
      cursor: pointer;
      transform: translate(-25px, -70px);
    ">
      <!-- Pin -->
      <div style="
        position: absolute;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #ef4444, #dc2626);
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 8px 20px rgba(0,0,0,0.5);
        border: 3px solid white;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-weight: bold;
          font-size: 18px;
        ">
          ${markerData.imageCount || '📍'}
        </span>
      </div>
      
      <!-- Label hover -->
      <div class="marker-label-desktop" style="
        position: absolute;
        top: 75px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.85);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        transition: opacity 0.3s;
        pointer-events: none;
      ">
        ${markerData.name}
      </div>
    </div>
  `;

  // Adicionar hover effects apenas para desktop
  el.addEventListener('mouseenter', () => {
    const label = el.querySelector('.marker-label-desktop');
    if (label) label.style.opacity = '1';
  });

  el.addEventListener('mouseleave', () => {
    const label = el.querySelector('.marker-label-desktop');
    if (label) label.style.opacity = '0';
  });

  return el;
};

const MapboxTravelMap = ({
  markers = [],
  onMarkerClick,
  loading = false,
  selectedTravelId = null,
}) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRefs = useRef({});
  const popupsRefs = useRef({});
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/satellite-streets-v12'
  );
  const [is3D, setIs3D] = useState(false); // Desabilitar 3D por padrão no mobile
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(null);
  const [deviceType, setDeviceType] = useState('desktop');

  const mapStyles = [
    { id: 'satellite-streets-v12', name: '🛰️ Satélite' },
    { id: 'outdoors-v12', name: '🏔️ Aventura' },
    { id: 'streets-v12', name: '🗺️ Clássico' },
    { id: 'dark-v11', name: '🌙 Escuro' },
    { id: 'light-v11', name: '☀️ Claro' },
  ];

  // ⭐ DETECTAR TIPO DE DISPOSITIVO
  useEffect(() => {
    const checkDevice = () => {
      const isMobile = isMobileDevice();
      setDeviceType(isMobile ? 'mobile' : 'desktop');

      // Desabilitar 3D automaticamente no mobile
      if (isMobile) {
        setIs3D(false);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);

    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // ⭐ VALIDAR COORDENADAS
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

    console.log(`🗺️ Inicializando mapa para ${deviceType}...`);

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
        zoom: deviceType === 'mobile' ? 1 : 2,
        pitch: 0, // Iniciar plano
        bearing: 0,
        antialias: true,
        projection: deviceType === 'mobile' ? 'mercator' : 'globe', // Mercator é mais leve para mobile
        touchZoomRotate: deviceType === 'mobile', // Habilitar gestos touch no mobile
        dragRotate: deviceType !== 'mobile', // Desabilitar rotação com drag no mobile
      });

      // Adicionar controles
      map.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: deviceType !== 'mobile',
          showZoom: true,
        }),
        'top-right'
      );

      if (deviceType !== 'mobile') {
        map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      }

      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      // ⭐ ADICIONAR CONTROLE DE LOCALIZAÇÃO NO MOBILE
      if (deviceType === 'mobile') {
        map.current.addControl(
          new mapboxgl.GeolocateControl({
            positionOptions: {
              enableHighAccuracy: true,
            },
            trackUserLocation: false,
            showUserHeading: false,
          }),
          'top-right'
        );
      }

      map.current.on('style.load', () => {
        console.log('✅ Mapa carregado com sucesso');
        setMapLoaded(true);
        setMapError(null);

        // Configurar atmosfera apenas para desktop
        if (deviceType !== 'mobile') {
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
  }, [deviceType]);

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
        pitch: is3D && deviceType !== 'mobile' ? 45 : 0,
        duration: 1000,
      });
    }
  }, [is3D, mapLoaded, deviceType]);

  // ⭐ ADICIONAR MARKERS
  useEffect(() => {
    if (!map.current || !mapLoaded || !markers) return;

    console.log(`📍 Atualizando markers no mapa (${deviceType})...`);

    // Remover markers antigos
    Object.values(markersRefs.current).forEach(marker => {
      try {
        marker.remove();
      } catch (error) {
        console.warn('⚠️ Erro ao remover marker:', error);
      }
    });

    // Remover popups antigos
    Object.values(popupsRefs.current).forEach(popup => {
      try {
        popup.remove();
      } catch (error) {
        console.warn('⚠️ Erro ao remover popup:', error);
      }
    });

    markersRefs.current = {};
    popupsRefs.current = {};

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
      return;
    }

    console.log('✅ Markers válidos para exibir:', validMarkers.length);

    // Adicionar novos markers
    validMarkers.forEach((markerData, index) => {
      try {
        // Converter coordenadas [lat, lng] para [lng, lat] para Mapbox
        const lngLat = [markerData.coordinates[1], markerData.coordinates[0]];

        // Criar elemento do marker baseado no dispositivo
        const el =
          deviceType === 'mobile'
            ? createMobileMarker(markerData)
            : createDesktopMarker(markerData);

        // ⭐ ADICIONAR EVENTO DE CLIQUE
        el.addEventListener('click', e => {
          e.stopPropagation();
          console.log(`🎯 Marker clicado (${deviceType}):`, markerData.name);

          if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        });

        // ⭐ ADICIONAR EVENTOS TOUCH PARA MOBILE
        if (deviceType === 'mobile') {
          let touchStartTime;

          el.addEventListener(
            'touchstart',
            e => {
              touchStartTime = Date.now();
              e.stopPropagation();
            },
            { passive: true }
          );

          el.addEventListener(
            'touchend',
            e => {
              const touchDuration = Date.now() - touchStartTime;

              // Se foi um toque rápido (não um drag)
              if (touchDuration < 300) {
                e.stopPropagation();
                e.preventDefault();

                // Mostrar popup no mobile
                if (popupsRefs.current[markerData.id]) {
                  const popup = popupsRefs.current[markerData.id];
                  const isOpen = popup.isOpen();

                  // Fechar todos os outros popups
                  Object.values(popupsRefs.current).forEach(p => {
                    if (p !== popup) p.remove();
                  });

                  // Toggle do popup atual
                  if (!isOpen) {
                    popup.addTo(map.current);
                  }
                }
              }
            },
            { passive: false }
          );
        }

        // Criar marker
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'bottom',
          offset: [0, 0],
        })
          .setLngLat(lngLat)
          .addTo(map.current);

        // ⭐ CRIAR POPUP OTIMIZADO PARA MOBILE
        const popupContent =
          deviceType === 'mobile'
            ? `
            <div style="padding: 10px; min-width: 200px;">
              <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">
                ${markerData.name}
              </h3>
              <p style="margin: 0 0 4px 0; font-size: 12px; color: #666;">
                📍 ${markerData.location?.split(',')[0] || 'Local'}
              </p>
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">
                📸 ${markerData.imageCount} fotos
              </p>
              <button 
                onclick="window.openTravelAlbumMobile && window.openTravelAlbumMobile('${
                  markerData.id || markerData.travelId
                }')"
                style="
                  width: 100%;
                  padding: 10px;
                  background: #3b82f6;
                  color: white;
                  border: none;
                  border-radius: 6px;
                  font-size: 14px;
                  font-weight: bold;
                  -webkit-tap-highlight-color: transparent;
                ">
                Ver Álbum
              </button>
            </div>
          `
            : `
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
          `;

        const popup = new mapboxgl.Popup({
          offset: deviceType === 'mobile' ? [0, -40] : [0, -50],
          closeButton: true,
          closeOnClick: deviceType !== 'mobile',
          maxWidth: deviceType === 'mobile' ? '250px' : '300px',
        }).setHTML(popupContent);

        // Registrar handlers globais
        window.openTravelAlbum = window.openTravelAlbumMobile = travelId => {
          const travel = markers.find(m => (m.id || m.travelId) === travelId);
          if (travel && onMarkerClick) {
            onMarkerClick(travel);
          }
        };

        // No desktop, adicionar popup ao marker
        if (deviceType !== 'mobile') {
          marker.setPopup(popup);
        }

        markersRefs.current[markerData.id || markerData.travelId] = marker;
        popupsRefs.current[markerData.id || markerData.travelId] = popup;
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
              zoom: deviceType === 'mobile' ? 5 : 6,
              pitch: deviceType === 'mobile' ? 0 : is3D ? 45 : 0,
              duration: 2000,
            });
          } else {
            const bounds = new mapboxgl.LngLatBounds();
            validMarkers.forEach(marker => {
              bounds.extend([marker.coordinates[1], marker.coordinates[0]]);
            });

            map.current.fitBounds(bounds, {
              padding:
                deviceType === 'mobile'
                  ? { top: 50, bottom: 50, left: 20, right: 20 }
                  : { top: 100, bottom: 100, left: 100, right: 100 },
              maxZoom: deviceType === 'mobile' ? 6 : 8,
              duration: 2000,
            });
          }
        } catch (boundsError) {
          console.error('❌ Erro ao ajustar vista:', boundsError);
        }
      }, 1500);
    }
  }, [markers, onMarkerClick, mapLoaded, deviceType, is3D]);

  // ⭐ DESTACAR MARKER SELECIONADO
  useEffect(() => {
    if (!selectedTravelId || !markersRefs.current[selectedTravelId]) return;

    const markerData = markers.find(
      m => (m.id || m.travelId) === selectedTravelId
    );

    if (markerData && markerData.coordinates) {
      map.current.flyTo({
        center: [markerData.coordinates[1], markerData.coordinates[0]],
        zoom: deviceType === 'mobile' ? 8 : 10,
        pitch: deviceType === 'mobile' ? 0 : is3D ? 60 : 0,
        bearing: deviceType === 'mobile' ? 0 : 30,
        duration: 2000,
      });

      // Abrir popup do marker selecionado
      if (popupsRefs.current[selectedTravelId]) {
        popupsRefs.current[selectedTravelId].addTo(map.current);
      }
    }
  }, [selectedTravelId, markers, deviceType, is3D]);

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
        {/* Seletor de estilo */}
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

        {/* Toggle 3D (apenas desktop) */}
        {deviceType !== 'mobile' && (
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
        )}
      </div>

      {/* INDICADOR DE DISPOSITIVO E CONTADOR */}
      <div className='absolute top-4 right-4 z-10 space-y-2'>
        {/* Indicador de dispositivo */}
        <div className='bg-white rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2'>
          {deviceType === 'mobile' ? (
            <>
              <Smartphone className='h-4 w-4 text-blue-600' />
              <span className='text-xs font-medium'>Mobile</span>
            </>
          ) : (
            <>
              <Monitor className='h-4 w-4 text-gray-600' />
              <span className='text-xs font-medium'>Desktop</span>
            </>
          )}
        </div>

        {/* Contador de lugares */}
        {markers.length > 0 && (
          <div className='bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-3'>
            <MapPin className='h-4 w-4 text-red-600' />
            <span className='text-sm font-medium'>
              {markers.filter(m => isValidCoordinate(m.coordinates)).length}{' '}
              lugares
            </span>
          </div>
        )}
      </div>

      {/* LOADING */}
      {(loading || !mapLoaded) && (
        <div className='absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-20'>
          <div className='text-center'>
            <Globe className='h-12 w-12 text-blue-600 animate-pulse mx-auto mb-3' />
            <p className='text-sm font-medium text-gray-700'>
              {loading ? 'Carregando viagens...' : 'Inicializando mapa...'}
            </p>
            {deviceType === 'mobile' && (
              <p className='text-xs text-gray-500 mt-2'>
                Otimizado para mobile
              </p>
            )}
          </div>
        </div>
      )}

      {/* MAPA */}
      <div
        ref={mapContainer}
        className='w-full h-full rounded-lg overflow-hidden'
      />

      {/* DICA MOBILE */}
      {deviceType === 'mobile' && markers.length > 0 && (
        <div className='absolute bottom-4 left-4 right-4 z-10'>
          <div className='bg-black bg-opacity-75 text-white text-xs px-3 py-2 rounded-lg text-center'>
            Toque nos marcadores para ver detalhes
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxTravelMap;
