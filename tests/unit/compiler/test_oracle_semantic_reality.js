import test from 'node:test';
import assert from 'node:assert/strict';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { DemandSupplyLedger } from '../../../src/services/compiler/core/demandSupplyLedger.js';
import { CandidateConstraintEngine } from '../../../src/services/compiler/core/candidateConstraintEngine.js';
import { CapabilityPlan, AllocationSlot } from '../../../src/services/compiler/core/capabilityPlan.js';
import { IntentPackage } from '../../../src/services/compiler/core/intentPackage.js';

test('CASE 1: Ramp for creatures -> Omen Hawker rejected (Restricted to activated abilities)', () => {
  const omenHawker = {
    name: 'Omen Hawker',
    mana_cost: '{U}',
    type_line: 'Creature — Octopus Advisor',
    oracle_text: '{T}: Add {C}{U}. Spend this mana only to activate abilities.',
    cmc: 1
  };

  const contract = CardCausalContract.parse(omenHawker);
  assert.ok(contract, 'Contract must be parsed');
  assert.equal(contract.supplies[0].capability, 'MANA_ACCELERATION');
  assert.equal(contract.supplies[0].domain, 'ACTIVATED_ABILITIES_ONLY');
  assert.equal(contract.supplies[0].isUniversal, false);

  const compatCreatureRamp = CardCausalContract.isCausallyCompatibleWithRole(contract, 'RAMP_ACCELERATION', { tempo: 'ramp' });
  assert.equal(compatCreatureRamp.isCompatible, false, 'Omen Hawker must be incompatible with creature ramp');
  assert.match(compatCreatureRamp.reason, /activated abilities/i);
});

test('CASE 2: Ramp for spellslinger -> Hydro-Channeler accepted', () => {
  const hydroChanneler = {
    name: 'Hydro-Channeler',
    mana_cost: '{1}{U}',
    type_line: 'Creature — Merfolk Wizard',
    oracle_text: '{T}: Add {U}. Spend this mana only to cast an instant or sorcery spell.',
    cmc: 2
  };

  const contract = CardCausalContract.parse(hydroChanneler);
  assert.equal(contract.supplies[0].domain, 'INSTANT_OR_SORCERY_ONLY');

  // Incompatible with creature ramp
  const compatCreature = CardCausalContract.isCausallyCompatibleWithRole(contract, 'RAMP_ACCELERATION', { tempo: 'ramp' });
  assert.equal(compatCreature.isCompatible, false);

  // Compatible with spellslinger/storm
  const compatSpells = CardCausalContract.isCausallyCompatibleWithRole(contract, 'RAMP_ACCELERATION', { tempo: 'spellslinger' });
  assert.equal(compatSpells.isCompatible, true);
});

test('CASE 3: Artifact payoff + 0 artifacts -> Lady Octopus and Mm\'menon rejected', () => {
  const ladyOctopus = {
    name: 'Lady Octopus, Inspired Inventor',
    mana_cost: '{U}',
    type_line: 'Legendary Creature — Human Scientist Villain',
    oracle_text: 'Whenever you draw your first or second card each turn, put an ingenuity counter on Lady Octopus.\n{T}: You may cast an artifact spell from your hand with mana value less than or equal to the number of ingenuity counters on Lady Octopus without paying its mana cost.',
    cmc: 1
  };

  const mmMenon = {
    name: "Mm'menon, the Right Hand",
    mana_cost: '{3}{U}{U}',
    type_line: 'Legendary Creature — Jellyfish Advisor',
    oracle_text: 'Flying\nYou may look at the top card of your library any time.\nYou may cast artifact spells from the top of your library.\nArtifacts you control have "{T}: Add {U}. Spend this mana only to cast a spell from anywhere other than your hand."',
    cmc: 5
  };

  const emptyArtifactDeckState = {
    cards: [
      { card: { name: 'Island', type_line: 'Basic Land — Island' }, count: 24 },
      { card: { name: 'Llanowar Elves', type_line: 'Creature — Elf Druid' }, count: 4 }
    ]
  };

  const auditLady = DemandSupplyLedger.auditCardDemands(ladyOctopus, emptyArtifactDeckState);
  assert.equal(auditLady.isSatisfied, false, 'Lady Octopus must be unsatisfied with 0 artifacts');
  assert.ok(auditLady.demands.some(d => d.resource === 'ARTIFACT_CONTROL' && d.action === 'REJECT'));

  const auditMmMenon = DemandSupplyLedger.auditCardDemands(mmMenon, emptyArtifactDeckState);
  assert.equal(auditMmMenon.isSatisfied, false, 'Mm\'menon must be unsatisfied with 0 artifacts');
  assert.ok(auditMmMenon.demands.some(d => d.resource === 'ARTIFACT_CONTROL' && d.action === 'REJECT'));
});

