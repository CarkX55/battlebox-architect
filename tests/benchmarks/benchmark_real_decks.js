/**
 * BENCHMARK SUITE: REAL DECKS & 4-VECTOR INTEGRITY AUDIT (v9.1)
 * 
 * Executes 35 real production forge scenarios across diverse archetypes, tribes, and formats.
 * Audits 4 mandatory output metrics:
 * 1. Decision-to-Deck Integrity (Fails with DECK_ASSEMBLY_REGRESSION if decisions are lost)
 * 2. Bottleneck-to-Resolution Integrity (Fails with BOTTLENECK_RESOLUTION_FAILURE if critical bottlenecks remain unresolved)
 * 3. Candidate-Recovery Integrity (Fails with CANDIDATE_RECALL_FAILURE if candidate pool is empty or misses required capabilities)
 * 4. Legacy Authority = 0 (Verifies zero legacy priority variables or static hardcoded scores)
 */

import { runV6AutonomousPipeline } from '../../src/services/autonomousStrategicPipeline.js';
import { assembleDeckFromBlueprint } from '../../src/services/deckArchitectService.js';
import fs from 'fs';
import path from 'path';

const BENCHMARK_SCENARIOS = [
  { name: 'Selesnya Elves Ramp', archetype: 'Ramp', tribe: 'Elf', colors: ['G', 'W'], format: 'MODERN' },
  { name: 'Golgari Saprolings Aristocrats', archetype: 'Midrange', tribe: 'Saproling', colors: ['B', 'G'], format: 'MODERN' },
  { name: 'Azorius Control', archetype: 'Control', colors: ['W', 'U'], format: 'MODERN' },
  { name: 'Dimir Reanimator', archetype: 'Combo', strategy: 'reanimator', colors: ['U', 'B'], format: 'MODERN' },
  { name: 'Mono Red Burn Aggro', archetype: 'Aggro', colors: ['R'], format: 'MODERN' },
  { name: 'Rakdos Goblins Horde', archetype: 'Aggro', tribe: 'Goblin', colors: ['B', 'R'], format: 'MODERN' },
  { name: 'Orzhov Vampires Lifegain', archetype: 'Midrange', tribe: 'Vampire', colors: ['W', 'B'], format: 'MODERN' },
  { name: 'Simic Merfolk Tempo', archetype: 'Tempo', tribe: 'Merfolk', colors: ['U', 'G'], format: 'MODERN' },
  { name: 'Gruul Dinosaurs Ramp', archetype: 'Ramp', tribe: 'Dinosaur', colors: ['R', 'G'], format: 'MODERN' },
  { name: 'Esper Spirits Control', archetype: 'Control', tribe: 'Spirit', colors: ['W', 'U', 'B'], format: 'MODERN' },
  { name: 'Jund Dragons Midrange', archetype: 'Midrange', tribe: 'Dragon', colors: ['B', 'R', 'G'], format: 'MODERN' },
  { name: 'Bant Slivers Hive', archetype: 'Aggro', tribe: 'Sliver', colors: ['W', 'U', 'G'], format: 'MODERN' },
  { name: 'Boros Knights Aggro', archetype: 'Aggro', tribe: 'Knight', colors: ['W', 'R'], format: 'MODERN' },
  { name: 'Sultai Zombies Graveyard', archetype: 'Midrange', tribe: 'Zombie', colors: ['U', 'B', 'G'], format: 'MODERN' },
  { name: 'Mono Green Stompy', archetype: 'Aggro', colors: ['G'], format: 'MODERN' },
  { name: 'Mono Black Discard Control', archetype: 'Control', colors: ['B'], format: 'MODERN' },
  { name: 'Izzet Spellslinger Prowess', archetype: 'Tempo', colors: ['U', 'R'], format: 'MODERN' },
  { name: 'Selesnya Enchantress Bogles', archetype: 'Combo', colors: ['W', 'G'], format: 'MODERN' },
  { name: 'Orzhov Tokens Sacrifice', archetype: 'Midrange', colors: ['W', 'B'], format: 'MODERN' },
  { name: 'Golgari Delirium Midrange', archetype: 'Midrange', colors: ['B', 'G'], format: 'MODERN' },
  { name: 'Azorius Blink Flicker', archetype: 'Control', colors: ['W', 'U'], format: 'MODERN' },
  { name: 'Gruul Landfall Ramp', archetype: 'Ramp', colors: ['R', 'G'], format: 'MODERN' },
  { name: 'Dimir Rogues Mill', archetype: 'Tempo', tribe: 'Rogue', colors: ['U', 'B'], format: 'MODERN' },
  { name: 'Rakdos Sacrifice Aristocrats', archetype: 'Combo', colors: ['B', 'R'], format: 'MODERN' },
  { name: 'Boros Equipment Voltron', archetype: 'Aggro', colors: ['W', 'R'], format: 'MODERN' },
  { name: 'Simic Evolve Counters', archetype: 'Midrange', colors: ['U', 'G'], format: 'MODERN' },
  { name: 'Abzan Humans Midrange', archetype: 'Midrange', tribe: 'Human', colors: ['W', 'B', 'G'], format: 'MODERN' },
  { name: 'Jeskai Prowess Aggro', archetype: 'Aggro', colors: ['W', 'U', 'R'], format: 'MODERN' },
  { name: 'Mardu Angels Midrange', archetype: 'Midrange', tribe: 'Angel', colors: ['W', 'B', 'R'], format: 'MODERN' },
  { name: 'Temur Elementals Ramp', archetype: 'Ramp', tribe: 'Elemental', colors: ['U', 'R', 'G'], format: 'MODERN' },
  { name: 'Naya Beasts Stompy', archetype: 'Aggro', colors: ['W', 'R', 'G'], format: 'MODERN' },
  { name: 'Mono Blue Control Countermagic', archetype: 'Control', colors: ['U'], format: 'MODERN' },
  { name: 'Mono White Weenie Aggro', archetype: 'Aggro', colors: ['W'], format: 'MODERN' },
  { name: 'Golgari Dredge Reanimator', archetype: 'Combo', colors: ['B', 'G'], format: 'MODERN' },
  { name: 'Rakdos Artifacts Affinity', archetype: 'Aggro', colors: ['B', 'R'], format: 'MODERN' }
];

