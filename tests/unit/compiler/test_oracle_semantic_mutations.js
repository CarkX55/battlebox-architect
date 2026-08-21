import test from 'node:test';
import assert from 'node:assert/strict';
import { CardCausalContract } from '../../../src/services/compiler/core/cardCausalContract.js';
import { DemandSupplyLedger } from '../../../src/services/compiler/core/demandSupplyLedger.js';

test('MUTATION A (Domain Mutation): Unrestricted Mana -> Creature-Restricted Mana', () => {
  const baseCard = {
    name: 'Llanowar Elves',
    mana_cost: '{G}',
    type_line: 'Creature — Elf Druid',
    oracle_text: '{T}: Add {G}.',
    cmc: 1
  };

  const mutatedCard = {
    name: 'Somberwald Beastmaster',
    mana_cost: '{G}',
    type_line: 'Creature — Human Druid',
    oracle_text: '{T}: Add {G}. Spend this mana only to cast creature spells.',
    cmc: 1
  };

  const baseContract = CardCausalContract.parse(baseCard);
  const mutatedContract = CardCausalContract.parse(mutatedCard);

  // Base card has universal mana
  assert.equal(baseContract.supplies[0].domain, 'UNIVERSAL');
  assert.equal(baseContract.supplies[0].isUniversal, true);

  // Mutated card changes domain automatically without card-name rules
  assert.equal(mutatedContract.supplies[0].domain, 'CREATURE_SPELLS_ONLY');
  assert.equal(mutatedContract.supplies[0].isUniversal, false);
});

test('MUTATION B (Target Mutation): Any Target -> Target Creature (Player Reach Vanishes)', () => {
  const boltCard = {
    name: 'Lightning Bolt',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Lightning Bolt deals 3 damage to any target.',
    cmc: 1
  };

  const slashCard = {
    name: 'Flame Slash',
    mana_cost: '{R}',
    type_line: 'Sorcery',
    oracle_text: 'Flame Slash deals 4 damage to target creature.',
    cmc: 1
  };

  const boltContract = CardCausalContract.parse(boltCard);
  const slashContract = CardCausalContract.parse(slashCard);

  // Bolt can hit player and provides PLAYER_REACH
  assert.ok(boltContract.supplies.some(s => s.capability === 'PLAYER_REACH'), 'Lightning Bolt must supply PLAYER_REACH');
  const boltRemoval = boltContract.supplies.find(s => s.capability === 'CHEAP_REMOVAL');
  assert.equal(boltRemoval.canHitPlayer, true);

  // Flame Slash is creature-only and must NOT provide PLAYER_REACH
  assert.ok(!slashContract.supplies.some(s => s.capability === 'PLAYER_REACH'), 'Flame Slash must NOT supply PLAYER_REACH');
  const slashRemoval = slashContract.supplies.find(s => s.capability === 'CHEAP_REMOVAL');
  assert.equal(slashRemoval.canHitPlayer, false);
});

test('MUTATION C (Demand Mutation): Additional Cost (HARD) vs Optional Payoff (CONDITIONAL)', () => {
  const hardDemandCard = {
    name: 'Shrapnel Blast',
    mana_cost: '{1}{R}',
    type_line: 'Instant',
    oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact.\nShrapnel Blast deals 5 damage to any target.',
    cmc: 2
  };

  const conditionalDemandCard = {
    name: 'Galvanic Blast',
    mana_cost: '{R}',
    type_line: 'Instant',
    oracle_text: 'Galvanic Blast deals 2 damage to any target. Metalcraft — Galvanic Blast deals 4 damage instead if you control three or more artifacts.',
    cmc: 1
  };

  const hardContract = CardCausalContract.parse(hardDemandCard);
  const condContract = CardCausalContract.parse(conditionalDemandCard);

  const hardSac = hardContract.demands.find(d => d.resource === 'SACRIFICE_FODDER' || d.resource === 'ARTIFACT_CONTROL');
  assert.equal(hardSac.necessity, 'HARD', 'Additional sacrifice cost must be classified as HARD');

  const condMetalcraft = condContract.demands.find(d => d.resource === 'ARTIFACT_CONTROL');
  assert.equal(condMetalcraft.necessity, 'CONDITIONAL', 'Metalcraft condition must be classified as CONDITIONAL');

  // In 0-artifact deck state:
  const emptyState = { cards: [{ card: { name: 'Mountain' }, count: 24 }] };
  const auditHard = DemandSupplyLedger.auditCardDemands(hardDemandCard, emptyState);
  assert.equal(auditHard.isSatisfied, false, 'Hard demand card must be rejected in 0-artifact state');

  const auditCond = DemandSupplyLedger.auditCardDemands(conditionalDemandCard, emptyState);
  assert.equal(auditCond.isSatisfied, true, 'Conditional card can still be cast (degraded but not rejected)');
});

