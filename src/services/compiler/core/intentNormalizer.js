/**
 * src/services/compiler/core/intentNormalizer.js
 * 
 * BattleBox Strategic Planning Framework v4.0 — Intent Normalizer.
 * Normalizes raw UI state into typed immutable StrategicIntent contracts.
 */

export class IntentNormalizer {
  static normalizeTribe(rawTribe) {
    if (!rawTribe || typeof rawTribe !== 'string') return null;
    const clean = rawTribe.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().toLowerCase();
    if (!clean || ['none', 'null', 'general', 'ninguna', 'sin tribu', 'omitir', 'universal', 'sin_tribu'].includes(clean)) {
      return null;
    }

    const dictionary = {
      // Alianzas y Gremios (Prioritarios)
      'terrores marinos (tritones, krakens, leviatanes)': 'Sea_monsters',
      'terrores marinos': 'Sea_monsters',
      'sea_monsters': 'Sea_monsters',
      'sea monsters': 'Sea_monsters',
      'forajidos (asesinos, mercenarios, piratas, pícaros)': 'Outlaws',
      'forajidos': 'Outlaws',
      'grupo de aventura (clérigo, pícaro, guerrero, mago)': 'Party',
      'party': 'Party',
      'ejército (humanos, soldados, caballeros)': 'Human_army',
      'ejército': 'Human_army',
      'horda (goblins, orcos, ogros)': 'Goblin_horde',
      'horda': 'Goblin_horde',
      'naturaleza (elfos, druidas, elementales)': 'Elf_druid',
      'naturaleza': 'Elf_druid',
      'plaga (zombies, esqueletos, horrores)': 'Undead_scourge',
      'plaga': 'Undead_scourge',
      'depredadores del ápice (dinosaurios, bestias, hidras)': 'Apex_predators',
      'depredadores': 'Apex_predators',

      // Razas Clásicas & Vocaciones
      'tritones (merfolk)': 'Merfolk', 'tritones': 'Merfolk', 'merfolk': 'Merfolk',
      'gigantes (giants)': 'Giant', 'gigantes': 'Giant', 'giant': 'Giant', 'giants': 'Giant',
      'elfos (elves)': 'Elf', 'elfos': 'Elf', 'elf': 'Elf', 'elves': 'Elf',
      'trasgos (goblins)': 'Goblin', 'goblins (trasgos)': 'Goblin', 'trasgos': 'Goblin', 'goblin': 'Goblin', 'goblins': 'Goblin',
      'vampiros (vampires)': 'Vampire', 'vampiros': 'Vampire', 'vampire': 'Vampire', 'vampires': 'Vampire',
      'zombis (zombies)': 'Zombie', 'zombies (zombis)': 'Zombie', 'zombis': 'Zombie', 'zombies': 'Zombie', 'zombie': 'Zombie',
      'dragones (dragons)': 'Dragon', 'dragones': 'Dragon', 'dragon': 'Dragon', 'dragons': 'Dragon',
      'humanos (humans)': 'Human', 'humanos': 'Human', 'human': 'Human', 'humans': 'Human',
      'angeles (angels)': 'Angel', 'ángeles': 'Angel', 'angeles': 'Angel', 'angel': 'Angel', 'angels': 'Angel',
      'demonios (demons)': 'Demon', 'demonios': 'Demon', 'demon': 'Demon', 'demons': 'Demon',
      'dinosaurios (dinosaurs)': 'Dinosaur', 'dinosaurios': 'Dinosaur', 'dinosaur': 'Dinosaur', 'dinosaurs': 'Dinosaur',
      'espíritus (spirits)': 'Spirit', 'espíritus': 'Spirit', 'espiritus': 'Spirit', 'espiritu': 'Spirit', 'spirit': 'Spirit', 'spirits': 'Spirit',
      'soldados (soldiers)': 'Soldier', 'soldados': 'Soldier', 'soldier': 'Soldier', 'soldiers': 'Soldier',
      'caballeros (knights)': 'Knight', 'caballeros': 'Knight', 'knight': 'Knight', 'knights': 'Knight',
      'magos (wizards)': 'Wizard', 'magos': 'Wizard', 'wizard': 'Wizard', 'wizards': 'Wizard',
      'clérigos (clerics)': 'Cleric', 'clerigos': 'Cleric', 'clérigos': 'Cleric', 'cleric': 'Cleric', 'clerics': 'Cleric',
      'pícaros (rogues)': 'Rogue', 'picaros': 'Rogue', 'pícaros': 'Rogue', 'rogue': 'Rogue', 'rogues': 'Rogue',
      'chamanes (shamans)': 'Shaman', 'chamanes': 'Shaman', 'shaman': 'Shaman', 'shamans': 'Shaman',
      'druidas (druids)': 'Druid', 'druidas': 'Druid', 'druid': 'Druid', 'druids': 'Druid',
      'ninjas': 'Ninja', 'ninja': 'Ninja',
      'piratas (pirates)': 'Pirate', 'piratas': 'Pirate', 'pirate': 'Pirate', 'pirates': 'Pirate',
      
      // Monstruos, Exóticas & Nuevas Tribus Icónicas
      'krakens': 'Sea_monsters', 'kraken': 'Sea_monsters',
      'leviatanes': 'Sea_monsters', 'leviathan': 'Sea_monsters', 'leviathans': 'Sea_monsters',
      'bestias (beasts)': 'Beast', 'bestias': 'Beast', 'beast': 'Beast', 'beasts': 'Beast',
      'elementales (elementals)': 'Elemental', 'elementales': 'Elemental', 'elemental': 'Elemental', 'elementals': 'Elemental',
      'eldrazi (eldrazi tron / aggro)': 'Eldrazi', 'eldrazi': 'Eldrazi',
      'hadas (faeries)': 'Faerie', 'hadas': 'Faerie', 'faerie': 'Faerie', 'faeries': 'Faerie', 'fairies': 'Faerie',
      'ratas (rats)': 'Rat', 'ratas': 'Rat', 'rat': 'Rat', 'rats': 'Rat',
      'ardillas (squirrels)': 'Squirrel', 'ardillas': 'Squirrel', 'squirrel': 'Squirrel', 'squirrels': 'Squirrel',
      'felinos (cats)': 'Cat', 'felinos': 'Cat', 'gatos': 'Cat', 'cat': 'Cat', 'cats': 'Cat', 'leonin': 'Cat',
      'constructos & myr (affinity)': 'Construct', 'constructos': 'Construct', 'construct': 'Construct', 'myr': 'Construct',
      'slivers (pentacolor 5c)': 'Sliver', 'slivers': 'Sliver', 'sliver': 'Sliver',
      'saprolines & hongos (saprolings)': 'Saproling', 'saprolines': 'Saproling', 'saproling': 'Saproling', 'saprolings': 'Saproling', 'fungus': 'Saproling',
      'hombres lobo & lobos (werewolves)': 'Werewolf', 'hombres lobo': 'Werewolf', 'werewolf': 'Werewolf', 'werewolves': 'Werewolf', 'wolf': 'Werewolf',
      'hidras (hydras - big mana & counters)': 'Hydra', 'hidras': 'Hydra', 'hydra': 'Hydra', 'hydras': 'Hydra',
      'limos & gelatinas (oozes)': 'Ooze', 'limos': 'Ooze', 'ooze': 'Ooze', 'oozes': 'Ooze',
      'gorgonas (gorgons - touch of death)': 'Gorgon', 'gorgonas': 'Gorgon', 'gorgon': 'Gorgon', 'gorgons': 'Gorgon',
      'murallas & defensores (walls - arcades combo)': 'Wall', 'murallas': 'Wall', 'wall': 'Wall', 'walls': 'Wall', 'defender': 'Wall',
      'esqueletos (skeletons)': 'Skeleton', 'esqueletos': 'Skeleton', 'skeleton': 'Skeleton', 'skeletons': 'Skeleton',
      'canes & felinos (dogs & hounds)': 'Dog', 'canes': 'Dog', 'dog': 'Dog', 'dogs': 'Dog', 'hound': 'Dog',
      'metamorfos (changelings - universal tribal)': 'Changeling', 'metamorfos': 'Changeling', 'changeling': 'Changeling', 'changelings': 'Changeling',
      'brujos & cultistas (warlocks)': 'Warlock', 'brujos': 'Warlock', 'warlock': 'Warlock', 'warlocks': 'Warlock',

      // Gremios
      'gremio boros (prowess & sunforger)': 'Boros_guild', 'boros': 'Boros_guild',
      'gremio golgari (dredge & undergrowth)': 'Golgari_guild', 'golgari': 'Golgari_guild',
      'gremio dimir (infiltración & tempo)': 'Dimir_guild', 'dimir': 'Dimir_guild',
      'gremio izzet (spellslinger & prowess)': 'Izzet_guild', 'izzet': 'Izzet_guild',
      'gremio orzhov (drenaje & aristócratas)': 'Orzhov_guild', 'orzhov': 'Orzhov_guild',
      'gremio simic (evolución & contadores +1/+1)': 'Simic_guild', 'simic': 'Simic_guild',
      'alianza esper (artefactos & destello)': 'Esper_shard', 'esper': 'Esper_shard',
      'alianza jund (desgaste & sacrificio)': 'Jund_shard', 'jund': 'Jund_shard',
      'alianza naya (bestias & enjambre)': 'Naya_shard', 'naya': 'Naya_shard',
      'alianza jeskai (prowess & tempo burn)': 'Jeskai_shard', 'jeskai': 'Jeskai_shard',
      'alianza sultai (reanimación & cementerio)': 'Sultai_shard', 'sultai': 'Sultai_shard'
    };

    // 1. Direct dictionary match first
    if (dictionary[clean]) return dictionary[clean];

    // 2. Exact and longest-key substring matching
    const sortedKeys = Object.keys(dictionary).sort((a, b) => b.length - a.length);
    for (const key of sortedKeys) {
      if (clean === key) return dictionary[key];
    }

    for (const key of sortedKeys) {
      if (clean.includes(key)) return dictionary[key];
    }

    // 3. Extract inside parentheses if available e.g. "Tritones (Merfolk)" -> "Merfolk"
    const parenMatch = clean.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      const inside = parenMatch[1].trim().toLowerCase();
      if (dictionary[inside]) return dictionary[inside];
      const capitalized = inside.charAt(0).toUpperCase() + inside.slice(1);
      return capitalized;
    }

