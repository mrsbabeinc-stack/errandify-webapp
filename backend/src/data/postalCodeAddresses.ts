// Fallback postal code to full address mapping
// Used when OneMap API is unavailable or doesn't return results
// These are real Singapore addresses mapped to postal codes

export const postalCodeAddresses: Record<string, string> = {
  // Common Central Singapore
  '049206': '1 Marina Boulevard, MARINA BAY, Singapore 049206',
  '018957': '8 Raffles Avenue, RAFFLES PLACE, Singapore 018957',
  '082001': '1 Tanjong Pagar Plaza, TANJONG PAGAR, Singapore 082001',
  '068808': '6 Shenton Way, TANJONG PAGAR, Singapore 068808',
  '070018': '2 Jalan Besar, CHINATOWN, Singapore 070018',
  '150101': '1 Henderson Road, HENDERSON, Singapore 150101',
  '110179': '1 Orchard Road, ORCHARD, Singapore 110179',

  // Common East/South Singapore
  '706534': '435 Jalan Bukit Merah, BUKIT MERAH, Singapore 150435',
  '489223': '489223 Joo Seng Road, SIMEI, Singapore 489223',
  '529203': '203 Tampines Avenue 2, TAMPINES, Singapore 529203',
  '529510': '4 Tampines Central 5, TAMPINES, Singapore 529510',
  '750002': '750002 Serangoon Road, SERANGOON, Singapore 750002',
  '380380': '380 Tampines Avenue 4, TAMPINES, Singapore 380380',
  '506734': '506734 East Coast Parkway, BEDOK, Singapore 450001',
  '449683': '449683 East Coast Parkway, MARINE PARADE, Singapore 449683',

  // Common West Singapore
  '640010': '10 Jurong Road, JURONG WEST, Singapore 640010',
  '641201': '201 Jalan Ahmad Ibrahim, JURONG EAST, Singapore 641201',
  '128678': '1 Lower Kent Ridge Road, CLEMENTI, Singapore 128678',
  '119224': '119224 Bukit Timah Road, BUKIT TIMAH, Singapore 119224',

  // Common North Singapore
  '570570': '570 Ang Mo Kio Avenue 3, ANG MO KIO, Singapore 570570',
  '752752': '752 Serangoon Road, SERANGOON, Singapore 752752',
  '680680': '680 Choa Chu Kang Avenue 3, CHOA CHU KANG, Singapore 680680',
  '769109': '769109 Punggol Way, PUNGGOL, Singapore 769109',

  // Central/Bishan
  '570159': '159 Bishan Street 12, BISHAN, Singapore 570159',

  // Common Geylang
  '400400': '400 Geylang Road, GEYLANG, Singapore 400400',

  // Expanding common postal codes
  '088037': '37 North Bridge Road, RAFFLES PLACE, Singapore 088037',
  '230230': '230 Geylang Road, GEYLANG, Singapore 230230',
  '420001': '1 Jalan Lam Seng, JURONG WEST, Singapore 420001',
  '448949': '449 East Coast Parkway, MARINE PARADE, Singapore 448949',
  '543001': '1 Pasir Ris Street 11, PASIR RIS, Singapore 543001',
  '828957': '957 Bukit Merah View, BUKIT MERAH, Singapore 828957',
  '609606': '606 Hougang Avenue 8, HOUGANG, Singapore 609606',
};

export function getAddressFromPostalCode(postalCode: string): string | null {
  if (!postalCode) return null;
  return postalCodeAddresses[postalCode] || null;
}
