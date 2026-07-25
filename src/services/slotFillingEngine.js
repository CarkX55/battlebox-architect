/**
 * src/services/slotFillingEngine.js
 * 
 * Motor de Relleno de Huecos (Slot Filling Engine) para Mazos Construidos de 60 Cartas.
 * 
 * Responsabilidades:
 * 1. Toma el `DeckDNA60` y la plantilla estructural `BLUEPRINTS`.
 * 2. Inyecta los `CORE_PACKAGES` (playsets de copias 4x/3x) según formato y arquetipo.
 * 3. Resta las cartas inyectadas del esqueleto para calcular los huecos vacíos exactos por coste de maná (CMC) y rol.
 */

import { BLUEPRINTS } from '../constants/blueprintTemplates.js';
import { CORE_PACKAGES, injectCorePackage } from '../constants/corePackages.js';
import { validateDeckDNA60 } from '../constants/deckDNA.js';

/**
 * Calcula la estructura del esqueleto y efectúa el relleno de huecos inicial.
 */
export function buildDeckSkeletonAndSlots(deckDNA) {
  validateDeckDNA60(deckDNA);

  const archetypeKey = (deckDNA.archetype || 'aggro').toLowerCase();
  const blueprint = BLUEPRINTS[archetypeKey] || BLUEPRINTS.aggro || BLUEPRINTS.midrange;

  // 1. Establecer metas numéricas del esqueleto (DeckSkeleton)
  const targetLands = deckDNA.deckSkeleton?.landsTarget || blueprint.lands?.total || 22;
  const targetSpells = 60 - targetLands;

  // Distribución de curva objetivo (CMC 1..5+)
  const curveTarget = deckDNA.deckSkeleton?.curveDistribution || {
    1: Math.round(blueprint.spells?.curve?.mv1?.min ? (blueprint.spells.curve.mv1.min + blueprint.spells.curve.mv1.max) / 2 : 12),
    2: Math.round(blueprint.spells?.curve?.mv2?.min ? (blueprint.spells.curve.mv2.min + blueprint.spells.curve.mv2.max) / 2 : 14),
    3: Math.round(blueprint.spells?.curve?.mv3?.min ? (blueprint.spells.curve.mv3.min + blueprint.spells.curve.mv3.max) / 2 : 8),
    4: Math.round(blueprint.spells?.curve?.mv4_plus?.min ? (blueprint.spells.curve.mv4_plus.min + blueprint.spells.curve.mv4_plus.max) / 2 : 4),
    5: 0
  };

  // 2. Obtener e Inyectar Paquetes Clave (CORE_PACKAGES)
  let injectedCoreCards = [];
  const formatKey = (deckDNA.format || 'MODERN').toUpperCase();
  const colorStr = (deckDNA.colors || []).sort().join('');

  // Intentar buscar paquete core registrado
  const coreDef = CORE_PACKAGES[archetypeKey] || CORE_PACKAGES[deckDNA.subArchetype];
  if (coreDef && coreDef[formatKey]) {
    const formatCore = coreDef[formatKey];
    const rawList = (formatCore.colorVariants && formatCore.colorVariants[colorStr]) 
      ? formatCore.colorVariants[colorStr] 
      : formatCore.default;

    if (Array.isArray(rawList)) {
      injectedCoreCards = rawList.map(c => ({
        name: c.name,
        qty: c.qty || 4,
        role: c.role || 'core_anchor',
        functionalTag: c.functionalTag || null,
        isCoreLocked: true
      }));
    }
  }

  // Si el usuario especificó cartas fijadas (dnaSkeleton / lockedCards)
  if (Array.isArray(deckDNA.lockedCards) && deckDNA.lockedCards.length > 0) {
    deckDNA.lockedCards.forEach(locked => {
      const existing = injectedCoreCards.find(c => c.name.toLowerCase() === locked.name.toLowerCase());
      if (!existing) {
        injectedCoreCards.push({
          name: locked.name,
          qty: locked.count || locked.qty || 1,
          role: locked.role || 'user_locked',
          isCoreLocked: true
        });
      }
    });
  }

  // 3. Contar total de cartas no-tierra inyectadas y distribución ocupada
  let countCoreSpells = 0;
  const occupiedCurve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  injectedCoreCards.forEach(c => {
    countCoreSpells += c.qty;
    // La curva se recalculará dinámicamente en cardHydrator/scoring
  });

  const remainingSpellsToFill = Math.max(0, targetSpells - countCoreSpells);

  // 4. Construir objeto de huecos vacíos (Empty Slots)
  const emptySlots = {
    totalSpellsToFill: remainingSpellsToFill,
    targetLands,
    curveVacancies: {
      mv1: Math.max(0, (curveTarget[1] || 10)),
      mv2: Math.max(0, (curveTarget[2] || 12)),
      mv3: Math.max(0, (curveTarget[3] || 8)),
      mv4_plus: Math.max(0, (curveTarget[4] || 4))
    },
    roleVacancies: {
      threats: Math.max(0, Math.round(remainingSpellsToFill * 0.5)),
      interaction: Math.max(0, Math.round(remainingSpellsToFill * 0.3)),
      card_advantage: Math.max(0, Math.round(remainingSpellsToFill * 0.2))
    }
  };

  return {
    blueprint,
    deckSkeleton: {
      deckSize: 60,
      landsTarget: targetLands,
      spellsTarget: targetSpells,
      curveTarget
    },
    injectedCoreCards,
    emptySlots
  };
}
