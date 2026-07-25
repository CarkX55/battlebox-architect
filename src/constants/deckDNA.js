/**
 * src/constants/deckDNA.js
 * 
 * Núcleo del Contrato de Estado `DeckDNA60` para Mazos Construidos (60 Cartas).
 * Define la estructura fuertemente tipada del plan de juego (GamePlan),
 * el esqueleto del mazo (DeckSkeleton), los paquetes clave (Core Packages) 
 * y las metas del metajuego.
 */

/**
 * Crea y normaliza un objeto GamePlan para un mazo de 60 cartas.
 */
export function createGamePlan(options = {}) {
  return {
    primaryPlan: options.primaryPlan || "Desplegar amenazas eficientes e infligir daño antes del turno objetivo.",
    secondaryPlan: options.secondaryPlan || "Mantener presión con recursos resilientes y eliminación puntual.",
    winConditions: Array.isArray(options.winConditions) && options.winConditions.length > 0 
      ? options.winConditions 
      : ["Combat Damage"],
    speed: options.speed || 'fast', // 'blitz' | 'fast' | 'midrange' | 'slow' | 'inevitable'
    winTurnTarget: options.winTurnTarget || 5,
    resourceEngine: options.resourceEngine || "Curva baja eficientada",
    interactionLevel: options.interactionLevel || 'medium' // 'low' | 'medium' | 'high' | 'oppressive'
  };
}

/**
 * Crea un objeto `DeckDNA60` completo a partir de las entradas del usuario y datos de arquetipos.
 */
export function createDeckDNA60(formData = {}, archetypeData = {}) {
  const selectedFormat = (formData.format || 'MODERN').toUpperCase();
  const archetypeId = formData.archetype || archetypeData.id || 'aggro';
  const colors = Array.isArray(formData.colores) && formData.colores.length > 0
    ? formData.colores
    : (archetypeData.recommendedColors || ['R']);

  // Generar GamePlan
  const gamePlan = createGamePlan({
    primaryPlan: formData.prompt ? `Plan adaptado a prompt: ${formData.prompt}` : archetypeData.description,
    speed: archetypeData.speed ? archetypeData.speed.toLowerCase() : 'fast',
    winTurnTarget: archetypeData.winTurn || 5,
    resourceEngine: formData.strategy || 'Ventaja de cartas estándar',
    interactionLevel: archetypeId.includes('control') ? 'high' : archetypeId.includes('tempo') ? 'high' : 'medium'
  });

  // Esqueleto base predeterminado para 60 cartas
  const deckSkeleton = {
    deckSize: 60,
    landsTarget: archetypeData.landCount || 22,
    creatureTarget: archetypeId.includes('control') ? 4 : archetypeId.includes('aggro') ? 24 : 16,
    spellTarget: archetypeId.includes('control') ? 34 : archetypeId.includes('aggro') ? 14 : 22,
    curveDistribution: formData.curveTarget || { 1: 12, 2: 14, 3: 8, 4: 4, 5: 0 },
    roleQuotas: {
      threats: archetypeId.includes('aggro') ? 20 : 12,
      interaction: archetypeId.includes('control') ? 16 : 8,
      card_advantage: archetypeId.includes('control') ? 10 : 4,
      ramp_fixer: 0,
      utility: 4
    }
  };

  return {
    format: selectedFormat,
    colors,
    archetype: archetypeId,
    subArchetype: formData.strategy || null,
    tribe: formData.tribe || null,
    gamePlan,
    deckSkeleton,
    corePackages: [], // Se inyectarán mediante slotFillingEngine
    lockedCards: Array.isArray(formData.dnaSkeleton) ? formData.dnaSkeleton : [],
    mustInclude: formData.mustInclude ? formData.mustInclude.split(/[,\n]/).map(s => s.trim()).filter(Boolean) : [],
    excludedNames: Array.isArray(formData.excludedNames) ? formData.excludedNames : [],
    sideboardPlan: {
      antiAggro: [],
      antiControl: [],
      antiCombo: []
    },
    metaTarget: {
      powerLevel: formData.powerLevel || 8,
      budget: formData.budget || 'unlimited'
    }
  };
}

/**
 * Valida la consistencia de un objeto DeckDNA60.
 */
export function validateDeckDNA60(dna) {
  if (!dna || typeof dna !== 'object') {
    throw new Error("[DeckDNA60] El objeto DNA debe ser un objeto válido.");
  }
  if (!dna.format) {
    throw new Error("[DeckDNA60] El campo 'format' es obligatorio.");
  }
  if (!Array.isArray(dna.colors) || dna.colors.length === 0) {
    dna.colors = ['C'];
  }
  if (!dna.deckSkeleton || dna.deckSkeleton.deckSize !== 60) {
    dna.deckSkeleton = { deckSize: 60, landsTarget: 22, creatureTarget: 20, spellTarget: 18, curveDistribution: { 1: 12, 2: 14, 3: 8, 4: 4, 5: 0 }, roleQuotas: {} };
  }
  return true;
}
