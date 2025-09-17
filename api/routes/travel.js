const express = require('express');
const cloudinary = require('cloudinary').v2;
const NodeGeocoder = require('node-geocoder');
const { authenticateToken } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Configurar geocoder
const geocoder = NodeGeocoder({
  provider: 'openstreetmap',
  httpAdapter: 'https',
  formatter: null,
});

// ⭐ SISTEMA DE PERSISTÊNCIA COM ARQUIVO JSON
const DATA_DIR = path.join(process.cwd(), 'data');
const MARKERS_FILE = path.join(DATA_DIR, 'travel-markers.json');

// Cache em memória para performance
let travelMarkersCache = null;
let cacheLoaded = false;

// Garantir que a pasta data existe
const ensureDataDir = async () => {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    console.log('📁 Pasta data criada');
  }
};

// ⭐ FUNÇÃO PARA SALVAR MARKERS EM ARQUIVO
const saveMarkersToStorage = async markers => {
  try {
    await ensureDataDir();
    await fs.writeFile(MARKERS_FILE, JSON.stringify(markers, null, 2), 'utf8');
    travelMarkersCache = markers;
    console.log('💾 Markers salvos em arquivo:', markers.length);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar markers:', error);
    travelMarkersCache = markers;
    return false;
  }
};

// ⭐ FUNÇÃO PARA CARREGAR MARKERS DE ARQUIVO
const loadMarkersFromStorage = async () => {
  if (cacheLoaded && travelMarkersCache !== null) {
    return travelMarkersCache;
  }

  try {
    await ensureDataDir();

    try {
      await fs.access(MARKERS_FILE);
      const data = await fs.readFile(MARKERS_FILE, 'utf8');
      const markers = JSON.parse(data);
      travelMarkersCache = markers;
      cacheLoaded = true;
      console.log('📂 Markers carregados do arquivo:', markers.length);
      return markers;
    } catch {
      console.log('📝 Arquivo de markers não existe, criando...');
      await saveMarkersToStorage([]);
      travelMarkersCache = [];
      cacheLoaded = true;
      return [];
    }
  } catch (error) {
    console.error('❌ Erro ao carregar markers:', error);
    travelMarkersCache = [];
    cacheLoaded = true;
    return [];
  }
};

// ⭐ INICIALIZAR MARKERS AO INICIAR
(async () => {
  const markers = await loadMarkersFromStorage();
  console.log(
    '🚀 Sistema de markers inicializado com',
    markers.length,
    'markers'
  );
})();

// ⭐ FUNÇÃO AUXILIAR: Forçar exclusão de pasta vazia
const forceDeleteEmptyFolder = async folderPath => {
  try {
    await cloudinary.api.delete_folder(folderPath);
    console.log(`📁 Pasta ${folderPath} deletada com sucesso`);
    return true;
  } catch (error) {
    console.warn(
      `⚠️ Não foi possível deletar pasta ${folderPath}:`,
      error.message
    );

    try {
      const subfolders = await cloudinary.api.sub_folders(folderPath);
      if (subfolders.folders.length === 0) {
        await cloudinary.api.delete_folder(folderPath, { type: 'upload' });
        console.log(
          `📁 Pasta vazia ${folderPath} deletada (método alternativo)`
        );
        return true;
      }
    } catch (altError) {
      console.warn(`⚠️ Método alternativo também falhou:`, altError.message);
    }

    return false;
  }
};

// ⭐ ENDPOINTS ESPECÍFICOS PRIMEIRO (antes dos genéricos com :travelId)

