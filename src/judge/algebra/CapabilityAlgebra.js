/**
 * CapabilityAlgebra.js
 * Mathematical rules governing state transitions, preservation, and invalidation.
 */

export const CapabilityAlgebra = Object.freeze({
  rules: Object.freeze({
    BoardReset: Object.freeze({
      preconditions: Object.freeze(['CreaturesOnBoard']),
      effects: Object.freeze(['BoardCleared']),
      preserves: Object.freeze(['LifeTotal', 'HandCards']),
      invalidates: Object.freeze(['CreatureDensity', 'TokenSwarm'])
    }),
    ManaAcceleration: Object.freeze({
      preconditions: Object.freeze([]),
      effects: Object.freeze(['TempoAdvantage']),
      preserves: Object.freeze(['BoardState']),
      invalidates: Object.freeze([])
    })
  })
});
