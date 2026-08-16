/**
 * src/services/compiler/core/capabilityPlanner.js
 * 
 * CapabilityPlanner & Incremental Hybrid Solver v1.0.
 * Maximizes ObjectiveScore(solution) subject to constraints.
 * Emits SolutionVector + ResidualVector and builds consolidated CapabilityPlan.
 */

import { CapabilityVector, CapabilityAxis } from './capabilityVector.js';
import { CapabilityPlan, AllocationSlot } from './capabilityPlan.js';

export class ResidualVector {
  constructor(axes = []) {
    this.deltas = Object.freeze(axes.map(axis => ({
      id: axis.id,
      target: axis.target,
      achieved: axis.current,
      residual: axis.residual,
      satisfied: axis.isSatisfied
    })));
    
    let sqSum = 0;
    for (const d of this.deltas) {
      sqSum += Math.pow(d.residual, 2);
    }
    this.magnitude = Math.round(Math.sqrt(sqSum) * 100) / 100;

    Object.freeze(this);
  }
}

export class CapabilityPlanner {
  /**
   * Plan consolidated capability requirements from IntentPackage and CapabilityVector.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage
   * @param {CapabilityVector} capabilityVector
   * @returns {{ capabilityPlan: CapabilityPlan, residualVector: ResidualVector, objectiveScore: number }}
   */
  static plan(intentPackage, capabilityVector) {
    const rawAxes = capabilityVector.axes;
    const targetDeckSize = (intentPackage.userConstraints && intentPackage.userConstraints.deckSize) || 60;

    // Step 1: CapabilityNormalizer — Canonical IDs & Stable Ordering
    const normalizedAxes = CapabilityPlanner._normalizeAndOrderAxes(rawAxes);

    const manaAxis = normalizedAxes.find(a => a.id === 'MANA_BASE');
    const targetLandCount = manaAxis ? Math.max(1, manaAxis.target) : 24;

    // Step 2: CapabilityConsolidator — Grouping by (role, priority, mandatory, timing) budgeted to targetDeckSize
    const consolidatedSlots = CapabilityPlanner._consolidateSlots(
      normalizedAxes,
      intentPackage.format,
      targetDeckSize,
      targetLandCount
    );

    const plan = new CapabilityPlan(consolidatedSlots, {
      format: intentPackage.format,
      tempo: intentPackage.tempo,
      timestamp: new Date().toISOString()
    });

    plan.validate();

    // Step 3: Compute ResidualVector delta
    const residualVector = new ResidualVector(normalizedAxes);

    // ObjectiveScore = Σ(weight * satisfaction) - penalties
    let totalScore = 0;
    for (const axis of normalizedAxes) {
      if (axis.isSatisfied) totalScore += axis.weight * 10;
      else totalScore += Math.max(0, (axis.weight * 10) - (Math.abs(axis.residual) * 2));
    }

    const objectiveScore = Math.max(0, Math.round(totalScore));

    return {
      capabilityPlan: plan,
      residualVector,
      objectiveScore
    };
  }

  /**
   * CapabilityNormalizer: Assigns canonical IDs and stable sort order.
   * @private
   */
  static _normalizeAndOrderAxes(rawAxes = []) {
    const canonicalMap = {
      'turn1_pressure': 'TURN1_PRESSURE',
      'turn2_pressure': 'TURN2_PRESSURE',
      'turn_pressure': 'TURN1_PRESSURE',
      'cheap_removal': 'CHEAP_REMOVAL',
      'removal': 'CHEAP_REMOVAL',
      'removal_density': 'CHEAP_REMOVAL',
      'card_flow': 'CARD_FLOW',
      'card_velocity': 'CARD_FLOW',
      'tribal_density': 'TRIBAL_DENSITY',
      'mana_base': 'MANA_BASE'
    };

    return rawAxes.map(axis => {
      const canonicalId = canonicalMap[axis.id.toLowerCase()] || axis.id.toUpperCase();
      return new CapabilityAxis({
        id: canonicalId,
        target: axis.target,
        current: axis.current,
        weight: axis.weight,
        softLimit: axis.softLimit,
        hardLimit: axis.hardLimit,
        tolerance: axis.tolerance,
        mandatory: axis.mandatory,
        optimizationMode: axis.optimizationMode,
        origin: axis.origin || { field: 'tempo', value: 'Aggro' },
        strength: axis.strength || 'PREFERRED'
      });
    }).sort((a, b) => (b.weight || 0) - (a.weight || 0));
  }

