/**
 * src/services/compiler/plugins/magic/turnPlanner.js
 * 
 * TurnPlanner & FailurePlanner: Historia por Turnos e Interrupciones.
 * Define los objetivos de capacidades por turno (no listas fijas de cartas)
 * y prueba la resiliencia del mazo ante escenarios reales de fallo.
 */

import { CAPABILITY_IDS } from '../../core/capabilityCatalog.js';

export class TurnPlanner {
  static createTurnStory(archetype = 'midrange') {
    const isRamp = (archetype || '').toLowerCase().includes('ramp') || (archetype || '').toLowerCase().includes('elves');

    if (isRamp) {
      return {
        macroStrategy: 'Explosive Ramp into Overrun Finisher',
        turns: [
          { turn: 1, requiredCapability: CAPABILITY_IDS.MANA_ACCELERATION_T1, minManaTarget: 2 },
          { turn: 2, requiredCapability: CAPABILITY_IDS.VALUE_THREAT, minManaTarget: 4 },
          { turn: 3, requiredCapability: CAPABILITY_IDS.COCO_ENGINE, minManaTarget: 6 },
          { turn: 4, requiredCapability: CAPABILITY_IDS.FINISHER_LETHAL, minBoardPowerTarget: 16 }
        ],
        failureScenarios: [
          { id: 'FAIL_NO_DORK', description: 'Sin dork T1 en mano de 7', targetFallbackTurn: 5 },
          { id: 'FAIL_REMOVAL', description: 'Dork T1 removido por Lightning Bolt', targetFallbackTurn: 5 },
          { id: 'FAIL_WRATH', description: 'Limpia de mesa T3 (Wrath of God)', targetFallbackTurn: 6 },
          { id: 'FAIL_THOUGHTSEIZE', description: 'Descarte T1 de pieza clave', targetFallbackTurn: 5.5 }
        ]
      };
    }

    return {
      macroStrategy: 'Midrange Interaction & Value',
      turns: [
        { turn: 1, requiredCapability: CAPABILITY_IDS.EARLY_REMOVAL, minManaTarget: 1 },
        { turn: 2, requiredCapability: CAPABILITY_IDS.VALUE_THREAT, minManaTarget: 2 },
        { turn: 3, requiredCapability: CAPABILITY_IDS.CARD_DRAW, minManaTarget: 3 },
        { turn: 4, requiredCapability: CAPABILITY_IDS.FINISHER_LETHAL, minManaTarget: 4 }
      ],
      failureScenarios: [
        { id: 'FAIL_NO_LAND', description: 'Atascado en 2 tierras', targetFallbackTurn: 6 }
      ]
    };
  }
}
