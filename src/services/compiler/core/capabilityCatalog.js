/**
 * src/services/compiler/core/capabilityCatalog.js
 * 
 * Catálogo Centralizado de Identificadores de Capacidades Estratégicas.
 * Evita errores tipográficos y permite versionar identificadores.
 */

export const CAPABILITY_IDS = Object.freeze({
  MANA_SOURCE: 'cap.mana.source.v1',
  MANA_ACCELERATION_T1: 'cap.mana.acceleration.t1.v1',
  MANA_MULTIPLIER: 'cap.mana.multiplier.v1',
  CARD_DRAW: 'cap.card.draw.v1',
  TUTOR: 'cap.tutor.v1',
  EARLY_REMOVAL: 'cap.removal.early.v1',
  BOARD_SWEEPER: 'cap.board.sweeper.v1',
  PROTECTION: 'cap.protection.v1',
  VALUE_THREAT: 'cap.threat.value.v1',
  FINISHER_LETHAL: 'cap.finisher.lethal.v1',
  RECOVERY_ENGINE: 'cap.engine.recovery.v1',
  COCO_ENGINE: 'cap.engine.coco.v1',
  CHORD_ENGINE: 'cap.engine.chord.v1',
  LIVING_END_ENGINE: 'cap.engine.living_end.v1'
});
