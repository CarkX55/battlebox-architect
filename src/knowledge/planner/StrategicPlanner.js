/**
 * StrategicPlanner.js
 * Quantifiable Strategic Planner.
 * Translates human intent into quantifiable strategic contracts.
 */

export class StrategicPlanner {
  static createPlanFromIntent(userIntent = 'COMPETITIVE_RAMP') {
    const intentUpper = (userIntent || 'RAMP').toUpperCase();

    if (intentUpper.includes('RAMP')) {
      return Object.freeze({
        intent: 'RAMP_TEMPO',
        targets: {
          Turn4Threat: 0.85,
          InteractionBeforeTurn3: 0.40,
          ManaSources: 24,
          Acceleration: 10,
          PayoffCount: 8,
          Recovery: 'MEDIUM'
        },
        constraints: {
          maxTaplands: 4,
          minEarlyInteraction: 6
        }
      });
    }

    if (intentUpper.includes('CONTROL')) {
      return Object.freeze({
        intent: 'CONTROL_RESOURCE_DENIAL',
        targets: {
          Turn4Threat: 0.30,
          InteractionBeforeTurn3: 0.85,
          ManaSources: 26,
          Acceleration: 4,
          PayoffCount: 6,
          Recovery: 'HIGH'
        },
        constraints: {
          maxTaplands: 6,
          minEarlyInteraction: 12
        }
      });
    }

    // Default Aggro Plan
    return Object.freeze({
      intent: 'AGGRO_PRESSURE',
      targets: {
        Turn4Threat: 0.95,
        InteractionBeforeTurn3: 0.30,
        ManaSources: 20,
        Acceleration: 6,
        PayoffCount: 4,
        Recovery: 'LOW'
      },
      constraints: {
        maxTaplands: 2,
        minEarlyInteraction: 4
      }
    });
  }
}
