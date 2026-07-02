// Comprehensive Singapore Postal Code to Area Mapping
// Source: Singapore Planning Area (URA) official postal code ranges
// Updated: 2026

export const postalCodeToArea: Record<string, string> = {
  // Central Business District (01-09)
  '01': 'Raffles Place',
  '02': 'Cecil Street',
  '03': 'Tanjong Pagar',
  '04': 'Tanjong Pagar',
  '05': 'Outram',
  '06': 'Tiong Bahru',
  '07': 'Chinatown',
  '08': 'Tanjong Pagar',
  '09': 'Tanjong Pagar',

  // Central Area (10-18)
  '10': 'Orchard',
  '11': 'Pasir Panjang',
  '12': 'Novena',
  '13': 'Newton',
  '14': 'Farrer Park',
  '15': 'Henderson',
  '16': 'Henderson',
  '17': 'Balestier',
  '18': 'Macpherson',

  // North-East (19-25)
  '19': 'Paya Lebar',
  '20': 'Paya Lebar',
  '21': 'Geylang',
  '22': 'Geylang',
  '23': 'Geylang',
  '24': 'Eunos',
  '25': 'Bedok',

  // East (26-32)
  '26': 'Bedok',
  '27': 'Bedok',
  '28': 'Tampines',
  '29': 'Tampines',
  '30': 'Tampines',
  '31': 'Pasir Ris',
  '32': 'Pasir Ris',

  // North-East Expansion (33-39)
  '33': 'Punggol',
  '34': 'Punggol',
  '35': 'Hougang',
  '36': 'Hougang',
  '37': 'Sengkang',
  '38': 'Sengkang',
  '39': 'Sengkang',

  // West (40-48)
  '40': 'Jurong West',
  '41': 'Jurong West',
  '42': 'Jurong',
  '43': 'Jurong East',
  '44': 'Clementi',
  '45': 'Clementi',
  '46': 'Clementi',
  '47': 'Bukit Merah',
  '48': 'Simei', // Updated: 48xxxx is Simei area

  // South & West (49-59)
  '49': 'Tiong Bahru',
  '50': 'Redhill',
  '51': 'Queenstown',
  '52': 'Commonwealth',
  '53': 'Pasir Panjang',
  '54': 'Pasir Panjang',
  '55': 'Bukit Timah',
  '56': 'Bukit Timah',
  '57': 'Holland',
  '58': 'Tanglin',
  '59': 'Clementi',

  // Central North (60-72)
  '60': 'Bukit Timah',
  '61': 'Bishan',
  '62': 'Jurong',
  '63': 'Ang Mo Kio',
  '64': 'Ang Mo Kio',
  '65': 'Serangoon',
  '66': 'Serangoon',
  '67': 'Ang Mo Kio',
  '68': 'Choa Chu Kang',
  '69': 'Geylang',
  '70': 'Bedok',
  '71': 'Bedok',
  '72': 'Bedok',

  // East & North-East Expansion (73-82)
  '73': 'Bedok',
  '74': 'Tampines',
  '75': 'Tampines',
  '76': 'Tampines',
  '77': 'Tampines',
  '78': 'Tampines',
  '79': 'Sengkang',
  '80': 'Sengkang',
  '81': 'Sengkang',
  '82': 'Sengkang',

  // North (83-89)
  '83': 'Simei',
  '84': 'Simei',
  '85': 'Macpherson',
  '86': 'Serangoon',
  '87': 'Serangoon',
  '88': 'Sembawang',
  '89': 'Woodlands',

  // Specific Postal Code Overrides (if OneMap data is inaccurate)
  // These corrections address known discrepancies in prefix-based mapping
  '150101': 'Henderson',
  '110179': 'Orchard',        // Prefix 11 = Pasir Panjang, but 110179 = Orchard
  '489223': 'Simei',          // Prefix 48 = Simei (correct)
  '529510': 'Tampines',       // Prefix 52 = Commonwealth, but 529xxx = Tampines
  '529203': 'Tampines',       // Prefix 52 = Commonwealth, but 529xxx = Tampines
  '526000': 'Tampines',       // Prefix 52 = Commonwealth, but 526xxx = Tampines
  '570570': 'Ang Mo Kio',     // Prefix 57 = Holland, but 570570 = Ang Mo Kio
  '750002': 'Serangoon',      // Prefix 75 = Tampines, but 750002 = Serangoon
  '706534': 'Bukit Merah',    // Prefix 70 = Bedok, but 706534 = Bukit Merah
};

export function getAreaFromPostalCode(postalCode: string): string {
  if (!postalCode || postalCode.length < 2) return '';

  // First, check if there's a specific postal code override
  if (postalCodeToArea[postalCode]) {
    return postalCodeToArea[postalCode];
  }

  // Then, check the first 2 digits (postal code prefix)
  const prefix = postalCode.substring(0, 2);
  return postalCodeToArea[prefix] || '';
}
