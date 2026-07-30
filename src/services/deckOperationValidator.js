/**
 * src/services/deckOperationValidator.js
 * 
 * Hito 7: 12 Validadores SSOT de Contrato de Mazo
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';
import { countCopies, countWhere } from '../models/strategicState.js';

/**
 * Ejecuta los 12 validadores SSOT sobre la sesión de trabajo.
 * 
 * @param {Object} session Sesión de trabajo
 * @returns {Object} Resultado de validación { passed: boolean, errors: Array, warnings: Array, score: number }
 */
export function validateSessionDeck(session) {
  const deck = session?.working?.currentDeck || [];
  const errors = [];
  const warnings = [];

  const totalCardCopies = countCopies(deck);
  const targetDeckSize = session?.deckIntent?.deckSize || 60;

  // 1. LegalityValidator
  if (totalCardCopies !== targetDeckSize) {
    errors.push(`LegalityValidator: El mazo debe tener exactamente ${targetDeckSize} cartas (actual: ${totalCardCopies})`);
  }

  const counts = {};
  for (const card of deck) {
    const qty = Number(card.quantity || 1);
    if (!card.type_line?.includes('Basic Land')) {
      counts[card.name] = (counts[card.name] || 0) + qty;
      if (counts[card.name] > 4) {
        errors.push(`LegalityValidator: ${card.name} excede el límite de 4 copias (actual: ${counts[card.name]})`);
      }
    }
  }

  // 2. BlueprintValidator
  const blueprint = session?.working?.blueprint;
  if (!blueprint) {
    warnings.push('BlueprintValidator: No hay Blueprint activo en la sesión');
  }

  // 3. RoleValidator
  for (const card of deck) {
    const prof = analyzeCardIntelligence(card);
    if (card.slot && card.slot !== 'mana_base_slot' && prof.produces.length === 0 && prof.enables.length === 0) {
      warnings.push(`RoleValidator: ${card.name} en slot ${card.slot} no produce capacidades estratégicas claras`);
    }
  }

  // 4. DependencyValidator (Generalizado por Precondición de Capacidades)
  const creatureCopies = countWhere(deck, c => c.type_line?.includes('Creature') || (c.oracle_text || '').toLowerCase().includes('create'));
  const highCmcFinishers = deck.filter(c => (c.cmc || c.mana_value || 0) >= 6 && !c.type_line?.includes('Land'));

  for (const finisher of highCmcFinishers) {
    const text = (finisher.oracle_text || '').toLowerCase();
    if (text.includes('creatures you control') || text.includes('each creature you control')) {
      if (creatureCopies < 12) {
        warnings.push(`DependencyValidator: ${finisher.name} requiere una masa de criaturas/fichas ≥ 12 (actual: ${creatureCopies})`);
      }
    }
  }

  // 5. ManaValidator
  const landCopies = countWhere(deck, c => c.type_line?.includes('Land') || c.produces?.includes('Mana'));
  if (landCopies < 18) {
    errors.push(`ManaValidator: Fuentes de maná insuficientes (actual: ${landCopies}, min: 18)`);
  }

  // 6. CurveValidator
  const nonLandCopies = countWhere(deck, c => !c.type_line?.includes('Land'));
  const totalCmcWeighted = deck.filter(c => !c.type_line?.includes('Land')).reduce((sum, c) => sum + ((c.cmc || c.mana_value || 0) * (c.quantity || 1)), 0);
  const avgCmc = nonLandCopies > 0 ? totalCmcWeighted / nonLandCopies : 0;
  if (avgCmc > 4.5) {
    warnings.push(`CurveValidator: Curva media de maná demasiado alta (${avgCmc.toFixed(2)})`);
  }

  // 7. WinPathValidator
  const hasWinCondition = deck.some(c => {
    const prof = analyzeCardIntelligence(c);
    const text = (c.oracle_text || '').toLowerCase();
    return prof.enables.includes('AlphaStrike') || prof.enables.includes('LethalFinisher') || prof.produces.includes('Tokens') || text.includes('create') || text.includes('destroy') || text.includes('deal');
  });
  if (!hasWinCondition) {
    warnings.push('WinPathValidator: No se detectó una condición de victoria o motor claro');
  }

  // 8. ConsistencyValidator
  const uniqueNonLands = Object.keys(counts).length;
  if (totalCardCopies === targetDeckSize && uniqueNonLands > 25) {
    warnings.push('ConsistencyValidator: Excesiva dispersión de cartas individuales (baja redundancia de 4 copias)');
  }

  // 9. SynergyValidator
  const activeTribe = session?.deckIntent?.tribe;
  if (activeTribe && activeTribe !== 'none' && activeTribe !== 'ninguna') {
    const tribeCopies = countWhere(deck, c => {
      const text = `${c.name} ${c.type_line || ''} ${c.oracle_text || ''}`.toLowerCase();
      return text.includes(activeTribe.toLowerCase());
    });
    if (tribeCopies < 8) {
      warnings.push(`SynergyValidator: Baja densidad temática para la tribu ${activeTribe} (${tribeCopies}/8 miembros)`);
    }
  }

  // 10. SideboardValidator
  const sideboard = session?.working?.sideboard || [];
  if (sideboard.length > 0 && sideboard.length !== 15) {
    warnings.push(`SideboardValidator: El banquillo debe ser de 15 cartas (actual: ${countCopies(sideboard)})`);
  }

  // 11. EngineCoverageValidator
  const engineNodes = blueprint?.slots || blueprint?.roles || [];
  if (engineNodes.length > 0) {
    const coveredEngines = new Set(deck.map(c => c.engine).filter(Boolean));
    if (coveredEngines.size < Math.min(2, engineNodes.length)) {
      warnings.push('EngineCoverageValidator: Cobertura de motores insuficiente en la baraja');
    }
  }

  // 12. EngineHealthValidator
  const lowCmcSpells = countWhere(deck, c => !c.type_line?.includes('Land') && (c.cmc || c.mana_value || 0) <= 2);
  if (lowCmcSpells < 8) {
    warnings.push(`EngineHealthValidator: Insuficiente interacción/aceleración temprana T1-T2 (${lowCmcSpells}/8 copias)`);
  }

  const passed = errors.length === 0;
  let score = 100 - (errors.length * 25) - (warnings.length * 5);
  score = Math.max(0, Math.min(100, score));

  return {
    passed,
    errors,
    warnings,
    score
  };
}
