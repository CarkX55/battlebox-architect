/**
 * src/services/compiler/core/deckPlanCoverage.js
 * 
 * DeckPlanCoverage: V29.2 Gameplan Execution Coverage Telemetry.
 * 
 * Generates an empirical breakdown of how well the final DeckState covers
 * each operational phase and turn requirement of the active GameplanContract:
 *   - Turn 1: Early Pressure / Enabler Deployment (Target P >= 0.88, maxMana = 1)
 *   - Turn 2: Board Development / Threat Escalation (Target P >= 0.85, maxMana = 2)
 *   - Turn 3: Amplification / Engine Progression (Target P >= 0.75, maxMana = 3)
 *   - Turn 4+: Lethal Conversion / Reach / Finisher (Target P >= 0.70, maxMana = killTurn)
 *   - Recovery: Resilience against board wipes / stabilization
 * 
 * Strictly validates ExecutionWindows: cards with CMC > maxMana CANNOT execute on-turn demands.
 */

import { CardCausalContract } from './cardCausalContract.js';
import { extractCanonicalCmc } from './canonicalCardNormalizer.js';

export class DeckPlanCoverage {
  static evaluateCoverage(deckState, gameplanContract, deckSize = 60) {
    return this.computeCoverage({ deckState, gameplanContract, deckSize });
  }

