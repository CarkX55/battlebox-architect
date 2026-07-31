/**
 * CapabilityPlanner.js
 * Capability Planner.
 * Flow: User Intent -> Capability Planner -> Strategy Planner -> Strategy IR.
 * Translates human goals ("Incremental Advantage") into abstract capability sets before strategic planning.
 */

import { StrategicOntology } from '../ontology/StrategicOntology.js';

export class CapabilityPlanner {
  static planCapabilitiesFromIntent(userGoal = 'INCREMENTAL_ADVANTAGE') {
    const goalUpper = (userGoal || '').toUpperCase();

    if (goalUpper.includes('INCREMENTAL') || goalUpper.includes('VALUE')) {
      return Object.freeze({
        userGoal: 'INCREMENTAL_ADVANTAGE',
        requiredCapabilities: Object.freeze([
          StrategicOntology.getNamespace('CardDraw'),
          StrategicOntology.getNamespace('SingleTargetRemoval'),
          StrategicOntology.getNamespace('GraveyardRecursion'),
          StrategicOntology.getNamespace('Protection')
        ]),
        capabilityTargetRatios: Object.freeze({
          'cap.card.draw': 0.80,
          'cap.removal.single_target': 0.70,
          'cap.graveyard.recursion': 0.60
        })
      });
    }

    if (goalUpper.includes('EXPLOSIVE') || goalUpper.includes('RAMP')) {
      return Object.freeze({
        userGoal: 'EXPLOSIVE_RAMP',
        requiredCapabilities: Object.freeze([
          StrategicOntology.getNamespace('ManaAcceleration'),
          StrategicOntology.getNamespace('CardDraw'),
          StrategicOntology.getNamespace('Protection')
        ]),
        capabilityTargetRatios: Object.freeze({
          'cap.mana.acceleration': 0.90,
          'cap.card.draw': 0.60
        })
      });
    }

    // Default Control Capability Plan
    return Object.freeze({
      userGoal: 'BOARD_CONTROL',
      requiredCapabilities: Object.freeze([
        StrategicOntology.getNamespace('BoardReset'),
        StrategicOntology.getNamespace('SingleTargetRemoval'),
        StrategicOntology.getNamespace('CardDraw')
      ]),
      capabilityTargetRatios: Object.freeze({
        'cap.board.reset': 0.85,
        'cap.removal.single_target': 0.80,
        'cap.card.draw': 0.75
      })
    });
  }
}
