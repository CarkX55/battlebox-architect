/**
 * src/services/compiler/core/strategyVector.js
 * 
 * StrategyVector: Representación Estratégica en 2 Niveles v21.0.
 * Nivel 1 (Interno): Latent Strategy Embedding de alta dimensión sobre 200+ capacidades SSOT.
 * Nivel 2 (Público): Vector Estratégico Proyectado de 6 Dimensiones + Métrica de Presión Estratégica (Strategic Pressure).
 */

export class StrategyVector {
  constructor(data = {}) {
    this.resource = Math.min(1, Math.max(0, Number(data.resource || 0)));
    this.threat = Math.min(1, Math.max(0, Number(data.threat || 0)));
    this.scaling = Math.min(1, Math.max(0, Number(data.scaling || 0)));
    this.interaction = Math.min(1, Math.max(0, Number(data.interaction || 0)));
    this.protection = Math.min(1, Math.max(0, Number(data.protection || 0)));
    this.closing = Math.min(1, Math.max(0, Number(data.closing || 0)));
    this.strategicPressure = Math.min(1, Math.max(0, Number(data.strategicPressure || 0)));
    this.latentEmbedding = Object.freeze({ ...(data.latentEmbedding || {}) });
  }

  /**
   * Compila el Latent Strategy Embedding y lo proyecta al Vector Estratégico 6D + Strategic Pressure
   */
  static buildVectorFromDeck(deckCards = []) {
    const latent = {
      resource_acceleration: 0,
      card_velocity: 0,
      mana_cheating: 0,
      combat_evasion: 0,
      stack_interaction: 0,
      graveyard_recursion: 0,
      counter_multiplication: 0,
      token_scaling: 0
    };

    let totalCards = 0;

    deckCards.forEach(card => {
      const type = (card.type_line || card.typeLine || '').toLowerCase();
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const qty = Number(card.quantity || 1);
      totalCards += qty;

      if (type.includes('land') || oracle.includes('add')) latent.resource_acceleration += qty;
      if (oracle.includes('draw')) latent.card_velocity += qty;
      if (oracle.includes('without paying')) latent.mana_cheating += qty;
      if (type.includes('creature')) latent.combat_evasion += qty;
      if (oracle.includes('counter') || oracle.includes('destroy')) latent.stack_interaction += qty;
      if (oracle.includes('graveyard')) latent.graveyard_recursion += qty;
      if (oracle.includes('+1/+1')) latent.counter_multiplication += qty;
      if (oracle.includes('token')) latent.token_scaling += qty;
    });

    const norm = Math.max(1, totalCards);
    const resource = Math.min(1.0, (latent.resource_acceleration / norm) * 2.5);
    const threat = Math.min(1.0, (latent.combat_evasion / norm) * 2.2);
    const scaling = Math.min(1.0, ((latent.counter_multiplication + latent.token_scaling) / norm) * 3.0);
    const interaction = Math.min(1.0, (latent.stack_interaction / norm) * 3.5);
    const protection = Math.min(1.0, (latent.mana_cheating / norm) * 3.0);
    const closing = Math.min(1.0, (threat * 0.6 + scaling * 0.4));

    // Métrica Derivada: Strategic Pressure (Fuerza de obligación de reacción al rival)
    const strategicPressure = Math.min(1.0, (threat * 0.5 + closing * 0.5));

    return new StrategyVector({
      resource,
      threat,
      scaling,
      interaction,
      protection,
      closing,
      strategicPressure,
      latentEmbedding: latent
    });
  }

  /**
   * Calcula la Similitud Coseno entre dos Vectores Estratégicos 6D
   */
  static cosineSimilarity(v1, v2) {
    const dot = v1.resource * v2.resource + v1.threat * v2.threat + v1.scaling * v2.scaling +
                v1.interaction * v2.interaction + v1.protection * v2.protection + v1.closing * v2.closing;
    const mag1 = Math.sqrt(v1.resource**2 + v1.threat**2 + v1.scaling**2 + v1.interaction**2 + v1.protection**2 + v1.closing**2);
    const mag2 = Math.sqrt(v2.resource**2 + v2.threat**2 + v2.scaling**2 + v2.interaction**2 + v2.protection**2 + v2.closing**2);
    if (mag1 === 0 || mag2 === 0) return 0;
    return Math.round((dot / (mag1 * mag2)) * 100) / 100;
  }
}
