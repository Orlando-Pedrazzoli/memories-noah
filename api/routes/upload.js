const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// ⭐ FUNÇÃO AUXILIAR MELHORADA: Criar marker de viagem com geocoding interno
const createTravelMarkerImproved = async travelData => {
  try {
    const { folderName, travelName, location, date } = travelData;

    console.log('🗺️ Creating travel marker for:', folderName, 'at:', location);

    // ⭐ GEOCODING DIRETO NO BACKEND (mais confiável)
    let coordinates = null;

    if (location) {
      try {
        // Usar Nominatim (OpenStreetMap) - mesmo do frontend
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
            console.log('✅ Geocoding bem-sucedido:', coordinates);
          } else {
            console.log('⚠️ Nenhum resultado de geocoding para:', location);
          }
        }
      } catch (geoError) {
        console.error('⚠️ Erro no geocoding:', geoError.message);
      }
    }

    // ⭐ RETORNAR DADOS DO MARKER (será usado pela função de chamada da API)
    return {
      success: true,
      markerData: {
        travelId: folderName,
        name: travelName,
        location,
        date,
        coordinates, // Incluir coordenadas se disponíveis
      },
      hasCoordinates: !!coordinates,
      coordinates: coordinates,
    };
  } catch (error) {
    console.error('❌ Erro ao preparar dados do marker:', error);
    return null;
  }
};

// ⭐ FUNÇÃO AUXILIAR: Fazer chamada para criar marker via API interna
const createTravelMarker = async (travelData, authHeader) => {
  try {
    const { folderName, travelName, location, date } = travelData;

    console.log('🗺️ Creating travel marker via API for:', folderName);

    const markerData = {
      travelId: folderName,
      name: travelName,
      location,
      date,
    };

    // Fazer chamada interna para o endpoint de markers
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(`${baseUrl}/api/travel/markers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(markerData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log(
        '✅ Travel marker created via API:',
        result.hasCoordinates ? 'with coordinates' : 'without coordinates'
      );
      return result;
    } else {
      console.warn(
        '⚠️ API call failed:',
        response.status,
        await response.text()
      );
    }
  } catch (err) {
    console.error('⚠️ Failed to create travel marker via API:', err.message);
  }
  return null;
};

// ⭐ FUNÇÃO AUXILIAR: Atualizar contagem de imagens
const updateImageCount = async (travelId, imageCount, authHeader) => {
  try {
    const baseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
    const response = await fetch(
      `${baseUrl}/api/travel/markers/${travelId}/count`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        body: JSON.stringify({ imageCount }),
      }
    );

    if (response.ok) {
      console.log('✅ Updated image count for:', travelId, 'to:', imageCount);
      return true;
    } else {
      console.warn('⚠️ Failed to update image count:', response.status);
    }
  } catch (err) {
    console.error('⚠️ Failed to update image count:', err.message);
  }
  return false;
};

// Upload memories (photos/school work) - INALTERADO
router.post(
  '/memories',
  authenticateToken,
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { year, category, description } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `memories/${year}/${category}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });
      });

      const uploadResults = await Promise.all(uploadPromises);

      const images = uploadResults.map(result => ({
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      }));

      res.json({
        success: true,
        images,
        message: `${images.length} images uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

// ⭐ ATUALIZADO: Upload travel photos com criação automática de marker MELHORADA
router.post(
  '/travel',
  authenticateToken,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { travelName, location, date, description } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      if (!travelName || !location) {
        return res
          .status(400)
          .json({ error: 'Travel name and location are required' });
      }

      const folderName = travelName.replace(/\s+/g, '-').toLowerCase();

      console.log('🚀 Uploading travel:', {
        travelName,
        location,
        folderName,
        imageCount: req.files.length,
        date: date || 'no date provided',
      });

      // 1. ⭐ UPLOAD DAS IMAGENS PRIMEIRO
      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `travels/${folderName}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(file.buffer);
        });
      });

      const uploadResults = await Promise.all(uploadPromises);

      const images = uploadResults.map(result => ({
        public_id: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
      }));

      console.log('✅ Images uploaded successfully:', images.length);

      // 2. ⭐ CRIAR MARKER COM CHAMADA INTERNA MELHORADA
      let markerResult = null;

      try {
        console.log('🗺️ Chamando endpoint interno para criar marker...');

        markerResult = await createTravelMarker(
          {
            folderName,
            travelName,
            location,
            date,
          },
          req.headers.authorization
        );

        if (markerResult && markerResult.success) {
          console.log(
            '✅ Marker criado via API interna:',
            markerResult.hasCoordinates ? 'com coordenadas' : 'sem coordenadas'
          );
        } else {
          console.warn('⚠️ Falha ao criar marker via API');
        }
      } catch (markerError) {
        console.error('⚠️ Erro ao criar marker via API:', markerError.message);
      }

      // 3. ⭐ ATUALIZAR CONTAGEM DE IMAGENS NO MARKER
      if (markerResult && markerResult.success) {
        try {
          const countUpdated = await updateImageCount(
            folderName,
            images.length,
            req.headers.authorization
          );

          if (countUpdated) {
            console.log('✅ Contagem de imagens atualizada no marker');
          }
        } catch (countError) {
          console.error('⚠️ Erro ao atualizar contagem:', countError.message);
        }
      }

      // 4. ⭐ RESPOSTA COMPLETA COM INFORMAÇÕES DO MARKER
      const responseData = {
        success: true,
        travel: {
          id: folderName,
          name: travelName,
          location,
          date,
          description,
          images,
          folder: folderName,
          imageCount: images.length,
        },
        message: `Travel album "${travelName}" created with ${images.length} images`,
      };

      // ⭐ ADICIONAR informação sobre o marker se foi criado
      if (markerResult && markerResult.success) {
        responseData.marker = {
          created: true,
          hasCoordinates: markerResult.hasCoordinates || false,
          location: location,
          coordinates: markerResult.marker?.coordinates || null,
        };

        if (markerResult.hasCoordinates) {
          responseData.message += ` e adicionado ao mapa!`;
        } else {
          responseData.message += ` (localização não encontrada para o mapa)`;
        }
      } else {
        responseData.marker = {
          created: false,
          hasCoordinates: false,
          location: location,
          coordinates: null,
        };
        responseData.message += ` (marker não pôde ser criado)`;
      }

      console.log('📤 Enviando resposta completa:', {
        albumCreated: true,
        markerCreated: responseData.marker.created,
        hasCoordinates: responseData.marker.hasCoordinates,
        imageCount: images.length,
      });

      res.json(responseData);
    } catch (error) {
      console.error('❌ Travel upload error:', error);
      res.status(500).json({
        error: 'Failed to upload travel images',
        details: error.message,
      });
    }
  }
);

