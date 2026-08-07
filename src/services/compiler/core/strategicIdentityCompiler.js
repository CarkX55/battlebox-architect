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
    const colors = intentPackage.colors || [];

    // 1. Naya / Tribal Giants Stomp
    if (tribe.includes('giant') || mechanics.includes('stomp')) {
      return new DeckIdentity({
        archetypeKey: 'NAYA_GIANTS_STOMP',
        gameplan: 'Dominar el combate mediante criaturas grandes y efectos Stomp, acelerando mana temprano para resolver amenazas de curva 4-6.',
        requiredEngines: ['Early Ramp', 'Cost Reduction', 'Stomp Engine', 'Large Threat Chain', 'Combat Dominance'],
        expectedCurveRange: { min: 4, max: 6 },
        mandatoryRoles: ['Mana Acceleration', 'Stomp Spell', 'Big Threat', 'Board Sweep'],
        strengths: ['Large bodies', 'Built-in interaction (Stomp)', 'High card value'],
        weaknesses: ['Slow opening turns', 'High mana costs', 'Vulnerable to fast aggro'],
        failureModes: ['Mana Screw', 'Curve demasiado alta', 'Falta de aceleracion inicial'],
        recoveryPlan: ['Aceleracion T1-T2', 'Removal barato', 'Motores de ventaja de cartas'],
        expectedKillTurn: 6,
        requiresManaRamp: true
      });
    }

    // 2. Humans Aggro / Swarm
    if (tribe.includes('human')) {
      return new DeckIdentity({
        archetypeKey: 'BOROS_HUMANS_AGGRO',
        gameplan: 'Presión agresiva en turnos 1-3 mediante alta densidad de criaturas de bajo coste, efectos anthem y disrupción liviana.',
        requiredEngines: ['Go Wide Swarm', 'Anthem Buffs', 'Cheap Disruptive Humans'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Creature', 'Turn 2 Lord', 'Anthem Effect', 'Cheap Removal'],
        strengths: ['Fast opening', 'High redundancy', 'Punishes slow decks'],
        weaknesses: ['Vulnerable to board sweepers', 'Low individual card power'],
        failureModes: ['Board Wipe', 'Falta de remate T4'],
        recoveryPlan: ['Cartas con Flash', 'Resistencia a removal'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // 3. Goblins Burn / Tokens
    if (tribe.includes('goblin')) {
      return new DeckIdentity({
        archetypeKey: 'MONO_RED_GOBLINS',
        gameplan: 'Explosión de tokens de bajo coste con prisa y remate directo de daño.',
        requiredEngines: ['Token Generation', 'Haste Enablers', 'Burn Finishers'],
        expectedCurveRange: { min: 1, max: 3 },
        mandatoryRoles: ['Turn 1 Haste', 'Token Maker', 'Sacrifice Outlet', 'Direct Damage'],
        strengths: ['Extreme speed', 'Punishes unestablished boards'],
        weaknesses: ['Fragile creatures', 'Depletes hand quickly'],
        failureModes: ['Life gain opponent', 'Early blockers'],
        recoveryPlan: ['Burn to the face', 'Token swarm'],
        expectedKillTurn: 4,
        requiresManaRamp: false
      });
    }

    // 4. Elves Mana Ramp / Overrun
    if (tribe.includes('elf')) {
      return new DeckIdentity({
        archetypeKey: 'SELESNYA_ELVES_RAMP',
        gameplan: 'Generación masiva de maná mediante dorks en turnos 1-2 para canalizar un remate Overrun devastador.',
        requiredEngines: ['Mana Dork Swarm', 'Mana Multipliers', 'Overrun Finishers'],
        expectedCurveRange: { min: 1, max: 5 },
        mandatoryRoles: ['Mana Dork', 'Mana Multiplier', 'Card Advantage Engine', 'Overrun Finisher'],
        strengths: ['Explosive mana output', 'Fast kill potential'],
        weaknesses: ['Vulnerable to creature removal'],
        failureModes: ['Dork sweep'],
        recoveryPlan: ['Card draw engines'],
        expectedKillTurn: 4,
        requiresManaRamp: true
      });
    }

    // 5. Control / Reactive
    if (tempo.includes('control') || mechanics.includes('counterspell')) {
      return new DeckIdentity({
        archetypeKey: 'AZORIUS_CONTROL',
        gameplan: 'Neutralizar amenazas enemigas mediante contrahechizos y barrenderos de mesa, cerrando la partida con rematadores evasivos.',
        requiredEngines: ['Counterspell Suite', 'Board Sweepers', 'Card Draw Engine', 'Finisher Threat'],
        expectedCurveRange: { min: 2, max: 6 },
        mandatoryRoles: ['Counterspell', 'Board Wipe', 'Instant Card Draw', 'Win Condition'],
        strengths: ['High late-game control', 'Answers everything'],
        weaknesses: ['Slow kill speed', 'Vulnerable to uncounterable threats'],
        failureModes: ['Early aggro overrun'],
        recoveryPlan: ['Turn 4 Wrath', 'Planeswalker lock'],
        expectedKillTurn: 8,
        requiresManaRamp: false
      });
    }

    // Default Fallback: Generic Archetype Identity
    return new DeckIdentity({
      archetypeKey: `${tempo.toUpperCase()}_GENERIC`,
      gameplan: `Plan de juego adaptativo basado en tempo ${intentPackage.tempo} y colores ${colors.join('/')}.`,
      requiredEngines: ['Early Board Presence', 'Interaction Suite', 'Curve Execution'],
      expectedCurveRange: { min: 1, max: 5 },
      mandatoryRoles: ['Early Play', 'Removal', 'Card Flow'],
      strengths: ['Balanced curve'],
      weaknesses: ['Generalist approach'],
      failureModes: ['Mana variance'],
      recoveryPlan: ['Standard card flow'],
      expectedKillTurn: tempo.includes('aggro') ? 4 : 6,
      requiresManaRamp: tempo.includes('ramp')
    });
  }
}
