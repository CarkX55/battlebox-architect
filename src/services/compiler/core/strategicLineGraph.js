/**
 * src/services/compiler/core/strategicLineGraph.js
 * 
 * StrategicLineGraph: V29.0 Intent-Driven Line Selector.
 * 
 * Responsibility: ONLY selection. Does NOT discover or evaluate viability.
 * That has already been done by MechanicDiscoveryEngine + StrategicMemoryModel.
 * 
 * Given the StrategicMemory (with pre-evaluated viable/failed lines) and the
 * user's IntentPackage, selects which line(s) the deck should execute.
 * 
 * Selection is based on capability affinity between the line's dominant
 * capabilities and the user's intent signals — NEVER on textual IDs/labels.
 * 
 * Axioms:
 *   1. ZERO `if (tempo === 'aggro')` rules.
 *   2. Selection is by capability affinity, not by string matching on labels.
 *   3. Divergence is guaranteed by construction: different intents activate
 *      different capability affinity scores, selecting different lines.
 *   4. Deterministic and reproducible.
 */

import { StrategicMemory, StrategicLine } from './strategicMemoryModel.js';

/**
 * Immutable output of line selection.
 */
export class StrategicLineSelection {
  constructor({
    primaryLine = null,
    secondaryLine = null,
    rejectedLines = [],
    selectionEvidence = {}
  } = {}) {
    this.primaryLine = primaryLine;
    this.secondaryLine = secondaryLine;
    this.rejectedLines = Object.freeze([...rejectedLines]);
    this.selectionEvidence = Object.freeze({ ...selectionEvidence });
    Object.freeze(this);
  }
}

// ─── Capability Affinity Mapping ─────────────────────────────────────────────
// Maps tempo/strategy CONCEPTS (not string literals) to capability groups.
// The affinity between a line and an intent is measured by how many of the
// line's dominant capabilities overlap with the intent's desired capability groups.
//
// These are NOT `if (tempo === 'aggro')` rules. They are a mapping from
// game-theoretic concepts to the mechanical capabilities that implement them.
// The same mapping works for any tribe/pool.
const TEMPO_CAPABILITY_AFFINITY = {
  // Speed / swarm aggressive strategy: combat pressure, lords, early pressure
  fast: ['COMBAT_DAMAGE', 'TRIBAL_LORD'],
  // Direct damage reach strategy: burn, cheap face damage, spot removal
  burn: ['PLAYER_REACH', 'CHEAP_REMOVAL'],
  // Attrition / sacrifice strategy: sacrifice outlets, death triggers
  attrition: ['SACRIFICE_OUTLET', 'DEATH_PAYOFF'],
  // Token swarm strategy: token generators, lords, go-wide combat
  tokens: ['TOKEN_GENERATOR', 'TRIBAL_LORD', 'COMBAT_DAMAGE'],
  // Scaling strategies: ramp, counters, finishers, growth
  scaling: ['MANA_ACCELERATION', 'FINISHER', 'COUNTER_GENERATOR', 'GROWTH_PAYOFF', 'LAND_ACCELERATION', 'LANDFALL_PAYOFF'],
  // Disruption strategies: counterspells, removal, sweepers
  disruption: ['COUNTER_DISRUPTION', 'CHEAP_REMOVAL', 'BOARD_SWEEPER'],
  // Synergy / combo strategies: mana acceleration, repeated triggers, blink, engine pieces
  synergy: ['MANA_ACCELERATION', 'ETB_VALUE', 'BLINK_ENABLER', 'GRAVEYARD_ENABLER'],
  // Resource / midrange strategies: card flow, ETB value, resilient threats
  resource: ['CARD_FLOW', 'ETB_VALUE', 'FINISHER', 'LIFEGAIN_TRIGGER'],
  // State transition / transformation mechanics: Day/Night, DFC transformation, night payoffs
  transform: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'TRANSFORM_PAYOFF', 'NIGHT_PAYOFF', 'STATE_TRANSITION_CONTROLLER'],
  // Landfall / land progression mechanics
  landfall: ['LAND_ACCELERATION', 'LANDFALL_PAYOFF', 'MANA_ACCELERATION']
};

// Maps user-facing tempo / strategy / mechanics strings to capability affinity groups
const TEMPO_TO_GROUPS = {
  aggro: ['fast'],
  burn: ['burn'],
  tempo: ['fast', 'disruption'],
  midrange: ['resource', 'scaling'],
  control: ['disruption', 'resource'],
  combo: ['synergy'],
  sacrifice: ['attrition'],
  aristocrats: ['attrition'],
  tokens: ['tokens'],
  ramp: ['scaling', 'landfall'],
  reanimator: ['attrition', 'scaling'],
  value: ['resource'],
  transform: ['transform'],
  'day-night': ['transform'],
  'day/night': ['transform'],
  daybound: ['transform'],
  landfall: ['landfall']
};

