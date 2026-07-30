/**
 * tests/judge/test_deck_identity_matrix.js
 * Verification unit test for DeckIdentityEngine and FunctionalDependencyMatrix.
 */

import { buildDeckIdentity } from '../../src/judge/identity/DeckIdentityEngine.js';
import { analyzeFunctionalDependencies } from '../../src/judge/capabilities/FunctionalDependencyMatrix.js';

async function testDeckIdentityAndMatrix() {
  console.log('🧪 Testing DeckIdentityEngine & FunctionalDependencyMatrix...');

  const wallIntent = {
    userPrompt: 'Mazo de Muros y Defender en Standard',
    archetype: 'wall',
    tribe: 'wall'
  };

  const identity = buildDeckIdentity(wallIntent);

  const heroCard = {
    name: 'Invisible Woman, Sue Storm',
    type_line: 'Legendary Creature — Human Hero',
    oracle_text: 'Whenever you put +1/+1 counters on other Heroes, create a Wall.'
  };

  const surveilSpell = {
    name: 'Swallowed by Leviathan',
    type_line: 'Instant',
    oracle_text: 'Surveil 2, then counter target spell.',
    slot: 'sacrificefodder_engine_primary_slot'
  };

  const wallCard = {
    name: 'Gleaming Barrier',
    type_line: 'Artifact Creature — Wall',
    oracle_text: 'Defender. When this dies, create a Treasure token.'
  };

  // Test Identity filtering
  const isHeroForbidden = identity.isCardForbidden(heroCard);
  const isSurveilForbidden = identity.isCardForbidden(surveilSpell);
  const isWallForbidden = identity.isCardForbidden(wallCard);

  console.log('✅ Invisible Woman (Hero) Forbidden:', isHeroForbidden);
  console.log('✅ Swallowed by Leviathan (Surveil) Forbidden:', isSurveilForbidden);
  console.log('✅ Gleaming Barrier (Wall) Allowed:', !isWallForbidden);

  // Test Dependency matrix
  const currentWallDeck = [wallCard];
  const depAnalysis = analyzeFunctionalDependencies(heroCard, currentWallDeck);

  console.log('✅ Hero Dependency Satisfied:', depAnalysis.isSatisfied);

  if (isHeroForbidden && isSurveilForbidden && !isWallForbidden && !depAnalysis.isSatisfied) {
    console.log('🎉 TEST SUCCESSFUL: DeckIdentityEngine and FunctionalDependencyMatrix filter contamination cleanly!');
  } else {
    throw new Error('Test failed: Filtering did not behave as expected.');
  }
}

testDeckIdentityAndMatrix().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
