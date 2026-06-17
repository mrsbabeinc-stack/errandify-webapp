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

const certificationSuggestions: Record<string, { required: string[]; optional: string[] }> = {
  'childcare-tutoring': {
    required: ['Enhanced DBS Check', 'First Aid (Pediatric)'],
    optional: ['Safeguarding Training', 'Teaching Qualification'],
  },
  'home-maintenance': {
    required: [],
    optional: ['Gas Safe Register', 'Electrical Safety'],
  },
  'pet-care': {
    required: [],
    optional: ['Animal First Aid', 'Pet Care Certification'],
  },
  'tech-support': {
    required: [],
    optional: ['CompTIA A+', 'Microsoft Certified'],
  },
  'delivery-moving': {
    required: [],
    optional: ['Driving License', 'Heavy Vehicle License'],
  },
};

// Clean title for use in description (remove "wash my", "help me", etc.)
function cleanTitleForDescription(title: string): string {
  let cleaned = title.trim();

  // Remove ending period for cleaner insertion into sentence
  cleaned = cleaned.replace(/\.$/, '');

  // Remove action verb + possessive combos (wash my, walk my, help me, etc.)
  cleaned = cleaned.replace(/^(help|wash|clean|walk|groom|feed|bathe|bath|babysit|tutor|repair|fix|install|deliver|move|shop|buy|teach|need) (me |my |him |his |her |your )/i, '');

  // Remove remaining common prefixes
  cleaned = cleaned.replace(/^(need |help with |help me |i need |can you |need to |need help )/, '');

  // Remove articles and remaining possessives at start
  cleaned = cleaned.replace(/^(my |a |the |your |his |her )/, '');

  return cleaned;
}

