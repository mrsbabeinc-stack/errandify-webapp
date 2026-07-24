import { Router, Request, Response } from 'express';
import db from '../db.js';

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string;
}

const router = Router();

// GET all FAQs
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT id, category, question, answer, keywords
      FROM faqs
      WHERE is_active = true
      ORDER BY category, id
    `;

    const faqs: FAQ[] = (await db.query(query)).rows;

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs',
    });
  }
});

// GET FAQs by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    const query = `
      SELECT id, category, question, answer, keywords
      FROM faqs
      WHERE category = ? AND is_active = true
      ORDER BY id
    `;

    const faqs: FAQ[] = (await db.query(query, [category])).rows;

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error: any) {
    console.error('Error fetching FAQs by category:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQs',
    });
  }
});

// GET single FAQ
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT id, category, question, answer, keywords
      FROM faqs
      WHERE id = ? AND is_active = true
    `;

    const faq: FAQ | null = (await db.query(query, [id])).rows[0] || null;

    if (!faq) {
      return res.status(404).json({
        success: false,
        error: 'FAQ not found',
      });
    }

    res.json({
      success: true,
      data: faq,
    });
  } catch (error: any) {
    console.error('Error fetching FAQ:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch FAQ',
    });
  }
});

// Search FAQs by keywords
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;

    const searchQuery = `
      SELECT id, category, question, answer, keywords
      FROM faqs
      WHERE is_active = true
      AND (
        question LIKE ?
        OR answer LIKE ?
        OR keywords LIKE ?
      )
      ORDER BY category, id
      LIMIT 10
    `;

    const searchTerm = `%${query}%`;

    const faqs: FAQ[] = (await db.query(searchQuery, [searchTerm, searchTerm, searchTerm])).rows;

    res.json({
      success: true,
      data: faqs,
    });
  } catch (error: any) {
    console.error('Error searching FAQs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search FAQs',
    });
  }
});

export default router;
