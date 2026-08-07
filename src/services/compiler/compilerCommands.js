/**
 * src/services/compiler/compilerCommands.js
 * 
 * Patrón Comandos Formal para el BattleBox Strategic Kernel v11.
 * Los comandos encapsulan mutaciones reversibles con soporte nativo de execute(), undo() y commit().
 */

export const COMMAND_TYPES = {
  BIND_SLOT: 'BIND_SLOT',
  UNBIND_SLOT: 'UNBIND_SLOT',
  REJECT_CANDIDATE: 'REJECT_CANDIDATE',
  PROMOTE_CANDIDATE: 'PROMOTE_CANDIDATE',
  RAISE_CRITIQUE: 'RAISE_CRITIQUE'
};

export class BindSlotCommand {
  constructor(slotIndex, card, decisionId = null) {
    this.id = `CMD_BIND_${slotIndex}_${Date.now()}`;
    this.type = COMMAND_TYPES.BIND_SLOT;
    this.slotIndex = slotIndex;
    this.card = card;
    this.decisionId = decisionId;
    this.previousCard = null;
    this.applied = false;
  }

  execute(strategicState) {
    if (this.slotIndex < 0) return false;
    this.previousCard = strategicState.deckState.slots[this.slotIndex] || null;
    strategicState.deckState.slots[this.slotIndex] = this.card;
    strategicState.version++;
    this.applied = true;
    return true;
  }

  undo(strategicState) {
    if (!this.applied) return false;
    strategicState.deckState.slots[this.slotIndex] = this.previousCard;
    strategicState.version++;
    this.applied = false;
    return true;
  }
}

export class RejectCandidateCommand {
  constructor(candidateName, reason) {
    this.id = `CMD_REJECT_${Date.now()}`;
    this.type = COMMAND_TYPES.REJECT_CANDIDATE;
    this.candidateName = candidateName;
    this.reason = reason;
    this.applied = false;
  }

  execute(strategicState) {
    if (!strategicState.reasoningState.rejectedCandidates) {
      strategicState.reasoningState.rejectedCandidates = [];
    }
    strategicState.reasoningState.rejectedCandidates.push({
      candidateName: this.candidateName,
      reason: this.reason,
      timestamp: Date.now()
    });
    strategicState.version++;
    this.applied = true;
    return true;
  }

  undo(strategicState) {
    if (!this.applied) return false;
    const list = strategicState.reasoningState.rejectedCandidates || [];
    const idx = list.findIndex(c => c.candidateName === this.candidateName);
    if (idx !== -1) {
      list.splice(idx, 1);
      strategicState.version++;
    }
    this.applied = false;
    return true;
  }
}

export class RaiseCritiqueCommand {
  constructor(invariantId, level, message) {
    this.id = `CMD_CRITIQUE_${Date.now()}`;
    this.type = COMMAND_TYPES.RAISE_CRITIQUE;
    this.invariantId = invariantId;
    this.level = level;
    this.message = message;
    this.applied = false;
  }

  execute(strategicState) {
    if (!strategicState.reasoningState.critiques) {
      strategicState.reasoningState.critiques = [];
    }
    strategicState.reasoningState.critiques.push({
      invariantId: this.invariantId,
      level: this.level,
      message: this.message,
      timestamp: Date.now()
    });
    strategicState.version++;
    this.applied = true;
    return true;
  }

  undo(strategicState) {
    if (!this.applied) return false;
    const list = strategicState.reasoningState.critiques || [];
    const idx = list.findIndex(c => c.invariantId === this.invariantId);
    if (idx !== -1) {
      list.splice(idx, 1);
      strategicState.version++;
    }
    this.applied = false;
    return true;
  }
}
