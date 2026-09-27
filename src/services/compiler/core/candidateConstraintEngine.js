import { StrategyMetricsDatabase } from './strategyMetricsDatabase.js';
import { ReasonLedger } from './reasonLedger.js';
import { IdentityFirewall } from './identityFirewall.js';
import { DemandSupplyLedger } from './demandSupplyLedger.js';
import { StateCandidateRanker } from './stateCandidateRanker.js';
import { CardCausalContract } from './cardCausalContract.js';
import { CurveExecutionAnalyzer } from './curveExecutionAnalyzer.js';
import { CardImplementer } from '../../agent/cardImplementer.js';

export class CandidateConstraintEngine {
  constructor(db = null) {
    this.metricsDb = db || new StrategyMetricsDatabase();
  }

  /**
   * Filter, rank, and select winners for every AllocationSlot in a CapabilityPlan.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage
   * @param {import('./capabilityPlan.js').CapabilityPlan} capabilityPlan
   * @param {Array<Object>} cardPool - Raw card objects from DB
   * @param {ReasonLedger|null} reasonLedger - Optional decision ledger
   * @param {import('./deckIdentityModel.js').DeckIdentity|null} deckIdentity - Optional compiled identity
   * @returns {{ filledSlots: Array<import('./capabilityPlan.js').AllocationSlot>, rejectedEvidence: Array<Object>, reasonLedger: ReasonLedger }}
   */
  processPlan(intentPackage, capabilityPlan, cardPool = [], reasonLedger = null, deckIdentity = null) {
    const ledger = reasonLedger || new ReasonLedger();
    const rejectedEvidence = [];

    // Step 1: CandidateFilter — enforce contract rules & IdentityFirewall Hard Constraints
    const { filteredPool, rejections } = this.filterCandidates(intentPackage, cardPool, deckIdentity);
    rejectedEvidence.push(...rejections);

    // Step 2 & 3: CandidateRanker & WinnerSelector for each AllocationSlot
    const usedWinnersCount = new Map();
    const filledSlots = [];

    for (const slot of capabilityPlan.slots) {
      if (slot.role === 'Land') {
        const colors = intentPackage.colors && intentPackage.colors.length > 0 ? intentPackage.colors : ['R'];
        let mainLand = 'Mountain';
        let altLands = ['Blood Crypt', 'Sacred Foundry', 'Blackcleave Cliffs', 'Inspiring Vantage'];

        if (colors.length >= 2) {
          const colorSet = new Set(colors);
          // ─── 3-COLOR SHARDS & WEDGES (Evaluated FIRST) ─────────────────────
          if (colorSet.has('G') && colorSet.has('W') && colorSet.has('U')) {
            // Bant (G/W/U)
            mainLand = "Spara's Headquarters // Hedge Maze // Lush Portico // Plains // Island // Forest";
            altLands = ['Razorverge Thicket', 'Botanical Sanctum', 'Seachrome Coast', 'Brushland', 'Yavimaya Coast', 'Adarkar Wastes'];
          } else if (colorSet.has('W') && colorSet.has('U') && colorSet.has('B')) {
            // Esper (W/U/B)
            mainLand = "Raffine's Tower // Undercity Sewers // Shadowy Backstreet // Plains // Island // Swamp";
            altLands = ['Darkslick Shores', 'Caves of Koilos', 'Seachrome Coast', 'Underground River', 'Adarkar Wastes', 'Concealed Courtyard'];
          } else if (colorSet.has('U') && colorSet.has('B') && colorSet.has('R')) {
            // Grixis (U/B/R)
            mainLand = "Xander's Lounge // Thundering Falls // Raucous Theater // Island // Swamp // Mountain";
            altLands = ['Darkslick Shores', 'Blackcleave Cliffs', 'Spirebluff Canal', 'Underground River', 'Sulfurous Springs', 'Shivan Reef'];
          } else if (colorSet.has('B') && colorSet.has('R') && colorSet.has('G')) {
            // Jund (B/R/G)
            mainLand = "Ziatora's Proving Ground // Commercial District // Raucous Theater // Swamp // Mountain // Forest";
            altLands = ['Copperline Gorge', 'Blackcleave Cliffs', 'Llanowar Wastes', 'Karplusan Forest', 'Sulfurous Springs', 'Blooming Marsh'];
          } else if (colorSet.has('R') && colorSet.has('G') && colorSet.has('W')) {
            // Naya (R/G/W)
            mainLand = "Jetmir's Garden // Commercial District // Elegant Parlor // Mountain // Forest // Plains";
            altLands = ['Copperline Gorge', 'Inspiring Vantage', 'Razorverge Thicket', 'Karplusan Forest', 'Battlefield Forge', 'Brushland'];
          } else if (colorSet.has('W') && colorSet.has('B') && colorSet.has('G')) {
            // Abzan (W/B/G)
            mainLand = "Indatha Triome // Shadowy Backstreet // Lush Portico // Plains // Swamp // Forest";
            altLands = ['Caves of Koilos', 'Llanowar Wastes', 'Razorverge Thicket', 'Concealed Courtyard', 'Blooming Marsh', 'Brushland'];
          } else if (colorSet.has('U') && colorSet.has('R') && colorSet.has('W')) {
            // Jeskai (U/R/W)
            mainLand = "Raugrin Triome // Thundering Falls // Elegant Parlor // Island // Mountain // Plains";
            altLands = ['Inspiring Vantage', 'Spirebluff Canal', 'Seachrome Coast', 'Battlefield Forge', 'Shivan Reef', 'Adarkar Wastes'];
          } else if (colorSet.has('B') && colorSet.has('G') && colorSet.has('U')) {
            // Sultai (B/G/U)
            mainLand = "Zagoth Triome // Underground Mortuary // Undercity Sewers // Swamp // Forest // Island";
            altLands = ['Darkslick Shores', 'Botanical Sanctum', 'Llanowar Wastes', 'Underground River', 'Yavimaya Coast', 'Blooming Marsh'];
          } else if (colorSet.has('R') && colorSet.has('W') && colorSet.has('B')) {
            // Mardu (R/W/B)
            mainLand = "Savai Triome // Elegant Parlor // Raucous Theater // Mountain // Plains // Swamp";
            altLands = ['Inspiring Vantage', 'Blackcleave Cliffs', 'Caves of Koilos', 'Battlefield Forge', 'Sulfurous Springs', 'Concealed Courtyard'];
          } else if (colorSet.has('G') && colorSet.has('U') && colorSet.has('R')) {
            // Temur (G/U/R)
            mainLand = "Ketria Triome // Hedge Maze // Thundering Falls // Forest // Island // Mountain";
            altLands = ['Copperline Gorge', 'Spirebluff Canal', 'Botanical Sanctum', 'Karplusan Forest', 'Shivan Reef', 'Yavimaya Coast'];
          }
          // ─── 2-COLOR GUILDS ────────────────────────────────────────────────
          else if (colorSet.has('B') && colorSet.has('R')) {
            mainLand = 'Blackcleave Cliffs // Sulfurous Springs // Raucous Theater // Mountain // Swamp';
            altLands = ['Blood Crypt', 'Swamp', 'Mountain'];
          } else if (colorSet.has('R') && colorSet.has('W')) {
            mainLand = 'Inspiring Vantage // Battlefield Forge // Elegant Parlor // Mountain // Plains';
            altLands = ['Sacred Foundry', 'Plains', 'Mountain'];
          } else if (colorSet.has('G') && colorSet.has('R')) {
            mainLand = 'Copperline Gorge // Karplusan Forest // Commercial District // Mountain // Forest';
            altLands = ['Stomping Ground', 'Forest', 'Mountain'];
          } else if (colorSet.has('U') && colorSet.has('R')) {
            mainLand = 'Spirebluff Canal // Shivan Reef // Thundering Falls // Mountain // Island';
            altLands = ['Steam Vents', 'Island', 'Mountain'];
          } else if (colorSet.has('G') && colorSet.has('W')) {
            mainLand = 'Razorverge Thicket // Brushland // Lush Portico // Forest // Plains';
            altLands = ['Temple Garden', 'Plains', 'Forest'];
          } else if (colorSet.has('U') && colorSet.has('B')) {
            mainLand = 'Darkslick Shores // Underground River // Undercity Sewers // Swamp // Island';
            altLands = ['Watery Grave', 'Island', 'Swamp'];
          } else if (colorSet.has('W') && colorSet.has('U')) {
            mainLand = 'Seachrome Coast // Adarkar Wastes // Meticulous Archive // Plains // Island';
            altLands = ['Hallowed Fountain', 'Island', 'Plains'];
          } else if (colorSet.has('W') && colorSet.has('B')) {
            mainLand = 'Caves of Koilos // Concealed Courtyard // Shadowy Backstreet // Plains // Swamp';
            altLands = ['Godless Shrine', 'Swamp', 'Plains'];
          } else if (colorSet.has('G') && colorSet.has('U')) {
            mainLand = 'Botanical Sanctum // Yavimaya Coast // Hedge Maze // Forest // Island';
            altLands = ['Breeding Pool', 'Island', 'Forest'];
          } else if (colorSet.has('B') && colorSet.has('G')) {
            mainLand = 'Llanowar Wastes // Blooming Marsh // Underground Mortuary // Swamp // Forest';
            altLands = ['Overgrown Tomb', 'Forest', 'Swamp'];
          } else {
            mainLand = `${colors.join('/')} Optimized Dual Lands & Basics`;
            altLands = ['Fast Lands', 'Pain Lands', 'Shock Lands', 'Triomes'];
          }
        } else {
          if (colors.includes('U')) {
            mainLand = 'Island';
            altLands = ['Misty Rainforest', 'Scalding Tarn'];
          } else if (colors.includes('R')) {
            mainLand = 'Mountain';
            altLands = ['Wooded Foothills', 'Stomping Ground'];
          } else if (colors.includes('W')) {
            mainLand = 'Plains';
            altLands = ['Windswept Heath', 'Temple Garden'];
          } else if (colors.includes('B')) {
            mainLand = 'Swamp';
            altLands = ['Bloodstained Mire', 'Overgrown Tomb'];
          } else if (colors.includes('G')) {
            mainLand = 'Forest';
            altLands = ['Windswept Heath', 'Temple Garden'];
          }
        }

        const slotFilled = slot.withFilledData({
          winnerCard: mainLand,
          alternatives: altLands,
          confidenceScore: 1.0,
          allocationReason: `Mana base allocation (${mainLand}) matching deck color identity [${colors.join('/')}]`
        });
        filledSlots.push(slotFilled);
        ledger.recordEntry({
          step: 'LAND_ALLOCATION',
          slotId: slot.slotId,
          role: slot.role,
          winnerCard: mainLand,
          winnerScore: 100,
          alternatives: altLands,
          reason: `Mana base allocation (${mainLand}) matching deck color identity [${colors.join('/')}]`
        });
        continue;
      }

      // Step 2: Rank filtered candidates for this specific slot role via StateCandidateRanker
      const rankedCandidates = this.rankCandidatesForSlot(slot, filteredPool, intentPackage, deckIdentity, filledSlots);

      // Step 3: Select Winner with live Deck State Demand Audit
      const selected = this.selectWinnerForSlot(slot, rankedCandidates, usedWinnersCount, intentPackage, filledSlots, deckIdentity, filteredPool);

      if (selected.winnerCard) {
        const currentQty = usedWinnersCount.get(selected.winnerCard) || 0;
        usedWinnersCount.set(selected.winnerCard, currentQty + slot.requiredDensity);
      }

      const slotFilled = slot.withFilledData(selected);
      filledSlots.push(slotFilled);

      ledger.recordEntry({
        step: 'WINNER_SELECTION',
        slotId: slot.slotId,
        role: slot.role,
        winnerCard: selected.winnerCard,
        winnerScore: selected.confidenceScore * 100,
        alternatives: selected.alternatives,
        rejectedCandidates: rejections.map(r => r.cardName),
        reason: selected.allocationReason
      });
    }

    return {
      filledSlots: Object.freeze(filledSlots),
      rejectedEvidence: Object.freeze(rejectedEvidence),
      reasonLedger: ledger
    };
  }

