/**
 * src/services/compiler/adapters/rankerBridgeAdapter.js
 * 
 * RankerBridgeAdapter: Adaptador de Puente para el Motor de Scoring y Ranking de Candidatos.
 * Conecta cardScoringEngine.js con el Strategic Kernel v11 sin modificar su código interno.
 */

import { scoreAndRankCandidatePool } from '../../cardScoringEngine.js';

export class RankerBridgeAdapter {
  constructor(candidatePoolSupplier = null) {
    this.id = 'RankerBridgeAdapter';
    this.phase = 'Ranker';
    this.requires = ['PlannerBridgeAdapter'];
    this.capabilities = {
      canRead: ['capabilityGraph', 'deckState'],
      canWrite: ['decisionFrontier'],
      consumesEvents: ['CapabilitySatisfied'],
      producesEvents: ['DecisionTaken']
    };
    this.candidatePoolSupplier = candidatePoolSupplier;
  }

  async execute({ context, state, artifacts }) {
    context.log('info', `[RankerBridgeAdapter] Evaluando y ordenando frontera de candidatos.`);

    // Obtener pool de cartas candidatas
    const pool = typeof this.candidatePoolSupplier === 'function' 
      ? await this.candidatePoolSupplier(context) 
      : (state.reasoningState.candidatePool || []);

    const deckDNA = {
      archetype: context.config.archetype,
      deckSkeleton: {
        curveDistribution: { 1: 12, 2: 14, 3: 8, 4: 4, 5: 0 }
      }
    };

    const injectedCoreCards = (state.deckState?.slots || []).filter(Boolean);

    // Invocar el motor determinista de scoring
    const scoredPool = scoreAndRankCandidatePool(pool, deckDNA, injectedCoreCards);

    // Actualizar Frontera de Pareto en reasoningState
    const topFrontier = scoredPool.slice(0, 15);
    
    state.mutate(st => {
      st.reasoningState.decisionFrontier.set('primary_candidates', topFrontier);
    });

    if (artifacts) {
      artifacts.addFact(
        'RANKED_CANDIDATES_COUNT',
        scoredPool.length,
        20,
        0.90,
        'RankerBridgeAdapter'
      );

      if (topFrontier.length > 0) {
        artifacts.addEvidence(
          'RankerBridgeAdapter',
          { topCandidate: topFrontier[0].name, score: topFrontier[0].score },
          [{ statement: `Candidato top 1 identificado: ${topFrontier[0].name} (Score: ${topFrontier[0].score})` }]
        );
      }
    }

    context.eventBus.emit('DecisionTaken', {
      capabilityId: 'primary_candidates',
      frontier: topFrontier,
      totalRanked: scoredPool.length
    }, { producer: this.id });

    return {
      status: 'SUCCESS',
      totalRanked: scoredPool.length,
      topCandidate: topFrontier[0]?.name || null
    };
  }
}
