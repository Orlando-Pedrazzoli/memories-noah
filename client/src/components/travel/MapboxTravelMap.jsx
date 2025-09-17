// client/src/components/travel/MapboxTravelMap.jsx - VERSÃO COMPLETA MELHORADA

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

// ⭐ VERIFICAR SE TOKEN É VÁLIDO
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

      // ⭐ CONTROLES
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      // ⭐ QUANDO O MAPA CARREGAR
      map.current.on('style.load', () => {
        console.log('✅ Mapa carregado com sucesso');
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
        } catch (fogError) {
          console.warn('⚠️ Erro ao configurar atmosfera:', fogError);
        }
      });

      // ⭐ TRATAMENTO DE ERROS
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

  // ⭐ FUNÇÃO PARA CRIAR MARKER ELEMENT COM TOOLTIP MELHORADO
  const createMarkerElement = (markerData, index) => {
    const el = document.createElement('div');
    el.className = 'custom-marker';
    el.style.position = 'relative';

    // ⭐ ÍCONE MAIOR E MAIS VISÍVEL
    el.innerHTML = `
      <div class="marker-container" style="
        width: 80px; 
        height: 80px; 
        position: relative;
        cursor: pointer;
        transition: all 0.3s ease;
        transform: translateX(-40px) translateY(-40px);
      ">
        <!-- Pulsação animada -->
        <div class="marker-pulse" style="
          position: absolute;
          top: 10px;
          left: 10px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: rgba(239, 68, 68, 0.4);
          animation: pulse 2s infinite;
        "></div>
        
        <!-- Pin principal -->
        <div class="marker-pin" style="
          position: absolute;
          top: 15px;
          left: 15px;
          width: 50px;
          height: 50px;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
          box-shadow: 0 8px 20px rgba(0,0,0,0.5);
          border: 3px solid white;
        ">
          <span style="transform: rotate(45deg);">
            ${markerData.imageCount || '📍'}
          </span>
        </div>
        
        <!-- Label sempre visível -->
        <div class="marker-label" style="
          position: absolute;
          bottom: -25px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.85);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          pointer-events: none;
          z-index: 10;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
        ">
          ${markerData.name}
        </div>
        
        <!-- Tooltip detalhado ao passar mouse -->
        <div class="marker-tooltip" style="
          position: absolute;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%) scale(0);
          opacity: 0;
          background: linear-gradient(135deg, rgba(31, 41, 55, 0.98), rgba(17, 24, 39, 0.98));
          color: white;
          padding: 16px;
          border-radius: 12px;
          white-space: nowrap;
          font-size: 14px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.6);
          backdrop-filter: blur(12px);
          z-index: 1000;
          transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
          pointer-events: none;
          min-width: 280px;
        ">
          <div style="font-weight: bold; font-size: 16px; color: #fbbf24; margin-bottom: 8px;">
            ${markerData.name}
          </div>
          <div style="font-size: 13px; color: #e5e7eb; margin-bottom: 4px;">
            📍 ${markerData.location || 'Local desconhecido'}
          </div>
          <div style="font-size: 13px; color: #e5e7eb; margin-bottom: 4px;">
            📸 ${markerData.imageCount} ${
      markerData.imageCount === 1 ? 'foto' : 'fotos'
    }
          </div>
          ${
            markerData.date
              ? `
          <div style="font-size: 13px; color: #e5e7eb; margin-bottom: 8px;">
            📅 ${new Date(markerData.date).toLocaleDateString('pt-BR')}
          </div>
          `
              : ''
          }
          <div style="font-size: 13px; color: #86efac; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
            Clique para ver o álbum
          </div>
          
          <!-- Arrow -->
          <div style="
            position: absolute;
            bottom: -8px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid rgba(17, 24, 39, 0.98);
          "></div>
        </div>
      </div>
    `;

    // ⭐ CONTROLE DO TOOLTIP E ANIMAÇÕES
    const tooltip = el.querySelector('.marker-tooltip');
    const markerPin = el.querySelector('.marker-pin');

    // Animação de entrada
    setTimeout(() => {
      el.style.transform = 'scale(1.2)';
      setTimeout(() => {
        el.style.transform = 'scale(1)';
      }, 300);
    }, index * 100);

    // ⭐ EVENTOS DE HOVER
    el.addEventListener('mouseenter', () => {
      setHoveredMarkerId(markerData.id || markerData.travelId);
      el.style.transform = 'scale(1.15)';
      el.style.zIndex = '10000';

      // Mostrar tooltip com animação
      if (tooltip) {
        tooltip.style.transform = 'translateX(-50%) scale(1)';
        tooltip.style.opacity = '1';
      }

      // Destacar o pin
      if (markerPin) {
        markerPin.style.background =
          'linear-gradient(135deg, #f97316, #ef4444)';
        markerPin.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.6)';
      }
    });

    el.addEventListener('mouseleave', () => {
      setHoveredMarkerId(null);
      el.style.transform = 'scale(1)';
      el.style.zIndex = '1';

      // Esconder tooltip com animação
      if (tooltip) {
        tooltip.style.transform = 'translateX(-50%) scale(0)';
        tooltip.style.opacity = '0';
      }

      // Restaurar o pin
      if (markerPin) {
        markerPin.style.background =
          'linear-gradient(135deg, #ef4444, #dc2626)';
        markerPin.style.boxShadow = '0 8px 20px rgba(0,0,0,0.5)';
      }
    });

    // ⭐ CLICK EVENT MELHORADO
    el.addEventListener('click', e => {
      e.stopPropagation();
      console.log('🎯 Marker clicado:', markerData.name);

      // Callback para abrir o álbum
      if (onMarkerClick) {
        onMarkerClick(markerData);
      }
    });

    // ⭐ TOUCH EVENTS PARA MOBILE
    let touchTimer;
    el.addEventListener('touchstart', e => {
      touchTimer = setTimeout(() => {
        if (tooltip) {
          tooltip.style.transform = 'translateX(-50%) scale(1)';
          tooltip.style.opacity = '1';
        }
      }, 500);
    });

    el.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
      setTimeout(() => {
        if (tooltip) {
          tooltip.style.transform = 'translateX(-50%) scale(0)';
          tooltip.style.opacity = '0';
        }
      }, 3000);
    });

    return el;
  };

  // ⭐ ATUALIZAR MARKERS
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

    // ⭐ ADICIONAR NOVOS MARKERS
    validMarkers.forEach((markerData, index) => {
      try {
        // IMPORTANTE: Converter coordenadas [lat, lng] para [lng, lat] para Mapbox
        const lngLat = [markerData.coordinates[1], markerData.coordinates[0]];

        console.log(`📍 Adicionando marker ${markerData.name} em:`, lngLat);

        // Criar elemento do marker
        const el = createMarkerElement(markerData, index);

        // Criar marker no mapa
        const marker = new mapboxgl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat(lngLat)
          .addTo(map.current);

        // ⭐ POPUP DETALHADO (ao clicar com botão direito)
        const popup = new mapboxgl.Popup({
          offset: [0, -60],
          closeButton: true,
          closeOnClick: true,
          className: 'custom-popup-detailed',
          maxWidth: '360px',
        }).setHTML(`
          <div style="padding: 0; max-width: 360px; font-family: system-ui; overflow: hidden; border-radius: 12px;">
            ${
              markerData.coverImage
                ? `
              <div style="height: 140px; overflow: hidden; position: relative;">
                <img src="${markerData.coverImage}" style="width: 100%; height: 100%; object-fit: cover;" />
                <div style="position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.8));"></div>
              </div>
            `
                : ''
            }
            
            <div style="padding: 20px;">
              <h3 style="margin: 0 0 16px 0; font-size: 20px; font-weight: bold; color: #1f2937;">
                ${markerData.name}
              </h3>
              
              <div style="space-y: 12px;">
                <div style="display: flex; align-items: start; margin-bottom: 12px; color: #4b5563; font-size: 14px;">
                  <span style="margin-right: 12px; font-size: 16px;">📍</span>
                  <span style="flex: 1; line-height: 1.4;">${
                    markerData.location || 'Localização não especificada'
                  }</span>
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 12px; color: #4b5563; font-size: 14px;">
                  <span style="margin-right: 12px; font-size: 16px;">📅</span>
                  ${
                    markerData.date
                      ? new Date(markerData.date).toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Data não especificada'
                  }
                </div>
                
                <div style="display: flex; align-items: center; margin-bottom: 12px; color: #4b5563; font-size: 14px;">
                  <span style="margin-right: 12px; font-size: 16px;">📸</span>
                  <span style="font-weight: 600; color: #1f2937;">${
                    markerData.imageCount
                  }</span>
                  <span style="margin-left: 4px;">${
                    markerData.imageCount === 1 ? 'foto' : 'fotos'
                  }</span>
                </div>
  
                <div style="display: flex; align-items: center; padding: 10px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(34, 197, 94, 0.1)); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                  <span style="margin-right: 10px; font-size: 14px;">🌍</span>
                  <div style="font-size: 12px; color: #047857;">
                    <div style="font-weight: 600;">Coordenadas GPS</div>
                    <div style="font-family: monospace; margin-top: 2px;">
                      ${markerData.coordinates[0].toFixed(
                        6
                      )}, ${markerData.coordinates[1].toFixed(6)}
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onclick="if(window.markerPopupHandlers && window.markerPopupHandlers['${
                  markerData.id || markerData.travelId
                }']) window.markerPopupHandlers['${
          markerData.id || markerData.travelId
        }']()" 
                style="
                  width: 100%;
                  margin-top: 20px;
                  background: linear-gradient(135deg, #3b82f6, #2563eb);
                  color: white;
                  border: none;
                  padding: 14px 20px;
                  border-radius: 10px;
                  font-size: 15px;
                  font-weight: 600;
                  cursor: pointer;
                  transition: all 0.3s;
                  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  gap: 8px;
                " 
                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(59, 130, 246, 0.4)';"
                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(59, 130, 246, 0.3)';">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                Ver Álbum de Fotos
              </button>
            </div>
          </div>
        `);

        // Registrar handler para popup
        if (!window.markerPopupHandlers) {
          window.markerPopupHandlers = {};
        }
        window.markerPopupHandlers[markerData.id || markerData.travelId] =
          () => {
            if (onMarkerClick) {
              onMarkerClick(markerData);
            }
          };

        // Adicionar evento de contexto para mostrar popup
        el.addEventListener('contextmenu', e => {
          e.preventDefault();
          marker.togglePopup();
        });

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

    const marker = markersRefs.current[selectedTravelId];
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
          <Compass
            className={`h-4 w-4 transition-transform ${
              is3D ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* ⭐ CONTADOR DE MARKERS */}
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

      {/* ⭐ LOADING OVERLAY */}
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
            opacity: 0.5;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .custom-popup-detailed .mapboxgl-popup-content {
          border-radius: 12px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3) !important;
          border: none !important;
          padding: 0 !important;
          overflow: hidden !important;
        }

        .custom-popup-detailed .mapboxgl-popup-tip {
          display: none !important;
        }

        .custom-popup-detailed .mapboxgl-popup-close-button {
          color: white !important;
          font-size: 24px !important;
          padding: 8px !important;
          background: rgba(0, 0, 0, 0.3) !important;
          border-radius: 50% !important;
          margin: 8px !important;
        }

        .custom-marker {
          animation: bounce 2s infinite;
        }

        .custom-marker:hover {
          animation: none;
        }

        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default MapboxTravelMap;