  /**
   * CandidateFilter: Filters candidate card pool against IntentPackage & IdentityFirewall contracts.
   */
  filterCandidates(intentPackage, cardPool = [], deckIdentity = null) {
    const allowedColors = new Set(intentPackage.colors || ['R']);
    const budget = intentPackage.budget || 'Unlimited';
    const filteredPool = [];
    const rejections = [];

    for (const card of cardPool) {
      const cardName = card.name || 'Unknown';
      const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
      let typeLine = (card.type_line || card.typeLine || '').toLowerCase();
      let cardColors = card.colors || [];
      if (faces.length > 0) {
        if (!typeLine) {
          typeLine = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
        }
        if (cardColors.length === 0) {
          const faceColors = new Set();
          faces.forEach(f => (f.colors || []).forEach(c => faceColors.add(c)));
          if (faceColors.size > 0) {
            cardColors = Array.from(faceColors);
          } else if (Array.isArray(card.color_identity)) {
            cardColors = card.color_identity;
          }
        }
      }

      // Budget filter check
      if (budget === 'Budget-Strict' && (card.priceUSD || 0) > 10.0) {
        rejections.push({
          cardName,
          reason: `Card price $${card.priceUSD} exceeds Budget-Strict threshold`,
          rule: 'BUDGET_CONTRACT',
          confidence: 1.0
        });
        continue;
      }

      // Color filter
      const isColorValid = cardColors.length === 0 || allowedColors.has('C') || cardColors.every(c => allowedColors.has(c.toUpperCase()));
      if (!isColorValid) {
        rejections.push({
          cardName,
          reason: `Card colors [${cardColors.join(',')}] not allowed in [${(intentPackage.colors || []).join(',')}]`,
          rule: 'COLOR_IDENTITY_CONTRACT',
          confidence: 1.0
        });
        continue;
      }

      // MustNot filter
      const cardNameLower = cardName.toLowerCase();
      let forbiddenRule = null;
      const mustNotRules = Array.isArray(intentPackage?.mustNotRules) ? intentPackage.mustNotRules : [];
      for (const rule of mustNotRules) {
        const rLower = rule.toLowerCase();
        if (cardNameLower.includes(rLower) || typeLine.includes(rLower)) {
          forbiddenRule = rule;
          break;
        }
      }

      if (forbiddenRule) {
        rejections.push({
          cardName,
          reason: `Forbidden by intent rule "${forbiddenRule}"`,
          rule: 'FORBIDDEN_MECHANIC_CONTRACT',
          confidence: 1.0
        });
        continue;
      }

      // IdentityFirewall Hard Constraint Veto Check
      const firewallCheck = IdentityFirewall.validateCard(card, deckIdentity, intentPackage);
      if (!firewallCheck.isAllowed) {
        rejections.push({
          cardName,
          reason: firewallCheck.vetoReason,
          rule: 'IDENTITY_FIREWALL_HARD_CONSTRAINT',
          confidence: 1.0
        });
        continue;
      }

      // Causal Demand-Supply Ledger Audit: Reject cards with unfulfillable HARD demands
      const demandAudit = DemandSupplyLedger.auditCardDemands(card, { cards: [] }, intentPackage);
      if (!demandAudit.isSatisfied) {
        rejections.push({
          cardName,
          reason: demandAudit.failureReasons.join('; '),
          rule: 'UNFULFILLED_HARD_DEMAND',
          confidence: 1.0
        });
        continue;
      }

      filteredPool.push(card);
    }

    return { filteredPool, rejections };
  }

