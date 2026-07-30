/**
 * src/judge/manifest/PipelineManifest.js
 * Declarative configuration manifest for Supreme Judge Compiler Pass Pipeline.
 */

export const DEFAULT_PIPELINE_MANIFEST = Object.freeze({
  version: '7.0',
  name: 'Standard Supreme Judge Compiler Pipeline',
  ontologyVersion: '1.0.0',
  dslVersion: '1.0.0',
  cardSemanticIRVersion: '1.0.0',
  strategicIRVersion: '1.0.0',
  plannerVersion: '1.0.0',
  passGraphVersion: '1.0.0',
  constraintVersion: '1.0.0',
  knowledgeVersion: '1.0.0',
  semanticResolverVersion: '1.0.0',

  passes: [
    'ManaAnalysisPass',
    'EngineAnalysisPass',
    'InteractionAnalysisPass',
    'DeadCardAnalysisPass'
  ],

  planner: {
    maxCandidates: 25,
    goals: [
      { name: 'IncreaseConsistency', priority: 10 },
      { name: 'FixManaDeficit', priority: 9 },
      { name: 'ImproveInteraction', priority: 7 },
      { name: 'ReduceDeadCards', priority: 5 }
    ]
  },

  pareto: {
    objectives: ['consistency', 'resilience', 'tempo', 'interaction']
  },

  constraints: {
    enforceFormatLegality: true,
    enforceColorIdentity: true,
    enforceMaxCopies: true,
    enforceTargetDeckSize: true
  }
});

export function getPipelineManifestForFormat(format = 'MODERN') {
  const normFormat = (format || 'MODERN').toUpperCase();
  
  if (normFormat === 'COMMANDER' || normFormat === 'EDH') {
    return Object.freeze({
      ...DEFAULT_PIPELINE_MANIFEST,
      name: 'Commander 100-Card Singleton Pipeline',
      constraints: {
        ...DEFAULT_PIPELINE_MANIFEST.constraints,
        maxCopiesDefault: 1,
        targetDeckSize: 100,
        enforceCommanderColorIdentity: true
      }
    });
  }

  return DEFAULT_PIPELINE_MANIFEST;
}
