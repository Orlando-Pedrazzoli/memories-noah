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

// ⭐ ENDPOINTS ESPECÍFICOS PRIMEIRO (antes dos genéricos com :travelId)

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

// ⭐ Debug - Listar todos os markers (apenas desenvolvimento)
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

// ⭐ Geocodificar localização (endpoint auxiliar)
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

// ⭐ CRIAR/ATUALIZAR travel marker com geocoding
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

// ⭐ ATUALIZAR contagem de imagens do marker
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

// ⭐ DELETAR apenas o marker (sem imagens)
router.delete('/markers/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    const markerIndex = travelMarkers.findIndex(m => m.travelId === travelId);
    if (markerIndex >= 0) {
      const removedMarker = travelMarkers.splice(markerIndex, 1)[0];
      console.log('🗺️ Marker removido:', removedMarker.name);

      res.json({
        success: true,
        message: 'Travel marker deleted successfully',
        marker: removedMarker,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Travel marker not found',
      });
    }
  } catch (error) {
    console.error('❌ Erro ao deletar marker:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete travel marker',
    });
  }
});

// ⭐ ENDPOINTS COM :travelId POR ÚLTIMO (para evitar conflitos)

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
          // ⭐ INCLUIR coordenadas se disponíveis
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

// ⭐ ESTATÍSTICAS do álbum antes de deletar (VERSÃO ÚNICA E CORRIGIDA)
router.get('/:travelId/stats', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('📊 Buscando estatísticas para:', travelId);

    // Buscar imagens (com tratamento de erro)
    let imagesResult;
    try {
      imagesResult = await cloudinary.search
        .expression(`folder:travels/${travelId}`)
        .max_results(500)
        .execute();
    } catch (cloudinaryError) {
      console.warn(
        '⚠️ Erro ao buscar imagens no Cloudinary:',
        cloudinaryError.message
      );
      imagesResult = { total_count: 0, resources: [] };
    }

    // Buscar marker
    const marker = travelMarkers.find(m => m.travelId === travelId);

    // Calcular tamanho aproximado
    let totalSize = 0;
    if (imagesResult.resources) {
      imagesResult.resources.forEach(resource => {
        totalSize += resource.bytes || 0;
      });
    }

    const stats = {
      travelId: travelId,
      name: travelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      imageCount: imagesResult.total_count || 0,
      totalSizeBytes: totalSize,
      totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
      hasMarker: !!marker,
      markerLocation: marker?.location || null,
      createdAt: marker?.createdAt || null,
      isEmpty: (imagesResult.total_count || 0) === 0,
      images: (imagesResult.resources || []).map(r => ({
        public_id: r.public_id,
        url: r.secure_url,
        sizeBytes: r.bytes,
        format: r.format,
        created_at: r.created_at,
      })),
    };

    console.log('📊 Estatísticas encontradas:', {
      imageCount: stats.imageCount,
      hasMarker: stats.hasMarker,
      isEmpty: stats.isEmpty,
    });

    res.json({
      success: true,
      stats: stats,
    });
  } catch (error) {
    console.error('❌ Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get travel stats',
      details: error.message,
    });
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
      // ⭐ INCLUIR coordenadas
      coordinates: marker?.coordinates || null,
      location: marker?.location || null,
    };

    res.json({ success: true, travel });
  } catch (error) {
    console.error('Get travel error:', error);
    res.status(500).json({ error: 'Failed to fetch travel' });
  }
});

// ⭐ DELETAR álbum completo (VERSÃO CORRIGIDA)
router.delete('/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('🗑️ Iniciando exclusão do álbum:', travelId);

    // 1. Buscar todas as imagens do álbum no Cloudinary
    let imagesResult;
    try {
      imagesResult = await cloudinary.search
        .expression(`folder:travels/${travelId}`)
        .max_results(500)
        .execute();
    } catch (cloudinaryError) {
      console.warn(
        '⚠️ Erro ao buscar imagens no Cloudinary:',
        cloudinaryError.message
      );
      imagesResult = { total_count: 0, resources: [] };
    }

    console.log(
      `📸 Encontradas ${imagesResult.total_count} imagens para deletar`
    );

    let successful = 0;
    let failed = 0;
    let deleteResults = [];

    // 2. Se houver imagens, deletar todas
    if (imagesResult.total_count > 0) {
      const deletePromises = imagesResult.resources.map(async resource => {
        try {
          const result = await cloudinary.uploader.destroy(resource.public_id);
          console.log(
            `✅ Imagem deletada: ${resource.public_id} - ${result.result}`
          );
          return {
            public_id: resource.public_id,
            success: result.result === 'ok',
          };
        } catch (error) {
          console.error(
            `❌ Erro ao deletar imagem ${resource.public_id}:`,
            error
          );
          return {
            public_id: resource.public_id,
            success: false,
            error: error.message,
          };
        }
      });

      deleteResults = await Promise.all(deletePromises);
      successful = deleteResults.filter(r => r.success).length;
      failed = deleteResults.filter(r => !r.success).length;

      console.log(
        `📊 Resultado das imagens: ${successful} sucessos, ${failed} falhas`
      );
    } else {
      console.log(
        '📷 Nenhuma imagem encontrada - álbum vazio ou pasta não existe'
      );
    }

    // 3. Tentar deletar a pasta (se existir)
    if (imagesResult.total_count > 0) {
      try {
        await cloudinary.api.delete_folder(`travels/${travelId}`);
        console.log('📁 Pasta deletada com sucesso');
      } catch (folderError) {
        console.warn(
          '⚠️ Não foi possível deletar a pasta:',
          folderError.message
        );
      }
    }

    // 4. Remover marker da lista (storage em memória) - SEMPRE FAZER ISSO
    const markerIndex = travelMarkers.findIndex(m => m.travelId === travelId);
    let markerRemoved = false;

    if (markerIndex >= 0) {
      const removedMarker = travelMarkers.splice(markerIndex, 1)[0];
      console.log('🗺️ Marker removido:', removedMarker.name);
      markerRemoved = true;
    } else {
      console.log('⚠️ Marker não encontrado para:', travelId);
    }

    // 5. ⭐ SEMPRE RETORNAR SUCESSO (mesmo se não houver imagens)
    res.json({
      success: true,
      message: `Travel album "${travelId}" deleted successfully`,
      details: {
        imagesDeleted: successful,
        imagesFailed: failed,
        totalImages: imagesResult.total_count,
        markerRemoved: markerRemoved,
        wasEmpty: imagesResult.total_count === 0,
      },
      failedImages: deleteResults.filter(r => !r.success),
    });

    console.log(
      '✅ Álbum deletado com sucesso:',
      travelId,
      `(${imagesResult.total_count} imagens, marker: ${
        markerRemoved ? 'removido' : 'não encontrado'
      })`
    );
  } catch (error) {
    console.error('❌ Erro geral ao deletar álbum:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete travel album',
      details: error.message,
    });
  }
});

module.exports = router;
