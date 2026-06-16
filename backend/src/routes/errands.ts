import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Get all errands (with filters)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement errand listing with filters
    res.json({
      success: true,
      data: [],
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errands' });
  }
});

// Get single errand
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement single errand fetch
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch errand' });
  }
});

// Create errand (asker only)
router.post('/', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement errand creation
    res.status(201).json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create errand' });
  }
});

// Update errand
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement errand update
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update errand' });
  }
});

export default router;
