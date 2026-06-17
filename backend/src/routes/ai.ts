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
    'acare': 'care',
    'acared': 'cared',
    'henders': 'henders',
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

  // Remove trailing standalone numbers (likely budget that shouldn't be in title)
  if (/\s+\d+\s*$/.test(corrected)) {
    corrected = corrected.replace(/\s+\d+\s*$/, '');
    suggestions.push('Removed trailing budget number');
  }

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

  // Check for elderly/parent care scenarios
  const isEldercareSituation = /\b(mom|dad|mother|father|parent|elderly|senior|grandma|grandpa|grandmother|grandfather)\b/.test(lowerTitle);

  const noteTemplates: Record<string, string> = {
    'home-maintenance': 'Please bring your own tools. Ensure work is completed safely and professionally. Lock up properly when done.',
    'cleaning-laundry': 'Please use eco-friendly cleaning products if available. Vacuum and mop all areas. Handle delicate items carefully.',
    'shopping-errands': 'Keep all receipts for reimbursement. Call if items are out of stock. Pack fragile items carefully.',
    'delivery-moving': 'Handle with care, especially fragile items. Please take photos before and after. Ensure safe delivery.',
    'childcare-tutoring': isEldercareSituation
      ? 'Please be patient and attentive. Emergency contact numbers will be provided. Report any health concerns immediately. Handle mobility assistance carefully if needed.'
      : 'Emergency contact numbers will be provided. Please arrive 10 minutes early. Follow house rules and bedtime routine.',
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

    // Correct spelling and punctuation (but remove period for now - will re-add after cleaning)
    let correctedTitle = title.trim();

    // Apply spell/punctuation corrections manually to avoid period interference
    const { corrected: spellCorrected } = correctSpellingAndPunctuation(title);
    // Use the spell-corrected version but remove trailing period if present
    correctedTitle = spellCorrected.replace(/\.$/, '');

    // Clean up title: remove time, duration, budget, locations, and dates
    let cleanedTitle = correctedTitle;

    // Remove time patterns (9am, 4pm, 14:00, morning, afternoon, etc.)
    cleanedTitle = cleanedTitle.replace(/\s+(\d{1,2}(?:am|pm|:\d{2})|morning|afternoon|evening|night)\b/gi, '');

    // Remove duration patterns (1hour, 2 hours, 30min, 30 m, etc.)
    cleanedTitle = cleanedTitle.replace(/\s+\d+(?:\.\d+)?\s*(hour|hr|min|minute|m|day|d)\b/gi, '');

    // Remove budget patterns ($50, budget 50, etc.) and trailing numbers (before period)
    cleanedTitle = cleanedTitle.replace(/\s*\$\s*\d+\b/g, '');
    cleanedTitle = cleanedTitle.replace(/\s+budget\s+\d+\b/gi, '');
    cleanedTitle = cleanedTitle.replace(/\s+\d+\s*$/, '');

    // Remove common locations
    const locations = ['orchard', 'marina bay', 'tampines', 'jurong', 'clementi', 'bishan', 'serangoon', 'bedok', 'geylang', 'east coast', 'hougang', 'punggol', 'everton', 'bukit timah', 'holland', 'tanglin'];
    for (const loc of locations) {
      cleanedTitle = cleanedTitle.replace(new RegExp(`\\s*(?:at|in|near|to)?\\s*${loc}\\b`, 'gi'), '');
    }

    // Remove day names
    cleanedTitle = cleanedTitle.replace(/\s+(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun|today|tomorrow|tmr)\b/gi, '');

    // Clean up any double spaces
    cleanedTitle = cleanedTitle.replace(/\s+/g, ' ').trim();

    // Capitalize first letter
    if (cleanedTitle && cleanedTitle[0] === cleanedTitle[0].toLowerCase()) {
      cleanedTitle = cleanedTitle[0].toUpperCase() + cleanedTitle.slice(1);
    }

    // Re-ensure proper punctuation on cleaned title
    if (cleanedTitle && !/[.!?]$/.test(cleanedTitle)) {
      cleanedTitle += '.';
    }

    const hasCorrections = spellCorrected !== title || cleanedTitle !== correctedTitle;

    // Detect category
    const suggestedCategory = detectCategory(cleanedTitle);

    // Generate description
    const suggestedDescription = generateDescription(suggestedCategory, cleanedTitle);

    // Detect missing important details
    const missingDetails = detectMissingDetails(cleanedTitle);

    // Suggest certifications
    const suggestedCerts = suggestCertifications(suggestedCategory, cleanedTitle);

    // Suggest skills
    const suggestedSkillsList = suggestSkills(suggestedCategory, cleanedTitle);

    // Suggest budget
    const suggestedBudgetAmount = suggestBudget(suggestedCategory, cleanedTitle);

    // Suggest notes for doer
    const suggestedNotes = suggestNotes(suggestedCategory, cleanedTitle);

    res.json({
      success: true,
      data: {
        originalTitle: title,
        correctedTitle: hasCorrections ? cleanedTitle : null,
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

// Content filter - check for inappropriate content
router.post('/content-filter', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const content = `${title} ${description || ''}`.toLowerCase();

    // Check for inappropriate terms
    for (const term of inappropriateTerms) {
      if (content.includes(term)) {
        return res.json({
          success: true,
          data: { status: 'FLAG', reason: 'Inappropriate content detected' },
        });
      }
    }

    // Check for discrimination (with exceptions)
    for (const { term, allowException } of discriminatoryTerms) {
      if (content.includes(term)) {
        if (!allowException) {
          return res.json({
            success: true,
            data: { status: 'FLAG', reason: 'Discriminatory language detected' },
          });
        }
        // For allowed exceptions (gender in legitimate context), check if context is valid
        if (allowException) {
          let isLegitimate = false;
          for (const context of legitimateGenderContexts) {
            if (content.includes(context)) {
              isLegitimate = true;
              break;
            }
          }
          if (!isLegitimate) {
            return res.json({
              success: true,
              data: { status: 'FLAG', reason: 'Gender specification requires legitimate context' },
            });
          }
        }
      }
    }

    // Content is safe
    res.json({
      success: true,
      data: { status: 'SAFE' },
    });
  } catch (error) {
    console.error('Content filter error:', error);
    res.status(500).json({ error: 'Failed to check content' });
  }
});

// Detect category from text
router.post('/detect-category', async (req: Request, res: Response) => {
  try {
    const { title, description } = req.body;
    const text = `${title} ${description || ''}`;
    const category = detectCategory(text);

    res.json({
      success: true,
      data: { category: category || '' },
    });
  } catch (error) {
    console.error('Category detection error:', error);
    res.status(500).json({ error: 'Failed to detect category' });
  }
});

// Parse natural language date/time
router.post('/parse-datetime', async (req: Request, res: Response) => {
  try {
    const { input } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input required' });
    }

    // Simple natural language parsing
    const now = new Date();
    let date = now.toISOString().split('T')[0];
    let time = '10:00';

    const lowerInput = input.toLowerCase();

    // Parse date
    if (lowerInput.includes('tomorrow')) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      date = tomorrow.toISOString().split('T')[0];
    } else if (lowerInput.includes('today')) {
      date = now.toISOString().split('T')[0];
    } else if (lowerInput.includes('next week')) {
      const nextWeek = new Date(now);
      nextWeek.setDate(nextWeek.getDate() + 7);
      date = nextWeek.toISOString().split('T')[0];
    } else {
      // Try to extract date pattern (e.g., "25/12" or "December 25")
      const dateMatch = input.match(/(\d{1,2})[/-](\d{1,2})/);
      if (dateMatch) {
        const [, day, month] = dateMatch;
        const parsedDate = new Date(now.getFullYear(), parseInt(month) - 1, parseInt(day));
        date = parsedDate.toISOString().split('T')[0];
      }
    }

    // Parse time
    const timeMatch = input.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] || '00';
      const period = timeMatch[3]?.toLowerCase();

      if (period === 'pm' && hours !== 12) hours += 12;
      if (period === 'am' && hours === 12) hours = 0;

      time = `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    res.json({
      success: true,
      data: { date, time },
    });
  } catch (error) {
    console.error('DateTime parsing error:', error);
    res.status(500).json({ error: 'Failed to parse date/time' });
  }
});

// Suggest completion for title input
router.post('/suggest-completion', async (req: Request, res: Response) => {
  try {
    const { title } = req.body;

    if (!title || title.length < 3) {
      return res.json({ success: true, data: { suggestions: [] } });
    }

    // Common task suggestions based on keywords
    const suggestions: string[] = [];

    for (const [category, keywords] of Object.entries(categoryMapping)) {
      for (const keyword of keywords) {
        if (title.toLowerCase().includes(keyword)) {
          // Add some common tasks for this category
          const commonTasks: Record<string, string[]> = {
            'home-maintenance': [
              `Help me with ${title}`,
              `Repair: ${title}`,
              `Fix my ${title}`,
              `Install ${title}`,
            ],
            'cleaning-laundry': [
              `Clean my ${title}`,
              `Wash ${title}`,
              `Laundry: ${title}`,
              `Deep clean: ${title}`,
            ],
            'pet-care': [
              `${title} for my pet`,
              `Pet ${title} service`,
              `Need ${title} for dog/cat`,
            ],
          };

          if (commonTasks[category]) {
            suggestions.push(...commonTasks[category].slice(0, 2));
          }
          break;
        }
      }
    }

    // Remove duplicates and limit to 3
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 3);

    res.json({
      success: true,
      data: { suggestions: uniqueSuggestions },
    });
  } catch (error) {
    console.error('Completion suggestion error:', error);
    res.status(500).json({ error: 'Failed to suggest completion' });
  }
});

// Parse time from freeform input (e.g., "4pm", "14:00", "2pm")
function parseTimeFromInput(text: string): string | null {
  const lowerText = text.toLowerCase();

  // Match patterns like "4pm", "4 pm", "3pm", "2:30pm" - word boundary before but not after
  // (because "3pm" might follow other text like "20min 3pm")
  const timeMatch = lowerText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = timeMatch[2] || '00';
    const period = timeMatch[3];

    // Validate 12-hour format (1-12)
    if (hours < 1 || hours > 12) return null;

    if (period === 'pm' && hours !== 12) {
      hours += 12;
    } else if (period === 'am' && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return null;
}

// Parse duration from freeform input (e.g., "1hour", "2 hours", "30min")
function parseDurationFromInput(text: string): { duration: string; unit: string } | null {
  const lowerText = text.toLowerCase();

  // Match patterns like "30min", "2 hours", "1.5hr", "20 m" - REQUIRE unit keyword
  // Use negative lookahead to avoid matching postal codes like "082001"
  const durationMatch = lowerText.match(/\b(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|min|m(?:in)?|days?|d(?:ay)?)\b/);
  if (durationMatch) {
    const value = durationMatch[1];
    const unit = durationMatch[2];

    let normalizedUnit = 'Hr';
    if (unit.match(/^(min|m)/i)) normalizedUnit = 'Min';
    else if (unit.match(/^(day|d)/i)) normalizedUnit = 'Day';
    else if (unit.match(/week/i)) normalizedUnit = 'Week';

    return { duration: value, unit: normalizedUnit };
  }

  return null;
}

// Extract task info from freeform input using local pattern matching
router.post('/extract-task-info', (req: Request, res: Response) => {
  try {
    const { input } = req.body;

    if (!input || input.length < 2) {
      return res.status(400).json({ error: 'Input too short' });
    }

    const text = input.toLowerCase().trim();

    // Remove Singlish particles
    const cleaned = text.replace(/\s+(lor|lah|leh|meh)\s*/g, ' ').trim();

    // Date mapping
    const dateMap: Record<string, string> = {
      'today': '2026-06-17',
      'tomorrow': '2026-06-18',
      'tmr': '2026-06-18',
      'monday': '2026-06-17',
      'mon': '2026-06-17',
      'tuesday': '2026-06-17',
      'tue': '2026-06-17',
      'wednesday': '2026-06-18',
      'wed': '2026-06-18',
      'thursday': '2026-06-19',
      'thu': '2026-06-19',
      'friday': '2026-06-20',
      'fri': '2026-06-20',
      'saturday': '2026-06-21',
      'sat': '2026-06-21',
      'sunday': '2026-06-22',
      'sun': '2026-06-22',
    };

    // Time mapping
    const timeMap: Record<string, string> = {
      '9am': '09:00', '10am': '10:00', '11am': '11:00', '12pm': '12:00',
      'noon': '12:00', '2pm': '14:00', '3pm': '15:00', '4pm': '16:00',
      '5pm': '17:00', '6pm': '18:00', '7pm': '19:00', '8pm': '20:00',
      'morning': '09:00', 'afternoon': '14:00', 'evening': '18:00', 'night': '20:00',
    };

    // Category keywords
    const categoryMap: Record<string, string[]> = {
      'pet-care': ['walk dog', 'bathe dog', 'groom', 'pet', 'dog', 'cat', 'animal'],
      'cleaning-laundry': ['clean', 'wash', 'laundry', 'mop', 'vacuum', 'dust'],
      'home-maintenance': ['fix', 'repair', 'paint', 'install', 'door', 'wall'],
      'shopping-errands': ['buy', 'shop', 'grocery', 'groceries', 'purchase'],
      'delivery-moving': ['deliver', 'move', 'transport', 'pickup'],
      'childcare-tutoring': ['babysit', 'tutor', 'teach', 'homework'],
      'tech-support': ['tech', 'computer', 'phone', 'software', 'laptop'],
    };

    // Singapore locations
    const locations = ['orchard', 'marina bay', 'tampines', 'jurong', 'clementi', 'bishan', 'serangoon', 'bedok', 'geylang', 'east coast', 'hougang', 'punggol', 'everton', 'bukit timah', 'holland', 'tanglin'];

    // Extract title - remove locations, times, dates, postal codes, and numbers
    let titleText = cleaned;

    // Remove common natural language artifacts (extra commas, spaces)
    titleText = titleText.replace(/\s*,\s*/g, ' '); // Replace commas with spaces
    titleText = titleText.replace(/\s+/g, ' '); // Collapse multiple spaces

    // Remove possessive phrases (my, your, his, her, the)
    titleText = titleText.replace(/^(wash|clean|help|need|get|find|do)\s+(my|your|his|her|the)\s+/i, '$1 ');

    // Remove postal codes (6-digit numbers like 082001)
    titleText = titleText.replace(/\b\d{6}\b/g, '');

    // Remove locations
    for (const loc of locations) {
      titleText = titleText.replace(new RegExp(`\\s*(?:at|in|near|to)?\\s*${loc}\\b`, 'gi'), '');
    }

    // Remove day names (monday, tuesday, etc. and abbreviations)
    titleText = titleText.replace(/\s+(monday|mon|tuesday|tue|wednesday|wed|thursday|thu|friday|fri|saturday|sat|sunday|sun|today|tomorrow|tmr)\b/gi, '');

    // Remove month names and dates (19 jun, 19 june, etc.)
    titleText = titleText.replace(/\s+\d{1,2}\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)\b/gi, '');

    // Remove time patterns (9am, 4pm, morning, afternoon, etc.)
    titleText = titleText.replace(/\s+(\d{1,2}(?:am|pm|:\d{2})|morning|afternoon|evening|night)\b/gi, '');

    // Remove duration patterns (1hour, 2 hours, 30min, 30 m, etc.)
    titleText = titleText.replace(/\s+\d+(?:\.\d+)?\s*(hour|hr|min|minute|m|day|d)\b/gi, '');

    // Remove budget patterns ($50, budget 50, etc.)
    titleText = titleText.replace(/\s*\$\s*\d+\b/g, '');
    titleText = titleText.replace(/\s+budget\s+\d+\b/gi, '');

    // Remove any remaining trailing numbers (likely budget or postal fragments)
    titleText = titleText.replace(/\s+\d+\s*$/, '');

    // Clean up double spaces again
    titleText = titleText.replace(/\s+/g, ' ').trim();

    let title = titleText.split(/at|in|on|by/)[0].trim().substring(0, 50) || input.substring(0, 50);

    // Capitalize first letter and clean up punctuation
    if (title) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
      // Add period if missing
      if (!/[.!?]$/.test(title)) {
        title += '.';
      }
    }

    // Extract category
    let category = '';
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(kw => cleaned.includes(kw))) {
        category = cat;
        break;
      }
    }

    // Extract location and postal code
    let location = '';
    let postalCode = '';

    // Valid Singapore postal code prefixes (01-82)
    const validPostalPrefixes = ['01', '02', '03', '04', '05', '06', '07', '08', '09',
      '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
      '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
      '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
      '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
      '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
      '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
      '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
      '80', '81', '82'];

    // First try to extract postal code (6-digit Singapore postal code)
    const postalMatch = cleaned.match(/\b(\d{6})\b/);
    if (postalMatch) {
      const code = postalMatch[1];
      const firstTwo = code.substring(0, 2);

      // Only accept if it's a valid postal code prefix
      if (validPostalPrefixes.includes(firstTwo)) {
        postalCode = code;
        // Accurate Singapore postal code area mapping
        const postalCodeAreas: Record<string, string> = {
          // 01-09: Central Business District & Surroundings
          '01': 'Raffles Place', '02': 'Cecil Street', '03': 'Tanjong Pagar', '04': 'Tanjong Pagar',
          '05': 'Outram', '06': 'People\'s Park', '07': 'Chinatown', '08': 'Tanjong Pagar', '09': 'Tanjong Pagar',
          // 10-19: Orchard & Central
          '10': 'Orchard', '11': 'Orchard', '12': 'Novena', '13': 'Newton', '14': 'Farrer Park',
          '15': 'Henderson', '16': 'Henderson', '17': 'Balestier', '18': 'Macpherson', '19': 'Paya Lebar',
          // 20-29: East
          '20': 'Paya Lebar', '21': 'Geylang', '22': 'Geylang', '23': 'Geylang', '24': 'Eunos',
          '25': 'Bedok', '26': 'Bedok', '27': 'Bedok', '28': 'Tampines', '29': 'Tampines',
          // 30-39: East & North-East
          '30': 'Tampines', '31': 'Pasir Ris', '32': 'Pasir Ris', '33': 'Punggol', '34': 'Punggol',
          '35': 'Hougang', '36': 'Hougang', '37': 'Sengkang', '38': 'Sengkang', '39': 'Sengkang',
          // 40-49: West
          '40': 'Jurong West', '41': 'Jurong West', '42': 'Jurong', '43': 'Jurong East', '44': 'Clementi',
          '45': 'Clementi', '46': 'Clementi', '47': 'Bukit Merah', '48': 'Bukit Merah', '49': 'Tiong Bahru',
          // 50-59: Central West
          '50': 'Redhill', '51': 'Queenstown', '52': 'Commonwealth', '53': 'Pasir Panjang', '54': 'Pasir Panjang',
          '55': 'Bukit Timah', '56': 'Bukit Timah', '57': 'Holland', '58': 'Tanglin', '59': 'Clementi',
          // 60-69: North & North-East (Bishan, Ang Mo Kio, Serangoon, Choa Chu Kang, Geylang)
          '60': 'Bukit Timah', '61': 'Bishan', '62': 'Bishan', '63': 'Ang Mo Kio', '64': 'Ang Mo Kio',
          '65': 'Serangoon', '66': 'Serangoon', '67': 'Ang Mo Kio', '68': 'Choa Chu Kang', '69': 'Geylang',
          // 70-79: East
          '70': 'Bedok', '71': 'Bedok', '72': 'Bedok', '73': 'Bedok', '74': 'Tampines',
          '75': 'Tampines', '76': 'Tampines', '77': 'Tampines', '78': 'Tampines', '79': 'Sengkang',
          // 80-82: North-East
          '80': 'Sengkang', '81': 'Sengkang', '82': 'Sengkang',
        };
        location = postalCodeAreas[firstTwo] || '';
      }
    }

    // If no postal code found, try named locations
    if (!location) {
      for (const loc of locations) {
        if (cleaned.includes(loc)) {
          location = loc.split(' ')[0];
          location = location.charAt(0).toUpperCase() + location.slice(1);
          break;
        }
      }
    }

    // Extract date
    let date = '';

    // First try hardcoded date map (today, tomorrow, etc.)
    for (const [key, val] of Object.entries(dateMap)) {
      if (cleaned.includes(key)) {
        date = val;
        break;
      }
    }

    // If not found, try parsing date like "19 Jun" or "19 june"
    if (!date) {
      const monthMap: Record<string, string> = {
        'jan': '01', 'january': '01', 'feb': '02', 'february': '02', 'mar': '03', 'march': '03',
        'apr': '04', 'april': '04', 'may': '05', 'jun': '06', 'june': '06', 'jul': '07', 'july': '07',
        'aug': '08', 'august': '08', 'sep': '09', 'september': '09', 'oct': '10', 'october': '10',
        'nov': '11', 'november': '11', 'dec': '12', 'december': '12',
      };

      const dateRegex = /(\d{1,2})\s+(jan|january|feb|february|mar|march|apr|april|may|jun|june|jul|july|aug|august|sep|september|oct|october|nov|november|dec|december)/i;
      const dateMatch = cleaned.match(dateRegex);
      if (dateMatch) {
        const day = dateMatch[1].padStart(2, '0');
        const monthStr = dateMatch[2].toLowerCase();
        const month = monthMap[monthStr];
        if (month) {
          date = `2026-${month}-${day}`;
        }
      }
    }

    // Extract time - use new parser
    let time = parseTimeFromInput(cleaned) || '';

    // Fallback to timeMap lookup if new parser didn't find it
    if (!time) {
      for (const [key, val] of Object.entries(timeMap)) {
        if (cleaned.includes(key)) {
          time = val;
          break;
        }
      }
    }

    // Extract duration
    const durationParse = parseDurationFromInput(cleaned);
    let duration = durationParse?.duration || '';
    let durationUnit = durationParse?.unit || 'Hr';

    // Extract budget (look for $ symbol, "budget" keyword, or standalone number at end)
    let budget = '';

    // First try to find $ symbol
    const dollarMatch = cleaned.match(/\$\s*(\d+)/);
    if (dollarMatch) {
      budget = dollarMatch[1];
    } else {
      // Look for budget keyword
      const budgetKeywordMatch = cleaned.match(/budget\s*[:\s]*(\d+)/i);
      if (budgetKeywordMatch) {
        budget = budgetKeywordMatch[1];
      } else {
        // Try to extract standalone number at the end (after removing time patterns)
        const trailingNumberMatch = cleaned.match(/(\d+)\s*$/);
        if (trailingNumberMatch) {
          budget = trailingNumberMatch[1];
        }
      }
    }

    // Generate AI description based on cleaned title and category
    let description = '';
    if (title && category) {
      const cleanedTitle = title.replace(/\.$/, '');
      const categoryDescMap: Record<string, string> = {
        'pet-care': `Help needed with ${cleanedTitle}. Pet-friendly and experienced handlers only.`,
        'cleaning-laundry': `Help needed with ${cleanedTitle}. Professional cleaning services required.`,
        'home-maintenance': `Help needed with ${cleanedTitle}. Skilled and experienced workers preferred.`,
        'shopping-errands': `Help needed with ${cleanedTitle}. Quick and reliable errand runner needed.`,
        'delivery-moving': `Help needed with ${cleanedTitle}. Strong and efficient helpers needed.`,
        'childcare-tutoring': `Help needed with ${cleanedTitle}. Qualified and experienced caregivers only.`,
        'tech-support': `Help needed with ${cleanedTitle}. Technical expertise required.`,
      };
      description = categoryDescMap[category] || `Help needed with ${cleanedTitle}.`;
    }

    res.json({
      success: true,
      data: {
        title,
        category,
        location,
        postalCode,
        date,
        time,
        duration,
        durationUnit,
        budget,
        description,
        notes: '',
      },
    });
  } catch (error: any) {
    console.error('Extract task info error:', error);
    res.status(500).json({ error: 'Failed to extract task information' });
  }
});

export default router;