// ⭐ DELETE IMAGE - MELHORADO COM LOGS
router.delete('/image/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;

    console.log('🗑️ Deleting image:', publicId);

    const result = await cloudinary.uploader.destroy(publicId);

    console.log('📤 Cloudinary deletion result:', result);

    if (result.result === 'ok') {
      console.log('✅ Image deleted successfully:', publicId);
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      console.warn('⚠️ Cloudinary deletion failed:', result);
      res.status(400).json({
        error: 'Failed to delete image',
        details: result.result || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete image',
      details: error.message,
    });
  }
});

// ⭐ NOVO: Endpoint para testar geocoding
router.post('/test-geocoding', authenticateToken, async (req, res) => {
  try {
    const { location } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required' });
    }

    console.log('🧪 Testing geocoding for:', location);

    const result = await createTravelMarkerImproved({
      folderName: 'test',
      travelName: 'Test Travel',
      location,
      date: new Date().toISOString(),
    });

    res.json({
      success: true,
      location,
      result,
      message: result?.hasCoordinates
        ? `Location found: ${result.coordinates}`
        : 'Location not found',
    });
  } catch (error) {
    console.error('❌ Geocoding test error:', error);
    res.status(500).json({
      error: 'Geocoding test failed',
      details: error.message,
    });
  }
});

// ⭐ NOVO: Health check para upload service
router.get('/health', authenticateToken, async (req, res) => {
  try {
    // Testar conexão com Cloudinary
    const cloudinaryTest = await cloudinary.api.ping();

    res.json({
      success: true,
      message: 'Upload service is healthy',
      cloudinary: cloudinaryTest.status === 'ok' ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
    });
  }
});

module.exports = router;
