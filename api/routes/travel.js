const express = require('express');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

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
    };

    res.json({ success: true, travel });
  } catch (error) {
    console.error('Get travel error:', error);
    res.status(500).json({ error: 'Failed to fetch travel' });
  }
});

// Get travel markers for map (simplified data)
router.get('/map/markers', authenticateToken, async (req, res) => {
  try {
    // This would typically come from a database
    // For now, we'll return mock data that you can customize
    const markers = [
      {
        id: 'primeiro-ano-em-portugal',
        name: 'Portugal',
        coordinates: [39.3999, -8.2245],
        travelId: 'primeiro-ano-em-portugal',
        date: '2025-01-01',
        imageCount: 25,
      },
      // Add more travels here as needed
    ];

    res.json({ success: true, markers });
  } catch (error) {
    console.error('Get markers error:', error);
    res.status(500).json({ error: 'Failed to fetch travel markers' });
  }
});

// Save travel marker (for future implementation)
router.post('/markers', authenticateToken, async (req, res) => {
  try {
    const { name, coordinates, travelId, date } = req.body;

    // This would typically save to a database
    // For now, just return success
    const marker = {
      id: travelId,
      name,
      coordinates,
      travelId,
      date,
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      marker,
      message: 'Travel marker saved successfully',
    });
  } catch (error) {
    console.error('Save marker error:', error);
    res.status(500).json({ error: 'Failed to save travel marker' });
  }
});

module.exports = router;
