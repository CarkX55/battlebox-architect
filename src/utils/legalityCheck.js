import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';

export const UNIVERSES_BEYOND_AND_CUSTOM_SETS = new Set([
  'ltr', 'ltc', '40k', 'pip', 'who', 'rex', 'bot', 'sld', 'acr', 'mar', 'mrv',
  'tla', 'atla', 'ttla', 'tle', 'jtla', 'atle', 'ftla', 'ttle',
  'fin', 'afic', 'afin', 'fic', 'tfin', 'tfic',
  'tmt', 'atmt', 'tmc', 'ftmc', 'ttmc', 'ttmt',
  'spm', 'aspm', 'spe', 'tspm', 'sfc', 'clu', 'psdg', 'pspl',
  'und', 'unh', 'ung', 'ust', 'unf', 'h1r', 'h0r',
  'unk', 'cmb1', 'cmb2', 'htr', 'ph17', 'ph18', 'ph19', 'ph20', 'ph21', 'ph22', 'pund', 'ptg',
  'j21', 'y22', 'y23', 'y24', 'y25', 'y26', 'ea1', 'ea2'
]);

export function isUniversesBeyondOrCustom(card = {}) {
  if (!card) return false;
  const setCode = (card.set || '').toLowerCase().trim();
  if (UNIVERSES_BEYOND_AND_CUSTOM_SETS.has(setCode)) return true;
  if (setCode.includes('custom') || setCode.includes('ub')) return true;

  if (card.promo_types && Array.isArray(card.promo_types) && card.promo_types.includes('universesbeyond')) {
    return true;
  }
  if (card.security_stamp === 'triangle') return true;
  if (card.set_type === 'universes_beyond' || card.set_type === 'funny' || card.set_type === 'memorabilia' || card.set_type === 'token') {
    return true;
  }
  if (card.is_playtest || card.isPlaytest) return true;
  
  const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
  const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
  if (typeLine.includes('playtest') || typeLine.includes('gamer') || oracleText.includes('playtest')) {
    return true;
  }

  if (card.id && (String(card.id).startsWith('custom-') || String(card.id).includes('custom'))) {
    return true;
  }
  return false;
}

/**
 * Realiza un filtro doble de legalidad para una carta:
 * 1. Legalidad oficial en el formato según Scryfall
 * 2. Vetos casuales específicos del Battle Box
 * 3. Exclusión de Universes Beyond / Custom si allowCustomCards es false
 * 
 * @param {Object} card Objeto carta de la base de datos
 * @param {string} format Formato seleccionado (e.g. 'MODERN', 'STANDARD', 'PIONEER', 'LEGACY')
 * @param {boolean} allowCustomCards Si es false, excluye Universes Beyond y Custom cards
 * @returns {boolean} True si la carta es legal para jugar
 */
export function isCardLegalForBattleBox(card, format = 'MODERN', allowCustomCards = false) {
  if (!card) return false;
  const formatKey = (format || 'MODERN').toLowerCase();
  
  // 1. Legalidad oficial del formato según Scryfall
  if (card.legalities && card.legalities[formatKey] !== 'legal') {
    return false;
  }
  
  // 2. Exclusión de cartas digitales/Alchemy en formatos de mesa (Modern, Standard, Pioneer, Legacy)
  const isPaperFormat = !formatKey.includes('alchemy') && !formatKey.includes('historic');
  if (isPaperFormat && card.digital) {
    return false;
  }

  // 3. Vetos casuales propios del Battle Box
  if (BATTLEBOX_VETOS.includes(card.name)) {
    return false;
  }

  // 4. Exclusión estricta de Universes Beyond, Playtest y Custom Cards
  if (!allowCustomCards && isUniversesBeyondOrCustom(card)) {
    return false;
  }
  
  return true;
}

