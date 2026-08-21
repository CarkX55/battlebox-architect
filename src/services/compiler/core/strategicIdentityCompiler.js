/**
 * src/services/compiler/core/strategicIdentityCompiler.js
 * 
 * StrategicIdentityCompiler: Knowledge Domain Layer v1.0.
 * Compiles IntentPackage into a rich, archetype-specific DeckIdentity BEFORE capability vector generation.
 * Prevents archetype collapse into generic capabilities.
 */

import { DeckIdentity } from './deckIdentityModel.js';

export class StrategicIdentityCompiler {
  /**
    * Compiles IntentPackage into a rich, non-collapsing DeckIdentity.
    * 
    * @param {import('./intentPackage.js').IntentPackage} intentPackage 
    * @returns {DeckIdentity}
    */
  static compileIdentity(intentPackage) {
    const rawTribe = intentPackage.primaryTribe || '';
    const cleanTribe = (typeof rawTribe === 'string' ? rawTribe : (rawTribe?.name || '')).toLowerCase().trim();
    const isNoneTribe = !cleanTribe || ['none', 'null', 'general', 'ninguna', 'sin tribu', 'omitir', 'universal', 'sin_tribu'].includes(cleanTribe);
    const tribe = isNoneTribe ? '' : cleanTribe;
    
    const rawTempo = intentPackage.tempo || intentPackage.archetype || '';
    const tempo = (typeof rawTempo === 'string' ? rawTempo : (rawTempo?.name || '')).toLowerCase();

    const rawMechanics = Array.isArray(intentPackage.mechanics)
      ? intentPackage.mechanics
      : (typeof intentPackage.mechanics === 'string' ? [intentPackage.mechanics] : []);
    const mechanics = rawMechanics.map(m => (typeof m === 'string' ? m : (m?.name || '')).toLowerCase());

    const rawStrategy = Array.isArray(intentPackage.strategy)
      ? intentPackage.strategy
      : (typeof intentPackage.strategy === 'string' ? [intentPackage.strategy] : []);
    const strategy = rawStrategy.map(s => (typeof s === 'string' ? s : (s?.name || '')).toLowerCase()).join(' ');

    const rawEngId = intentPackage.userConstraints?.selectedEngineId || intentPackage.selectedEngineId || '';
    const engineId = (typeof rawEngId === 'string' ? rawEngId : '').toLowerCase();
    const rawBoosts = intentPackage.userConstraints?.boostKeywords || [];
    const boostStr = (Array.isArray(rawBoosts) ? rawBoosts.join(' ') : String(rawBoosts)).toLowerCase();

    const allMechanicalSignals = `${strategy} ${mechanics.join(' ')} ${engineId} ${boostStr}`.toLowerCase();

    const colors = Array.isArray(intentPackage.colors) ? intentPackage.colors : [];
    const colorStr = colors.join('/');

    // ─── 0. TRIBAL ALLIANCES & BESPOKE ARCHETYPES ───────────────────────────
    // Walls / Muros / Defenders & Toughness Combat (Arcades, High Alert, Assault Formation, Huatli, Doran)
    if (tribe.includes('wall') || tribe.includes('muro') || tribe.includes('defender') || strategy.includes('wall') || strategy.includes('muro') || strategy.includes('defender') || strategy.includes('toughness') || mechanics.includes('defender') || mechanics.includes('toughness')) {
      return new DeckIdentity({
        archetypeKey: 'WALLS_TOUGHNESS_COMBAT',
        gameplan: 'Desplegar muros y defensores de alta resistencia y bajo coste (Wall of Omens, Overgrown Battlement, Shield Sphere) para convertirlos en atacantes letales y motores de robo masivo mediante Arcades, High Alert o Assault Formation.',
        requiredEngines: ['Toughness Combat Enablers (Arcades / High Alert / Assault Formation)', 'Defender Mana & Card Flow (Overgrown Battlement / Wall of Omens / Axebane Guardian)', 'High-Toughness Low-Cost Walls', 'Toughness Pump & Protection (Tower Defense / Heroic Intervention / Countermagic)', 'Selective Removal / Sweepers (Slaughter the Strong / Fell the Mighty)'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Engine Synergy', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Massive stats for minimal mana', 'Card draw engine with Arcades', 'Asymmetric board wipes (Slaughter the Strong)'],
        weaknesses: ['Vulnerable to removal targeting the Toughness Combat enablers (Arcades/High Alert)'],
        failureModes: ['Defenders unable to attack without enabler on board'],
        recoveryPlan: ['Redundant Toughness Enablers (High Alert, Assault Formation, Huatli)', 'Protection counterspells'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Sea Monsters / Terrores Marinos / Oceanic Ramp (Tritones, Krakens, Leviatanes, Pulpos, Serpientes)
    if (tribe.includes('sea_monster') || tribe.includes('kraken') || tribe.includes('leviathan') || tribe.includes('serpent') || tribe.includes('octopus') || strategy.includes('sea_monster') || strategy.includes('marino') || (tribe.includes('merfolk') && (tempo.includes('ramp') || strategy.includes('ramp') || strategy.includes('big mana') || strategy.includes('tron')))) {
      return new DeckIdentity({
        archetypeKey: 'SEA_MONSTERS_RAMP',
        gameplan: 'Acelerar maná en turnos 1-2 mediante tritones aceleradores, cantrips y conjuros de rampa para desplegar terrores oceánicos colosales (Krakens, Leviatanes, Pulpos, Serpientes) que dominan la mesa.',
        requiredEngines: ['Ramp Acceleration / Merfolk Dorks', 'Oceanic Colossal Threats', 'Oceanic Sweepers & Control', 'Card Flow Engine', 'Disruption'],
        expectedCurveRange: { min: 1, max: 7 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal', 'Card Flow'],
        strengths: ['Unblockable oceanic leviathans', 'Dominant late-game board presence', 'Asymmetric bounce sweepers (Whelming Wave)'],
        weaknesses: ['Vulnerable to aggressive blitz before ramp stabilization'],
        failureModes: ['Mana screw early', 'Threat deficit without card flow'],
        recoveryPlan: ['Kiora / Aesi card refill', 'Whelming Wave board reset'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // Outlaws / Forajidos Crimes & Tempo
    if (tribe.includes('outlaw') || strategy.includes('outlaw') || strategy.includes('forajido') || strategy.includes('crimes')) {
      return new DeckIdentity({
        archetypeKey: 'OUTLAWS_CRIMES_TEMPO',
        gameplan: 'Cometer crímenes constantes mediante interacción dirigida para disparar beneficios de Forajidos (Asesinos, Mercenarios, Piratas, Pícaros, Brujos) y presionar la mesa.',
        requiredEngines: ['Cheap Outlaw Attackers', 'Crime Enablers / Targeted Removal', 'Synergy Payoffs', 'Card Flow Refill'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Continuous value on interaction', 'Agile aggressive curve'],
        weaknesses: ['Vulnerable to wide token swarms'],
        failureModes: ['No targets for crime triggers'],
        recoveryPlan: ['Direct targeted bounce/removal', 'Card advantage engines'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Party / Grupo de Aventura (Clérigo, Pícaro, Guerrero, Mago)
    if (tribe.includes('party') || strategy.includes('party') || strategy.includes('aventura')) {
      return new DeckIdentity({
        archetypeKey: 'PARTY_ADVENTURERS_MIDRANGE',
        gameplan: 'Reunir un grupo completo de aventureros de 4 clases para abaratar hechizos masivos y activar bonificaciones deterministas de mesa.',
        requiredEngines: ['Cleric Enablers', 'Rogue Infiltrators', 'Warrior Attackers', 'Wizard Spellslingers', 'Party Payoffs'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Massive mana discounts on party full', 'High role versatility'],
        weaknesses: ['Spot removal breaking the 4-class triad'],
        failureModes: ['Missing 4th party class'],
        recoveryPlan: ['Multiclass changelings / flexible slots', 'Draw engine'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Apex Predators / Depredadores del Ápice (Dinosaurios, Bestias, Hidras)
    if (tribe.includes('apex_predator') || strategy.includes('apex') || strategy.includes('depredador')) {
      return new DeckIdentity({
        archetypeKey: 'APEX_PREDATORS_STOMPY',
        gameplan: 'Acelerar maná rápidamente para desplegar los mayores depredadores del ecosistema (Dinosaurios, Bestias, Hidras) con estadísticas colosales y arrollar.',
        requiredEngines: ['Mana Ramp & Fixing', 'Apex Colossal Monsters', 'Trample Enablers', 'Fight / Bite Removal'],
        expectedCurveRange: { min: 2, max: 7 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Unmatched board power/toughness', 'Crushes through blockers'],
        weaknesses: ['Deathtouch and cheap exile removal'],
        failureModes: ['Mana stall before reaching 5 CMC'],
        recoveryPlan: ['Fight spells for stabilization', 'Card draw based on power'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Undead Scourge / Plaga de No-Muertos (Zombies, Esqueletos, Horrores)
    if (tribe.includes('undead_scourge') || strategy.includes('undead') || strategy.includes('plaga')) {
      return new DeckIdentity({
        archetypeKey: 'UNDEAD_SCOURGE_GRAVEYARD',
        gameplan: 'Dominar la partida desde el cementerio y la mesa con una horda imparable de zombis, esqueletos y horrores recurrentes.',
        requiredEngines: ['Graveyard Recursion', 'Sacrifice & Drain', 'Undead Swarm', 'Removal Suite'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Recursive Fodder', 'Tribal Density', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Infinite recursion from graveyard', 'Life drain bypasses combat'],
        weaknesses: ['Exile sweepers and Rest in Peace'],
        failureModes: ['Graveyard hate'],
        recoveryPlan: ['Direct board casting', 'Zombie lord buffs'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Ninjas & Ninjutsu Tempo
    if (tribe.includes('ninja') || strategy.includes('ninjutsu') || mechanics.includes('ninjutsu')) {
      return new DeckIdentity({
        archetypeKey: 'NINJA_NINJUTSU_TEMPO',
        gameplan: 'Atacar con criaturas evasivas baratas (coste 1) para intercambiarlas en combate por Ninjas con Ninjutsu (Yuriko), generando robo y daño masivo.',
        requiredEngines: ['Evasive 1-Drops', 'Ninjutsu Strike Payoffs', 'Cheap Countermagic / Bounce', 'Card Velocity'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Cheap Removal', 'Card Flow'],
        strengths: ['Unblockable combat triggers', 'High card velocity and burn reach (Yuriko)'],
        weaknesses: ['Instant spot removal on unblocked attackers'],
        failureModes: ['No evasive attackers survive'],
        recoveryPlan: ['Ornithopter / Faerie Seer redeployment', 'Spell Pierce protection'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Faeries Flash & Control
    if (tribe.includes('faerie') || tribe.includes('fairy')) {
      return new DeckIdentity({
        archetypeKey: 'FAERIES_FLASH_CONTROL',
        gameplan: 'Jugar casi exclusivamente en el turno oponente mediante criaturas con Destello y Contrahechizos tribales (Spellstutter Sprite), asfixiando al rival.',
        requiredEngines: ['Flash Faeries', 'Tribal Counterspells', 'Bitterblossom Engine', 'Targeted Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Tempo Interaction', 'Cheap Removal', 'Card Flow'],
        strengths: ['Draw-go mastery', 'Asymmetric countermagic scaling with faerie count'],
        weaknesses: ['Uncounterable threats (Cavern of Souls)', 'Fast burn spells'],
        failureModes: ['Sweepers under flash timing'],
        recoveryPlan: ['Bitterblossom passive token recovery', 'Mistbind Clique lock'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Angels Lifegain & Midrange
    if (tribe.includes('angel') || strategy.includes('angel')) {
      return new DeckIdentity({
        archetypeKey: 'ANGELS_LIFEGAIN_MIDRANGE',
        gameplan: 'Desplegar ángeles voladores que disparan ganancias masivas de vida (Righteous Valkyrie, Giada), inflando a todo el escuadrón aéreo.',
        requiredEngines: ['Angel Mana Dorks (Giada)', 'Lifegain Triggers', 'Angel Lords & Anthems', 'Aerial Beatdown'],
        expectedCurveRange: { min: 2, max: 5 },
        mandatoryRoles: ['Turn 2 Pressure', 'Tribal Density', 'Lord Buff', 'Cheap Removal', 'Finisher'],
        strengths: ['Dominant flying stats', 'Life total out of burn reach'],
        weaknesses: ['Spot removal on Giada on turn 2'],
        failureModes: ['Early stall vs hyper aggro'],
        recoveryPlan: ['Lifelink races', 'Collected Company refuel'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Demons Reanimator & Big Mana
    if (tribe.includes('demon')) {
      return new DeckIdentity({
        archetypeKey: 'DEMONS_REANIMATOR_BIG_MANA',
        gameplan: 'Invocar demonios colosales mediante aceleración de rituales o reanimación, exigiendo tributos de sacrificio y aplastando con poder aéreo.',
        requiredEngines: ['Sacrifice Fodder', 'Demon Colossi', 'Card Draw on Pain', 'Removal Suite'],
        expectedCurveRange: { min: 1, max: 6 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Cheap Removal', 'Finisher'],
        strengths: ['Massive flying power', 'Heavy card advantage engines'],
        weaknesses: ['Life loss triggers against burn'],
        failureModes: ['Self-damage lethal lock'],
        recoveryPlan: ['Demon lifelink triggers', 'Board wiping demons'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Spirits Flying Tempo
    if (tribe.includes('spirit')) {
      return new DeckIdentity({
        archetypeKey: 'SPIRITS_FLYING_TEMPO',
        gameplan: 'Inundar los cielos con espíritus de bajo coste, protegiéndolos con destello y contrahechizos (Spell Queller, Rattlechains, Mausoleum Wanderer).',
        requiredEngines: ['Evasive Spirits', 'Flash Spirits Enablers', 'Spirit Lords', 'Disruptive Countermagic'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Tempo Interaction', 'Card Flow'],
        strengths: ['Pure flying evasion', 'Instant-speed resilience'],
        weaknesses: ['Reach blockers', 'Damage-based sweepers'],
        failureModes: ['Early spot removal on lords'],
        recoveryPlan: ['Rattlechains flash protection', 'Supreme Phantom lord buff'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Slivers Hive Swarm
    if (tribe.includes('sliver')) {
      return new DeckIdentity({
        archetypeKey: 'SLIVERS_HIVE_SWARM',
        gameplan: 'Desplegar fragmentados que comparten todas sus habilidades (fuerza, prisa, vuelo, maná, velo), convirtiendo cada nueva criatura en una amenaza letal.',
        requiredEngines: ['Mana Slivers (Manaweft)', 'Buff Slivers (Sinew, Predatory)', 'Evasion Slivers', 'Protection Slivers (Diffusion)'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Exponential stat scaling', 'Shared evasion and utility'],
        weaknesses: ['Board sweepers before Slivers get toughness buffs'],
        failureModes: ['Early color screw in 5C'],
        recoveryPlan: ['Manaweft/Gemhide mana fixing', 'Collected Company reload'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Rats Swarm & Discard
    if (tribe.includes('rat')) {
      return new DeckIdentity({
        archetypeKey: 'RATS_DISCARD_SWARM',
        gameplan: 'Inundar la mesa con un enjambre inagotable de ratas (Pack Rat, Rat Colony), forzando descarte en el rival y multiplicando atacantes cada turno.',
        requiredEngines: ['Rat Colony / Pack Rat Engines', 'Discard Disruption', 'Rat Lords (Marrow-Gnawer)', 'Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Infinite scaling threats with Pack Rat', 'Punishes slow hands'],
        weaknesses: ['Detention Sphere / targeted mass removal by card name'],
        failureModes: ['Early sweepers'],
        recoveryPlan: ['Pack Rat token cloning using land cards in hand'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Squirrels Token Swarm & Aristocrats
    if (tribe.includes('squirrel')) {
      return new DeckIdentity({
        archetypeKey: 'SQUIRREL_TOKEN_SWARM',
        gameplan: 'Generar una avalancha de fichas de ardilla lideradas por Chatterfang, sacrificándolas para controlar la mesa o inflando con señores para victoria de combate.',
        requiredEngines: ['Squirrel Token Generators', 'Chatterfang Sac Outlets', 'Token Anthems', 'Card Advantage'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Token Generator', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Go-wide numbers', 'Chatterfang removal on token generation'],
        weaknesses: ['Damage sweepers (Brotherhood\'s End)'],
        failureModes: ['Loss of Chatterfang'],
        recoveryPlan: ['Chatterstorm storm burst', 'Deep Forest Hermit refills'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Cats & Equipment Aggro
    if (tribe.includes('cat') || tribe.includes('leonin')) {
      return new DeckIdentity({
        archetypeKey: 'CATS_EQUIPMENT_AGGRO',
        gameplan: 'Desplegar felinos ágiles con vínculo vital y resistencia para equiparlos con armas legendarias y señores de manada (Feline Sovereign).',
        requiredEngines: ['Agile Cats', 'Equipment Enablers', 'Cat Lords', 'Protection Spells'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['High combat stats with equipment', 'Protection against artifacts/enchantments'],
        weaknesses: ['Artifact destruction'],
        failureModes: ['Equipment with no creatures'],
        recoveryPlan: ['King Darien anthem and board protection'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Walls & Defensores (Toughness Stompy / Arcades)
    if (tribe.includes('wall') || tribe.includes('defender') || strategy.includes('toughness') || strategy.includes('arcades')) {
      return new DeckIdentity({
        archetypeKey: 'WALLS_TOUGHNESS_STOMPY',
        gameplan: 'Desplegar muros y defensores de alta resistencia y bajo coste para convertirlos en atacantes letales mediante Arcades o High Alert.',
        requiredEngines: ['Defender Mana Dorks (Overgrown Battlement)', 'High Toughness Walls', 'Toughness-to-Damage Enablers (Arcades)', 'Draw on Defender ETB'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Cheap Removal', 'Card Flow'],
        strengths: ['Impentrable defensive wall', 'Massive damage per mana (0/4 for 1G attacks for 4)'],
        weaknesses: ['Removal of Arcades/High Alert enablers'],
        failureModes: ['Unable to attack without enabler'],
        recoveryPlan: ['Redundant High Alert / Assault Formation enchantments'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Werewolves Daybound / Nightbound Midrange
    if (tribe.includes('werewolf') || tribe.includes('wolf')) {
      return new DeckIdentity({
        archetypeKey: 'WEREWOLF_DAYBOUND_MIDRANGE',
        gameplan: 'Manipular el ciclo de Día y Noche para transformar humanos en Hombres Lobo gigantescos liderados por Tovolar, robando cartas al golpear.',
        requiredEngines: ['Daybound Werewolves', 'Tovolar Draw & Transformation', 'Instant Speed Flash/Pass', 'Fight Removal'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Overwhelming stats during night', 'Continuous card draw on damage'],
        weaknesses: ['Opponent casting 2 spells to force day'],
        failureModes: ['Locked into day mode'],
        recoveryPlan: ['Tovolar forced night trigger', 'Moonmist / The Celestus'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Knights & Equipment / Anthems Aggro
    if (tribe.includes('knight') || strategy.includes('knight')) {
      return new DeckIdentity({
        archetypeKey: 'KNIGHTS_EQUIPMENT_AGGRO',
        gameplan: 'Cargar con caballeros con dañar primero y protección, equipándolos con espadas y señores de caballería para abrumar en combate.',
        requiredEngines: ['First Strike Knights', 'Knight Lords', 'Equipment & Auras', 'Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Dominates combat steps with first strike', 'Resilient keywords'],
        weaknesses: ['Board sweepers'],
        failureModes: ['Stall against large blockers without equipment'],
        recoveryPlan: ['Kinsbaile Cavalier double strike burst'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Rogues & Mill Tempo
    if (tribe.includes('rogue') || strategy.includes('rogue') || strategy.includes('mill')) {
      return new DeckIdentity({
        archetypeKey: 'ROGUES_MILL_TEMPO',
        gameplan: 'Atacar con pícaros evasivos con destello mientras se llena el cementerio del oponente con molido para activar bonificaciones letales (Drown in the Loch, Thieves\' Guild Enforcer).',
        requiredEngines: ['Flash Rogues', 'Mill Triggers', 'Threshold Mill Payoffs', 'Countermagic & Removal'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Drown in the Loch flexible answers', 'Fast clock with evasion'],
        weaknesses: ['Opponents benefiting from graveyard (Dredge/Reanimator)'],
        failureModes: ['Graveyard empty against fast aggro'],
        recoveryPlan: ['Rogue flash tempo redeployment', 'Into the Story card refill'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Wizards & Spellslinger Burn
    if (tribe.includes('wizard')) {
      return new DeckIdentity({
        archetypeKey: 'WIZARDS_SPELLSLINGER_BURN',
        gameplan: 'Canalizar hechizos instantáneos de daño y robo mediante magos con destreza y reducción de costes (Baral, Harmonic Prodigy), fulminando al rival.',
        requiredEngines: ['Cheap Wizards', 'Cantrips & Direct Burn', 'Magecraft Payoffs', 'Wizard Lightning Reach'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Cheap Removal', 'Card Flow', 'Burn Reach'],
        strengths: ['Wizard\'s Lightning 1-mana 3 damage efficiency', 'Rapid card cycling'],
        weaknesses: ['Heavy lifegain'],
        failureModes: ['Out of gas without wizard on board'],
        recoveryPlan: ['Direct face burn', 'Expressive Iteration refill'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Clerics Lifegain & Aristocrats
    if (tribe.includes('cleric')) {
      return new DeckIdentity({
        archetypeKey: 'CLERICS_LIFEGAIN_ARISTOCRATS',
        gameplan: 'Encadenar clérigos que ganan vidas, previenen daño y drenan al oponente al morir o regresar del cementerio (Orah, Skyclave Hierophant).',
        requiredEngines: ['Lifegain Clerics (Soul Warden)', 'Cleric Recursion (Orah)', 'Cleric Lords & Drain', 'Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Immense lifegain buffer', 'Layered graveyard recursion'],
        weaknesses: ['Graveyard exile effects'],
        failureModes: ['Board stall without drain payoff'],
        recoveryPlan: ['Orah recursive resurrection chain'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Soldiers Anthem & Aggro
    if (tribe.includes('soldier')) {
      return new DeckIdentity({
        archetypeKey: 'SOLDIERS_ANTHEM_AGGRO',
        gameplan: 'Inundar la mesa con soldados veloces y fichas en turnos 1-2, potencíandolos con múltiples himnos y señores de soldados (Siege Veteran, Valiant Veteran).',
        requiredEngines: ['1-Drop Soldiers', 'Soldier Lords & Anthems', 'Token Spawners', 'Protective Interaction'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Blistering curve speed', 'High creature density'],
        weaknesses: ['Turn 3 sweepers'],
        failureModes: ['Empty hand without card refill'],
        recoveryPlan: ['Flash soldiers / Siege Veteran counter revival'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Eldrazi Tron & Big Mana
    if (tribe.includes('eldrazi') || strategy.includes('eldrazi')) {
      return new DeckIdentity({
        archetypeKey: 'ELDRAZI_TRON_BIG_MANA',
        gameplan: 'Ensamblar tierras de Urza y Eldrazi Temple para acelerar la invocación de titanes incoloros y monstruos con distorsión de mano (Thought-Knot Seer, Reality Smasher, Ulamog).',
        requiredEngines: ['Tron Lands / Land Tutors (Expedition Map)', 'Eldrazi Mid-Curve Threats', 'Eldrazi Titans', 'Colorless Interaction (All Is Dust, Warping Wail)'],
        expectedCurveRange: { min: 1, max: 8 },
        mandatoryRoles: ['Ramp Acceleration', 'Board Presence', 'Finisher', 'Cheap Removal', 'Card Flow'],
        strengths: ['Devastating hand disruption on body', 'Unstoppable titan cast triggers'],
        weaknesses: ['Land destruction / Blood Moon'],
        failureModes: ['Tron disrupted early'],
        recoveryPlan: ['Hardcast with Eldrazi Temple', 'Karn toolbox retrieval'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Pirates & Treasure Tempo
    if (tribe.includes('pirate')) {
      return new DeckIdentity({
        archetypeKey: 'PIRATES_TREASURE_TEMPO',
        gameplan: 'Atacar velozmente con piratas evasivos, generar fichas de Tesoro para acelerar maná y controlar el ritmo con robo y daño.',
        requiredEngines: ['Cheap Pirate Attackers', 'Treasure Generators (Ragavan, Malcolm)', 'Pirate Lords', 'Disruptive Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Treasure acceleration fixes colors and ramps', 'High tempo velocity'],
        weaknesses: ['Vulnerable to early sweepers'],
        failureModes: ['Blockers stopping combat damage treasure triggers'],
        recoveryPlan: ['Treasure mana burst into large finishers'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Beasts & Stompy Midrange
    if (tribe.includes('beast')) {
      return new DeckIdentity({
        archetypeKey: 'BEAST_STOMPY_MIDRANGE',
        gameplan: 'Acelerar maná en turnos 1-2 para encadenar bestias colosales con arrollar y habilidades de combate (Questing Beast, Ravenous Baloth).',
        requiredEngines: ['Mana Dorks', 'Beast Threats (CMC 3-5)', 'Fight Spells', 'Garruk Planeswalkers'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['High toughness blockers', 'Crushing combat power'],
        weaknesses: ['Deathtouch and cheap targeted removal'],
        failureModes: ['Curve stall without ramp'],
        recoveryPlan: ['Garruk beast token generation', 'Card draw on creature power'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Elementals & Landfall Midrange
    if (tribe.includes('elemental')) {
      return new DeckIdentity({
        archetypeKey: 'ELEMENTALS_LANDFALL_MIDRANGE',
        gameplan: 'Disparar efectos de entrada y landfall mediante elementales (Omnath, Risen Reef), generando ventajas masivas de cartas y tierras en juego.',
        requiredEngines: ['Risen Reef Draw Engine', 'Elementals Evoke / ETB', 'Omnath Landfall Payoffs', 'Mana Fixing'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Exponential card and mana acceleration with Risen Reef', 'High flexibility'],
        weaknesses: ['Removal on Risen Reef before trigger chain'],
        failureModes: ['Color screw across 4C/5C'],
        recoveryPlan: ['Omnath life stabilization', 'Massive landfall bursts'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // ─── 1. TRIBAL ARCHETYPES ───────────────────────────────────────────────
    // Hydras & +1/+1 Counters Ramp
    if (tribe.includes('hydra') || strategy.includes('colosal') || (strategy.includes('counter') && tempo.includes('ramp'))) {
      return new DeckIdentity({
        archetypeKey: 'HYDRA_COUNTERS_RAMP',
        gameplan: 'Acelerar maná en turnos 1-2 para desplegar Hidras colosales de coste X que crecen con contadores +1/+1, roban cartas y arrollan la mesa.',
        requiredEngines: ['Ramp Acceleration', 'Hydra Threats', 'Counter Synergy', 'Fight Removal', 'Power Draw'],
        expectedCurveRange: { min: 1, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Counter Synergy', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Massive creature stats', 'Trample evasion', 'Scalable X-spell flexibility', 'Card draw on high power'],
        weaknesses: ['Vulnerable to board sweepers without haste', 'Requires ramp mana fixing'],
        failureModes: ['Mana screw early', 'Sweepers before lethal attack'],
        recoveryPlan: ['Treasure generation on death', 'Sticky hydra engines', 'Draw on big bodies'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Zombies Aristocrats & Graveyard
    if (tribe.includes('zombie') || strategy.includes('zombie')) {
      return new DeckIdentity({
        archetypeKey: 'ZOMBIE_ARISTOCRATS',
        gameplan: 'Dominar la mesa mediante criaturas recurrentes desde el cementerio, señores zombi y drenaje de vidas por sacrificio.',
        requiredEngines: ['Recursive Fodder', 'Sacrifice Outlets', 'Death Payoffs', 'Zombie Lords', 'Graveyard Synergies'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Recursive Fodder', 'Sacrifice Outlet', 'Death Payoff', 'Tribal Density', 'Cheap Removal'],
        strengths: ['Infinite board resilience', 'Non-combat life drain', 'Immune to single spot removal'],
        weaknesses: ['Graveyard hate (Rest in Peace)', 'Exile sweepers'],
        failureModes: ['Graveyard lock', 'No sac outlet drawn'],
        recoveryPlan: ['Direct face drain', 'Zombie token swarm'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Vampires Lifegain & Aggro / Midrange
    if (tribe.includes('vampire') || strategy.includes('vampire')) {
      return new DeckIdentity({
        archetypeKey: 'VAMPIRES_LIFEGAIN_AGGRO',
        gameplan: 'Presión agresiva con vampiros evasivos con vínculo vital, generación de fichas de Sangre y remate castigador de vidas.',
        requiredEngines: ['Evasive Vampires', 'Lifegain Triggers', 'Blood Value', 'Tribal Lords', 'Removal Suite'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Lifegain Trigger', 'Tribal Density', 'Cheap Removal', 'Finisher'],
        strengths: ['Flying/Lifelink pressure', 'Life total advantage', 'Synergistic removal'],
        weaknesses: ['Moderate creature sizing without lords'],
        failureModes: ['Early stall vs high-toughness blockers'],
        recoveryPlan: ['Flying evasion over blockers', 'Blood token filtering'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Merfolk Islandwalk Tempo
    if (tribe.includes('merfolk') || strategy.includes('merfolk')) {
      return new DeckIdentity({
        archetypeKey: 'MERFOLK_TEMPO',
        gameplan: 'Desplegar tritones eficientes potenciados por múltiples señores ({+1/+1}), otorgando cruzar islas y protegiendo la mesa con interacción tempo.',
        requiredEngines: ['Cheap Merfolk', 'Merfolk Lords', 'Islandwalk Enablers', 'Tempo Disruption', 'Card Draw'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Board Presence', 'Tempo Interaction', 'Card Flow'],
        strengths: ['Unblockable lethal swings', 'Instant-speed flash/tricks', 'Redundant lord scaling'],
        weaknesses: ['Damage-based board sweepers'],
        failureModes: ['Sweeper before lethal alpha strike'],
        recoveryPlan: ['Protection counterspells', 'Flash redeployment'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Dragons Big Mana & Flying Beatdown
    if (tribe.includes('dragon') || strategy.includes('dragon')) {
      return new DeckIdentity({
        archetypeKey: 'DRAGONS_BIG_MANA',
        gameplan: 'Acelerar maná mediante tesoros y reductores de coste para encadenar Dragones voladores devastadores con daño de aliento.',
        requiredEngines: ['Treasure / Ramp Acceleration', 'Dragon Flying Threats', 'Dragon Breath Sweep / Removal', 'Dragon Draw Engine'],
        expectedCurveRange: { min: 2, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Dominant flying stats', 'Massive damage triggers', 'Hard to block'],
        weaknesses: ['High mana curve', 'Slow starts if ramp is answered'],
        failureModes: ['Mana screw', 'Fast aggro overwhelm'],
        recoveryPlan: ['Dragon breath sweepers', 'Treasure burst'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // Dinosaurs Enrage & Stompy
    if (tribe.includes('dinosaur') || strategy.includes('dinosaur')) {
      return new DeckIdentity({
        archetypeKey: 'DINOSAUR_STOMPY_RAMP',
        gameplan: 'Rampa de maná y reducción de costes para desplegar Dinosaurios colosales con habilidades de Enfurecer y arrollar.',
        requiredEngines: ['Mana Dorks / Fixers', 'Colossal Dinosaurs', 'Enrage Triggers', 'Fight Removal'],
        expectedCurveRange: { min: 2, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Massive stats per mana', 'Punishes damage-based removal with Enrage', 'Trample trumps chump blockers'],
        weaknesses: ['Targeted exile removal'],
        failureModes: ['Curve failure'],
        recoveryPlan: ['Fight spells for board control', 'Huge trample finishers'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Goblins: Multi-strategic tribal support (Aggro, Sacrifice, Combo, Midrange, Tempo)
    if (tribe.includes('goblin') || strategy.includes('goblin')) {
      const hasWhite = colors.includes('W');
      const hasBlack = colors.includes('B');
      const hasGreen = colors.includes('G');
      const isSacrifice = strategy.includes('sacrifice') || strategy.includes('dies') || mechanics.includes('sacrifice');
      const isCombo = tempo.includes('combo') || strategy.includes('combo') || strategy.includes('snoop');
      const isMidrange = tempo.includes('midrange') || strategy.includes('midrange') || strategy.includes('value');
      const isTempo = tempo.includes('tempo') || strategy.includes('spells') || strategy.includes('prowess');

      if (isSacrifice) {
        return new DeckIdentity({
          archetypeKey: hasBlack ? 'RAKDOS_GOBLINS_SACRIFICE' : 'GOBLIN_SACRIFICE_ARISTOCRATS',
          gameplan: 'Generación de fichas masivas de Trasgos para sacrificarlas como munición en motores de daño directo y drenaje.',
          requiredEngines: ['Token Fodder Generators', 'Sacrifice Outlets', 'Death Damage Payoffs', 'Card Draw Refill'],
          expectedCurveRange: { min: 1, max: 4 },
          mandatoryRoles: ['Fodder Generator', 'Sacrifice Outlet', 'Death Payoff', 'Cheap Removal', 'Card Flow'],
          strengths: ['Bypasses blockers with direct damage', 'High value on creature death'],
          weaknesses: ['Graveyard hate', 'Exile effects'],
          failureModes: ['Disruption of sac outlets'],
          recoveryPlan: ['Direct face burn triggers', 'Secondary token wave'],
          expectedKillTurn: 4,
          requiresManaRamp: false
        });
      }

      if (isCombo) {
        return new DeckIdentity({
          archetypeKey: 'GOBLIN_COMBO_CHAIN',
          gameplan: 'Ensamblar cadenas de búsqueda y aceleración de maná para ejecutar combos de fichas o maná infinito.',
          requiredEngines: ['Mana Accelerators', 'Tutor & Library Manipulation', 'Combo Payoffs', 'Protection'],
          expectedCurveRange: { min: 1, max: 5 },
          mandatoryRoles: ['Mana Acceleration', 'Tutor Engine', 'Combo Piece', 'Cheap Removal', 'Card Flow'],
          strengths: ['Instant deterministic victory', 'Fast setup'],
          weaknesses: ['Spot removal on key combo piece'],
          failureModes: ['Counterspells on tutor'],
          recoveryPlan: ['Secondary value beatdown', 'Graveyard recursion'],
          expectedKillTurn: 4,
          requiresManaRamp: true
        });
      }

      if (isMidrange) {
        return new DeckIdentity({
          archetypeKey: 'GOBLIN_MIDRANGE_VALUE',
          gameplan: 'Desplegar amenazas tribales escalables, señores de trasgos y motores de ventaja de cartas masiva.',
          requiredEngines: ['Value Creatures', 'Goblin Lords', 'Card Advantage Engines', 'Efficient Removal'],
          expectedCurveRange: { min: 1, max: 5 },
          mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Lord Buff', 'Card Flow', 'Cheap Removal'],
          strengths: ['Massive late-game card advantage', 'High threat density'],
          weaknesses: ['Sweepers before value reload'],
          failureModes: ['Mana screw on 4-drop value engines'],
          recoveryPlan: ['Card refill triggers', 'Lord scaling'],
          expectedKillTurn: 5,
          requiresManaRamp: false
        });
      }

      if (isTempo) {
        return new DeckIdentity({
          archetypeKey: 'GOBLIN_TEMPO_SPELLSLINGER',
          gameplan: 'Atacar con trasgos veloces mientras se mantiene el control del tempo con remoción barata y cantrips.',
          requiredEngines: ['Evasive / Haste Attackers', 'Cheap Cantrips', 'Instant Interaction', 'Burn Reach'],
          expectedCurveRange: { min: 1, max: 3 },
          mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Cheap Removal', 'Card Flow', 'Burn Reach'],
          strengths: ['Tempo dominance', 'Disrupts opponent early game'],
          weaknesses: ['Heavy lifegain'],
          failureModes: ['Out-scaled by large midrange blockers'],
          recoveryPlan: ['Burn to the face', 'Card draw reload'],
          expectedKillTurn: 4,
          requiresManaRamp: false
        });
      }

      let archKey = 'MONO_RED_GOBLINS';
      let colorDesc = 'Mono Red';

      if (hasWhite && hasBlack) {
        archKey = 'MARDU_GOBLINS_AGGRO_BURN';
        colorDesc = 'Mardu (R/W/B)';
      } else if (hasBlack) {
        archKey = 'RAKDOS_GOBLINS_AGGRO';
        colorDesc = 'Rakdos (B/R)';
      } else if (hasWhite) {
        archKey = 'BOROS_GOBLINS_AGGRO';
        colorDesc = 'Boros (R/W)';
      } else if (hasGreen) {
        archKey = 'GRUUL_GOBLINS_AGGRO';
        colorDesc = 'Gruul (R/G)';
      }

      return new DeckIdentity({
        archetypeKey: archKey,
        gameplan: `Explosión agresiva de Goblins en ${colorDesc} con atacantes de turno 1-2, sinergia tribal, remoción instantánea de bajo coste y remate directo de daño a la cara.`,
        requiredEngines: ['Token Generation / Swarm', 'Haste Enablers', 'Goblin Lords', 'Burn Reach & Instant Removal'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Burn Finisher', 'Card Flow'],
        strengths: ['Extreme speed', 'Punishes slow mana bases', 'Dual-threat combat & direct burn reach'],
        weaknesses: ['Vulnerable to early sweepers', 'Demands aggressive mana consistency'],
        failureModes: ['High lifegain opponent', 'Stalled board with heavy blockers'],
        recoveryPlan: ['Burn to the face over blockers', 'Haste re-deployment', 'Card flow refill'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Elves Mana Ramp & Overrun
    if (tribe.includes('elf') || strategy.includes('elf')) {
      return new DeckIdentity({
        archetypeKey: 'SELESNYA_ELVES_RAMP',
        gameplan: 'Generación masiva de maná mediante dorks en turnos 1-2 para canalizar un remate Overrun devastador.',
        requiredEngines: ['Mana Dork Swarm', 'Mana Multipliers', 'Elf Lords', 'Overrun Finishers'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Card Flow', 'Finisher'],
        strengths: ['Explosive mana output', 'Fastest non-combo kill potential'],
        weaknesses: ['Vulnerable to early creature sweepers'],
        failureModes: ['Dork sweep T2-T3'],
        recoveryPlan: ['Mass card draw engines', 'Recast swarm'],
        expectedKillTurn: 4,
        requiresManaRamp: true
      });
    }

    // Humans Anthem & Taxes
    if (tribe.includes('human') || strategy.includes('human')) {
      return new DeckIdentity({
        archetypeKey: 'HUMANS_ANTHEM_TAXES',
        gameplan: 'Presión agresiva en turnos 1-3 mediante alta densidad de criaturas de bajo coste, efectos anthem y disrupción tributaria.',
        requiredEngines: ['Go Wide Swarm', 'Anthem Buffs', 'Disruptive Taxes', 'Protection'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Cheap Removal', 'Card Flow'],
        strengths: ['Fast opening', 'High redundancy', 'Disrupts enemy spell timing'],
        weaknesses: ['Vulnerable to damage sweepers'],
        failureModes: ['Board Wipe T3-T4', 'Loss of board presence'],
        recoveryPlan: ['Protection spells (Brave/Guardian)', 'Flash creatures'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Giants Stomp & Midrange
    if (tribe.includes('giant') || mechanics.includes('stomp')) {
      return new DeckIdentity({
        archetypeKey: 'NAYA_GIANTS_STOMP',
        gameplan: 'Dominar el combate mediante criaturas grandes y efectos Stomp, acelerando maná temprano para resolver amenazas de curva 4-6.',
        requiredEngines: ['Early Ramp', 'Cost Reduction', 'Stomp Engine', 'Large Threat Chain'],
        expectedCurveRange: { min: 4, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Large bodies', 'Built-in 2-for-1 adventure interaction', 'High card value'],
        weaknesses: ['Slow opening turns without ramp'],
        failureModes: ['Mana Screw', 'Falta de aceleración inicial'],
        recoveryPlan: ['Stomp adventure removal', 'Card advantage engines'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // Saprolings & Fungus Token Swarm / Midrange
    if (tribe.includes('saproling') || tribe.includes('fungus') || tribe.includes('hongo') || strategy.includes('saprolin') || strategy.includes('fungus')) {
      const isAbzan = colors.includes('W') && colors.includes('B') && colors.includes('G');
      const isGolgari = colors.includes('B') && colors.includes('G');
      const archKey = isAbzan ? 'ABZAN_SAPROLINGS_SWARM' : (isGolgari ? 'GOLGARI_SAPROLINGS_SWARM' : 'SAPROLING_TOKEN_SWARM');

      return new DeckIdentity({
        archetypeKey: archKey,
        gameplan: 'Generar un enjambre masivo de fichas de Saprolín y criaturas Hongo, escalando presencia en mesa con himnos, contadores y drenaje de vidas (Slimefoot / Aristócratas).',
        requiredEngines: ['Saproling Spawners', 'Fungus Spore Engines', 'Swarm Anthems / Buffs', 'Synergistic Removal', 'Token Value / Draw'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Token Generator', 'Tribal Density', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Go-wide board flooding', 'Resilience to spot removal through token generation', 'Aristocrat life drain triggers'],
        weaknesses: ['Low-CMC damage sweepers (Pyroclasm, Brotherhood\'s End)'],
        failureModes: ['Board sweep before anthem buff', 'Falta de generadores tempranos de esporas'],
        recoveryPlan: ['Re-flood with token spells', 'Saproling sacrifice drain triggers'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Oozes Gelatinous Mass / Counters & Control
    if (tribe.includes('ooze') || strategy.includes('ooze') || strategy.includes('gelatina')) {
      const isControl = tempo.includes('control') || strategy.includes('control');
      const isGolgari = colors.includes('B') && colors.includes('G');
      const archKey = isControl ? (isGolgari ? 'GOLGARI_OOZE_CONTROL' : 'OOZE_CONTROL') : 'OOZE_COUNTERS_GROWTH';
      
      return new DeckIdentity({
        archetypeKey: archKey,
        gameplan: isControl 
          ? 'Controlar la mesa con remoción puntual y ventaja de cartas mientras se desarrollan limos resilientes que crecen con contadores y consumen el cementerio.'
          : 'Hacer crecer enjambres de limos mediante contadores +1/+1, multiplicación y consumo de recursos en el cementerio para cerrar con ataques masivos.',
        requiredEngines: ['Ooze Growth Engine', '+1/+1 Counter Synergies', 'Graveyard Scavenging', 'Targeted Removal / Disruption'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Tribal Density', 'Counter Synergy', 'Cheap Removal', 'Card Flow', 'Finisher'],
        strengths: ['Indestructible and growing threats (Predator Ooze, Scavenging Ooze)', 'Graveyard disruption', 'Card advantage through counters'],
        weaknesses: ['Mass board exile effects', 'Early extreme hyper-aggro'],
        failureModes: ['Removal of small initial oozes before counter growth', 'Mana screw on color requirements'],
        recoveryPlan: ['Inspiring Call indestructible / draw', 'Scavenging graveyard for life and size'],
        expectedKillTurn: isControl ? 7 : 5,
        requiresManaRamp: false
      });
    }

    // ─── 2. MECHANICAL & STRATEGIC ENGINES ──────────────────────────────────
    // Blink / Flicker (Ephemerate / Soulherder)
    if (strategy.includes('blink') || strategy.includes('flicker') || mechanics.includes('blink') || mechanics.includes('flicker')) {
      return new DeckIdentity({
        archetypeKey: 'BLINK_FLICKER_VALUE',
        gameplan: 'Exiliar y regresar criaturas continuamente al campo de batalla con efectos de parpadeo (Ephemerate, Soulherder) para disparar habilidades de entrada infinitas.',
        requiredEngines: ['ETB Value Creatures', 'Instant Blink Enablers (Ephemerate)', 'Continuous Flicker Engines (Soulherder)', 'Targeted Interaction'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Turn 1 Play', 'Board Presence', 'Synergy Multiplier', 'Cheap Removal', 'Card Flow'],
        strengths: ['Massive card advantage', 'Blanking enemy spot removal with blink in response'],
        weaknesses: ['Torpor Orb / Hushbringer ETB locks'],
        failureModes: ['Blink spells with no targets on board'],
        recoveryPlan: ['Charming Prince / Wall of Omens early redeployment'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Landfall (Valakut, Omnath, Scapeshift, Land Synergy)
    if (allMechanicalSignals.includes('landfall') || allMechanicalSignals.includes('tierras') || allMechanicalSignals.includes('land_entry') || allMechanicalSignals.includes('land_acceleration')) {
      return new DeckIdentity({
        archetypeKey: 'LANDFALL_ACCELERATION_STOMPY',
        gameplan: 'Jugar múltiples tierras y fetchlands por turno para disparar acumulaciones devastadoras de maná, daño directo y crecimiento de criaturas.',
        requiredEngines: ['Land Acceleration / Fetchlands', 'Landfall Creature Payoffs', 'Additional Land Drops Enablers', 'Card Advantage'],
        expectedCurveRange: { min: 1, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Board Presence', 'Synergy Multiplier', 'Cheap Removal', 'Card Flow'],
        strengths: ['Huge mana advantages', 'Devastating burst damage'],
        weaknesses: ['Blood Moon / land disruption'],
        failureModes: ['Drawing lands with no payoffs or vice versa'],
        recoveryPlan: ['Wrenn and Six / Crucible of Worlds land recursion'],
        expectedKillTurn: 5,
        requiresManaRamp: true
      });
    }

    // Prison / Hatebears / Taxes
    if (allMechanicalSignals.includes('prison') || allMechanicalSignals.includes('tax') || allMechanicalSignals.includes('hatebear') || allMechanicalSignals.includes('impuest')) {
      return new DeckIdentity({
        archetypeKey: 'PRISON_TAXES_CONTROL',
        gameplan: 'Imponer impuestos de maná, bloqueos de ataque y restricciones de casteo al oponente (Thalia, Ghostly Prison, Damping Sphere) para cerrar con ataque asimétrico.',
        requiredEngines: ['Hatebears / Taxing Creatures', 'Taxing Artifacts / Enchantments', 'Protective Ephemerate', 'Removal Suite'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Board Presence', 'Cheap Removal', 'Card Flow'],
        strengths: ['Completely shuts down unfair combo and tempo decks', 'Slows down game to own pace'],
        weaknesses: ['Fair midrange decks with bigger vanilla stats'],
        failureModes: ['Wrong hate piece drawn for opponent\'s deck'],
        recoveryPlan: ['Redundant tax layers', 'Aven Mindcensor search locks'],
        expectedKillTurn: 6,
        requiresManaRamp: false
      });
    }

    // Voltron / Equipment / Auras (Hammer Time / Bogles)
    if (allMechanicalSignals.includes('voltron') || allMechanicalSignals.includes('hammer') || allMechanicalSignals.includes('equipment') || allMechanicalSignals.includes('equipo')) {
      return new DeckIdentity({
        archetypeKey: 'VOLTRON_EQUIPMENT_AGGRO',
        gameplan: 'Equipar armamento devastador (Colossus Hammer, Shadowspear) a coste 0 mediante Sigarda\'s Aid o Puresteel Paladin sobre atacantes evasivos para letal turno 2-3.',
        requiredEngines: ['Cheap Evasive Attackers (Ornithopter, Memnite, Inkmoth)', 'Massive Equipment (Colossus Hammer)', 'Free Equip Enablers (Sigarda\'s Aid, Puresteel Paladin)', 'Protection'],
        expectedCurveRange: { min: 0, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Synergy Multiplier', 'Board Presence', 'Cheap Removal', 'Card Flow'],
        strengths: ['Turn 2-3 kill potential', 'Lifelink races hyper aggro'],
        weaknesses: ['Force of Vigor / instant artifact hate', 'Targeted creature bounce'],
        failureModes: ['Equipment drawn without equip enabler'],
        recoveryPlan: ['Stoneforge Mystic tutoring', 'Urza\'s Saga construct tokens'],
        expectedKillTurn: 3,
        requiresManaRamp: false
      });
    }

    // Cascade (Rhinos, Living End)
    if (allMechanicalSignals.includes('cascade') || allMechanicalSignals.includes('cascada')) {
      return new DeckIdentity({
        archetypeKey: 'CASCADE_FREE_SPELLS',
        gameplan: 'Lanzar hechizos con cascada de coste 3 (Shardless Agent) que garantizan jugar gratis hechizos devastadores de coste 0 (Crashing Footfalls, Living End).',
        requiredEngines: ['Cascade 3-Drops (Shardless Agent, Ardent Plea)', '0-CMC Suspended Payoffs (Crashing Footfalls, Living End)', 'Split/Adventure Interaction (Brazen Borrower, Fire//Ice)', 'Mana Fixing'],
        expectedCurveRange: { min: 3, max: 7 },
        mandatoryRoles: ['Ramp Acceleration', 'Board Presence', 'Synergy Multiplier', 'Cheap Removal', 'Card Flow'],
        strengths: ['Massive Turn 3 board presence (two 4/4 Rhinos with Trample)', 'Built-in card advantage'],
        weaknesses: ['Chalice of the Void on 0', 'Teferi, Time Raveler / Lavinia'],
        failureModes: ['Chalice on 0 countering free spells'],
        recoveryPlan: ['Boseiju / Force of Negation to clear hate', 'Hardcasting split spells'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Storm / Combo Chain
    if (allMechanicalSignals.includes('storm') || allMechanicalSignals.includes('tormenta')) {
      return new DeckIdentity({
        archetypeKey: 'STORM_COMBO_CHAIN',
        gameplan: 'Encadenar múltiples rituales de maná y hechizos cantrip de bajo coste en un solo turno para generar un conteo de tormenta letal con Grapeshot.',
        requiredEngines: ['Mana Rituals (Pyretic, Desperate, Strike It Rich)', 'Cost Reducers (Ral, Goblin Electromancer, Ruby Medallion)', 'Card Advantage Velocity (Past in Flames, Wish, Manamorphose)', 'Storm Finishers (Grapeshot, Empty the Warrens)'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Mana Acceleration', 'Tutor Engine', 'Combo Piece', 'Cheap Removal', 'Card Flow'],
        strengths: ['Non-combat instant victory in a single explosive turn', 'Redundant ritual chains'],
        weaknesses: ['Damping Sphere', 'Flusterstorm / Mindbreak Trap'],
        failureModes: ['Fizzling during combo turn without enough mana or draw'],
        recoveryPlan: ['Past in Flames graveyard recast', 'Empty the Warrens goblin swarm backup'],
        expectedKillTurn: 3,
        requiresManaRamp: true
      });
    }

    // Vehicles (Crew & Artifacts)
    if (allMechanicalSignals.includes('vehicle') || allMechanicalSignals.includes('vehicul') || allMechanicalSignals.includes('crew') || allMechanicalSignals.includes('tripulac')) {
      return new DeckIdentity({
        archetypeKey: 'VEHICLES_CREW_AGGRO',
        gameplan: 'Desplegar pilotos y criaturas baratas para tripular vehículos evasivos y pesados (Smuggler\'s Copter, Heart of Kiran), esquivando limpiamesas conjuros.',
        requiredEngines: ['Low-Cost Pilots / High Power 1-Drops', 'Evasive Vehicles (Smuggler\'s Copter)', 'Artifact Card Advantage', 'Synergistic Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Board Presence', 'Cheap Removal', 'Card Flow'],
        strengths: ['Vehicles immune to sorcery board wipes when uncrewed', 'Looting filtering'],
        weaknesses: ['Instant removal on crew response'],
        failureModes: ['All creatures destroyed leaving uncrewed vehicles'],
        recoveryPlan: ['Man-lands (Mutavault) to crew vehicles', 'Refill threats'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Sacrifice / Aristocrats
    if (allMechanicalSignals.includes('sacrifice') || allMechanicalSignals.includes('dies') || allMechanicalSignals.includes('aristocrat') || allMechanicalSignals.includes('sacrific')) {
      return new DeckIdentity({
        archetypeKey: 'ARISTOCRATS_SACRIFICE',
        gameplan: 'Generar criaturas prescindibles y fichas para sacrificarlas en motores continuos, drenando vida enemiga y obteniendo ventaja de cartas.',
        requiredEngines: ['Recursive Fodder', 'Sacrifice Outlets', 'Death Payoffs', 'Synergistic Removal', 'Card Draw'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Recursive Fodder', 'Sacrifice Outlet', 'Death Payoff', 'Cheap Removal', 'Card Flow'],
        strengths: ['Non-combat inevitability', 'Massive card advantage', 'Blanks enemy spot removal'],
        weaknesses: ['Graveyard hate', 'Exile effects'],
        failureModes: ['Disruption of sac outlets', 'Board exile'],
        recoveryPlan: ['Alternative drain triggers', 'Immediate sac in response to removal'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Reanimator (Strictly requires explicit reanimation intent)
    if (allMechanicalSignals.includes('reanimat') || allMechanicalSignals.includes('resurrect') || allMechanicalSignals.includes('unburial')) {
      return new DeckIdentity({
        archetypeKey: 'REANIMATOR_COMBO',
        gameplan: 'Descartar o enviar amenazas colosales al cementerio en turnos 1-2 para reanimarlas inmediatamente con hechizos de resurrección de bajo coste.',
        requiredEngines: ['Entomb / Looting Enablers', 'Colossal Reanimation Targets', 'Reanimation Spells', 'Protection / Disruption'],
        expectedCurveRange: { min: 1, max: 8 },
        mandatoryRoles: ['Looting Enabler', 'Reanimation Spell', 'Colossal Target', 'Cheap Removal', 'Protection'],
        strengths: ['Turn 2-3 game-ending monsters', 'Cheats massive mana costs'],
        weaknesses: ['Targeted graveyard hate (Leyline, RIP, Soul-Guide)'],
        failureModes: ['Graveyard exile before reanimate', 'Counterspell on reanimate spell'],
        recoveryPlan: ['Hardcast backup plan', 'Hand disruption protection'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Spellslinger / Prowess / Burn
    if (allMechanicalSignals.includes('spellslinger') || allMechanicalSignals.includes('prowess') || allMechanicalSignals.includes('magecraft') || allMechanicalSignals.includes('destreza') || (allMechanicalSignals.includes('burn') && !tribe)) {
      return new DeckIdentity({
        archetypeKey: 'SPELLSLINGER_PROWESS',
        gameplan: 'Encadenar múltiples instantáneos y conjuros baratos de daño y robo para inflar criaturas con destreza y fulminar las vidas del oponente.',
        requiredEngines: ['Prowess Attackers', 'Cheap Cantrips & Draw', 'Direct Burn Removal', 'Cost Reducers / Payoffs'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Prowess Engine', 'Cheap Removal', 'Card Flow', 'Burn Reach'],
        strengths: ['Blistering speed', 'Card velocity keeps hand full', 'Direct burn bypasses blockers'],
        weaknesses: ['Heavy creature removal on prowess threats', 'Lifegain'],
        failureModes: ['All threats removed leaving only cantrips in hand'],
        recoveryPlan: ['Burn to the face', 'Card draw reload'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Artifacts / Affinity
    if (allMechanicalSignals.includes('artifact') || allMechanicalSignals.includes('affinity') || allMechanicalSignals.includes('artefact') || allMechanicalSignals.includes('afinidad') || allMechanicalSignals.includes('metalcraft')) {
      return new DeckIdentity({
        archetypeKey: 'ARTIFACT_AFFINITY',
        gameplan: 'Inundar la mesa con artefactos de coste cero y bajo coste para abaratar cartas con afinidad, equipar bonificaciones masivas y robar en cadena.',
        requiredEngines: ['Cheap Artifact Enablers', 'Affinity / Modular Payoffs', 'Artifact Card Draw', 'Synergistic Interaction'],
        expectedCurveRange: { min: 0, max: 4 },
        mandatoryRoles: ['Cheap Artifact', 'Affinity Payoff', 'Board Presence', 'Card Flow', 'Cheap Removal'],
        strengths: ['Huge mana cheat', 'Explosive Turn 1-2 vomit onto board', 'Heavy scaling stats'],
        weaknesses: ['Artifact sweepers (Brotherhood\'s End, Vandalblast)'],
        failureModes: ['Board sweep before damage conversion'],
        recoveryPlan: ['Thoughtcast refill', 'Modular counter transfer'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Enchantress / Voltron / Auras
    if (allMechanicalSignals.includes('enchant') || allMechanicalSignals.includes('aura') || allMechanicalSignals.includes('encantamiento') || allMechanicalSignals.includes('constellation')) {
      return new DeckIdentity({
        archetypeKey: 'ENCHANTRESS_VOLTRON',
        gameplan: 'Jugar encantamientos y auras acumulativas sobre criaturas evasivas o con antimaleficio, robando cartas con cada encantamiento jugado.',
        requiredEngines: ['Hexproof / Evasive Threats', 'Aura Buffs', 'Enchantress Draw Engines', 'Aura-based Removal'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Voltron Threat', 'Aura Buff', 'Enchantress Engine', 'Cheap Removal', 'Card Flow'],
        strengths: ['Un-targetable giant threats', 'Perpetual card draw draw engine', 'Lifelink races aggro'],
        weaknesses: ['Edict sacrifice effects', 'Enchantment sweepers'],
        failureModes: ['Sacrifice edict removing single tall creature'],
        recoveryPlan: ['Totem armor protection', 'Draw refill'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Lifegain & Growth
    if (allMechanicalSignals.includes('lifegain') || allMechanicalSignals.includes('lifelink') || (allMechanicalSignals.includes('vida') && !tribe)) {
      return new DeckIdentity({
        archetypeKey: 'LIFEGAIN_GROWTH',
        gameplan: 'Disparar ganancias constantes de vida en cada turno para hacer crecer criaturas exponencialmente (+1/+1) y activar ventajas abrumadoras.',
        requiredEngines: ['Lifegain Triggers', 'Growth Payoffs (+1/+1)', 'Evasive Lifelinkers', 'Synergistic Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Lifegain Trigger', 'Growth Payoff', 'Board Presence', 'Cheap Removal'],
        strengths: ['Impossible to race in combat', 'Rapid creature stat inflation'],
        weaknesses: ['Board sweepers', 'Inability to gain life if board is kept clean'],
        failureModes: ['Early stall vs control'],
        recoveryPlan: ['Resilient lifelink threats', 'Card draw triggers on lifegain'],
        expectedKillTurn: 5,
        requiresManaRamp: false
      });
    }

    // Counters / Proliferate / +1/+1 Scales
    if (allMechanicalSignals.includes('counter') || allMechanicalSignals.includes('+1/+1') || allMechanicalSignals.includes('proliferat') || allMechanicalSignals.includes('modular') || allMechanicalSignals.includes('scales')) {
      return new DeckIdentity({
        archetypeKey: 'COUNTERS_PROLIFERATE_ENGINE',
        gameplan: 'Colocar contadores +1/+1 sobre criaturas y artefactos de bajo coste para multiplicarlos con proliferación y sinergias de escala.',
        requiredEngines: ['Counter Enablers', 'Counter Payoffs & Scaling', 'Proliferate Velocity', 'Synergistic Removal'],
        expectedCurveRange: { min: 1, max: 4 },
        mandatoryRoles: ['Turn 1 Play', 'Counter Engine', 'Counter Payoff', 'Board Presence', 'Cheap Removal'],
        strengths: ['Exponential creature scaling', 'Flexible threat diversification'],
        weaknesses: ['Mass bounce / sweepers'],
        failureModes: ['Losing tall counters creature to cheap spot removal before payoff'],
        recoveryPlan: ['Ozolith counter retention', 'Recursive modular threats'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // Control / Reactive
    if (tempo.includes('control') || mechanics.includes('counterspell') || strategy.includes('control')) {
      return new DeckIdentity({
        archetypeKey: 'CONTROL_REACTIVE',
        gameplan: 'Neutralizar amenazas enemigas mediante contrahechizos, remoción puntual y barrenderos de mesa, ganando ventaja de cartas y cerrando con inevitabilidad.',
        requiredEngines: ['Targeted Spot Removal', 'Counterspell Suite', 'Board Sweepers', 'Card Draw Engines', 'Inevitable Finisher'],
        expectedCurveRange: { min: 1, max: 6 },
        mandatoryRoles: ['Cheap Removal', 'Counterspell Suite', 'Board Sweeper', 'Card Flow', 'Finisher'],
        strengths: ['Answers every threat type', 'Extreme late-game inevitability', 'Virtually impossible to defeat once stabilized'],
        weaknesses: ['Fast aggressive starts under counter mana', 'Uncounterable threats'],
        failureModes: ['Early aggro blitz before stabilization'],
        recoveryPlan: ['Turn 3-4 Board Sweepers', 'Lifegain stabilization'],
        expectedKillTurn: 8,
        requiresManaRamp: false
      });
    }

    // Ramp / Big Mana Generic
    if (tempo.includes('ramp') || strategy.includes('ramp') || strategy.includes('big')) {
      return new DeckIdentity({
        archetypeKey: 'RAMP_BIG_MANA',
        gameplan: 'Acelerar la producción de maná en turnos 1-3 para resolver amenazas devastadoras de coste 5+ mucho antes de lo previsto por el turno.',
        requiredEngines: ['Mana Dorks / Acceleration', 'Big Mana Threats', 'Card Advantage Engines', 'Board Interaction'],
        expectedCurveRange: { min: 1, max: 7 },
        mandatoryRoles: ['Ramp Acceleration', 'Board Presence', 'Finisher', 'Cheap Removal', 'Card Flow'],
        strengths: ['Out-scales any fair board state', 'Endless threat chain'],
        weaknesses: ['Drawing high-cost threats without ramp enablers'],
        failureModes: ['Mana screw', 'Aggro kill before T4 threat'],
        recoveryPlan: ['High-toughness ramp blockers', 'Sweepers into big finish'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // ─── 3. UNIVERSAL DYNAMIC ADAPTIVE IDENTITY SYNTHESIZER ─────────────────
    // For any custom or arbitrary combination, synthesize a bespoke identity.
    const isAggro = tempo.includes('aggro');
    const isTempo = tempo.includes('tempo');
    const isRamp = tempo.includes('ramp') || strategy.includes('ramp') || strategy.includes('big');
    const isControl = tempo.includes('control');
    const isCombo = tempo.includes('combo');

    const curveMin = (isAggro || isTempo) ? 1 : 1;
    const curveMax = isRamp ? 7 : (isControl ? 6 : (isAggro ? 3 : 5));
    const killTurn = isAggro ? 4 : (isTempo ? 4 : (isCombo ? 4 : (isRamp ? 6 : (isControl ? 8 : 5))));

    const hasSpecificTribe = tribe && tribe !== 'none' && tribe !== 'general' && tribe !== 'null' && tribe !== 'universal';
    const dynamicArchKey = hasSpecificTribe
      ? `${tribe.toUpperCase()}_${tempo.toUpperCase()}_ADAPTIVE`
      : `${colors.join('_') || 'COLORLESS'}_${tempo.toUpperCase()}_${strategy ? strategy.toUpperCase().replace(/\s+/g, '_').slice(0, 15) : 'STRATEGIC'}`;

    return new DeckIdentity({
      archetypeKey: dynamicArchKey,
      gameplan: `Plan de juego adaptativo y altamente estructurado basado en sinergia ${strategy || tempo} con colores [${colorStr || 'Incoloro'}] y foco en ${hasSpecificTribe ? tribe : 'arquetipo general'}.`,
      requiredEngines: isRamp 
        ? ['Mana Ramp / Acceleration', 'Threat Curve Payoffs', 'Card Advantage', 'Removal / Interaction']
        : (isControl 
          ? ['Removal Suite', 'Countermagic / Disruption', 'Board Sweepers', 'Card Draw', 'Finisher']
          : (isAggro 
            ? ['Turn 1 Beaters', 'Turn 2 Pressure', 'Synergy Payoffs', 'Direct Reach / Removal']
            : ['Board Presence', 'Synergy Multipliers', 'Card Flow Engine', 'Targeted Removal'])),
      expectedCurveRange: { min: curveMin, max: curveMax },
      mandatoryRoles: isRamp 
        ? ['Ramp Acceleration', 'Board Presence', 'Finisher', 'Cheap Removal', 'Card Flow']
        : (isControl 
          ? ['Cheap Removal', 'Counterspell Suite', 'Board Sweeper', 'Card Flow', 'Finisher']
          : ['Turn 1 Play', 'Turn 2 Pressure', 'Board Presence', 'Cheap Removal', 'Card Flow']),
      strengths: ['Color pie optimization', 'High structural cohesion', 'Proactive curve efficiency'],
      weaknesses: ['Specialized hate cards'],
      failureModes: ['Draw variance without core enablers'],
      recoveryPlan: ['Card flow engines and secondary lines of play'],
      expectedKillTurn: killTurn,
      requiresManaRamp: isRamp
    });
  }
}
