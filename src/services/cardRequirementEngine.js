/**
 * src/services/cardRequirementEngine.js
 * 
 * Motor de Requisitos de Cartas y Detector de Cartas "Huérfanas".
 * 
 * Evalúa cuantitativamente si las cartas ancla y payoffs del mazo cuentan con 
 * la densidad de soporte necesaria en la biblioteca para funcionar con alta eficiencia.
 */

import { isLand } from './deckCalculator.js';

// Base de conocimiento determinista de requisitos de cartas ancla
const CARD_REQUIREMENT_RULES = [
  {
    cardName: "collected company",
    requiredCount: 22,
    check: (deck) => {
      const validTargets = deck.filter(c => !isLand(c) && (c.cmc || 0) <= 3 && c.type_line?.toLowerCase().includes('creature'));
      const count = validTargets.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      return {
        card: "Collected Company",
        expectedMin: 22,
        actualCount: count,
        isValid: count >= 22,
        issueDescription: `Solo hay ${count} criaturas de coste <= 3. Collected Company necesita al menos 22 para evitar fallar (whiff).`
      };
    }
  },
  {
    cardName: "the great henge",
    requiredCount: 5,
    check: (deck) => {
      const bigCreatures = deck.filter(c => !isLand(c) && (c.power >= 4 || (c.oracle_text || '').toLowerCase().includes('power 4')));
      const count = bigCreatures.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      return {
        card: "The Great Henge",
        expectedMin: 5,
        actualCount: count,
        isValid: count >= 5,
        issueDescription: `Solo hay ${count} criaturas con fuerza >= 4. The Great Henge pierde severamente su descuento de maná.`
      };
    }
  },
  {
    cardName: "mox amber",
    requiredCount: 10,
    check: (deck) => {
      const legendaries = deck.filter(c => (c.type_line || '').toLowerCase().includes('legendary'));
      const count = legendaries.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      return {
        card: "Mox Amber",
        expectedMin: 10,
        actualCount: count,
        isValid: count >= 10,
        issueDescription: `Solo hay ${count} permanentes legendarios. Mox Amber corre alto riesgo de ser un artefacto inerte.`
      };
    }
  },
  {
    cardName: "craterhoof behemoth",
    requiredCount: 18,
    check: (deck) => {
      const creatures = deck.filter(c => (c.type_line || '').toLowerCase().includes('creature') || (c.oracle_text || '').toLowerCase().includes('token'));
      const count = creatures.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);
      return {
        card: "Craterhoof Behemoth",
        expectedMin: 18,
        actualCount: count,
        isValid: count >= 18,
        issueDescription: `La densidad de criaturas (${count}) es baja para potenciar el remate masivo de Craterhoof Behemoth.`
      };
    }
  }
];

/**
 * Audita los requisitos de las cartas del mazo y detecta cartas huérfanas o lords ineficientes.
 * 
 * @param {Array} deck - Mazo completo
 * @returns {Object} Informe de cartas huérfanas e incumplimientos de requisitos
 */
export function auditCardRequirementsAndOrphans(deck = []) {
  const requirementFailures = [];
  const orphanCards = [];

  const spellsOnly = deck.filter(c => !isLand(c));

  // 1. Evaluar reglas de requisitos explícitas
  CARD_REQUIREMENT_RULES.forEach(rule => {
    const presentCard = spellsOnly.find(c => c.name?.toLowerCase().includes(rule.cardName));
    if (presentCard) {
      const result = rule.check(deck);
      if (!result.isValid) {
        requirementFailures.push(result);
      }
    }
  });

  // 2. Detectar "Lords Tribales Huérfanos" (ej: Goblin Chieftain con pocos Goblins)
  spellsOnly.forEach(card => {
    const text = (card.oracle_text || card.text || '').toLowerCase();
    const nameLower = (card.name || '').toLowerCase();

    // Detectar si la carta es un Lord o Bufador Tribal
    if (text.includes('other ') && text.includes('get +1/+1')) {
      // Extraer la tribu afectada
      const knownTribes = ['elf', 'goblin', 'zombie', 'vampire', 'human', 'merfolk', 'sliver', 'spirit', 'faerie', 'dragon'];
      const matchedTribe = knownTribes.find(t => text.includes(t));

      if (matchedTribe) {
        const matchingCreatures = spellsOnly.filter(c => 
          c.name.toLowerCase() !== nameLower && 
          (c.type_line || '').toLowerCase().includes(matchedTribe)
        );
        const totalMatchingQty = matchingCreatures.reduce((sum, c) => sum + (c.quantity || c.count || 1), 0);

        if (totalMatchingQty < 10) {
          orphanCards.push({
            cardName: card.name,
            reason: `Lord tribal de tipo "${matchedTribe}", pero solo hay ${totalMatchingQty} ${matchedTribe}s en el mazo. Pierde gran parte de su valor.`,
            matchingCount: totalMatchingQty
          });
        }
      }
    }
  });

  return {
    hasIssues: requirementFailures.length > 0 || orphanCards.length > 0,
    requirementFailures,
    orphanCards
  };
}
