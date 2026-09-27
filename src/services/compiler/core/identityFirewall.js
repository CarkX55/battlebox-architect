/**
 * src/services/compiler/core/identityFirewall.js
 * 
 * IdentityFirewall: Hard Constraint Identity Veto Engine v1.0.
 * Vets cards against Hard Constraints: primaryTribe, requiredCreatureClasses, forbiddenPackages, forbiddenEngines.
 * Enforces ZERO IDENTITY LEAKAGE (0%).
 */

export class IdentityFirewall {
  /**
   * Vets a single card against Hard Constraints.
   * 
   * @param {Object} card 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ isAllowed: boolean, vetoReason: string|null }}
   */
  static validateCard(card, deckIdentity, intentPackage) {
    if (!card) return { isAllowed: false, vetoReason: 'Null card object' };

    // Support polymorphic invocation: validateCard(card, intentPackage)
    if (deckIdentity && (deckIdentity.strategicTempo || deckIdentity.format || deckIdentity.primaryTribe !== undefined) && !intentPackage) {
      intentPackage = deckIdentity;
      deckIdentity = null;
    }

    const faces = Array.isArray(card.card_faces) ? card.card_faces : [];
    let typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    let oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
    let cardColors = (card.colors || []).map(c => String(c).toUpperCase());
    let colorIdentity = (card.color_identity || []).map(c => String(c).toUpperCase());

    if (faces.length > 0) {
      if (!typeLine) {
        typeLine = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
      }
      if (!oracleText) {
        oracleText = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n').toLowerCase();
      }
      if (cardColors.length === 0) {
        const faceColors = new Set();
        faces.forEach(f => (f.colors || []).forEach(c => faceColors.add(String(c).toUpperCase())));
        if (faceColors.size > 0) {
          cardColors = Array.from(faceColors);
        }
      }
    }

    const cardName = card.name || 'Unknown';
    const isBasicLand = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(cardName.toLowerCase());

    // HARD CONSTRAINT 0: Format Legality Enforcement (All cards except standard basic lands)
    if (intentPackage && intentPackage.format && !isBasicLand) {
      const formatKey = intentPackage.format.toLowerCase();
      if (card.legalities && card.legalities[formatKey] && card.legalities[formatKey] !== 'legal') {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" is NOT legal in format "${intentPackage.format}" (status: ${card.legalities[formatKey]})`
        };
      }
    }

