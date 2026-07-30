/**
 * CapabilitySynthesisPass.js - Pass 1
 * Reads: PlanIR, CapabilityDependencyGraph
 * Writes: CapabilityRequirements
 * Contract: CompilerState -> CapabilitySynthesisPass -> CompilerState'
 */

import { CapabilityRequirements } from '../ir/CapabilityRequirements.js';
import { StrategicKnowledgeBase } from '../ontology/StrategicKnowledgeBase.js';

export class CapabilitySynthesisPass {
  static READS = Object.freeze(['planIR', 'capabilityDependencyGraph', 'goal']);
  static WRITES = Object.freeze(['capabilityRequirements']);

  static execute(state) {
    const archetype = state.goal?.strategicArchetype || state.planIR?.archetype || 'Ramp';
    const pattern = StrategicKnowledgeBase.getPattern(archetype);

    const reqsList = [
      { contractKey: `${pattern.primaryEngine}_DefaultObjective_cmcany_mtrue`, capability: pattern.primaryEngine, objective: 'DefaultObjective', curveWindow: 'any', mandatory: true, minCount: 6, idealCount: 8, maxCount: 10, derivedFrom: [pattern.primaryEngine], priority: 'critical' },
      { contractKey: `${pattern.secondaryEngine}_DefaultObjective_cmcany_mfalse`, capability: pattern.secondaryEngine, objective: 'DefaultObjective', curveWindow: 'any', mandatory: false, minCount: 4, idealCount: 6, maxCount: 8, derivedFrom: [pattern.secondaryEngine], priority: 'required' },
      { contractKey: `${pattern.payoffEngine}_DefaultObjective_cmcany_mfalse`, capability: pattern.payoffEngine, objective: 'DefaultObjective', curveWindow: 'any', mandatory: false, minCount: 10, idealCount: 12, maxCount: 14, derivedFrom: [pattern.payoffEngine], priority: 'required' }
    ];

    const capabilityRequirements = new CapabilityRequirements({
      archetype,
      requirements: reqsList,
      targetCurve: { 1: 4, 2: 12, 3: 8, 4: 6, 5: 4 }
    });

    return state.transition({ capabilityRequirements });
  }
}
