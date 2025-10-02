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

// ⭐ FUNÇÃO AUXILIAR: Criar/atualizar marker de viagem
const createOrUpdateTravelMarker = async travelData => {
  try {
    const { folderName, travelName, location, date } = travelData;

    console.log(
      '🗺️ Creating/updating travel marker for:',
      folderName,
      'at:',
      location
    );

    let coordinates = null;

    if (location) {
      try {
        // Usar Nominatim (OpenStreetMap)
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
          }
        }
      } catch (geoError) {
        console.error('⚠️ Erro no geocoding:', geoError.message);
      }
    }

    return {
      success: true,
      markerData: {
        travelId: folderName,
        name: travelName,
        location,
        date,
        coordinates,
      },
      hasCoordinates: !!coordinates,
      coordinates: coordinates,
    };
  } catch (error) {
    console.error('❌ Erro ao preparar dados do marker:', error);
    return null;
  }
};

// ⭐ ATUALIZADO: Upload memories com suporte para modo append
router.post(
  '/memories',
  authenticateToken,
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { year, category, description, mode } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      console.log('📤 Upload de memórias:', {
        year,
        category,
        mode: mode || 'create',
        fileCount: req.files.length,
      });

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
        bytes: result.bytes,
        created_at: result.created_at,
      }));

      const message =
        mode === 'append'
          ? `${images.length} imagens adicionadas ao álbum existente`
          : `${images.length} imagens enviadas com sucesso`;

      res.json({
        success: true,
        images,
        message,
        mode: mode || 'create',
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload images' });
    }
  }
);

// ⭐ ATUALIZADO: Upload travel photos com suporte para modo append
router.post(
  '/travel',
  authenticateToken,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { travelName, location, date, description, mode } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      if (!travelName || !location) {
        return res
          .status(400)
          .json({ error: 'Travel name and location are required' });
      }
      if (mode === 'append') {
        return res.status(400).json({
          error: 'Use a rota /travel/:travelId/add para adicionar fotos',
          details: 'Esta rota é apenas para criar novos álbuns',
        });
      }

      const folderName = travelName.replace(/\s+/g, '-').toLowerCase();

      console.log('🚀 Uploading travel:', {
        travelName,
        location,
        folderName,
        imageCount: req.files.length,
        date: date || 'no date provided',
        mode: mode || 'create',
      });

      // Upload das imagens
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
        bytes: result.bytes,
        created_at: result.created_at,
      }));

      console.log('✅ Images uploaded successfully:', images.length);

      // Se não for modo append, criar/atualizar marker
      let markerResult = null;

      if (mode !== 'append') {
        markerResult = await createOrUpdateTravelMarker({
          folderName,
          travelName,
          location,
          date,
        });
      }

      // Resposta
      const message =
        mode === 'append'
          ? `${images.length} fotos adicionadas ao álbum "${travelName}"`
          : `Álbum "${travelName}" criado com ${images.length} imagens`;

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
        message,
        mode: mode || 'create',
      };

      // Adicionar informação do marker se foi criado
      if (markerResult && markerResult.success) {
        responseData.marker = {
          created: true,
          hasCoordinates: markerResult.hasCoordinates || false,
          location: location,
          coordinates: markerResult.markerData?.coordinates || null,
        };
      }

      console.log('📤 Enviando resposta:', {
        albumCreated: mode !== 'append',
        markerCreated: !!markerResult?.success,
        imageCount: images.length,
        mode: mode || 'create',
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

// ⭐ NOVO: Endpoint específico para adicionar fotos a viagem existente
router.post(
  '/travel/:travelId/add',
  authenticateToken,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { travelId } = req.params;
      const { description } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      console.log('➕ Adding images to existing travel:', {
        travelId,
        imageCount: req.files.length,
      });

      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `travels/${travelId}`,
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
        bytes: result.bytes,
        created_at: result.created_at,
      }));

      console.log('✅ Images added successfully:', images.length);

      res.json({
        success: true,
        images,
        message: `${images.length} fotos adicionadas ao álbum`,
        travelId,
      });
    } catch (error) {
      console.error('❌ Add to travel error:', error);
      res.status(500).json({
        error: 'Failed to add images to travel',
        details: error.message,
      });
    }
  }
);

// ⭐ NOVO: Endpoint específico para adicionar memórias a ano existente
router.post(
  '/memories/:year/:category/add',
  authenticateToken,
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { year, category } = req.params;
      const { description } = req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      console.log('➕ Adding memories to existing year:', {
        year,
        category,
        imageCount: req.files.length,
      });

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
        bytes: result.bytes,
        created_at: result.created_at,
      }));

      console.log('✅ Memories added successfully:', images.length);

      res.json({
        success: true,
        images,
        message: `${images.length} imagens adicionadas`,
        year,
        category,
      });
    } catch (error) {
      console.error('❌ Add to memories error:', error);
      res.status(500).json({
        error: 'Failed to add memories',
        details: error.message,
      });
    }
  }
);

// DELETE IMAGE - Com logs melhorados
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

// Health check para upload service
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
