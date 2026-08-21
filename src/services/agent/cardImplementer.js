/**
 * CARD IMPLEMENTER — THE HANDS (Sprint 6 Agentic System Core)
 * 
 * Translates qualitative strategic requests from LLMStrategist into hyper-strict
 * database queries against the MTG card pool.
 * 
 * Hyper-Strict Invariants:
 * - `CHEAP_REMOVAL` MUST return Instant/Sorcery spells with CMC <= 2 (NO creatures, NO 6-CMC planeswalkers).
 * - `TRIBAL_THREAT` / `TRIBAL_DENSITY` MUST return actual Creature cards matching the target tribe.
 * - `CARD_FLOW` MUST return cards with draw/impulse mechanics.
 * - Color identity MUST be a subset of intent colors.
 */

import { isCardLegalForBattleBox } from '../../utils/legalityCheck.js';

export class CardImplementer {
  /**
   * Filter and retrieve 3-5 hyper-specific candidate cards matching LLM strategic request
   * 
   * @param {Object} strategicNeedRequest
   * @param {Array<Object>} cardPool - Raw Scryfall/MTG DB card pool
   * @param {Object} intentPackage
   * @param {Map<string, number>} currentDeckCopies - Map of cardName -> current count in deck
   * @returns {{ candidates: Array<Object>, totalMatched: number, filterDescription: string }}
   */
  static findCandidates(strategicNeedRequest = {}, cardPool = [], intentPackage = {}, currentDeckCopies = new Map()) {
    const need = (strategicNeedRequest.need || 'FLEX').toUpperCase();
    const cmcMax = strategicNeedRequest.cmcMax !== undefined ? Number(strategicNeedRequest.cmcMax) : 6;
    const cmcMin = strategicNeedRequest.cmcMin !== undefined ? Number(strategicNeedRequest.cmcMin) : 0;
    const rawColors = Array.from(strategicNeedRequest.targetColors || intentPackage.colors || ['B', 'R']);
    const targetColors = new Set(rawColors.map(c => typeof c === 'string' ? c.toUpperCase() : String(c)));

    const constraints = intentPackage.userConstraints || {};
    const targetTribe = (strategicNeedRequest.targetTribe || intentPackage.primaryTribe || '').toLowerCase();
    const isSingleton = Boolean(constraints.singleton || intentPackage.format === 'COMMANDER');
    const maxCopies = isSingleton ? 1 : Number(constraints.maxCopies || 4);

    // Hard Constraint Collections from UI
    const vetoedNames = new Set([
      ...(constraints.customBanlist || []),
      ...(constraints.vetoedCards || []),
      ...(constraints.excludedCards || []),
      ...(intentPackage.mustNotRules || [])
    ].map(n => typeof n === 'string' ? n.toLowerCase() : ''));

    const vetoedMechanics = [
      ...(constraints.excludedMechanics || []),
      ...(constraints.vetoedKeywords || [])
    ].map(m => typeof m === 'string' ? m.toLowerCase() : '');

    const rarityMode = (constraints.rarityMode || intentPackage.rarityMode || 'high-power').toLowerCase();
    let allowedRarities = (constraints.allowedRarities || []).map(r => String(r).toLowerCase());
    if (allowedRarities.length === 0) {
      if (rarityMode === 'pauper') allowedRarities = ['common'];
      else if (rarityMode === 'artisan') allowedRarities = ['common', 'uncommon'];
      else if (rarityMode === 'standard') allowedRarities = ['common', 'uncommon', 'rare'];
      else allowedRarities = ['common', 'uncommon', 'rare', 'mythic'];
    }

    const genPriority = (constraints.generationPriority || intentPackage.generationPriority || 'balanced').toLowerCase();

    const maxBudgetRaw = constraints.maxBudget || intentPackage.budget;
    let maxBudgetNum = null;
    if (maxBudgetRaw && typeof maxBudgetRaw === 'string' && maxBudgetRaw.toLowerCase() !== 'unlimited') {
      const parsed = parseFloat(maxBudgetRaw.replace(/[^0-9.]/g, ''));
      if (!isNaN(parsed) && parsed > 0) maxBudgetNum = parsed;
    } else if (typeof maxBudgetRaw === 'number') {
      maxBudgetNum = maxBudgetRaw;
    }

    const matchedCandidates = [];
    const filterDescription = `Need: [${need}], Colors: [${Array.from(targetColors).join(',')}], CMC: [${cmcMin}-${cmcMax}], Tribe: [${targetTribe || 'None'}], RarityMode: [${rarityMode}], GenPriority: [${genPriority}]`;


    for (const card of cardPool) {
      // 0. Canonical Card Identity Invariant (Hard Epistemological Gate)
      // Reject any candidate lacking a valid Scryfall/MTG DB name or type_line
      if (!card.name || (!card.type_line && !card.typeLine)) continue;
      
      const cardName = card.name;
      const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();

      // Exclude lands from non-land spell/threat/finisher passes
      if (typeLine.includes('land') && need !== 'LAND' && need !== 'MANA_BASE') continue;

      // Format Legality, Custom Cards & Playtest Filter (Hard Invariant)
      const format = intentPackage.format || 'MODERN';
      const allowCustom = Boolean(constraints.allowCustomCards);
      if (!isCardLegalForBattleBox(card, format, allowCustom)) continue;

      const cmc = card.cmc || card.mana_value || 0;
      const cardColors = (card.colors || []).map(c => c.toUpperCase());
      const cardPrice = Number(card.priceUSD || card.price_usd || card.price || 0);
      const cardRarity = (card.rarity || '').toLowerCase();

      // 1. Playset availability check
      const currentCopies = currentDeckCopies.get(cardName) || 0;
      if (currentCopies >= maxCopies) continue;

      // 2. Color Identity Invariant (Strict MTG Rules: No off-color mana pips in primary face, adventure face, or oracle text!)
      const cardColorId = (card.color_identity || card.colorIdentity || card.colors || []).map(c => c.toUpperCase());
      const isColorIdValid = cardColorId.length === 0 || cardColorId.every(c => targetColors.has(c));
      if (!isColorIdValid) continue;

      // Check mana_cost & oracle_text for forbidden color pips
      const manaCostUpper = (card.mana_cost || card.manaCost || '').toUpperCase();
      const oracleUpper = (card.oracle_text || card.oracleText || card.text || '').toUpperCase();
      const allColors = ['R', 'G', 'W', 'U', 'B'];
      const forbiddenColors = allColors.filter(c => !targetColors.has(c));

      let hasForbiddenPip = false;
      for (const forbidden of forbiddenColors) {
        if (manaCostUpper.includes(`{${forbidden}}`) || manaCostUpper.includes(`/${forbidden}`) || manaCostUpper.includes(`${forbidden}/`)) {
          hasForbiddenPip = true;
          break;
        }
        // Check for off-color activated abilities or adventure costs in oracle text (e.g. "{G}:", "{1}{G}")
        if (oracleUpper.includes(`{${forbidden}}`) || oracleUpper.includes(`{${forbidden}/`) || oracleUpper.includes(`/${forbidden}}`)) {
          hasForbiddenPip = true;
          break;
        }
      }
      if (hasForbiddenPip) continue;

      // 3. CMC Filter
      if (cmc < cmcMin || cmc > cmcMax) continue;

      // 4. Vetoed Cards / Custom Banlist Filter (Hard Constraint)
      if (vetoedNames.has(cardName.toLowerCase())) continue;

      // 5. Excluded Mechanics & Keywords Filter (Hard Constraint)
      if (vetoedMechanics.some(mech => mech && (oracleText.includes(mech) || typeLine.includes(mech)))) continue;

      // 6. Max Budget Filter (Hard Constraint)
      if (maxBudgetNum !== null && cardPrice > maxBudgetNum) continue;

      // 7. Allowed Rarities Filter (Hard Constraint)
      if (allowedRarities.length > 0 && cardRarity && !allowedRarities.includes(cardRarity)) continue;

      // 4b. Need Contract Gate: Forbidden Patterns Enforcement
      const forbiddenPatterns = strategicNeedRequest.forbiddenPatterns || [];
      const cleanOracleText = (card.oracle_text || card.oracleText || card.text || '').replace(/\([^)]*\)/g, '').toLowerCase();
      
      let violatesForbidden = false;
      if (forbiddenPatterns.includes('PURE_COMBAT_TRICK') || forbiddenPatterns.includes('NON_PERMANENT')) {
        const isCombatTrickOnly = typeLine.includes('instant') && (cleanOracleText.includes('untap all') || cleanOracleText.includes('additional combat') || cleanOracleText.includes('creatures you control get +'));
        if (isCombatTrickOnly && !typeLine.includes('creature')) {
          violatesForbidden = true;
        }
      }
      if (forbiddenPatterns.includes('REQUIRES_T2_MANA') && cmc >= 2 && strategicNeedRequest.need === 'T1_PRESSURE') {
        violatesForbidden = true;
      }

      if (violatesForbidden) continue;

      let score = 0;
      const cardNameLower = cardName.toLowerCase();
      let passesRoleRequirement = false;

      // 5. Role-Specific Hyper-Strict Filters
      // 5. Role-Specific Hyper-Strict Filters (NEED-FIRST Contract Enforcement)
      switch (need) {
        case 'T1_PRESSURE':
          // Invariant: MUST be CMC <= 1 and provide permanent board presence (Creature or Token Generator)
          if (cmc <= 1 && (typeLine.includes('creature') || oracleText.includes('create '))) {
            const forbiddenPatterns = strategicNeedRequest.forbiddenPatterns || ['REQUIRES_T2_MANA', 'PURE_COMBAT_TRICK', 'NON_PERMANENT'];
            const isPureTrick = typeLine.includes('instant') && !typeLine.includes('creature');
            if (!isPureTrick) {
              passesRoleRequirement = true;
              score += 60;
            }
          }
          break;

        case 'T2_PRESSURE':
          if (cmc === 2 && (typeLine.includes('creature') || oracleText.includes('create '))) {
            passesRoleRequirement = true;
            score += 50;
          }
          break;

        case 'CHEAP_REMOVAL':
        case 'REMOVAL':
          // Invariant: MUST be Instant, Sorcery, Artifact or Enchantment that explicitly removes/damages opponent targets
          if (typeLine.includes('instant') || typeLine.includes('sorcery') || typeLine.includes('artifact') || typeLine.includes('enchantment')) {
            const possessesRemovalCapability = cleanOracleText.includes('destroy target') || 
                                               cleanOracleText.includes('exile target') || 
                                               cleanOracleText.includes('destroy all') || 
                                               cleanOracleText.includes('exile all') || 
                                               cleanOracleText.includes('destroy each') || 
                                               cleanOracleText.includes('exile each') || 
                                               cleanOracleText.includes('deals ') && (cleanOracleText.includes('target creature') || cleanOracleText.includes('any target') || cleanOracleText.includes('target opponent')) || 
                                               cleanOracleText.includes('counter target') || 
                                               cleanOracleText.includes('fights target') || 
                                               cleanOracleText.includes('-x/-x') || 
                                               cleanOracleText.includes('-5/-5') || 
                                               cleanOracleText.includes('-2/-2') || 
                                               cleanOracleText.includes('-3/-3') || 
                                               cleanOracleText.includes('-4/-4') || 
                                               cleanOracleText.includes('target player discards') ||
                                               cleanOracleText.includes('target opponent discards') ||
                                               cleanOracleText.includes('sacrifices a creature') ||
                                               cleanOracleText.includes('sacrifice a creature');

            // Combat tricks or phase-based mass attack buffs like "Great Train Heist" fail removal
            const isCombatTrickOnly = cleanOracleText.includes('untap all') || cleanOracleText.includes('additional combat') || cleanOracleText.includes('creatures you control get +');

            if (possessesRemovalCapability && !isCombatTrickOnly) {
              passesRoleRequirement = true;
              score += cmc <= 2 ? 50 : 20;
            }
          }
          break;

        case 'TRIBAL_DENSITY':
        case 'TRIBAL_THREAT':
          // Invariant: Creature or Token Generator matching target tribe
          if (typeLine.includes('creature') || oracleText.includes('create token') || oracleText.includes('create a')) {
            const rawTribe = (strategicNeedRequest.targetTribe || intentPackage.primaryTribe || intentPackage.tribe || '').toLowerCase();
            const isTribeMatch = CardImplementer.matchesTribe(card, rawTribe);
            if (isTribeMatch) {
              passesRoleRequirement = true;
              score += 60;
            }
          }
          break;

        case 'EARLY_RAMP':
        case 'RAMP':
          if (oracleText.includes('add {') || oracleText.includes('search your library for a land') || oracleText.includes('target land produces') || oracleText.includes('additional land') || oracleText.includes('play an additional land') || oracleText.includes('put a land') || (typeLine.includes('creature') && (oracleText.includes('untap target land') || oracleText.includes('untap target permanent')))) {
            passesRoleRequirement = true;
            score += cmc <= 2 ? 30 : 10;
          }
          break;

        case 'CARD_FLOW':
        case 'CARD_DRAW':
          if (oracleText.includes('draw a card') || oracleText.includes('draw cards') || oracleText.includes('draw two') || oracleText.includes('draw 2') || oracleText.includes('draw three') || oracleText.includes('investigate') || oracleText.includes('exile the top') || oracleText.includes('look at the top')) {
            passesRoleRequirement = true;
            score += cmc <= 3 ? 25 : 10;
          }
          break;

        case 'EARLY_INTERACTION':
        case 'DISRUPTION':
          if (typeLine.includes('instant') || typeLine.includes('sorcery') || oracleText.includes('flash')) {
            const isDisruption = cleanOracleText.includes('counter target') || 
                                 cleanOracleText.includes('return target') || 
                                 cleanOracleText.includes('destroy target') || 
                                 cleanOracleText.includes('exile target') || 
                                 cleanOracleText.includes('deals ') || 
                                 cleanOracleText.includes('-x/-x') ||
                                 cleanOracleText.includes('target player discards');

            if (isDisruption) {
              passesRoleRequirement = true;
              score += cmc <= 2 ? 25 : 10;
            }
          }
          break;

        case 'FINISHER':
          if (typeLine.includes('creature') || typeLine.includes('planeswalker') || typeLine.includes('sorcery') || typeLine.includes('enchantment')) {
            const rawTribe = (strategicNeedRequest.targetTribe || intentPackage.primaryTribe || intentPackage.tribe || '').toLowerCase();
            if (rawTribe && typeLine.includes('creature')) {
              const isTribeMatch = CardImplementer.matchesTribe(card, rawTribe);
              if (!isTribeMatch) break;
            }

            passesRoleRequirement = true;
            score += cmc >= 3 ? 20 : 5;
          }
          break;

        case 'ARISTOCRATS':
        case 'SACRIFICE':
          if (oracleText.includes('sacrifice') || oracleText.includes('dies') || oracleText.includes('whenever a creature') || oracleText.includes('loses 1 life') || oracleText.includes('gain 1 life')) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        case 'REANIMATOR':
        case 'GRAVEYARD':
          if ((oracleText.includes('return') && oracleText.includes('graveyard')) || oracleText.includes('reanimate') || oracleText.includes('unburial') || oracleText.includes('persist') || oracleText.includes('mill') || oracleText.includes('surveil') || oracleText.includes('discard')) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        case 'SPELLSLINGER':
        case 'PROWESS':
          if (oracleText.includes('prowess') || oracleText.includes('magecraft') || typeLine.includes('instant') || typeLine.includes('sorcery')) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        case 'BLINK':
        case 'FLICKER':
          if ((oracleText.includes('exile') && oracleText.includes('return')) || oracleText.includes('flicker') || oracleText.includes('ephemerate')) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        case 'VOLTRON':
        case 'EQUIPMENT':
          if (typeLine.includes('equipment') || typeLine.includes('aura') || oracleText.includes('equipped') || oracleText.includes('attach')) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        case 'TOKENS':
        case 'GO_WIDE':
          if (oracleText.includes('create') && (oracleText.includes('token') || oracleText.includes('tokens'))) {
            passesRoleRequirement = true;
            score += 30;
          }
          break;

        default:
          passesRoleRequirement = true;
          score += 10;
          break;
      }

      if (passesRoleRequirement) {
        // === VECTOR 1: Rarity Mode & Tournament Power Tier Bonus (Scryfall Rank & Rarity) ===
        if (rarityMode === 'high-power' || rarityMode === 'legacy-power' || rarityMode === 'competitive') {
          if (cardRarity === 'mythic') score += 100;
          else if (cardRarity === 'rare') score += 60;
          
          // Scryfall / EDHREC rank popularity boost (resilient tournament tier proxy)
          const edhrecRank = Number(card.edhrec_rank || card.edhrecRank || 99999);
          if (edhrecRank <= 1000) score += 120;
          else if (edhrecRank <= 3000) score += 80;
          else if (edhrecRank <= 6000) score += 40;
        }

        // === VECTOR 2: Strategy Alignment Score (Keyword & Mechanic Based) ===
        const rawArch = intentPackage.archetype || intentPackage.tempo || '';
        const archetype = (typeof rawArch === 'string' ? rawArch : (rawArch?.id || rawArch?.name || '')).toLowerCase();
        const rawStrat = intentPackage.strategy || '';
        const strategy = (typeof rawStrat === 'string' ? rawStrat : (rawStrat?.id || rawStrat?.name || '')).toLowerCase();
        
        if (archetype.includes('tempo') || strategy.includes('tempo')) {
          if (typeLine.includes('instant') || oracleText.includes('flash') || oracleText.includes('counter target') || oracleText.includes('return target') || oracleText.includes('flying') || oracleText.includes('islandwalk') || oracleText.includes('prowess')) {
            score += 80;
          }
        } else if (archetype.includes('aggro') || strategy.includes('aggro') || strategy.includes('burn')) {
          if (oracleText.includes('haste') || oracleText.includes('deals ') || oracleText.includes('prowess') || cmc <= 2) {
            score += 80;
          }
        } else if (archetype.includes('control') || strategy.includes('control')) {
          if (oracleText.includes('counter target') || oracleText.includes('destroy all') || oracleText.includes('exile all') || oracleText.includes('draw') || typeLine.includes('planeswalker')) {
            score += 80;
          }
        } else if (archetype.includes('midrange') || strategy.includes('midrange')) {
          if (oracleText.includes('enters the battlefield') || oracleText.includes('draw') || oracleText.includes('destroy') || typeLine.includes('planeswalker')) {
            score += 60;
          }
        } else if (strategy.includes('aristocrat') || strategy.includes('sacrifice')) {
          if (oracleText.includes('sacrifice') || oracleText.includes('dies') || oracleText.includes('whenever a creature')) {
            score += 100;
          }
        } else if (strategy.includes('reanimat') || strategy.includes('graveyard')) {
          if ((oracleText.includes('return') && oracleText.includes('graveyard')) || oracleText.includes('mill') || oracleText.includes('unburial')) {
            score += 100;
          }
        } else if (archetype.includes('ramp') || strategy.includes('ramp') || archetype.includes('tron') || strategy.includes('tron') || strategy.includes('big mana') || (intentPackage.selectedEngineId || '').includes('tron')) {
          if (oracleText.includes('search your library for a land') || oracleText.includes('add {') || oracleText.includes('additional land') || (typeLine.includes('creature') && cmc >= 5) || oracleText.includes('trample') || typeLine.includes('planeswalker') || oracleText.includes('without paying its mana cost') || oracleText.includes('colorless')) {
            score += 100;
          }
        }

        // === VECTOR 3: Oracle Tuner & Keyword Synergy Boost ===
        const boostKeywords = constraints.boostKeywords || intentPackage.boostKeywords || [];
        const engineFlavor = (constraints.engineFlavor || intentPackage.engineFlavor || '').toLowerCase();
        const combinedText = `${cardNameLower} ${typeLine} ${oracleText}`;

        if (Array.isArray(boostKeywords) && boostKeywords.length > 0) {
          boostKeywords.forEach(kw => {
            if (kw && typeof kw === 'string' && combinedText.includes(kw.toLowerCase().trim())) {
              score += 45;
            }
          });
        }
        if (engineFlavor && combinedText.includes(engineFlavor)) {
          score += 60;
        }

        // === VECTOR 4: Tribal Synergy & Lord Multiplier ===
        if (targetTribe) {
          if (typeLine.includes(targetTribe)) score += 60;
          if (oracleText.includes(`other ${targetTribe}`) || oracleText.includes(`${targetTribe} you control`) || oracleText.includes(`creatures you control get`)) {
            score += 150; // Mass tribal lord / anthem multiplier
          }
        }

        if (genPriority === 'synergy') {
          if (oracleText.includes('whenever') || oracleText.includes('at the beginning of') || oracleText.includes('etb') || oracleText.includes('trigger') || oracleText.includes('synergy')) {
            score += 30;
          }
        } else if (genPriority === 'competitive') {
          if (card.metaPercent && card.metaPercent > 0) score += Math.min(50, card.metaPercent * 5);
          if (cmc <= 2) score += 20;
        } else if (genPriority === 'thematic') {
          const customPrompt = (constraints.customPrompt || '').toLowerCase();
          if (customPrompt && (oracleText.includes(customPrompt) || typeLine.includes(customPrompt))) {
            score += 40;
          }
        }

        // CURVE SATURATION PENALTY & CURVE GAP BOOST
        let cmc5PlusInDeck = 0;
        const deckCopiesMap = currentDeckCopies || new Map();
        for (const [existingName, qty] of deckCopiesMap.entries()) {
          const dbCard = cardPool.find(c => c.name === existingName);
          const existingCmc = dbCard ? Number(dbCard.mana_value || dbCard.cmc || 0) : 0;
          if (existingCmc >= 5) cmc5PlusInDeck += qty;
        }

        if (cmc5PlusInDeck >= 4 && cmc >= 5) {
          score -= 250; // Heavy penalty to prevent top-heavy curves
        } else if (cmc5PlusInDeck >= 4 && cmc <= 3) {
          score += 60; // Boost lower-CMC curve fillers
        }

        const retrievalProvenance = [];
        if (oracleText.includes('add {') || oracleText.includes('search your library for a land') || oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('counter')) {
          retrievalProvenance.push('CAPABILITY_RETRIEVAL');
        }
        if (targetTribe && typeLine.includes(targetTribe)) {
          retrievalProvenance.push('TRIBAL_RETRIEVAL');
        }
        if (need !== 'FLEX') {
          retrievalProvenance.push('STRATEGIC_ROLE_RETRIEVAL');
        }
        if (retrievalProvenance.length === 0) {
          retrievalProvenance.push('FORMAT_EVIDENCE');
        }

        const cardObjWithProvenance = {
          ...card,
          retrievalProvenance
        };

        matchedCandidates.push({
          card: cardObjWithProvenance,
          score,
          name: cardName,
          cmc,
          type_line: typeLine,
          oracle_text: oracleText
        });
      }
    }