  /**
   * CapabilityConsolidator: Groups by (role, priority, mandatory, timing) respecting max playset cap
   * and budgeted strictly to (totalDeckSize - targetLandCount).
   * @private
   */
  static _consolidateSlots(normalizedAxes = [], format = 'STANDARD', totalDeckSize = 60, targetLandCount = 24) {
    const isSingletonFormat = format.toUpperCase() === 'COMMANDER';
    const maxPlayset = isSingletonFormat ? 1 : 4;
    const slots = [];

    let slotCounter = 1;
    const spellBudget = Math.max(1, totalDeckSize - targetLandCount);

    // 1. Allocate Mana Base (Land slot)
    slots.push(new AllocationSlot({
      slotId: `slot_${slotCounter++}_MANA_BASE`,
      role: 'Land',
      requiredDensity: targetLandCount,
      priority: 100,
      timing: 'MANA',
      mandatory: true,
      origin: { field: 'mana', value: 'Karsten' },
      strength: 'MANDATORY'
    }));

    // 2. Filter non-land spell axes (sorted by priority / weight descending)
    const spellAxes = normalizedAxes.filter(a => a.id !== 'MANA_BASE');
    let remainingBudget = spellBudget;

    // First pass: Allocate mandatory or top-priority core chunks (at least 1 playset per axis, up to its target)
    for (const axis of spellAxes) {
      if (remainingBudget <= 0) break;
      const role = axis.id;
      const targetDensity = Math.max(1, axis.target || maxPlayset);
      const priority = Math.round((axis.weight || 1) * 10);
      const mandatory = axis.mandatory || false;
      const timing = (role.includes('1') || role.includes('2')) ? 'EARLY' : 'MID';
      const origin = axis.origin || { field: 'tempo', value: 'Aggro' };
      const strength = axis.strength || 'PREFERRED';

      const allocation = Math.min(remainingBudget, Math.min(targetDensity, maxPlayset));
      if (allocation > 0) {
        slots.push(new AllocationSlot({
          slotId: `slot_${slotCounter++}_${role}`,
          role,
          requiredDensity: allocation,
          priority,
          timing,
          mandatory,
          origin,
          strength
        }));
        remainingBudget -= allocation;
      }
    }

    // Second pass: Distribute any remaining spell budget to high-priority axes with unsatisfied target density
    while (remainingBudget > 0) {
      let allocatedInCycle = false;
      for (const axis of spellAxes) {
        if (remainingBudget <= 0) break;
        const role = axis.id;
        const targetDensity = Math.max(1, axis.target || maxPlayset);
        const currentAllocated = slots
          .filter(s => s.role === role)
          .reduce((sum, s) => sum + s.requiredDensity, 0);

        if (currentAllocated < targetDensity) {
          const needed = targetDensity - currentAllocated;
          const chunkSize = Math.min(remainingBudget, Math.min(needed, maxPlayset));
          if (chunkSize > 0) {
            slots.push(new AllocationSlot({
              slotId: `slot_${slotCounter++}_${role}`,
              role,
              requiredDensity: chunkSize,
              priority: Math.round((axis.weight || 1) * 10),
              timing: (role.includes('1') || role.includes('2')) ? 'EARLY' : 'MID',
              mandatory: axis.mandatory || false,
              origin: axis.origin || { field: 'tempo', value: 'Aggro' },
              strength: axis.strength || 'PREFERRED'
            }));
            remainingBudget -= chunkSize;
            allocatedInCycle = true;
          }
        }
      }
      // If all targets are filled but budget remains, allocate additional support slots to highest-weight axis
      if (!allocatedInCycle && remainingBudget > 0) {
        const topAxis = spellAxes[0] || { id: 'CARD_FLOW', weight: 8 };
        const chunkSize = Math.min(remainingBudget, maxPlayset);
        slots.push(new AllocationSlot({
          slotId: `slot_${slotCounter++}_${topAxis.id}`,
          role: topAxis.id,
          requiredDensity: chunkSize,
          priority: Math.round((topAxis.weight || 1) * 10),
          timing: 'MID',
          mandatory: false,
          origin: { field: 'budget', value: 'Fill' },
          strength: 'OPTIONAL'
        }));
        remainingBudget -= chunkSize;
      }
    }

    return slots;
  }
}