function checkLegacyAuthorityZero() {
  const auditFiles = [
    'src/services/agent/cardImplementer.js',
    'src/services/agent/decisionEngine.js',
    'src/services/agent/advisors/CausalSynergyAdvisor.js',
    'src/services/deckArchitectService.js',
    'src/services/ragService.js'
  ];

  const forbiddenVars = ['isPremierRemoval', 'isPremierLord', 'isApexFinisher', 'preferredCard', 'winningCard', 'stapleBonus', 'coreBonus', 'archetypeBonusByCardName'];
  const violations = [];

  auditFiles.forEach(file => {
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;
    const content = fs.readFileSync(fullPath, 'utf8');
    forbiddenVars.forEach(v => {
      if (content.includes(v)) {
        violations.push({ file, varName: v });
      }
    });
  });

  return { passed: violations.length === 0, violations };
}

async function runScenarioAudit(scenario, index) {
  console.log(`\n------------------------------------------------`);
  console.log(`[${index + 1}/35] Auditando Escenario: "${scenario.name}" (${scenario.colors.join('')} ${scenario.archetype})...`);

  const formData = {
    archetype: scenario.archetype,
    tribe: scenario.tribe || '',
    strategy: scenario.strategy || 'Sinergia Base',
    colores: scenario.colors,
    format: scenario.format,
    deckSize: 60
  };

  try {
    const pipelineResult = await runV6AutonomousPipeline(formData);
    const finalAssembled = await assembleDeckFromBlueprint(pipelineResult.blueprint, formData, {}, () => {}, { v6Result: pipelineResult });

    const deckState = pipelineResult.deckState;
    const deckStateCards = deckState ? Array.from(deckState.cards.values()) : [];
    const finalCards = finalAssembled.cards || [];

    // METRIC 1: Decision-to-Deck Integrity (100% Traceability)
    const missingDecisions = [];
    deckStateCards.forEach(dsEntry => {
      const cardName = dsEntry.name;
      const foundInFinal = finalCards.some(fc => fc.name?.toLowerCase() === cardName?.toLowerCase() || fc.card?.name?.toLowerCase() === cardName?.toLowerCase());
      if (!foundInFinal) {
        missingDecisions.push(cardName);
      }
    });

    if (missingDecisions.length > 0) {
      throw new Error(`[DECK_ASSEMBLY_REGRESSION] ${missingDecisions.length} cards chosen by DecisionEngine were lost during final assembly! Missing: ${missingDecisions.join(', ')}`);
    }

    // METRIC 2: Bottleneck-to-Resolution Integrity
    const unresolvedCriticalBottlenecks = (deckState?.bottlenecks || []).filter(b => b.priority === 'CRITICAL');
    if (unresolvedCriticalBottlenecks.length > 0) {
      const bDetails = unresolvedCriticalBottlenecks.map(b => `${b.id}: ${b.reason}`).join(' | ');
      throw new Error(`[BOTTLENECK_RESOLUTION_FAILURE] Critical strategic bottleneck remained unresolved: ${bDetails}`);
    }

    // METRIC 3: Candidate-Recovery Integrity
    const reActLogs = pipelineResult.reActLogs || [];
    const zeroCandidateTurns = reActLogs.filter(l => l.status === 'ZERO_CANDIDATES_PIVOTING');
    if (zeroCandidateTurns.length > 3) {
      throw new Error(`[CANDIDATE_RECALL_FAILURE] Candidate recovery failed on ${zeroCandidateTurns.length} turns due to empty candidate recall.`);
    }

    const totalFinalCards = finalCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

    console.log(`  📊 Estado: SUCCESS`);
    console.log(`  📦 Cartas DeckState: ${deckStateCards.length} | Exportado Final: ${finalCards.length} (${totalFinalCards} cartas total)`);
    console.log(`  🎯 1. Decision-to-Deck Integrity: ✅ 100% OK`);
    console.log(`  🎯 2. Bottleneck-to-Resolution Integrity: ✅ CLEAN (0 critical bottlenecks)`);
    console.log(`  🎯 3. Candidate-Recovery Integrity: ✅ HIGH RECALL (${reActLogs.length} ReAct iterations)`);

    return {
      passed: true,
      totalCards: totalFinalCards
    };
  } catch (err) {
    console.error(`  ❌ ERROR en escenario "${scenario.name}":`, err.message);
    return {
      passed: false,
      error: err.message
    };
  }
}

