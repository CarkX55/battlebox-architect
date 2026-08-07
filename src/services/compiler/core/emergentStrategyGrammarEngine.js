/**
 * src/services/compiler/core/emergentStrategyGrammarEngine.js
 * 
 * EmergentStrategyGrammarEngine: Motor de Gramática Estratégica Emergente v20.0.
 * CERO catálogos manuales de identidades estratégicas.
 * La gramática estratégica universal consta de 5 ranuras estructurales:
 * [ResourceEngine, ThreatEngine, ScalingEngine, ProtectionEngine, ClosingEngine]
 * El Deck DNA emerge automáticamente por agrupamiento de capacidades (Capability Clustering)
 * sobre la SSOT de CardIntelligenceEngine.
 */

export class StrategyGrammarInstance {
  constructor(data = {}) {
    this.resourceEngine = Object.freeze([...(data.resourceEngine || [])]);
    this.threatEngine = Object.freeze([...(data.threatEngine || [])]);
    this.scalingEngine = Object.freeze([...(data.scalingEngine || [])]);
    this.protectionEngine = Object.freeze([...(data.protectionEngine || [])]);
    this.closingEngine = Object.freeze([...(data.closingEngine || [])]);
    this.emergentDNASignature = Object.freeze([...(data.emergentDNASignature || [])]);
  }
}

export class EmergentStrategyGrammarEngine {
  /**
   * Deriva la Gramática Estratégica Emergente y la firma Deck DNA desde una lista de cartas
   */
  static deriveEmergentGrammar(deckCards = []) {
    const resource = [];
    const threat = [];
    const scaling = [];
    const protection = [];
    const closing = [];
    const capabilityCluster = new Set();

    deckCards.forEach(card => {
      const type = (card.type_line || card.typeLine || '').toLowerCase();
      const oracle = (card.oracle_text || card.oracleText || '').toLowerCase();
      const cmc = Number(card.cmc || 0);

      // 1. Resource Engine
      if (type.includes('land') || oracle.includes('add {') || oracle.includes('ramp')) {
        resource.push(card.name);
        capabilityCluster.add('RESOURCE_ACCELERATION');
      }

      // 2. Threat Engine
      if (type.includes('creature') || oracle.includes('deals') || oracle.includes('damage')) {
        threat.push(card.name);
        capabilityCluster.add('PRIMARY_THREAT_MASS');
      }

      // 3. Scaling Engine
      if (oracle.includes('+1/+1') || oracle.includes('other') || oracle.includes('unblockable') || oracle.includes('islandwalk')) {
        scaling.push(card.name);
        capabilityCluster.add('SCALING_MULTIPLIER');
      }

      // 4. Protection Engine
      if (oracle.includes('counter') || oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('hexproof')) {
        protection.push(card.name);
        capabilityCluster.add('INTERACTION_PROTECTION');
      }

      // 5. Closing Engine
      if (oracle.includes('trample') || oracle.includes('flying') || cmc >= 5 || oracle.includes('each opponent')) {
        closing.push(card.name);
        capabilityCluster.add('CLOSING_EVASIVE_REACH');
      }
    });

    const emergentDNA = Array.from(capabilityCluster);

    return new StrategyGrammarInstance({
      resourceEngine: resource,
      threatEngine: threat,
      scalingEngine: scaling,
      protectionEngine: protection,
      closingEngine: closing,
      emergentDNASignature: emergentDNA
    });
  }

  /**
   * Calcula el porcentaje de similitud estructural entre una carta nueva y un Deck DNA emergente
   */
  static calculateDNASimilarity(cardObj = {}, emergentDNA = []) {
    const oracle = (cardObj.oracle_text || cardObj.oracleText || '').toLowerCase();
    const type = (cardObj.type_line || cardObj.typeLine || '').toLowerCase();

    let matchCount = 0;
    const totalDNASlots = Math.max(1, emergentDNA.length);

    if (emergentDNA.includes('RESOURCE_ACCELERATION') && (oracle.includes('add') || type.includes('land'))) matchCount++;
    if (emergentDNA.includes('PRIMARY_THREAT_MASS') && type.includes('creature')) matchCount++;
    if (emergentDNA.includes('SCALING_MULTIPLIER') && (oracle.includes('+1/+1') || oracle.includes('other'))) matchCount++;
    if (emergentDNA.includes('INTERACTION_PROTECTION') && (oracle.includes('destroy') || oracle.includes('counter'))) matchCount++;

    return Math.round((matchCount / totalDNASlots) * 100) / 100;
  }
}
