/**
 * src/services/compiler/invariantEngine.js
 * 
 * InvariantEngine: Motor Declarativo Registrable de Invariantes Estructurales.
 * Valida de forma no destructiva reglas inmutables desacopladas del Judge.
 * 
 * Categorías (INVARIANT_LEVEL):
 * - RULE: Regla inmutable del juego/formato (Aborta mutación).
 * - ARCHETYPE: Invariante estructural obligatoria de arquetipo (Aborta mutación).
 * - STYLE: Preferencia/Heurística de diseño (Genera advertencia / Penalización).
 * - META: Condicionante de metajuego (Genera advertencia / Penalización).
 */

import { StateQueryService } from './stateQueryService.js';

export const INVARIANT_LEVEL = {
  RULE: 'RULE',
  ARCHETYPE: 'ARCHETYPE',
  STYLE: 'STYLE',
  META: 'META'
};

export class InvariantEngine {
  constructor() {
    this.invariants = new Map(); // invariantId -> InvariantDeclaration
  }

  /**
   * Registra una regla o invariante declarativa
   */
  registerInvariant(declaration) {
    if (!declaration || !declaration.id) return;
    this.invariants.set(declaration.id, Object.freeze({ ...declaration }));
  }

  /**
   * Valida un array de slots prospectivo ANTES de aplicar cualquier mutación (Validate-Before-Apply)
   */
  validateSlots(prospectiveSlots = [], strategicState = {}) {
    const mockState = {
      ...strategicState,
      deckState: {
        ...(strategicState?.deckState || {}),
        slots: prospectiveSlots
      }
    };
    const query = new StateQueryService(mockState);
    const violations = [];

    for (const inv of this.invariants.values()) {
      try {
        if (typeof inv.appliesTo === 'function' && inv.appliesTo(mockState)) {
          const isValid = typeof inv.check === 'function' ? inv.check(query, prospectiveSlots, mockState) : true;
          if (!isValid) {
            violations.push({
              id: inv.id,
              level: inv.level || INVARIANT_LEVEL.RULE,
              message: typeof inv.getFailureMessage === 'function' ? inv.getFailureMessage(query, mockState) : `Violación de invariante: ${inv.id}`,
              suggestedFix: typeof inv.getSuggestedFix === 'function' ? inv.getSuggestedFix(query, mockState) : null
            });
          }
        }
      } catch (err) {
        console.error(`[InvariantEngine Error] Falló verificación de invariante ${inv.id}:`, err);
      }
    }

    return violations;
  }
}

/**
 * Carga e inyecta las invariantes declarativas estándar del sistema
 */
export function loadStandardInvariants(engine) {
  if (!engine) return;

  // 1. Invariante de 4 copias máximas (Regla del juego)
  engine.registerInvariant({
    id: 'MAX_4_COPIES_RULE',
    level: INVARIANT_LEVEL.RULE,
    appliesTo: () => true,
    check: (query, slots) => {
      const counts = {};
      for (const s of slots) {
        if (!s || !s.name || s.type_line?.toLowerCase().includes('basic land')) continue;
        const name = s.name.toLowerCase().trim();
        const qty = Number(s.quantity || s.count || 1);
        counts[name] = (counts[name] || 0) + qty;
        if (counts[name] > 4) return false;
      }
      return true;
    },
    getFailureMessage: () => `Ninguna carta no básica puede superar las 4 copias en el mazo.`,
    getSuggestedFix: () => ({ action: 'REDUCE_COPIES', maxCopies: 4 })
  });

  // 2. Invariante de Collected Company (Arquetipo)
  engine.registerInvariant({
    id: 'COLLECTED_COMPANY_MIN_TARGETS',
    level: INVARIANT_LEVEL.ARCHETYPE,
    appliesTo: (state) => (state?.deckState?.slots || []).some(s => s?.name === 'Collected Company'),
    check: (query) => query.getCreatureCount(3) >= 28,
    getFailureMessage: (query) => `Collected Company requiere al menos 28 criaturas con CMC <= 3. Encontradas: ${query.getCreatureCount(3)}`,
    getSuggestedFix: (query) => ({
      action: 'INJECT_TARGETS',
      requiredQty: 28 - query.getCreatureCount(3),
      filter: 'Creature CMC <= 3'
    })
  });

  // 3. Invariante de Cascadas / Living End (Arquetipo)
  engine.registerInvariant({
    id: 'LIVING_END_NO_CHEAP_SPELLS',
    level: INVARIANT_LEVEL.ARCHETYPE,
    appliesTo: (state) => (state?.deckState?.slots || []).some(s => s?.name === 'Living End'),
    check: (query) => {
      const c1 = query.getCardsByCMC(1);
      const c2 = query.getCardsByCMC(2);
      const cheapSpells = [...c1, ...c2].filter(s => s.name !== 'Living End');
      return cheapSpells.length === 0;
    },
    getFailureMessage: () => `Living End prohíbe hechizos no-tierra de CMC <= 2 para garantizar el impacto de la cascada.`,
    getSuggestedFix: () => ({ action: 'REMOVE_CHEAP_SPELLS', maxCMC: 2 })
  });
}
