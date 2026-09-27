/**
 * tests/unit/compiler/test_identity_firewall_exact_subtypes.js
 * 
 * Unit test for Sprint 1: IdentityFirewall exact subtype matches.
 * Verifies that "sorcery" never produces "orc" and false tribal positives are 0%.
 */

import { IdentityFirewall } from '../../../src/services/compiler/core/identityFirewall.js';

function runFirewallTests() {
  console.log('Running IdentityFirewall exact subtypes test suite...\n');

  const intentGoblin = {
    format: 'PIONEER',
    colors: ['R', 'B'],
    primaryTribe: 'Goblin'
  };
  const deckIdentity = {
    archetypeKey: 'RAKDOS_GOBLINS_AGGRO'
  };

  const testCases = [
    {
      name: 'Fire Urchin (Elemental with "instant or sorcery" text)',
      card: {
        name: 'Fire Urchin',
        type_line: 'Creature — Elemental',
        oracle_text: 'Trample\nWhenever you cast an instant or sorcery spell, this creature gets +1/+0 until end of turn.',
        colors: ['R'],
        color_identity: ['R'],
        cmc: 2,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: false
    },
    {
      name: 'Cult Guildmage (Human Shaman with "as a sorcery" text)',
      card: {
        name: 'Cult Guildmage',
        type_line: 'Creature — Human Shaman',
        oracle_text: '{3}{B}, {T}: Target player discards a card. Activate only as a sorcery.\n{R}, {T}: This creature deals 1 damage to target opponent or planeswalker.',
        colors: ['B', 'R'],
        color_identity: ['B', 'R'],
        cmc: 2,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: false
    },
    {
      name: 'Scorch Spitter (Elemental with "scorch" in name)',
      card: {
        name: 'Scorch Spitter',
        type_line: 'Creature — Elemental Lizard',
        oracle_text: 'Whenever Scorch Spitter attacks, it deals 1 damage to target player or planeswalker.',
        colors: ['R'],
        color_identity: ['R'],
        cmc: 1,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: false
    },
    {
      name: 'Rundvelt Hordemaster (Real Goblin)',
      card: {
        name: 'Rundvelt Hordemaster',
        type_line: 'Creature — Goblin Warrior',
        oracle_text: 'Other Goblins you control get +1/+1.\nWhenever Rundvelt Hordemaster or another Goblin you control dies, exile the top card of your library. You may play that card until the end of your next turn.',
        colors: ['R'],
        color_identity: ['R'],
        cmc: 2,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: true
    },
    {
      name: 'Hobgoblin Bandit Lord (Real Goblin)',
      card: {
        name: 'Hobgoblin Bandit Lord',
        type_line: 'Creature — Goblin Rogue',
        oracle_text: 'Other Goblins you control get +1/+1.\n{R}, {T}: Hobgoblin Bandit Lord deals damage equal to the number of Goblins that entered the battlefield under your control this turn to any target.',
        colors: ['R'],
        color_identity: ['R'],
        cmc: 3,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: true
    },
    {
      name: 'Gvar Barzeel, Commander (Real Orc)',
      card: {
        name: 'Gvar Barzeel, Commander',
        type_line: 'Legendary Creature — Orc Soldier',
        oracle_text: 'Whenever a creature you control with a counter on it dies...',
        colors: ['B', 'W'],
        color_identity: ['B', 'W'],
        cmc: 3,
        legalities: { pioneer: 'legal' }
      },
      // Matches Orc subtype for goblin_horde, but fails color check in Rakdos
      expectedAllowed: false // color identity mismatch
    },
    {
      name: 'Orcish Bowmasters (Real Orc in Rakdos colors)',
      card: {
        name: 'Orcish Bowmasters',
        type_line: 'Creature — Orc Archer',
        oracle_text: 'Flash\nWhen Orcish Bowmasters enters the battlefield...',
        colors: ['B'],
        color_identity: ['B'],
        cmc: 2,
        legalities: { pioneer: 'legal' }
      },
      expectedAllowed: true
    }
  ];

  let passed = 0;
  for (const tc of testCases) {
    const res = IdentityFirewall.validateCard(tc.card, deckIdentity, intentGoblin);
    const ok = res.isAllowed === tc.expectedAllowed;
    if (ok) {
      passed++;
      console.log(`  [PASS] ${tc.name} -> isAllowed: ${res.isAllowed}`);
    } else {
      console.error(`  [FAIL] ${tc.name} -> expected isAllowed=${tc.expectedAllowed}, got ${res.isAllowed} (Reason: ${res.vetoReason})`);
    }
  }

  console.log(`\nFirewall Tests: ${passed}/${testCases.length} passed.`);
  if (passed !== testCases.length) {
    process.exit(1);
  }
}

runFirewallTests();
