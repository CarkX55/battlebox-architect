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

    // Step 1: CapabilityNormalizer — Canonical IDs & Stable Ordering
    const normalizedAxes = CapabilityPlanner._normalizeAndOrderAxes(rawAxes);

    // Step 2: CapabilityConsolidator — Grouping by (role, priority, mandatory, timing) with MAX_PLAYSET cap
    const consolidatedSlots = CapabilityPlanner._consolidateSlots(normalizedAxes, intentPackage.format);

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
   * CapabilityConsolidator: Groups by (role, priority, mandatory, timing) respecting max playset cap.
   * @private
   */
  static _consolidateSlots(normalizedAxes = [], format = 'STANDARD') {
    const isSingletonFormat = format.toUpperCase() === 'COMMANDER';
    const maxPlayset = isSingletonFormat ? 1 : 4;
    const slots = [];

    let slotCounter = 1;

    for (const axis of normalizedAxes) {
      const role = axis.id;
      const targetDensity = Math.max(1, axis.target || 4);
      const priority = Math.round((axis.weight || 1) * 10);
      const mandatory = axis.mandatory || false;
      const timing = (role.includes('1') || role.includes('2')) ? 'EARLY' : 'MID';
      const origin = axis.origin || { field: 'tempo', value: 'Aggro' };
      const strength = axis.strength || 'PREFERRED';

      if (role === 'MANA_BASE') {
        slots.push(new AllocationSlot({
          slotId: `slot_${slotCounter++}_${role}`,
          role: 'Land',
          requiredDensity: targetDensity,
          priority: 100,
          timing: 'MANA',
          mandatory: true,
          origin,
          strength: 'MANDATORY'
        }));
      } else {
        // Split targetDensity into playset chunks of at most maxPlayset
        let remaining = targetDensity;
        while (remaining > 0) {
          const chunkSize = Math.min(remaining, maxPlayset);
          slots.push(new AllocationSlot({
            slotId: `slot_${slotCounter++}_${role}`,
            role,
            requiredDensity: chunkSize,
            priority,
            timing,
            mandatory,
            origin,
            strength
          }));
          remaining -= chunkSize;
        }
      }
    }

    return slots;
  }
}
