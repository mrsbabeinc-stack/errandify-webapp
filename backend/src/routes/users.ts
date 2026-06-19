import { Router } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import db from '../db.js';

const router = Router();

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, display_name, mobile, role, category_preferences, monthly_household_income, chas_card_color, chas_subsidy_percentage FROM users WHERE id = $1',
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
        monthlyHouseholdIncome: user.monthly_household_income,
        chasCardColor: user.chas_card_color,
        chasSubsidyPercentage: user.chas_subsidy_percentage,
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
    const { display_name, mobile, monthly_household_income } = req.body;
    const userId = req.userId;

    let updateFields = [];
    let updateValues = [userId];
    let paramCount = 1;

    if (display_name) {
      updateFields.push(`display_name = $${++paramCount}`);
      updateValues.push(display_name);
    }
    if (mobile) {
      updateFields.push(`mobile = $${++paramCount}`);
      updateValues.push(mobile);
    }
    if (monthly_household_income !== undefined) {
      updateFields.push(`monthly_household_income = $${++paramCount}`);
      updateValues.push(monthly_household_income);

      // Auto-calculate CHAS card color based on income
      let chasColor = 'none';
      let chasPercent = 0;
      if (monthly_household_income <= 1900) {
        chasColor = 'blue';
        chasPercent = 25;
      } else if (monthly_household_income <= 3900) {
        chasColor = 'green';
        chasPercent = 15;
      }

      updateFields.push(`chas_card_color = $${++paramCount}`);
      updateValues.push(chasColor);
      updateFields.push(`chas_subsidy_percentage = $${++paramCount}`);
      updateValues.push(chasPercent);
      updateFields.push(`chas_verified = $${++paramCount}`);
      updateValues.push(true);
      updateFields.push(`chas_verified_at = $${++paramCount}`);
      updateValues.push(new Date());
      updateFields.push(`chas_verification_method = $${++paramCount}`);
      updateValues.push('income_self_declared');
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $1 RETURNING id, display_name, mobile, monthly_household_income, chas_card_color, chas_subsidy_percentage`;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Profile update error:', error);
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

// Get user notification preferences
router.get('/preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);

    const result = await db.query(
      'SELECT notification_preferences, email_frequency FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      data: {
        notification_preferences: user.notification_preferences || {},
        email_frequency: user.email_frequency || 'daily',
      },
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user notification preferences
router.patch('/preferences', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = parseInt(req.userId || '0', 10);
    const { notification_preferences, email_frequency } = req.body;

    const updateFields = [];
    const updateValues = [userId];
    let paramCount = 1;

    if (notification_preferences !== undefined) {
      updateFields.push(`notification_preferences = $${++paramCount}`);
      updateValues.push(JSON.stringify(notification_preferences));
    }

    if (email_frequency) {
      updateFields.push(`email_frequency = $${++paramCount}`);
      updateValues.push(email_frequency);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $1
      RETURNING id, notification_preferences, email_frequency
    `;

    const result = await db.query(query, updateValues);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        notification_preferences: result.rows[0].notification_preferences,
        email_frequency: result.rows[0].email_frequency,
      },
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user ratings/history
router.get('/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = parseInt(id, 10);

    const result = await db.query(
      `SELECT
        AVG(CAST(rating_score AS FLOAT)) as average_rating,
        COUNT(*) as review_count,
        json_agg(json_build_object(
          'score', rating_score,
          'comment', rating_comment,
          'taskId', task_id,
          'createdAt', created_at
        ) ORDER BY created_at DESC) as reviews
       FROM errand_assignments
       WHERE doer_id = $1 AND rating_score IS NOT NULL`,
      [userId]
    );

    const data = result.rows[0];
    const averageRating = data.average_rating ? Math.round(data.average_rating * 10) / 10 : 0;
    const reviews = data.reviews && data.reviews[0].score ? data.reviews : [];

    res.json({
      success: true,
      data: {
        averageRating,
        reviewCount: parseInt(data.review_count, 10),
        reviews,
      },
    });
  } catch (error) {
    console.error('Ratings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch ratings' });
  }
});

export default router;