  /**
   * Computes gameplan coverage metrics for the given deck state.
   * 
   * @param {Object} params
   * @param {Object} params.deckState
   * @param {import('./gameplanSynthesizer.js').GameplanContract} params.gameplanContract
   * @param {number} [params.deckSize=60]
   * @returns {Object} Full coverage breakdown and composite execution score
   */
  static computeCoverage({ deckState, gameplanContract, deckSize = 60 }) {
    if (!deckState || !gameplanContract) {
      return { phases: [], compositeScore: 0, isFullyCovered: false, criticalFailures: [], importantDeficits: [] };
    }

    const cards = deckState.cards || [];
    const nonLands = cards.filter(c => !c.isLand);

    const phases = [];
    const criticalFailures = [];
    const importantDeficits = [];
    let probabilityProduct = 1.0;

    // Evaluate each turn requirement in the Gameplan
    for (const turnReq of gameplanContract.turnRequirements || []) {
      const turn = turnReq.turn;
      const drawWindow = Math.min(deckSize, 7 + Math.max(0, turn - 1));

      for (const demand of turnReq.functionalDemands || []) {
        const maxMana = demand.executionWindow?.maxMana ?? demand.constraints?.cmc?.max ?? turn;
        const criticality = demand.criticality || turnReq.criticality || 'IMPORTANT';

        // Count how many copies in the deck satisfy this demand within the strict execution window
        let copiesMatching = 0;
        const matchingCardNames = [];

        for (const entry of nonLands) {
          const cardObj = entry.cardObj || entry.card || entry;
          const qty = Number(entry.quantity || entry.count || 1);
          const cmc = extractCanonicalCmc(cardObj || entry);
          const typeLine = String(cardObj.type_line || cardObj.type || entry.type_line || '').toLowerCase();
          const oracle = String(cardObj.oracle_text || cardObj.oracle || cardObj.text || entry.oracle_text || '').toLowerCase();
          const power = Number(cardObj.power || entry.power || 0);

          // Timing Constraint: A card cannot execute a turn requirement if CMC > maxMana
          if (cmc > maxMana) continue;

          const cardContract = CardCausalContract.parse(cardObj);
          const caps = new Set([
            ...(cardContract.supplies || []).map(s => s.capability),
            ...(entry.capabilities || [])
          ]);

          const requiresOnIdentity = Boolean(demand.constraints?.requiresOnIdentity);
          const primaryIdentity = (gameplanContract.identityConstraints?.primaryIdentity || '').toLowerCase();
          
          if (requiresOnIdentity) {
            const isCreature = typeLine.includes('creature');
            if (!isCreature) continue; // Non-creature spells (e.g. Play with Fire) CANNOT satisfy on-identity creature demands!
            if (primaryIdentity && primaryIdentity !== 'none') {
              const isMember = typeLine.includes(primaryIdentity) || oracle.includes('changeling') ||
                (Array.isArray(cardObj.card_faces) && cardObj.card_faces.some(f => (f.type_line || '').toLowerCase().includes(primaryIdentity)));
              if (!isMember) continue; // Off-tribe cannot satisfy on-identity demand!
            }
          }

          let matches = false;
          if (demand.functionName.includes('1CMC')) {
            if (cmc <= 1 && (typeLine.includes('creature') || caps.has('MANA_ACCELERATION') || caps.has('CARD_FLOW') || caps.has('PLAYER_REACH') || caps.has('CHEAP_REMOVAL'))) {
              matches = true;
            }
          } else if (demand.functionName.includes('2CMC')) {
            if (cmc <= 2 && (typeLine.includes('creature') || caps.has('MANA_ACCELERATION') || caps.has('LAND_ACCELERATION') || caps.has('CHEAP_REMOVAL') || caps.has('COUNTERSPELL') || caps.has('CARD_FLOW') || caps.has('PLAYER_REACH'))) {
              matches = true;
            }
          } else if (demand.functionName.includes('AMPLIFY')) {
            const isBurn = (gameplanContract.winCondition?.type || '').includes('BURN') ||
              (gameplanContract.thesis || '').toLowerCase().includes('burn') ||
              (gameplanContract.derivedFromLine || '').toLowerCase().includes('burn') ||
              (gameplanContract.turnRequirements || []).some(tr => tr.functionalDemands?.some(fd => fd.functionName.includes('BURN')));
            if (cmc <= maxMana && (
              caps.has('TRIBAL_LORD') ||
              caps.has('COUNTER_GENERATOR') ||
              caps.has('SACRIFICE_OUTLET') ||
              caps.has('DEATH_PAYOFF') ||
              caps.has('TOKEN_GENERATOR') ||
              caps.has('DAYBOUND_NIGHTBOUND') ||
              caps.has('TRANSFORM_PAYOFF') ||
              caps.has('CARD_FLOW') ||
              caps.has('MANA_ACCELERATION') ||
              typeLine.includes('planeswalker') ||
              (isBurn && (caps.has('PLAYER_REACH') || oracle.includes('damage') || oracle.includes('prowess'))) ||
              oracle.includes('creatures you control get +') ||
              oracle.includes('have haste') ||
              oracle.includes('battle cry') ||
              oracle.includes('daybound') ||
              oracle.includes('nightbound')
            )) {
              matches = true;
            }
          } else if (demand.functionName.includes('LETHAL') || demand.functionName.includes('CONVERT')) {
            const winCondType = (gameplanContract.winCondition?.type || '').toUpperCase();
            const hitsPlayerOrAny = oracle.includes('any target') || oracle.includes('target player') || oracle.includes('each opponent');
            if (cmc <= maxMana) {
              if (caps.has('PLAYER_REACH') || (hitsPlayerOrAny && (oracle.includes('damage') || oracle.includes('loses')))) {
                matches = true;
              } else if (caps.has('FINISHER') || caps.has('LARGE_FINISHER') || caps.has('COMBAT_FINISHER') || (typeLine.includes('creature') && power >= 5) || winCondType.includes('COMBAT') || winCondType.includes('SWARM') || winCondType.includes('AGGRO') || winCondType.includes('TEMPO') || winCondType.includes('MIDRANGE') || winCondType.includes('ATTRITION')) {
                if (caps.has('TRIBAL_LORD') || caps.has('TOKEN_GENERATOR') || caps.has('FINISHER') || caps.has('COMBAT_FINISHER')) {
                  matches = true;
                } else if (typeLine.includes('creature') && (power >= 5 || (power >= 3 && (oracle.includes('haste') || oracle.includes('trample') || oracle.includes('flying') || oracle.includes("can't be blocked"))))) {
                  matches = true;
                }
              } else if (winCondType.includes('DRAIN') || winCondType.includes('SACRIFICE')) {
                if (caps.has('SACRIFICE_OUTLET') || caps.has('DEATH_PAYOFF')) {
                  matches = true;
                }
              }
            }
          } else if (demand.functionName.includes('FINISHER')) {
            if (cmc <= maxMana && (caps.has('FINISHER') || caps.has('LARGE_FINISHER') || (typeLine.includes('creature') && power >= 5))) {
              matches = true;
            }
          }

          if (matches) {
            copiesMatching += qty;
            matchingCardNames.push(`${cardObj.name || entry.name} (${qty}x)`);
          }
        }

        const prob = this._hypergeometricAtLeastOne(deckSize, copiesMatching, drawWindow);
        const targetP = demand.targetProbability || 0.75;
        // V29.8 Hard Execution Target Invariant: actual < target strictly yields deficit
        const isSatisfied = prob >= targetP;

        const cardCoverage = Number(prob.toFixed(3));
        const manaCoverage = copiesMatching > 0 ? Number(Math.min(1.0, prob * 1.05).toFixed(3)) : 0;
        const timingCoverage = copiesMatching > 0 ? 1.0 : 0;
        const sequenceCoverage = copiesMatching >= (demand.minimumInDeck || 1) ? 1.0 : Number((copiesMatching / Math.max(1, demand.minimumInDeck || 1)).toFixed(3));
        const jointExecutionProbability = Number((cardCoverage * (0.8 + 0.2 * sequenceCoverage)).toFixed(3));

        if (criticality === 'CRITICAL' && !isSatisfied) {
          criticalFailures.push({
            turn,
            phaseName: demand.functionName,
            targetProbability: targetP,
            actualProbability: Number(prob.toFixed(3)),
            redundancyCopies: copiesMatching,
            message: `CRITICAL requirement [${demand.functionName}] failed: ${prob.toFixed(3)} < target ${targetP}`,
            cardCoverage,
            manaCoverage,
            timingCoverage,
            sequenceCoverage,
            jointExecutionProbability
          });
        } else if (criticality === 'IMPORTANT' && !isSatisfied) {
          importantDeficits.push({
            turn,
            phaseName: demand.functionName,
            targetProbability: targetP,
            actualProbability: Number(prob.toFixed(3)),
            redundancyCopies: copiesMatching,
            message: `IMPORTANT requirement [${demand.functionName}] unsatisfied: ${prob.toFixed(3)} < target ${targetP}`,
            cardCoverage,
            manaCoverage,
            timingCoverage,
            sequenceCoverage,
            jointExecutionProbability
          });
        }

        phases.push({
          turn,
          phaseName: demand.functionName,
          criticality,
          targetProbability: targetP,
          actualProbability: Number(prob.toFixed(3)),
          redundancyCopies: copiesMatching,
          isSatisfied,
          status: prob >= targetP ? 'OPTIMAL' : 'DEFICIT',
          matchingCards: matchingCardNames,
          cardCoverage,
          manaCoverage,
          timingCoverage,
          sequenceCoverage,
          jointExecutionProbability
        });

        probabilityProduct *= Math.max(0.1, prob);
      }
    }

    // Evaluate Recovery Plans
    const recoveryBreakdown = [];
    for (const recPlan of gameplanContract.recoveryPlans || []) {
      let recoveryCopies = 0;
      for (const entry of nonLands) {
        const cardObj = entry.cardObj || entry.card || entry;
        const qty = Number(entry.quantity || entry.count || 1);
        const oracle = String(cardObj.oracle_text || cardObj.oracle || cardObj.text || entry.oracle_text || '').toLowerCase();

        if (recPlan.requiredFunction === 'DIRECT_DAMAGE_TO_FACE' && (oracle.includes('damage to any target') || oracle.includes('damage to target player'))) {
          recoveryCopies += qty;
        } else if (recPlan.requiredFunction === 'CARD_FLOW_RECOVERY' && (oracle.includes('draw') || oracle.includes('look at the top') || oracle.includes('exile the top'))) {
          recoveryCopies += qty;
        } else if (recPlan.requiredFunction === 'RESILIENT_THREATS' && (oracle.includes('when ~ dies') || oracle.includes('token') || oracle.includes('indestructible') || oracle.includes('surge'))) {
          recoveryCopies += qty;
        }
      }

      const recProb = this._hypergeometricAtLeastOne(deckSize, recoveryCopies, 10);
      recoveryBreakdown.push({
        trigger: recPlan.trigger,
        requiredFunction: recPlan.requiredFunction,
        availableCopies: recoveryCopies,
        recoveryProbability: Number(recProb.toFixed(3)),
        isFeasible: recoveryCopies >= recPlan.minimumCapacity
      });
    }

    let compositeScore = Number((Math.pow(probabilityProduct, 1 / Math.max(1, phases.length)) * 100).toFixed(1));
    if (criticalFailures.length > 0) {
      compositeScore = Math.min(40.0, compositeScore);
    } else if (importantDeficits.length > 0) {
      // Important demands unsatisfied prevent artificial high coverage
      compositeScore = Math.min(58.0, Number((compositeScore - (importantDeficits.length * 12)).toFixed(1)));
    }

    const isFullyCovered = criticalFailures.length === 0 && importantDeficits.length === 0 && phases.every(p => p.isSatisfied);

    return {
      phases,
      criticalFailures,
      importantDeficits,
      recoveryBreakdown,
      compositeScore,
      isFullyCovered
    };
  }

  /**
   * Exact hypergeometric P(X >= 1) given population N, successes K, sample n.
   * @private
   */
  static _hypergeometricAtLeastOne(N, K, n) {
    if (K <= 0) return 0.0;
    if (K >= N) return 1.0;
    let p0 = 1.0;
    for (let i = 0; i < n; i++) {
      p0 *= (N - K - i) / (N - i);
    }
    return Math.max(0, Math.min(1, 1 - p0));
  }
}
