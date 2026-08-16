/**
 * INTENT LOCK ENGINE (v18.0)
 * 
 * Immutable Level 1 User Authority Lock.
 * Guarantees that format, colors, tribe, archetype, budget, and exclusions selected in the UI
 * remain strictly inviolable across the entire BattleBoxAgent execution.
 */

export class IntentLock {
  constructor({
    format = 'STANDARD',
    colors = ['R', 'W', 'G'],
    tribe = 'Giant',
    archetype = 'Aggro',
    budget = 'UNLIMITED',
    powerLevel = 'COMPETITIVE',
    commander = null,
    excludedCards = [],
    excludedMechanics = []
  } = {}) {
    this.format = format ? format.toUpperCase() : 'STANDARD';
    this.colors = Object.freeze([...(colors || ['R', 'W', 'G'])]);
    this.tribe = tribe || null;
    this.archetype = archetype || 'Aggro';
    this.budget = budget || 'UNLIMITED';
    this.powerLevel = powerLevel || 'COMPETITIVE';
    this.commander = commander || null;
    this.excludedCards = Object.freeze([...(excludedCards || [])]);
    this.excludedMechanics = Object.freeze([...(excludedMechanics || [])]);
    
    // Status Flags: All Level 1 constraints are LOCKED
    this.isFormatLocked = true;
    this.isColorsLocked = true;
    this.isTribeLocked = true;

    Object.freeze(this);
  }

  static fromIntentPackage(intentPackage) {
    const rawConstraints = intentPackage.constraints || {};
    return new IntentLock({
      format: intentPackage.format,
      colors: intentPackage.colors,
      tribe: intentPackage.tribe,
      archetype: intentPackage.archetype,
      budget: intentPackage.budget,
      powerLevel: intentPackage.powerLevel,
      commander: rawConstraints.companero || null,
      excludedCards: rawConstraints.excludedCards || [],
      excludedMechanics: rawConstraints.excludedMechanics || []
    });
  }

  assertCompliance(candidateCard) {
    if (!candidateCard || typeof candidateCard !== 'object') return true;

    // Check excluded cards
    if (this.excludedCards.includes(candidateCard.name)) {
      throw new Error(`IntentLockViolation: Card "${candidateCard.name}" is in user excludedCards list`);
    }

    return true;
  }
}
