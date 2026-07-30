/**
 * src/judge/identity/DeckIdentityEngine.js
 * Deck Identity Engine for BattleBox Architect v7.
 * Establishes Primary Theme, Primary Engine, Win Path, and Forbidden Directions.
 */

export function buildDeckIdentity(formData = {}) {
  const promptLower = (formData.userPrompt || formData.prompt || '').toLowerCase();
  const archetypeLower = (formData.archetype || formData.arquetipo || '').toLowerCase();
  const tribeLower = (formData.tribe || formData.tribu || '').toLowerCase();
  const strategyLower = (formData.strategy || formData.estrategia || '').toLowerCase();

  const fullText = `${promptLower} ${archetypeLower} ${tribeLower} ${strategyLower}`;

  const isWallDeck = fullText.includes('muro') || fullText.includes('wall') || fullText.includes('defender');
  const isHeroDeck = fullText.includes('hero') || fullText.includes('héroe');
  const isSurveilDeck = fullText.includes('surveil') || fullText.includes('vigilancia');
  const isSacrificeDeck = fullText.includes('sacrif') || fullText.includes('aristocrat');
  const isArtifactDeck = fullText.includes('artefact') || fullText.includes('artifact') || fullText.includes('affinity');

  const forbiddenDirections = new Set();

  if (isWallDeck && !isHeroDeck) forbiddenDirections.add('hero');
  if (isWallDeck && !isSurveilDeck) forbiddenDirections.add('surveil');
  if (isWallDeck && !isSacrificeDeck) forbiddenDirections.add('sacrifice');
  if (!isArtifactDeck && !fullText.includes('robot')) forbiddenDirections.add('artifact_class');

  return Object.freeze({
    primaryTheme: isWallDeck ? 'Wall / Defender' : (tribeLower || archetypeLower || 'Midrange'),
    primaryEngine: isWallDeck ? 'Defender Stagnation & Toughness' : 'Value & Pressure',
    forbiddenDirections: Object.freeze(Array.from(forbiddenDirections)),

    isCardForbidden(card) {
      if (!card || !card.name) return false;
      const text = `${card.name} ${card.type_line || ''} ${card.oracle_text || ''}`.toLowerCase();

      // Block anti-defender cards (e.g. Wall Crawl boosting Spiders and making them unblockable by defenders)
      if (isWallDeck && card.oracle_text?.toLowerCase().includes("can't be blocked by creatures with defender")) {
        return true;
      }
      if (isWallDeck && (card.oracle_text?.toLowerCase().includes('spiders you control') || card.name.toLowerCase() === 'wall crawl')) {
        return true;
      }

      // Block Hero tribal cards if deck is not Hero tribal
      if (forbiddenDirections.has('hero') && (text.includes('hero') || text.includes('heroes'))) {
        // Exception: Card doesn't require Heroes to function
        if (card.oracle_text?.toLowerCase().includes('heroes you control') || card.oracle_text?.toLowerCase().includes('other heroes')) {
          return true;
        }
      }

      // Block Surveil chaining in Wall decks
      if (forbiddenDirections.has('surveil') && text.includes('surveil') && !text.includes('wall') && !text.includes('defender')) {
        return true;
      }

      // Block random sacrifice engines in Wall decks
      if (forbiddenDirections.has('sacrifice') && (card.slot?.includes('sacrifice') || card.engine?.includes('sacrifice'))) {
        return true;
      }

      return false;
    }
  });
}
