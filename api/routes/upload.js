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
    // Aceitar formatos de imagem incluindo HEIC/HEIF
    const allowedMimetypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/bmp',
      'image/heic',
      'image/heif',
    ];

    if (
      file.mimetype.startsWith('image/') ||
      allowedMimetypes.includes(file.mimetype.toLowerCase())
    ) {
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

// ⭐ CORRIGIDO: Upload memories com suporte para modo append
router.post(
  '/memories',
  authenticateToken,
  upload.array('images', 10),
  async (req, res) => {
    try {
      const { year, category, description, mode } = req.body;

      console.log('📤 Upload de memórias recebido:', {
        year,
        category,
        mode: mode || 'create',
        fileCount: req.files?.length || 0,
        description,
      });

      // Validações
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images provided',
        });
      }

      if (!year) {
        return res.status(400).json({
          success: false,
          error: 'Year is required',
        });
      }

      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Category is required',
        });
      }

      // Validar categoria
      const validCategories = ['photos', 'school-work'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(
            ', '
          )}`,
        });
      }

      console.log(
        '✅ Validações passaram, iniciando upload para Cloudinary...'
      );

      const uploadPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          console.log(
            `📸 Uploading file ${index + 1}/${req.files.length}: ${
              file.originalname
            }`
          );

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `memories/${year}/${category}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
              timeout: 60000, // 60 segundos de timeout
            },
            (error, result) => {
              if (error) {
                console.error(
                  `❌ Erro ao fazer upload de ${file.originalname}:`,
                  error
                );
                reject(error);
              } else {
                console.log(`✅ Upload concluído: ${file.originalname}`);
                resolve(result);
              }
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

      console.log('✅ Todas as imagens foram enviadas com sucesso');

      res.json({
        success: true,
        images,
        message,
        mode: mode || 'create',
        year,
        category,
        totalImages: images.length,
      });
    } catch (error) {
      console.error('❌ Upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload images',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }
);

// ⭐ CORRIGIDO: Upload travel photos com suporte para modo append
router.post(
  '/travel',
  authenticateToken,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { travelName, location, date, description, mode } = req.body;

      console.log('🚀 Upload de viagem recebido:', {
        travelName,
        location,
        date,
        imageCount: req.files?.length || 0,
        mode: mode || 'create',
      });

      // Validações
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images provided',
        });
      }

      if (!travelName || !location) {
        return res.status(400).json({
          success: false,
          error: 'Travel name and location are required',
        });
      }

      if (mode === 'append') {
        return res.status(400).json({
          success: false,
          error: 'Use a rota /travel/:travelId/add para adicionar fotos',
          details: 'Esta rota é apenas para criar novos álbuns',
        });
      }

      const folderName = travelName.replace(/\s+/g, '-').toLowerCase();

      console.log('✅ Iniciando upload das imagens para Cloudinary...');

      // Upload das imagens
      const uploadPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          console.log(
            `📸 Uploading travel photo ${index + 1}/${req.files.length}`
          );

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `travels/${folderName}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                console.error(`❌ Erro ao fazer upload:`, error);
                reject(error);
              } else {
                console.log(`✅ Upload concluído`);
                resolve(result);
              }
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

      console.log('📤 Enviando resposta de sucesso');

      res.json(responseData);
    } catch (error) {
      console.error('❌ Travel upload error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to upload travel images',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

      console.log('➕ Adicionando imagens a viagem existente:', {
        travelId,
        imageCount: req.files?.length || 0,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images provided',
        });
      }

      const uploadPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          console.log(
            `📸 Adding photo ${index + 1}/${req.files.length} to ${travelId}`
          );

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `travels/${travelId}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                console.error(`❌ Erro ao adicionar foto:`, error);
                reject(error);
              } else {
                console.log(`✅ Foto adicionada`);
                resolve(result);
              }
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
        description,
        totalImages: images.length,
      });
    } catch (error) {
      console.error('❌ Add to travel error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add images to travel',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
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

      console.log('➕ Adicionando memórias a ano existente:', {
        year,
        category,
        imageCount: req.files?.length || 0,
      });

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No images provided',
        });
      }

      // Validar categoria
      const validCategories = ['photos', 'school-work'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({
          success: false,
          error: `Invalid category. Must be one of: ${validCategories.join(
            ', '
          )}`,
        });
      }

      const uploadPromises = req.files.map((file, index) => {
        return new Promise((resolve, reject) => {
          console.log(
            `📸 Adding memory ${index + 1}/${
              req.files.length
            } to ${year}/${category}`
          );

          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `memories/${year}/${category}`,
              resource_type: 'image',
              transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' },
              ],
              timeout: 60000,
            },
            (error, result) => {
              if (error) {
                console.error(`❌ Erro ao adicionar memória:`, error);
                reject(error);
              } else {
                console.log(`✅ Memória adicionada`);
                resolve(result);
              }
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
        description,
        totalImages: images.length,
      });
    } catch (error) {
      console.error('❌ Add to memories error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to add memories',
        details:
          process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
      res.json({
        success: true,
        message: 'Image deleted successfully',
        publicId,
        result: result.result,
      });
    } else if (result.result === 'not found') {
      console.warn('⚠️ Image not found:', publicId);
      res.status(404).json({
        success: false,
        error: 'Image not found',
        publicId,
        details: result.result,
      });
    } else {
      console.warn('⚠️ Cloudinary deletion failed:', result);
      res.status(400).json({
        success: false,
        error: 'Failed to delete image',
        details: result.result || 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete image',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
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
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.1', // Versão atualizada
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// Teste de conexão com Cloudinary (sem autenticação para debug)
router.get('/test-cloudinary', async (req, res) => {
  try {
    console.log('🔍 Testando conexão com Cloudinary...');
    console.log('Cloud Name:', process.env.CLOUDINARY_CLOUD_NAME);
    console.log('API Key presente:', !!process.env.CLOUDINARY_API_KEY);
    console.log('API Secret presente:', !!process.env.CLOUDINARY_API_SECRET);

    const result = await cloudinary.api.ping();

    res.json({
      success: true,
      message: 'Cloudinary connection successful',
      result,
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        configured: !!(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ),
      },
    });
  } catch (error) {
    console.error('❌ Cloudinary test error:', error);
    res.status(500).json({
      success: false,
      error: 'Cloudinary connection failed',
      details: error.message,
      config: {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        configured: !!(
          process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.CLOUDINARY_API_KEY &&
          process.env.CLOUDINARY_API_SECRET
        ),
      },
    });
  }
});

module.exports = router;
