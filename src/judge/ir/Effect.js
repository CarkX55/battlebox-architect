/**
 * Effect.js - Version 1
 * Quantified orthogonal effect dimensions.
 */

export class Effect {
  static LIFETIMES = Object.freeze({ TRANSIENT: 'Transient', PERMANENT: 'Permanent' });
  static LATENCIES = Object.freeze({ IMMEDIATE: 'Immediate', NEXT_TURN: 'NextTurn', DELAYED: 'Delayed' });
  static REPEATABILITIES = Object.freeze({ ONE_SHOT: 'OneShot', TURN_ONCE: 'TurnOnce', INFINITE: 'Infinite' });
  static SCOPES = Object.freeze({ SELF: 'Self', TARGETED: 'Targeted', GLOBAL: 'Global' });
  static RELIABILITIES = Object.freeze({ CERTAIN: '100%', CONDITIONAL: 'Conditional' });

  constructor({
    lifetime = Effect.LIFETIMES.PERMANENT,
    latency = Effect.LATENCIES.IMMEDIATE,
    repeatability = Effect.REPEATABILITIES.ONE_SHOT,
    scope = Effect.SCOPES.SELF,
    reliability = Effect.RELIABILITIES.CERTAIN
  } = {}) {
    this.lifetime = lifetime;
    this.latency = latency;
    this.repeatability = repeatability;
    this.scope = scope;
    this.reliability = reliability;

    Object.freeze(this);
  }
}
