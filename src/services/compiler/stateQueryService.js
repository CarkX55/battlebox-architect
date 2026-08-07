/**
 * src/services/compiler/stateQueryService.js
 * 
 * StateQueryService: Fachada de Lectura Orientada al Dominio de MTG.
 * Encapsula la estructura interna de slots y expone consultas conceptuales del juego:
 * - getManaAcceleration()
 * - getEarlyInteraction()
 * - getPlayableThreats()
 * - getFreeSlotCount()
 * - getCardsByRole()
 */

export class StateQueryService {
  constructor(strategicState) {
    this.state = strategicState;
  }

  /**
   * Obtiene la cantidad de slots libres / sin asignar en la baraja
   */
  getFreeSlotCount() {
    const slots = this.state?.deckState?.slots || [];
    return slots.filter(s => !s || !s.name).length;
  }

  /**
   * Obtiene la cantidad total de fuentes de aceleración de maná (Mana Dorks, Ramp, Rocks)
   */
  getManaAcceleration() {
    const slots = this.state?.deckState?.slots || [];
    return slots
      .filter(s => {
        if (!s || !s.name) return false;
        const role = (s.role || '').toLowerCase();
        const caps = s.capabilities || [];
        const oracle = (s.oracle_text || s.text || '').toLowerCase();
        return (
          role === 'ramp' ||
          role === 'mana' ||
          caps.includes('cap.mana.acceleration') ||
          oracle.includes('add {') ||
          oracle.includes('search your library for a land')
        );
      })
      .reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);
  }

  /**
   * Obtiene la cantidad de interacción temprana de turno 1-2 (Instant/Sorcery removal, counters, discard)
   */
  getEarlyInteraction() {
    const slots = this.state?.deckState?.slots || [];
    return slots
      .filter(s => {
        if (!s || !s.name) return false;
        const cmc = typeof s.cmc === 'number' ? s.cmc : parseInt(s.cmc || 2, 10);
        if (cmc > 2) return false;
        const role = (s.role || '').toLowerCase();
        const type = (s.type_line || s.category || '').toLowerCase();
        return (
          role === 'removal' ||
          role === 'counterspell' ||
          role === 'interaction' ||
          role === 'burn' ||
          type.includes('instant')
        );
      })
      .reduce((acc, s) => acc + Number(s.quantity || s.count || 1), 0);
  }

  /**
   * Obtiene las criaturas/amenazas jugables con poder superior a minPower
   */
  getPlayableThreats(minPower = 2) {
    const slots = this.state?.deckState?.slots || [];
    return slots.filter(s => {
      if (!s || !s.name) return false;
      const type = (s.type_line || s.category || '').toLowerCase();
      if (!type.includes('creature')) return false;
      const power = parseInt(s.power || '0', 10);
      return power >= minPower || (s.role || '').toLowerCase() === 'threat';
    });
  }

  /**
   * Obtiene las cartas por rol específico (ej: 'finisher', 'draw', 'sweeper')
   */
  getCardsByRole(roleName) {
    if (!roleName) return [];
    const targetRole = roleName.toLowerCase();
    const slots = this.state?.deckState?.slots || [];
    return slots.filter(s => {
      if (!s || !s.name) return false;
      const r = (s.role || '').toLowerCase();
      return r === targetRole;
    });
  }

  /**
   * Obtiene las cartas por coincidencia de coste de maná exacto (CMC)
   */
  getCardsByCMC(targetCMC) {
    const slots = this.state?.deckState?.slots || [];
    return slots.filter(s => {
      if (!s || !s.name) return false;
      const cmc = typeof s.cmc === 'number' ? s.cmc : parseInt(s.cmc || 0, 10);
      return cmc === targetCMC;
    });
  }
}