// Get travel markers for map
router.get('/map/markers', authenticateToken, async (req, res) => {
  try {
    const markers = await loadMarkersFromStorage();
    console.log('🗺️ Retornando markers para o mapa:', markers.length);

    res.json({
      success: true,
      markers: markers,
      count: markers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Get markers error:', error);
    res.status(500).json({ error: 'Failed to fetch travel markers' });
  }
});

// ⭐ Debug - Listar todos os markers (apenas desenvolvimento)
router.get('/debug/markers', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const markers = await loadMarkersFromStorage();
  res.json({
    success: true,
    markers: markers,
    count: markers.length,
  });
});

// ⭐ Geocodificar localização (endpoint auxiliar)
router.post('/geocode', authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    console.log('🌍 Geocodificando:', location);

    try {
      const geoResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          location
        )}&limit=1&addressdetails=1&accept-language=pt-BR,pt,en`,
        {
          headers: {
            'User-Agent': 'MemoryApp/1.0',
          },
        }
      );

      if (geoResponse.ok) {
        const geoData = await geoResponse.json();

        if (geoData && geoData.length > 0) {
          const result = geoData[0];

          res.json({
            success: true,
            result: {
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              formattedAddress: result.display_name,
              city:
                result.address?.city ||
                result.address?.town ||
                result.address?.village,
              country: result.address?.country,
              countryCode: result.address?.country_code,
            },
          });
        } else {
          res.status(404).json({
            error: 'Location not found',
            location,
          });
        }
      } else {
        throw new Error(`HTTP ${geoResponse.status}`);
      }
    } catch (geoError) {
      console.error('Geocoding error:', geoError);
      res.status(500).json({
        error: 'Geocoding failed',
        details: geoError.message,
      });
    }
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

    if (!travelId || !name) {
      return res.status(400).json({ error: 'travelId and name are required' });
    }

    let coordinates = null;

    // ⭐ GEOCODING MELHORADO
    if (location) {
      try {
        console.log('🌍 Tentando geocodificar:', location);

        const geoResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            location
          )}&limit=1&addressdetails=1&accept-language=pt-BR,pt,en`,
          {
            headers: {
              'User-Agent': 'MemoryApp/1.0',
            },
          }
        );

        if (geoResponse.ok) {
          const geoData = await geoResponse.json();

          if (geoData && geoData.length > 0) {
            coordinates = [
              parseFloat(geoData[0].lat),
              parseFloat(geoData[0].lon),
            ];
            console.log('✅ Geocoding successful:', coordinates);
          } else {
            console.log('⚠️ No geocoding results for:', location);
          }
        } else {
          console.warn('⚠️ Geocoding API response not OK:', geoResponse.status);
        }
      } catch (geoError) {
        console.error('⚠️ Geocoding failed:', geoError.message);
      }
    }

    // Carregar markers existentes
    const markers = await loadMarkersFromStorage();

    // Criar novo marker
    const newMarker = {
      id: travelId,
      name: name,
      coordinates,
      travelId,
      date: date || new Date().toISOString(),
      location: location || '',
      imageCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Verificar se já existe e atualizar ou adicionar
    const existingIndex = markers.findIndex(m => m.travelId === travelId);
    if (existingIndex >= 0) {
      const existingImageCount = markers[existingIndex].imageCount || 0;
      markers[existingIndex] = {
        ...newMarker,
        imageCount: existingImageCount,
        createdAt: markers[existingIndex].createdAt,
      };
      console.log('🔄 Updated existing marker:', travelId);
    } else {
      markers.push(newMarker);
      console.log('➕ Added new marker:', travelId);
    }

    // ⭐ SALVAR EM ARQUIVO
    await saveMarkersToStorage(markers);

    res.json({
      success: true,
      marker: newMarker,
      message: 'Travel marker saved successfully',
      hasCoordinates: !!coordinates,
      coordinates: coordinates,
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

    const markers = await loadMarkersFromStorage();
    const markerIndex = markers.findIndex(m => m.travelId === travelId);

    if (markerIndex >= 0) {
      markers[markerIndex].imageCount = imageCount;
      markers[markerIndex].updatedAt = new Date().toISOString();

      // ⭐ SALVAR ALTERAÇÕES
      await saveMarkersToStorage(markers);

      console.log('✅ Updated image count successfully');

      res.json({
        success: true,
        marker: markers[markerIndex],
        message: 'Image count updated',
      });
    } else {
      console.log('⚠️ Marker not found for:', travelId);
      res.status(404).json({
        success: false,
        error: 'Marker not found',
      });
    }
  } catch (error) {
    console.error('❌ Update marker count error:', error);
    res.status(500).json({ error: 'Failed to update marker count' });
  }
});

