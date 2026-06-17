import { Router, Request, Response } from 'express';

const router = Router();

// Content safety filter - inappropriate/explicit terms
const inappropriateTerms = [
  'sex', 'xxx', 'porn', 'adult only', 'nude', 'naked', 'sexual', 'explicit',
  'drugs', 'cocaine', 'heroin', 'meth', 'weed', 'cannabis',
  'illegal', 'stolen', 'weapon', 'gun', 'knife', 'bomb',
];

// Legitimate gender requirement contexts (culturally/professionally necessary)
const legitimateGenderContexts = ['childcare', 'eldercare', 'elderly care', 'bathing', 'bathroom', 'personal care', 'intimate care', 'muslim', 'religious', 'religious requirement', 'cultural requirement'];

// Discriminatory/biased language filter (with exceptions for legitimate needs)
const discriminatoryTerms = [
  // Race/ethnicity - NO EXCEPTIONS
  { term: 'only hire', reason: 'discriminatory hiring', allowException: false },
  { term: 'no asian', reason: 'racial discrimination', allowException: false },
  { term: 'no black', reason: 'racial discrimination', allowException: false },
  { term: 'no white', reason: 'racial discrimination', allowException: false },
  { term: 'no indian', reason: 'racial discrimination', allowException: false },
  { term: 'no latino', reason: 'racial discrimination', allowException: false },
  { term: 'no muslim', reason: 'religious discrimination', allowException: false },
  { term: 'no christian', reason: 'religious discrimination', allowException: false },
  { term: 'no jewish', reason: 'religious discrimination', allowException: false },
  // Age/gender - WITH EXCEPTIONS for legitimate contexts
  { term: 'young only', reason: 'age discrimination', allowException: false },
  { term: 'no old', reason: 'age discrimination', allowException: false },
  { term: 'men only', reason: 'gender discrimination', allowException: true },
  { term: 'women only', reason: 'gender discrimination', allowException: true },
  { term: 'female', reason: 'gender specification', allowException: true },
  { term: 'male', reason: 'gender specification', allowException: true },
  { term: 'no gay', reason: 'sexual orientation discrimination', allowException: false },
  { term: 'no transgender', reason: 'gender identity discrimination', allowException: false },
  // Disability - NO EXCEPTIONS
  { term: 'no disabled', reason: 'disability discrimination', allowException: false },
  { term: 'able bodied only', reason: 'disability discrimination', allowException: false },
  // Appearance - NO EXCEPTIONS
  { term: 'must be attractive', reason: 'appearance discrimination', allowException: false },
  { term: 'good looking', reason: 'appearance discrimination', allowException: false },
  { term: 'attractive only', reason: 'appearance discrimination', allowException: false },
];

// Detail keywords that require specification
const detailKeywords: Record<string, string[]> = {
  'size/weight': ['dog', 'cat', 'pet', 'furniture', 'package', 'item', 'box', 'load', 'cargo'],
  'color': ['car', 'vehicle', 'paint', 'dye', 'color', 'fabric'],
  'quantity': ['boxes', 'items', 'plants', 'books', 'pieces', 'bags'],
  'condition': ['repair', 'fix', 'broken', 'damage', 'restore', 'refurbish'],
  'urgency': ['asap', 'urgent', 'emergency', 'rush', 'immediately', 'today'],
};

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

// Check for inappropriate content
function checkContentSafety(text: string): { safe: boolean; issue: string } {
  const lowerText = text.toLowerCase();

  for (const term of inappropriateTerms) {
    if (lowerText.includes(term)) {
      return { safe: false, issue: `Content contains restricted term: "${term}"` };
    }
  }

  return { safe: true, issue: '' };
}

// Check for discriminatory/biased language (with exceptions for legitimate needs)
function checkBiasAndDiscrimination(text: string): { safe: boolean; issue: string } {
  const lowerText = text.toLowerCase();

  for (const { term, reason, allowException } of discriminatoryTerms) {
    if (lowerText.includes(term)) {
      // If this term allows exceptions, check if it's in a legitimate context
      if (allowException) {
        const hasLegitimateContext = legitimateGenderContexts.some(context =>
          lowerText.includes(context)
        );

        if (hasLegitimateContext) {
          // Allow gender specification in legitimate contexts (childcare, elderly care, etc.)
          continue;
        }
      }

      // No legitimate exception found - block it
      return {
        safe: false,
        issue: `Discriminatory content detected (${reason}). This violates fair hiring practices.`
      };
    }
  }

  return { safe: true, issue: '' };
}

