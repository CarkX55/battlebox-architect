/**
 * src/judge/services/supremeJudgeService.js
 * Central Core Orchestrator for Supreme Judge v7 Multistage Pipeline.
 */

import { getPipelineManifestForFormat } from '../manifest/PipelineManifest.js';
import { generateAuditVersionFingerprint } from '../ontology/VersionedOntology.js';
import { createImmutableStrategicIR } from '../ir/ImmutableStrategicIR.js';
import { FactsRepository } from '../facts/FactsRepository.js';
import { ConstraintEngine } from '../constraints/ConstraintEngine.js';
import { PassScheduler } from '../passes/PassScheduler.js';
import { createEvaluationContext } from '../planner/EvaluationContext.js';
import { GoalDirectedPlanner } from '../planner/GoalDirectedPlanner.js';
import { ParetoTournamentEngine } from '../pareto/ParetoTournamentEngine.js';
import { IndependentValidationPipeline } from '../validation/IndependentValidationPipeline.js';
import { buildExecutableStrategyPlan } from '../plan/ExecutableStrategyPlan.js';
import { SemanticReplacer } from '../capabilities/SemanticReplacer.js';
import { buildTransactionalBlueprint } from '../patches/TransactionalBlueprint.js';
import { formatSupremeJudgeReport } from '../presentation/aiNarrativeFormatter.js';

export async function runSupremeJudgeAudit(cards = [], formData = {}, cardDatabase = []) {
  // 1. Load pipeline manifest for format
  const manifest = getPipelineManifestForFormat(formData.format || formData.formato);
  const auditFingerprint = generateAuditVersionFingerprint(Date.now());

  // 2. Build Level 2 Immutable Strategic IR
  const strategicIR = createImmutableStrategicIR(cards, formData);

  // 3. Universal Constraint Engine Validation
  const constraintEngine = new ConstraintEngine(manifest);
  const constraintCheck = constraintEngine.validateIR(strategicIR);

  // 4. Execute Analysis Pass Pipeline
  const factsRepository = new FactsRepository();
  const passScheduler = new PassScheduler();
  const passes = passScheduler.schedulePasses(manifest);

  passes.forEach(pass => {
    try {
      pass.execute(strategicIR, factsRepository);
    } catch (err) {
      console.warn(`[Supreme Judge] Warning in pass ${pass.name}:`, err.message);
    }
  });

  // 5. Goal-Directed Strategic Planner & Evaluation Context
  const evaluationContext = createEvaluationContext(manifest, formData);
  const planner = new GoalDirectedPlanner(evaluationContext);
  const candidatePlans = planner.generateCandidatePlans(factsRepository, strategicIR);

  // 6. Pareto Tournament Engine
  const paretoEngine = new ParetoTournamentEngine(evaluationContext);
  const paretoResults = paretoEngine.evaluateTournament(candidatePlans);

  // 7. Independent Final Validation Pipeline
  const validator = new IndependentValidationPipeline(constraintEngine);
  const validationResult = validator.validatePlan(paretoResults.winner, strategicIR);

  // 8. Build Executable Strategy Plan
  const executablePlan = buildExecutableStrategyPlan(paretoResults.winner, evaluationContext);

  // 9. Deferred Semantic Replacer
  const replacer = new SemanticReplacer(cardDatabase);
  const resolvedSwaps = replacer.resolvePlanSwaps(executablePlan, strategicIR);

  // 10. Compile Transactional Blueprint
  const blueprint = buildTransactionalBlueprint(resolvedSwaps, paretoResults.winner, paretoResults);

  // 11. Format Structured Report
  const finalReport = formatSupremeJudgeReport({
    strategicIR,
    factsRepository,
    constraintCheck,
    executablePlan,
    paretoResults,
    blueprint,
    auditFingerprint
  });

  return finalReport;
}
