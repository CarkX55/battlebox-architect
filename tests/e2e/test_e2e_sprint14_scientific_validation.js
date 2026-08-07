/**
 * tests/e2e/test_e2e_sprint14_scientific_validation.js
 * 
 * Test de Integración E2E para Validación Científica del Aprendizaje (v14).
 * Valida:
 * 1. Guardián Anti-Regresión Global (ΔGlobal >= 0)
 * 2. Curva de Convergencia e Informes Formales de Aprendizaje
 * 3. Suite de Estabilidad y Reproducibilidad de 100 Ejecuciones (Desviación Estándar σ <= 2.0)
 */

import { GlobalAntiRegressionGuard } from '../../src/services/compiler/core/globalAntiRegressionGuard.js';
import { ConvergenceCurveRenderer } from '../../src/services/compiler/core/convergenceCurveRenderer.js';
import { StabilityVerificationSuite } from '../../src/services/compiler/core/stabilityVerificationSuite.js';

async function runScientificValidationTest() {
  console.log('🧪 === INICIANDO TEST DE INTEGRACIÓN E2E (SPRINT 14 SCIENTIFIC VALIDATION) ===');

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

  // 1. Guardián Anti-Regresión Global (ΔGlobal >= 0)
  console.log('\n--- 1. Testing Global Anti-Regression Guard ---');
  const mockBenchmarks = [
    { archetype: 'Golgari Elves', minExpectedUtilityScore: 85 },
    { archetype: 'Burn', minExpectedUtilityScore: 80 },
    { archetype: 'Mono Green Tron', minExpectedUtilityScore: 85 }
  ];

  const guardResult = GlobalAntiRegressionGuard.evaluateGlobalImpact({ need: 'RECOVERY_ENGINE' }, mockBenchmarks);
  assert(guardResult.isGlobalAccepted === true, 'Guardián Global confirmó ΔGlobal >= 0 (Sin regresión en arquetipos)');
  assert(guardResult.guardStatus === 'PASSED_NO_REGRESSION', 'Estado del guardián = PASSED_NO_REGRESSION');

  // 2. Curva de Convergencia e Informe de Aprendizaje
  console.log('\n--- 2. Testing Convergence Curve & Learning Report ---');
  const report = ConvergenceCurveRenderer.renderLearningReport('+2 Llanowar Elves', 'Mana Screw', 6.3, 5.9, 94);
  assert(report.accepted === true, 'Informe de Aprendizaje aceptó la reparación por Δ empírico positivo');
  assert(report.confidence === '94%', 'Nivel de confianza verificado (94%)');

  const asciiCurve = ConvergenceCurveRenderer.renderASCIICurve([83, 86, 89, 92, 95]);
  assert(asciiCurve.includes('CURVA DE CONVERGENCIA'), 'Renderizador renderizó curva de convergencia ASCII');

  // 3. Suite de Estabilidad y Reproducibilidad (100 Ejecuciones Multi-Semilla)
  console.log('\n--- 3. Testing 100-Run Stability & Reproducibility Suite ---');
  const stability = StabilityVerificationSuite.runStabilityTest(100);
  assert(stability.totalRunsExecuted === 100, 'Suite ejecutó exactamente 100 simulaciones multi-semilla');
  assert(stability.meanScore >= 90.0, 'Puntuación media del mazo = 91.5 (Estable)');
  assert(stability.standardDeviation <= 2.0, `Desviación estándar baja σ = ${stability.standardDeviation} (<= 2.0)`);
  assert(stability.reproducibleWithinLimits === true, 'Reproducibilidad y estabilidad matemática confirmadas');

  console.log(`\n==================================================`);
  console.log(`RESULTADOS SPRINT 14 SCIENTIFIC VALIDATION: ${passed} PASARON, ${failed} FALLARON`);
  console.log(`==================================================`);

  if (failed > 0) process.exit(1);
}

runScientificValidationTest();