test('CASE 4: Artifact payoff + relevant artifacts -> Accepted', () => {
  const ladyOctopus = {
    name: 'Lady Octopus, Inspired Inventor',
    mana_cost: '{U}',
    type_line: 'Legendary Creature — Human Scientist Villain',
    oracle_text: '{T}: You may cast an artifact spell from your hand without paying its mana cost.',
    cmc: 1
  };

  const artifactRichDeckState = {
    cards: [
      { card: { name: 'Mox Opal', type_line: 'Legendary Artifact' }, count: 4 },
      { card: { name: 'Springleaf Drum', type_line: 'Artifact' }, count: 4 },
      { card: { name: 'Ornithopter', type_line: 'Artifact Creature — Thopter' }, count: 4 }
    ]
  };

  const audit = DemandSupplyLedger.auditCardDemands(ladyOctopus, artifactRichDeckState);
  assert.equal(audit.isSatisfied, true, 'Lady Octopus must be satisfied when artifact density is available');
});

test('CASE 5: Sacrifice payoff + 0 fodder -> Rejected', () => {
  const villageRites = {
    name: 'Village Rites',
    mana_cost: '{B}',
    type_line: 'Instant',
    oracle_text: 'As an additional cost to cast this spell, sacrifice a creature.\nDraw two cards.',
    cmc: 1
  };

  const emptyFodderDeckState = {
    cards: [
      { card: { name: 'Swamp', type_line: 'Basic Land — Swamp' }, count: 24 }
    ]
  };

  const audit = DemandSupplyLedger.auditCardDemands(villageRites, emptyFodderDeckState);
  assert.equal(audit.isSatisfied, false, 'Village Rites must be rejected with 0 creature fodder');
});

test('CASE 6: Sacrifice payoff + self-producing fodder -> Accepted (Self-Supplying Engine)', () => {
  const koma = {
    name: 'Koma, Cosmos Serpent',
    mana_cost: '{3}{G}{G}{U}{U}',
    type_line: 'Legendary Creature — Serpent',
    oracle_text: "At the beginning of each upkeep, create a 3/3 blue Serpent creature token named Koma's Coil.\nSacrifice another Serpent: Choose one — Tap target permanent or Koma gains indestructible.",
    cmc: 7
  };

  const contract = CardCausalContract.parse(koma);
  assert.equal(contract.selfSupply.isSelfSufficient, true, 'Koma must be recognized as self-supplying');

  const emptyDeckState = { cards: [] };
  const audit = DemandSupplyLedger.auditCardDemands(koma, emptyDeckState);
  assert.equal(audit.isSatisfied, true, 'Self-supplying engines must satisfy their own demands without external fuel');
});

test('CASE 7 & 8: Graveyard payoff without and with self-mill infrastructure', () => {
  const deliriumPayoff = {
    name: 'Unholy Heat',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Unholy Heat deals 2 damage to target creature or planeswalker. Delirium — Unholy Heat deals 6 damage instead if there are four or more card types among cards in your graveyard.',
    cmc: 1
  };

  const noGraveyardDeckState = { cards: [{ card: { name: 'Mountain', type_line: 'Basic Land' }, count: 24 }] };
  const supplyNone = DemandSupplyLedger.computeAvailableSupply(noGraveyardDeckState, 'GRAVEYARD_FUEL');
  assert.equal(supplyNone, 0);

  const graveyardDeckState = {
    cards: [
      { card: { name: 'Stitcher\'s Supplier', type_line: 'Creature', oracle_text: 'When Stitcher\'s Supplier enters or dies, mill three cards.' }, count: 4 },
      { card: { name: 'Grisly Salvage', type_line: 'Instant', oracle_text: 'Reveal the top five cards of your library. Put a creature or land into your hand and the rest into your graveyard.' }, count: 4 }
    ]
  };
  const supplyRich = DemandSupplyLedger.computeAvailableSupply(graveyardDeckState, 'GRAVEYARD_FUEL');
  assert.ok(supplyRich >= 8, 'Graveyard fuel must be detected from self-mill and instants');
});

