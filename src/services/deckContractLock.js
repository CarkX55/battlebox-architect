/**
 * src/services/deckContractLock.js
 * 
 * Motor de Contrato Inmutable de Intención del Usuario (UserIntentContract v2).
 * 
 * Implementa la congelación del contrato del usuario en 3 niveles de autoridad
 * y 3 dimensiones de procedencia ANTES de inspeccionar el mazo actual:
 * 
 * - Autoridad:
 *   - LEVEL 0 (INVIOLABLE): Formato, colores, tribu estricta, mustIncludes, vetos y STRICT_THEME_FIDELITY.
 *   - LEVEL 1 (INTENCIÓN ESTRATÉGICA): Arquetipo, plan de victoria, densidad de sinergias.
 *   - LEVEL 2 (LIBERTAD DE OPTIMIZACIÓN): Maná, cantrips, interacción, optimización de copias.
 * 
 * - Procedencia:
 *   - EXPLICIT: Seleccionado explícitamente en la UI (máxima inmutabilidad).
 *   - DERIVED: Deducido por el sistema (ajustable con evidencia causal).
 *   - INCIDENTAL: Atributos fortuitos de cartas. JAMÁS se convierten en restricciones.
 * 
 * REGLA DE ORO: El contrato se congela desde los inputs del formulario ANTES de auditar el mazo.
 * El mazo jamás redefine la intención del usuario (CONTRACT_CANNOT_BE_INFERRED_FROM_DECK).
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Generador de Hash Determinista Simple para Contratos
// ─────────────────────────────────────────────────────────────────────────────
function generateContractHash(contractObj) {
  const str = JSON.stringify(contractObj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return `CTR-HASH-${Math.abs(hash).toString(16).toUpperCase()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTRUCTOR Y CONGELADO DEL CONTRATO INMUTABLE (UserIntentContract v2)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Crea y congela el UserIntentContract desde la configuración de la UI (formData)
 * ANTES de que el Juez audite el mazo real.
 * 
 * @param {Object} formData - Inputs explícitos proporcionados por el usuario
 * @returns {Object} UserIntentContract congelado
 */
