/**
 * Default fallback colors if not specified in DB
 */
export const DEFAULT_AIRPORT_COLOR = { bg: '#f1f5f9', text: '#475569' };

/**
 * Returns country category by airport code from rawAirports data
 * @param {string} code - Airport code
 * @param {Array} rawAirports - Raw airport data from DB
 * @returns {string} - '미국' | '캐나다' | '기타'
 */
export const getCountryByAirport = (code, rawAirports = []) => {
  if (!code) return '기타';
  const upperCode = code.toUpperCase();
  const airport = rawAirports.find(a => a.code.toUpperCase() === upperCode);
  return airport ? airport.country : '기타';
};

/**
 * Returns background and text color based on airport code from rawAirports data
 * @param {string} code - Airport code (e.g., 'JFK')
 * @param {Array} rawAirports - Raw airport data from DB
 * @returns {object} - { bg, text }
 */
export const getAirportColor = (code, rawAirports = []) => {
  if (!code) return DEFAULT_AIRPORT_COLOR;
  
  const upperCode = code.toUpperCase();
  const airport = rawAirports.find(a => a.code.toUpperCase() === upperCode);
  
  if (airport && airport.bg_color && airport.text_color) {
    return { bg: airport.bg_color, text: airport.text_color };
  }
  
  return DEFAULT_AIRPORT_COLOR;
};

// MAJOR_AIRPORTS는 정렬용으로 유지 (필요시 DB의 sort_order 등으로 대체 가능)
export const MAJOR_AIRPORTS = ['JFK', 'LAX', 'YVR', 'YYZ', 'ORD'];
