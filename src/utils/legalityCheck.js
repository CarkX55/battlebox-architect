import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';

export const UNIVERSES_BEYOND_AND_CUSTOM_SETS = new Set([
  'ltr', 'ltc', '40k', 'pip', 'who', 'rex', 'bot', 'sld', 'acr', 'mar', 'mrv',
  'tla', 'atla', 'ttla', 'tle', 'jtla', 'atle', 'ftla', 'ttle',
  'fin', 'afic', 'afin', 'fic', 'tfin', 'tfic',
  'tmt', 'atmt', 'tmc', 'ftmc', 'ttmc', 'ttmt',
  'spm', 'aspm', 'spe', 'tspm', 'sfc', 'clu', 'psdg', 'pspl',
  'und', 'unh', 'ung', 'ust', 'unf', 'h1r', 'h0r'
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
  if (card.set_type === 'universes_beyond' || card.set_type === 'funny' || card.set_type === 'memorabilia') {
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
  
  // 2. Vetos casuales propios del Battle Box
  if (BATTLEBOX_VETOS.includes(card.name)) {
    return false;
  }

  // 3. Exclusión estricta de Universes Beyond y Custom Cards
  if (!allowCustomCards && isUniversesBeyondOrCustom(card)) {
    return false;
  }
  
  return true;
}

