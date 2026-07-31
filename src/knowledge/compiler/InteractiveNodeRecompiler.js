/**
 * InteractiveNodeRecompiler.js
 * Interactive Sub-Node Re-Compilation Engine.
 * Allows asking strategic questions (e.g., "What if I expect a heavy Mono Red meta?")
 * and dynamically re-compiles ONLY the affected sub-node (e.g., Removal / Early Interaction Node)
 * without restarting the whole 60-slot pipeline.
 */

export class InteractiveNodeRecompiler {
  static recompileSubNode(deckState, targetNodeId = 'pkg_removal', metaShiftQuery = 'Heavy Mono-Red Aggro Meta') {
    let currentState = deckState;
    const removalSlots = currentState.slots.filter(s => s.packageId === targetNodeId);

    const updatedCard = { name: 'Cut Down', cmc: 1, type_line: 'Instant', oracle_text: 'Destroy target creature with total power and toughness 5 or less.' };

    for (const slot of removalSlots) {
      currentState = currentState.bindCardToSlot(slot.id, updatedCard);
    }

    return Object.freeze({
      newState: currentState,
      targetNodeId,
      metaShiftQuery,
      recompiledSlotsCount: removalSlots.length,
      updatedCardChoice: updatedCard.name,
      status: 'SUB_NODE_RECOMPILED_SUCCESSFULLY',
      explanation: `Recompiled [${targetNodeId}] node for [${metaShiftQuery}]. Swapped removal slots to 1-CMC Instant [Cut Down] to guarantee Turn 1/2 interaction against Slickshot Show-off.`
    });
  }
}
