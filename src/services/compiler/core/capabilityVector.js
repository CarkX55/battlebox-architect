import { CapabilityAxisID, normalizeCapabilityAxisId } from './capabilityAxisId.js';

export const OptimizationMode = Object.freeze({
  MAXIMIZE: 'MAXIMIZE',
  MINIMIZE: 'MINIMIZE',
  EXACT: 'EXACT',
  AT_LEAST: 'AT_LEAST',
  AT_MOST: 'AT_MOST'
});

export class CapabilityAxis {
  constructor({
    id,
    target = 0,
    current = 0,
    weight = 1.0,
    softLimit = null,
    hardLimit = null,
    tolerance = 0.05,
    mandatory = false,
    optimizationMode = OptimizationMode.AT_LEAST
  }) {
    if (!id) throw new Error('[CapabilityAxis Error] Axis id is required.');
    
    this.id = normalizeCapabilityAxisId(id);
    this.target = Number(target);
    this.current = Number(current);
    this.weight = Number(weight);
    this.softLimit = softLimit !== null ? Number(softLimit) : null;
    this.hardLimit = hardLimit !== null ? Number(hardLimit) : null;
    this.tolerance = Number(tolerance);
    this.mandatory = Boolean(mandatory);
    this.optimizationMode = optimizationMode;

    Object.freeze(this);
  }

  get residual() {
    return this.current - this.target;
  }

  get isSatisfied() {
    switch (this.optimizationMode) {
      case OptimizationMode.AT_LEAST:
        return this.current >= (this.target * (1 - this.tolerance));
      case OptimizationMode.AT_MOST:
        return this.current <= (this.target * (1 + this.tolerance));
      case OptimizationMode.EXACT:
        return Math.abs(this.current - this.target) <= (this.target * this.tolerance);
      case OptimizationMode.MAXIMIZE:
        return this.current > 0;
      case OptimizationMode.MINIMIZE:
        return this.hardLimit ? this.current <= this.hardLimit : true;
      default:
        return this.current >= this.target;
    }
  }

  toJSON() {
    return {
      id: this.id,
      target: this.target,
      current: this.current,
      residual: this.residual,
      weight: this.weight,
      mandatory: this.mandatory,
      satisfied: this.isSatisfied,
      optimizationMode: this.optimizationMode
    };
  }
}

export class CapabilityVector {
  constructor(axes = []) {
    this._axesMap = new Map();

    for (const axisData of axes) {
      const axis = axisData instanceof CapabilityAxis ? axisData : new CapabilityAxis(axisData);
      this._axesMap.set(axis.id, axis);
    }

    Object.freeze(this);
  }

  /**
   * Get an axis by id.
   * @param {string} axisId
   * @returns {CapabilityAxis|null}
   */
  getAxis(axisId) {
    return this._axesMap.get(axisId) || null;
  }

  /**
   * Get all axes array.
   * @returns {CapabilityAxis[]}
   */
  get axes() {
    return Array.from(this._axesMap.values());
  }

  /**
   * Compute total residual vector magnitude (distance between target and current).
   * @returns {number}
   */
  computeResidualMagnitude() {
    let totalResidualSq = 0;
    for (const axis of this._axesMap.values()) {
      if (axis.mandatory && !axis.isSatisfied) {
        totalResidualSq += Math.pow(axis.residual * 2, 2); // Heavy penalty for mandatory breach
      } else {
        totalResidualSq += Math.pow(axis.residual, 2);
      }
    }
    return Math.sqrt(totalResidualSq);
  }

  toJSON() {
    const obj = {};
    for (const [id, axis] of this._axesMap.entries()) {
      obj[id] = axis.toJSON();
    }
    return obj;
  }
}