// Comprehensive spelling/punctuation correction
function correctSpellingAndPunctuation(text: string): { corrected: string; hasSuggestions: boolean } {
  let corrected = text.trim();
  const suggestions: string[] = [];

  // Fix common spelling mistakes (extensive list)
  const commonMistakes: Record<string, string> = {
    // Common typos
    'teh': 'the',
    'taht': 'that',
    'hte': 'the',
    'adn': 'and',
    'og': 'to',
    'od': 'do',
    'fi': 'if',
    // Common misspellings
    'seperate': 'separate',
    'recieve': 'receive',
    'occured': 'occurred',
    'untill': 'until',
    'wich': 'which',
    'necesary': 'necessary',
    'occassion': 'occasion',
    'accomodate': 'accommodate',
    'dissapear': 'disappear',
    'definitly': 'definitely',
    'occured': 'occurred',
    'reccieve': 'receive',
    'occassionally': 'occasionally',
    'adress': 'address',
    'calender': 'calendar',
    'dosen\'t': 'doesn\'t',
    'doesnt': 'doesn\'t',
    'dont': 'don\'t',
    'thier': 'their',
    'ther': 'there',
    'recieved': 'received',
    'begining': 'beginning',
    'occured': 'occurred',
    'realy': 'really',
    'succeded': 'succeeded',
    'writting': 'writing',
    'acommodate': 'accommodate',
    'reccommend': 'recommend',
    'reccomend': 'recommend',
    'ocurrence': 'occurrence',
    'untill': 'until',
    'neccessary': 'necessary',
    'succesful': 'successful',
    'writting': 'writing',
  };

  for (const [wrong, right] of Object.entries(commonMistakes)) {
    const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
    if (regex.test(corrected)) {
      corrected = corrected.replace(regex, right);
      suggestions.push(`Corrected "${wrong}"→"${right}"`);
    }
  }

  // Fix multiple spaces
  if (/ {2,}/.test(corrected)) {
    corrected = corrected.replace(/ {2,}/g, ' ');
    suggestions.push('Removed extra spaces');
  }

  // Fix spacing around punctuation
  corrected = corrected.replace(/\s+([.,!?;:])/g, '$1');
  corrected = corrected.replace(/([.,!?;:])\s+([a-z])/g, '$1 $2');

  // Ensure proper capitalization at start
  if (corrected.length > 0 && corrected[0] === corrected[0].toLowerCase()) {
    corrected = corrected[0].toUpperCase() + corrected.slice(1);
    suggestions.push('Capitalized first letter');
  }

  // Capitalize 'I' pronoun
  corrected = corrected.replace(/\bi\b/g, 'I');

  // Add period if missing at end and no other punctuation
  if (corrected.length > 0 && !/[.!?]$/.test(corrected)) {
    corrected += '.';
    suggestions.push('Added period at end');
  }

  // Fix double punctuation
  corrected = corrected.replace(/([.!?]){2,}/g, '$1');

  return {
    corrected,
    hasSuggestions: suggestions.length > 0,
  };
}

