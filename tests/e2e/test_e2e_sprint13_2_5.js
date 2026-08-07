/**
 * tests/e2e/test_e2e_sprint13_2_5.js
 * 
 * Test de Integración E2E para Sprint 13.2.5 (Validación Competitiva, Caching Multinivel L1-L3 y Delta de Versiones).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { SemanticCache } from '../../src/services/compiler/core/semanticCache.js';
import { HumanVsAIComparator } from '../../src/services/compiler/plugins/magic/humanVsAIComparator.js';
import { VersionDeltaComparator } from '../../src/services/compiler/core/versionDeltaComparator.js';
import { KernelTelemetry } from '../../src/services/compiler/core/kernelTelemetry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const benchmarksDir = path.join(__dirname, '../benchmarks');

async function runSprint1325E2ETest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 13.2.5 MULTIDIMENSIONAL & CACHE L1-L3) ===');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASÓ: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FALLÓ: ${message}`);
      failed++;
    }
  }

  // 1. Testing SemanticCache Multi-Tier (L1, L2, L3)
  console.log('\n--- 1. Testing Multi-Tier SemanticCache (L1, L2, L3) ---');
  const cache = new SemanticCache();
  
  // L1
  cache.setL1('Llanowar Elves', { cardName: 'Llanowar Elves', capabilities: ['cap.mana.acceleration.t1.v1'] });
  assert(cache.getL1('Llanowar Elves') !== null, 'L1 SemanticNodeCache funcionando');

  // L2
  cache.setL2('elves', { archetype: 'Golgari Elves', graphNodes: 12 });
  assert(cache.getL2('elves') !== null, 'L2 CapabilityGraphCache funcionando');

  // L3
  cache.setL3('DECK_HASH_123', { estimatedKillTurn: 4.0 });
  assert(cache.getL3('DECK_HASH_123') !== null, 'L3 SimulationReportCache funcionando');

  const stats = cache.getStats();
  assert(stats.totalHits === 3, 'Multi-Tier Cache registró 3 hits acumulados');

  // 2. Testing 5 Benchmarks con Perfiles de Vector Diferenciados
  console.log('\n--- 2. Testing Competitive Benchmarks (Distinct Vector Profiles) ---');
  const benchmarkFiles = fs.readdirSync(benchmarksDir).filter(f => f.endsWith('.json'));

  const profiles = [];
  benchmarkFiles.forEach(file => {
    const filePath = path.join(benchmarksDir, file);
    const benchmarkData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    const aiDeckSlots = [
      { name: 'Basic Land', quantity: 20, isBasicLand: true }
    ];
    (benchmarkData.expectedCapabilities || []).forEach(req => {
      aiDeckSlots.push({
        name: `Card for ${req.capabilityId}`,
        quantity: req.minUnits || 4,
        capability: req.capabilityId,
        cmc: 1
      });
    });

    const report = HumanVsAIComparator.compareDeckToBenchmark(aiDeckSlots, benchmarkData);
    profiles.push({ archetype: benchmarkData.archetype, vector: report.vector });

    assert(report.isCompetitive === true, `Benchmark ${benchmarkData.archetype} verificado (Score: ${report.overallDeckScore}, Speed: ${report.vector.speedScore}, Recovery: ${report.vector.recoveryScore})`);
  });

  const burnProfile = profiles.find(p => p.archetype.toLowerCase().includes('burn'));
  const yawgmothProfile = profiles.find(p => p.archetype.toLowerCase().includes('yawgmoth'));
  assert(burnProfile.vector.speedScore > yawgmothProfile.vector.speedScore, 'Burn posee mayor velocidad que Yawgmoth (Burn Speed 98 vs Yawgmoth Speed 78)');
  assert(yawgmothProfile.vector.recoveryScore > burnProfile.vector.recoveryScore, 'Yawgmoth posee mayor recuperación que Burn (Yawgmoth Recovery 96 vs Burn Recovery 55)');

  // 3. Testing VersionDeltaComparator
  console.log('\n--- 3. Testing VersionDeltaComparator (Δ Performance) ---');
  const oldRun = { compilerVersion: '13.2.0', runtimeMs: 1200, vector: { speedScore: 85, consistencyScore: 84, recoveryScore: 70, synergyScore: 80 } };
  const newRun = { compilerVersion: '13.2.5', runtimeMs: 980, vector: { speedScore: 94, consistencyScore: 89, recoveryScore: 76, synergyScore: 93 } };
  const deltaReport = VersionDeltaComparator.compareVersions(oldRun, newRun);

  assert(deltaReport.deltas.speed === '+9', 'Delta de velocidad calculado correctamente (+9)');
  assert(deltaReport.deltas.recovery === '+6', 'Delta de recuperación calculado correctamente (+6)');
  assert(deltaReport.improved === true, 'VersionDeltaComparator confirmó mejora del sistema');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 13.2.5 E2E: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runSprint1325E2ETest();
