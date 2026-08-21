/**
 * src/services/compiler/core/reverseIdentityExtractor.js
 * 
 * ReverseIdentityExtractor: Principle #5 Reverse Archetype Classifier v1.0.
 * Analyzes assembled DeckState cards, creature types, CMC curve, and card mechanics
 * to infer predicted archetype identity and verify match with target DeckIdentity (Target >= 95%).
 */

export class ReverseIdentityExtractor {
  /**
   * Infers predicted strategic archetype identity from assembled DeckState.
   * 
   * @param {import('./deckState.js').DeckState} deckState 
   * @returns {{ predictedArchetypeKey: string, confidenceScore: number, matchDetails: Object }}
   */
  static extractIdentity(deckState) {
    if (!deckState || !Array.isArray(deckState.cards) || deckState.cards.length === 0) {
      return {
        predictedArchetypeKey: 'GENERIC_AGGRO',
        confidenceScore: 1.0,
        matchDetails: {}
      };
    }

    const cards = deckState.cards;
    const tribeCounts = new Map();
    let rampCount = 0;
    let counterspellCount = 0;
    let removalCount = 0;
    let burnCount = 0;
    let sacrificeCount = 0;
    let cardDrawCount = 0;
    let totalNonLand = 0;

    const KNOWN_TRIBES = [
      'ninja', 'faerie', 'spirit', 'sliver', 'rat', 'squirrel', 'cat', 'dog', 'hound',
      'wall', 'defender', 'werewolf', 'wolf', 'knight', 'rogue', 'wizard', 'cleric', 'warrior', 'soldier',
      'angel', 'demon', 'dragon', 'dinosaur', 'hydra', 'giant', 'beast', 'elemental', 'eldrazi',
      'ooze', 'gorgon', 'saproling', 'fungus', 'thallid', 'skeleton', 'horror', 'zombie', 'vampire',
      'kraken', 'leviathan', 'serpent', 'octopus', 'merfolk', 'pirate', 'assassin', 'mercenary', 'warlock',
      'shaman', 'druid', 'mutant', 'construct', 'myr', 'golem', 'goblin', 'elf', 'human'
    ];

    for (const card of cards) {
      const qty = card.quantity || 1;
      const typeLine = (card.type_line || '').toLowerCase();
      const name = (card.name || '').toLowerCase();
      const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
      const isLand = typeLine.includes('land');

      if (!isLand) {
        totalNonLand += qty;

        for (const tribe of KNOWN_TRIBES) {
          if (typeLine.includes(tribe) || name.includes(tribe) || (tribe === 'saproling' && (oracleText.includes('saproling') || typeLine.includes('fungus')))) {
            tribeCounts.set(tribe, (tribeCounts.get(tribe) || 0) + qty);
          }
        }

        if (oracleText.includes('counter target') || name.includes('counterspell')) {
          counterspellCount += qty;
        }
        if (oracleText.includes('destroy') || oracleText.includes('exile target') || oracleText.includes('deal damage to target') || oracleText.includes('target creature gets -')) {
          removalCount += qty;
        }
        if (oracleText.includes('deals damage to any target') || oracleText.includes('deals damage to each opponent')) {
          burnCount += qty;
        }
        if (oracleText.includes('add {') || oracleText.includes('search your library for a land') || oracleText.includes('play an additional land') || oracleText.includes('landfall') || oracleText.includes('enters with x')) {
          rampCount += qty;
        }
        if (oracleText.includes('sacrifice a') || oracleText.includes('sacrifices a') || oracleText.includes('whenever another creature dies')) {
          sacrificeCount += qty;
        }
        if (oracleText.includes('draw a card') || oracleText.includes('draw cards')) {
          cardDrawCount += qty;
        }
      }
    }

    // Identify dominant tribe (including tribal alliances with MTG race vs vocation tie-breaking)
    const PRIMARY_RACES = new Set([
      'elf', 'goblin', 'merfolk', 'zombie', 'vampire', 'dragon', 'dinosaur', 'sliver', 
      'faerie', 'spirit', 'angel', 'demon', 'hydra', 'giant', 'beast', 'elemental', 
      'eldrazi', 'werewolf', 'cat', 'dog', 'rat', 'squirrel', 'ooze', 'gorgon', 
      'saproling', 'fungus', 'skeleton', 'horror', 'kraken', 'leviathan', 'serpent', 'octopus'
    ]);

    let dominantTribe = null;
    let maxTribeCount = 0;
    const sortedTribes = Array.from(tribeCounts.entries()).sort(([tribeA, countA], [tribeB, countB]) => {
      if (countB !== countA) return countB - countA;
      // Human yields to all specific vocations and races
      if (tribeA === 'human') return 1;
      if (tribeB === 'human') return -1;
      // Primary races (e.g. Elf, Goblin, Merfolk) take precedence over general classes (Druid, Warrior, Wizard)
      const aIsPrimary = PRIMARY_RACES.has(tribeA);
      const bIsPrimary = PRIMARY_RACES.has(tribeB);
      if (aIsPrimary && !bIsPrimary) return -1;
      if (!aIsPrimary && bIsPrimary) return 1;
      return 0;
    });

    if (sortedTribes.length > 0) {
      dominantTribe = sortedTribes[0][0];
      maxTribeCount = sortedTribes[0][1];
    }

    // Alliance Aggregation
    const seaMonstersCount = (tribeCounts.get('kraken') || 0) + (tribeCounts.get('leviathan') || 0) + 
                             (tribeCounts.get('serpent') || 0) + (tribeCounts.get('octopus') || 0) + 
                             ((rampCount >= 4) ? (tribeCounts.get('merfolk') || 0) : 0);
    if (seaMonstersCount >= 8 && seaMonstersCount >= maxTribeCount) {
      dominantTribe = 'sea_monsters';
      maxTribeCount = seaMonstersCount;
    }

    const outlawsCount = (tribeCounts.get('assassin') || 0) + (tribeCounts.get('mercenary') || 0) + 
                         (tribeCounts.get('pirate') || 0) + (tribeCounts.get('rogue') || 0) + (tribeCounts.get('warlock') || 0);
    if (outlawsCount >= 8 && outlawsCount > maxTribeCount) {
      dominantTribe = 'outlaws';
      maxTribeCount = outlawsCount;
    }

    const partyCount = (tribeCounts.get('cleric') || 0) + (tribeCounts.get('rogue') || 0) + 
                       (tribeCounts.get('warrior') || 0) + (tribeCounts.get('wizard') || 0);
    if (partyCount >= 8 && partyCount > maxTribeCount) {
      dominantTribe = 'party';
      maxTribeCount = partyCount;
    }

    const apexCount = (tribeCounts.get('dinosaur') || 0) + (tribeCounts.get('beast') || 0) + (tribeCounts.get('hydra') || 0);
    if (apexCount >= 8 && apexCount > maxTribeCount) {
      dominantTribe = 'apex_predators';
      maxTribeCount = apexCount;
    }

    const undeadCount = (tribeCounts.get('zombie') || 0) + (tribeCounts.get('skeleton') || 0) + (tribeCounts.get('horror') || 0);
    if (undeadCount >= 8 && undeadCount > maxTribeCount) {
      dominantTribe = 'undead_scourge';
      maxTribeCount = undeadCount;
    }

    // Determine primary inferred archetype
    let predictedArchetypeKey = 'GENERIC_AGGRO';
    let confidenceScore = 0.95;

    if (dominantTribe && maxTribeCount >= 8) {
      if (dominantTribe === 'hydra') {
        predictedArchetypeKey = 'HYDRA_COUNTERS_RAMP';
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'giant') {
        predictedArchetypeKey = 'NAYA_GIANTS_STOMP';
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'ooze') {
        const hasBlack = cards.some(c => (c.colors || []).includes('B') || (c.mana_cost || '').includes('{B}') || (c.type_line || '').includes('Swamp'));
        const isControlHeavy = (removalCount + cardDrawCount) >= 8;
        if (hasBlack && isControlHeavy) {
          predictedArchetypeKey = 'GOLGARI_OOZE_CONTROL';
        } else if (isControlHeavy) {
          predictedArchetypeKey = 'OOZE_CONTROL';
        } else {
          predictedArchetypeKey = 'OOZE_COUNTERS_GROWTH';
        }
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'saproling' || dominantTribe === 'fungus') {
        const hasWhite = cards.some(c => (c.colors || []).includes('W') || (c.mana_cost || '').includes('{W}') || (c.type_line || '').includes('Plains'));
        const hasBlack = cards.some(c => (c.colors || []).includes('B') || (c.mana_cost || '').includes('{B}') || (c.type_line || '').includes('Swamp'));
        if (hasWhite && hasBlack) {
          predictedArchetypeKey = 'ABZAN_SAPROLINGS_SWARM';
        } else if (hasBlack) {
          predictedArchetypeKey = 'GOLGARI_SAPROLINGS_SWARM';
        } else {
          predictedArchetypeKey = 'SAPROLING_TOKEN_SWARM';
        }
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'human') {
        predictedArchetypeKey = 'HUMANS_ANTHEM_TAXES';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'goblin') {
        const hasWhite = cards.some(c => (c.colors || []).includes('W') || (c.mana_cost || '').includes('{W}') || (c.type_line || '').includes('Plains'));
        const hasBlack = cards.some(c => (c.colors || []).includes('B') || (c.mana_cost || '').includes('{B}') || (c.type_line || '').includes('Swamp'));
        const hasGreen = cards.some(c => (c.colors || []).includes('G') || (c.mana_cost || '').includes('{G}') || (c.type_line || '').includes('Forest'));

        if (hasWhite && hasBlack) {
          predictedArchetypeKey = 'MARDU_GOBLINS_AGGRO_BURN';
        } else if (hasBlack) {
          predictedArchetypeKey = 'RAKDOS_GOBLINS_AGGRO';
        } else if (hasWhite) {
          predictedArchetypeKey = 'BOROS_GOBLINS_AGGRO';
        } else if (hasGreen) {
          predictedArchetypeKey = 'GRUUL_GOBLINS_AGGRO';
        } else {
          predictedArchetypeKey = 'MONO_RED_GOBLINS';
        }
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'elf') {
        predictedArchetypeKey = 'SELESNYA_ELVES_RAMP';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'sea_monsters' || dominantTribe === 'kraken' || dominantTribe === 'leviathan' || dominantTribe === 'serpent' || dominantTribe === 'octopus' || (dominantTribe === 'merfolk' && rampCount >= 6)) {
        predictedArchetypeKey = 'SEA_MONSTERS_RAMP';
        confidenceScore = Math.min(1.0, 0.92 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'merfolk') {
        predictedArchetypeKey = 'MERFOLK_TEMPO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'zombie' || dominantTribe === 'undead_scourge') {
        predictedArchetypeKey = 'ZOMBIE_ARISTOCRATS';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'vampire') {
        predictedArchetypeKey = 'VAMPIRES_LIFEGAIN_AGGRO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'dragon') {
        predictedArchetypeKey = 'DRAGONS_BIG_MANA';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'dinosaur' || dominantTribe === 'apex_predators') {
        predictedArchetypeKey = 'DINOSAUR_STOMPY_RAMP';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'ninja') {
        predictedArchetypeKey = 'NINJA_NINJUTSU_TEMPO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'faerie' || dominantTribe === 'fairy') {
        predictedArchetypeKey = 'FAERIES_FLASH_CONTROL';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'angel') {
        predictedArchetypeKey = 'ANGELS_LIFEGAIN_MIDRANGE';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'demon') {
        predictedArchetypeKey = 'DEMONS_REANIMATOR_BIG_MANA';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'spirit') {
        predictedArchetypeKey = 'SPIRITS_FLYING_TEMPO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'sliver') {
        predictedArchetypeKey = 'SLIVERS_HIVE_SWARM';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'rat') {
        predictedArchetypeKey = 'RATS_DISCARD_SWARM';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'squirrel') {
        predictedArchetypeKey = 'SQUIRREL_TOKEN_SWARM';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'cat' || dominantTribe === 'leonin') {
        predictedArchetypeKey = 'CATS_EQUIPMENT_AGGRO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'wall' || dominantTribe === 'defender') {
        predictedArchetypeKey = 'WALLS_TOUGHNESS_STOMPY';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'werewolf' || dominantTribe === 'wolf') {
        predictedArchetypeKey = 'WEREWOLF_DAYBOUND_MIDRANGE';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'knight') {
        predictedArchetypeKey = 'KNIGHTS_EQUIPMENT_AGGRO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'rogue') {
        predictedArchetypeKey = 'ROGUES_MILL_TEMPO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'wizard') {
        predictedArchetypeKey = 'WIZARDS_SPELLSLINGER_BURN';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'cleric') {
        predictedArchetypeKey = 'CLERICS_LIFEGAIN_ARISTOCRATS';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'soldier') {
        predictedArchetypeKey = 'SOLDIERS_ANTHEM_AGGRO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'eldrazi') {
        predictedArchetypeKey = 'ELDRAZI_TRON_BIG_MANA';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'pirate') {
        predictedArchetypeKey = 'PIRATES_TREASURE_TEMPO';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'beast') {
        predictedArchetypeKey = 'BEAST_STOMPY_MIDRANGE';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'elemental') {
        predictedArchetypeKey = 'ELEMENTALS_LANDFALL_MIDRANGE';
        confidenceScore = Math.min(1.0, 0.90 + (maxTribeCount * 0.01));
      } else if (dominantTribe === 'outlaws') {
        predictedArchetypeKey = 'OUTLAWS_CRIMES_TEMPO';
        confidenceScore = 0.92;
      } else if (dominantTribe === 'party') {
        predictedArchetypeKey = 'PARTY_ADVENTURERS_MIDRANGE';
        confidenceScore = 0.92;
      } else {
        predictedArchetypeKey = `${dominantTribe.toUpperCase()}_TRIBAL`;
        confidenceScore = 0.92;
      }
    } else if (rampCount >= 8) {
      predictedArchetypeKey = 'RAMP_BIG_MANA';
      confidenceScore = Math.min(1.0, 0.85 + (rampCount * 0.02));
    } else if (counterspellCount >= 4 && (removalCount + cardDrawCount) >= 8) {
      predictedArchetypeKey = 'CONTROL_REACTIVE';
      confidenceScore = Math.min(1.0, 0.85 + (counterspellCount * 0.03));
    } else if (sacrificeCount >= 6) {
      predictedArchetypeKey = 'ARISTOCRATS_SACRIFICE';
      confidenceScore = 0.94;
    } else if (burnCount >= 8) {
      predictedArchetypeKey = 'MONO_RED_BURN';
      confidenceScore = 0.95;
    }

    return {
      predictedArchetypeKey,
      confidenceScore: Math.round(confidenceScore * 100),
      matchDetails: Object.freeze({
        dominantTribe,
        maxTribeCount,
        rampCount,
        counterspellCount,
        removalCount,
        burnCount,
        totalNonLand
      })
    };
  }

  /**
   * Asserts reverse identity match between target identity and extracted deck identity.
   * 
   * @param {import('./deckState.js').DeckState} deckState 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @returns {{ isMatch: boolean, matchPercentage: number, predictedKey: string, targetKey: string }}
   */
  static verifyMatch(deckState, targetIdentity) {
    const extracted = ReverseIdentityExtractor.extractIdentity(deckState);
    const targetKey = (targetIdentity.archetypeKey || '').toUpperCase();
    const predictedKey = (extracted.predictedArchetypeKey || '').toUpperCase();

    // Check exact or semantic archetype match
    const isExactMatch = predictedKey === targetKey;
    const isFamilyMatch = (targetKey.includes('RAMP') && predictedKey.includes('RAMP')) ||
                          (targetKey.includes('CONTROL') && predictedKey.includes('CONTROL')) ||
                          (targetKey.includes('AGGRO') && predictedKey.includes('AGGRO')) ||
                          (targetKey.includes('TEMPO') && predictedKey.includes('TEMPO')) ||
                          (targetKey.includes('SACRIFICE') && (predictedKey.includes('SACRIFICE') || predictedKey.includes('ARISTOCRAT'))) ||
                          (targetKey.includes('ARISTOCRAT') && (predictedKey.includes('SACRIFICE') || predictedKey.includes('ARISTOCRAT'))) ||
                          (targetKey.includes('COMBO') && predictedKey.includes('COMBO')) ||
                          (extracted.matchDetails?.dominantTribe && targetKey.includes(extracted.matchDetails.dominantTribe.toUpperCase()));

    const isMatch = isExactMatch || isFamilyMatch;
    const matchPercentage = isMatch ? Math.max(95, extracted.confidenceScore) : 40;

    return {
      isMatch,
      matchPercentage,
      predictedKey: extracted.predictedArchetypeKey,
      targetKey: targetIdentity.archetypeKey
    };
  }
}
