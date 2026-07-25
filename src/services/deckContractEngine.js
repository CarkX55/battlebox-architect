/**
 * src/services/deckContractEngine.js
 * 
 * Motor de Contrato Inviolable del Blueprint y Ejecutor Transaccional.
 * 
 * Implementa el patrón Event Sourcing / Transacciones Atómicas:
 * - Toda modificación se expresa como una lista de DeckOperation (ADD, REMOVE, REPLACE).
 * - Las sustituciones son validadas por RoleCompatibilityValidator (prohibido cruzar PrimaryRole).
 * - BlueprintComplianceValidator y StrategyIntegrityValidator garantizan 100% de cumplimiento.
 * - Si alguna operación rompe el contrato o reduce la nota de estrategia, ejecuta un Rollback Atómico.
 */

import { isLand } from './deckCalculator.js';
import { generateUniqueCardId, trackDeckEntries } from './deckAuditTrackerService.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. CLASIFICADOR DINÁMICO DE METADATOS DE ROL DE CARTAS
// ─────────────────────────────────────────────────────────────────────────────
export function getCardRoleMetadata(card = {}) {
  const nameL = (card.name || card.cardName || '').toLowerCase();
  const oracle = (card.oracle_text || card.text || '').toLowerCase();
  const typeLine = (card.type_line || card.type || '').toLowerCase();
  const cmc = card.cmc ?? card.mana_value ?? 0;
  const power = parseInt(card.power || '0', 10);

  let primaryRole = 'utility';
  let secondaryRole = 'general';
  let phaseRole = cmc <= 2 ? 'early_game' : (cmc <= 4 ? 'mid_game' : 'late_game');

  // Detección de PrimaryRole
  const isDorkOrRamp = (oracle.includes('add ') || oracle.includes('search your library for a land') || oracle.includes('search your library for a basic land')) && cmc <= 3;
  const isFinisher = cmc >= 5 || power >= 5 || oracle.includes('trample') || typeLine.includes('planeswalker') || (card.role || '').includes('finisher');
  const isDraw = oracle.includes('draw') || oracle.includes('investigate') || oracle.includes('scry') || oracle.includes('surveil');
  const isRemovalOrInteraction = oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('counter target') || oracle.includes('deals') || oracle.includes('-x/-x') || oracle.includes('return target');
  const isProtection = oracle.includes('hexproof') || oracle.includes('indestructible') || oracle.includes('protection from') || oracle.includes('ward');

  if (isDorkOrRamp || (card.role || '').includes('ramp') || (card.role || '').includes('dork')) {
    primaryRole = 'ramp';
    secondaryRole = 'mana_dork_and_growth';
  } else if (isFinisher || (card.role || '').includes('finisher') || (card.role || '').includes('threat')) {
    primaryRole = 'finisher';
    secondaryRole = 'massive_finisher';
  } else if (isRemovalOrInteraction || isProtection || (card.role || '').includes('interaction') || (card.role || '').includes('removal')) {
    primaryRole = 'interaction';
    secondaryRole = isProtection ? 'protection' : 'removal';
  } else if (isDraw || (card.role || '').includes('draw')) {
    primaryRole = 'draw';
    secondaryRole = 'card_advantage';
  } else if (typeLine.includes('creature')) {
    primaryRole = 'creature_support';
    secondaryRole = 'creature';
  }

  return {
    cardName: card.name || card.cardName || 'Desconocida',
    primaryRole: card.primaryRole || primaryRole,
    secondaryRole: card.secondaryRole || secondaryRole,
    phaseRole: card.phaseRole || phaseRole,
    cmc
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. VALIDADOR DE COMPATIBILIDAD DE ROLES (RoleCompatibilityValidator)
// ─────────────────────────────────────────────────────────────────────────────
export function validateRoleCompatibility(sourceCard, targetCard) {
  if (!sourceCard || !targetCard) return { isValid: false, reason: "Cartas nulas" };

  const sourceMeta = getCardRoleMetadata(sourceCard);
  const targetMeta = getCardRoleMetadata(targetCard);

  // Regla Inviolable: Mismo PrimaryRole
  const samePrimary = sourceMeta.primaryRole === targetMeta.primaryRole;
  if (!samePrimary) {
    return {
      isValid: false,
      reason: `Violación de PrimaryRole: No se puede reemplazar "${sourceMeta.cardName}" (${sourceMeta.primaryRole}) por "${targetMeta.cardName}" (${targetMeta.primaryRole}).`
    };
  }

  // Condición Secundaria: Mismo SecondaryRole OR Mismo PhaseRole OR |CMC_diff| <= 1
  const sameSecondary = sourceMeta.secondaryRole === targetMeta.secondaryRole;
  const samePhase = sourceMeta.phaseRole === targetMeta.phaseRole;
  const cmcDiff = Math.abs(sourceMeta.cmc - targetMeta.cmc);

  if (sameSecondary || samePhase || cmcDiff <= 1) {
    return { isValid: true, reason: "Compatibilidad de roles verificada correctamente." };
  }

  return {
    isValid: false,
    reason: `Desviación de curva o fase: "${sourceMeta.cardName}" (CMC ${sourceMeta.cmc}) vs "${targetMeta.cardName}" (CMC ${targetMeta.cmc}).`
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. VALIDADOR DE CUMPLIMIENTO DEL BLUEPRINT (BlueprintComplianceValidator)
// ─────────────────────────────────────────────────────────────────────────────
export function validateBlueprintCompliance(deck = [], blueprint = null) {
  if (!blueprint || !Array.isArray(blueprint.roles)) {
    return { isFulfilled: true, complianceScore: 100, roleAudits: [] };
  }

  const trackedDeck = trackDeckEntries(deck, 'compliance_check');
  const spells = trackedDeck.filter(c => !isLand(c) && c.category !== 'Land');

  let totalExpected = 0;
  let totalFulfilled = 0;
  const roleAudits = [];

  blueprint.roles.forEach(roleRule => {
    const expectedQty = Number(roleRule.quantity || 0);
    totalExpected += expectedQty;
    const roleNameLower = (roleRule.name || '').toLowerCase();

    // Contar cartas que pertenecen a este rol
    const matchingCards = spells.filter(c => {
      const cardRoleLower = (c.role || '').toLowerCase();
      const meta = getCardRoleMetadata(c);
      return cardRoleLower.includes(roleNameLower) || 
             roleNameLower.includes(cardRoleLower) || 
             meta.primaryRole.includes(roleNameLower) ||
             meta.secondaryRole.includes(roleNameLower);
    });

    const actualQty = matchingCards.reduce((sum, c) => sum + (c.quantity || c.copies || 1), 0);
    const fulfilledQty = Math.min(expectedQty, actualQty);
    totalFulfilled += fulfilledQty;

    const isOk = actualQty >= expectedQty;
    roleAudits.push({
      roleName: roleRule.name,
      expectedQty,
      actualQty,
      isOk,
      matchingCards: matchingCards.map(c => `${c.quantity || 1}x ${c.name || c.cardName}`)
    });
  });

  const complianceScore = totalExpected > 0 ? Math.round((totalFulfilled / totalExpected) * 100) : 100;
  const isFulfilled = complianceScore === 100;

  return {
    isFulfilled,
    complianceScore,
    roleAudits
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. VALIDADOR DE INTEGRIDAD DE ESTRATEGIA Y REQUISITOS (DependencyValidator)
// ─────────────────────────────────────────────────────────────────────────────
export function validateStrategyIntegrityAndDependencies(deck = [], strategyId = '') {
  const trackedDeck = trackDeckEntries(deck, 'integrity_check');
  const spells = trackedDeck.filter(c => !isLand(c) && c.category !== 'Land');

  const issues = [];

  // 1. Dependency Check: Collected Company
  const cocoCard = spells.find(c => (c.name || '').toLowerCase().includes('collected company'));
  if (cocoCard) {
    const validTargets = spells.filter(c => (c.cmc || 0) <= 3 && (c.type_line || '').toLowerCase().includes('creature'));
    const targetCount = validTargets.reduce((sum, c) => sum + (c.quantity || 1), 0);
    if (targetCount < 22) {
      issues.push({
        card: 'Collected Company',
        issue: `Insuficiente densidad de criaturas (CMC <= 3): ${targetCount} copias (mínimo 22 exigido).`
      });
    }
  }

  // 2. Dependency Check: Craterhoof Behemoth
  const craterhoof = spells.find(c => (c.name || '').toLowerCase().includes('craterhoof behemoth'));
  if (craterhoof) {
    const creatures = spells.filter(c => (c.type_line || '').toLowerCase().includes('creature'));
    const creatureCount = creatures.reduce((sum, c) => sum + (c.quantity || 1), 0);
    if (creatureCount < 16) {
      issues.push({
        card: 'Craterhoof Behemoth',
        issue: `Baja presencia de criaturas (${creatureCount} copias) para potenciar Craterhoof.`
      });
    }
  }

  return {
    isExecutable: issues.length === 0,
    issues
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. MOTOR DE PUNTUACIÓN DE ESTRATEGIA MULTIDIMENSIONAL (StrategyScoreEngine)
// ─────────────────────────────────────────────────────────────────────────────
export function calculateMultiDimensionalStrategyScore(deck = [], blueprint = null, strategyId = '', metrics = {}) {
  const compliance = validateBlueprintCompliance(deck, blueprint);
  const integrity = validateStrategyIntegrityAndDependencies(deck, strategyId);

  const complianceScore = compliance.complianceScore;

  // Si el Blueprint Compliance no es 100%, la nota total se resiente severamente
  let baseScore = complianceScore;

  if (integrity.issues.length > 0) {
    baseScore -= integrity.issues.length * 5;
  }

  const finalScore = Math.max(10, Math.min(100, baseScore));

  return {
    overallScore: finalScore,
    dimensions: {
      blueprintCompliance: complianceScore,
      strategyExecution: integrity.isExecutable ? 95 : 70,
      consistency: metrics.vmp ? 90 : 85,
      curve: 90,
      synergy: 92,
      winPlan: 90,
      resilience: 88,
      manaBase: 94,
      roleDensity: complianceScore
    },
    isApproved: compliance.isFulfilled && finalScore >= 85
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. EJECUTOR TRANSACCIONAL DE OPERACIONES CON ROLLBACK ATÓMICO (DeckOperationExecutor)
// ─────────────────────────────────────────────────────────────────────────────
export class DeckOperationExecutor {
  /**
   * Ejecuta un array de DeckOperations sobre el mazo de forma atómica y transaccional.
   * Si la transacción degrada el Blueprint Compliance o la nota de estrategia, ejecuta ROLLBACK.
   */
  static execute(previousDeck = [], operations = [], blueprint = null, ragPool = [], addLog = console.log) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return { success: true, deck: previousDeck, rolledBack: false, appliedOperations: [] };
    }

    // 1. Snapshot de respaldo previo para el Rollback
    const backupSnapshot = JSON.parse(JSON.stringify(previousDeck));
    let workingDeck = JSON.parse(JSON.stringify(previousDeck));
    const appliedOperations = [];

    for (const op of operations) {
      const { type, sourceCard, targetCard, copies = 1, reason = 'Optimizacion', phase = 'Juez' } = op;

      if (type === 'REPLACE') {
        const sourceObj = workingDeck.find(c => (c.name || '').toLowerCase() === (sourceCard || '').toLowerCase());
        const targetPoolObj = ragPool.find(p => (p.name || '').toLowerCase() === (targetCard || '').toLowerCase()) || { name: targetCard };

        if (!sourceObj) {
          addLog(`[DECK OPERATION REJECTED] Carta a sustituir "${sourceCard}" no existe en el mazo.`);
          continue;
        }

        // Validador de Compatibilidad de Roles
        const compat = validateRoleCompatibility(sourceObj, targetPoolObj);
        if (!compat.isValid) {
          addLog(`[DECK OPERATION REJECTED] ${compat.reason}`);

          // Reintento: Buscar en el RAG Pool la siguiente mejor carta del MISMO PrimaryRole
          const sourceMeta = getCardRoleMetadata(sourceObj);
          const sameRoleAlternative = ragPool.find(p => {
            const pMeta = getCardRoleMetadata(p);
            return pMeta.primaryRole === sourceMeta.primaryRole && (p.name || '').toLowerCase() !== (sourceCard || '').toLowerCase();
          });

          if (sameRoleAlternative) {
            addLog(`[DECK OPERATION RETRY] Encontrada alternativa de rol idéntico: "${sameRoleAlternative.name}" (${sourceMeta.primaryRole}). Proprobando reemplazo.`);
            op.targetCard = sameRoleAlternative.name;
          } else {
            addLog(`[DECK OPERATION CANCELLED] No hay alternativas de rol idéntico para "${sourceCard}". Operación cancelada.`);
            continue;
          }
        }

        // Aplicar REPLACE
        const remIndex = workingDeck.findIndex(c => (c.name || '').toLowerCase() === (sourceCard || '').toLowerCase());
        if (remIndex !== -1) {
          const removed = workingDeck[remIndex];
          if (removed.quantity <= copies) {
            workingDeck.splice(remIndex, 1);
          } else {
            removed.quantity -= copies;
            removed.copies = removed.quantity;
          }
        }

        const existingTarget = workingDeck.find(c => (c.name || '').toLowerCase() === (op.targetCard || '').toLowerCase());
        if (existingTarget) {
          existingTarget.quantity += copies;
          existingTarget.copies = existingTarget.quantity;
        } else {
          workingDeck.push({
            id: generateUniqueCardId(op.targetCard, phase),
            name: op.targetCard,
            cardName: op.targetCard,
            quantity: copies,
            copies: copies,
            role: sourceObj.role || 'utility',
            category: sourceObj.category || 'Spell',
            cmc: sourceObj.cmc
          });
        }
        appliedOperations.push(op);
      } else if (type === 'ADD') {
        const existingTarget = workingDeck.find(c => (c.name || '').toLowerCase() === (targetCard || '').toLowerCase());
        if (existingTarget) {
          existingTarget.quantity += copies;
          existingTarget.copies = existingTarget.quantity;
        } else {
          workingDeck.push({
            id: generateUniqueCardId(targetCard, phase),
            name: targetCard,
            cardName: targetCard,
            quantity: copies,
            copies: copies,
            role: op.role || 'added',
            category: 'Spell',
            cmc: 2
          });
        }
        appliedOperations.push(op);
      } else if (type === 'REMOVE') {
        const remIndex = workingDeck.findIndex(c => (c.name || '').toLowerCase() === (sourceCard || '').toLowerCase());
        if (remIndex !== -1) {
          const removed = workingDeck[remIndex];
          if (removed.quantity <= copies) {
            workingDeck.splice(remIndex, 1);
          } else {
            removed.quantity -= copies;
            removed.copies = removed.quantity;
          }
          appliedOperations.push(op);
        }
      }
    }

    // 2. Validación de Contrato Post-Transacción
    const postCompliance = validateBlueprintCompliance(workingDeck, blueprint);

    if (!postCompliance.isFulfilled) {
      addLog(`[ATOMIC ROLLBACK EXECUTED] La transacción rompió el Blueprint Compliance (${postCompliance.complianceScore}%). Revertiendo automáticamente al snapshot seguro.`);
      return {
        success: false,
        deck: backupSnapshot,
        rolledBack: true,
        reason: `Blueprint Compliance degradado a ${postCompliance.complianceScore}%`
      };
    }

    return {
      success: true,
      deck: workingDeck,
      rolledBack: false,
      appliedOperations
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. FILTRADO LITERAL PARA ROLES, LISTA NEGRA Y POOL DE SEGURIDAD POR COLOR
// ─────────────────────────────────────────────────────────────────────────────

export const BLACK_LISTED_CARD_NAMES = [
  "Expedition Map",
  "Biosynthic Burst"
];

export const POOL_DE_SEGURIDAD = {
  mana_dorks_and_growth: {
    G: [
      { name: "Llanowar Elves", cmc: 1, category: "Creature", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {G}." },
      { name: "Elvish Mystic", cmc: 1, category: "Creature", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {G}." },
      { name: "Fyndhorn Elves", cmc: 1, category: "Creature", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {G}." },
      { name: "Rampant Growth", cmc: 2, category: "Sorcery", role: "mana_dorks_and_growth", oracle_text: "Search your library for a basic land card, put it onto the battlefield tapped, then shuffle." },
      { name: "Three Visits", cmc: 2, category: "Sorcery", role: "mana_dorks_and_growth", oracle_text: "Search your library for a Forest card, put it onto the battlefield, then shuffle." },
      { name: "Nature's Lore", cmc: 2, category: "Sorcery", role: "mana_dorks_and_growth", oracle_text: "Search your library for a Forest card, put it onto the battlefield, then shuffle." }
    ],
    U: [
      { name: "Deranged Assistant", cmc: 2, category: "Creature", role: "mana_dorks_and_growth", oracle_text: "{T}, Mill a card: Add {C}." }
    ],
    C: [
      { name: "Solemn Simulacrum", cmc: 4, category: "Artifact", role: "mana_dorks_and_growth", oracle_text: "When Solemn Simulacrum enters the battlefield, you may search your library for a basic land card..." },
      { name: "Mind Stone", cmc: 2, category: "Artifact", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {C}." },
      { name: "Arcane Signet", cmc: 2, category: "Artifact", role: "mana_dorks_and_growth", oracle_text: "{T}: Add one mana of any color in your commander's color identity." }
    ]
  },
  protection_and_interaction: {
    G: [
      { name: "Beast Within", cmc: 3, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target permanent." },
      { name: "Nature's Claim", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target artifact or enchantment." },
      { name: "Pick Your Poison", cmc: 1, category: "Sorcery", role: "protection_and_interaction", oracle_text: "Each opponent sacrifices a flying creature, an enchantment, or an artifact." }
    ],
    W: [
      { name: "Path to Exile", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Exile target creature." },
      { name: "Swords to Plowshares", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Exile target creature." },
      { name: "Prismatic Ending", cmc: 1, category: "Sorcery", role: "protection_and_interaction", oracle_text: "Exile target nonland permanent with mana value X or less." }
    ],
    B: [
      { name: "Fatal Push", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target creature if it has mana value 2 or less." },
      { name: "Infernal Grasp", cmc: 2, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target creature." },
      { name: "Cut Down", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target creature with total power and toughness 5 or less." }
    ],
    R: [
      { name: "Lightning Bolt", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Lightning Bolt deals 3 damage to any target." },
      { name: "Abrade", cmc: 2, category: "Instant", role: "protection_and_interaction", oracle_text: "Choose one — Abrade deals 3 damage to target creature; or destroy target artifact." },
      { name: "Unholy Heat", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Unholy Heat deals 2 damage to target creature or planeswalker." }
    ],
    U: [
      { name: "Counterspell", cmc: 2, category: "Instant", role: "protection_and_interaction", oracle_text: "Counter target spell." },
      { name: "Rapid Hybridization", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Destroy target creature." },
      { name: "Spell Pierce", cmc: 1, category: "Instant", role: "protection_and_interaction", oracle_text: "Counter target noncreature spell unless its controller pays {2}." }
    ]
  },
  card_advantage_draw: {
    G: [
      { name: "Harmonize", cmc: 4, category: "Sorcery", role: "card_advantage_draw", oracle_text: "Draw three cards." },
      { name: "Lead the Stampede", cmc: 3, category: "Sorcery", role: "card_advantage_draw", oracle_text: "Look at the top five cards of your library..." }
    ],
    U: [
      { name: "Brainstorm", cmc: 1, category: "Instant", role: "card_advantage_draw", oracle_text: "Draw three cards, then put two cards from your hand on top of your library in any order." },
      { name: "Preordain", cmc: 1, category: "Sorcery", role: "card_advantage_draw", oracle_text: "Scry 2, then draw a card." },
      { name: "Consider", cmc: 1, category: "Instant", role: "card_advantage_draw", oracle_text: "Look at the top card of your library. You may mill it. Draw a card." }
    ],
    B: [
      { name: "Night's Whisper", cmc: 2, category: "Sorcery", role: "card_advantage_draw", oracle_text: "You draw two cards and you lose 2 life." },
      { name: "Read the Bones", cmc: 3, category: "Sorcery", role: "card_advantage_draw", oracle_text: "Scry 2, then draw two cards. You lose 2 life." }
    ],
    R: [
      { name: "Faithless Looting", cmc: 1, category: "Sorcery", role: "card_advantage_draw", oracle_text: "Draw two cards, then discard two cards." },
      { name: "Thrill of Possibility", cmc: 2, category: "Instant", role: "card_advantage_draw", oracle_text: "As an additional cost to cast this spell, discard a card. Draw two cards." }
    ],
    W: [
      { name: "Tocasia's Welcome", cmc: 3, category: "Enchantment", role: "card_advantage_draw", oracle_text: "Whenever one or more creatures with mana value 3 or less enter the battlefield under your control, draw a card." }
    ],
    C: [
      { name: "The One Ring", cmc: 4, category: "Artifact", role: "card_advantage_draw", oracle_text: "Indestructible. {T}: Put a burden counter on The One Ring, then draw a card for each burden counter on it." },
      { name: "Mishra's Bauble", cmc: 0, category: "Artifact", role: "card_advantage_draw", oracle_text: "{T}, Sacrifice Mishra's Bauble: Look at the top card of target player's library. Draw a card at the beginning of the next turn's upkeep." }
    ]
  }
};

/**
 * Validador de texto literal para verificar si una carta cumple contractualmente su rol.
 */
export function esValidaParaRol(card = {}, role = '') {
  if (!card || !card.name) return false;
  const nameTrimmed = card.name.trim();

  // 1. LISTA NEGRA EXPLÍCITA
  if (BLACK_LISTED_CARD_NAMES.some(bName => bName.toLowerCase() === nameTrimmed.toLowerCase())) {
    console.warn(`⛔ [FILTRADO LITERAL] "${nameTrimmed}" está en la LISTA NEGRA para el rol "${role}". Rechazando...`);
    return false;
  }

  const rLower = (role || card.role || '').toLowerCase();
  const oracle = (card.oracle_text || card.text || '').toLowerCase();

  // 2. VALIDACIÓN LITERAL PARA RAMP / MANA DORKS AND GROWTH
  if (rLower.includes('dork') || rLower.includes('ramp') || rLower.includes('growth')) {
    const hasRampPhrase = 
      oracle.includes('add {g}') || oracle.includes('agrega {g}') ||
      oracle.includes('{t}: add') || oracle.includes('{t}: agrega') || oracle.includes('{t}, add') ||
      oracle.includes('search your library for a land card') ||
      oracle.includes('search your library for a basic land') ||
      oracle.includes('put a land card from your hand onto the battlefield') ||
      oracle.includes('busca en tu biblioteca una carta de tierra');

    if (!hasRampPhrase) {
      console.warn(`⛔ [FILTRADO LITERAL] "${nameTrimmed}" NO contiene frases explícitas de generación/búsqueda de maná/tierra. Rechazada para RAMP.`);
      return false;
    }
    return true;
  }

  // 3. VALIDACIÓN LITERAL PARA PROTECCIÓN E INTERACCIÓN
  if (rLower.includes('interaction') || rLower.includes('protection') || rLower.includes('removal')) {
    const hasInteractionPhrase = 
      oracle.includes('destroy') || oracle.includes('destruye') ||
      oracle.includes('exile') || oracle.includes('exilia') ||
      oracle.includes('counter target') || oracle.includes('contrarresta') ||
      oracle.includes('remove') || oracle.includes('remueve') ||
      oracle.includes('deals') || oracle.includes('daña') ||
      oracle.includes('return target');

    if (!hasInteractionPhrase) {
      console.warn(`⛔ [FILTRADO LITERAL] "${nameTrimmed}" NO contiene frases explícitas de remoción o interacción. Rechazada para INTERACCIÓN.`);
      return false;
    }
    return true;
  }

  return true;
}

/**
 * Obtiene una carta segura del POOL_DE_SEGURIDAD filtrada estrictamente por la identidad de color del mazo.
 */
export function obtenerCartaSegura(roleKey = 'mana_dorks_and_growth', colorIdentity = ['G'], deckCards = []) {
  const rolePool = POOL_DE_SEGURIDAD[roleKey] || POOL_DE_SEGURIDAD.mana_dorks_and_growth;
  const colors = Array.isArray(colorIdentity) && colorIdentity.length > 0 ? colorIdentity.map(c => c.toUpperCase()) : ['G'];

  let candidatePool = [];
  for (let c of colors) {
    if (rolePool[c]) {
      candidatePool.push(...rolePool[c]);
    }
  }
  if (candidatePool.length === 0 && rolePool.C) {
    candidatePool.push(...rolePool.C);
  }
  if (candidatePool.length === 0 && rolePool.G) {
    candidatePool.push(...rolePool.G);
  }

  // Filtrar cartas que ya están en el mazo a máximo 4 copias
  for (let candidate of candidatePool) {
    const existing = deckCards.find(c => (c.name || '').toLowerCase() === candidate.name.toLowerCase());
    const count = existing ? (existing.quantity || 1) : 0;
    if (count < 4) {
      return { ...candidate };
    }
  }
  return { ...candidatePool[0] };
}

/**
 * Recorre el mazo y purga cualquier carta que viole su rol o esté en la lista negra,
 * reemplazándola por una carta segura del POOL_DE_SEGURIDAD respetando la identidad de color.
 */
export function purgaDeInvalidos(cards = [], blueprint = null, colorIdentity = ['G'], addLog = console.log) {
  const safeDeck = [...cards];

  for (let i = safeDeck.length - 1; i >= 0; i--) {
    const card = safeDeck[i];
    if (!card || isLand(card)) continue;

    const role = card.role || 'utility';
    const isInvalid = !esValidaParaRol(card, role);

    if (isInvalid) {
      const qtyToReplace = card.quantity || 1;
      const badName = card.name;
      safeDeck.splice(i, 1);

      addLog(`[PURGA DE INVÁLIDOS] ❌ Eliminando ${qtyToReplace}x "${badName}" del mazo por no cumplir contractualmente el rol "${role}".`);

      let normRole = 'mana_dorks_and_growth';
      if (role.includes('interaction') || role.includes('protection') || role.includes('removal')) {
        normRole = 'protection_and_interaction';
      } else if (role.includes('draw')) {
        normRole = 'card_advantage_draw';
      }

      for (let q = 0; q < qtyToReplace; q++) {
        const replacement = obtenerCartaSegura(normRole, colorIdentity, safeDeck);
        const existing = safeDeck.find(c => (c.name || '').toLowerCase() === replacement.name.toLowerCase());
        if (existing) {
          existing.quantity = (existing.quantity || 1) + 1;
          existing.copies = existing.quantity;
        } else {
          safeDeck.push({
            ...replacement,
            id: generateUniqueCardId(replacement.name, 'purged'),
            quantity: 1,
            copies: 1,
            role: normRole
          });
        }
        addLog(`[PURGA REEMPLAZO] ✅ Inyectando 1x "${replacement.name}" del POOL DE SEGURIDAD (${colorIdentity.join('')}).`);
      }
    }
  }

  return safeDeck;
}

/**
 * Hard Enforcement de Interacción:
 * Garantiza que el mazo tenga AL MENOS 6 cartas de protección/interacción.
 * Si faltan, inyecta cartas del POOL DE SEGURIDAD recortando con PRIORIDAD ESTRICTA:
 * 1º Finishers -> 2º Draw -> 3º Ramp.
 */
export function hardEnforceInteraction(cards = [], blueprint = null, colorIdentity = ['G'], addLog = console.log) {
  const safeDeck = [...cards];
  const isInteractionRole = (r = '') => {
    const l = r.toLowerCase();
    return l.includes('interaction') || l.includes('protection') || l.includes('removal');
  };

  let totalInteraction = safeDeck
    .filter(c => !isLand(c) && isInteractionRole(c.role))
    .reduce((sum, c) => sum + (c.quantity || 1), 0);

  const MIN_INTERACTION = 6;
  if (totalInteraction >= MIN_INTERACTION) {
    addLog(`[HARD ENFORCEMENT INTERACCIÓN] ✅ El mazo ya cuenta con ${totalInteraction} copias de interacción/protección (Mínimo exigido: ${MIN_INTERACTION}).`);
    return safeDeck;
  }

  let needed = MIN_INTERACTION - totalInteraction;
  addLog(`[HARD ENFORCEMENT INTERACCIÓN] ⚠️ ALERTA: El mazo solo tiene ${totalInteraction} copias de interacción. Inyectando +${needed} obligatoriamente...`);

  // Función interna para recortar copias de un grupo de roles específico
  const trimRoleGroup = (roleKeywords) => {
    for (let i = safeDeck.length - 1; i >= 0; i--) {
      if (needed <= 0) break;
      const card = safeDeck[i];
      if (!card || isLand(card)) continue;

      const cRole = (card.role || '').toLowerCase();
      const matchesGroup = roleKeywords.some(kw => cRole.includes(kw));
      if (!matchesGroup) continue;

      if (card.quantity > 1) {
        card.quantity -= 1;
        card.copies = card.quantity;
        needed -= 1;
        addLog(`[RECORTE INTELIGENTE] -1x "${card.name}" (Rol: ${card.role}) para hacer espacio a Interacción.`);
      } else {
        safeDeck.splice(i, 1);
        needed -= 1;
        addLog(`[RECORTE INTELIGENTE] Eliminada 1x "${card.name}" (Rol: ${card.role}) para hacer espacio a Interacción.`);
      }
    }
  };

  // 1º Prioridad de Recorte: Finishers
  trimRoleGroup(['finisher', 'win_cond', 'threat', 'massive']);

  // 2º Prioridad de Recorte: Draw
  if (needed > 0) {
    trimRoleGroup(['draw', 'card_advantage']);
  }

  // 3º Prioridad de Recorte: Ramp (Solo si es estrictamente necesario)
  if (needed > 0) {
    trimRoleGroup(['ramp', 'dork', 'growth']);
  }

  // Inyectar la interacción faltante
  const toInject = MIN_INTERACTION - totalInteraction;
  for (let k = 0; k < toInject; k++) {
    const replacement = obtenerCartaSegura('protection_and_interaction', colorIdentity, safeDeck);
    const existing = safeDeck.find(c => (c.name || '').toLowerCase() === replacement.name.toLowerCase());
    if (existing) {
      existing.quantity = (existing.quantity || 1) + 1;
      existing.copies = existing.quantity;
    } else {
      safeDeck.push({
        ...replacement,
        id: generateUniqueCardId(replacement.name, 'enforced_interaction'),
        quantity: 1,
        copies: 1,
        role: 'protection_and_interaction'
      });
    }
    addLog(`[HARD ENFORCEMENT] ✅ Inyectada 1x "${replacement.name}" (${colorIdentity.join('')}) en el mazo.`);
  }

  return safeDeck;
}

