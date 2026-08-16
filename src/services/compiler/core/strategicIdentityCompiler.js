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
    const tribe = (intentPackage.primaryTribe || '').toLowerCase();
    const tempo = (intentPackage.tempo || '').toLowerCase();
    const mechanics = (intentPackage.mechanics || []).map(m => m.toLowerCase());
    const strategy = (intentPackage.strategy || []).map(s => s.toLowerCase()).join(' ');
    const colors = intentPackage.colors || [];
    const colorStr = colors.join('/');

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

    // Goblins Burn / Swarm
    if (tribe.includes('goblin') || strategy.includes('goblin')) {
      return new DeckIdentity({
        archetypeKey: 'MONO_RED_GOBLINS',
        gameplan: 'Explosión de tokens de bajo coste con prisa, señores de ataque y remate directo de daño a la cara.',
        requiredEngines: ['Token Generation', 'Haste Enablers', 'Goblin Lords', 'Burn Finishers'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Tribal Density', 'Sacrifice Outlet', 'Cheap Removal'],
        strengths: ['Extreme speed', 'Punishes unestablished boards', 'Goblin Grenade reach'],
        weaknesses: ['Fragile creatures', 'Depletes hand quickly'],
        failureModes: ['High lifegain opponent', 'Early big blockers'],
        recoveryPlan: ['Burn to the face', 'Token swarm refill'],
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
        expectedCurveRange: { min: 2, max: 6 },
        mandatoryRoles: ['Ramp Acceleration', 'Tribal Density', 'Board Presence', 'Finisher', 'Cheap Removal'],
        strengths: ['Large bodies', 'Built-in 2-for-1 adventure interaction', 'High card value'],
        weaknesses: ['Slow opening turns without ramp'],
        failureModes: ['Mana Screw', 'Falta de aceleración inicial'],
        recoveryPlan: ['Stomp adventure removal', 'Card advantage engines'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // ─── 2. MECHANICAL & STRATEGIC ENGINES ──────────────────────────────────
    // Sacrifice / Aristocrats
    if (strategy.includes('sacrifice') || strategy.includes('dies') || strategy.includes('aristocrat') || mechanics.includes('sacrifice')) {
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

    // Reanimator
    if (strategy.includes('reanimat') || strategy.includes('graveyard') || strategy.includes('discard') || mechanics.includes('reanimate')) {
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
    if (strategy.includes('spell') || strategy.includes('prowess') || strategy.includes('burn') || mechanics.includes('prowess') || mechanics.includes('magecraft')) {
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
    if (strategy.includes('artifact') || strategy.includes('affinity') || mechanics.includes('affinity') || mechanics.includes('metalcraft')) {
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
    if (strategy.includes('enchant') || strategy.includes('aura') || strategy.includes('voltron') || mechanics.includes('constellation')) {
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

    // Lifegain & +1/+1 Growth
    if (strategy.includes('life') || mechanics.includes('lifelink')) {
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

    // Default Fallback: General Balanced Strategic Identity
    return new DeckIdentity({
      archetypeKey: `${tempo.toUpperCase()}_STRATEGIC`,
      gameplan: `Plan de juego adaptativo y altamente sinérgico basado en tempo ${intentPackage.tempo} y colores ${colorStr}.`,
      requiredEngines: ['Early Curve Presence', 'Synergistic Interaction', 'Card Advantage Engine', 'Finisher Chain'],
      expectedCurveRange: { min: 1, max: 5 },
      mandatoryRoles: ['Turn 1 Play', 'Turn 2 Pressure', 'Board Presence', 'Cheap Removal', 'Card Flow'],
      strengths: ['Solid curve efficiency', 'High flexibility'],
      weaknesses: ['Generalist approach'],
      failureModes: ['Draw inconsistency'],
      recoveryPlan: ['Card flow engines'],
      expectedKillTurn: tempo.includes('aggro') ? 4 : 6,
      requiresManaRamp: tempo.includes('ramp')
    });
  }
}
