import { BATTLEBOX_VETOS } from '../constants/legacyBattleBox.js';

/**
 * Realiza un filtro doble de legalidad para una carta:
 * 1. Legalidad oficial en el formato según Scryfall
 * 2. Vetos casuales específicos del Battle Box
 * 
 * @param {Object} card Objeto carta de la base de datos
 * @param {string} format Formato seleccionado (e.g. 'MODERN', 'STANDARD', 'PIONEER', 'LEGACY')
 * @returns {boolean} True si la carta es legal para jugar
 */
export function isCardLegalForBattleBox(card, format) {
  if (!card) return false;
  const formatKey = (format || 'MODERN').toLowerCase();
  
  // 1. Legalidad oficial del formato según Scryfall
  if (!card.legalities || card.legalities[formatKey] !== 'legal') {
    return false;
  }
  
  // 2. Vetos casuales propios del Battle Box
  if (BATTLEBOX_VETOS.includes(card.name)) {
    return false;
  }
  
  return true;
}