export function buildUserIntentContract(formData = {}) {
  const format = (formData.format || 'modern').toLowerCase();
  const deckSize = parseInt(formData.deckSize || (format === 'commander' ? '100' : '60'), 10);
  
  // Colores permitidos explícitos
  const colors = Array.isArray(formData.colors) && formData.colors.length > 0
    ? [...formData.colors]
    : (formData.colorIdentity ? [...formData.colorIdentity] : ['U', 'B']);

  // Fidelidad temática estricta
  const strictThemeFidelity = formData.themePriority === 'STRICT_THEME_FIDELITY' || formData.strictThemeFidelity === true || formData.themeFidelity === 'STRICT';

  // Must includes y exclusions explícitos
  const mustInclude = Array.isArray(formData.mustInclude) ? [...formData.mustInclude] : [];
  const excludedCards = Array.isArray(formData.excludedCards) ? [...formData.excludedCards] : [];
  const excludedMechanics = Array.isArray(formData.excludedMechanics) ? [...formData.excludedMechanics] : [];

  // Tribu explícita o derivada
  const userTribe = formData.tribe || formData.primaryTribe || formData.aiMetadata?.tribe || '';

  // Arquetipo y temas
  const archetype = (formData.archetype || formData.archetypeChoice || 'TEMPO').toUpperCase();
  const theme = formData.theme || formData.themeChoice || 'SACRIFICE / GRAVEYARD';

  const contract = {
    version: '2.0.0',
    createdAt: new Date().toISOString(),
    
    level0: {
      format: { value: format, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.format', locked: true },
      deckSize: { value: deckSize, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.deckSize', locked: true },
      colors: { value: colors, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.colors', locked: true },
      strictThemeFidelity: { value: strictThemeFidelity, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.themePriority', locked: true },
      mustInclude: { value: mustInclude, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.mustInclude', locked: true },
      excludedCards: { value: excludedCards, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.excludedCards', locked: true },
      excludedMechanics: { value: excludedMechanics, authority: 'INVIOLABLE', provenance: 'EXPLICIT', source: 'UI.formData.excludedMechanics', locked: true },
      tribe: { value: userTribe, authority: userTribe ? 'INVIOLABLE' : 'NONE', provenance: userTribe ? 'EXPLICIT' : 'NONE', source: 'UI.formData.tribe', locked: !!userTribe }
    },

    level1: {
      archetype: { value: archetype, authority: 'STRATEGIC', provenance: 'EXPLICIT', source: 'UI.formData.archetype', locked: true },
      theme: { value: theme, authority: 'STRATEGIC', provenance: 'EXPLICIT', source: 'UI.formData.theme', locked: true },
      curveProfile: { value: formData.curveProfile || 'AGGRESSIVE', authority: 'STRATEGIC', provenance: 'EXPLICIT', source: 'UI.formData.curveProfile', locked: false },
      playstyle: { value: formData.playstyle || 'BALANCED', authority: 'STRATEGIC', provenance: 'DERIVED', source: 'strategyReasoner', locked: false }
    },

    level2: {
      allowManaOptimization: { value: true, authority: 'OPTIMIZATION', provenance: 'DERIVED', source: 'optimizer', locked: false },
      allowInteractionOptimization: { value: true, authority: 'OPTIMIZATION', provenance: 'DERIVED', source: 'optimizer', locked: false },
      allowCopyOptimization: { value: true, authority: 'OPTIMIZATION', provenance: 'DERIVED', source: 'optimizer', locked: false },
      allowThreatReplacement: { value: true, authority: 'OPTIMIZATION', provenance: 'DERIVED', source: 'optimizer', locked: false }
    }
  };

  contract.contractHash = generateContractHash({
    l0: contract.level0,
    l1: contract.level1
  });

  return Object.freeze(contract);
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE COMPATIBILIDAD CON NIVEL 0 (HARD CONSTRAINTS)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Evalúa si una carta o sustitución cumple estrictamente con el Nivel 0.
 * 
 * @param {Object} card - CartaScryfall / DB a validar
 * @param {Object} contract - UserIntentContract congelado
 * @returns {Object} { valid: boolean, reason?: string, code?: string }
 */
export function validateLevel0Compliance(card = {}, contract = {}) {
  if (!contract || !contract.level0) {
    return { valid: true };
  }

  const l0 = contract.level0;
  const cardName = card.name || card.cardName || '';

  // 1. Cartas vetadas / excluidas explícitamente
  if (l0.excludedCards.value && l0.excludedCards.value.some(ex => ex.toLowerCase() === cardName.toLowerCase())) {
    return {
      valid: false,
      code: 'REJECTED_CONTRACT_EXCLUDED_CARD',
      reason: `La carta "${cardName}" está en la lista de exclusiones explícitas del usuario.`
    };
  }

  // 2. Colores permitidos (Color Identity)
  const allowedColors = l0.colors.value || [];
  if (allowedColors.length > 0) {
    const cardColors = card.color_identity || card.colors || [];
    const isLandOrColorless = cardColors.length === 0 || (card.type_line || '').toLowerCase().includes('land');
    if (!isLandOrColorless && !cardColors.every(c => allowedColors.includes(c))) {
      return {
        valid: false,
        code: 'REJECTED_CONTRACT_COLOR_VIOLATION',
        reason: `La carta "${cardName}" tiene colores [${cardColors.join(',')}] que no coinciden con la identidad del contrato [${allowedColors.join(',')}].`
      };
    }
  }

  // 3. Fidelidad Tribal Estricta (si Nivel 0 requiere tribu)
  const reqTribe = (l0.tribe.value || '').toLowerCase();
  if (reqTribe && l0.strictThemeFidelity.value && (card.type_line || '').toLowerCase().includes('creature')) {
    const typeLineL = (card.type_line || '').toLowerCase();
    const oracleL = (card.oracle_text || card.text || '').toLowerCase();
    const isTribeMatch = typeLineL.includes(reqTribe) || oracleL.includes(reqTribe);
    if (!isTribeMatch) {
      return {
        valid: false,
        code: 'REJECTED_CONTRACT_TRIBAL_VIOLATION',
        reason: `La carta "${cardName}" viola STRICT_THEME_FIDELITY al no pertenecer a la tribu exigida (${l0.tribe.value}).`
      };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// VALIDACIÓN DE INTEGRIDAD DE NIVEL 1 (STRATEGIC INTENT)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * Verifica si un parche estratégico propuesto preserva el Nivel 1 (Arquetipo y Plan).
 * 
 * @param {Object} proposedState - Estado del mazo tras el parche
 * @param {Object} contract - UserIntentContract congelado
 * @returns {Object} { valid: boolean, reason?: string }
 */
export function validateLevel1Integrity(proposedState = {}, contract = {}) {
  if (!contract || !contract.level1) {
    return { valid: true };
  }

  const l1 = contract.level1;
  const reqArchetype = l1.archetype.value || 'TEMPO';

  // Si el arquetipo en proposedState cambió drásticamente (Archetype Drift)
  if (proposedState.detectedArchetype && proposedState.detectedArchetype !== reqArchetype) {
    return {
      valid: false,
      code: 'REJECTED_STRATEGIC_ARCHETYPE_DRIFT',
      reason: `El parche convierte el arquetipo de ${reqArchetype} a ${proposedState.detectedArchetype}, violando el contrato estratégico de Nivel 1.`
    };
  }

  return { valid: true };
}