  /**
   * CandidateRanker (v26.0 Authority Convergence):
   * Evaluates candidates for a slot via StateCandidateRanker and DeltaState dominance.
   * Zero arbitrary heuristic point bonuses (+85, -500).
   */
  rankCandidatesForSlot(slot, filteredPool, intentPackage = {}, deckIdentity = null, filledSlots = []) {
    const role = (slot.role || '').toLowerCase();
    const currentDeckState = {
      cards: (filledSlots || []).map(s => ({ card: s.winnerCardObj || { name: s.winnerCard }, count: s.requiredDensity || 4 }))
    };

    const winPath = deckIdentity?.mandatoryRoles || intentPackage?.winPath || [slot.role];
    const proofObligations = deckIdentity?.requiredEngines || [slot.role];

    const strategicContract = {
      archetype: deckIdentity?.archetypeKey || intentPackage?.archetype || 'Aggro',
      winPath,
      proofObligations,
      format: intentPackage?.format || 'MODERN',
      constraints: intentPackage?.userConstraints || {}
    };

    const evaluated = filteredPool.map(card => {
      const contract = CardCausalContract.parse(card);
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();

      // Basic hard filter for non-land spell slot
      if (role !== 'land' && typeLine.includes('land') && !typeLine.includes('creature')) {
        return {
          card,
          score: -5000,
          dominanceVector: {
            netUtility: -100,
            isDominated: true,
            hasUnsupportedDemands: true,
            roleValidity: false,
            roleQuality: 0,
            stateDeltaScore: -100,
            synergyScore: 0
          },
          stateDelta: null,
          evidenceTags: ['INVALID_LAND_IN_SPELL_SLOT']
        };
      }

      // Strict creature requirement for TRIBAL_DENSITY slot
      if ((role === 'tribal_density' || role.includes('tribal')) && (!typeLine.includes('creature') || typeLine.includes('vehicle'))) {
        return {
          card,
          score: -5000,
          dominanceVector: {
            netUtility: -100,
            isDominated: true,
            hasUnsupportedDemands: true,
            roleValidity: false,
            roleQuality: 0,
            stateDeltaScore: -100,
            synergyScore: 0
          },
          stateDelta: null,
          evidenceTags: ['NON_CREATURE_IN_TRIBAL_DENSITY']
        };
      }

      // Check role compatibility
      const compat = contract ? CardCausalContract.isCausallyCompatibleWithRole(contract, slot.role, intentPackage) : { isCompatible: true };
      
      const stateDelta = StateCandidateRanker.computeStateDelta(currentDeckState, card, strategicContract, intentPackage, slot);
      const dominanceVector = StateCandidateRanker.computeDominanceVector(stateDelta);

      if (!compat.isCompatible) {
        dominanceVector.netUtility -= 10.0;
        dominanceVector.hasUnsupportedDemands = true;
      }

      // Extract evidence tags for explainability
      const evidenceTags = [];
      if (contract) {
        contract.supplies.forEach(s => evidenceTags.push(s.capability));
        contract.demands.forEach(d => evidenceTags.push(`DEMANDS_${d.resource}`));
      }

      const score = Math.round(dominanceVector.netUtility * 100);

      return {
        card,
        score,
        stateDelta,
        dominanceVector,
        evidenceTags
      };
    });

    // Sort deterministically by StateCandidateRanker dominance vectors
    evaluated.sort((a, b) => StateCandidateRanker.compareDominanceVectors(b.dominanceVector, a.dominanceVector));

    return evaluated;
  }

