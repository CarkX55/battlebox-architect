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

      // Penalize pure lands or land MDFCs in non-land spell slots
      if (role !== 'land' && typeLine.includes('land')) {
        score -= 500;
      }

      // ─── SYNERGY BOOST KEYWORDS SCORING ──────────────────────────────────
      const userBoostKws = intentPackage.userConstraints?.boostKeywords || intentPackage.boostKeywords || [];
      if (Array.isArray(userBoostKws) && userBoostKws.length > 0) {
        let kwMatches = 0;
        const cardNameLower = (card.name || '').toLowerCase();
        for (const kw of userBoostKws) {
          const kwLower = String(kw).toLowerCase().trim();
          if (!kwLower) continue;
          if (oracleText.includes(kwLower) || typeLine.includes(kwLower) || cardNameLower.includes(kwLower)) {
            kwMatches++;
          }
        }
        score += Math.min(45, kwMatches * 15);
      }

      // ─── RAMP ACCELERATION ROLE ───────────────────────────────────────────
      if (role.includes('ramp') || role.includes('acceleration') || role.includes('mana_dork')) {
        const isTapManaDork = oracleText.includes('{t}: add') ||
                              oracleText.includes('{t}: put') ||
                              oracleText.includes('search your library for a basic land') ||
                              oracleText.includes('search your library for a land card') ||
                              oracleText.includes('search your library for up to');
        const isTriggeredRamp = oracleText.includes('add {') || oracleText.includes('adds {') || oracleText.includes('create a treasure');

        if (isTapManaDork) {
          score += 70;
          if (typeLine.includes('creature')) score += 30; // Premier creature dork (Delighted Halfling, Llanowar, Fanatic of Rhonas, Kami)
          if (cmc <= 2) score += 25;
          else if (cmc === 3) score += 15;
          else score -= (cmc - 3) * 20;
        } else if (isTriggeredRamp) {
          score += 30;
          if (cmc <= 2) score += 15;
          if (typeLine.includes('vehicle')) score -= 40; // Penalize vehicles for ramp slots
        } else {
          score -= 200; // Not a ramp accelerator!
        }
      }

      // ─── COUNTER & ENGINE SYNERGY ROLE ────────────────────────────────────
      if (role.includes('counter_synergy') || role.includes('counter') || role.includes('engine')) {
        const isCounterEngine = oracleText.includes('+1/+1 counter') ||
                                oracleText.includes('double the number of') ||
                                oracleText.includes('proliferate') ||
                                oracleText.includes('counters on');
        if (isCounterEngine) {
          score += 45;
          if (typeLine.includes('enchantment') || typeLine.includes('artifact') || typeLine.includes('creature')) {
            score += 20; // Stable engine permanence (Innkeeper's Talent, Ozolith, Kami)
          }
        } else {
          score -= 150;
        }
      }

      // ─── FINISHER & HIGH CURVE PAYOFFS ────────────────────────────────────
      if (role.includes('finisher') || role.includes('high_curve') || role.includes('top_curve') || role.includes('payoff')) {
        const isThreat = typeLine.includes('creature') || oracleText.includes('enters with x') || oracleText.includes('haste');
        if (isThreat) {
          if (cmc >= 4 || oracleText.includes('enters with x') || oracleText.includes('x +1/+1')) {
            score += 45;
          } else {
            score -= (4 - cmc) * 15;
          }
        }
      }

      // ─── CURVE & TIMING STRICT ENFORCEMENT ────────────────────────────────
      // TURN1_PRESSURE / TURN1_PLAY: Must be CMC 1 (or X-cost scalable at 1)
      if (role.includes('turn1') || role.includes('turn 1') || role.includes('early_play')) {
        if (cmc === 1 || (cmc === 0 && (oracleText.includes('enters with x') || oracleText.includes('x +1/+1')))) {
          score += 40;
        } else {
          score -= (cmc - 1) * 40; // Heavy penalty for CMC > 1 in Turn 1 slot
        }
      }

      // TURN2_PRESSURE / TURN2_PLAY: Must be CMC 2
      if (role.includes('turn2') || role.includes('turn 2')) {
        if (cmc === 2) {
          score += 40;
        } else if (cmc === 1) {
          score += 15;
        } else {
          score -= (cmc - 2) * 40; // Heavy penalty for CMC >= 3 in Turn 2 slot
        }
      }

      // BOARD_PRESENCE / MID_CURVE: Optimal at CMC 3-4
      if (role.includes('board_presence') || role.includes('mid_curve')) {
        if (cmc >= 2 && cmc <= 4) {
          score += 25;
        } else if (cmc > 5) {
          score -= (cmc - 4) * 15;
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
      if (role.includes('cheap_removal') || role.includes('cheap removal') || role.includes('removal')) {
        const hasRemovalAction = oracleText.includes('destroy') ||
                                 oracleText.includes('exile target') ||
                                 oracleText.includes('deals damage to') ||
                                 oracleText.includes('deal damage to') ||
                                 oracleText.includes('deals ') ||
                                 oracleText.includes('counter target') ||
                                 oracleText.includes('fights') ||
                                 oracleText.includes('deals damage equal');

        if (hasRemovalAction) {
          score += 25;
          // Bonus for synergistic fight/bite or burn removal in creature-heavy decks
          if (oracleText.includes('deals damage equal') || oracleText.includes('fights') || oracleText.includes('bite')) {
            score += 20;
          }
          if (cmc <= 2) {
            score += 25; // Optimal cheap removal
          } else if (cmc === 3) {
            score += 10;
          } else {
            score -= (cmc - 2) * 20;
          }
        } else {
          score -= 200; // Not a removal spell!
        }
      }

      if (role.includes('flow') || role.includes('card_flow')) {
        const hasDrawAction = oracleText.includes('draw a card') ||
                              oracleText.includes('draw cards') ||
                              oracleText.includes('draws a card') ||
                              oracleText.includes('search your library') ||
                              oracleText.includes('reveal the top');
        if (hasDrawAction) {
          score += 25;
          // Synergistic draw bonus for X-spells / High-power creatures / Counters (Up the Beanstalk, Garruk's Uprising)
          if (oracleText.includes('mana value 5 or greater') || oracleText.includes('power 4 or greater') || oracleText.includes('counter')) {
            score += 30;
          }
          if (cmc <= 3) score += 15;
        }
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
