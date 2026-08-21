/**
 * TEST: DECOY OPTIMIZATION TEST
 * 
 * Verifies that the StateCandidateRanker and DemandSupplyLedger strictly reject
 * a high-raw-power "decoy" bomb when it has unmet demands or lacks WinPath closure,
 * and deterministically select a synergistic enabler that advances the WinPath.
 */

import { StateCandidateRanker } from '../../../src/services/compiler/core/stateCandidateRanker.js';
import { DemandSupplyLedger } from '../../../src/services/compiler/core/demandSupplyLedger.js';

function runDecoyOptimizationTest() {
  console.log('🧪 Running DECOY_OPTIMIZATION_TEST...');

  // 1. Setup Current Deck State:
  // An aggressive sacrifice deck with 12 Goblins, but 0 artifacts.
  const currentState = {
    cards: [
      { name: 'Goblin Instigator', count: 4, type_line: 'Creature — Goblin Rogue', oracle_text: 'When Goblin Instigator enters the battlefield, create a 1/1 red Goblin creature token.' },
      { name: 'Goblin Chieftain', count: 4, type_line: 'Creature — Goblin Warrior', oracle_text: 'Haste. Other Goblin creatures you control get +1/+1 and have haste.' },
      { name: 'Torch the Tower', count: 4, type_line: 'Instant', oracle_text: 'Bargain (You may sacrifice an artifact, enchantment, or token as you cast this spell.) Deals 2 damage to any target.' }
    ],
    curve: { 1: 4, 2: 4, 3: 4 },
    openDemands: ['SACRIFICE_OUTLET', 'WIN_PATH_LETHALITY']
  };

  // Strategic Contract: Goblin Aggro / Sacrifice Lethality WinPath
  const strategicContract = {
    archetype: 'RAKDOS_GOBLINS_SACRIFICE',
    winPath: ['SACRIFICE_OUTLET', 'TRIBAL_DENSITY', 'WIN_PATH_LETHALITY'],
    proofObligations: ['SACRIFICE_OUTLET'],
    format: 'STANDARD'
  };

  // 2. Candidate A (Decoy Bomb):
  // High rarity, huge raw stats, but demands ARTIFACT_CONTROL which is 0 in deck!
  const candidateA_Decoy = {
    name: 'Glittering Colossus',
    rarity: 'mythic',
    cmc: 1,
    power: '4',
    toughness: '4',
    type_line: 'Creature — Goblin Golem',
    oracle_text: 'As long as you control an artifact, Glittering Colossus gets +2/+2 and has trample.',
    capabilities: ['LARGE_BEATER']
  };

  // 3. Candidate B (Synergistic Enabler):
  // Modest 1/1 common, but provides a sacrifice outlet that closes the open demand!
  const candidateB_Synergizer = {
    name: 'Goblin Sledder',
    rarity: 'common',
    cmc: 1,
    power: '1',
    toughness: '1',
    type_line: 'Creature — Goblin',
    oracle_text: 'Sacrifice a Goblin: Target creature gets +1/+1 until end of turn.',
    capabilities: ['SACRIFICE_OUTLET', 'TRIBAL_DENSITY']
  };

  const pool = [candidateA_Decoy, candidateB_Synergizer];

  // 4. Evaluate via StateCandidateRanker
  const rankingResult = StateCandidateRanker.rankCandidatesByStateDelta(currentState, pool, strategicContract);

  console.log(`\n🏆 Winner Selected: "${rankingResult.winningCandidate?.name}"`);
  console.log(`   - Selection Status: ${rankingResult.selectionStatus}`);
  console.log(`   - Reason: ${rankingResult.reason}`);

  // Assertions
  if (rankingResult.winningCandidate?.name !== candidateB_Synergizer.name) {
    console.error(`❌ FAILURE: Engine chose Decoy Bomb instead of Synergistic Enabler!`);
    process.exit(1);
  }

  // Verify Decoy was marked as STRATEGICALLY_DOMINATED due to unfulfilled demand
  const evaluatedDecoy = rankingResult.evaluatedStates.find(e => e.candidate.name === candidateA_Decoy.name);
  console.log(`   - Decoy Classification: ${evaluatedDecoy.classification}`);
  console.log(`   - Decoy Demands Satisfied: ${evaluatedDecoy.stateDelta.demandsSatisfiedByExistingState}`);

  if (evaluatedDecoy.classification !== 'STRATEGICALLY_DOMINATED') {
    console.error(`❌ FAILURE: Decoy card was not marked as STRATEGICALLY_DOMINATED!`);
    process.exit(1);
  }

  console.log('\n✅ DECOY_OPTIMIZATION_TEST PASSED: Synergistic enabler strictly dominated the decoy bomb!');
}

runDecoyOptimizationTest();