// Detect missing important details (what the doer needs to know)
function detectMissingDetails(title: string): string[] {
  const lowerTitle = title.toLowerCase();
  const missingDetails: string[] = [];

  // PET CARE - What doers need to know
  if (lowerTitle.includes('dog')) {
    const hasDetails = /(small|medium|large|toy|giant|breed|aggressive|friendly|energetic|calm|puppy|senior)/.test(lowerTitle);
    if (!hasDetails) {
      missingDetails.push('Dog size/breed (affects walking pace, control, and safety precautions)');
    }
    const hasTemperament = /(friendly|aggressive|calm|anxious|energetic|timid)/.test(lowerTitle);
    if (!hasTemperament) {
      missingDetails.push('Dog temperament (friendly, anxious, aggressive - helps doer prepare)');
    }
    const hasSpecialNeeds = /(medical|medication|special diet|training|behavioral|leash|muzzle)/.test(lowerTitle);
    if (!hasSpecialNeeds) {
      missingDetails.push('Any special needs (medication, behavioral issues, training level)');
    }
  }

  if (lowerTitle.includes('cat')) {
    const hasDetails = /(indoor|outdoor|senior|kitten|persian|siamese|long.?hair|short.?hair)/.test(lowerTitle);
    if (!hasDetails) {
      missingDetails.push('Cat type/age (affects handling, indoors vs outdoors)');
    }
    const hasTemperament = /(friendly|aggressive|shy|affectionate|independent)/.test(lowerTitle);
    if (!hasTemperament) {
      missingDetails.push('Cat temperament (shy, friendly, independent - helps doer approach safely)');
    }
  }

  // HOME MAINTENANCE - What doers need to know
  if ((lowerTitle.includes('repair') || lowerTitle.includes('fix') || lowerTitle.includes('maintenance'))) {
    const hasProblem = /(broken|damage|leak|crack|stuck|loose|rusty|worn|malfunction|not working)/.test(lowerTitle);
    if (!hasProblem) {
      missingDetails.push('What\'s the problem? (broken, leaking, stuck, not working - helps doer diagnose)');
    }
    const hasLocation = /(kitchen|bathroom|bedroom|living|roof|door|window|wall|floor)/.test(lowerTitle);
    if (!hasLocation) {
      missingDetails.push('Location in house (helps doer prepare tools and estimate time)');
    }
    const hasUrgency = /(urgent|asap|today|emergency|leak|safety|flooding)/.test(lowerTitle);
    if (!hasUrgency) {
      missingDetails.push('Urgency level (emergency repairs vs routine maintenance)');
    }
  }

  // CLEANING/LAUNDRY - What doers need to know
  if ((lowerTitle.includes('clean') || lowerTitle.includes('wash') || lowerTitle.includes('laundry'))) {
    const hasArea = /(whole house|apartment|bedroom|bathroom|kitchen|office|windows|carpet|sofa|car)/.test(lowerTitle);
    if (!hasArea) {
      missingDetails.push('Area/room size (helps doer estimate time and prepare supplies)');
    }
    const hasCondition = /(dirty|very dirty|stained|pet mess|deep clean|light clean)/.test(lowerTitle);
    if (!hasCondition) {
      missingDetails.push('Cleaning level needed (light clean, deep clean, pet mess - affects effort)');
    }
    const hasSpecial = /(special request|allergy|pet|kids|sensitive|fragrance)/.test(lowerTitle);
    if (!hasSpecial) {
      missingDetails.push('Any allergies, pets, or special product requirements?');
    }
  }

  // SHOPPING/ERRANDS - What doers need to know
  if ((lowerTitle.includes('buy') || lowerTitle.includes('shop') || lowerTitle.includes('grocery') || lowerTitle.includes('shopping'))) {
    const hasList = /(list|items|specific|brands)/.test(lowerTitle);
    if (!hasList) {
      missingDetails.push('Will you provide a shopping list or brands/specific items?');
    }
    const hasBudget = /(\d+.*sgd|budget|amount|spend)/.test(lowerTitle);
    if (!hasBudget) {
      missingDetails.push('Budget/spending limit (helps doer make smart choices)');
    }
    const hasStore = /(supermarket|mall|specific store|online)/.test(lowerTitle);
    if (!hasStore) {
      missingDetails.push('Where to shop? (specific store, mall, supermarket)');
    }
  }

  // DELIVERY/MOVING - What doers need to know
  if ((lowerTitle.includes('move') || lowerTitle.includes('deliver') || lowerTitle.includes('transport') || lowerTitle.includes('pickup'))) {
    const hasWeight = /(heavy|light|fragile|big|small|furniture|box)/.test(lowerTitle);
    if (!hasWeight) {
      missingDetails.push('Item weight/size (affects equipment needed and safety)');
    }
    const hasDistance = /(distance|location|floor|stairs|lift|elevator)/.test(lowerTitle);
    if (!hasDistance) {
      missingDetails.push('Distance & access (stairs, elevator, ground floor - affects difficulty)');
    }
    const hasSpecial = /(fragile|careful|insured|valuable|special handling)/.test(lowerTitle);
    if (!hasSpecial) {
      missingDetails.push('Any fragile items or special handling needed?');
    }
  }

  // CHILDCARE/TUTORING - What doers need to know
  if ((lowerTitle.includes('childcare') || lowerTitle.includes('babysit') || lowerTitle.includes('tutor') || lowerTitle.includes('teach'))) {
    const hasAge = /(\d+.*year|infant|toddler|preschool|school.?age|teenager)/.test(lowerTitle);
    if (!hasAge) {
      missingDetails.push('Child age (affects activities, supervision level, care approach)');
    }
    const hasNeeds = /(special needs|allergies|dietary|medical|behavioral)/.test(lowerTitle);
    if (!hasNeeds) {
      missingDetails.push('Any special needs, allergies, or behavioral considerations?');
    }
    if (lowerTitle.includes('tutor') || lowerTitle.includes('teach')) {
      const hasSubject = /(math|english|science|language|subject|level)/.test(lowerTitle);
      if (!hasSubject) {
        missingDetails.push('Subject/level (helps tutor prepare curriculum)');
      }
    }
  }

  return missingDetails;
}

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

    // Check content safety first
    const safetyCheck = checkContentSafety(title);
    if (!safetyCheck.safe) {
      return res.status(400).json({
        success: false,
        error: safetyCheck.issue,
        blocked: true,
      });
    }

    // Check for discriminatory/biased content
    const biasCheck = checkBiasAndDiscrimination(title);
    if (!biasCheck.safe) {
      return res.status(400).json({
        success: false,
        error: biasCheck.issue,
        blocked: true,
      });
    }

    // Correct spelling and punctuation
    const { corrected: correctedTitle, hasSuggestions: hasCorrections } = correctSpellingAndPunctuation(title);

    // Detect category
    const suggestedCategory = detectCategory(correctedTitle);

    // Generate description
    const suggestedDescription = generateDescription(suggestedCategory, correctedTitle);

    // Detect missing important details
    const missingDetails = detectMissingDetails(correctedTitle);

    res.json({
      success: true,
      data: {
        originalTitle: title,
        correctedTitle: hasCorrections ? correctedTitle : null,
        hasCorrections,
        category: suggestedCategory,
        description: suggestedDescription,
        missingDetails,
        contentSafe: true,
      },
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
