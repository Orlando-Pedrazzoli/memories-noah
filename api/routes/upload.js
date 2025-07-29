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

// Upload memories (photos/school work)
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

// Upload travel photos
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

      const uploadPromises = req.files.map(file => {
        return new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: `travels/${travelName
                .replace(/\s+/g, '-')
                .toLowerCase()}`,
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
        travel: {
          name: travelName,
          location,
          date,
          description,
          images,
        },
        message: `Travel album "${travelName}" created with ${images.length} images`,
      });
    } catch (error) {
      console.error('Travel upload error:', error);
      res.status(500).json({ error: 'Failed to upload travel images' });
    }
  }
);

// Delete image
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