/**
 * Declarative capability ontology for tribal identities.
 * Tribes contribute capability signals to the possibility space without dictating the win condition.
 */
export const TRIBAL_CAPABILITY_ONTOLOGY = Object.freeze({
  werewolf: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'TRANSFORM_PAYOFF', 'NIGHT_PAYOFF'],
  wolf: ['DAYBOUND_NIGHTBOUND', 'STATE_TRANSITION_ENGINE', 'TRANSFORM_PAYOFF', 'NIGHT_PAYOFF'],
  vampire: ['SACRIFICE_OUTLET', 'DEATH_PAYOFF'],
  zombie: ['SACRIFICE_OUTLET', 'DEATH_PAYOFF'],
  elf: ['MANA_ACCELERATION'],
  druid: ['MANA_ACCELERATION'],
  goblin: ['TOKEN_GENERATOR', 'BOARD_AMPLIFIER'],
  soldier: ['TOKEN_GENERATOR', 'BOARD_AMPLIFIER'],
  merfolk: ['COUNTER_DISRUPTION', 'EVASION'],
  spirit: ['COUNTER_DISRUPTION', 'EVASION']
});

export class StrategicLineGraph {
  /**
   * Selects the best strategic line(s) from the memory based on user intent.
   * 
   * @param {Object} params
   * @param {StrategicMemory} params.strategicMemory - Pre-evaluated memory with viable/failed lines
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage - User intent
   * @returns {StrategicLineSelection}
   */
  static selectLines({ strategicMemory, intentPackage = {} } = {}) {
    const viableLines = strategicMemory.viableLines || [];
    const failedLines = strategicMemory.failedLines || [];

    if (viableLines.length === 0) {
      return new StrategicLineSelection({
        primaryLine: null,
        secondaryLine: null,
        rejectedLines: failedLines.map(l => ({
          line: l,
          reason: `NOT_VIABLE: execution probability ${l.executionProbability} below threshold`
        })),
        selectionEvidence: {
          status: 'NO_VIABLE_LINES',
          diagnosis: 'No strategic lines in the pool have sufficient execution probability for the requested tribe/format.'
        }
      });
    }

    // 1. Compute the user's desired capability profile from their intent
    const desiredCapabilities = this._buildDesiredCapabilityProfile(intentPackage);

    // 2. Score each viable line by capability affinity to the intent
    const scoredLines = viableLines.map(line => ({
      line,
      affinityScore: this._computeCapabilityAffinity(line, desiredCapabilities),
      viabilityBonus: line.executionProbability // tiebreaker: more viable = better
    }));

    // 3. Sort by affinity (primary), then viability (secondary)
    scoredLines.sort((a, b) => {
      const affinityDiff = b.affinityScore - a.affinityScore;
      if (Math.abs(affinityDiff) > 0.01) return affinityDiff;
      return b.viabilityBonus - a.viabilityBonus;
    });

    // 4. Select primary line
    const primary = scoredLines[0];

    // 5. Select optional secondary line (if it shares cards with primary and adds new capabilities)
    let secondary = null;
    if (scoredLines.length > 1) {
      for (let i = 1; i < scoredLines.length; i++) {
        const candidate = scoredLines[i];
        // Must have reasonable affinity (≥ 50% of primary's)
        if (candidate.affinityScore < primary.affinityScore * 0.5) continue;

        // Must share some cards (cross-engine cards)
        const sharedCards = candidate.line.participatingCardNames.filter(
          n => primary.line.participatingCardNames.includes(n)
        );
        if (sharedCards.length > 0) {
          // Must add at least one new capability
          const newCaps = candidate.line.dominantCapabilities.filter(
            c => !primary.line.dominantCapabilities.includes(c)
          );
          if (newCaps.length > 0) {
            secondary = candidate;
            break;
          }
        }
      }
    }

    // 6. Document rejections
    const rejectedLines = [];
    for (const scored of scoredLines) {
      if (scored === primary || scored === secondary) continue;
      rejectedLines.push({
        line: scored.line,
        affinityScore: scored.affinityScore,
        reason: scored.affinityScore < primary.affinityScore * 0.5
          ? `LOW_AFFINITY: capability overlap with intent too low (${scored.affinityScore.toFixed(2)} vs primary ${primary.affinityScore.toFixed(2)})`
          : `DOMINATED: primary line has higher affinity or viability`
      });
    }

    // Also include failed lines in rejections
    for (const failed of failedLines) {
      rejectedLines.push({
        line: failed,
        affinityScore: 0,
        reason: `NOT_VIABLE: execution probability ${failed.executionProbability} below threshold`
      });
    }

    return new StrategicLineSelection({
      primaryLine: {
        line: primary.line,
        affinityScore: primary.affinityScore,
        reason: `Selected: capability affinity ${primary.affinityScore.toFixed(2)}, execution probability ${primary.line.executionProbability}`
      },
      secondaryLine: secondary ? {
        line: secondary.line,
        affinityScore: secondary.affinityScore,
        reason: `Secondary: adds capabilities [${secondary.line.dominantCapabilities.filter(c => !primary.line.dominantCapabilities.includes(c)).join(', ')}]`
      } : null,
      rejectedLines,
      selectionEvidence: {
        status: 'SELECTION_SUCCESS',
        desiredCapabilities: [...(desiredCapabilities.desired || desiredCapabilities)],
        totalViableLines: viableLines.length,
        totalFailedLines: failedLines.length
      }
    });
  }