const descriptionTemplates: Record<string, (title: string) => string> = {
  'home-maintenance': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Need help with ${cleaned}. Please bring own tools and materials. Work must be completed professionally and safely.`;
  },
  'cleaning-laundry': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Looking for someone to help with ${cleaned}. Please specify if you prefer eco-friendly products or have any restrictions (allergies, pets, sensitive materials).`;
  },
  'shopping-errands': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Need someone to ${cleaned}. Will provide shopping list/specific brands. Please keep receipts for reimbursement.`;
  },
  'delivery-moving': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Assistance needed with ${cleaned}. Careful and proper handling required. Please inform about any fragile or special items needing extra care.`;
  },
  'childcare-tutoring': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Seeking help with ${cleaned}. References and relevant experience required. Will provide detailed instructions and emergency contact information.`;
  },
  'pet-care': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Help needed with ${cleaned}. Pet-friendly and experienced handlers only. Will provide pet care instructions, emergency vet info, and animal behavior notes.`;
  },
  'tech-support': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Need technical assistance with ${cleaned}. Please diagnose and document issues found. Data backup may be required before any major changes.`;
  },
  'moving-help': (title: string) => {
    const cleaned = cleanTitleForDescription(title);
    return `Help with ${cleaned}. Physical capability and reliability are important. Will provide furniture padding and access details (stairs, elevator, parking).`;
  },
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

// Remove duplicate/repeated characters in words (waaalk → walk, liiike → like)
function removeDuplicateCharacters(text: string): string {
  // Replace 3+ repeated characters with 2 (waaaalknmy → waaalknmy → waallknmy... eventually to walknmy)
  // But preserve intentional doubles like "ll" in "hello"
  return text.replace(/([a-z])\1{2,}/gi, '$1$1');
}

// Comprehensive spelling/punctuation correction
function correctSpellingAndPunctuation(text: string): { corrected: string; hasSuggestions: boolean } {
  let corrected = text.trim();
  const suggestions: string[] = [];

  // First, remove excessive repeated characters (waaalk → waalk)
  const withoutDuplicates = removeDuplicateCharacters(corrected);
  if (withoutDuplicates !== corrected) {
    corrected = withoutDuplicates;
    suggestions.push('Fixed repeated characters');
  }

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

  // Try to fix common words without spaces (e.g., "walkmy" → "walk my")
  // Common words that might be missing spaces
  const commonWords = ['walk', 'help', 'need', 'fix', 'clean', 'my', 'the', 'a', 'an', 'for', 'and', 'to', 'do', 'get', 'make', 'take'];

  // Split on common word boundaries if multiple words run together
  const words = corrected.toLowerCase().split(/\s+/);
  const processedWords: string[] = [];

  for (let word of words) {
    // Check if this word contains multiple dictionary words run together
    let bestSplit = word;
    let foundSplit = false;

    // Try to find if word contains known patterns like "walk" + "my"
    for (let i = 3; i < word.length && !foundSplit; i++) {
      const firstPart = word.substring(0, i);
      const secondPart = word.substring(i);

      if (commonWords.includes(firstPart) && secondPart.length > 0 &&
          (commonWords.includes(secondPart) || secondPart === 'dog' || secondPart === 'cat' ||
           secondPart === 'house' || secondPart === 'home' || secondPart === 'car' ||
           secondPart === 'tonight' || secondPart.length <= 10)) {
        bestSplit = firstPart + ' ' + secondPart;
        foundSplit = true;
      }
    }

    processedWords.push(bestSplit);
  }

  const withSpaceFix = processedWords.join(' ');
  if (withSpaceFix !== corrected) {
    corrected = withSpaceFix;
    suggestions.push('Added missing spaces between words');
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
    const isClothesWashing = /(wash|laundry|clothes|fabric|iron)/.test(lowerTitle) && !/(house|apartment|bedroom|bathroom|kitchen|office|floor|window|carpet|sofa|wall)/.test(lowerTitle);

    if (!isClothesWashing) {
      const hasArea = /(whole house|apartment|bedroom|bathroom|kitchen|office|windows|carpet|sofa|car)/.test(lowerTitle);
      if (!hasArea) {
        missingDetails.push('Area/room size (helps doer estimate time and prepare supplies)');
      }
      const hasCondition = /(dirty|very dirty|stained|pet mess|deep clean|light clean)/.test(lowerTitle);
      if (!hasCondition) {
        missingDetails.push('Cleaning level needed (light clean, deep clean, pet mess - affects effort)');
      }
    }

    const hasSpecial = /(special request|allergy|pet|kids|sensitive|fragrance|delicate|dry clean|wool)/.test(lowerTitle);
    if (!hasSpecial && !isClothesWashing) {
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

// Extract postal code from location string
function extractPostalCode(location: string): string | null {
  if (!location) return null;

  // Match 6-digit postal code
  const postalMatch = location.match(/\d{6}/);
  if (postalMatch) {
    return postalMatch[0];
  }

  return null;
}

// Suggest budget based on category and keywords
function suggestBudget(category: string, title: string): number | null {
  const lowerTitle = title.toLowerCase();

  // Check if budget is already mentioned
  const budgetMatch = lowerTitle.match(/\$?(\d+(?:\.\d{2})?)/);
  if (budgetMatch) {
    return parseFloat(budgetMatch[1]);
  }

  // Default budget suggestions by category (SGD)
  const defaultBudgets: Record<string, number> = {
    'home-maintenance': 100,
    'cleaning-laundry': 50,
    'shopping-errands': 30,
    'delivery-moving': 60,
    'childcare-tutoring': 80,
    'pet-care': 40,
    'tech-support': 75,
    'moving-help': 150,
  };

  return defaultBudgets[category] || 50;
}

// Suggest notes/details for doer based on category and keywords
function suggestNotes(category: string, title: string): string {
  const lowerTitle = title.toLowerCase();

  const noteTemplates: Record<string, string> = {
    'home-maintenance': 'Please bring your own tools. Ensure work is completed safely and professionally. Lock up properly when done.',
    'cleaning-laundry': 'Please use eco-friendly cleaning products if available. Vacuum and mop all areas. Handle delicate items carefully.',
    'shopping-errands': 'Keep all receipts for reimbursement. Call if items are out of stock. Pack fragile items carefully.',
    'delivery-moving': 'Handle with care, especially fragile items. Please take photos before and after. Ensure safe delivery.',
    'childcare-tutoring': 'Emergency contact numbers will be provided. Please arrive 10 minutes early. Follow house rules and bedtime routine.',
    'pet-care': 'All pet instructions will be provided. Please keep gates/doors secure. Report any health concerns immediately.',
    'tech-support': 'Please backup data before any major changes. Test all functionality after completion. Document any issues found.',
    'moving-help': 'Wear appropriate footwear. Take breaks as needed. Use proper lifting techniques. Furniture padding provided.',
  };

  return noteTemplates[category] || 'Please ensure all work is completed as discussed. Contact if any issues arise.';
}

// Suggest skills based on category and keywords
function suggestSkills(category: string, title: string): string[] {
  const lowerTitle = title.toLowerCase();
  const suggestedSkills: Set<string> = new Set();

  const skillsByCategory: Record<string, string[]> = {
    'home-maintenance': ['Carpentry', 'Plumbing', 'Electrical work', 'Drywall repair', 'Painting'],
    'cleaning-laundry': ['House cleaning', 'Deep cleaning', 'Laundry service', 'Organization', 'Decluttering'],
    'shopping-errands': ['Shopping', 'Delivery', 'Time management', 'Budget management'],
    'delivery-moving': ['Heavy lifting', 'Packing', 'Transportation', 'Logistics', 'Physical fitness'],
    'childcare-tutoring': ['Childcare', 'Teaching', 'Patience', 'CPR/First Aid', 'Subject expertise'],
    'pet-care': ['Dog walking', 'Dog training', 'Pet grooming', 'Animal care', 'Pet sitting'],
    'tech-support': ['Computer repair', 'Troubleshooting', 'Software installation', 'Hardware setup', 'Social media management'],
    'moving-help': ['Heavy lifting', 'Organization', 'Packing', 'Furniture assembly', 'Logistics'],
  };

  // Add category-based skills
  if (skillsByCategory[category]) {
    skillsByCategory[category].forEach((skill) => suggestedSkills.add(skill));
  }

  // Add keyword-based skills
  if (lowerTitle.includes('paint')) suggestedSkills.add('Painting');
  if (lowerTitle.includes('electric') || lowerTitle.includes('wiring')) suggestedSkills.add('Electrical work');
  if (lowerTitle.includes('plumb')) suggestedSkills.add('Plumbing');
  if (lowerTitle.includes('clean')) suggestedSkills.add('Cleaning');
  if (lowerTitle.includes('organize') || lowerTitle.includes('declutter')) suggestedSkills.add('Organization');
  if (lowerTitle.includes('tutor') || lowerTitle.includes('teach')) suggestedSkills.add('Teaching');
  if (lowerTitle.includes('babysit') || lowerTitle.includes('childcare')) suggestedSkills.add('Childcare');
  if (lowerTitle.includes('walk') && (lowerTitle.includes('dog') || lowerTitle.includes('pet'))) suggestedSkills.add('Dog walking');
  if (lowerTitle.includes('move') || lowerTitle.includes('pack')) suggestedSkills.add('Heavy lifting');
  if (lowerTitle.includes('computer') || lowerTitle.includes('tech') || lowerTitle.includes('software')) suggestedSkills.add('Technical support');

  return Array.from(suggestedSkills).slice(0, 5); // Return top 5 suggestions
}

// Suggest certifications based on category and keywords
function suggestCertifications(category: string, title: string): { required: string[]; optional: string[] } {
  const suggestions = certificationSuggestions[category] || { required: [], optional: [] };
  const lowerTitle = title.toLowerCase();

  // Additional keyword-based certification detection
  const certifications = { required: [...suggestions.required], optional: [...suggestions.optional] };

  // Plumbing-related
  if (lowerTitle.includes('plumb') && !certifications.optional.includes('Plumbing License')) {
    certifications.optional.push('Plumbing License');
  }

  // Electrical
  if ((lowerTitle.includes('electric') || lowerTitle.includes('wiring')) && !certifications.optional.includes('Electrical Safety')) {
    certifications.optional.push('Electrical Safety');
  }

  // Gas work
  if ((lowerTitle.includes('gas') || lowerTitle.includes('boiler')) && !certifications.optional.includes('Gas Safe Register')) {
    certifications.optional.push('Gas Safe Register');
  }

  // Driving
  if ((lowerTitle.includes('drive') || lowerTitle.includes('transport')) && !certifications.optional.includes('Driving License')) {
    certifications.optional.push('Driving License');
  }

  // First Aid general
  if ((lowerTitle.includes('first aid') || lowerTitle.includes('medical') || lowerTitle.includes('health')) && !certifications.optional.includes('First Aid')) {
    certifications.optional.push('First Aid');
  }

  return certifications;
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

    // Suggest certifications
    const suggestedCerts = suggestCertifications(suggestedCategory, correctedTitle);

    // Suggest skills
    const suggestedSkillsList = suggestSkills(suggestedCategory, correctedTitle);

    // Suggest budget
    const suggestedBudgetAmount = suggestBudget(suggestedCategory, correctedTitle);

    // Suggest notes for doer
    const suggestedNotes = suggestNotes(suggestedCategory, correctedTitle);

    res.json({
      success: true,
      data: {
        originalTitle: title,
        correctedTitle: hasCorrections ? correctedTitle : null,
        hasCorrections,
        category: suggestedCategory,
        description: suggestedDescription,
        budget: suggestedBudgetAmount,
        missingDetails,
        certifications: suggestedCerts,
        skills: suggestedSkillsList,
        notes: suggestedNotes,
        contentSafe: true,
      },
    });
  } catch (error) {
    console.error('AI suggestions error:', error);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

export default router;
