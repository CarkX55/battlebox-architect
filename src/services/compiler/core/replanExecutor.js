/**
 * src/services/compiler/core/replanExecutor.js
 * 
 * ReplanExecutor: Targeted Closed-Loop Recompilation Engine v27.0.
 * 
 * Executes bounded causal re-planning when DeterministicSupremeJudge issues REPLAN directives.
 * Reopens ONLY causally affected decisions (slots, axes, copies) without altering immutable constraints.
 * 
 * INVARIANT: Never hardcodes card names; re-evaluates candidates through StateCandidateRanker.
 */

import { StateCandidateRanker } from './stateCandidateRanker.js';
import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { CardCausalContract } from './cardCausalContract.js';
import { IdentityFirewall } from './identityFirewall.js';
import { extractCanonicalCardProfile } from '../../cardIntelligenceEngine.js';

export class ReplanExecutor {
  /**
   * Derives the minimal causal scope of slots/axes to reopen based on judicial defects.
   * 
   * @param {Array<Object>} defects - List of defects from Supreme Judge
   * @param {Array<Object>} replanDirectives - Directives emitted by Supreme Judge
   * @param {Object} deckState - Current deck state
   * @returns {Object} { affectedAxes, affectedRoles, targetActions, targetDirectives }
   */
  static deriveRepairScope(defects = [], replanDirectives = [], deckState = {}) {
    const affectedRoles = new Set();
    const targetActions = [];
    const targetDirectives = [];

    for (const directive of replanDirectives) {
      targetActions.push(directive.action);
      targetDirectives.push(directive);
      if (directive.action === 'SATISFY_IMPORTANT_TURN_DEMAND' || directive.action === 'SATISFY_CRITICAL_TURN_DEMAND') {
        affectedRoles.add(`TURN_${directive.turn || 1}_DEMAND`);
        affectedRoles.add('EARLY_PLAY');
      } else if (directive.action === 'INCREASE_TRIBAL_CREATURE_DENSITY' || directive.action === 'PRIORITIZE_ON_TRIBE_CREATURES') {
        affectedRoles.add('TRIBAL_DENSITY');
        affectedRoles.add('BOARD_PRESENCE');
      } else if (directive.action === 'LOWER_CURVE_PROFILE') {
        affectedRoles.add('FINISHER');
        affectedRoles.add('CARD_FLOW');
      } else if (directive.action === 'RESOLVE_UNSUPPORTED_DEMANDS') {
        affectedRoles.add('ALL_UNMET_DEMANDS');
      } else if (directive.action === 'REBALANCE_MANA_BASE' || directive.action === 'ADJUST_DECK_SIZE') {
        affectedRoles.add('MANA_BASE');
      }
    }

    for (const defect of defects) {
      if (defect.axis === 'THESIS') {
        affectedRoles.add('TRIBAL_DENSITY');
      } else if (defect.axis === 'DEMAND_SUPPLY') {
        affectedRoles.add('ALL_UNMET_DEMANDS');
      } else if (defect.axis === 'CURVE') {
        affectedRoles.add('FINISHER');
      } else if (defect.axis === 'MANA' || defect.axis === 'ARCHITECT') {
        affectedRoles.add('MANA_BASE');
      } else if (defect.axis === 'GAMEPLAN_COVERAGE' || (defect.message && defect.message.includes('IMPORTANT Turn Demand'))) {
        affectedRoles.add('EARLY_PLAY');
      }
    }

    return {
      affectedRoles: Array.from(affectedRoles),
      targetActions,
      targetDirectives,
      directiveCount: replanDirectives.length
    };
  }

