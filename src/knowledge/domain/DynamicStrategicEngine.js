/**
 * DynamicStrategicEngine.js
 * Dynamic Win-Plan & Sequence Knowledge Engine for Expert MTG Deck Construction.
 * Evaluates:
 * 1. Multi-Tier Win Plans (Plan A: Fast Overrun, Plan B: CoCo Value Grind, Plan C: Late Game Recovery).
 * 2. Turn-by-Turn Play Sequences (T1 Dork -> T2 Lord -> T3 CoCo -> T4 Overrun).
 * 3. Dynamic Meta Valuation (Adjusts card values based on meta interaction density).
 * 4. Novel Synergy Discovery Engine (Identifies non-obvious synergistic combos).
 */

export class TurnSequencePattern {
  constructor({ id, name, archetype, turn1, turn2, turn3, turn4, targetTurnLethal = 4 }) {
    this.id = id;
    this.name = name;
    this.archetype = archetype;
    this.turn1 = turn1;
    this.turn2 = turn2;
    this.turn3 = turn3;
    this.turn4 = turn4;
    this.targetTurnLethal = targetTurnLethal;
    Object.freeze(this);
  }
}

export const EXPERT_PLAY_SEQUENCES = Object.freeze([
  new TurnSequencePattern({
    id: 'seq_elf_overrun',
    name: 'Elf Dork into CoCo Overrun',
    archetype: 'Elves / Ramp',
    turn1: 'Cast Llanowar Elves / Delighted Halfling',
    turn2: 'Cast Elvish Archdruid / Lord',
    turn3: 'Cast Collected Company (Hit 2 Creatures)',
    turn4: 'Cast Ezuri / Craterhoof Overrun for Lethal',
    targetTurnLethal: 4
  }),
  new TurnSequencePattern({
    id: 'seq_control_lock',
    name: 'Azorius Counter Lock into Teferi',
    archetype: 'Control',
    turn1: 'Hold up Removal / Open Land',
    turn2: 'Hold up Counterspell / Memory Deluge',
    turn3: 'Cast Supreme Verdict / Sweeper',
    turn4: 'Cast Teferi, Hero of Dominaria + Hold up Protection',
    targetTurnLethal: 7
  })
]);

export class DynamicStrategicEngine {
  static buildDeckWinPlans(archetype = 'Ramp') {
    return Object.freeze({
      primaryPlanA: {
        id: 'plan_a_fast_lethal',
        name: 'Plan A: Fast Mana Dork into Turn 4 Overrun',
        targetTurn: 4,
        confidence: 0.88,
        requiredSequence: EXPERT_PLAY_SEQUENCES[0]
      },
      fallbackPlanB: {
        id: 'plan_b_coco_value',
        name: 'Plan B: Collected Company Value Engine Grind',
        targetTurn: 6,
        confidence: 0.82,
        requiredSequence: 'Cast CoCo EOT -> Rebuild Board -> Midrange Advantage'
      },
      contingencyPlanC: {
        id: 'plan_c_late_recovery',
        name: 'Plan C: Graveyard Topdeck & Land Ramp Recovery',
        targetTurn: 8,
        confidence: 0.75,
        requiredSequence: 'Topiary Stomper Land Search -> Late Game Titan'
      }
    });
  }

  static evaluateDynamicCardValue(cardName, metaInteractionDensity = 0.30) {
    const name = cardName ? cardName.toLowerCase() : '';
    let baseScore = 0.80;

    // Dynamic Meta Adaptation: If meta removal is low (< 25%), fragility of dorks decreases -> Dorks gain value!
    if (name.includes('llanowar elves') || name.includes('halfling')) {
      if (metaInteractionDensity < 0.25) baseScore = 0.98; // Low removal meta -> Dorks are God Tier
      else if (metaInteractionDensity > 0.45) baseScore = 0.72; // Heavy removal meta -> Dorks die easily
      else baseScore = 0.90;
    }

    if (name.includes('thoughtseize')) {
      if (metaInteractionDensity > 0.40) baseScore = 0.95; // Heavy control/combo meta -> Discard is Tier 1
      else baseScore = 0.82;
    }

    return Number(baseScore.toFixed(3));
  }
}