  /**
   * Builds the desired capability profile and forbidden axes from the user's intent.
   * Enforces INTENT_GAMEPLAN_FIDELITY_INVARIANT:
   *   Intent.requiredMechanics ⊆ Gameplan.requiredMechanicCapabilities
   *   Intent.forbiddenAxes ∩ Gameplan.activeAxes = ∅
   * @private
   */
  static _buildDesiredCapabilityProfile(intentPackage) {
    const desired = new Set();
    const explicitMechanics = new Set();
    const forbidden = new Set();

    // 1. From tempo
    const tempo = (intentPackage.tempo || '').toLowerCase();
    const tempoGroups = TEMPO_TO_GROUPS[tempo] || ['fast']; // default to fast if unknown
    for (const group of tempoGroups) {
      const caps = TEMPO_CAPABILITY_AFFINITY[group] || [];
      caps.forEach(c => desired.add(c));
    }

    // 2. From explicit strategy signals
    const strategies = Array.isArray(intentPackage.strategy) ? intentPackage.strategy : (intentPackage.strategy ? [intentPackage.strategy] : []);
    for (const strat of strategies) {
      const stratLower = (typeof strat === 'string' ? strat : strat?.name || '').toLowerCase();
      for (const [key, grps] of Object.entries(TEMPO_TO_GROUPS)) {
        if (stratLower.includes(key)) {
          for (const grp of grps) {
            const caps = TEMPO_CAPABILITY_AFFINITY[grp] || [];
            caps.forEach(c => {
              desired.add(c);
              if (grp === 'transform' || grp === 'landfall' || grp === 'attrition') {
                explicitMechanics.add(c);
              }
            });
          }
        }
      }
    }

    // 2b. Tribal / Identity Possibility Space Contribution:
    // A declared identity contributes intrinsic capability signals to the candidate search space
    // without dictating the win condition (tribe != strategy).
    const primaryTribe = (intentPackage.primaryTribe || intentPackage.primaryIdentity || '').toLowerCase();
    if (primaryTribe && primaryTribe !== 'none') {
      desired.add('TRIBAL_LORD');
      desired.add('COMBAT_DAMAGE');

      for (const [tribeKey, caps] of Object.entries(TRIBAL_CAPABILITY_ONTOLOGY)) {
        if (primaryTribe.includes(tribeKey)) {
          caps.forEach(c => desired.add(c));
        }
      }
    }

    // 3. From tri-state mechanics modalities (REQUIRED, PREFERRED, OPTIONAL)
    const modalities = intentPackage.mechanicsModalities || { required: [], preferred: [], optional: [] };
    const requiredMechanics = new Set();
    const preferredMechanics = new Set();
    const optionalMechanics = new Set();

    const processMechSet = (mechs, targetSet, isReq) => {
      for (const mech of mechs) {
        const mechLower = String(mech).toLowerCase();
        for (const [key, grps] of Object.entries(TEMPO_TO_GROUPS)) {
          if (mechLower.includes(key)) {
            for (const grp of grps) {
              const caps = TEMPO_CAPABILITY_AFFINITY[grp] || [];
              caps.forEach(c => {
                desired.add(c);
                targetSet.add(c);
              });
            }
          }
        }
        const upperMech = mechLower.toUpperCase().replace(/[\s-]/g, '_');
        desired.add(upperMech);
        targetSet.add(upperMech);
      }
    };

    const explicitReqList = [...new Set([...(modalities.explicitRequired || []), ...(modalities.required || [])])];
    processMechSet(explicitReqList, requiredMechanics, true);
    processMechSet(modalities.preferred, preferredMechanics, false);
    processMechSet(modalities.optional, optionalMechanics, false);

    // If plain mechanics array was passed without modalities, treat as preferred
    const rawMechs = [
      ...(Array.isArray(intentPackage.mechanics) ? intentPackage.mechanics : (intentPackage.mechanics ? [intentPackage.mechanics] : [])),
      ...(Array.isArray(intentPackage.constraints?.boostKeywords) ? intentPackage.constraints.boostKeywords : [])
    ];
    processMechSet(rawMechs, preferredMechanics, false);

    // 4. Forbidden axes and vetoed mechanics
    const rawVetoes = [
      ...(Array.isArray(intentPackage.constraints?.excludedMechanics) ? intentPackage.constraints.excludedMechanics : []),
      ...(Array.isArray(intentPackage.constraints?.vetoedKeywords) ? intentPackage.constraints.vetoedKeywords : []),
      ...(Array.isArray(intentPackage.constraints?.forbiddenStrategicAxes) ? intentPackage.constraints.forbiddenStrategicAxes : [])
    ];
    for (const v of rawVetoes) {
      const vLower = String(v).toLowerCase();
      for (const [key, grps] of Object.entries(TEMPO_TO_GROUPS)) {
        if (vLower.includes(key)) {
          for (const grp of grps) {
            const caps = TEMPO_CAPABILITY_AFFINITY[grp] || [];
            caps.forEach(c => forbidden.add(c));
          }
        }
      }
      forbidden.add(vLower.toUpperCase().replace(/[\s-]/g, '_'));
    }

    return { desired, requiredMechanics, preferredMechanics, optionalMechanics, forbidden };
  }

