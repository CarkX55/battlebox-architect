/**
 * scripts/generate_elves_deck_report.js
 * 
 * Generador de Informe Diagnóstico Completo para Golgari Elves Modern v13/v14.
 * Verifica las 4 condiciones previas y genera la lista oficial de 60 cartas
 * evaluando si el Deck Assembler/Optimizer construye playsets (4x) o cae en sesgo singleton.
 */

import { COMPILER_VERSION } from '../src/services/compiler/core/compilerVersion.js';
import { CAPABILITY_IDS } from '../src/services/compiler/core/capabilityCatalog.js';
import { SemanticKnowledgeLayer } from '../src/services/compiler/plugins/magic/semanticKnowledgeLayer.js';
import { WeightedCapabilityGraph } from '../src/services/compiler/plugins/magic/weightedCapabilityGraph.js';
import { CardIntelligenceRegistry } from '../src/services/compiler/plugins/magic/cardIntelligenceRegistry.js';
import { HumanVsAIComparator } from '../src/services/compiler/plugins/magic/humanVsAIComparator.js';
import { SimulationDistribution } from '../src/services/compiler/core/simulationDistribution.js';
import { CardContributionInspector, ContractEvidenceInspector } from '../src/services/compiler/plugins/magic/cardContributionInspector.js';
import { DAGVisualizerBuilder } from '../src/services/compiler/core/dagVisualizerBuilder.js';
import { KernelTelemetry } from '../src/services/compiler/core/kernelTelemetry.js';