// ⭐ DELETAR apenas o marker (sem imagens)
router.delete('/markers/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('🗑️ Deleting marker for:', travelId);

    const markers = await loadMarkersFromStorage();
    const markerIndex = markers.findIndex(m => m.travelId === travelId);

    if (markerIndex >= 0) {
      const removedMarker = markers.splice(markerIndex, 1)[0];

      // ⭐ SALVAR ALTERAÇÕES
      await saveMarkersToStorage(markers);

      console.log('🗺️ Marker removido:', removedMarker.name);

      res.json({
        success: true,
        message: 'Travel marker deleted successfully',
        marker: removedMarker,
      });
    } else {
      console.log('⚠️ Marker not found for deletion:', travelId);
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

// ⭐ LIMPEZA DE ÁLBUNS ÓRFÃOS (desenvolvimento)
router.delete('/cleanup/orphaned', authenticateToken, async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not available in production' });
  }

  try {
    console.log('🧹 Iniciando limpeza de álbuns órfãos...');

    const foldersResult = await cloudinary.api.sub_folders('travels');
    const markers = await loadMarkersFromStorage();

    const orphanedFolders = [];
    const cleanedMarkers = [];

    for (const folder of foldersResult.folders) {
      try {
        const imagesInFolder = await cloudinary.search
          .expression(`folder:travels/${folder.name}`)
          .max_results(1)
          .execute();

        if (imagesInFolder.total_count === 0) {
          orphanedFolders.push(folder.name);

          const folderDeleted = await forceDeleteEmptyFolder(
            `travels/${folder.name}`
          );

          const markerIndex = markers.findIndex(
            m => m.travelId === folder.name
          );
          if (markerIndex >= 0) {
            const removedMarker = markers.splice(markerIndex, 1)[0];
            cleanedMarkers.push(removedMarker);
            console.log(`🗺️ Marker órfão removido: ${folder.name}`);
          }
        }
      } catch (error) {
        console.error(`❌ Erro ao processar pasta ${folder.name}:`, error);
      }
    }

    if (cleanedMarkers.length > 0) {
      await saveMarkersToStorage(markers);
    }

    res.json({
      success: true,
      message: `${orphanedFolders.length} álbuns órfãos removidos`,
      details: {
        cleanedFolders: orphanedFolders,
        cleanedMarkers: cleanedMarkers.map(m => m.name),
        totalCleaned: orphanedFolders.length,
      },
    });
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
    res.status(500).json({
      success: false,
      error: 'Cleanup failed',
      details: error.message,
    });
  }
});

// ⭐ ENDPOINTS COM :travelId POR ÚLTIMO (para evitar conflitos)

// Get all travels
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Loading all travels...');

    const foldersResult = await cloudinary.api.sub_folders('travels');
    const markers = await loadMarkersFromStorage();

    const travelPromises = foldersResult.folders.map(async folder => {
      try {
        const imagesResult = await cloudinary.search
          .expression(`folder:travels/${folder.name}`)
          .max_results(100)
          .execute();

        const marker = markers.find(m => m.travelId === folder.name);

        const travel = {
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
          coordinates: marker?.coordinates || null,
          location: marker?.location || null,
          date: marker?.date || null,
          hasMarker: !!marker,
        };

        // Atualizar contagem de imagens no marker se necessário
        if (marker && marker.imageCount !== travel.imageCount) {
          console.log(
            `🔄 Atualizando contagem para ${folder.name}: ${marker.imageCount} → ${travel.imageCount}`
          );
          const markerIndex = markers.findIndex(
            m => m.travelId === folder.name
          );
          if (markerIndex >= 0) {
            markers[markerIndex].imageCount = travel.imageCount;
            markers[markerIndex].updatedAt = new Date().toISOString();
          }
        }

        return travel;
      } catch (error) {
        console.error(`❌ Error loading travel ${folder.name}:`, error);
        const marker = markers.find(m => m.travelId === folder.name);
        return {
          id: folder.name,
          name: folder.name
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase()),
          folder: folder.name,
          images: [],
          imageCount: 0,
          coverImage: null,
          coordinates: marker?.coordinates || null,
          location: marker?.location || null,
          date: marker?.date || null,
          hasMarker: !!marker,
        };
      }
    });

    const travels = await Promise.all(travelPromises);

    // Salvar markers atualizados se houve mudanças
    await saveMarkersToStorage(markers);

    console.log(`✅ Loaded ${travels.length} travels`);
    console.log(
      `🗺️ ${travels.filter(t => t.hasMarker).length} travels have markers`
    );
    console.log(
      `📍 ${travels.filter(t => t.coordinates).length} travels have coordinates`
    );

    res.json({
      success: true,
      travels,
      summary: {
        total: travels.length,
        withMarkers: travels.filter(t => t.hasMarker).length,
        withCoordinates: travels.filter(t => t.coordinates).length,
        totalImages: travels.reduce((acc, t) => acc + t.imageCount, 0),
      },
    });
  } catch (error) {
    console.error('❌ Get travels error:', error);
    res.status(500).json({ error: 'Failed to fetch travels' });
  }
});