  /**
   * Computes capability affinity between a strategic line and a desired capability set.
   * Enforces:
   *   - Hard veto for forbidden axes
   *   - Strict requirement for REQUIRED mechanics (if required is set, line must provide at least one)
   *   - Proportional affinity multiplier for PREFERRED and OPTIONAL mechanics
   * @private
   */
  static _computeCapabilityAffinity(line, profile) {
    const { desired, requiredMechanics, preferredMechanics, optionalMechanics, forbidden } = profile;
    if (!desired || desired.size === 0) return 0.5;

    const lineCaps = new Set([
      ...line.dominantCapabilities,
      ...(line.criticalRoles || []).map(r => r.role)
    ]);

    // Hard Veto: Intent.forbiddenAxes ∩ Gameplan.activeAxes = ∅
    if (forbidden && forbidden.size > 0) {
      for (const f of forbidden) {
        if (lineCaps.has(f)) return 0;
      }
    }

    // REQUIRED Modality Gate:
    if (requiredMechanics && requiredMechanics.size > 0) {
      let hasRequired = false;
      for (const req of requiredMechanics) {
        if (lineCaps.has(req)) {
          hasRequired = true;
          break;
        }
      }
      if (!hasRequired) return 0; // Hard rejection if line does not fulfill REQUIRED mechanic
    }

    let overlap = 0;
    for (const d of desired) {
      if (lineCaps.has(d)) overlap++;
    }

    let score = overlap / desired.size;

    // PREFERRED Mechanics Multiplier (+1.2x)
    if (preferredMechanics && preferredMechanics.size > 0) {
      let prefOverlap = 0;
      for (const pm of preferredMechanics) {
        if (lineCaps.has(pm)) prefOverlap++;
      }
      if (prefOverlap > 0) {
        score += 1.2 * (prefOverlap / preferredMechanics.size);
      }
    }

    // OPTIONAL Mechanics Multiplier (+0.2x)
    if (optionalMechanics && optionalMechanics.size > 0) {
      let optOverlap = 0;
      for (const om of optionalMechanics) {
        if (lineCaps.has(om)) optOverlap++;
      }
      if (optOverlap > 0) {
        score += 0.2 * (optOverlap / optionalMechanics.size);
      }
    }

    // Synergistic win condition priority over generic COMBAT_PRESSURE
    const winCond = (line.winCondition?.condition || '').toUpperCase();
    if (winCond && winCond !== 'COMBAT_PRESSURE' && score > 0) {
      score += 0.30;
    }

    return score;
  }
}
