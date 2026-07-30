/**
 * StrategyOntology.js - Version 1
 * 100% Data-Driven Strategy & Archetype Taxonomy.
 * Contains ZERO imperative functions. Pure data mappings of MTG archetypes and invariants.
 */

export const StrategyOntology = Object.freeze({
  version: 1,
  compatibleUntil: 2,

  archetypes: Object.freeze({
    Ramp: Object.freeze({
      id: 'Ramp',
      consumedCapabilities: Object.freeze(['ManaAcceleration', 'CardDraw', 'SingleTargetRemoval']),
      invariants: Object.freeze([
        Object.freeze({ id: 'EarlyRampBeforeT3', description: 'Deck must accelerate mana before turn 3', mandatory: true }),
        Object.freeze({ id: 'HasPayoffs', description: 'Deck must contain high-mana payoff threats', mandatory: true }),
        Object.freeze({ id: 'ManaSinkConversion', description: 'Deck must convert excess mana in late game', mandatory: true })
      ])
    }),
    Aristocrats: Object.freeze({
      id: 'Aristocrats',
      consumedCapabilities: Object.freeze(['TokenGeneration', 'SacrificeOutlet', 'CardDraw']),
      invariants: Object.freeze([
        Object.freeze({ id: 'FodderPresence', description: 'Deck must generate sacrificial creature fodder', mandatory: true }),
        Object.freeze({ id: 'SacrificeEngine', description: 'Deck must contain repeatable sacrifice outlets', mandatory: true }),
        Object.freeze({ id: 'DeathDrainPayoff', description: 'Deck must contain death trigger drain/payoff effects', mandatory: true })
      ])
    }),
    Reanimator: Object.freeze({
      id: 'Reanimator',
      consumedCapabilities: Object.freeze(['SelfMill', 'ReanimateTarget', 'SingleTargetRemoval']),
      invariants: Object.freeze([
        Object.freeze({ id: 'GraveyardEnabler', description: 'Deck must put creatures into graveyard', mandatory: true }),
        Object.freeze({ id: 'ReanimationSpell', description: 'Deck must possess reanimation spells', mandatory: true }),
        Object.freeze({ id: 'HighValueTarget', description: 'Deck must possess game-ending reanimation targets', mandatory: true })
      ])
    })
  })
});
