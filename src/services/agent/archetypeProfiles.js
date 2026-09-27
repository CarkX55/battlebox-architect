/**
 * UNIVERSAL ARCHETYPE PROFILE REGISTRY v1.0
 * 
 * Defines deterministic 4-Pillar Quota Profiles for all 16 MTG archetypes and strategies.
 * Guarantees exact slot ratios across any format, color identity, or tribal specification.
 */

export class ArchetypeProfileRegistry {
  /**
   * Resolves exact sequence profile and slot budgets for a given IntentPackage
   * 
   * @param {Object} intentPackage 
   * @returns {Object} ArchetypeSequenceProfile
   */
  static getProfile(intentPackage = {}) {
    const rawArch = intentPackage.archetype || intentPackage.tempo || '';
    const archetype = (typeof rawArch === 'string' ? rawArch : (Array.isArray(rawArch) ? rawArch.join(' ') : (rawArch?.id || rawArch?.name || ''))).toLowerCase();
    const tempo = archetype;

    const rawStrat = intentPackage.strategy || '';
    const strategy = (typeof rawStrat === 'string' ? rawStrat : (Array.isArray(rawStrat) ? rawStrat.join(' ') : (rawStrat?.id || rawStrat?.name || ''))).toLowerCase();

    let rawTribe = intentPackage.primaryTribe || intentPackage.tribe || '';
    let tribe = (typeof rawTribe === 'string' ? rawTribe : (Array.isArray(rawTribe) ? rawTribe.join(' ') : (rawTribe?.id || rawTribe?.name || ''))).toLowerCase();

    // Guilds, Shards & Color Alignments are NOT creature tribes!
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

    if (GUILD_FACTIONS.has(tribe) || tribe.includes('_guild') || tribe.includes('_shard')) {
      tribe = '';
    }

    // Auto-derive tribe from selectedEngineId or engineFlavor if tribe is unselected
    const engineId = (intentPackage.selectedEngineId || '').toLowerCase();
    const flavor = (intentPackage.engineFlavor || '').toLowerCase();
    const combinedEngine = `${engineId} ${flavor}`;
    if (!tribe || tribe === 'none' || tribe === 'ninguna' || tribe === 'general' || tribe === 'null') {
      if (combinedEngine.includes('goblin')) tribe = 'goblin';
      else if (combinedEngine.includes('dragon')) tribe = 'dragon';
      else if (combinedEngine.includes('elf')) tribe = 'elf';
      else if (combinedEngine.includes('merfolk')) tribe = 'merfolk';
      else if (combinedEngine.includes('vampire')) tribe = 'vampire';
      else if (combinedEngine.includes('zombie')) tribe = 'zombie';
      else if (combinedEngine.includes('angel')) tribe = 'angel';
      else if (combinedEngine.includes('demon')) tribe = 'demon';
    }

    const hasTribe = Boolean(tribe && tribe !== 'none' && tribe !== 'ninguna' && tribe !== 'general' && tribe !== 'null');

    // 0. SPECIALIZED ENGINE PROFILES (Priority Engine Detection)
    const isToughnessCombat = tribe === 'wall' || strategy.includes('toughness') || strategy.includes('resistencia') || engineId.includes('wall_toughness') || flavor.includes('resistencia') || flavor.includes('toughness');
    const isNinjutsu = tribe === 'ninja' || strategy.includes('ninjutsu') || engineId.includes('ninja');
    const isAristocrats = strategy.includes('aristocrat') || strategy.includes('sacrifice') || engineId.includes('sacrifice') || engineId.includes('aristocrat');
    const isReanimator = strategy.includes('reanimat') || strategy.includes('dredge') || strategy.includes('graveyard') || engineId.includes('reanimat');
    const isSpellslinger = strategy.includes('spellslinger') || strategy.includes('prowess') || strategy.includes('magecraft') || engineId.includes('spellslinger');
    const isLandfall = strategy.includes('landfall') || engineId.includes('landfall');
    const isPrison = (tempo || '').toLowerCase().includes('prison') || (tempo || '').toLowerCase().includes('tax') || strategy.includes('prison') || strategy.includes('tax') || strategy.includes('hatebear') || strategy.includes('impuest') || engineId.includes('prison') || engineId.includes('tax');

    if (isPrison) {
      return {
        id: 'PRISON_TAXES_CONTROL',
        name: 'PRISON TAXES CONTROL',
        sequence: [
          { nonLandMax: 12, need: 'TAXING_CREATURE', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Core hatebears & taxing creatures (Thalia, Guardian of Thraben, Archon of Emeria, Strict Proctor, Reidane, Aven Mindcensor, Skyclave Apparition).' },
          { nonLandMax: 20, need: 'PRISON_LOCK', type: 'Any', cmcMin: 1, cmcMax: 4, reasoning: 'Static denial, mana taxes & attack restrictions (Damping Sphere, Deafening Silence, High Noon, Authority of the Consuls, Ghostly Prison).' },
          { nonLandMax: 28, need: 'CHEAP_REMOVAL', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Cheap targeted removal & confinement (Portable Hole, Get Lost, Temporary Lockdown, Spell Queller).' },
          { nonLandMax: 36, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 4, reasoning: 'Card advantage & asymmetric velocity.' }
        ]
      };
    }

    if (isToughnessCombat) {
      return {
        id: 'DEFENDER_TOUGHNESS_STOMPY',
        name: 'DEFENDER TOUGHNESS STOMPY',
        sequence: [
          { nonLandMax: 8, need: 'TOUGHNESS_ENABLER', type: 'Any', cmcMin: 1, cmcMax: 4, reasoning: 'Essential toughness-combat enablers (Arcades, High Alert, Assault Formation, Bedrock Tortoise, Huatli).' },
          { nonLandMax: 14, need: 'DEFENDER_MANA_RAMP', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Defender-based mana acceleration (Axebane Guardian, Overgrown Battlement, Sylvan Caryatid).' },
          { nonLandMax: 26, need: 'DEFENDER_DENSITY', type: 'Creature', cmcMin: 1, cmcMax: 4, reasoning: 'Core high-toughness defenders and cantrips (Wall of Blossoms, Wall of Omens, Jeskai Barricade, Wall of Mulch).' },
          { nonLandMax: 30, need: 'COMBAT_AMPLIFICATION', type: 'Instant', cmcMin: 1, cmcMax: 3, reasoning: 'Lethal toughness combat tricks (Tower Defense, Bar the Door, Solid Footing).' },
          { nonLandMax: 36, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Low-cost spot removal & protection.' }
        ]
      };
    }

    if (isNinjutsu) {
      return {
        id: 'NINJUTSU_TEMPO',
        name: 'NINJUTSU TEMPO',
        sequence: [
          { nonLandMax: 8, need: 'EVASIVE_ENABLER', type: 'Creature', cmcMin: 0, cmcMax: 2, reasoning: 'Cheap evasive enablers T1-T2 to trigger Ninjutsu (Ornithopter, Faerie Seer, Changeling Outcast, Silver-Raven).' },
          { nonLandMax: 20, need: 'NINJUTSU_PAYOFF', type: 'Creature', cmcMin: 1, cmcMax: 5, reasoning: 'Core Ninjas with Ninjutsu combat damage triggers (Yuriko, Ingenious Infiltrator, Thousand-Faced Shadow, Moon-Circuit Hacker).' },
          { nonLandMax: 28, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap counterspells, bounce & spot removal to protect attackers.' },
          { nonLandMax: 36, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Card advantage & tempo velocity engines.' }
        ]
      };
    }

    if (isAristocrats) {
      return {
        id: 'ARISTOCRATS_SACRIFICE',
        name: 'ARISTOCRATS SACRIFICE',
        sequence: [
          { nonLandMax: 8, need: 'SACRIFICE_OUTLET', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Free repeatable sacrifice outlets (Viscera Seer, Carrion Feeder, Witch\'s Oven, Woe Strider, Goblin Bombardment).' },
          { nonLandMax: 18, need: 'SACRIFICE_FODDER', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Recurring sacrifice fodder & token generators (Bloodghast, Reassembling Skeleton, Doomed Traveler, Forsaken Miner).' },
          { nonLandMax: 26, need: 'DEATH_PAYOFF', type: 'Any', cmcMin: 2, cmcMax: 3, reasoning: 'Death trigger drain & ping payoffs (Blood Artist, Zulaport Cutthroat, Cruel Celebrant, Marionette Apprentice, Mayhem Devil).' },
          { nonLandMax: 32, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Sacrifice-based card advantage engines (Deadly Dispute, Village Rites).' },
          { nonLandMax: 36, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap interaction & removal.' }
        ]
      };
    }

    if (isReanimator) {
      return {
        id: 'REANIMATOR_COMBO',
        name: 'REANIMATOR COMBO',
        sequence: [
          { nonLandMax: 8, need: 'DISCARD_OUTLET', type: 'Any', cmcMin: 1, cmcMax: 2, reasoning: 'Fast graveyard enablers, discard outlets & mill (Faithless Looting, Consider, Tainted Indulgence, Stitcher\'s Supplier).' },
          { nonLandMax: 16, need: 'REANIMATE_SPELL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 4, reasoning: 'Reanimation spells (Reanimate, Persist, Animate Dead, Goryo\'s Vengeance).' },
          { nonLandMax: 24, need: 'FINISHER', type: 'Creature', cmcMin: 6, cmcMax: 12, reasoning: 'Colossal reanimation targets (Archon of Cruelty, Atraxa, Griselbrand).' },
          { nonLandMax: 32, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Early interaction & protection.' },
          { nonLandMax: 36, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Card draw & filtering.' }
        ]
      };
    }

    if (isSpellslinger) {
      return {
        id: 'SPELLSLINGER_PROWESS',
        name: 'SPELLSLINGER PROWESS',
        sequence: [
          { nonLandMax: 12, need: 'SPELL_VELOCITY', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap cantrips & burn velocity (Consider, Opt, Preordain, Monstrous Rage, Lightning Bolt).' },
          { nonLandMax: 24, need: 'PROWESS_PAYOFF', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Prowess & magecraft threats (Monastery Swiftspear, Monastery Mentor, Third Path Iconoclast, Bria, Coruscation Mage).' },
          { nonLandMax: 30, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap burn & counterspells.' },
          { nonLandMax: 36, need: 'CARD_FLOW', type: 'Any', cmcMin: 2, cmcMax: 4, reasoning: 'Impulse draw & resource refill.' }
        ]
      };
    }

    if (isLandfall) {
      return {
        id: 'LANDFALL_RAMP',
        name: 'LANDFALL RAMP',
        sequence: [
          { nonLandMax: 10, need: 'EARLY_RAMP', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Land searching & extra land drop enablers (Growth Spiral, Explore, Cultivate, Fabled Passage).' },
          { nonLandMax: 22, need: 'LANDFALL_PAYOFF', type: 'Any', cmcMin: 2, cmcMax: 5, reasoning: 'Landfall triggers & scaling threats (Lotus Cobra, Scute Swarm, Tireless Tracker, Omnath, Felidar Retreat).' },
          { nonLandMax: 28, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Spot removal & interaction.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 5, cmcMax: 8, reasoning: 'Apex landfall finishers (Avenger of Zendikar, Primeval Titan).' }
        ]
      };
    }

    // 1. TRIBAL COMBINATION PROFILES (Tribe + Archetype Matrix)
    if (hasTribe) {
      const isRamp = archetype.includes('ramp') || strategy.includes('ramp') || (intentPackage.selectedEngineId || '').includes('ramp') || (intentPackage.engineFlavor || '').toLowerCase().includes('ramp') || (intentPackage.engineFlavor || '').toLowerCase().includes('big mana');
      const isMidrange = archetype.includes('midrange') || strategy.includes('midrange');
      const isAggro = archetype.includes('aggro') || strategy.includes('aggro') || strategy.includes('burn') || strategy.includes('blitz');
      const isTempo = archetype.includes('tempo') || strategy.includes('tempo') || strategy.includes('prowess');
      const isControl = archetype.includes('control') || strategy.includes('control');
      const isTokenTribe = tribe.includes('saproling') || tribe.includes('fungus') || tribe.includes('thopter') || tribe.includes('servo');

      if (isControl) {
        return {
          id: 'TRIBAL_CONTROL',
          name: `${tribe.toUpperCase()} TRIBAL CONTROL`,
          sequence: [
            { nonLandMax: 10, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Early counterspells & spot removal.' },
            { nonLandMax: 16, need: 'SWEEPER', type: 'Instant_or_Sorcery', cmcMin: 3, cmcMax: 5, reasoning: 'Board stabilization and mass removal.' },
            { nonLandMax: 26, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 4, reasoning: 'Card advantage & draw engines.' },
            { nonLandMax: 32, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 2, cmcMax: 5, tribe, reasoning: `Deploying resilient tribal threats for [${tribe}].` },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 5, cmcMax: 7, tribe, reasoning: `Adding apex control finishers for [${tribe}].` }
          ]
        };
      }

      if (isRamp) {
        return {
          id: 'TRIBAL_RAMP',
          name: `${tribe.toUpperCase()} TRIBAL RAMP`,
          sequence: [
            { nonLandMax: 8, need: 'EARLY_RAMP', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: `Deploying early mana acceleration & ramp rocks T1-T3 for [${tribe}].` },
            { nonLandMax: 14, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Establishing early removal & interaction.' },
            { nonLandMax: 28, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 3, cmcMax: 5, tribe, reasoning: `Deploying mid-game core creature threats for [${tribe}].` },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 5, cmcMax: 8, tribe, reasoning: `Adding apex finishers for [${tribe}].` }
          ]
        };
      }

      if (isMidrange) {
        return {
          id: 'TRIBAL_MIDRANGE',
          name: `${tribe.toUpperCase()} TRIBAL MIDRANGE`,
          sequence: [
            { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Establishing cheap spot removal & interaction T1-T2.' },
            { nonLandMax: 14, need: 'EARLY_RAMP', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Deploying early acceleration, mana dorks & color fixing.' },
            { nonLandMax: 26, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 2, cmcMax: 4, tribe, reasoning: `Deploying mid-curve creature threats & engines for [${tribe}].` },
            { nonLandMax: 32, need: 'CARD_FLOW', type: 'Any', cmcMin: 2, cmcMax: 4, reasoning: 'Adding card advantage & impulse draw engines.' },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 4, cmcMax: 6, tribe, reasoning: `Adding apex tribal finishers for [${tribe}].` }
          ]
        };
      }

      if (isAggro) {
        return {
          id: 'TRIBAL_AGGRO',
          name: `${tribe.toUpperCase()} TRIBAL AGGRO`,
          sequence: [
            { nonLandMax: 6, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Fast cheap removal & burn.' },
            { nonLandMax: 28, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, tribe, reasoning: `Deploying fast low-curve creatures & lords for [${tribe}].` },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 4, tribe, reasoning: `Adding aggressive curve-topping lords for [${tribe}].` }
          ]
        };
      }

      if (isTempo) {
        return {
          id: 'TRIBAL_TEMPO',
          name: `${tribe.toUpperCase()} TRIBAL TEMPO`,
          sequence: [
            { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap counterspells, bounce & interaction.' },
            { nonLandMax: 24, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, tribe, reasoning: `Deploying efficient evasive threats for [${tribe}].` },
            { nonLandMax: 30, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Fast cantrips & draw.' },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 5, tribe, reasoning: `Adding apex tempo threats for [${tribe}].` }
          ]
        };
      }

      if (isControl) {
        return {
          id: 'TRIBAL_CONTROL',
          name: `${tribe.toUpperCase()} TRIBAL CONTROL`,
          sequence: [
            { nonLandMax: 10, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Early counterspells & spot removal.' },
            { nonLandMax: 20, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 4, reasoning: 'Card advantage engines.' },
            { nonLandMax: 28, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 3, cmcMax: 5, tribe, reasoning: `Deploying resilient tribal threats for [${tribe}].` },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 5, cmcMax: 7, tribe, reasoning: `Adding apex control finishers for [${tribe}].` }
          ]
        };
      }

      if (isAristocrats) {
        return {
          id: 'TRIBAL_ARISTOCRATS',
          name: `${tribe.toUpperCase()} TRIBAL ARISTOCRATS`,
          sequence: [
            { nonLandMax: 6, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap removal.' },
            { nonLandMax: 22, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, tribe, reasoning: `Deploying sac outlets, blood artists & tokens for [${tribe}].` },
            { nonLandMax: 28, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Sacrifice card advantage.' },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 5, tribe, reasoning: `Adding mass drain & payoff finishers for [${tribe}].` }
          ]
        };
      }

      if (isReanimator) {
        return {
          id: 'TRIBAL_REANIMATOR',
          name: `${tribe.toUpperCase()} TRIBAL REANIMATOR`,
          sequence: [
            { nonLandMax: 6, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap removal & interaction.' },
            { nonLandMax: 16, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Looting, self-mill & dig engines.' },
            { nonLandMax: 26, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 2, cmcMax: 4, tribe, reasoning: `Deploying reanimate spells & graveyard engines for [${tribe}].` },
            { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 6, cmcMax: 9, tribe, reasoning: `Adding apex reanimate targets for [${tribe}].` }
          ]
        };
      }

      return {
        id: 'TRIBAL',
        name: `${tribe.toUpperCase()} TRIBAL`,
        sequence: [
          { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, tribe: null, reasoning: 'Establishing cheap removal T1-T2.' },
          { nonLandMax: 28, need: 'TRIBAL_THREAT', type: isTokenTribe ? 'Any' : 'Creature', cmcMin: 1, cmcMax: 4, tribe, reasoning: `Deploying core creature threats & lords of tribe [${tribe}] CMC 1-4.` },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 6, tribe, reasoning: `Adding tribal apex finishers & lords to close game.` }
        ]
      };
    }

    // 2. AGGRO / BURN PROFILE
    if (archetype.includes('aggro') || strategy.includes('aggro') || strategy.includes('burn') || strategy.includes('blitz')) {
      return {
        id: 'AGGRO',
        name: 'AGGRO / BURN',
        minCreatures: 24,
        targetCreatures: 26,
        targetRemoval: 8,
        targetFlow: 2,
        targetFinishers: 4,
        sequence: [
          { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Direct damage burn and fast cheap removal.' },
          { nonLandMax: 28, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Deploying aggressive low-curve creatures CMC 1-3.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 4, reasoning: 'Deploying fast curve-topping finishers.' }
        ]
      };
    }

    // 3. TEMPO PROFILE
    if (archetype.includes('tempo') || strategy.includes('tempo') || strategy.includes('prowess')) {
      return {
        id: 'TEMPO',
        name: 'TEMPO',
        minCreatures: 20,
        targetCreatures: 22,
        targetRemoval: 8,
        targetFlow: 6,
        targetFinishers: 4,
        sequence: [
          { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap counterspells, bounce, and interaction.' },
          { nonLandMax: 24, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Deploying efficient threat engines CMC 1-3.' },
          { nonLandMax: 30, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Fast cantrips & instant card flow.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 5, reasoning: 'Deploying tempo apex threats.' }
        ]
      };
    }

    // 4. CONTROL PROFILE
    if (archetype.includes('control') || strategy.includes('control') || strategy.includes('superfriends')) {
      return {
        id: 'CONTROL',
        name: 'CONTROL',
        minCreatures: 4,
        targetCreatures: 6,
        targetRemoval: 14,
        targetFlow: 12,
        targetFinishers: 4,
        sequence: [
          { nonLandMax: 10, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Early counterspells & spot removal T1-T2.' },
          { nonLandMax: 22, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 4, reasoning: 'Securing card advantage & impulse draw.' },
          { nonLandMax: 30, need: 'REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 2, cmcMax: 5, reasoning: 'Deploying mass sweepers and hard removal.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature_or_Planeswalker', cmcMin: 4, cmcMax: 6, reasoning: 'High-impact win-condition finishers & Planeswalkers.' }
        ]
      };
    }

    // 5. RAMP / TRON PROFILE
    if (archetype.includes('ramp') || strategy.includes('ramp') || strategy.includes('tron') || strategy.includes('eldrazi')) {
      return {
        id: 'RAMP',
        name: 'RAMP / BIG MANA',
        minCreatures: 12,
        targetCreatures: 16,
        targetRemoval: 6,
        targetFlow: 6,
        targetFinishers: 10,
        sequence: [
          { nonLandMax: 10, need: 'EARLY_RAMP', type: 'Creature_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Mana dorks & land ramp spells T1-T2.' },
          { nonLandMax: 18, need: 'CARD_FLOW', type: 'Any', cmcMin: 2, cmcMax: 4, reasoning: 'Card draw engines to refill hand.' },
          { nonLandMax: 24, need: 'REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Targeted removal to survive early pressure.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 5, cmcMax: 8, reasoning: 'Apex high-CMC threats & Eldrazi payoffs.' }
        ]
      };
    }

    // 6. ARISTOCRATS / SACRIFICE PROFILE
    if (strategy.includes('aristocrat') || strategy.includes('sacrifice') || strategy.includes('tokens')) {
      return {
        id: 'ARISTOCRATS',
        name: 'ARISTOCRATS / SACRIFICE',
        minCreatures: 22,
        targetCreatures: 24,
        targetRemoval: 8,
        targetFlow: 4,
        targetFinishers: 4,
        sequence: [
          { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Cheap removal & sacrifice removal.' },
          { nonLandMax: 20, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 1, cmcMax: 3, reasoning: 'Sac outlets, blood artists & token fodder CMC 1-3.' },
          { nonLandMax: 28, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Village Rites & sacrifice card draw.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 3, cmcMax: 5, reasoning: 'Mass drain & sacrifice payoff finishers.' }
        ]
      };
    }

    // 7. REANIMATOR PROFILE
    if (strategy.includes('reanimat') || strategy.includes('dredge') || strategy.includes('graveyard')) {
      return {
        id: 'REANIMATOR',
        name: 'REANIMATOR / GRAVEYARD',
        minCreatures: 14,
        targetCreatures: 16,
        targetRemoval: 8,
        targetFlow: 8,
        targetFinishers: 6,
        sequence: [
          { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Early interaction & cheap removal.' },
          { nonLandMax: 18, need: 'CARD_FLOW', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 3, reasoning: 'Looting, self-mill & dig engines.' },
          { nonLandMax: 26, need: 'TRIBAL_THREAT', type: 'Instant_or_Sorcery', cmcMin: 2, cmcMax: 4, reasoning: 'Reanimate spells & graveyard recursion.' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Creature', cmcMin: 6, cmcMax: 9, reasoning: 'High-impact reanimate fatty targets.' }
        ]
      };
    }

    // 8. ENCHANTRESS / AURAS PROFILE
    if (strategy.includes('enchantress') || strategy.includes('aura') || strategy.includes('bogles')) {
      return {
        id: 'ENCHANTRESS',
        name: 'ENCHANTRESS / AURAS',
        minCreatures: 12,
        targetCreatures: 14,
        targetRemoval: 6,
        targetFlow: 10,
        targetFinishers: 6,
        sequence: [
          { nonLandMax: 8, need: 'CARD_FLOW', type: 'Creature_or_Enchantment', cmcMin: 1, cmcMax: 3, reasoning: 'Enchantress draw engines CMC 1-3.' },
          { nonLandMax: 22, need: 'TRIBAL_THREAT', type: 'Enchantment', cmcMin: 1, cmcMax: 3, reasoning: 'Auras & enchantment synergy pieces.' },
          { nonLandMax: 28, need: 'CHEAP_REMOVAL', type: 'Enchantment_or_Instant', cmcMin: 1, cmcMax: 3, reasoning: 'Enchantment removal (Oblivion Ring, Banishing Light).' },
          { nonLandMax: 36, need: 'FINISHER', type: 'Enchantment_or_Creature', cmcMin: 3, cmcMax: 5, reasoning: 'Apex aura payoffs (Sigil of the Empty Throne).' }
        ]
      };
    }

    // 9. DEFAULT MIDRANGE PROFILE (Fallback for general/balanced decks)
    return {
      id: 'MIDRANGE',
      name: 'MIDRANGE',
      minCreatures: 16,
      targetCreatures: 18,
      targetRemoval: 8,
      targetFlow: 6,
      targetFinishers: 4,
      sequence: [
        { nonLandMax: 8, need: 'CHEAP_REMOVAL', type: 'Instant_or_Sorcery', cmcMin: 1, cmcMax: 2, reasoning: 'Establishing early board interaction T1-T2.' },
        { nonLandMax: 16, need: 'CARD_FLOW', type: 'Any', cmcMin: 1, cmcMax: 3, reasoning: 'Securing card flow & value engine.' },
        { nonLandMax: 28, need: 'TRIBAL_THREAT', type: 'Creature', cmcMin: 2, cmcMax: 4, reasoning: 'Deploying core value creatures CMC 2-4.' },
        { nonLandMax: 36, need: 'FINISHER', type: 'Creature_or_Planeswalker', cmcMin: 4, cmcMax: 6, reasoning: 'Adding apex finishers to close games.' }
      ]
    };
  }
}
