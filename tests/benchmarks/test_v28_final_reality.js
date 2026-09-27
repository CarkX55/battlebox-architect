/**
 * Benchmark Suite: V28.1 Reality Benchmark — Cases A through J (10 Fire Tests)
 * 
 * Verifies that the V28.1 Strategic Playability & Closed-Loop Compiler functions
 * as a true empirical strategic compiler rather than a mere tag selector.
 */

import { StrategicPlayabilityEngine } from '../../src/services/compiler/core/strategicPlayabilityEngine.js';
import { WinPathExecutionSimulator } from '../../src/services/compiler/core/winPathExecutionSimulator.js';
import { FunctionalRedundancyGraph, RedundancyTier } from '../../src/services/compiler/core/functionalRedundancyGraph.js';
import { RecoveryPathEngine } from '../../src/services/compiler/core/recoveryPathEngine.js';
import { AdversarialPlayabilityEngine } from '../../src/services/compiler/core/adversarialPlayabilityEngine.js';
import { StateCandidateRanker } from '../../src/services/compiler/core/stateCandidateRanker.js';
import { MarginalCopyEvaluator } from '../../src/services/compiler/core/marginalCopyEvaluator.js';
import { DeterministicSupremeJudge } from '../../src/services/compiler/core/deterministicSupremeJudge.js';
import { IdentityFirewall } from '../../src/services/compiler/core/identityFirewall.js';
import { PRNG } from '../../src/services/compiler/core/prng.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    passed++;
  }
}

console.log('================================================================');
console.log('  V28.1 REALITY BENCHMARK: CASOS DE FUEGO A - J (10 SUITES)     ');
console.log('================================================================\n');

