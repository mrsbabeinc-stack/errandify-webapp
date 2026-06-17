import { Router, Request, Response } from 'express';

const router = Router();

const categoryMapping: Record<string, string> = {
  'home-maintenance': ['repair', 'fix', 'maintenance', 'install', 'build', 'construction', 'furniture', 'wall', 'door', 'window', 'roof', 'floor'],
  'cleaning-laundry': ['clean', 'wash', 'laundry', 'mop', 'vacuum', 'dust', 'scrub', 'organize', 'declutter'],
  'shopping-errands': ['buy', 'shop', 'purchase', 'grocery', 'mall', 'store', 'gift', 'supplies'],
  'delivery-moving': ['deliver', 'move', 'transport', 'pickup', 'collect', 'send', 'shipping', 'courier'],
  'childcare-tutoring': ['babysit', 'tutor', 'teach', 'homework', 'childcare', 'lesson', 'school'],
  'pet-care': ['pet', 'dog', 'cat', 'walk', 'groom', 'vet', 'feed', 'animal'],
  'tech-support': ['computer', 'tech', 'software', 'phone', 'installation', 'setup', 'wifi', 'printer', 'technical'],
  'moving-help': ['move', 'movers', 'packing', 'relocation', 'heavy lifting'],
};

const descriptionTemplates: Record<string, (title: string) => string> = {
  'home-maintenance': (title: string) => `Need help with ${title}. Please ensure the work is done professionally and safely.`,
  'cleaning-laundry': (title: string) => `Looking for someone to help with ${title}. Please bring own supplies if needed.`,
  'shopping-errands': (title: string) => `Need someone to ${title} for me. Receipt required for reimbursement.`,
  'delivery-moving': (title: string) => `Assistance needed with ${title}. Careful handling is important.`,
  'childcare-tutoring': (title: string) => `Seeking help with ${title}. References and experience preferred.`,
  'pet-care': (title: string) => `Help needed with ${title}. Pet-friendly and experienced handlers only.`,
  'tech-support': (title: string) => `Need technical assistance with ${title}. Problem diagnosis required.`,
  'moving-help': (title: string) => `Help with ${title}. Physical ability and reliability important.`,
};

// Detect category from title
function detectCategory(title: string): string {
  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryMapping)) {
    for (const keyword of keywords) {
      if (lowerTitle.includes(keyword)) {
        return category;
      }
    }
  }

  return '';
}

// Generate description suggestion
function generateDescription(category: string, title: string): string {
  if (descriptionTemplates[category]) {
    return descriptionTemplates[category](title);
  }
  return `Help needed with: ${title}`;
}

// Get AI suggestions for title
router.post('/suggestions', (req: Request, res: Response) => {
  try {
    const { title } = req.body;

    if (!title || title.trim().length < 5) {
      return res.status(400).json({ error: 'Title too short' });
    }

    const suggestedCategory = detectCategory(title);
    const suggestedDescription = generateDescription(suggestedCategory, title);

    res.json({
      success: true,
      data: {
        category: suggestedCategory,
        description: suggestedDescription,
      },
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
