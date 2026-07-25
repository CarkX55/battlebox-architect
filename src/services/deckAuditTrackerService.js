/**
 * src/services/deckAuditTrackerService.js
 * 
 * Sistema Completo de Trazabilidad, Snapshots, DeckDiff y Control de Invariantes.
 * 
 * Proporciona pruebas deterministas y rastreabilidad completa para seguir cada carta 
 * desde la decisión del Blueprint hasta el mazo final, detectando reconstrucciones silenciosas,
 * pérdida de referencias y violaciones del esqueleto.
 */

let idCounter = 0;

/**
 * Genera un ID único para cada entrada de carta en el mazo.
 */
export function generateUniqueCardId(cardName = 'unknown', phase = 'init') {
  idCounter++;
  const cleanName = cardName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `entry_${cleanName}_${phase}_${Date.now()}_${idCounter}`;
}

/**
 * Asegura que todas las cartas del mazo tengan un ID interno de seguimiento (UUID).
 */
export function trackDeckEntries(deck = [], phaseName = 'unknown', source = 'system') {
  if (!Array.isArray(deck)) return [];
  return deck.map(entry => {
    const qty = Number(entry.quantity || entry.count || entry.copies || 1);
    return {
      ...entry,
      id: entry.id || generateUniqueCardId(entry.name, phaseName),
      cardName: entry.name || entry.cardName || 'Desconocida',
      copies: qty,
      quantity: qty,
      count: qty,
      role: entry.role || 'unassigned',
      source: entry.source || source,
      phaseCreated: entry.phaseCreated || phaseName
    };
  });
}

/**
 * Registra la identidad de referencia en memoria de un mazo para detectar reconstrucciones completas.
 */
const referenceTrackerMap = new WeakMap();
let referenceCounter = 0;

export function trackObjectReference(deckArray, phaseName = 'unknown') {
  if (!Array.isArray(deckArray)) return 'NON_ARRAY_REF';
  if (!referenceTrackerMap.has(deckArray)) {
    referenceCounter++;
    referenceTrackerMap.set(deckArray, `DeckRef#${referenceCounter}`);
    console.log(`[DECK REFERENCE INITIALIZED] ${phaseName} -> RefID: DeckRef#${referenceCounter}`);
  }
  return referenceTrackerMap.get(deckArray);
}

/**
 * Imprime un SNAPSHOT completo y detallado del estado REAL del mazo.
 */
export function logDeckSnapshot(deck = [], phaseName = 'UNKNOWN_PHASE', blueprint = null, addLog = console.log) {
  const trackedDeck = trackDeckEntries(deck, phaseName);
  const refId = trackObjectReference(trackedDeck, phaseName);

  const spells = trackedDeck.filter(c => !c.type_line?.toLowerCase().includes('land') && c.category !== 'Land');
  const lands = trackedDeck.filter(c => c.type_line?.toLowerCase().includes('land') || c.category === 'Land');

  const totalSpells = spells.reduce((sum, c) => sum + c.copies, 0);
  const totalLands = lands.reduce((sum, c) => sum + c.copies, 0);

  // Agrupar por roles
  const roleGroups = {};
  spells.forEach(c => {
    const roleKey = c.role || 'Unassigned';
    if (!roleGroups[roleKey]) roleGroups[roleKey] = [];
    roleGroups[roleKey].push(c);
  });

  const snapshotLines = [];
  snapshotLines.push(`\n========== SNAPSHOT ==========`);
  snapshotLines.push(`Fase: ${phaseName}`);
  snapshotLines.push(`Object Ref: ${refId}`);
  snapshotLines.push(`Total: ${totalSpells} hechizos | ${totalLands} tierras | ${totalSpells + totalLands} total`);
  snapshotLines.push(`------------------------------`);

  Object.entries(roleGroups).forEach(([role, cards]) => {
    const roleTotal = cards.reduce((sum, c) => sum + c.copies, 0);
    snapshotLines.push(`[ROL: ${role}] (Total: ${roleTotal}):`);
    cards.forEach(c => {
      snapshotLines.push(`  • ${c.copies}x ${c.cardName} (ID: ${c.id})`);
    });
  });

  if (lands.length > 0) {
    snapshotLines.push(`[TIERRAS] (Total: ${totalLands}):`);
    lands.forEach(c => {
      snapshotLines.push(`  • ${c.copies}x ${c.cardName} (ID: ${c.id})`);
    });
  }

  snapshotLines.push(`==============================\n`);

  const fullText = snapshotLines.join('\n');
  addLog(fullText);
  return fullText;
}

/**
 * Calcula y registra las diferencias (DECK DIFF) entre dos estados del mazo.
 */
