/**
 * tests/benchmarks/test_v28_3_goblin_reality.js
 * 
 * V28.3 Real-World Goblin Reality Benchmark:
 * Compiles Pioneer Rakdos Goblins using the actual database card pool and audits
 * 10 holistic causal properties against V28.2 baseline:
 *   A. No false tribal positives
 *   B. No oracle-identity copy inflation
 *   C. Exact 60-card final state
 *   D. No broken hard demands
 *   E. Interaction Proof Coverage
 *   F. Resource Flow Proof Coverage
 *   G. Dynamic copy allocation
 *   H. No orphan cards
 *   I. No dominated cards
 *   J. LOCK_60 only after judicial approval
 */

import fs from 'fs';
import { buildCardPool } from '../../src/services/ragService.js';
import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { normalizeOracleIdentity } from '../../src/services/compiler/core/deckState.js';

async function runGoblinRealityBenchmark() {
  console.log('================================================================');
  console.log('       V28.3 REAL-WORLD GOBLIN REALITY BENCHMARK & AUTOPSY       ');
  console.log('================================================================\n');

  const formData = {
    customPrompt: 'Mazo competitivo aggro R/B',
    format: 'PIONEER',
    colores: ['R', 'B'],
    colors: ['R', 'B'],
    archetype: 'aggro',
    tribe: 'goblins / trasgos',
    tribu: 'goblins / trasgos',
    strategy: 'asalto de goblins (aggro/burn)',
    estrategia: 'asalto de goblins (aggro/burn)',
    selectedEngineId: 'goblin_aggro',
    engineFlavor: 'Asalto de Goblins (Aggro/Burn)',
    rarityMode: 'high-power',
    deckSize: 60,
    maxCopies: 4,
    competitiveIntensity: 'COMPETITIVE',
    fairPlayMode: false,
    manaRiskTolerance: 'MODERATE',
    interactionPreference: 'OPTIMAL',
    frustrationTolerance: 'HIGH',
    creativity: 50
  };

  const rag = await buildCardPool(formData);
  const rawPool = (rag && rag.pool) ? rag.pool : [];
  console.log(`[Card Pool] Loaded ${rawPool.length} cards from database.\n`);

  const convergenceResult = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: formData.customPrompt,
    archetype: formData.archetype,
    format: formData.format,
    rawCardPool: rawPool,
    uiFormState: formData
  });

  const finalDeck = convergenceResult.certifiedDeck || convergenceResult.state;
  const cards = finalDeck.cards || [];
  const spells = cards.filter(c => !c.isLand);
  const lands = cards.filter(c => c.isLand);

  const totalCards = cards.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
  const totalSpells = spells.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);
  const totalLands = lands.reduce((sum, c) => sum + Number(c.quantity || c.count || 1), 0);

  console.log('--- FINAL DECK SUMMARY ---');
  console.log(`Total Cards: ${totalCards} (Spells: ${totalSpells}, Lands: ${totalLands})`);
  console.log(`Distinct Cards: ${cards.length}\n`);

  console.log('--- COPY DISTRIBUTION ---');
  const copyCounts = {};
  for (const s of spells) {
    const q = Number(s.quantity || s.count || 1);
    copyCounts[`${q}x`] = (copyCounts[`${q}x`] || 0) + 1;
    console.log(`  ${q}x ${s.name} [${s.type_line || s.type}] (CMC ${s.cmc})`);
  }
  console.log('Copy counts summary:', JSON.stringify(copyCounts), '\n');

  console.log('--- MANA BASE ---');
  for (const l of lands) {
    console.log(`  ${l.quantity || 1}x ${l.name}`);
  }
  console.log('');

  console.log('--- PROOF COVERAGE & DEFICITS ---');
  console.log('Proof Coverage:', JSON.stringify(finalDeck.proofCoverage || {}, null, 2));
  console.log('State Deficits:', JSON.stringify(finalDeck.stateDeficits || [], null, 2));
  console.log('');

  console.log('--- JUDICIAL REVIEW ---');
  console.log(`Verdict: ${convergenceResult.supremeJudicialReview?.verdict} (Score: ${convergenceResult.supremeJudicialReview?.score}/100)`);
  console.log('Defects:', JSON.stringify(convergenceResult.supremeJudicialReview?.defects || [], null, 2));
  console.log('');

  // ---------------------------------------------------------------------------
  // 10 MANDATORY CAUSAL ASSERTIONS
  // ---------------------------------------------------------------------------
  console.log('--- EXECUTING 10 MANDATORY CAUSAL PROPERTY AUDITS ---');

  const assertions = [];

  // A. No False Tribal Positives
  const nonTribalCreatures = spells.filter(s => {
    const type = (s.type_line || s.type || '').toLowerCase();
    const name = s.name.toLowerCase();
    if (!type.includes('creature')) return false;
    return !type.includes('goblin') && !type.includes('ogre') && !type.includes('orc') && !name.includes('goblin');
  });
  assertions.push({
    prop: 'A. No false tribal positives',
    passed: nonTribalCreatures.length === 0,
    details: nonTribalCreatures.length === 0 ? '0% identity leakage' : `Found leaked non-goblins: ${nonTribalCreatures.map(c => c.name).join(', ')}`
  });

  // B. No Oracle-Identity Copy Inflation
  const oracleMap = new Map();
  let maxCopyViolation = false;
  for (const s of spells) {
    const oId = normalizeOracleIdentity(s);
    const count = (oracleMap.get(oId) || 0) + Number(s.quantity || s.count || 1);
    oracleMap.set(oId, count);
    if (count > 4) maxCopyViolation = true;
  }
  assertions.push({
    prop: 'B. No oracle-identity copy inflation',
    passed: !maxCopyViolation,
    details: !maxCopyViolation ? 'All card identities <= 4 copies' : 'Copy inflation violation (>4 copies detected)'
  });

  // C. Exact 60-Card Final State
  assertions.push({
    prop: 'C. Exact 60-card final state',
    passed: totalCards === 60,
    details: `${totalCards}/60 cards (${totalSpells} spells, ${totalLands} lands)`
  });

  // D. No Broken Hard Demands
  const unfulfilledDemands = (convergenceResult.supremeJudicialReview?.defects || []).filter(d => d.axis === 'DEMAND_SUPPLY' && d.severity === 'HIGH');
  assertions.push({
    prop: 'D. No broken hard demands',
    passed: unfulfilledDemands.length === 0,
    details: `${unfulfilledDemands.length} unfulfilled hard demands`
  });

  // E. Interaction Proof Coverage (Survival Window Proven)
  const interactionSpells = spells.filter(s => {
    const text = (s.oracle_text || '').toLowerCase();
    return text.includes('destroy') || text.includes('exile') || text.includes('damage') || text.includes('counter target') || s.role === 'CHEAP_REMOVAL' || s.role === 'REMOVAL';
  });
  const interactionTotal = interactionSpells.reduce((sum, s) => sum + Number(s.quantity || s.count || 1), 0);
  assertions.push({
    prop: 'E. Interaction Proof Coverage',
    passed: interactionTotal >= 4,
    details: `${interactionTotal} interaction spells in deck (${interactionSpells.map(s => `${s.quantity}x ${s.name}`).join(', ')})`
  });

  // F. Resource Flow Proof Coverage
  const flowSpells = spells.filter(s => {
    const text = (s.oracle_text || '').toLowerCase();
    return text.includes('draw') || text.includes('exile the top') || text.includes('look at the top') || s.role === 'CARD_FLOW' || s.role === 'RESOURCE_ENGINE';
  });
  const flowTotal = flowSpells.reduce((sum, s) => sum + Number(s.quantity || s.count || 1), 0);
  assertions.push({
    prop: 'F. Resource Flow Proof Coverage',
    passed: flowTotal >= 2,
    details: `${flowTotal} resource flow spells in deck (${flowSpells.map(s => `${s.quantity}x ${s.name}`).join(', ')})`
  });

  // G. Dynamic Copy Allocation (Non-uniform distribution)
  const distinctCopySizes = Object.keys(copyCounts).length;
  assertions.push({
    prop: 'G. Dynamic copy allocation',
    passed: distinctCopySizes >= 2,
    details: `Multiple copy tiers present (${Object.keys(copyCounts).join(', ')})`
  });

  // H. No Orphan Cards
  const orphanDefects = (convergenceResult.supremeJudicialReview?.defects || []).filter(d => d.axis === 'ZERO_ORPHAN');
  assertions.push({
    prop: 'H. No orphan cards',
    passed: orphanDefects.length === 0,
    details: `${orphanDefects.length} orphan defects`
  });

  // I. No Dominated Cards
  const dominatedDefects = (convergenceResult.supremeJudicialReview?.defects || []).filter(d => d.message?.includes('dominated'));
  assertions.push({
    prop: 'I. No dominated cards',
    passed: dominatedDefects.length === 0,
    details: `${dominatedDefects.length} dominated cards`
  });

  // J. LOCK_60 only after judicial approval
  const isApproved = convergenceResult.buildStatus === 'SUCCESS' && 
    (convergenceResult.supremeJudicialReview?.verdict === 'CERTIFIED' || 
     convergenceResult.supremeJudicialReview?.verdict === 'APPROVE' || 
     convergenceResult.supremeJudicialReview?.verdict === 'APPROVE_WITH_WARNINGS');
  assertions.push({
    prop: 'J. LOCK_60 only after judicial approval',
    passed: isApproved,
    details: `BuildStatus: ${convergenceResult.buildStatus}, Verdict: ${convergenceResult.supremeJudicialReview?.verdict}`
  });

  // K. Zero Alien Parasitic Spells
  const parasiticSpells = spells.filter(s => {
    const text = (s.oracle_text || '').toLowerCase();
    return text.includes('vampires you control') || text.includes('elves you control') || text.includes('zombies you control');
  });
  assertions.push({
    prop: 'K. Zero alien parasitic spells',
    passed: parasiticSpells.length === 0,
    details: parasiticSpells.length === 0 ? '0% alien tribal dependencies' : `Found parasitic spells: ${parasiticSpells.map(s => s.name).join(', ')}`
  });

  // L. Aggro Mana Base Integrity (No unconditional taplands)
  const unconditionalTaplands = lands.filter(l => {
    const text = (l.oracle_text || l.cardObj?.oracle_text || '').toLowerCase();
    return (text.includes('enters tapped') || text.includes('enters the battlefield tapped')) &&
      !text.includes('unless') && !text.includes('or fewer') && !text.includes('or more') && !text.includes('pay 2 life') && !text.includes('reveal');
  });
  assertions.push({
    prop: 'L. Aggro mana base integrity',
    passed: unconditionalTaplands.length === 0,
    details: unconditionalTaplands.length === 0 ? '0 unconditional taplands in aggro' : `Found taplands: ${unconditionalTaplands.map(l => l.name).join(', ')}`
  });

  // M. Full Intent Utilization (PASS 16 Coverage)
  const unconsumedIntentFields = (convergenceResult.intentCoverage?.unconsumedFields || []);
  assertions.push({
    prop: 'M. Complete intent utilization (Principle #3)',
    passed: unconsumedIntentFields.length === 0,
    details: unconsumedIntentFields.length === 0 ? '100% intent fields consumed' : `Unconsumed fields: ${unconsumedIntentFields.join(', ')}`
  });

  let totalPassed = 0;
  for (const a of assertions) {
    const tag = a.passed ? '[PASS]' : '[FAIL]';
    console.log(`  ${tag} ${a.prop} — ${a.details}`);
    if (a.passed) totalPassed++;
  }

  console.log(`\nCausal Reality Audit: ${totalPassed}/${assertions.length} properties satisfied.\n`);

  // ---------------------------------------------------------------------------
  // COMPARISON AGAINST V28.2 BASELINE
  // ---------------------------------------------------------------------------
  if (fs.existsSync('scratch/v28_2_baseline.json')) {
    const baseline = JSON.parse(fs.readFileSync('scratch/v28_2_baseline.json', 'utf8'));
    console.log('================================================================');
    console.log('               V28.2 BASELINE vs V28.3 COMPARISON               ');
    console.log('================================================================');
    console.log(`  Total Cards:             V28.2 = ${baseline.totalCards}   | V28.3 = ${totalCards}`);
    console.log(`  Land Count:              V28.2 = ${baseline.landCount}   | V28.3 = ${totalLands}`);
    console.log(`  Spell Count:             V28.2 = ${baseline.spellCount}   | V28.3 = ${totalSpells}`);
    console.log(`  Interaction Density:     V28.2 = ${baseline.interactionCoverage?.interactionCount || 0}   | V28.3 = ${interactionTotal}`);
    console.log(`  Judge Verdict:           V28.2 = ${baseline.judgeVerdict} (${baseline.judgeScore}) | V28.3 = ${convergenceResult.supremeJudicialReview?.verdict} (${convergenceResult.supremeJudicialReview?.score})`);
    console.log('================================================================\n');
  }

  if (totalPassed !== assertions.length) {
    process.exit(1);
  }
}

runGoblinRealityBenchmark().catch(err => {
  console.error('Benchmark error:', err);
  process.exit(1);
});