  /**
   * Recompiles the affected scope causally.
   * 
   * @param {Object} scope - Scope derived from deriveRepairScope
   * @param {Object} deckState - Current DeckState { cards: [...] }
   * @param {Object} deckIdentity - DeckIdentity IR
   * @param {Object} intentPackage - IntentPackage IR
   * @param {Array<Object>} rawCardPool - Filtered card pool
   * @param {number} iteration - Current repair iteration (1..3)
   * @returns {{ repairedDeckState: Object, repairRecord: Object }}
   */
  static recompileScope(scope, deckState, deckIdentity, intentPackage, rawCardPool = [], iteration = 1) {
    const cards = JSON.parse(JSON.stringify(deckState.cards || []));
    const changesMade = [];
    const strategicContract = {
      archetype: deckIdentity?.archetypeKey || intentPackage?.archetype || 'Midrange',
      winPath: deckIdentity?.mandatoryRoles || intentPackage?.winPath || [],
      proofObligations: deckIdentity?.requiredEngines || [],
      format: intentPackage?.format || 'MODERN',
      constraints: intentPackage?.userConstraints || {}
    };

    // 1. REPAIR: Resolve Unsupported Demands (Anti-Nombo)
    if (scope.affectedRoles.includes('ALL_UNMET_DEMANDS')) {
      for (let i = 0; i < cards.length; i++) {
        const cardObj = cards[i].card || cards[i];
        const demandAudit = DemandSupplyLedger.auditCardDemands(cardObj, { cards }, intentPackage);
        if (!demandAudit.isSatisfied) {
          const validCandidates = rawCardPool.filter(c => {
            if (c.name === cardObj.name) return false;
            const val = IdentityFirewall.validateCard(c, deckIdentity, intentPackage);
            return val.isAllowed;
          });

          const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
            { cards },
            validCandidates,
            strategicContract,
            intentPackage,
            { role: cards[i].role || 'FLEX_SLOT' }
          );

          if (rankResult.winningCandidate && rankResult.selectionStatus === 'SELECTION_SUCCESS') {
            const oldName = cardObj.name;
            const replacement = rankResult.winningCandidate;
            cards[i] = {
              ...cards[i],
              name: replacement.name,
              winnerCard: replacement.name,
              card: replacement,
              cardObj: replacement,
              cmc: Number(replacement.cmc || replacement.mana_value || 0),
              type_line: replacement.type_line || replacement.type || '',
              oracle_text: replacement.oracle_text || replacement.oracleText || '',
              rationale: `Repaired on iteration ${iteration} by ReplanExecutor to satisfy broken demands in ${oldName}`
            };
            changesMade.push(`Replaced ${oldName} with ${replacement.name} to satisfy hard demands`);
          }
        }
      }
    }