export function computeDeckDiff(previousDeck = [], currentDeck = [], phaseName = 'UNKNOWN_PHASE', defaultReason = 'UNKNOWN MODIFICATION', addLog = console.log) {
  const prevTracked = trackDeckEntries(previousDeck, 'prev');
  const currTracked = trackDeckEntries(currentDeck, phaseName);

  const prevMap = new Map();
  prevTracked.forEach(c => {
    const nameKey = c.cardName.toLowerCase();
    prevMap.set(nameKey, (prevMap.get(nameKey) || 0) + c.copies);
  });

  const currMap = new Map();
  currTracked.forEach(c => {
    const nameKey = c.cardName.toLowerCase();
    currMap.set(nameKey, (currMap.get(nameKey) || 0) + c.copies);
  });

  const allCardNames = new Set([...prevMap.keys(), ...currMap.keys()]);
  const diffLines = [];
  const added = [];
  const removed = [];
  const modified = [];

  allCardNames.forEach(nameKey => {
    const qtyBefore = prevMap.get(nameKey) || 0;
    const qtyAfter = currMap.get(nameKey) || 0;

    if (qtyBefore !== qtyAfter) {
      const cardObj = currTracked.find(c => c.cardName.toLowerCase() === nameKey) || 
                      prevTracked.find(c => c.cardName.toLowerCase() === nameKey);
      const cardName = cardObj ? cardObj.cardName : nameKey;

      diffLines.push(`\nCarta: ${cardName}`);
      diffLines.push(`  ANTES: ${qtyBefore}`);
      diffLines.push(`  DESPUÉS: ${qtyAfter}`);
      diffLines.push(`  FASE: ${phaseName}`);
      diffLines.push(`  MOTIVO: ${defaultReason || 'UNKNOWN MODIFICATION'}`);

      if (qtyBefore === 0) {
        added.push({ card: cardName, quantity: qtyAfter });
      } else if (qtyAfter === 0) {
        removed.push({ card: cardName, quantity: qtyBefore });
      } else {
        modified.push({ card: cardName, before: qtyBefore, after: qtyAfter });
      }
    }
  });

  if (diffLines.length > 0) {
    const header = `\n===== DECK DIFF [Fase: ${phaseName}] =====`;
    const footer = `===========================================`;
    const fullDiffText = [header, ...diffLines, footer].join('\n');
    addLog(fullDiffText);
  }

  const changeSet = {
    phase: phaseName,
    reason: defaultReason || 'UNKNOWN MODIFICATION',
    added,
    removed,
    modified,
    timestamp: Date.now()
  };

  return changeSet;
}

/**
 * Valida la invariante del Blueprint frente al estado actual del mazo.
 */
export function auditBlueprintInvariants(deck = [], blueprint = null, phaseName = 'UNKNOWN_PHASE', addLog = console.log) {
  if (!blueprint || !Array.isArray(blueprint.roles)) return;

  const trackedDeck = trackDeckEntries(deck, phaseName);
  const spells = trackedDeck.filter(c => !c.type_line?.toLowerCase().includes('land') && c.category !== 'Land');

  const auditLines = [];
  auditLines.push(`\n===== BLUEPRINT INVARIANT AUDIT [Fase: ${phaseName}] =====`);

  let totalDiscrepancies = 0;

  blueprint.roles.forEach(role => {
    const expectedQty = Number(role.quantity || 0);
    const roleNameLower = (role.name || '').toLowerCase();

    // Contar cartas en el mazo que coinciden con este rol
    const matchingCards = spells.filter(c => {
      const cardRoleLower = (c.role || '').toLowerCase();
      const cardNameLower = (c.cardName || '').toLowerCase();
      return cardRoleLower.includes(roleNameLower) || roleNameLower.includes(cardRoleLower) || cardNameLower.includes(roleNameLower);
    });

    const actualQty = matchingCards.reduce((sum, c) => sum + c.copies, 0);

    if (actualQty < expectedQty) {
      totalDiscrepancies++;
      auditLines.push(`⚠️ ROL DESAJUSTADO: "${role.name}"`);
      auditLines.push(`   Esperado: ${expectedQty} | Actual: ${actualQty} -> ERROR DÉFICIT`);
      auditLines.push(`   Cartas en rol: ${matchingCards.map(c => `${c.copies}x ${c.cardName}`).join(', ') || 'Ninguna'}`);
    }
  });

  if (totalDiscrepancies === 0) {
    auditLines.push(`✅ Todas las cuotas del Blueprint coinciden correctamente.`);
  }

  auditLines.push(`==========================================================\n`);
  addLog(auditLines.join('\n'));
}

/**
 * Ejecuta un cambio de estado controlado prohibiendo modificaciones silenciosas.
 */
export function applyTrackedDeckChange(previousDeck = [], changeOperation = null, phaseName = 'UNKNOWN_PHASE', addLog = console.log) {
  if (!changeOperation || typeof changeOperation !== 'object') {
    throw new Error(`[UNSANCTIONED MUTATION] La fase "${phaseName}" intentó modificar el mazo sin devolver un ChangeSet / DeckOperation.`);
  }

  const { type, added = [], removed = [], modified = [], reason = 'UNKNOWN MODIFICATION' } = changeOperation;
  let currentDeck = trackDeckEntries(previousDeck, phaseName);

  // Aplicar operaciones
  if (Array.isArray(removed) && removed.length > 0) {
    removed.forEach(rem => {
      const remName = (rem.name || rem.card || '').toLowerCase();
      currentDeck = currentDeck.filter(c => c.cardName.toLowerCase() !== remName);
    });
  }

  if (Array.isArray(added) && added.length > 0) {
    added.forEach(add => {
      const addName = add.name || add.card;
      currentDeck.push({
        id: generateUniqueCardId(addName, phaseName),
        cardName: addName,
        name: addName,
        copies: add.quantity || add.count || 1,
        quantity: add.quantity || add.count || 1,
        role: add.role || 'added_by_operation',
        source: phaseName,
        phaseCreated: phaseName
      });
    });
  }

  // Registrar DeckDiff resultante
  computeDeckDiff(previousDeck, currentDeck, phaseName, reason, addLog);

  return currentDeck;
}