    // Sort by score descending to get candidate pool of 30-50 high-recall candidates
    matchedCandidates.sort((a, b) => b.score - a.score);
    const candidatePool = matchedCandidates.slice(0, 30).map(c => c.card);

    return {
      candidates: candidatePool,
      totalMatched: matchedCandidates.length,
      filterDescription,
      provenanceMap: candidatePool.map(c => ({ name: c.name, provenance: c.retrievalProvenance }))
    };
  }

  /**
   * Universal helper to match tribal and alliance subtypes
   */
  static matchesTribe(card, rawTribe) {
    if (!rawTribe) return true;
    const tribeLower = (rawTribe || '').toLowerCase();
    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const oracleText = (card.oracle_text || card.oracleText || card.text || '').toLowerCase();

    const GUILD_FACTIONS = new Set([
      'boros_guild', 'golgari_guild', 'dimir_guild', 'rakdos_guild', 'azorius_guild',
      'gruul_guild', 'selesnya_guild', 'orzhov_guild', 'izzet_guild', 'simic_guild',
      'esper_shard', 'jund_shard', 'naya_shard', 'jeskai_shard', 'sultai_shard',
      'boros', 'golgari', 'dimir', 'rakdos', 'azorius',
      'gruul', 'selesnya', 'orzhov', 'izzet', 'simic',
      'esper', 'grixis', 'jund', 'naya', 'bant',
      'abzan', 'jeskai', 'sultai', 'mardu', 'temur',
      'none', 'ninguna', 'general', 'null', 'universal'
    ]);
    if (GUILD_FACTIONS.has(tribeLower) || tribeLower.includes('_guild') || tribeLower.includes('_shard')) {
      return true;
    }

    let targetSubtypes = [tribeLower];
    if (tribeLower === 'outlaws') targetSubtypes = ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'];
    else if (tribeLower === 'party') targetSubtypes = ['cleric', 'rogue', 'warrior', 'wizard'];
    else if (tribeLower === 'goblin_horde' || tribeLower.includes('goblin')) targetSubtypes = ['goblin', 'ogre', 'orc'];
    else if (tribeLower === 'elf_druid' || tribeLower.includes('elf')) targetSubtypes = ['elf', 'druid'];
    else if (tribeLower === 'human_army' || tribeLower.includes('human')) targetSubtypes = ['human', 'soldier', 'knight'];
    else if (tribeLower === 'undead_scourge' || tribeLower.includes('zombie')) targetSubtypes = ['zombie', 'skeleton', 'vampire', 'horror'];
    else if (tribeLower === 'sea_monsters' || tribeLower.includes('sea') || tribeLower.includes('marino') || tribeLower.includes('kraken')) targetSubtypes = ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent', 'fish'];
    else if (tribeLower === 'apex_predators' || tribeLower.includes('predator')) targetSubtypes = ['dinosaur', 'beast', 'hydra'];
    else if (tribeLower === 'werewolves' || tribeLower.includes('werewolf')) targetSubtypes = ['werewolf', 'wolf', 'human'];

    return targetSubtypes.some(sub => typeLine.includes(sub) || oracleText.includes(sub));
  }
}
