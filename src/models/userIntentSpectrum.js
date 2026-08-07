/**
 * src/models/userIntentSpectrum.js
 * 
 * CanonicalUserIntentSpectrum: Modelo Canónico de Intención Humana v17.2.
 * Captura prioridades, candados de identidad (IdentityLock), niveles de poder esperados,
 * experiencias de victoria y preferencias de descubrimiento sin jerga de Magic.
 */

export class CanonicalUserIntentSpectrum {
  constructor(data = {}) {
    this.schemaVersion = '17.2.0';
    this.primaryIdea = data.primaryIdea || 'Midrange';
    this.format = (data.format || 'Modern').toUpperCase();
    this.colors = Object.freeze([...(data.colors || [])]);

    // Candado de Identidad y Presupuesto Creativo
    this.identityLock = data.identityLock || 'STRICT'; // 'STRICT' | 'SOFT' | 'OPEN'
    this.expectedPowerLevel = data.expectedPowerLevel || 'OPTIMIZED'; // 'VERY_RELAXED' | 'CASUAL' | 'OPTIMIZED' | 'VERY_OPTIMIZED' | 'MAXIMUM_POSSIBLE'
    this.discoveryPreference = data.discoveryPreference || 'BALANCED'; // 'SAFE' | 'BALANCED' | 'EXPLORER' | 'TREASURE_HUNTER'

    // Experiencia Humana de Memoria de Victoria
    this.winMemory = data.winMemory || 'HUGE_CREATURES'; // 'FAST_VICTORY' | 'HUGE_CREATURES' | 'CRAZY_COMBO' | 'ALWAYS_ANSWER' | 'BEAUTIFUL_DECK' | 'UNEXPECTED_TRICK'

    // Jerarquía de Prioridades de Conflicto
    this.intentPriorities = Object.freeze([
      ...(data.intentPriorities || ['PRIMARY_IDEA', 'WIN_MEMORY', 'POWER_LEVEL', 'EXCLUSIONS', 'DISCOVERY'])
    ]);

    // Cartas Emblemáticas (Soft) vs Obligatorias (Hard) vs Odiadas (Banned)
    this.signatureCards = Object.freeze([...(data.signatureCards || [])]);
    this.mustIncludeCards = Object.freeze([...(data.mustIncludeCards || [])]);
    this.hatedCards = Object.freeze([...(data.hatedCards || [])]);

    // Restricciones Negativas de Mecánicas
    this.excludedMechanics = Object.freeze([...(data.excludedMechanics || [])]);

    // Métrica de Confianza Auditada
    this.intentConfidence = Number(data.intentConfidence || 0.50);

    Object.freeze(this);
  }
}
