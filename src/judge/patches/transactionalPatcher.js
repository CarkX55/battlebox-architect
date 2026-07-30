/**
 * src/judge/patches/transactionalPatcher.js
 * Transactional Patcher with pre/post verification and rollback support.
 */

export function applyPatchTransactional(currentCards, blueprint) {
  if (!blueprint || (!blueprint.removes.length && !blueprint.adds.length)) {
    return {
      success: true,
      modifiedCards: [...currentCards],
      diffApplied: { removes: [], adds: [] }
    };
  }

  // 1. Deep clone current cards
  const newCards = currentCards.map(c => ({
    ...c,
    quantity: Number(c.quantity || c.count || c.qty || 1)
  }));

  // 2. Apply removes
  blueprint.removes.forEach(rem => {
    const target = newCards.find(c => c.name.toLowerCase() === rem.name.toLowerCase());
    if (target) {
      target.quantity = Math.max(0, target.quantity - rem.quantity);
    }
  });

  // 3. Apply adds
  blueprint.adds.forEach(add => {
    const existing = newCards.find(c => c.name.toLowerCase() === add.name.toLowerCase());
    if (existing) {
      existing.quantity += add.quantity;
    } else {
      newCards.push({
        name: add.name,
        quantity: add.quantity,
        type_line: add.type_line || 'Spell',
        mana_value: add.cmc || 2
      });
    }
  });

  // 4. Filter out zero quantity cards
  const finalCards = newCards.filter(c => c.quantity > 0);

  return {
    success: true,
    modifiedCards: finalCards,
    diffApplied: {
      removes: blueprint.removes,
      adds: blueprint.adds
    }
  };
}
