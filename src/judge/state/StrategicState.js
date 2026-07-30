/**
 * StrategicState.js
 * SSA-Style Pure Observable GameState Engine.
 * Contains ZERO heuristic score properties. Facts only.
 */

export class StrategicState {
  constructor({
    board = [],
    hands = [],
    graveyards = [],
    manaPools = {},
    continuousEffects = [],
    stack = [],
    turn = 1,
    lifeTotals = { player: 20, opponent: 20 },
    resources = {}
  } = {}) {
    this.board = Object.freeze([...board]);
    this.hands = Object.freeze([...hands]);
    this.graveyards = Object.freeze([...graveyards]);
    this.manaPools = Object.freeze({ ...manaPools });
    this.continuousEffects = Object.freeze([...continuousEffects]);
    this.stack = Object.freeze([...stack]);
    this.turn = turn;
    this.lifeTotals = Object.freeze({ ...lifeTotals });
    this.resources = Object.freeze({ ...resources });

    Object.freeze(this);
  }

  transition(action, updates = {}) {
    return new StrategicState({
      board: updates.board || this.board,
      hands: updates.hands || this.hands,
      graveyards: updates.graveyards || this.graveyards,
      manaPools: updates.manaPools || this.manaPools,
      continuousEffects: updates.continuousEffects || this.continuousEffects,
      stack: updates.stack || this.stack,
      turn: updates.turn !== undefined ? updates.turn : this.turn,
      lifeTotals: updates.lifeTotals || this.lifeTotals,
      resources: updates.resources || this.resources
    });
  }
}
