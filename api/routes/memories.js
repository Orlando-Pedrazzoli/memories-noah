const express = require('express');
const cloudinary = require('cloudinary').v2;
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Get all memories by year
router.get('/year/:year', authenticateToken, async (req, res) => {
  try {
    const { year } = req.params;

    // Get photos from memories folder
    const photosResult = await cloudinary.search
      .expression(`folder:memories/${year}/photos`)
      .max_results(500)
      .execute();

    // Get school work from memories folder
    const schoolWorkResult = await cloudinary.search
      .expression(`folder:memories/${year}/school-work`)
      .max_results(500)
      .execute();

    const memories = {
      year,
      photos: photosResult.resources.map(resource => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        created_at: resource.created_at,
        format: resource.format,
      })),
      schoolWork: schoolWorkResult.resources.map(resource => ({
        public_id: resource.public_id,
        url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        created_at: resource.created_at,
        format: resource.format,
      })),
    };

    res.json({ success: true, memories });
  } catch (error) {
    console.error('Get memories error:', error);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// Get all years with memory counts
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const years = [
      '0-12-months',
      '1-year',
      '2-years',
      '3-years',
      '4-years',
      '5-years',
      '6-years',
      '7-years',
      '8-years',
      '9-years',
      '10-years',
    ];

    const summary = years.map(year => ({
      year,
      photoCount: 0,
      schoolWorkCount: 0,
      totalCount: 0,
    }));

    res.json({ success: true, summary });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ error: 'Failed to fetch memories summary' });
  }
});

// Get recent memories for homepage
// Get recent memories for homepage
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    // Get recent memories from all folders (but limit calls due to rate limit)
    const recentResult = await cloudinary.search
      .expression('folder:memories/*')
      .max_results(12)
      .execute();

    const recentMemories = recentResult.resources.map(resource => ({
      public_id: resource.public_id,
      url: resource.secure_url,
      width: resource.width,
      height: resource.height,
      created_at: resource.created_at,
      folder: resource.folder,
    }));

    res.json({ success: true, recentMemories });
  } catch (error) {
    console.error('Get recent memories error:', error);
    // Return empty array instead of error to avoid breaking the UI
    res.json({ success: true, recentMemories: [] });
  }
});

module.exports = router;