  /**
   * WinnerSelector: Selects the winning card and top alternatives for a slot.
   */
  selectWinnerForSlot(slot, rankedCandidates, usedWinnersCount, intentPackage, filledSlots = [], deckIdentity = null, filteredPool = []) {
    const format = (intentPackage.format || 'MODERN').toUpperCase();
    const maxPlayset = format === 'COMMANDER' ? 1 : 4;

    const currentDeckState = {
      cards: filledSlots.map(s => ({ card: s.winnerCardObj || { name: s.winnerCard }, count: s.requiredDensity || 4 }))
    };

    for (const item of rankedCandidates) {
      const cardName = item.card.name;
      const currentQty = usedWinnersCount.get(cardName) || 0;

      // Skip candidates that failed the role proof obligation
      if (item.dominanceVector && item.dominanceVector.roleValidity === false) {
        continue;
      }

      // 1. Verify multi-dimensional marginal state gain & operational dependencies via CurveExecutionAnalyzer
      const execVector = CurveExecutionAnalyzer.evaluateMarginalAddition(currentDeckState, item.card, intentPackage, slot);
      if (!execVector.isAccepted) {
        continue; // Skip candidates that produce negative marginal state gain or fail hard dependencies
      }

      // Ensure distinct winner cards across packages to prevent fractional split violations
      if (currentQty === 0 && slot.requiredDensity <= maxPlayset) {
        const isLegendary = (item.card.type_line || item.card.type || '').includes('Legendary');
        const cardRoot = StateCandidateRanker.extractCharacterRoot(cardName);

        // Check if another printing of this same legendary character is already chosen
        const hasLegendaryCollision = isLegendary && Array.from(usedWinnersCount.keys()).some(
          used => StateCandidateRanker.extractCharacterRoot(used) === cardRoot && used !== cardName
        );

        if (hasLegendaryCollision) {
          const nonCollidingAlt = rankedCandidates.find(c => {
            const altName = c.card.name;
            const altRoot = StateCandidateRanker.extractCharacterRoot(altName);
            const altIsLegendary = (c.card.type_line || c.card.type || '').includes('Legendary');
            const altCollides = altIsLegendary && Array.from(usedWinnersCount.keys()).some(
              used => StateCandidateRanker.extractCharacterRoot(used) === altRoot
            );
            return !usedWinnersCount.has(altName) && !altCollides && c.dominanceVector?.roleValidity !== false;
          });

          if (nonCollidingAlt) {
            continue; // Skip this collided printing and select the non-colliding candidate
          }
        }

        const altCards = rankedCandidates
          .filter(c => c.card.name !== cardName && !usedWinnersCount.has(c.card.name) && c.dominanceVector?.roleValidity !== false)
          .slice(0, 3)
          .map(c => c.card.name);

        const confidenceScore = Math.min(1.0, Math.max(0.5, item.score / 350));
        const tribeInfo = intentPackage.primaryTribe ? ` matching ${intentPackage.primaryTribe} tribe` : '';

        return {
          winnerCard: cardName,
          winnerCardObj: item.card,
          alternatives: altCards,
          confidenceScore: Math.round(confidenceScore * 100) / 100,
          allocationReason: `Selected "${cardName}" (StateDelta: ${item.dominanceVector?.netUtility ?? item.score}) for slot [${slot.role}]${tribeInfo}`
        };
      }
    }

    // Secondary search: If slot is tribal density, search filteredPool for unused on-tribe creatures
    const slotRoleLower = (slot.role || '').toLowerCase();
    if (slotRoleLower.includes('tribal_density') || slotRoleLower.includes('tribal')) {
      const primaryTribe = intentPackage.primaryTribe || '';
      const fallbackCreature = (filteredPool || []).find(c => {
        const t = (c.type_line || c.typeLine || '').toLowerCase();
        const isCreature = t.includes('creature') && !t.includes('vehicle') && !t.includes('land');
        return isCreature && !usedWinnersCount.has(c.name) && IdentityFirewall.isMatchingTribe(c, primaryTribe);
      });

      if (fallbackCreature) {
        return {
          winnerCard: fallbackCreature.name,
          winnerCardObj: fallbackCreature,
          alternatives: [],
          confidenceScore: 0.7,
          allocationReason: `Selected on-tribe creature "${fallbackCreature.name}" for slot [${slot.role}] matching ${primaryTribe} tribe`
        };
      }
    }

    // Fallback: Search for any unused valid candidate in rankedCandidates or filteredPool
    const unusedCandidate = rankedCandidates.find(c => c.dominanceVector?.roleValidity !== false && !usedWinnersCount.has(c.card?.name || c.name)) ||
      rankedCandidates.find(c => !usedWinnersCount.has(c.card?.name || c.name));

    const unusedPoolCard = unusedCandidate?.card || (filteredPool || []).find(c => {
      const type = (c.type_line || c.typeLine || '').toLowerCase();
      return !type.includes('land') && !usedWinnersCount.has(c.name);
    });

    if (unusedPoolCard) {
      const confScore = unusedCandidate ? Math.min(1.0, Math.max(0.5, (unusedCandidate.score || 0) / 350)) : 0.6;
      return {
        winnerCard: unusedPoolCard.name,
        winnerCardObj: unusedPoolCard,
        alternatives: [],
        confidenceScore: Math.round(confScore * 100) / 100,
        allocationReason: `Marginal fallback allocation of unused candidate "${unusedPoolCard.name}" for slot [${slot.role}]`
      };
    }

    const tribeName = intentPackage.primaryTribe || (slot.origin && slot.origin.field === 'primaryTribe' ? slot.origin.value : '');
    const mechanicName = (intentPackage.mechanics && intentPackage.mechanics[0]) || '';
    const tag = tribeName ? `${tribeName} ` : (mechanicName ? `${mechanicName} ` : '');

    const validCandidate = rankedCandidates.find(c => c.dominanceVector?.roleValidity !== false);
    const fallbackName = validCandidate ? validCandidate.card.name : `[${tag}${slot.role}]`;
    const fallbackObj = validCandidate ? validCandidate.card : {
      name: fallbackName,
      type_line: tribeName ? `Creature — ${tribeName}` : 'Creature',
      oracle_text: mechanicName ? `Stomp — deal 2 damage.` : '',
      cmc: slot.role === 'TRIBAL_DENSITY' || slot.role === 'MANA_BASE' ? 4 : 2
    };

    return {
      winnerCard: fallbackName,
      winnerCardObj: fallbackObj,
      alternatives: [],
      confidenceScore: 0.5,
      allocationReason: `Fallback allocation for slot [${slot.role}]`
    };
  }
}
