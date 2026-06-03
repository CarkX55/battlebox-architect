import { 
  getManaValue, 
  isLand, 
  calculateVMP, 
  calculatePerfectLandCount 
} from './deckCalculator.js';

/**
 * Evalúa la competitividad de un mazo y devuelve un Grade de Perfección.
 * @param {Array} deckList - Array de objetos carta en el mazo principal
 * @param {Array} sideboardList - Array de objetos carta en el banquillo
 * @param {Object} formData - Parámetros de generación (strategy, archetype, companero)
 * @returns {Object} Reporte de Auditoría { score, grade, metrics, warnings, strengths }
 */
export function auditarMazo(deckList, sideboardList, formData) {
  let score = 0;
  const warnings = [];
  const strengths = [];

  const metrics = {
    manaScore: 0,
    curveScore: 0,
    consistencyScore: 0,
    structureScore: 0,
    totalCardsMain: 0,
    totalCardsSide: 0,
    vmp: 0,
    landDeviation: 0
  };

  // 1. Cálculos base
  const totalMain = deckList.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const totalSide = sideboardList?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
  
  metrics.totalCardsMain = totalMain;
  metrics.totalCardsSide = totalSide;

  const isYorion = formData?.companero?.toLowerCase().includes('yorion');
  const targetMainSize = isYorion ? 80 : 60;

  // --- STRUCTURE SCORE (Max 30) ---
  if (totalMain === targetMainSize) {
    metrics.structureScore += 15;
    strengths.push(`Tamaño del mazo perfecto (${targetMainSize} cartas).`);
  } else {
    warnings.push(`El mazo principal tiene ${totalMain} cartas (debería tener ${targetMainSize}).`);
  }

  if (totalSide === 15) {
    metrics.structureScore += 15;
    strengths.push("Sideboard completo de 15 cartas.");
  } else if (totalSide === 0) {
    // Si no pasaron sideboard, quizás no se generó.
    warnings.push("No hay Sideboard generado (0 cartas).");
  } else {
    warnings.push(`El sideboard tiene ${totalSide} cartas (debería tener 15).`);
  }

  score += metrics.structureScore;


  // 2. Separación de Tierras y Spells
  const lands = deckList.filter(isLand);
  const spells = deckList.filter(c => !isLand(c));
  
  const landCount = lands.reduce((sum, c) => sum + (c.quantity || 1), 0);

  // --- MANA SCORE (Max 30) ---
  if (totalMain > 0 && spells.length > 0) {
    const perfectLands = calculatePerfectLandCount(spells, formData, isYorion);
    const deviation = Math.abs(landCount - Math.round(perfectLands));
    metrics.landDeviation = deviation;

    if (deviation <= 0.5) {
      metrics.manaScore = 30;
      strengths.push(`Base de maná matemáticamente perfecta (Karsten). Ideal: ~${Math.round(perfectLands)}, Actual: ${landCount}.`);
    } else if (deviation <= 1.5) {
      metrics.manaScore = 25;
      strengths.push("Base de maná aceptable, desviación menor a 2 tierras.");
    } else if (deviation <= 2.5) {
      metrics.manaScore = 15;
      warnings.push(`Desviación de maná. Tienes ${landCount} tierras, la matemática recomienda ~${Math.round(perfectLands)}.`);
    } else {
      metrics.manaScore = 0;
      warnings.push(`Peligro severo de Maná. Tienes ${landCount} tierras, pero necesitas ~${Math.round(perfectLands)} para tus costes.`);
    }
    score += metrics.manaScore;
  }

  // --- CURVE SCORE (Max 20) ---
  if (spells.length > 0) {
    const vmp = calculateVMP(spells);
    metrics.vmp = Math.round(vmp * 100) / 100;

    // Depende del arquetipo
    const archetype = (formData?.archetype || '').toLowerCase();
    let isAggro = archetype.includes('aggro') || archetype.includes('burn');
    let isControl = archetype.includes('control');
    let isMidrange = archetype.includes('midrange') || (!isAggro && !isControl);

    let curveDeviation = 0;
    if (isAggro) {
      curveDeviation = Math.max(0, vmp - 2.0); // Penalty if VMP > 2.0
    } else if (isControl) {
      curveDeviation = vmp < 2.2 ? (2.2 - vmp) : Math.max(0, vmp - 3.2); // Ideal 2.2 - 3.2
    } else { // Midrange
      curveDeviation = vmp < 1.8 ? (1.8 - vmp) : Math.max(0, vmp - 2.8); // Ideal 1.8 - 2.8
    }

    if (curveDeviation <= 0.2) {
      metrics.curveScore = 20;
      strengths.push(`Curva de maná óptima para la estrategia (${metrics.vmp} VMP).`);
    } else if (curveDeviation <= 0.5) {
      metrics.curveScore = 15;
    } else if (curveDeviation <= 1.0) {
      metrics.curveScore = 10;
      warnings.push(`Curva ligeramente ineficiente para el arquetipo (VMP: ${metrics.vmp}).`);
    } else {
      metrics.curveScore = 0;
      warnings.push(`Curva de maná muy desconectada de la estrategia seleccionada (VMP: ${metrics.vmp}).`);
    }
    score += metrics.curveScore;
  }

  // --- CONSISTENCY SCORE (Max 20) ---
  if (spells.length > 0) {
    let playsets = 0;
    let singletons = 0;
    let totalNonLegendarySpells = 0;

    spells.forEach(c => {
      const typeLine = (c.type_line || '').toLowerCase();
      if (!typeLine.includes('legendary')) {
        totalNonLegendarySpells++;
        if (c.quantity === 4) playsets++;
        if (c.quantity === 1) singletons++;
      }
    });

    if (totalNonLegendarySpells > 0) {
      // Un mazo consistente tiene buenos playsets y pocos singletons (salvo tutores)
      const singletonRatio = singletons / totalNonLegendarySpells;
      const playsetRatio = playsets / totalNonLegendarySpells;

      if (playsetRatio >= 0.4 && singletonRatio < 0.2) {
        metrics.consistencyScore = 20;
        strengths.push("Alta redundancia. Gran cantidad de Playsets (4x) minimiza la varianza.");
      } else if (playsetRatio >= 0.2 && singletonRatio < 0.4) {
        metrics.consistencyScore = 15;
        strengths.push("Consistencia aceptable.");
      } else if (singletonRatio >= 0.6) {
        metrics.consistencyScore = 5;
        warnings.push("Varianza alta. Demasiadas copias únicas (1-of) sin tutores obvios.");
      } else {
        metrics.consistencyScore = 10;
      }
    } else {
      metrics.consistencyScore = 10; // Si todos son legendarios, neutral.
    }
    score += metrics.consistencyScore;
  }

  // CALCULAR GRADO FINAL
  let grade = 'F';
  if (score >= 95) grade = 'S';
  else if (score >= 85) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 50) grade = 'C';

  return {
    score,
    grade,
    metrics,
    warnings,
    strengths
  };
}