    // Capitalize first letter
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  static normalizeStrategy(rawStrategy) {
    if (!rawStrategy || typeof rawStrategy !== 'string') return 'general';
    const clean = rawStrategy.trim().toLowerCase();

    if (clean.includes('aristocrat') || clean.includes('sacrific') || clean.includes('dren') || clean.includes('drain')) return 'aristocrats';
    if (clean.includes('reanimat') || clean.includes('cementerio') || clean.includes('graveyard') || clean.includes('dredge') || clean.includes('delirium')) return 'reanimator';
    if (clean.includes('spellslinger') || clean.includes('prowess') || clean.includes('magecraft') || clean.includes('conjuro') || clean.includes('instant')) return 'spellslinger';
    if (clean.includes('blink') || clean.includes('flicker') || clean.includes('etb') || clean.includes('destello')) return 'blink';
    if (clean.includes('landfall') || clean.includes('rampa') || clean.includes('ramp') || clean.includes('tierras') || clean.includes('big mana') || clean.includes('tron')) return 'landfall';
    if (clean.includes('lifegain') || clean.includes('vida') || clean.includes('salud')) return 'lifegain';
    if (clean.includes('prison') || clean.includes('taxes') || clean.includes('impuest') || clean.includes('control fiscal')) return 'prison';
    if (clean.includes('voltron') || clean.includes('equipo') || clean.includes('aura') || clean.includes('equipment')) return 'voltron';
    if (clean.includes('ninjutsu') || clean.includes('infiltración') || clean.includes('infiltracion') || clean.includes('ninja')) return 'ninjutsu';
    if (clean.includes('token') || clean.includes('go-wide') || clean.includes('enjambre') || clean.includes('horda') || clean.includes('ficha') || clean.includes('esporas')) return 'tokens';
    if (clean.includes('storm') || clean.includes('tormenta')) return 'storm';
    if (clean.includes('affinity') || clean.includes('afinidad') || clean.includes('artefacto')) return 'affinity';
    if (clean.includes('mill') || clean.includes('molienda')) return 'mill';

    return clean;
  }

  static normalizeUIState(uiFormState = {}) {
    const rawTribe = uiFormState.primaryTribe || uiFormState.tribe || 'Giants';
    const rawStrat = uiFormState.strategy || uiFormState.estrategia || 'General';

    const intent = {
      format: uiFormState.format || 'Standard',
      colors: Object.freeze(uiFormState.colors || ['White', 'Red', 'Green']),
      archetype: uiFormState.archetype || 'Aggro',
      primaryTribe: IntentNormalizer.normalizeTribe(rawTribe),
      strategy: IntentNormalizer.normalizeStrategy(rawStrat),
      mechanics: Object.freeze(uiFormState.mechanics || ['Stomp']),
      prompt: uiFormState.prompt || 'Naya Giants Aggro',
      budget: uiFormState.budget || 'Unlimited',
      competitiveness: uiFormState.competitiveness || 'Competitive',
      excludedCards: Object.freeze(uiFormState.excludedCards || []),
      excludedMechanics: Object.freeze(uiFormState.excludedMechanics || [])
    };

    return Object.freeze(intent);
  }
}
