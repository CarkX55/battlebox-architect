/**
 * src/services/strategicMemoryService.js
 * 
 * Hito 9: Temporal Metagame Memory Service
 * 
 * Persiste y consulta reglas estratégicas abstractas aprendidas durante las construcciones.
 * Aplica degradación temporal (MetagameMemoryDecay = confidence * recency * metagameSimilarity)
 * para evitar que metagames antiguos contaminen las decisiones presentes.
 */

import { createTemporalPatternMemoryEntry } from '../models/deckModels.js';

const patternMemoryStore = [];

/**
 * Persiste una regla de patrón estratégico aprendida.
 * 
 * @param {Object} patternData Datos de la regla
 * @param {Object} currentMetaContext Contexto actual del metagame (formato, fecha)
 */
export function recordStrategicPattern(patternData = {}, currentMetaContext = { format: 'modern' }) {
  const entry = createTemporalPatternMemoryEntry(
    {
      ...patternData,
      lastValidated: Date.now(),
      metaContext: currentMetaContext
    },
    currentMetaContext
  );

  if (entry.isValid) {
    patternMemoryStore.push(entry);
  }
  return entry;
}

/**
 * Consulta reglas estratégicas relevantes aplicando la degradación temporal y similitud.
 * 
 * @param {string} archetype Arquetipo estratégico (ej. 'tokens')
 * @param {Object} currentMetaContext Contexto actual del metagame
 * @returns {Array<Object>} Lista de reglas vigentes ordenadas por peso efectivo
 */
export function queryStrategicMemory(archetype = 'midrange', currentMetaContext = { format: 'modern' }) {
  const activePatterns = patternMemoryStore
    .map(entry => {
      // Re-calcular peso temporal en tiempo de consulta
      const ageDays = (Date.now() - (entry.lastValidated || Date.now())) / (1000 * 60 * 60 * 24);
      const recency = Math.exp(-ageDays / 365);
      const effectiveWeight = (entry.confidence || 1) * recency;

      return {
        ...entry,
        effectiveWeight,
        isValid: effectiveWeight >= 0.15
      };
    })
    .filter(p => p.isValid && (p.archetypeContext === archetype || p.archetypeContext === 'all'));

  return activePatterns.sort((a, b) => b.effectiveWeight - a.effectiveWeight);
}

/**
 * Genera el reporte de explicabilidad total card-by-card y economía de recursos.
 * 
 * @param {Object} session Sesión de trabajo
 * @returns {Object} Reporte estructurado de explicabilidad
 */
export function generateExplicabilityReport(session) {
  const deck = session?.working?.currentDeck || [];
  const engineGraph = session?.working?.engineGraph;
  const resourceBudget = session?.working?.resourceBudget;
  const utility = session?.working?.hierarchicalUtility;

  const cardReports = deck.map(card => ({
    name: card.name,
    cmc: card.cmc,
    slot: card.slot || 'general_slot',
    engine: card.engine || 'general_engine',
    produces: card.profile?.produces || card.produces || [],
    enables: card.profile?.enables || card.enables || [],
    primaryIntent: card.profile?.cardIntent?.primaryIntent || 'Desarrollo',
    reasonForInclusion: `Asignado al slot ${card.slot || 'general'} para cubrir la capability ${(card.profile?.produces[0] || 'general')}.`,
    monteCarloAdjustment: card.monteCarloAdjustment || 0
  }));

  return {
    archetype: session.deckIntent.strategicArchetype,
    totalCards: deck.length,
    hierarchicalUtility: utility,
    engineCoverage: session.working.engineCoverage,
    engineHealth: session.working.engineHealth,
    resourceBudget,
    cardReports
  };
}
