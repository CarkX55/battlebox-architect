/**
 * CapabilityOntology.js - Version 1
 * 100% Data-Driven Declarative Taxonomy.
 * Contains ZERO imperative functions. Pure data constants only.
 */

export const CapabilityOntology = Object.freeze({
  version: 1,
  compatibleUntil: 2,
  
  capabilities: Object.freeze({
    ManaAcceleration: Object.freeze({
      id: 'ManaAcceleration',
      requires: Object.freeze([]),
      produces: Object.freeze(['ManaResource']),
      consumes: Object.freeze(['TapAction']),
      transforms: Object.freeze([])
    }),
    CardDraw: Object.freeze({
      id: 'CardDraw',
      requires: Object.freeze([]),
      produces: Object.freeze(['CardInHand']),
      consumes: Object.freeze(['ManaResource']),
      transforms: Object.freeze([])
    }),
    SingleTargetRemoval: Object.freeze({
      id: 'SingleTargetRemoval',
      requires: Object.freeze([]),
      produces: Object.freeze(['ThreatNeutralized']),
      consumes: Object.freeze(['ManaResource']),
      transforms: Object.freeze([])
    }),
    BoardReset: Object.freeze({
      id: 'BoardReset',
      requires: Object.freeze([]),
      produces: Object.freeze(['BoardCleared']),
      consumes: Object.freeze(['ManaResource']),
      transforms: Object.freeze([])
    }),
    TokenGeneration: Object.freeze({
      id: 'TokenGeneration',
      requires: Object.freeze([]),
      produces: Object.freeze(['CreatureOnBoard']),
      consumes: Object.freeze(['ManaResource']),
      transforms: Object.freeze([])
    }),
    SacrificeOutlet: Object.freeze({
      id: 'SacrificeOutlet',
      requires: Object.freeze(['CreatureOnBoard']),
      produces: Object.freeze(['DeathTrigger', 'ResourceGain']),
      consumes: Object.freeze(['CreatureOnBoard']),
      transforms: Object.freeze([])
    }),
    ReanimateTarget: Object.freeze({
      id: 'ReanimateTarget',
      requires: Object.freeze(['CreatureInGY']),
      produces: Object.freeze(['CreatureOnBoard']),
      consumes: Object.freeze(['ManaResource', 'LifeResource']),
      transforms: Object.freeze([])
    }),
    SelfMill: Object.freeze({
      id: 'SelfMill',
      requires: Object.freeze([]),
      produces: Object.freeze(['CreatureInGY']),
      consumes: Object.freeze(['ManaResource']),
      transforms: Object.freeze([])
    })
  })
});
