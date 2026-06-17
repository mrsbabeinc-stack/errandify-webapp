import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, display_name, mobile, role, category_preferences FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.display_name,
        mobile: user.mobile,
        role: user.role,
        categories: user.category_preferences || [],
      },
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    // TODO: Implement profile update
    res.json({
      success: true,
      data: null,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Update category preferences
router.patch('/categories', authMiddleware, async (req, res) => {
  try {
    const { categories } = req.body;

    if (!Array.isArray(categories) || categories.length === 0) {
      return res.status(400).json({ error: 'At least one category must be selected' });
    }

    const result = await db.query(
      'UPDATE users SET category_preferences = $1 WHERE id = $2 RETURNING id, category_preferences',
      [JSON.stringify(categories), req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        categories: result.rows[0].category_preferences,
      },
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({ error: 'Failed to update categories' });
  }
});

// Get user ratings/history
router.get('/:id/ratings', async (req, res) => {
  try {
    // TODO: Implement ratings fetch
    res.json({
      success: true,
      data: {
        averageRating: 0,
        reviews: [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

export default router;
