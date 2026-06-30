import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim();
}

export interface ErrandValidationError {
  field: string;
  message: string;
}

export function validateErrandCreation(data: any): ErrandValidationError[] {
  const errors: ErrandValidationError[] = [];

  if (!data.title || typeof data.title !== 'string') {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (data.title.length < 5 || data.title.length > 200) {
    errors.push({ field: 'title', message: 'Title must be 5-200 characters' });
  }

  if (data.description && data.description.length > 2000) {
    errors.push({ field: 'description', message: 'Description max 2000 chars' });
  }

  if (!data.budget) {
    errors.push({ field: 'budget', message: 'Budget required' });
  } else {
    const budget = parseFloat(data.budget);
    if (isNaN(budget) || budget < 5 || budget > 10000) {
      errors.push({ field: 'budget', message: 'Budget \$5-\$10,000' });
    }
  }

  const validCategories = ['household', 'tutoring', 'delivery', 'event-planning', 'pet-care', 'elderly-care', 'childcare', 'technology', 'health-fitness', 'transport', 'beauty', 'repairs', 'gardening', 'moving', 'catering', 'personal-care'];

  if (!data.category || !validCategories.includes(data.category.toLowerCase())) {
    errors.push({ field: 'category', message: 'Invalid category' });
  }

  if (!data.location || data.location.length < 3 || data.location.length > 255) {
    errors.push({ field: 'location', message: 'Location 3-255 chars' });
  }

  if (data.postal_code && !/^\d{6}$/.test(data.postal_code)) {
    errors.push({ field: 'postal_code', message: 'Postal code: 6 digits' });
  }

  if (data.deadline) {
    const deadline = new Date(data.deadline);
    if (isNaN(deadline.getTime()) || deadline < new Date()) {
      errors.push({ field: 'deadline', message: 'Future deadline required' });
    }
  }

  return errors;
}

export function validateBidCreation(data: any): ErrandValidationError[] {
  const errors: ErrandValidationError[] = [];

  if (!data.errandId || isNaN(parseInt(data.errandId))) {
    errors.push({ field: 'errandId', message: 'Valid errand ID' });
  }

  if (!data.bidAmount) {
    errors.push({ field: 'bidAmount', message: 'Bid amount required' });
  } else {
    const amount = parseFloat(data.bidAmount);
    if (isNaN(amount) || amount < 0 || amount > 50000) {
      errors.push({ field: 'bidAmount', message: '\$0-\$50,000' });
    }
  }

  if (data.description && data.description.length > 500) {
    errors.push({ field: 'description', message: 'Max 500 chars' });
  }

  return errors;
}

export function validateRatingSubmission(data: any): ErrandValidationError[] {
  const errors: ErrandValidationError[] = [];

  if (!data.errandId || isNaN(parseInt(data.errandId))) {
    errors.push({ field: 'errandId', message: 'Valid errand ID' });
  }

  if (!data.rating) {
    errors.push({ field: 'rating', message: 'Rating required' });
  } else {
    const rating = parseInt(data.rating);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      errors.push({ field: 'rating', message: '1-5 stars' });
    }
  }

  if (data.comment && data.comment.length > 1000) {
    errors.push({ field: 'comment', message: 'Max 1000 chars' });
  }

  return errors;
}

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  (req as any).sanitize = sanitizeInput;
  next();
}

export function preventParameterPollution(req: Request, res: Response, next: NextFunction) {
  for (const key in req.query) {
    if (Array.isArray(req.query[key])) {
      req.query[key] = (req.query[key] as any)[0];
    }
  }
  next();
}

export function getValidCategories(): string[] {
  return ['household', 'tutoring', 'delivery', 'event-planning', 'pet-care', 'elderly-care', 'childcare', 'technology', 'health-fitness', 'transport', 'beauty', 'repairs', 'gardening', 'moving', 'catering', 'personal-care'];
}
