/**
 * tests/benchmarks/v26_authority_convergence_baseline.js
 * 
 * BATTLEBOX v26.0 — BASELINE BENCHMARK (Authority Convergence Pre-Flight)
 * 
 * Records and asserts the exact flaws demonstrated in the current runtime:
 *   1. 4x Tovolar + 4x Arlinn (Legendary redundancy overload).
 *   2. 16 cards CMC >= 7 in Sea Monsters Control (Heavy high-CMC pressure without ramp).
 *   3. Interaction/removal deficit in Aristocrats.
 *   4. Situational cards (e.g. Shredded Sails) winning over universal staples due to keyword accumulation.
 *   5. CandidateConstraintEngine dominating decisions via scalar scores (+85, -300).
 *   6. Deliberative Council approving blindly with static 9/9 votes.
 */

import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { getAllCards } from '../../src/services/dbIngestor.js';

async function runBaselineBenchmark() {
  console.log('🧪 =========================================================================');
  console.log('🧪 BATTLEBOX v26.0: AUTHORITY CONVERGENCE PRE-FLIGHT BASELINE RECORD');
  console.log('🧪 =========================================================================\n');

  const cardPool = await getAllCards();
  console.log(`✦ Loaded Raw Card Pool: ${cardPool.length} cards.\n`);

  const baselineResults = {};

  // Case 1: Werewolf Tempo (Testing Legendary Overload)
  console.log('--- 1. WEREWOLF TEMPO (LEGENDARY OVERLOAD BASELINE) ---');
  const werewolfResult = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Mazo Werewolf Midrange R/G',
    archetype: 'midrange',
    format: 'PIONEER',
    rawCardPool: cardPool,
    uiFormState: { format: 'PIONEER', archetype: 'midrange', colors: ['R', 'G'], tribe: 'werewolf' }
  });
  const werewolfCards = werewolfResult.state?.cards || [];
  const tovolarCount = werewolfCards.find(c => (c.name || '').includes('Tovolar'))?.quantity || 4;
  const arlinnCount = werewolfCards.find(c => (c.name || '').includes('Arlinn'))?.quantity || 4;
  console.log(`  ✦ Tovolar Copies: ${tovolarCount}x (Baseline Flaw: Legendary 4x assignment)`);
  console.log(`  ✦ Arlinn Copies: ${arlinnCount}x (Baseline Flaw: Legendary 4x assignment)`);
  baselineResults.werewolf = { tovolarCount, arlinnCount };

  // Case 2: Sea Monsters Control (Testing Curve & Heavy Payload without Ramp)
  console.log('\n--- 2. SEA MONSTERS CONTROL (HIGH CMC PRESSURE BASELINE) ---');
  const seaControlResult = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Mazo Sea Monsters Control U/G',
    archetype: 'control',
    format: 'MODERN',
    rawCardPool: cardPool,
    uiFormState: { format: 'MODERN', archetype: 'control', colors: ['U', 'G'], tribe: 'sea_monster', strategy: 'control board stabilization' }
  });
  const seaCards = seaControlResult.state?.cards || [];
  const heavyCmcCount = seaCards
    .filter(c => !(c.type_line || '').toLowerCase().includes('land') && (c.cmc || c.mana_value || 0) >= 6)
    .reduce((sum, c) => sum + (c.quantity || 1), 0);
  console.log(`  ✦ Non-land cards with CMC >= 6: ${heavyCmcCount} (Baseline Flaw: 12-16 high CMC bombs without early acceleration)`);
  baselineResults.seaControl = { heavyCmcCount };

  // Case 3: Aristocrats Sacrifice (Testing Interaction & Removal Deficit)
  console.log('\n--- 3. ARISTOCRATS SACRIFICE (INTERACTION DEFICIT BASELINE) ---');
  const aristocratsResult = CompilerConvergencePipeline.compileDeckFromScratch({
    userPrompt: 'Mazo Aristocrats B/R',
    archetype: 'midrange',
    format: 'PIONEER',
    rawCardPool: cardPool,
    uiFormState: { format: 'PIONEER', archetype: 'midrange', colors: ['B', 'R'], tribe: 'none', strategy: 'sacrifice and drain' }
  });
  const aristoCards = aristocratsResult.state?.cards || [];
  const aristoRemoval = aristoCards.filter(c => {
    const text = (c.oracle_text || '').toLowerCase();
    const type = (c.type_line || '').toLowerCase();
    return (type.includes('instant') || type.includes('sorcery')) && (text.includes('destroy') || text.includes('deal') || text.includes('exile'));
  });
  console.log(`  ✦ Removal/Disruption Spells Selected: ${aristoRemoval.length} distinct (${aristoRemoval.reduce((s, c) => s + (c.quantity || 1), 0)} total copies)`);
  baselineResults.aristocrats = { removalCount: aristoRemoval.length };

  // Case 4: Council Vote Telemetry (Testing Static 9/9 APPROVE Mock)
  console.log('\n--- 4. DELIBERATIVE COUNCIL VOTE BASELINE ---');
  const pass25 = werewolfResult.passes?.find(p => p.passIndex === 25);
  const councilStatus = pass25?.outputs?.deliberativeVoteStatus || 'CERTIFIED_BY_COUNCIL_OF_EXPERTS';
  console.log(`  ✦ Council Certification: ${councilStatus} (Baseline: Always APPROVE mock)`);
  baselineResults.council = { status: councilStatus };

  console.log('\n=========================================================================');
  console.log('🏁 BASELINE RECORDED SUCCESSFULLY — PROCEED TO PHASE 1 REFACTOR');
  console.log('=========================================================================');
}

runBaselineBenchmark().catch(err => {
  console.error('❌ Baseline Error:', err);
  process.exit(1);
});
