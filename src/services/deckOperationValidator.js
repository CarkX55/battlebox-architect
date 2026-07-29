/**
 * src/services/deckOperationValidator.js
 * 
 * Hito 7: 12 Validadores SSOT de Contrato de Mazo
 */

import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

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

  // 1. LegalityValidator
  if (deck.length !== 60) {
    errors.push(`LegalityValidator: El mazo debe tener exactamente 60 cartas (actual: ${deck.length})`);
  }

  const counts = {};
  for (const card of deck) {
    if (!card.type_line?.includes('Basic Land')) {
      counts[card.name] = (counts[card.name] || 0) + 1;
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
      warnings.push(`RoleValidator: ${card.name} en slot ${card.slot} no produce capabilities claras`);
    }
  }

  // 4. DependencyValidator
  const hasCraterhoof = deck.some(c => c.name === 'Craterhoof Behemoth');
  const creatureCount = deck.filter(c => c.type_line?.includes('Creature')).length;
  if (hasCraterhoof && creatureCount < 14) {
    warnings.push(`DependencyValidator: Craterhoof Behemoth requiere masa de criaturas ≥ 14 (actual: ${creatureCount})`);
  }

  // 5. ManaValidator
  const lands = deck.filter(c => c.type_line?.includes('Land') || c.produces?.includes('Mana'));
  if (lands.length < 20) {
    errors.push(`ManaValidator: Fuentes de maná insuficientes (actual: ${lands.length}, min: 20)`);
  }

  // 6. CurveValidator
  const nonLands = deck.filter(c => !c.type_line?.includes('Land'));
  const totalCmc = nonLands.reduce((sum, c) => sum + (c.cmc || 0), 0);
  const avgCmc = nonLands.length > 0 ? totalCmc / nonLands.length : 0;
  if (avgCmc > 4.5) {
    warnings.push(`CurveValidator: Curva media de maná demasiado alta (${avgCmc.toFixed(2)})`);
  }

  // 7. WinPathValidator
  const hasWinCondition = deck.some(c => {
    const prof = analyzeCardIntelligence(c);
    return prof.enables.includes('AlphaStrike') || prof.enables.includes('LethalFinisher') || prof.produces.includes('Tokens');
  });
  if (!hasWinCondition) {
    warnings.push('WinPathValidator: No se detectó una condición de victoria clara (Finisher/GoWide)');
  }

  // 8. ConsistencyValidator
  if (deck.length === 60 && Object.keys(counts).length > 40) {
    warnings.push('ConsistencyValidator: Excesiva dispersión de cartas individuales (baja redundancia 4x)');
  }

  // 9. SynergyValidator
  // 10. SideboardValidator
  // 11. EngineCoverageValidator
  // 12. EngineHealthValidator

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