// ⭐ ESTATÍSTICAS do álbum antes de deletar
router.get('/:travelId/stats', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('📊 Buscando estatísticas para:', travelId);

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

    const markers = await loadMarkersFromStorage();
    const marker = markers.find(m => m.travelId === travelId);

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

    const markers = await loadMarkersFromStorage();
    const marker = markers.find(m => m.travelId === travelId);

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
      coordinates: marker?.coordinates || null,
      location: marker?.location || null,
    };

    res.json({ success: true, travel });
  } catch (error) {
    console.error('Get travel error:', error);
    res.status(500).json({ error: 'Failed to fetch travel' });
  }
});

// ⭐ DELETAR álbum completo (VERSÃO FINAL MELHORADA)
router.delete('/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('🗑️ Iniciando exclusão COMPLETA do álbum:', travelId);

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

    if (imagesResult.total_count > 0) {
      console.log('🗑️ Deletando imagens...');

      for (const resource of imagesResult.resources) {
        try {
          const result = await cloudinary.uploader.destroy(resource.public_id);
          console.log(
            `✅ Imagem deletada: ${resource.public_id} - ${result.result}`
          );
          deleteResults.push({
            public_id: resource.public_id,
            success: result.result === 'ok' || result.result === 'not found',
          });
          successful++;
        } catch (error) {
          console.error(
            `❌ Erro ao deletar imagem ${resource.public_id}:`,
            error
          );
          deleteResults.push({
            public_id: resource.public_id,
            success: false,
            error: error.message,
          });
          failed++;
        }
      }

      console.log(
        `📊 Resultado das imagens: ${successful} sucessos, ${failed} falhas`
      );
    }

    let folderDeleted = false;
    try {
      await cloudinary.api.delete_folder(`travels/${travelId}`);
      console.log('📁 Pasta deletada com sucesso');
      folderDeleted = true;
    } catch (folderError) {
      console.warn('⚠️ Não foi possível deletar a pasta:', folderError.message);

      try {
        await cloudinary.api.delete_resources_by_prefix(`travels/${travelId}/`);
        await cloudinary.api.delete_folder(`travels/${travelId}`);
        console.log('📁 Pasta deletada com método alternativo');
        folderDeleted = true;
      } catch (altError) {
        console.error('❌ Método alternativo também falhou:', altError);
      }
    }

    // ⭐ REMOVER MARKER DA LISTA
    const markers = await loadMarkersFromStorage();
    const markerIndex = markers.findIndex(m => m.travelId === travelId);
    let markerRemoved = false;
    let removedMarker = null;

    if (markerIndex >= 0) {
      removedMarker = markers.splice(markerIndex, 1)[0];
      await saveMarkersToStorage(markers);
      console.log('🗺️ Marker removido:', removedMarker.name);
      markerRemoved = true;
    } else {
      console.log('⚠️ Marker não encontrado para:', travelId);
    }

    const cleanupComplete = folderDeleted && markerRemoved;

    const response = {
      success: true,
      message: `Travel album "${travelId}" deleted successfully`,
      details: {
        imagesDeleted: successful,
        imagesFailed: failed,
        totalImages: imagesResult.total_count,
        markerRemoved: markerRemoved,
        folderDeleted: folderDeleted,
        wasEmpty: imagesResult.total_count === 0,
        cleanupComplete: cleanupComplete,
        removedMarker: removedMarker,
      },
      failedImages: deleteResults.filter(r => !r.success),
    };

    console.log('✅ Álbum deletado:', {
      travelId,
      imagesRemoved: successful,
      folderDeleted,
      markerRemoved,
      cleanupComplete,
    });

    res.json(response);
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