try {
  // ─── CASO A: Misma estructura causal, distinta jugabilidad ────────────────
  console.log('--- CASO A: Misma estructura causal, distinta jugabilidad ---');
  const deckA_Smooth = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, power: 1, toughness: 1, oracle_text: 'Other Goblins you control get +1/+1' }
  ];

  const deckA_Clunky = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Flamewave Invoker', count: 4, type_line: 'Creature — Goblin Mutant', cmc: 3, power: 2, toughness: 2, oracle_text: '{7}{R}: Flamewave Invoker deals 5 damage' },
    { name: 'Ogre Battledriver', count: 4, type_line: 'Creature — Ogre Warrior', cmc: 4, power: 3, toughness: 3, oracle_text: 'Whenever another creature enters...' },
    { name: 'Lava Axe', count: 4, type_line: 'Sorcery', cmc: 5, oracle_text: 'Lava Axe deals 5 damage to target player.' },
    { name: 'Volcanic Dragon', count: 4, type_line: 'Creature — Dragon', cmc: 6, power: 4, toughness: 4, oracle_text: 'Flying, haste' },
    { name: 'Fire Elemental', count: 4, type_line: 'Creature — Elemental', cmc: 5, power: 5, toughness: 4, oracle_text: '' }
  ];

  const simA_Smooth = StrategicPlayabilityEngine.simulatePlayability(deckA_Smooth, { simulationCount: 500 });
  const simA_Clunky = StrategicPlayabilityEngine.simulatePlayability(deckA_Clunky, { simulationCount: 500 });

  assert(simA_Smooth.winPath.lethalRate > simA_Clunky.winPath.lethalRate, 'Caso A: Mazo con curva suave supera deterministamente en letalidad al mazo pesado');
  assert(simA_Smooth.execution.openingHandKeepRate > simA_Clunky.execution.openingHandKeepRate, 'Caso A: Mazo suave tiene mayor tasa de retención de mano inicial');

  // ─── CASO B: WinPath Falso Positivo ───────────────────────────────────────
  console.log('\n--- CASO B: WinPath Falso Positivo ---');
  const falsePositiveDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Ancient Dragon', count: 8, type_line: 'Creature — Dragon', cmc: 6, power: 6, toughness: 6, oracle_text: 'Flying' },
    { name: 'Inferno Titan', count: 8, type_line: 'Creature — Giant', cmc: 6, power: 6, toughness: 6, oracle_text: 'ETB deals 3' }
  ];

  const wpReportB = WinPathExecutionSimulator.simulateWinPath(falsePositiveDeck, {
    winPathNodes: ['TURN1_PRESSURE', 'TURN2_DEVELOPMENT', 'AMPLIFY_BOARD_PRESSURE', 'LETHAL_REACH'],
    simulationCount: 300
  });

  assert(wpReportB.nodeCompletionRates.TURN1_PRESSURE === 0, 'Caso B: Detecta 0% de ejecución en TURN1_PRESSURE');
  assert(wpReportB.failedStep === 'TURN1_PRESSURE', 'Caso B: Diagnostica cuello de botella causal en Turno 1');

  // ─── CASO C: Interrupción Adversaria ──────────────────────────────────────
  console.log('\n--- CASO C: Interrupción Adversaria ---');
  const advResilientDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 4, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, power: 1, toughness: 1, oracle_text: 'Whenever a Goblin dies, exile top card, you may play it' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Lava Spike', count: 4, type_line: 'Sorcery', cmc: 1, oracle_text: 'deals 3 damage to target player' }
  ];

  const advFragileDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Memnite', count: 16, type_line: 'Artifact Creature', cmc: 0, power: 1, toughness: 1, oracle_text: '' },
    { name: 'Ornithopter', count: 4, type_line: 'Artifact Creature', cmc: 0, power: 0, toughness: 2, oracle_text: 'Flying' }
  ];

  const advSimResilient = AdversarialPlayabilityEngine.simulateAdversarialScenarios(advResilientDeck, { simulationCount: 300 });
  const advSimFragile = AdversarialPlayabilityEngine.simulateAdversarialScenarios(advFragileDeck, { simulationCount: 300 });

  assert(advSimResilient.survivalRate > advSimFragile.survivalRate, 'Caso C: Mazo con daño directo y flujo sobrevive a disrupciones (sweepers/removals) frente al mazo frágil');

  // ─── CASO D: Redundancia Funcional (4+2+2 vs 4+4) ──────────────────────────
  console.log('\n--- CASO D: Redundancia Funcional (4+2+2 vs 4+4) ---');
  const deckD_Diverse = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Monastery Swiftspear', count: 2, type_line: 'Creature — Human Monk', cmc: 1, power: 1, toughness: 2, oracle_text: 'Haste' },
    { name: 'Ragavan, Nimble Pilferer', count: 2, type_line: 'Legendary Creature — Monkey Pirate', cmc: 1, power: 2, toughness: 1, oracle_text: 'Dash' },
    { name: 'Lightning Bolt', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 3 damage to any target' },
    { name: 'Play with Fire', count: 4, type_line: 'Instant', cmc: 1, oracle_text: 'deals 2 damage to any target' }
  ];

  const redD_Analysis = FunctionalRedundancyGraph.analyzeDeckRedundancy(deckD_Diverse);
  assert(redD_Analysis.nodeAnalysis.T1_PRESSURE.distinctProvidersCount === 3, 'Caso D: Identifica 3 proveedores independientes en paquete 4+2+2');
  assert(redD_Analysis.singlePointsOfFailure.length === 0, 'Caso D: Cero puntos únicos de fallo (SPOF) en paquete diversificado');

  // ─── CASO E: Copy Allocation Dinámico ─────────────────────────────────────
  console.log('\n--- CASO E: Copy Allocation Dinámico ---');
  const ragavanCard = { name: 'Ragavan, Nimble Pilferer', cmc: 1, type_line: 'Legendary Creature — Monkey Pirate', oracle_text: 'Dash' };
  const boltCard = { name: 'Lightning Bolt', cmc: 1, type_line: 'Instant', oracle_text: 'deals 3 damage to any target' };

  const ragavanCopyEval = MarginalCopyEvaluator.evaluateOptimalCopies(ragavanCard, {}, { format: 'MODERN' });
  const boltCopyEval = MarginalCopyEvaluator.evaluateOptimalCopies(boltCard, {}, { format: 'MODERN', winPath: ['LETHAL_REACH'] });

  assert(ragavanCopyEval.recommendedCopies <= 3, 'Caso E: Ragavan legendario se detiene en <= 3 copias');
  assert(ragavanCopyEval.stoppingReason === 'LEGENDARY_COLLISION_CAP', 'Caso E: Razón de parada es LEGENDARY_COLLISION_CAP');
  assert(boltCopyEval.recommendedCopies === 4, 'Caso E: Lightning Bolt no-legendario alcanza 4 copias');

  // ─── CASO F: Infrastructure Bridge Universal ──────────────────────────────
  console.log('\n--- CASO F: Infrastructure Bridge Universal ---');
  const llanowarCard = { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' };
  const dragonMidrangeCheck = IdentityFirewall.validateCard(
    llanowarCard,
    { archetypeKey: 'DRAGON_MIDRANGE' },
    { primaryTribe: 'Dragon', archetype: 'Midrange' }
  );

  assert(dragonMidrangeCheck.isAllowed === true, 'Caso F: Dragon Midrange admite Llanowar Elves como puente universal de infraestructura');

  // ─── CASO G: RAG Isolation (Advisory Only) ────────────────────────────────
  console.log('\n--- CASO G: RAG Isolation (Advisory Only) ---');
  const mockState = {
    cards: [{ name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 }],
    openDemands: [],
    provenNodes: [],
    manaPips: { R: 4 }
  };

  const candidatePool = [
    { name: 'Play with Fire', cmc: 1, type_line: 'Instant', oracle_text: 'deals 2 damage to any target' },
    { name: 'Dynamite Diver', cmc: 1, type_line: 'Creature — Goblin Pilot', oracle_text: 'When this creature dies, it deals 1 damage to any target.' }
  ];

  const rankingG = StateCandidateRanker.rankCandidatesByStateDelta(
    mockState,
    candidatePool,
    { executionPolicy: { tempo: 'Aggro' } },
    { format: 'MODERN' },
    { role: 'CHEAP_REMOVAL' }
  );

  assert(rankingG.winningCandidate.name === 'Play with Fire', 'Caso G: StateCandidateRanker elige Play with Fire independientemente de puntuaciones de RAG');

  // ─── CASO H: Simulation Feedback en StateCandidateRanker ──────────────────
  console.log('\n--- CASO H: Simulation Feedback en StateCandidateRanker ---');
  const candHighExec = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.90,
    winPathQuality: 0.85,
    synergyScore: 0.20
  };
  const candLowExec = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.85,
    stateExecution: 0.40,
    winPathQuality: 0.40,
    synergyScore: 0.80 // Much higher static synergy, but fails execution
  };

  const paretoH = StateCandidateRanker.compareDominanceVectors(candHighExec, candLowExec);
  assert(paretoH > 0, 'Caso H: Candidato con 90% de ejecución domina en Capa 4 sobre candidato con alta sinergia estática pero 40% de ejecución');

  // ─── CASO I: Recovery Post-Wrath / Destrucción de Motor ───────────────────
  console.log('\n--- CASO I: Recovery Post-Wrath / Destrucción de Motor ---');
  const hordemasterDeck = [
    { name: 'Mountain', count: 20, type_line: 'Basic Land — Mountain', cmc: 0 },
    { name: 'Goblin Guide', count: 4, type_line: 'Creature — Goblin Scout', cmc: 1, power: 2, toughness: 2, oracle_text: 'Haste' },
    { name: 'Rundvelt Hordemaster', count: 4, type_line: 'Creature — Goblin Warrior', cmc: 2, power: 1, toughness: 1, oracle_text: 'Whenever a Goblin dies, exile top card, you may play it' },
    { name: 'Light Up the Stage', count: 4, type_line: 'Sorcery', cmc: 3, oracle_text: 'exile the top two cards, you may play them' }
  ];

  const recAnalysisI = RecoveryPathEngine.evaluateRecoveryPaths(hordemasterDeck);
  assert(recAnalysisI.recoveryProbability > 0.40, 'Caso I: Motor con Hordemaster y Light Up the Stage registra probabilidad de recuperación > 40%');

  // ─── CASO J: Experiencia Pacto de Amigos (Desempate de Potencia Equivalente) ──
  console.log('\n--- CASO J: Experiencia Pacto de Amigos ---');
  const candInteractive = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.90,
    stateExecution: 0.90,
    winPathQuality: 0.85,
    resilienceScore: 0.80,
    stateDeltaScore: 0.85,
    synergyScore: 0.80,
    experienceScore: 0.95
  };
  const candLockout = {
    roleValidity: true,
    hasUnsupportedDemands: false,
    roleQuality: 0.90,
    stateExecution: 0.90,
    winPathQuality: 0.85,
    resilienceScore: 0.80,
    stateDeltaScore: 0.85,
    synergyScore: 0.80,
    experienceScore: 0.30
  };

  const paretoJ = StateCandidateRanker.compareDominanceVectors(candInteractive, candLockout);
  assert(paretoJ > 0, 'Caso J: Entre dos cartas con potencia idéntica (0.90/0.90/0.85), Pacto de Amigos elige la de interacción dinámica sobre la de bloqueo solitario');

  console.log('\n================================================================');
  console.log(`🎉 SUITE BENCHMARK V28.1 COMPLETA: ${passed}/${total} CASOS DE FUEGO PASADOS`);
  console.log('================================================================');
} catch (e) {
  console.error('\n❌ BENCHMARK V28.1 ERROR:', e);
  process.exit(1);
}
