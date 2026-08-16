import { StrategyMetricsDatabase } from './strategyMetricsDatabase.js';
import { ReasonLedger } from './reasonLedger.js';
import { IdentityFirewall } from './identityFirewall.js';

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
        const colors = intentPackage.colors || ['G'];
        let mainLand = 'Forest';
        let altLands = ['Temple Garden', 'Windswept Heath'];

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

        const slotFilled = slot.withFilledData({
          winnerCard: mainLand,
          alternatives: altLands,
          confidenceScore: 1.0,
          allocationReason: `Mana base allocation (${mainLand}) matching deck color identity`
        });
        filledSlots.push(slotFilled);
        ledger.recordEntry({
          step: 'LAND_ALLOCATION',
          slotId: slot.slotId,
          role: slot.role,
          winnerCard: mainLand,
          winnerScore: 100,
          alternatives: altLands,
          reason: `Mana base allocation (${mainLand}) matching deck color identity`
        });
        continue;
      }

      // Step 2: Rank filtered candidates for this specific slot role
      const rankedCandidates = this.rankCandidatesForSlot(slot, filteredPool, intentPackage);

      // Step 3: Select Winner
      const selected = this.selectWinnerForSlot(slot, rankedCandidates, usedWinnersCount, intentPackage);

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
    const allowedColors = new Set(intentPackage.colors);
    const budget = intentPackage.budget || 'Unlimited';
    const filteredPool = [];
    const rejections = [];

    for (const card of cardPool) {
      const cardName = card.name || 'Unknown';
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
      const cardColors = card.colors || [];

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
          reason: `Card colors [${cardColors.join(',')}] not allowed in [${intentPackage.colors.join(',')}]`,
          rule: 'COLOR_IDENTITY_CONTRACT',
          confidence: 1.0
        });
        continue;
      }

      // MustNot filter
      const cardNameLower = cardName.toLowerCase();
      let forbiddenRule = null;
      for (const rule of intentPackage.mustNotRules) {
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

      filteredPool.push(card);
    }

    return { filteredPool, rejections };
  }

  /**
   * CandidateRanker: Ranks filtered cards by strategic contribution score for a slot.
   */
  rankCandidatesForSlot(slot, filteredPool, intentPackage) {
    const role = slot.role.toLowerCase();

    return filteredPool.map(card => {
      const profile = this.metricsDb.getOrExtractProfile(card);
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
      const cmc = card.cmc || card.mana_value || 0;

      let score = 0;

      // Contribution score
      score += profile.getContributionAmount(slot.role);

      // Primary tribe bonus: Must match exact normalized tribe or creature subtype
      if (intentPackage.primaryTribe) {
        const tribeLower = intentPackage.primaryTribe.toLowerCase();
        if (typeLine.includes(tribeLower)) {
          score += 25;
        }
      }

      // Hard Type Enforcement for Density & Presence Roles:
      // TRIBAL_DENSITY, BOARD_PRESENCE, TURN1_PRESSURE, TURN2_PRESSURE MUST be creatures or token creators!
      if (role.includes('tribal_density') || role.includes('board_presence') || role.includes('pressure')) {
        if (typeLine.includes('creature')) {
          score += 30;
        } else if (oracleText.includes('creature token') || oracleText.includes('token creature')) {
          score += 15;
        } else {
          // Penalize non-creature Kindred spells (Sorceries, Enchantments, Instant)
          score -= 100;
        }
      }

      // Role matching heuristics & CMC penalties for CHEAP_REMOVAL
      if (role.includes('cheap_removal') || role.includes('cheap removal')) {
        if (oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('deals ') || oracleText.includes('damage')) {
          score += 15;
        }
        if (cmc <= 2) {
          score += 20; // Optimal cheap removal
        } else if (cmc === 3) {
          score += 5;
        } else {
          // Heavy penalty for high-CMC "cheap removal" e.g. Elspeth CMC 6
          score -= (cmc - 2) * 25;
        }
      }

      if (role.includes('flow') && oracleText.includes('draw')) {
        score += 10;
        if (cmc <= 3) score += 10;
      }

      return { card, score };
    }).sort((a, b) => b.score - a.score);
  }


  /**
   * WinnerSelector: Selects the winning card and top alternatives for a slot.
   */
  selectWinnerForSlot(slot, rankedCandidates, usedWinnersCount, intentPackage) {
    const format = intentPackage.format.toUpperCase();
    const maxPlayset = format === 'COMMANDER' ? 1 : 4;

    for (const item of rankedCandidates) {
      const cardName = item.card.name;
      const currentQty = usedWinnersCount.get(cardName) || 0;

      if (currentQty + slot.requiredDensity <= maxPlayset) {
        const altCards = rankedCandidates
          .filter(c => c.card.name !== cardName)
          .slice(0, 3)
          .map(c => c.card.name);

        const confidenceScore = Math.min(1.0, Math.max(0.5, item.score / 35));
        const tribeInfo = intentPackage.primaryTribe ? ` matching ${intentPackage.primaryTribe} tribe` : '';

        return {
          winnerCard: cardName,
          winnerCardObj: item.card,
          alternatives: altCards,
          confidenceScore: Math.round(confidenceScore * 100) / 100,
          allocationReason: `Selected "${cardName}" with score ${item.score} for slot [${slot.role}]${tribeInfo}`
        };
      }
    }

    // Fallback if no unused card available
    const tribeName = intentPackage.primaryTribe || (slot.origin && slot.origin.field === 'primaryTribe' ? slot.origin.value : '');
    const mechanicName = (intentPackage.mechanics && intentPackage.mechanics[0]) || '';
    const tag = tribeName ? `${tribeName} ` : (mechanicName ? `${mechanicName} ` : '');

    const fallbackName = rankedCandidates[0] ? rankedCandidates[0].card.name : `[${tag}${slot.role}]`;
    const fallbackObj = rankedCandidates[0] ? rankedCandidates[0].card : {
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