test('MUTATION D (Self-Sufficiency Mutation): External Dependency -> Internal Fuel Loop', () => {
  const parasiteCard = {
    name: 'Carrion Feeder',
    mana_cost: '{B}',
    type_line: 'Creature — Zombie',
    oracle_text: 'Sacrifice a creature: Put a +1/+1 counter on Carrion Feeder. Carrion Feeder cannot block.',
    cmc: 1
  };

  const selfSuffEngine = {
    name: 'Slimefoot, the Stowaway',
    mana_cost: '{1}{B}{G}',
    type_line: 'Legendary Creature — Fungus',
    oracle_text: '{4}: Create a 1/1 green Saproling creature token.\nWhenever a Saproling you control dies, Slimefoot deals 1 damage to each opponent and you gain 1 life.',
    cmc: 3
  };

  const parasiteContract = CardCausalContract.parse(parasiteCard);
  const engineContract = CardCausalContract.parse(selfSuffEngine);

  assert.equal(parasiteContract.selfSupply.isSelfSufficient, false, 'Carrion Feeder requires external fodder');
  assert.equal(engineContract.selfSupply.isSelfSufficient, true, 'Slimefoot generates its own fuel');
});

test('MUTATION E (Timing Mutation): Immediate ETB Velocity vs Upkeep-Delayed Engine', () => {
  const etbDraw = {
    name: 'Elvish Visionary',
    mana_cost: '{1}{G}',
    type_line: 'Creature — Elf Shaman',
    oracle_text: 'When this creature enters, draw a card.',
    cmc: 2
  };

  const upkeepDraw = {
    name: 'Phyrexian Arena',
    mana_cost: '{1}{B}{B}',
    type_line: 'Enchantment',
    oracle_text: 'At the beginning of your upkeep, you draw a card and you lose 1 life.',
    cmc: 3
  };

  const etbContract = CardCausalContract.parse(etbDraw);
  const upkeepContract = CardCausalContract.parse(upkeepDraw);

  assert.ok(etbContract.oracleTruth.timing.includes('ON_ENTER_OR_CAST'), 'Elvish Visionary must be ON_ENTER');
  assert.ok(upkeepContract.oracleTruth.timing.includes('ON_UPKEEP'), 'Phyrexian Arena must be ON_UPKEEP');

  assert.equal(etbContract.supplies.find(s => s.capability === 'CARD_FLOW').repeatable, false);
  assert.equal(upkeepContract.supplies.find(s => s.capability === 'CARD_FLOW').repeatable, true);
});

test('MUTATION F (Consumer Incompatibility): Creature-Only Mana cannot satisfy Instant/Sorcery Need', () => {
  const creatureRampCard = {
    name: 'Delighted Halfling',
    mana_cost: '{G}',
    type_line: 'Creature — Halfling Citizen',
    oracle_text: '{T}: Add {C}. {T}: Add one mana of any color. Spend this mana only to cast a legendary spell.',
    cmc: 1
  };

  const spellRampCard = {
    name: 'Hydro-Channeler',
    mana_cost: '{1}{U}',
    type_line: 'Creature — Merfolk Wizard',
    oracle_text: '{T}: Add {U}. Spend this mana only to cast an instant or sorcery spell.',
    cmc: 2
  };

  const creatureContract = CardCausalContract.parse(creatureRampCard);
  const spellContract = CardCausalContract.parse(spellRampCard);

  // In Spellslinger intent:
  const spellslingerCompat1 = CardCausalContract.isCausallyCompatibleWithRole(creatureContract, 'RAMP_ACCELERATION', { tempo: 'spellslinger' });
  const spellslingerCompat2 = CardCausalContract.isCausallyCompatibleWithRole(spellContract, 'RAMP_ACCELERATION', { tempo: 'spellslinger' });

  assert.equal(spellslingerCompat1.isCompatible, false, 'Legendary mana cannot satisfy non-legendary spellslinger need');
  assert.equal(spellslingerCompat2.isCompatible, true, 'Spell mana satisfies spellslinger need');

  // In Creature Ramp intent:
  const creatureCompat1 = CardCausalContract.isCausallyCompatibleWithRole(creatureContract, 'RAMP_ACCELERATION', { tempo: 'ramp' });
  const creatureCompat2 = CardCausalContract.isCausallyCompatibleWithRole(spellContract, 'RAMP_ACCELERATION', { tempo: 'ramp' });

  assert.equal(creatureCompat1.isCompatible, true, 'Legendary/Creature mana satisfies creature ramp need');
  assert.equal(creatureCompat2.isCompatible, false, 'Spell-only mana cannot satisfy creature ramp need');
});
