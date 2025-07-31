const express = require('express');
const cloudinary = require('cloudinary').v2;
const NodeGeocoder = require('node-geocoder');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configurar geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
});

// Mock database - em produção, use um banco real
// Inicializar com os dados existentes
let travelMarkers = [
  {
    id: 'primeiro-ano-em-portugal',
    name: 'Portugal',
    coordinates: [39.3999, -8.2245],
    travelId: 'primeiro-ano-em-portugal',
    date: '2025-01-01',
    imageCount: 25,
    location: 'Portugal',
  },
];

// Get all travels
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get all folders under travels
    const foldersResult = await cloudinary.api.sub_folders('travels');

    const travelPromises = foldersResult.folders.map(async folder => {
      try {
        const imagesResult = await cloudinary.search
          .expression(`folder:travels/${folder.name}`)
          .max_results(100)
          .execute();

        // Procurar marker correspondente para incluir coordenadas
        const marker = travelMarkers.find(m => m.travelId === folder.name);

        return {
          id: folder.name,
          name: folder.name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()),
          folder: folder.name,
          images: imagesResult.resources.map(resource => ({
            public_id: resource.public_id,
            url: resource.secure_url,
            width: resource.width,
            height: resource.height,
            created_at: resource.created_at,
          })),
          imageCount: imagesResult.total_count || 0,
          coverImage: imagesResult.resources[0]?.secure_url || null,
          // ⭐ NOVO: Incluir coordenadas se disponíveis
          coordinates: marker?.coordinates || null,
          location: marker?.location || null,
        };
      } catch (error) {
        console.error(`Error loading travel ${folder.name}:`, error);
        return {
          id: folder.name,
          name: folder.name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()),
          folder: folder.name,
          images: [],
          imageCount: 0,
          coverImage: null,
          coordinates: null,
          location: null,
        };
      }
    });

    const travels = await Promise.all(travelPromises);

    res.json({ success: true, travels });
  } catch (error) {
    console.error('Get travels error:', error);
    res.status(500).json({ error: 'Failed to fetch travels' });
  }
});

// Get specific travel by ID
router.get('/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    const imagesResult = await cloudinary.search
      .expression(`folder:travels/${travelId}`)
      .max_results(500)
      .execute();

    if (imagesResult.total_count === 0) {
      return res.status(404).json({ error: 'Travel not found' });
    }

    // Buscar marker correspondente
    const marker = travelMarkers.find(m => m.travelId === travelId);

    const travel = {
      id: travelId,
      name: travelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      images: imagesResult.resources.map(resource => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        created_at: resource.created_at,
      })),
      imageCount: imagesResult.total_count,
      // ⭐ NOVO: Incluir coordenadas
      coordinates: marker?.coordinates || null,
      location: marker?.location || null,
    };

    res.json({ success: true, travel });
  } catch (error) {
    console.error('Get travel error:', error);
    res.status(500).json({ error: 'Failed to fetch travel' });
  }
});

// Get travel markers for map
router.get('/map/markers', authenticateToken, async (req, res) => {
  try {
    // Retornar todos os markers salvos
    res.json({ success: true, markers: travelMarkers });
  } catch (error) {
    console.error('Get markers error:', error);
    res.status(500).json({ error: 'Failed to fetch travel markers' });
  }
});

// ⭐ NOVO: Criar/atualizar travel marker com geocoding
router.post('/markers', authenticateToken, async (req, res) => {
  try {
    const { travelId, name, location, date } = req.body;

    console.log('📍 Creating marker for:', { travelId, name, location, date });

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    let coordinates = null;

    // Tentar geocodificar a localização
    try {
      const geoResults = await geocoder.geocode(location);

      if (geoResults && geoResults.length > 0) {
        const { latitude, longitude } = geoResults[0];
        coordinates = [latitude, longitude];
        console.log('✅ Geocoding successful:', coordinates);
      } else {
        console.log('⚠️ No geocoding results for:', location);
      }
    } catch (geoError) {
      console.error('⚠️ Geocoding failed:', geoError.message);
      // Continuar sem coordenadas se geocoding falhar
    }

    // Criar novo marker
    const newMarker = {
      id: travelId,
      name: name || location,
      coordinates,
      travelId,
      date: date || new Date().toISOString(),
      location,
      imageCount: 0, // Será atualizado depois
      createdAt: new Date().toISOString(),
    };

    // Verificar se já existe e atualizar ou adicionar
    const existingIndex = travelMarkers.findIndex(m => m.travelId === travelId);
    if (existingIndex >= 0) {
      // Atualizar marker existente, mantendo imageCount
      travelMarkers[existingIndex] = {
        ...travelMarkers[existingIndex],
        ...newMarker,
        imageCount: travelMarkers[existingIndex].imageCount, // Preservar contagem
      };
      console.log('🔄 Updated existing marker:', travelId);
    } else {
      // Adicionar novo marker
      travelMarkers.push(newMarker);
      console.log('➕ Added new marker:', travelId);
    }

    res.json({
      success: true,
      marker: newMarker,
      message: 'Travel marker saved successfully',
      hasCoordinates: !!coordinates,
    });
  } catch (error) {
    console.error('❌ Save marker error:', error);
    res.status(500).json({
      error: 'Failed to save travel marker',
      details: error.message,
    });
  }
});

// ⭐ NOVO: Atualizar contagem de imagens do marker
router.put('/markers/:travelId/count', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;
    const { imageCount } = req.body;

    console.log('📊 Updating image count for:', travelId, 'to:', imageCount);

    const markerIndex = travelMarkers.findIndex(m => m.travelId === travelId);
    if (markerIndex >= 0) {
      travelMarkers[markerIndex].imageCount = imageCount;
      console.log('✅ Updated image count successfully');
    } else {
      console.log('⚠️ Marker not found for:', travelId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Update marker count error:', error);
    res.status(500).json({ error: 'Failed to update marker count' });
  }
});

// ⭐ NOVO: Geocodificar localização (endpoint auxiliar)
router.post('/geocode', authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    const geoResults = await geocoder.geocode(location);

    if (!geoResults || geoResults.length === 0) {
      return res.status(404).json({
        error: 'Location not found',
        location,
      });
    }

    const result = geoResults[0];

    res.json({
      success: true,
      result: {
        latitude: result.latitude,
        longitude: result.longitude,
        formattedAddress: result.formattedAddress,
        city: result.city,
        country: result.country,
        countryCode: result.countryCode,
      },
    });
  } catch (error) {
    console.error('Geocode error:', error);
    res.status(500).json({
      error: 'Geocoding failed',
      details: error.message,
    });
  }
});

// ⭐ NOVO: Debug - Listar todos os markers (apenas desenvolvimento)
router.get('/debug/markers', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    success: true,
    markers: travelMarkers,
    count: travelMarkers.length,
  });
});

module.exports = router;
