/**
 * Major Airports and their assigned colors
 */
export const MAJOR_AIRPORTS = ['JFK', 'LAX', 'YVR', 'YYZ', 'ORD'];

/**
 * Mapping airport codes to country categories
 */
export const AIRPORT_TO_COUNTRY = {
  'JFK': '미국',
  'LAX': '미국',
  'ORD': '미국',
  'YVR': '캐나다',
  'YYZ': '캐나다'
};

/**
 * Returns country category by airport code
 * @param {string} code - Airport code
 * @returns {string} - '미국' | '캐나다' | '기타'
 */
export const getCountryByAirport = (code) => {
  if (!code) return '기타';
  const upperCode = code.toUpperCase();
  return AIRPORT_TO_COUNTRY[upperCode] || '기타';
};

export const AIRPORT_COLORS = {
  'JFK': { bg: '#e0f2fe', text: '#0369a1' }, // Sky Light / Sky Dark
  'LAX': { bg: '#fef3c7', text: '#92400e' }, // Earth Light / Earth
  'YVR': { bg: '#fee2e2', text: '#dc2626' }, // Red Light / Red
  'YYZ': { bg: '#dcfce7', text: '#16a34a' }, // Green Light / Green
  'ORD': { bg: '#ede9fe', text: '#7c3aed' }, // Purple Light / Purple
  'OTHER': { bg: '#f1f5f9', text: '#475569' } // Slate Light / Slate Dark
};

/**
 * Returns background and text color based on airport code
 * @param {string} code - Airport code (e.g., 'JFK')
 * @returns {object} - { bg, text }
 */
export const getAirportColor = (code) => {
  if (!code) return AIRPORT_COLORS.OTHER;
  
  const upperCode = code.toUpperCase();
  return AIRPORT_COLORS[upperCode] || AIRPORT_COLORS.OTHER;
};
