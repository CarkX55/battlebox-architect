/**
 * src/services/compiler/core/prng.js
 * 
 * Deterministic PRNG Engine v28.1 (Mulberry32 + SplitMix32 Seed Expander).
 * Provides 100% reproducible pseudo-random number generation for simulations.
 * 
 * INVARIANT: Identical seeds produce bitwise-identical sequence outputs across all platforms.
 */

export class PRNG {
  /**
   * Constructs a PRNG instance with a numeric or string seed.
   * @param {number|string} seed 
   */
  constructor(seed = 472918) {
    this.initialSeed = seed;
    this.state = this._hashSeed(seed);
  }

  /**
   * Internal 32-bit hash function to initialize state from any input seed.
   * @private
   */
  _hashSeed(seed) {
    if (typeof seed === 'number' && Number.isInteger(seed) && seed !== 0) {
      return (seed >>> 0);
    }
    const str = String(seed);
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h === 0 ? 1 : h;
  }

  /**
   * Generates the next pseudo-random floating point number in [0, 1).
   * Uses Mulberry32 algorithm.
   * @returns {number}
   */
  next() {
    let z = (this.state += 0x6D2B79F5) >>> 0;
    z = Math.imul(z ^ (z >>> 15), (z | 1) >>> 0);
    z ^= z + Math.imul(z ^ (z >>> 7), (z | 61) >>> 0);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a random integer in inclusive range [min, max].
   * @param {number} min 
   * @param {number} max 
   * @returns {number}
   */
  nextInt(min, max) {
    const minInt = Math.ceil(min);
    const maxInt = Math.floor(max);
    return minInt + Math.floor(this.next() * (maxInt - minInt + 1));
  }

  /**
   * Performs an in-place or pure deterministic Fisher-Yates shuffle.
   * @param {Array<any>} array 
   * @param {boolean} inPlace 
   * @returns {Array<any>}
   */
  shuffle(array = [], inPlace = false) {
    const arr = inPlace ? array : [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
    return arr;
  }

  /**
   * Returns a random item from the array.
   * @param {Array<any>} array 
   * @returns {any}
   */
  sample(array = []) {
    if (!array || array.length === 0) return null;
    const idx = Math.floor(this.next() * array.length);
    return array[idx];
  }

  /**
   * Returns a weighted random selection.
   * @param {Array<{ item: any, weight: number }>} weightedItems 
   * @returns {any}
   */
  weightedChoice(weightedItems = []) {
    if (!weightedItems || weightedItems.length === 0) return null;
    const totalWeight = weightedItems.reduce((sum, w) => sum + Math.max(0, Number(w.weight || 0)), 0);
    if (totalWeight <= 0) return weightedItems[0].item;

    let threshold = this.next() * totalWeight;
    for (const entry of weightedItems) {
      const w = Math.max(0, Number(entry.weight || 0));
      if (threshold <= w) {
        return entry.item;
      }
      threshold -= w;
    }
    return weightedItems[weightedItems.length - 1].item;
  }

  /**
   * Exports serializable state snapshot.
   */
  getState() {
    return {
      initialSeed: this.initialSeed,
      currentState: this.state
    };
  }

  /**
   * Restores state from a snapshot.
   */
  setState(stateObj) {
    if (stateObj && typeof stateObj.currentState === 'number') {
      this.state = stateObj.currentState >>> 0;
    }
  }

  /**
   * Creates a sub-PRNG derived deterministically from the current state.
   * @param {string|number} subKey 
   * @returns {PRNG}
   */
  fork(subKey = '') {
    const derivedSeed = (this.state ^ this._hashSeed(subKey)) >>> 0;
    return new PRNG(derivedSeed);
  }
}
