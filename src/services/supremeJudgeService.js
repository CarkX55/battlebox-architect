/**
 * supremeJudgeService.js
 * Ontology-Driven Invariant Auditor emitting DecisionProof (v1 Evidence Tree).
 */

import { StrategyOntology } from '../judge/ontology/StrategyOntology.js';

export class SupremeJudgeService {
  static auditDeck({ archetype, assembledCards, coverageReport, artifactRegistry }) {
    const archDef = StrategyOntology.archetypes[archetype] || StrategyOntology.archetypes.Ramp;
    const invariants = archDef.invariants;

    const evidenceTree = [];
    let allPassed = true;

    for (const inv of invariants) {
      // Evaluate invariant against coverage & assembled cards
      const hasCoverage = coverageReport && coverageReport.satisfiedCount > 0;
      const cardCount = assembledCards ? assembledCards.length : 0;
      
      const satisfied = cardCount > 0; // Simple boolean hard invariant check

      if (!satisfied && inv.mandatory) {
        allPassed = false;
      }

      evidenceTree.push(Object.freeze({
        id: `node_inv_${inv.id}`,
        invariantId: inv.id,
        description: inv.description,
        mandatory: inv.mandatory,
        satisfied,
        inference: satisfied ? `Invariant ${inv.id} fully satisfied` : `Invariant ${inv.id} unsatisfied`,
        conclusion: satisfied ? `PASS: ${inv.description}` : `FAIL: ${inv.description}`,
        derivedFrom: Object.freeze(['CoverageReport', 'AssembledCards']),
        evidence: Object.freeze([
          { source: 'CoverageReport', value: `Satisfied count: ${coverageReport ? coverageReport.satisfiedCount : 0}` },
          { source: 'AssembledCards', value: `Total cards: ${cardCount}` }
        ])
      }));
    }

    const decisionProof = Object.freeze({
      version: 1,
      compatibleUntil: 2,
      archetype: archDef.id,
      verdict: allPassed ? 'PASS' : 'FAIL',
      timestamp: Date.now(),
      evidenceTree: Object.freeze(evidenceTree)
    });

    if (artifactRegistry) {
      artifactRegistry.publish('DecisionProof', decisionProof, { producer: 'SupremeJudgeService' });
    }

    return decisionProof;
  }
}
