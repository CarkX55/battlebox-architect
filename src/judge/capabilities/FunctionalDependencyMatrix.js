/**
 * src/judge/capabilities/FunctionalDependencyMatrix.js
 * Functional Dependency Matrix (Requires, Provides, Consumes, Enables, Conflicts).
 * Validates whether candidate cards have their functional prerequisites met by the deck.
 */

export function analyzeFunctionalDependencies(card, currentDeck = []) {
  const name = (card.name || '').toLowerCase();
  const oracleText = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || '').toLowerCase();

  const deckText = currentDeck.map(c => `${c.name} ${c.type_line || ''} ${c.oracle_text || ''}`).join(' ').toLowerCase();

  const requires = [];
  const provides = [];

  // Detect Requires
  if (oracleText.includes('heroes you control') || oracleText.includes('other heroes')) {
    requires.push('hero_density');
  }
  if (oracleText.includes('whenever you sacrifice') || oracleText.includes('sacrifice a creature:')) {
    requires.push('sacrifice_fodder');
  }

  // Detect Provides
  if (typeLine.includes('wall') || typeLine.includes('defender') || oracleText.includes('wall creature token')) {
    provides.push('wall_defender');
  }
  if (oracleText.includes('add ') || typeLine.includes('land')) {
    provides.push('mana');
  }

  // Check if dependencies are satisfied in deck
  let isSatisfied = true;
  let missingRequirement = null;

  for (const req of requires) {
    if (req === 'hero_density') {
      const heroCount = currentDeck.filter(c => (c.type_line || '').toLowerCase().includes('hero')).length;
      if (heroCount < 2) {
        isSatisfied = false;
        missingRequirement = 'hero_density';
        break;
      }
    } else if (req === 'sacrifice_fodder') {
      const fodderCount = currentDeck.filter(c => (c.oracle_text || '').toLowerCase().includes('create a') && (c.oracle_text || '').toLowerCase().includes('token')).length;
      if (fodderCount < 3) {
        isSatisfied = false;
        missingRequirement = 'sacrifice_fodder';
        break;
      }
    }
  }

  return Object.freeze({
    cardName: card.name,
    requires: Object.freeze(requires),
    provides: Object.freeze(provides),
    isSatisfied,
    missingRequirement
  });
}