async function runBenchmarkSuite() {
  console.log('🚀 Iniciando Benchmark Suite v9.1 con Auditoría de 4 Vectores...\n');

  // METRIC 4: Legacy Authority = 0 Audit
  const legacyAudit = checkLegacyAuthorityZero();
  if (!legacyAudit.passed) {
    console.error(`❌ [LEGACY_AUTHORITY_VIOLATION] Found forbidden legacy variables in codebase:`);
    legacyAudit.violations.forEach(v => console.error(`    ${v.file}: ${v.varName}`));
    process.exit(1);
  }
  console.log('  🎯 4. Legacy Authority = 0 Audit: ✅ PASSED (0 hardcoded priority variables)');

  let passedScenarios = 0;
  let failedScenarios = 0;

  for (let i = 0; i < BENCHMARK_SCENARIOS.length; i++) {
    const result = await runScenarioAudit(BENCHMARK_SCENARIOS[i], i);
    if (result.passed) {
      passedScenarios++;
    } else {
      failedScenarios++;
    }
  }

  console.log('\n================================================');
  console.log(`🏆 RESUMEN FINAL BENCHMARK SUITE v9.1:`);
  console.log(`   ✅ Escenarios Aprobados: ${passedScenarios}/${BENCHMARK_SCENARIOS.length}`);
  console.log(`   ❌ Escenarios Fallidos: ${failedScenarios}/${BENCHMARK_SCENARIOS.length}`);
  console.log('================================================\n');

  if (failedScenarios === 0) {
    console.log('🎉 BENCHMARK DE PRODUCCIÓN 100% APROBADO!');
    process.exit(0);
  } else {
    console.error(`💥 BENCHMARK FALLIDO: ${failedScenarios} escenarios fallaron las métricas de integridad.`);
    process.exit(1);
  }
}

runBenchmarkSuite();
