/**
 * DiagnosisPass.js - Pass 5
 * Reads: SimulationResult
 * Writes: HypothesisSet, DecisionProof
 * Contract: CompilerState -> DiagnosisPass -> CompilerState'
 */

import { MatchupMatrix } from '../simulation/MatchupMatrix.js';
import { SupremeJudgeService } from '../../services/supremeJudgeService.js';

export class DiagnosisPass {
  static READS = Object.freeze(['simulationResult', 'deck', 'executionContracts']);
  static WRITES = Object.freeze(['decisionProof', 'metaFeedback']);

  static execute(state, artifactRegistry) {
    const matchupResults = MatchupMatrix.evaluateDeck(state.deck, state.simulationResult);

    const decisionProof = SupremeJudgeService.auditDeck({
      archetype: state.goal?.strategicArchetype || 'Ramp',
      assembledCards: state.deck,
      coverageReport: { satisfiedCount: state.executionContracts.length, totalCount: state.executionContracts.length },
      artifactRegistry
    });

    const metaFeedback = [];
    for (const [scenName, res] of Object.entries(matchupResults)) {
      if (res.winRate < 50) {
        metaFeedback.push(Object.freeze({
          observation: `Suboptimal win rate against ${scenName} (${res.winRate}%)`,
          evidence: Object.freeze({ winRate: res.winRate, CI95: res.confidenceInterval95, failureModes: res.dominantFailureModes }),
          diagnosis: 'InteractionDensityBelowThreshold',
          hypothesis: 'Increasing early interaction or cheaper ramp will boost win rate above 60%',
          recommendation: 'Inject GreenSources >= 20 constraint or lower average curve',
          constraintFeedback: Object.freeze({
            newConstraints: Object.freeze(['EarlyRemoval >= 6']),
            priority: 'HIGH'
          })
        }));
      }
    }

    return state.transition({ decisionProof, metaFeedback });
  }
}
