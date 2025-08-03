// client/src/components/travel/MapboxTravelMap.jsx - VERSÃO CORRIGIDA

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Image, Calendar, Navigation } from 'lucide-react';

// ⭐ CONFIGURAR SEU TOKEN DO MAPBOX AQUI
// Registre gratuitamente em: https://www.mapbox.com/
const MAPBOX_TOKEN =
  import.meta.env.VITE_MAPBOX_TOKEN ||
  'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

mapboxgl.accessToken = MAPBOX_TOKEN;

const MapboxTravelMap = ({ markers = [], onMarkerClick, loading = false }) => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRefs = useRef({});
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/satellite-streets-v12'
  );
  const [is3D, setIs3D] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);

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
      coord[0] <= 90 && // latitude
      coord[1] >= -180 &&
      coord[1] <= 180
    ); // longitude
  };

  // ⭐ FUNÇÃO PARA DEBUG DE MARKERS
  const debugMarkers = markers => {
    console.log('🔍 Debug de markers recebidos:', markers.length);
    markers.forEach((marker, index) => {
      console.log(`📍 Marker ${index + 1}:`, {
        id: marker.id,
        name: marker.name,
        location: marker.location,
        coordinates: marker.coordinates,
        valid: isValidCoordinate(marker.coordinates),
        lat: marker.coordinates?.[0],
        lng: marker.coordinates?.[1],
      });
    });
  };

  useEffect(() => {
    if (map.current) return; // Evitar múltiplas inicializações

    console.log(
      '🗺️ Inicializando Mapbox com token:',
      MAPBOX_TOKEN ? 'presente' : 'ausente'
    );

    try {
      // ⭐ INICIALIZAR MAPA COM CONFIGURAÇÕES MELHORADAS
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: [0, 20], // Centro mundial melhor posicionado
        zoom: 2,
        pitch: is3D ? 45 : 0,
        bearing: 0,
        antialias: true,
        projection: 'globe',
      });

      // ⭐ CONTROLES PADRÃO
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.FullscreenControl(), 'top-right');
      map.current.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

      // ⭐ QUANDO O ESTILO CARREGAR
      map.current.on('style.load', () => {
        console.log('🎨 Estilo do mapa carregado');
        setMapLoaded(true);

        // Configurar atmosfera 3D
        map.current.setFog({
          color: 'rgb(186, 210, 235)',
          'high-color': 'rgb(36, 92, 223)',
          'horizon-blend': 0.02,
          'space-color': 'rgb(11, 11, 25)',
          'star-intensity': 0.6,
        });
      });

      // ⭐ ANIMAÇÃO DE ROTAÇÃO SUAVE
      let userInteracting = false;
      let spinEnabled = true;

      const spinGlobe = () => {
        if (spinEnabled && !userInteracting && map.current) {
          const zoom = map.current.getZoom();
          if (zoom < 4) {
            let distancePerSecond = 360 / 120;
            const center = map.current.getCenter();
            center.lng -= distancePerSecond;

            map.current.easeTo({
              center,
              duration: 1000,
              easing: t => t,
            });
          }
        }
      };

      // Controlar rotação
      map.current.on('mousedown', () => {
        userInteracting = true;
      });
      map.current.on('touchstart', () => {
        userInteracting = true;
      });
      map.current.on('mouseup', () => {
        userInteracting = false;
        setTimeout(() => spinGlobe(), 3000);
      });
      map.current.on('touchend', () => {
        userInteracting = false;
        setTimeout(() => spinGlobe(), 3000);
      });

      // Iniciar rotação
      const spinInterval = setInterval(spinGlobe, 1000);

      // Cleanup
      return () => {
        clearInterval(spinInterval);
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
      };
    } catch (error) {
      console.error('❌ Erro ao inicializar Mapbox:', error);
    }
  }, []);

  // ⭐ ATUALIZAR ESTILO DO MAPA
  useEffect(() => {
    if (map.current && mapLoaded) {
      console.log('🎨 Mudando estilo do mapa para:', mapStyle);
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);

  // ⭐ ATUALIZAR PITCH (3D/2D)
  useEffect(() => {
    if (map.current && mapLoaded) {
      console.log('🔄 Mudando pitch para:', is3D ? '3D (45°)' : '2D (0°)');
      map.current.easeTo({
        pitch: is3D ? 45 : 0,
        duration: 1000,
      });
    }
  }, [is3D, mapLoaded]);

  // ⭐ ATUALIZAR MARKERS - VERSÃO CORRIGIDA
  useEffect(() => {
    if (!map.current || !mapLoaded || !markers) return;

    console.log('📍 Atualizando markers no mapa...');
    debugMarkers(markers);

    // Remover markers antigos
    Object.values(markersRefs.current).forEach(marker => {
      marker.remove();
    });
    markersRefs.current = {};

    // ⭐ FILTRAR APENAS MARKERS VÁLIDOS
    const validMarkers = markers.filter(marker => {
      const isValid = isValidCoordinate(marker.coordinates);
      if (!isValid) {
        console.warn(
          '⚠️ Marker inválido ignorado:',
          marker.name,
          marker.coordinates
        );
      }
      return isValid;
    });

    console.log(
      `✅ ${validMarkers.length}/${markers.length} markers válidos para adicionar ao mapa`
    );

    if (validMarkers.length === 0) {
      console.warn('⚠️ Nenhum marker válido encontrado');
      return;
    }

    // Adicionar novos markers
    validMarkers.forEach((markerData, index) => {
      console.log(
        `📍 Adicionando marker ${index + 1}:`,
        markerData.name,
        markerData.coordinates
      );

      // ⭐ CONVERTER COORDENADAS CORRETAMENTE (lat, lng) -> (lng, lat)
      const lngLat = [markerData.coordinates[1], markerData.coordinates[0]];

      console.log(`🔄 Conversão de coordenadas:`, {
        original: markerData.coordinates,
        converted: lngLat,
        explanation: '[lat, lng] -> [lng, lat]',
      });

      // ⭐ CRIAR ELEMENTO CUSTOMIZADO DO MARKER
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `
        <div class="marker-container" style="
          width: 50px; 
          height: 50px; 
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
            background: rgba(239, 68, 68, 0.4);
            animation: pulse 2s infinite;
          "></div>
          <div class="marker-pin" style="
            position: absolute;
            top: 5px;
            left: 5px;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            border: 3px solid white;
          ">
            ${markerData.imageCount || '📍'}
          </div>
        </div>
      `;

      // ⭐ ANIMAÇÃO DE ENTRADA
      setTimeout(() => {
        el.style.transform = 'scale(1.3)';
        setTimeout(() => {
          el.style.transform = 'scale(1)';
        }, 300);
      }, index * 200);

      // ⭐ HOVER EFFECTS
      el.addEventListener('mouseenter', () => {
        el.style.transform = 'scale(1.2)';
        el.style.zIndex = '1000';
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'scale(1)';
        el.style.zIndex = '1';
      });

      // ⭐ CLICK EVENT
      el.addEventListener('click', e => {
        e.stopPropagation();

        console.log('🎯 Marker clicado:', markerData.name);

        // Voar para o marker
        map.current.flyTo({
          center: lngLat,
          zoom: 8,
          pitch: 60,
          bearing: 30,
          duration: 2000,
        });

        // Callback para abrir modal
        if (onMarkerClick) {
          onMarkerClick(markerData);
        }
      });

      try {
        // ⭐ CRIAR MARKER NO MAPA
        const marker = new mapboxgl.Marker({ element: el })
          .setLngLat(lngLat)
          .addTo(map.current);

        // ⭐ POPUP RICO COM INFORMAÇÕES
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
          className: 'custom-popup',
        }).setHTML(`
          <div style="
            padding: 16px;
            max-width: 280px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          ">
            <h3 style="
              margin: 0 0 10px 0;
              font-size: 18px;
              font-weight: bold;
              color: #1f2937;
            ">${markerData.name}</h3>
            
            <div style="display: flex; align-items: center; margin-bottom: 8px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 6px;">📍</span>
              ${markerData.location || 'Localização não especificada'}
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 8px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 6px;">📅</span>
              ${new Date(markerData.date).toLocaleDateString('pt-BR')}
            </div>
            
            <div style="display: flex; align-items: center; margin-bottom: 12px; color: #6b7280; font-size: 14px;">
              <span style="margin-right: 6px;">📸</span>
              ${markerData.imageCount} ${
          markerData.imageCount === 1 ? 'foto' : 'fotos'
        }
            </div>

            <div style="display: flex; align-items: center; margin-bottom: 12px; color: #10b981; font-size: 12px;">
              <span style="margin-right: 6px;">🌍</span>
              ${markerData.coordinates[0].toFixed(
                4
              )}, ${markerData.coordinates[1].toFixed(4)}
            </div>
            
            <button onclick="window.currentMarkerClick && window.currentMarkerClick()" style="
              width: 100%;
              background: linear-gradient(135deg, #ef4444, #dc2626);
              color: white;
              border: none;
              padding: 10px 16px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(239,68,68,0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
              Ver Álbum 🖼️
            </button>
          </div>
        `);

        // ⭐ CONFIGURAR CALLBACK GLOBAL PARA O BOTÃO
        window.currentMarkerClick = () => {
          if (onMarkerClick) {
            onMarkerClick(markerData);
          }
        };

        marker.setPopup(popup);
        markersRefs.current[markerData.id] = marker;

        console.log(`✅ Marker adicionado com sucesso: ${markerData.name}`);
      } catch (markerError) {
        console.error('❌ Erro ao criar marker:', markerError, markerData);
      }
    });

    // ⭐ AJUSTAR ZOOM PARA MOSTRAR TODOS OS MARKERS
    if (validMarkers.length > 0) {
      setTimeout(() => {
        try {
          if (validMarkers.length === 1) {
            // Para um marker, voar diretamente
            const marker = validMarkers[0];
            const lngLat = [marker.coordinates[1], marker.coordinates[0]];

            console.log('🎯 Voando para marker único:', marker.name, lngLat);

            map.current.flyTo({
              center: lngLat,
              zoom: 6,
              pitch: 45,
              duration: 3000,
            });
          } else {
            // Para múltiplos markers, ajustar bounds
            const bounds = new mapboxgl.LngLatBounds();
            validMarkers.forEach(marker => {
              bounds.extend([marker.coordinates[1], marker.coordinates[0]]);
            });

            console.log('🗺️ Ajustando para mostrar todos os markers');

            map.current.fitBounds(bounds, {
              padding: 80,
              maxZoom: 8,
              duration: 3000,
            });
          }
        } catch (boundsError) {
          console.error('❌ Erro ao ajustar bounds:', boundsError);
        }
      }, 1500);
    }
  }, [markers, onMarkerClick, mapLoaded]);

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
          className={`w-10 h-10 rounded-lg shadow-lg flex items-center justify-center transition-all ${
            is3D
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
          title={is3D ? 'Desativar 3D' : 'Ativar 3D'}
        >
          <Navigation
            className={`h-4 w-4 transition-transform ${
              is3D ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* ⭐ CONTADOR DE MARKERS */}
      {markers.length > 0 && (
        <div className='absolute top-4 right-4 z-10'>
          <div className='bg-white rounded-lg shadow-lg px-3 py-2 flex items-center space-x-2'>
            <MapPin className='h-4 w-4 text-red-600' />
            <span className='text-sm font-medium'>
              {markers.filter(m => isValidCoordinate(m.coordinates)).length} de{' '}
              {markers.length} no mapa
            </span>
          </div>
        </div>
      )}

      {/* ⭐ LOADING OVERLAY */}
      {(loading || !mapLoaded) && (
        <div className='absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-2'></div>
            <p className='text-sm text-gray-600'>
              {loading ? 'Carregando dados...' : 'Inicializando mapa 3D...'}
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
            opacity: 0.7;
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
