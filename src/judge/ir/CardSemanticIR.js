/**
 * src/judge/ir/CardSemanticIR.js
 * Level 1 Card Semantic Intermediate Representation.
 * Extracts atomic semantic facts from card text/attributes before DSL mapping.
 */

export function buildCardSemanticIR(card) {
  if (!card || !card.name) {
    throw new Error('CardSemanticIR requires a valid card object with a name.');
  }

  const typeLine = (card.type_line || card.category || '').toLowerCase();
  const oracleText = (card.oracle_text || card.text || '').toLowerCase();
  const manaCost = card.mana_cost || card.cost || '';
  const cmc = Number(card.mana_value || card.cmc || 0);
  const colors = card.colors || card.color_identity || [];

  const isCreature = typeLine.includes('creature');
  const isLand = typeLine.includes('land') || ['plains','island','swamp','mountain','forest','yermo','wastes'].includes(card.name.toLowerCase());
  const isInstant = typeLine.includes('instant');
  const isSorcery = typeLine.includes('sorcery');
  const isEnchantment = typeLine.includes('enchantment');
  const isArtifact = typeLine.includes('artifact');

  const semanticFacts = new Set();

  if (isLand) semanticFacts.add('LandSource');
  if (isCreature) semanticFacts.add('CreaturePermanent');
  if (oracleText.includes('add ') || oracleText.includes('search for a land') || oracleText.includes('put a land')) {
    semanticFacts.add('ProducesMana');
  }
  if (oracleText.includes('draw ') || oracleText.includes('look at the top')) {
    semanticFacts.add('CardAdvantage');
  }
  if (oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('counter target') || oracleText.includes('deal') && oracleText.includes('damage')) {
    semanticFacts.add('Interaction');
  }
  if (oracleText.includes('flying') || oracleText.includes('trample') || oracleText.includes('haste') || oracleText.includes('menace')) {
    semanticFacts.add('EvasionAttribute');
  }

  return Object.freeze({
    cardName: card.name,
    quantity: Number(card.quantity || 1),
    cmc,
    manaCost,
    typeLine,
    colors: Object.freeze([...colors]),
    isCreature,
    isLand,
    isInstant,
    isSorcery,
    isEnchantment,
    isArtifact,
    semanticFacts: Object.freeze(Array.from(semanticFacts))
  });
}
