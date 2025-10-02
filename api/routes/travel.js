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

// ⭐ FUNÇÃO MELHORADA PARA SALVAR MARKERS EM ARQUIVO
const saveMarkersToStorage = async markers => {
  try {
    await ensureDataDir();

    // ⭐ IMPORTANTE: Se não há markers, limpar o arquivo
    if (!markers || markers.length === 0) {
      console.log('🧹 Limpando arquivo de markers (nenhum marker restante)');
      await fs.writeFile(MARKERS_FILE, JSON.stringify([], null, 2), 'utf8');
      travelMarkersCache = [];
      return true;
    }

    await fs.writeFile(MARKERS_FILE, JSON.stringify(markers, null, 2), 'utf8');
    travelMarkersCache = markers;
    console.log('💾 Markers salvos em arquivo:', markers.length);
    return true;
  } catch (error) {
    console.error('❌ Erro ao salvar markers:', error);
    return false;
  }
};

// ⭐ FUNÇÃO MELHORADA PARA CARREGAR MARKERS DE ARQUIVO
const loadMarkersFromStorage = async (forceReload = false) => {
  // ⭐ Forçar recarga se solicitado
  if (!forceReload && cacheLoaded && travelMarkersCache !== null) {
    return travelMarkersCache;
  }

  try {
    await ensureDataDir();

    try {
      await fs.access(MARKERS_FILE);
      const data = await fs.readFile(MARKERS_FILE, 'utf8');
      const markers = JSON.parse(data) || [];

      // ⭐ VALIDAÇÃO: Filtrar markers inválidos
      const validMarkers = markers.filter(m => m && m.travelId && m.name);

      travelMarkersCache = validMarkers;
      cacheLoaded = true;
      console.log('📂 Markers carregados do arquivo:', validMarkers.length);
      return validMarkers;
    } catch {
      console.log('📝 Arquivo de markers não existe ou está vazio');
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

// ⭐ FUNÇÃO PARA SINCRONIZAR MARKERS COM ÁLBUNS EXISTENTES
const syncMarkersWithAlbums = async () => {
  try {
    console.log('🔄 Sincronizando markers com álbuns existentes...');

    // Obter lista de álbuns do Cloudinary
    const foldersResult = await cloudinary.api.sub_folders('travels');
    const existingAlbumIds = foldersResult.folders.map(f => f.name);

    // Carregar markers atuais
    const markers = await loadMarkersFromStorage(true); // Forçar recarga

    // Filtrar apenas markers que têm álbuns correspondentes
    const syncedMarkers = markers.filter(marker =>
      existingAlbumIds.includes(marker.travelId)
    );

    // Se houve mudanças, salvar
    if (syncedMarkers.length !== markers.length) {
      console.log(
        `🧹 Removendo ${markers.length - syncedMarkers.length} markers órfãos`
      );
      await saveMarkersToStorage(syncedMarkers);
    }

    return syncedMarkers;
  } catch (error) {
    console.error('❌ Erro ao sincronizar markers:', error);
    return [];
  }
};

// ⭐ INICIALIZAR E SINCRONIZAR MARKERS AO INICIAR
(async () => {
  await syncMarkersWithAlbums();
  const markers = await loadMarkersFromStorage();
  console.log(
    '🚀 Sistema de markers inicializado com',
    markers.length,
    'markers sincronizados'
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
    return false;
  }
};

// Get travel markers for map
router.get('/map/markers', authenticateToken, async (req, res) => {
  try {
    // ⭐ SEMPRE SINCRONIZAR ANTES DE RETORNAR MARKERS
    const syncedMarkers = await syncMarkersWithAlbums();

    console.log(
      '🗺️ Retornando markers sincronizados para o mapa:',
      syncedMarkers.length
    );

    res.json({
      success: true,
      markers: syncedMarkers,
      count: syncedMarkers.length,
      timestamp: new Date().toISOString(),
      synced: true, // Indicar que foi sincronizado
    });
  } catch (error) {
    console.error('❌ Get markers error:', error);
    res.status(500).json({
      error: 'Failed to fetch travel markers',
      markers: [], // Retornar array vazio em caso de erro
      count: 0,
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
          }
        }
      } catch (geoError) {
        console.error('⚠️ Geocoding failed:', geoError.message);
      }
    }

    // Carregar markers existentes com recarga forçada
    const markers = await loadMarkersFromStorage(true);

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

    // Salvar em arquivo
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

// ⭐ DELETAR álbum completo (VERSÃO CORRIGIDA)
router.delete('/:travelId', authenticateToken, async (req, res) => {
  try {
    const { travelId } = req.params;

    console.log('🗑️ Iniciando exclusão COMPLETA do álbum:', travelId);

    // 1. Buscar e deletar imagens do Cloudinary
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

    if (imagesResult.total_count > 0) {
      console.log('🗑️ Deletando imagens...');

      for (const resource of imagesResult.resources) {
        try {
          const result = await cloudinary.uploader.destroy(resource.public_id);
          if (result.result === 'ok' || result.result === 'not found') {
            successful++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(
            `❌ Erro ao deletar imagem ${resource.public_id}:`,
            error
          );
          failed++;
        }
      }

      console.log(`📊 Resultado: ${successful} sucessos, ${failed} falhas`);
    }

    // 2. Deletar pasta do Cloudinary
    let folderDeleted = false;
    try {
      await cloudinary.api.delete_folder(`travels/${travelId}`);
      console.log('📁 Pasta deletada com sucesso');
      folderDeleted = true;
    } catch (folderError) {
      console.warn(
        '⚠️ Pasta pode não existir ou já foi deletada:',
        folderError.message
      );
      folderDeleted = true; // Considerar como sucesso se não existe
    }

    // 3. ⭐ REMOVER MARKER COM SINCRONIZAÇÃO COMPLETA
    console.log('🗺️ Removendo marker do sistema...');

    // Forçar recarga dos markers
    const markers = await loadMarkersFromStorage(true);
    const markerIndex = markers.findIndex(m => m.travelId === travelId);
    let markerRemoved = false;
    let removedMarker = null;

    if (markerIndex >= 0) {
      removedMarker = markers.splice(markerIndex, 1)[0];
      console.log('🗺️ Marker encontrado e removido:', removedMarker.name);
      markerRemoved = true;
    } else {
      console.log('⚠️ Marker não encontrado, pode já ter sido removido');
      markerRemoved = true; // Considerar como sucesso se não existe
    }

    // 4. ⭐ SALVAR MARKERS ATUALIZADOS
    await saveMarkersToStorage(markers);

    // 5. ⭐ VERIFICAR SE FOI O ÚLTIMO ÁLBUM
    if (markers.length === 0) {
      console.log(
        '🧹 Último álbum removido, limpando completamente o sistema de markers'
      );

      // Forçar limpeza total do arquivo
      await fs.writeFile(MARKERS_FILE, '[]', 'utf8');
      travelMarkersCache = [];

      // Verificar se há outras pastas órfãs
      try {
        const foldersResult = await cloudinary.api.sub_folders('travels');
        if (foldersResult.folders.length === 0) {
          console.log('✅ Nenhum álbum restante no Cloudinary');
        } else {
          console.warn(
            '⚠️ Ainda existem pastas no Cloudinary:',
            foldersResult.folders
          );
        }
      } catch (error) {
        console.log('📁 Pasta travels pode não existir mais');
      }
    }

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
        remainingMarkers: markers.length,
        allAlbumsDeleted: markers.length === 0,
      },
      remainingMarkers: markers.length,
    };

    console.log('✅ Álbum deletado completamente:', {
      travelId,
      imagesRemoved: successful,
      folderDeleted,
      markerRemoved,
      markersRestantes: markers.length,
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

// ⭐ ENDPOINT PARA LIMPAR TODOS OS MARKERS (desenvolvimento/emergência)
router.delete('/markers/clear-all', authenticateToken, async (req, res) => {
  try {
    console.log('🧹 Limpando TODOS os markers...');

    // Limpar arquivo
    await fs.writeFile(MARKERS_FILE, '[]', 'utf8');

    // Limpar cache
    travelMarkersCache = [];
    cacheLoaded = true;

    console.log('✅ Todos os markers foram removidos');

    res.json({
      success: true,
      message: 'All markers cleared successfully',
      markersRemoved: true,
    });
  } catch (error) {
    console.error('❌ Erro ao limpar markers:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear markers',
      details: error.message,
    });
  }
});

// ⭐ ENDPOINT DE SINCRONIZAÇÃO MANUAL
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Sincronização manual iniciada...');

    const syncedMarkers = await syncMarkersWithAlbums();

    res.json({
      success: true,
      message: 'Synchronization completed',
      markersCount: syncedMarkers.length,
      markers: syncedMarkers,
    });
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
    res.status(500).json({
      success: false,
      error: 'Synchronization failed',
      details: error.message,
    });
  }
});

// Get all travels
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Loading all travels...');

    // ⭐ Sincronizar markers antes de retornar viagens
    await syncMarkersWithAlbums();

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

        return travel;
      } catch (error) {
        console.error(`❌ Error loading travel ${folder.name}:`, error);
        return null;
      }
    });

    const travels = (await Promise.all(travelPromises)).filter(t => t !== null);

    console.log(`✅ Loaded ${travels.length} travels`);

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

    // ⭐ Em caso de erro, retornar array vazio
    res.json({
      success: false,
      travels: [],
      summary: {
        total: 0,
        withMarkers: 0,
        withCoordinates: 0,
        totalImages: 0,
      },
      error: 'Failed to fetch travels',
    });
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
