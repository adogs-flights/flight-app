/**
 * Major Airports and their assigned colors
 */
export const MAJOR_AIRPORTS = ['JFK', 'LAX', 'YVR', 'YYZ', 'ORD'];

export const AIRPORT_COLORS = {
  'JFK': { bg: '#3b82f6', text: '#ffffff' }, // Blue
  'LAX': { bg: '#f97316', text: '#ffffff' }, // Orange
  'YVR': { bg: '#ef4444', text: '#ffffff' }, // Red
  'YYZ': { bg: '#10b981', text: '#ffffff' }, // Green
  'ORD': { bg: '#a855f7', text: '#ffffff' }, // Purple
  'OTHER': { bg: '#64748b', text: '#ffffff' } // Slate/Gray
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