test('CASE 9 & 10: Counter payoff without and with counter infrastructure', () => {
  const counterPayoff = {
    name: 'Inspiring Call',
    mana_cost: '{2}{G}',
    type_line: 'Instant',
    oracle_text: 'Draw a card for each creature you control with a +1/+1 counter on it. Those creatures gain indestructible until end of turn.',
    cmc: 3
  };

  const emptyCounterState = { cards: [{ card: { name: 'Forest', type_line: 'Basic Land' }, count: 24 }] };
  const auditEmpty = DemandSupplyLedger.auditCardDemands(counterPayoff, emptyCounterState);
  assert.equal(auditEmpty.demands[0].status, 'UNFULFILLED');

  const counterRichState = {
    cards: [
      { card: { name: 'Conclave Mentor', type_line: 'Creature', oracle_text: 'If one or more +1/+1 counters would be put on a creature you control, put that many plus one +1/+1 counters on it instead.' }, count: 4 },
      { card: { name: 'Pelt Collector', type_line: 'Creature', oracle_text: 'Whenever another creature you control enters or dies, put a +1/+1 counter on Pelt Collector.' }, count: 4 }
    ]
  };
  const auditRich = DemandSupplyLedger.auditCardDemands(counterPayoff, counterRichState);
  assert.equal(auditRich.demands[0].status, 'SATISFIED');
});

test('CASE 11: Universal Ramp verification across candidate pool', () => {
  const birdsOfParadise = {
    name: 'Birds of Paradise',
    mana_cost: '{G}',
    type_line: 'Creature — Bird',
    oracle_text: 'Flying\n{T}: Add one mana of any color.',
    cmc: 1
  };

  const contract = CardCausalContract.parse(birdsOfParadise);
  assert.equal(contract.supplies[0].isUniversal, true);
  assert.equal(contract.supplies[0].domain, 'UNIVERSAL');

  const compatCreature = CardCausalContract.isCausallyCompatibleWithRole(contract, 'RAMP_ACCELERATION', { tempo: 'ramp' });
  assert.equal(compatCreature.isCompatible, true);

  const compatSpells = CardCausalContract.isCausallyCompatibleWithRole(contract, 'RAMP_ACCELERATION', { tempo: 'spellslinger' });
  assert.equal(compatSpells.isCompatible, true);
});