    // HARD CONSTRAINT 0b: Color Identity Enforcement (All cards)
    if (intentPackage && Array.isArray(intentPackage.colors) && intentPackage.colors.length > 0) {
      const allowedColors = new Set(intentPackage.colors.map(c => String(c).toUpperCase()));
      const isColorAllowed = cardColors.every(c => allowedColors.has(c)) &&
                             colorIdentity.every(c => allowedColors.has(c));
      if (!isColorAllowed) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" colors [${cardColors.join(',')}] / identity [${colorIdentity.join(',')}] not allowed in deck colors [${intentPackage.colors.join(',')}]`
        };
      }
    }

    // Pure non-creature lands pass identity checks once legal and color-compliant
    const isPureLand = typeLine.includes('land') && !typeLine.includes('creature');
    if (isPureLand) {
      return { isAllowed: true, vetoReason: null };
    }

    const primaryTribe = (intentPackage ? intentPackage.primaryTribe : '') || '';
    const tribeLower = primaryTribe.toLowerCase();

    // HARD CONSTRAINT 1: Primary Tribe & Membership Enforcement for Tribal Intent (Creature Domain)
    if (primaryTribe && primaryTribe !== 'None' && typeLine.includes('creature')) {
      const isAllowedTribe = IdentityFirewall.isMatchingTribe(card, primaryTribe);
      if (!isAllowedTribe) {
        const isStrictTribe = (intentPackage?.identityPolicy?.creatureMembershipMode === 'STRICT_TRIBE') ||
                              (intentPackage?.allowOffTribe === false) ||
                              (deckIdentity?.identityPolicy?.creatureMembershipMode === 'STRICT_TRIBE');

        if (!isStrictTribe && intentPackage && intentPackage.allowOffTribe === true) {
          return { isAllowed: true, vetoReason: null, isOffTribeAllowed: true };
        }

        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Creature "${cardName}" type line "${typeLine}" does not match required primary tribe "${primaryTribe}" (STRICT_TRIBE domain constraint active)`
        };
      }
    }

    // HARD CONSTRAINT 1b: Prevent off-tribe token pollution in tribal decks
    if (primaryTribe && (tribeLower.includes('saproling') || tribeLower.includes('fungus') || tribeLower.includes('hongo'))) {
      const otherTokenTribes = ['ooze', 'goblin', 'zombie', 'skeleton', 'pilot', 'alien', 'soldier', 'cat', 'dog', 'knight', 'vampire', 'dinosaur', 'dragon', 'faerie', 'merfolk'];
      const createsOtherSpecificToken = otherTokenTribes.some(ot => 
        oracleText.includes(`create`) && (oracleText.includes(`${ot} creature token`) || oracleText.includes(`${ot} token`))
      );
      if (createsOtherSpecificToken && !oracleText.includes('saproling') && !oracleText.includes('fungus')) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" generates off-tribe tokens in a Saproling/Fungus tribal deck`
        };
      }
    }

    // HARD CONSTRAINT 1c: Veto Alien Parasitic Tribal Spells
    if (primaryTribe && primaryTribe !== 'None') {
      const escapedTribe = primaryTribe.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const allowedTribeRegex = new RegExp(`\\b${escapedTribe}\\b`, 'i');
      
      const majorAlienTribes = [
        'vampire', 'vampires', 'elf', 'elves', 'zombie', 'zombies', 'merfolk', 'merfolks',
        'dragon', 'dragons', 'dinosaur', 'dinosaurs', 'sliver', 'slivers', 'knight', 'knights',
        'soldier', 'soldiers', 'faerie', 'faeries', 'spirit', 'spirits', 'elemental', 'elementals',
        'angel', 'angels', 'demon', 'demons', 'wolf', 'wolves', 'werewolf', 'werewolves',
        'human', 'humans', 'cat', 'cats', 'dog', 'dogs', 'bird', 'birds', 'ally', 'allies',
        'ninja', 'ninjas', 'pirate', 'pirates', 'rat', 'rats'
      ];

      for (const alienTribe of majorAlienTribes) {
        if (allowedTribeRegex.test(alienTribe) || IdentityFirewall.isMatchingTribe({ type_line: alienTribe, oracle_text: '' }, primaryTribe)) continue;
        
        const parasiticPattern = new RegExp(
          `\\b(among|for each|number of|target|another|all|return (all|target)|sacrifice (a|an)|whenever (a|an|another)|as long as you control (a|an))\\s+${alienTribe}\\b`,
          'i'
        );
        
        if (parasiticPattern.test(oracleText) && !allowedTribeRegex.test(oracleText)) {
          return {
            isAllowed: false,
            vetoReason: `Hard Constraint Veto: Card "${cardName}" has parasitic dependency on alien tribe "${alienTribe}" in a "${primaryTribe}" deck`
          };
        }
      }
    }

    // HARD CONSTRAINT 2: Forbidden Engines & Forbidden Packages Check
    const forbiddenPackages = deckIdentity ? (deckIdentity.forbiddenPackages || []) : [];
    if (forbiddenPackages.includes('GO_WIDE_PACKAGE') || forbiddenPackages.includes('TOKEN_PACKAGE')) {
      if (oracleText.includes('create a 1/1') || oracleText.includes('create a 2/2') || oracleText.includes('create') && oracleText.includes('token')) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Card "${cardName}" generates tokens forbidden by identity [${forbiddenPackages.join(', ')}]`
        };
      }
    }

    if (forbiddenPackages.includes('HUMANS_GO_WIDE_PACKAGE') && typeLine.includes('human')) {
      if (primaryTribe.toLowerCase() !== 'human') {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Human creature "${cardName}" belongs to forbidden package [HUMANS_GO_WIDE_PACKAGE]`
        };
      }
    }

    // HARD CONSTRAINT 3: Creature Classes
    const reqClasses = deckIdentity ? (deckIdentity.requiredCreatureClasses || []) : [];
    if (reqClasses.length > 0 && typeLine.includes('creature')) {
      const matchesClass = reqClasses.some(c => typeLine.includes(c.toLowerCase()));
      if (!matchesClass) {
        return {
          isAllowed: false,
          vetoReason: `Hard Constraint Veto: Creature "${cardName}" does not match required classes [${reqClasses.join(', ')}]`
        };
      }
    }

    return { isAllowed: true, vetoReason: null };
  }

  /**
   * Helper to check if a card matches the primary tribe (including all tribal alliances and multi-subtypes).
   * 
   * @param {Object} card 
   * @param {string} primaryTribe 
   * @returns {boolean}
   */
  static isMatchingTribe(card, primaryTribe) {
    if (!primaryTribe || primaryTribe === 'none' || primaryTribe === 'universal' || primaryTribe === 'general' || primaryTribe === 'null') {
      return true;
    }
    const tribeLower = String(primaryTribe).toLowerCase().trim();

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

    const faces = Array.isArray(card?.card_faces) ? card.card_faces : [];
    let typeLine = (card?.type_line || card?.typeLine || card?.type || '').toLowerCase();
    let oracleText = (card?.oracle_text || card?.oracleText || card?.text || '').toLowerCase();

    if (faces.length > 0) {
      if (!typeLine) typeLine = faces.map(f => f.type_line || f.typeLine || '').filter(Boolean).join(' // ').toLowerCase();
      if (!oracleText) oracleText = faces.map(f => f.oracle_text || f.oracleText || '').filter(Boolean).join('\n//\n').toLowerCase();
    }

    const isCreature = typeLine.includes('creature') || faces.some(f => (f.type_line || '').toLowerCase().includes('creature'));

    // Universal Changeling check
    if (oracleText.includes('changeling') && !oracleText.includes('lose all abilities')) {
      return true;
    }

    // Helper: checks if typeLine or any face contains subtype as an exact word
    const hasExactSubtype = (subtype) => {
      const regex = new RegExp(`\\b${subtype}\\b`, 'i');
      if (regex.test(typeLine)) return true;
      return faces.some(f => regex.test((f.type_line || '').toLowerCase()));
    };

    // Helper: checks if oracleText creates tokens or interacts explicitly with the tribe
    const hasTribalOracleInteraction = (subtypes) => {
      return subtypes.some(sub => {
        const subPattern = sub.endsWith('f') ? `${sub.slice(0, -1)}(f|ves)` : `${sub}(s)?`;
        const tokenRegex = new RegExp(`\\bcreate\\b[^\\.\\n]*\\b${subPattern}\\b`, 'i');
        const payoffRegex = new RegExp(`\\b${subPattern}\\s+(creatures|spells|cards|you control)\\b`, 'i');
        const controlRegex = new RegExp(`\\b(control|controls|controlling)\\s+(a\\s+|an\\s+|another\\s+|each\\s+)?${subPattern}\\b`, 'i');
        const targetRegex = new RegExp(`\\b(target|choose|another|other|each)\\s+(a\\s+|an\\s+|another\\s+)?${subPattern}\\b`, 'i');
        const countRegex = new RegExp(`\\bnumber\\s+of\\s+${subPattern}\\b`, 'i');
        return tokenRegex.test(oracleText) || payoffRegex.test(oracleText) || controlRegex.test(oracleText) || targetRegex.test(oracleText) || countRegex.test(oracleText);
      });
    };

    // --- STRUCTURAL TRIBAL RESOLUTION ---
    // 1. WEREWOLF: Requires structural Werewolf subtype on either face OR Daybound/Nightbound creature transform (or Changeling)
    if (tribeLower.includes('werewolf') || tribeLower.includes('hombre lobo') || tribeLower.includes('licantrop')) {
      if (hasExactSubtype('werewolf')) return true;
      // DFC Daybound/Nightbound creature (structurally transforms into Werewolf)
      if (isCreature && (oracleText.includes('daybound') || oracleText.includes('nightbound'))) return true;
      if (!isCreature && hasTribalOracleInteraction(['werewolf'])) return true;
      return false;
    }

    // 2. WOLF (Strictly distinct from Werewolf: subtype Wolf WITHOUT Werewolf)
    if (tribeLower === 'wolf' || tribeLower === 'wolves' || tribeLower === 'lobo' || tribeLower === 'lobos') {
      if (hasExactSubtype('wolf') && !hasExactSubtype('werewolf')) return true;
      if (!isCreature && hasTribalOracleInteraction(['wolf']) && !hasTribalOracleInteraction(['werewolf'])) return true;
      return false;
    }

    // 3. Faction Subtype Alliances (Domain-defined, structurally verified)
    if (tribeLower.includes('saproling') || tribeLower.includes('fungus') || tribeLower.includes('hongo')) {
      const subtypes = ['saproling', 'fungus', 'thallid'];
      if (subtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(subtypes)) return true;
      return false;
    }
    if (tribeLower.includes('wall') || tribeLower.includes('muro') || tribeLower.includes('defender')) {
      const subtypes = ['wall', 'plant', 'treefolk'];
      if (subtypes.some(s => hasExactSubtype(s))) return true;
      if (/\bdefender\b/i.test(oracleText) || /\btoughness\b/i.test(oracleText)) return true;
      return false;
    }
    if (tribeLower.includes('thopter') || tribeLower.includes('servo')) {
      const subtypes = ['thopter', 'servo', 'artificer'];
      if (subtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(subtypes)) return true;
      return false;
    }
    if (tribeLower.includes('sea_monster') || tribeLower.includes('sea') || tribeLower.includes('marino') || tribeLower.includes('kraken') || tribeLower.includes('leviathan') || tribeLower.includes('octopus') || tribeLower.includes('serpent')) {
      const seaSubtypes = ['merfolk', 'kraken', 'leviathan', 'octopus', 'serpent', 'fish', 'whale'];
      if (seaSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(seaSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('outlaw')) {
      const outlawSubtypes = ['assassin', 'mercenary', 'pirate', 'rogue', 'warlock'];
      return outlawSubtypes.some(s => hasExactSubtype(s)) || hasTribalOracleInteraction(outlawSubtypes);
    }
    if (tribeLower.includes('party')) {
      const partySubtypes = ['cleric', 'rogue', 'warrior', 'wizard'];
      return partySubtypes.some(s => hasExactSubtype(s)) || hasTribalOracleInteraction(partySubtypes);
    }
    if (tribeLower.includes('human_army') || tribeLower.includes('ejército')) {
      const armySubtypes = ['human', 'soldier', 'knight'];
      return armySubtypes.some(s => hasExactSubtype(s)) || hasTribalOracleInteraction(armySubtypes);
    }
    if (tribeLower.includes('goblin_horde') || tribeLower.includes('horda') || tribeLower.includes('goblin') || tribeLower.includes('trasgo')) {
      const hordeSubtypes = ['goblin', 'ogre', 'orc'];
      if (hordeSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(hordeSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('elf_druid') || tribeLower.includes('naturaleza') || tribeLower.includes('elf') || tribeLower.includes('elfo')) {
      const druidSubtypes = ['elf', 'druid'];
      if (druidSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(druidSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('undead_scourge') || tribeLower.includes('plaga') || tribeLower.includes('zombie') || tribeLower.includes('zombi')) {
      const undeadSubtypes = ['zombie', 'skeleton', 'vampire', 'horror'];
      if (undeadSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(undeadSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('apex_predator') || tribeLower.includes('depredador') || tribeLower.includes('dinosaur') || tribeLower.includes('dinosaurio')) {
      const apexSubtypes = ['dinosaur', 'beast', 'hydra'];
      if (apexSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(apexSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('vampire') || tribeLower.includes('vampiro')) {
      const vampSubtypes = ['vampire'];
      if (vampSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(vampSubtypes)) return true;
      return false;
    }
    if (tribeLower.includes('dragon') || tribeLower.includes('dragón')) {
      const dragSubtypes = ['dragon'];
      if (dragSubtypes.some(s => hasExactSubtype(s))) return true;
      if (hasTribalOracleInteraction(dragSubtypes)) return true;
      return false;
    }

    // Default: exact word boundary check on typeLine or explicit token/payoff in oracle
    const cleanTribe = tribeLower.replace(/[^a-z0-9]/g, '');
    if (!cleanTribe) return true;
    if (hasExactSubtype(cleanTribe)) return true;
    if (hasTribalOracleInteraction([cleanTribe])) return true;

    return false;
  }

  /**
   * Post-assembly firewall check. Asserts 0% non-identity spells survive in deck.
   * 
   * @param {Array<Object>} compiledCards 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ isClean: boolean, leakedCards: Array<Object>, leakagePercentage: number }}
   */
  static vetoDeckState(compiledCards = [], deckIdentity, intentPackage) {
    const leakedCards = [];

    for (const card of compiledCards) {
      const cardObj = card.cardObj || card;
      const check = this.validateCard(cardObj, deckIdentity, intentPackage);
      if (!check.isAllowed) {
        leakedCards.push({ cardName: card.name || cardObj.name, reason: check.vetoReason });
      }
    }

    const nonLandCount = compiledCards.filter(c => !((c.type_line || c.typeLine || '').toLowerCase().includes('land'))).length;
    const leakagePercentage = nonLandCount > 0 ? Math.round((leakedCards.length / nonLandCount) * 100) : 0;

    return {
      isClean: leakedCards.length === 0,
      leakedCards,
      leakagePercentage
    };
  }
}