    // 2. REPAIR: Increase on-tribe creature density if THESIS violated
    if (scope.affectedRoles.includes('TRIBAL_DENSITY') && intentPackage.primaryTribe) {
      const primaryTribe = intentPackage.primaryTribe.toLowerCase();
      // Find non-creature or off-tribe cards in flex/finisher slots that can be upgraded to on-tribe creatures
      const candidatesForSwap = cards.filter(c => {
        const type = (c.type_line || (c.card && c.card.type_line) || '').toLowerCase();
        const isCreature = type.includes('creature') && !type.includes('vehicle');
        const isLand = type.includes('land') || c.role === 'Land';
        const isMatchingTribe = IdentityFirewall.isMatchingTribe(c.card || c, primaryTribe);
        return !isLand && (!isCreature || !isMatchingTribe);
      });

      const onTribeCreaturePool = rawCardPool.filter(c => {
        const type = (c.type_line || '').toLowerCase();
        return type.includes('creature') && !type.includes('vehicle') && IdentityFirewall.isMatchingTribe(c, primaryTribe);
      });

      if (onTribeCreaturePool.length > 0 && candidatesForSwap.length > 0) {
        for (const candidateSwap of candidatesForSwap.slice(0, 2)) {
          const idx = cards.findIndex(c => c.name === candidateSwap.name);
          if (idx >= 0) {
            const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
              { cards },
              onTribeCreaturePool.filter(c => !cards.some(existing => existing.name === c.name)),
              strategicContract,
              intentPackage,
              { role: 'TRIBAL_DENSITY' }
            );

            if (rankResult.winningCandidate && rankResult.selectionStatus === 'SELECTION_SUCCESS') {
              const replacement = rankResult.winningCandidate;
              const oldName = cards[idx].name;
              cards[idx] = {
                ...cards[idx],
                name: replacement.name,
                winnerCard: replacement.name,
                card: replacement,
                cardObj: replacement,
                cmc: Number(replacement.cmc || replacement.mana_value || 0),
                type_line: replacement.type_line || replacement.type || '',
                oracle_text: replacement.oracle_text || replacement.oracleText || '',
                role: 'TRIBAL_DENSITY',
                rationale: `Repaired on iteration ${iteration} by ReplanExecutor to reach on-tribe creature density [${intentPackage.primaryTribe}]`
              };
              changesMade.push(`Replaced off-tribe ${oldName} with on-tribe creature ${replacement.name}`);
            }
          }
        }
      }
    }

    // 3. REPAIR: Curve Reduction if CURVE violated
    if (scope.affectedRoles.includes('FINISHER') || scope.targetActions.includes('LOWER_CURVE_PROFILE')) {
      const highCmcCards = cards.filter(c => {
        const isLand = (c.type_line || '').toLowerCase().includes('land') || c.role === 'Land';
        return !isLand && Number(c.cmc || 0) >= 4;
      });

      const lowCmcPool = rawCardPool.filter(c => {
        const isLand = (c.type_line || '').toLowerCase().includes('land');
        return !isLand && Number(c.cmc || c.mana_value || 0) <= 2;
      });

      if (highCmcCards.length > 0 && lowCmcPool.length > 0) {
        const lowCmcReplacements = lowCmcPool.filter(c => !cards.some(existing => existing.name === c.name));

        if (lowCmcReplacements.length > 0 && highCmcCards.length > 0) {
          for (const highCard of highCmcCards.slice(0, 2)) {
            const idx = cards.findIndex(c => c.name === highCard.name);
            if (idx >= 0) {
              const replacement = lowCmcReplacements[0];
              const oldName = cards[idx].name;
              cards[idx] = {
                ...cards[idx],
                name: replacement.name,
                winnerCard: replacement.name,
                card: replacement,
                cardObj: replacement,
                cmc: Number(replacement.cmc || replacement.mana_value || 0),
                type_line: replacement.type_line || replacement.type || '',
                oracle_text: replacement.oracle_text || replacement.oracleText || '',
                role: 'LOW_CURVE_PLAY',
                rationale: `Repaired on iteration ${iteration} by ReplanExecutor to lower average CMC`
              };
              changesMade.push(`Replaced high-curve ${oldName} with low-curve ${replacement.name}`);
            }
          }
        }
      }
    }

    // 4. REPAIR: Satisfy Important & Critical Turn Demands (e.g. T1 / T2 openings)
    const hasTurnDemandDirective = scope.targetActions.includes('SATISFY_IMPORTANT_TURN_DEMAND') ||
                                   scope.targetActions.includes('SATISFY_CRITICAL_TURN_DEMAND') ||
                                   scope.affectedRoles.includes('EARLY_PLAY');

    if (hasTurnDemandDirective) {
      const turnDirectives = (scope.targetDirectives || []).filter(d => 
        d.action === 'SATISFY_IMPORTANT_TURN_DEMAND' || d.action === 'SATISFY_CRITICAL_TURN_DEMAND'
      );
      const targetTurns = turnDirectives.length > 0 ? turnDirectives.map(d => Number(d.turn || 1)) : [1];

      for (const targetTurn of targetTurns) {
        // Find candidates in current deck that can be swapped without breaking hard roles
        const swappableCards = cards.filter(c => {
          const type = (c.type_line || (c.card && c.card.type_line) || '').toLowerCase();
          const isLand = type.includes('land') || c.role === 'Land';
          const cmc = Number(c.cmc || (c.card && c.card.cmc) || 0);
          const isMandatoryEngine = c.role === 'MANDATORY_ENGINE' || c.role === 'COMMANDER';
          if (isLand || isMandatoryEngine) return false;
          if (targetTurn <= 2) {
            return cmc > targetTurn;
          } else {
            const qty = Number(c.quantity || c.count || 1);
            const oText = (c.oracle_text || c.oracleText || (c.card && (c.card.oracle_text || c.card.oracleText)) || '').toLowerCase();
            const isManaDork = oText.includes('add {') || oText.includes('mana of any color') || oText.includes('{t}: add');
            return !isManaDork && cmc < targetTurn && (qty > 1 || c.role === 'FLEX_SLOT' || c.role === 'LOW_CURVE_PLAY');
          }
        });

        const turnPool = rawCardPool.filter(c => {
          const prof = extractCanonicalCardProfile(c);
          const type = (prof.typeLine || '').toLowerCase();
          const isLand = type.includes('land');
          const matchesTurn = prof.bestTurn === targetTurn || (targetTurn === 1 ? prof.cmc <= 1 : prof.cmc === targetTurn);
          if (isLand || !matchesTurn) return false;
          const validation = IdentityFirewall.validateCard(c, deckIdentity, intentPackage);
          return validation.isAllowed;
        });

        const maxCopies = intentPackage.maxCopies || 4;
        const availableInPool = turnPool.filter(c => {
          const countInDeck = cards.reduce((sum, existing) => (existing.name === c.name ? sum + Number(existing.quantity || existing.count || 1) : sum), 0);
          return countInDeck < maxCopies;
        });

        if (availableInPool.length > 0 && swappableCards.length > 0) {
          for (const candidateSwap of swappableCards.slice(0, 2)) {
            const dynamicAvailable = turnPool.filter(c => {
              const countInDeck = cards.reduce((sum, existing) => (existing.name === c.name ? sum + Number(existing.quantity || existing.count || 1) : sum), 0);
              return countInDeck < maxCopies;
            });
            if (dynamicAvailable.length === 0) break;

            const idx = cards.findIndex(c => c.name === candidateSwap.name);
            if (idx >= 0) {
              const rankResult = StateCandidateRanker.rankCandidatesByStateDelta(
                { cards },
                dynamicAvailable,
                strategicContract,
                intentPackage,
                { role: `TURN_${targetTurn}_PLAY` }
              );
              const replacement = rankResult.winningCandidate || dynamicAvailable[0];
              const prof = extractCanonicalCardProfile(replacement);
              const oldName = cards[idx].name;

              const existingIdx = cards.findIndex(c => c.name === prof.name);
              const swapCount = Number(cards[idx].quantity || cards[idx].count || 1);

              if (swapCount > 1) {
                cards[idx].count = swapCount - 1;
                cards[idx].quantity = swapCount - 1;
                if (existingIdx >= 0) {
                  const currQty = Number(cards[existingIdx].quantity || cards[existingIdx].count || 1);
                  cards[existingIdx].count = currQty + 1;
                  cards[existingIdx].quantity = currQty + 1;
                } else {
                  cards.push({
                    name: prof.name,
                    winnerCard: prof.name,
                    card: replacement,
                    cardObj: replacement,
                    cmc: prof.cmc,
                    type_line: prof.typeLine,
                    oracle_text: prof.oracleText,
                    count: 1,
                    quantity: 1,
                    role: `TURN_${targetTurn}_PLAY`,
                    rationale: `Added on iteration ${iteration} by ReplanExecutor to satisfy T${targetTurn} demand`
                  });
                }
              } else {
                if (existingIdx >= 0) {
                  const currQty = Number(cards[existingIdx].quantity || cards[existingIdx].count || 1);
                  cards[existingIdx].count = currQty + 1;
                  cards[existingIdx].quantity = currQty + 1;
                  cards.splice(idx, 1);
                } else {
                  cards[idx] = {
                    ...cards[idx],
                    name: prof.name,
                    winnerCard: prof.name,
                    card: replacement,
                    cardObj: replacement,
                    cmc: prof.cmc,
                    type_line: prof.typeLine,
                    oracle_text: prof.oracleText,
                    count: 1,
                    quantity: 1,
                    role: `TURN_${targetTurn}_PLAY`,
                    rationale: `Repaired on iteration ${iteration} by ReplanExecutor to satisfy T${targetTurn} demand`
                  };
                }
              }
              changesMade.push(`Replaced higher-cost ${oldName} with T${targetTurn} play ${prof.name}`);
            }
          }
        }
      }
    }

    const repairedDeckState = {
      ...deckState,
      cards
    };

    const repairRecord = {
      iteration,
      reopenedRoles: scope.affectedRoles,
      targetActions: scope.targetActions,
      targetDirectives: scope.targetDirectives || [],
      changesMade,
      candidateStatus: changesMade.length > 0 ? 'EVALUATED' : 'NO_CANDIDATE_GENERATED',
      mutationAttempted: changesMade.length > 0,
      timestamp: new Date().toISOString()
    };

    return {
      repairedDeckState,
      repairRecord
    };
  }
}