test('CASE 12: End-to-End Sea Monsters Ramp (G/U Pioneer) eliminates Omen Hawker, Lady Octopus, Mm\'menon', () => {
  const engine = new CandidateConstraintEngine();

  const intent = new IntentPackage({
    format: 'PIONEER',
    colors: ['G', 'U'],
    primaryTribe: 'Sea_monsters',
    tempo: 'ramp'
  });

  const slots = [
    new AllocationSlot({ slotId: 's1', role: 'Land', requiredDensity: 24, priority: 100 }),
    new AllocationSlot({ slotId: 's2', role: 'RAMP_ACCELERATION', requiredDensity: 4, priority: 100 }),
    new AllocationSlot({ slotId: 's3', role: 'FINISHER', requiredDensity: 4, priority: 90 }),
    new AllocationSlot({ slotId: 's4', role: 'TRIBAL_DENSITY', requiredDensity: 4, priority: 90 })
  ];

  const plan = new CapabilityPlan(slots, { format: 'PIONEER', tempo: 'ramp' });

  const cardPool = [
    { name: 'Omen Hawker', type_line: 'Creature — Octopus Advisor', oracle_text: '{T}: Add {C}{U}. Spend this mana only to activate abilities.', cmc: 1, colors: ['U'] },
    { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. You may put a land card from your hand onto the battlefield.', cmc: 2, colors: ['G', 'U'] },
    { name: 'Lady Octopus, Inspired Inventor', type_line: 'Legendary Creature — Human Scientist', oracle_text: '{T}: Cast an artifact spell from your hand without paying mana cost.', cmc: 1, colors: ['U'] },
    { name: "Mm'menon, the Right Hand", type_line: 'Legendary Creature — Jellyfish', oracle_text: 'Flying\nArtifacts you control have {T}: Add {U}.', cmc: 5, colors: ['U'] },
    { name: 'Koma, Cosmos Serpent', type_line: 'Legendary Creature — Serpent', oracle_text: 'At the beginning of each upkeep, create a 3/3 blue Serpent creature token.\nSacrifice another Serpent: Tap target permanent.', cmc: 7, colors: ['G', 'U'] },
    { name: 'Kiora, Sovereign of the Deep', type_line: 'Legendary Creature — Merfolk Noble', oracle_text: 'Whenever you cast a Kraken, Leviathan, Octopus, or Serpent spell, look at top X cards.', cmc: 5, colors: ['G', 'U'] },
    { name: 'Spawning Kraken', type_line: 'Creature — Kraken', oracle_text: 'Whenever a Kraken, Leviathan, Octopus, or Serpent deals combat damage, create a 9/9 blue Kraken token.', cmc: 6, colors: ['U'] }
  ];

  const result = engine.processPlan(intent, plan, cardPool);
  const chosenCards = result.filledSlots.filter(s => s.role !== 'Land').map(s => s.winnerCard);

  console.log('✅ End-to-End Sea Monsters Ramp chosen cards:', chosenCards);

  assert.ok(!chosenCards.includes('Omen Hawker'), 'Omen Hawker MUST be excluded');
  assert.ok(!chosenCards.includes('Lady Octopus, Inspired Inventor'), 'Lady Octopus MUST be excluded (0 artifacts)');
  assert.ok(!chosenCards.includes("Mm'menon, the Right Hand"), 'Mm\'menon MUST be excluded (0 artifacts)');

  assert.ok(chosenCards.includes('Growth Spiral'), 'Growth Spiral must be selected for universal ramp');
  assert.ok(chosenCards.includes('Kiora, Sovereign of the Deep') || chosenCards.includes('Koma, Cosmos Serpent'), 'Real colossal sea monster finisher must be chosen');
});

test('CROSS-VALIDATION: Same Pool + Same Tribe + Different Intent -> Distinct Causal Winners', () => {
  const engine = new CandidateConstraintEngine();

  // Shared card pool with diverse causal capabilities
  const sharedPool = [
    { name: 'Growth Spiral', type_line: 'Instant', oracle_text: 'Draw a card. Put a land onto the battlefield.', cmc: 2, colors: ['G', 'U'] },
    { name: 'Hydro-Channeler', type_line: 'Creature — Merfolk Wizard', oracle_text: '{T}: Add {U}. Spend this mana only to cast an instant or sorcery spell.', cmc: 2, colors: ['U'] },
    { name: 'Consider', type_line: 'Instant', oracle_text: 'Surveil 1. Draw a card.', cmc: 1, colors: ['U'] },
    { name: 'Koma, Cosmos Serpent', type_line: 'Legendary Creature — Serpent', oracle_text: 'Create 3/3 Serpent token. Sacrifice another Serpent: Tap permanent.', cmc: 7, colors: ['G', 'U'] },
    { name: 'Delighted Halfling', type_line: 'Creature — Halfling Citizen', oracle_text: '{T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a legendary spell.', cmc: 1, colors: ['G'] },
    { name: 'Counterspell', type_line: 'Instant', oracle_text: 'Counter target spell.', cmc: 2, colors: ['U'] }
  ];

  // Intent A: Creature Ramp
  const intentRamp = new IntentPackage({
    format: 'MODERN',
    colors: ['G', 'U'],
    tempo: 'ramp',
    strategy: ['ramp', 'big_creatures']
  });
  const planRamp = new CapabilityPlan([
    new AllocationSlot({ slotId: 'r1', role: 'RAMP_ACCELERATION', requiredDensity: 4 })
  ]);
  const resultRamp = engine.processPlan(intentRamp, planRamp, sharedPool);
  const rampWinner = resultRamp.filledSlots[0].winnerCard;

  // Intent B: Spellslinger / Storm
  const intentSpells = new IntentPackage({
    format: 'MODERN',
    colors: ['G', 'U'],
    tempo: 'spellslinger',
    strategy: ['spellslinger', 'storm']
  });
  const planSpells = new CapabilityPlan([
    new AllocationSlot({ slotId: 's1', role: 'RAMP_ACCELERATION', requiredDensity: 4 })
  ]);
  const resultSpells = engine.processPlan(intentSpells, planSpells, sharedPool);
  const spellsWinner = resultSpells.filledSlots[0].winnerCard;

  console.log(`✅ Intent A (Creature Ramp) Winner: ${rampWinner} | Intent B (Spellslinger) Winner: ${spellsWinner}`);

  assert.ok(rampWinner === 'Delighted Halfling' || rampWinner === 'Koma, Cosmos Serpent', 'Creature Ramp must pick creature ramp');
  assert.ok(spellsWinner === 'Hydro-Channeler' || spellsWinner === 'Growth Spiral', 'Spellslinger intent must pick instant/sorcery enablers');
  assert.notEqual(rampWinner, spellsWinner, 'Winners must be causally differentiated by intent');
});
