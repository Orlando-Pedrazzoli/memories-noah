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

// ⭐ FUNÇÃO AUXILIAR: Criar marker de viagem
const createTravelMarker = async (travelData, authHeader) => {
  try {
    const { folderName, travelName, location, date } = travelData;

    console.log('🗺️ Creating travel marker for:', folderName);

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
        '✅ Travel marker created:',
        result.hasCoordinates ? 'with coordinates' : 'without coordinates'
      );
      return result;
    }
  } catch (err) {
    console.error('⚠️ Failed to create travel marker:', err.message);
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
      console.log('✅ Updated image count for:', travelId);
    }
  } catch (err) {
    console.error('⚠️ Failed to update image count:', err.message);
  }
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

// ⭐ ATUALIZADO: Upload travel photos com criação automática de marker
router.post(
  '/travel',
  authenticateToken,
  upload.array('images', 20),
  async (req, res) => {
    try {
      const { travelName, location, date, description, latitude, longitude } =
        req.body;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No images provided' });
      }

      const folderName = travelName.replace(/\s+/g, '-').toLowerCase();

      console.log('🚀 Uploading travel:', {
        travelName,
        location,
        folderName,
        imageCount: req.files.length,
        hasCoordinates: !!(latitude && longitude),
      });

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

      // ⭐ NOVO: Criar marker de viagem automaticamente
      const markerResult = await createTravelMarker(
        {
          folderName,
          travelName,
          location,
          date,
        },
        req.headers.authorization
      );

      // ⭐ NOVO: Atualizar contagem de imagens
      if (markerResult) {
        await updateImageCount(
          folderName,
          images.length,
          req.headers.authorization
        );
      }

      const responseData = {
        success: true,
        travel: {
          name: travelName,
          location,
          date,
          description,
          images,
          folder: folderName,
        },
        message: `Travel album "${travelName}" created with ${images.length} images`,
      };

      // ⭐ ADICIONAR informação sobre o marker se foi criado
      if (markerResult) {
        responseData.marker = {
          created: true,
          hasCoordinates: markerResult.hasCoordinates || false,
          location: location,
        };
      }

      res.json(responseData);
    } catch (error) {
      console.error('❌ Travel upload error:', error);
      res.status(500).json({ error: 'Failed to upload travel images' });
    }
  }
);

// Delete image - INALTERADO
router.delete('/image/:publicId', authenticateToken, async (req, res) => {
  try {
    const { publicId } = req.params;

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image deleted successfully' });
    } else {
      res.status(400).json({ error: 'Failed to delete image' });
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

module.exports = router;