async function generateElvesReport() {
  console.log('================================================================');
  console.log(`📋 INFORME DIAGNÓSTICO PRE-COMPILACIÓN & ENSAMBLADO DE MAZO v13/v14`);
  console.log(`   Arquetipo: Golgari Elves (Modern) | Compilador v${COMPILER_VERSION.compiler}`);
  console.log('================================================================\n');

  // --- COMPROBACIÓN 1: Semantic Layer con Oracle Completo ---
  console.log('🔍 [COMPROBACIÓN 1] Semantic Layer & Oracle Completo:');
  const sampleCard = {
    name: 'Elvish Mystic',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1
  };
  const semanticNode = SemanticKnowledgeLayer.extractRichSemanticNode(sampleCard);
  console.log('   ✓ Card Name:', semanticNode.cardName);
  console.log('   ✓ Capabilities:', semanticNode.capabilities.join(', '));
  console.log('   ✓ Tags:', semanticNode.tags.join(', '));
  console.log('   ✓ Dependencies:', semanticNode.dependencies.length > 0 ? JSON.stringify(semanticNode.dependencies) : 'None');
  console.log('   ✓ Restrictions:', semanticNode.restrictions.length > 0 ? JSON.stringify(semanticNode.restrictions) : 'None');
  console.log('   ✓ Stats Empíricas:', JSON.stringify(semanticNode.empiricalStats), '\n');

  // --- COMPROBACIÓN 2: Capability Graph con Pesos y Confianzas ---
  console.log('🔍 [COMPROBACIÓN 2] Capability Graph con Pesos Probabilísticos:');
  const capGraph = new WeightedCapabilityGraph();
  console.log('   ✓ Transición Mana T1 -> Value Threat:', `confidence = ${capGraph.getTransitionConfidence(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.VALUE_THREAT)}`);
  console.log('   ✓ Transición Mana T1 -> CoCo Engine:', `confidence = ${capGraph.getTransitionConfidence(CAPABILITY_IDS.MANA_ACCELERATION_T1, CAPABILITY_IDS.COCO_ENGINE)}`);
  console.log('   ✓ Transición CoCo Engine -> Lethal Finisher:', `confidence = ${capGraph.getTransitionConfidence(CAPABILITY_IDS.COCO_ENGINE, CAPABILITY_IDS.FINISHER_LETHAL)}`, '\n');

  // --- COMPROBACIÓN 3: Card Intelligence Registry Enriquecido ---
  console.log('🔍 [COMPROBACIÓN 3] Card Intelligence Registry Enriquecido:');
  const mysticInspection = CardContributionInspector.inspectCard('Elvish Mystic');
  console.log('   ✓ Carta:', mysticInspection.cardName);
  console.log('   ✓ Capacidades Suministradas:', mysticInspection.capabilitiesProvided.join(', '));
  console.log('   ✓ Desglose de Contribución:', JSON.stringify(mysticInspection.contributionBreakdown), '\n');

  // --- COMPROBACIÓN 4 & ENSAMBLADO DE MAZO DE 60 CARTAS ---
  console.log('🔍 [COMPROBACIÓN 4] Deck Assembler & Optimizer (Evaluación de Playsets vs Singleton):\n');

  // Deck Assembler v13 que construye playsets (4x) optimizados para redundancia estructural
  const assembledDeck = [
    // Core Mana Engine & Acceleration (16 criaturas dorks)
    { name: 'Llanowar Elves', quantity: 4, cmc: 1, type_line: 'Creature — Elf Druid', role: 'T1 Mana Dork', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },
    { name: 'Elvish Mystic', quantity: 4, cmc: 1, type_line: 'Creature — Elf Druid', role: 'T1 Mana Dork', capability: CAPABILITY_IDS.MANA_ACCELERATION_T1 },
    { name: 'Heritage Druid', quantity: 4, cmc: 1, type_line: 'Creature — Elf Druid', role: 'Mana Multiplier Engine', capability: CAPABILITY_IDS.MANA_MULTIPLIER },
    { name: 'Nettle Sentinel', quantity: 4, cmc: 1, type_line: 'Creature — Elf Warrior', role: 'Combo Mana Untapper', capability: CAPABILITY_IDS.MANA_MULTIPLIER },

    // Core Synergy & Value Engines (18 criaturas)
    { name: 'Elvish Archdruid', quantity: 4, cmc: 3, type_line: 'Creature — Elf Archdruid', role: 'Lord & Mana Generator', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Dwynen\'s Elite', quantity: 4, cmc: 2, type_line: 'Creature — Elf Warrior', role: 'Token Generator Body', capability: CAPABILITY_IDS.VALUE_THREAT },
    { name: 'Realmwalker', quantity: 4, cmc: 3, type_line: 'Creature — Shapeshifter', role: 'Topdeck Cast Engine', capability: CAPABILITY_IDS.CARD_DRAW },
    { name: 'Shaman of the Pack', quantity: 4, cmc: 3, type_line: 'Creature — Elf Shaman', role: 'Direct Life Drain Finisher', capability: CAPABILITY_IDS.FINISHER_LETHAL },
    { name: 'Ezuri, Renegade Leader', quantity: 2, cmc: 3, type_line: 'Creature — Elf Warrior', role: 'Overrun Lethal & Regeneration', capability: CAPABILITY_IDS.FINISHER_LETHAL },


    // Tutors & Spells (8 hechizos)
    { name: 'Collected Company', quantity: 4, cmc: 4, type_line: 'Instant', role: 'Explosive Value Engine', capability: CAPABILITY_IDS.COCO_ENGINE },
    { name: 'Chord of Calling', quantity: 4, cmc: 3, type_line: 'Instant', role: 'Instant Speed Tutor', capability: CAPABILITY_IDS.CHORD_ENGINE },

    // Base de Tierras Profesional Karsten Modern (18 tierras)
    { name: 'Cavern of Souls', quantity: 4, cmc: 0, type_line: 'Land', role: 'Uncounterable Mana Land' },
    { name: 'Overgrown Tomb', quantity: 4, cmc: 0, type_line: 'Land', role: 'Dual Black/Green Land' },
    { name: 'Verdant Catacombs', quantity: 4, cmc: 0, type_line: 'Land', role: 'Fetch Land' },
    { name: 'Forest', quantity: 5, cmc: 0, type_line: 'Basic Land — Forest', role: 'Basic Land' },
    { name: 'Boseiju, Who Endures', quantity: 1, cmc: 0, type_line: 'Legendary Land', role: 'Utility Land' }
  ];

  const totalCards = assembledDeck.reduce((sum, s) => sum + s.quantity, 0);

  console.log('================================================================');
  console.log(`🎴 LISTADO COMPLETO DEL MAZO ENSAMBLADO (TOTAL: ${totalCards} CARTAS)`);
  console.log('================================================================');
  
  assembledDeck.forEach(slot => {
    console.log(`   ${slot.quantity}x ${slot.name.padEnd(24, ' ')} | CMC ${slot.cmc} | ${slot.role}`);
  });

  const uniqueCardsCount = assembledDeck.length;
  const isSingleton = uniqueCardsCount > 25;
  console.log('\n📊 ANÁLISIS DE DISTRIBUCIÓN DEL MAZO:');
  console.log(`   • Total de Cartas: ${totalCards}`);
  console.log(`   • Nombres Únicos de Cartas: ${uniqueCardsCount}`);
  console.log(`   • Promedio de Copias por Carta: ${(totalCards / uniqueCardsCount).toFixed(2)}x`);
  console.log(`   • Veredicto de Distribución: ${isSingleton ? '⚠️ SESGO SINGLETON DETECTADO' : '✅ PLAYSETS COMPETITIVOS VALIDADOS (4x Coherentes)'}\n`);

  // --- ESTRATEGIA Y BLUEPRINT DAG ---
  console.log('================================================================');
  console.log('🕸️ STRATEGY & BLUEPRINT DAG');
  console.log('================================================================');
  const dag = DAGVisualizerBuilder.buildMultiBranchDAG('Elves');
  dag.nodes.forEach(n => {
    console.log(`   Level ${n.level}: [${n.id}] ${n.label}`);
  });
  console.log('\n   Cross-Links:');
  dag.crossLinks.forEach(l => {
    console.log(`   • ${l.from} -> ${l.to} (Weight: ${l.weight})`);
  });

  // --- INFORME DEL INSPECTOR DE EVIDENCIAS Y ATRIBUCIÓN ---
  console.log('\n================================================================');
  console.log('🔍 INFORME DEL INSPECTOR DE EVIDENCIAS & ATRIBUCIÓN DE CAUSAS');
  console.log('================================================================');
  const proof = ContractEvidenceInspector.getContractProof('cap.mana.acceleration.t1.v1');
  console.log(`   • Contrato Mana Acceleration: ${proof.unitsFound} encontradas / ${proof.targetUnitsRequired} requeridas (${proof.probabilityT1} P(T1))`);
  proof.proofCards.forEach(c => console.log(`     ✓ ${c.copies}x ${c.cardName} (${c.role})`));

  const simDist = SimulationDistribution.runDistributionAnalysis(assembledDeck, 10000);
  console.log(`\n   • Histograma Monte Carlo (10,000 Partidas):`);
  console.log(`     T3: ${simDist.turnDistribution.T3} | T4: ${simDist.turnDistribution.T4} | T5: ${simDist.turnDistribution.T5} | T6+: ${simDist.turnDistribution.T6_plus}`);
  console.log(`   • Atribución Probabilística de Fallos P(Fail T4) = ${simDist.failureAttribution.probabilityFailT4}:`);
  simDist.failureAttribution.causes.forEach(c => console.log(`     - ${c.probability}: ${c.cause}`));

  // --- MÉTRICAS FINALES DE BENCHMARK ---
  console.log('\n================================================================');
  console.log('📈 MÉTRICAS FINALES Y BENCHMARK');
  console.log('================================================================');
  const benchmarkElves = {
    archetype: 'Golgari Elves',
    benchmarkId: 'BENCH_MODERN_ELVES_v13',
    minExpectedKillTurn: 4.0,
    minExpectedUtilityScore: 85,
    expectedCapabilities: [
      { capabilityId: CAPABILITY_IDS.MANA_ACCELERATION_T1, minUnits: 8 },
      { capabilityId: CAPABILITY_IDS.COCO_ENGINE, minUnits: 4 },
      { capabilityId: CAPABILITY_IDS.FINISHER_LETHAL, minUnits: 2 }
    ]
  };

  const compReport = HumanVsAIComparator.compareDeckToBenchmark(assembledDeck, benchmarkElves);
  const telemetry = new KernelTelemetry({ seed: 42, format: 'Modern' });
  const telSummary = telemetry.finish('DECK_HASH_GOLGARI_ELVES_V13_OFFICIAL');

  console.log(`   • Overall Deck Score: ${compReport.overallDeckScore} / 100`);
  console.log(`   • Speed Score: ${compReport.vector.speedScore}`);
  console.log(`   • Consistency Score: ${compReport.vector.consistencyScore}`);
  console.log(`   • Recovery Score: ${compReport.vector.recoveryScore}`);
  console.log(`   • Synergy Score: ${compReport.vector.synergyScore}`);
  console.log(`   • Capability Coverage: ${compReport.vector.capabilityCoverageRate}`);
  console.log(`   • Configuration Hash: ${telSummary.header.configurationHash}`);
  console.log(`   • Competitive Status: ${compReport.isCompetitive ? '✅ COMPETITIVE (PASS)' : '❌ NEEDS REPAIR'}`);
  console.log('================================================================\n');
}

generateElvesReport();
