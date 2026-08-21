import assert from 'node:assert';
import { 
  BATTLEBOX_ARCHETYPES, 
  MTG_TRIBES, 
  MTG_STRATEGIES, 
  UNIVERSAL_ENGINES, 
  HISTORICAL_DECKS_CATALOG,
  inferStrategyFromArchetype 
} from '../../src/constants/legacyBattleBox.js';
import { IntentBuilder } from '../../src/services/compiler/core/intentBuilder.js';
import { composeTwoLayerBlueprint } from '../../src/constants/blueprintTemplates.js';

console.log('🧪 =========================================================================');
console.log('🧪 BATTLEBOX AUDIT: EXHAUSTIVE ARQUETIPOS + TRIBUS + MOTORES AUDIT');
console.log('🧪 =========================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
    throw err;
  }
}

// 1. Verificar que cada Tribu tiene estructura válida y no bloquea arquetipos
console.log('--- 1. AUDITORÍA DE TODAS LAS TRIBUS EN MTG_TRIBES ---');
MTG_TRIBES.forEach(tribe => {
  runTest(`Tribu [${tribe.id}] estructura y consistencia`, () => {
    assert.ok(tribe.id, `Tribu missing id: ${JSON.stringify(tribe)}`);
    assert.ok(tribe.label, `Tribu missing label: ${tribe.id}`);
    assert.ok(Array.isArray(tribe.colors) && tribe.colors.length > 0, `Tribu missing colors: ${tribe.id}`);
    assert.ok(Array.isArray(tribe.archetypes) && tribe.archetypes.length > 0, `Tribu missing archetypes: ${tribe.id}`);
  });
});
console.log(`  ✅ Verificadas ${MTG_TRIBES.length} tribus sin anomalías estructurales.`);

// 2. Verificar que cada Estrategia en MTG_STRATEGIES existe y es válida
console.log('\n--- 2. AUDITORÍA DE TODAS LAS ESTRATEGIAS EN MTG_STRATEGIES ---');
MTG_STRATEGIES.forEach(strat => {
  runTest(`Estrategia [${strat.id}] estructura y consistencia`, () => {
    assert.ok(strat.id, `Strategy missing id: ${JSON.stringify(strat)}`);
    assert.ok(strat.label, `Strategy missing label: ${strat.id}`);
    assert.ok(Array.isArray(strat.colors) && strat.colors.length > 0, `Strategy missing colors: ${strat.id}`);
  });
});
console.log(`  ✅ Verificadas ${MTG_STRATEGIES.length} estrategias universales.`);

// 3. Probar matriz cruzada: Cada Arquetipo x Cada Tribu (Sin forzar estrategias secundarias)
console.log('\n--- 3. MATRIZ CRUZADA ARQUETIPO x TRIBU (INTENT BUILDER & BLUEPRINT) ---');
let comboCount = 0;
BATTLEBOX_ARCHETYPES.forEach(arch => {
  MTG_TRIBES.forEach(tribe => {
    comboCount++;
    runTest(`Combo [${arch.id}] + Tribu [${tribe.id}] sin motor secundario`, () => {
      const formData = {
        archetype: arch.id,
        tribe: tribe.label,
        strategy: '',
        selectedEngineId: '',
        engineFlavor: '',
        colores: tribe.colors
      };

      const intent = IntentBuilder.buildFromUI(formData);
      assert.ok(!intent.selectedEngineId, `selectedEngineId should be falsy`);
      assert.ok(intent.primaryTribe, `primaryTribe should be populated (Got: ${intent.primaryTribe})`);

      const blueprint = composeTwoLayerBlueprint(arch.id, '', formData);
      assert.ok(blueprint, `Blueprint should compile for ${arch.id}`);
      assert.ok(blueprint.roles, `Blueprint should have roles`);
    });
  });
});
console.log(`  ✅ Verificadas ${comboCount} combinaciones de Arquetipo x Tribu (0 bloqueos, 0 estrategias fantasma).`);

// 4. Probar matriz cruzada: Cada Arquetipo x Cada Motor Universal x Tribu Omitida
console.log('\n--- 4. MATRIZ CRUZADA ARQUETIPO x MOTOR UNIVERSAL (SIN TRIBU) ---');
let engineCount = 0;
BATTLEBOX_ARCHETYPES.forEach(arch => {
  UNIVERSAL_ENGINES.forEach(engine => {
    engineCount++;
    runTest(`Arquetipo [${arch.id}] + Motor [${engine.id}] sin tribu`, () => {
      const formData = {
        archetype: arch.id,
        tribe: '',
        strategy: engine.label,
        selectedEngineId: engine.id,
        engineFlavor: engine.label,
        colores: engine.requiredColors || ['U', 'R']
      };

      const intent = IntentBuilder.buildFromUI(formData);
      assert.ok(intent.strategy && intent.strategy.length > 0, `strategy should be populated (Got: ${intent.strategy})`);
      assert.strictEqual(intent.primaryTribe, null, `primaryTribe should be null`);

      const blueprint = composeTwoLayerBlueprint(arch.id, engine.id.replace('_generic', ''), formData);
      assert.ok(blueprint, `Blueprint should compile for ${arch.id} + ${engine.id}`);
    });
  });
});
console.log(`  ✅ Verificadas ${engineCount} combinaciones de Arquetipo x Motor Universal.`);

// 5. Probar todos los Tomos Históricos de HISTORICAL_DECKS_CATALOG
console.log('\n--- 5. AUDITORÍA DE RECETAS HISTÓRICAS (HISTORICAL_DECKS_CATALOG) ---');
let historicalCount = 0;
Object.entries(HISTORICAL_DECKS_CATALOG).forEach(([catKey, deckList]) => {
  deckList.forEach(deck => {
    historicalCount++;
    runTest(`Receta Histórica [${deck.id}] en [${catKey}]`, () => {
      assert.ok(deck.id, `Deck missing id`);
      assert.ok(deck.title, `Deck missing title`);
      assert.ok(Array.isArray(deck.colors) && deck.colors.length > 0, `Deck missing colors: ${deck.id}`);
      
      const realStrat = inferStrategyFromArchetype(catKey, deck.title);
      assert.ok(typeof realStrat === 'string', `Inferred strategy should be string`);
    });
  });
});
console.log(`  ✅ Verificadas ${historicalCount} recetas históricas.`);

console.log('\n=========================================================================');
console.log(`🏁 AUDIT FINISHED: ${passedTests}/${totalTests} combinations verified with 100% SUCCESS.`);
console.log('=========================================================================\n');
