import { 
  getManaValue, 
  isLand, 
  calculateVMP, 
  calculatePerfectLandCount 
} from './deckCalculator.js';
import { CORE_PACKAGES } from '../constants/corePackages.js';
import { COMPETITIVE_ANTI_SYNERGIES } from '../constants/legacyBattleBox.js';

export const CURVE_BOUNDS = {
  blitz: { min: 0.5, max: 1.8 },
  aggressive: { min: 1.8, max: 2.4 },
  balanced: { min: 2.2, max: 3.2 },
  heavy: { min: 2.8, max: 3.8 }
};

/**
 * EL BOTÓN DE PÁNICO: Interceptor de Curva en Tiempo Real
 * Calcula el VMP de las cartas actuales y activa el 'panicMode' si la curva excede los límites seguros.
 * @param {Array} currentSpells - Array temporal de hechizos ya insertados en el mazo.
 * @param {string} curveProfile - Perfil de curva esperado (ej. 'aggressive', 'balanced').
 * @returns {Object} Estado de alarma: { panicMode: boolean, currentVmp: number, maxAllowedCmc: number }
 */
export function calculateRealTimeVMPWarning(currentSpells, curveProfile = 'balanced') {
  if (!currentSpells || currentSpells.length < 5) {
    // No hay suficiente muestra para saltar la alarma
    return { panicMode: false, currentVmp: 0, maxAllowedCmc: 99 };
  }

  const vmp = calculateVMP(currentSpells);
  const bounds = CURVE_BOUNDS[curveProfile] || CURVE_BOUNDS.balanced;

  // Si superamos el máximo absoluto tolerado para el arquetipo, entramos en pánico
  if (vmp > bounds.max) {
    // Si la curva está rota, forzamos a que solo se acepten costes muy bajos para equilibrar
    let maxAllowed = 2; 
    if (curveProfile === 'blitz' || curveProfile === 'aggressive') maxAllowed = 1;
    if (curveProfile === 'heavy') maxAllowed = 3;

    return { 
      panicMode: true, 
      currentVmp: vmp, 
      maxAllowedCmc: maxAllowed 
    };
  }

  return { panicMode: false, currentVmp: vmp, maxAllowedCmc: 99 };
}

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
    strategyScore: 20, // Inicializado a 20, penalizado según no-bos o core ausente
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

  // --- STRUCTURE SCORE (Max 20) ---
  if (totalMain === targetMainSize) {
    metrics.structureScore = 20;
    strengths.push(`Tamaño del mazo perfecto (${targetMainSize} cartas).`);
  } else {
    metrics.structureScore = 0;
    warnings.push(`El mazo principal tiene ${totalMain} cartas (debería tener ${targetMainSize}).`);
  }
  score += metrics.structureScore;

  // 2. Separación de Tierras y Spells
  const lands = deckList.filter(isLand);
  const spells = deckList.filter(c => !isLand(c));
  
  const landCount = lands.reduce((sum, c) => sum + (c.quantity || 1), 0);

  // --- MANA SCORE (Max 20) ---
  if (totalMain > 0 && spells.length > 0) {
    const perfectLands = calculatePerfectLandCount(spells, formData, isYorion);
    const deviation = Math.abs(landCount - Math.round(perfectLands));
    metrics.landDeviation = deviation;

    if (deviation <= 0.5) {
      metrics.manaScore = 20;
      strengths.push(`Base de maná matemáticamente perfecta (Karsten). Ideal: ~${Math.round(perfectLands)}, Actual: ${landCount}.`);
    } else if (deviation <= 1.5) {
      metrics.manaScore = 15;
      strengths.push("Base de maná aceptable, desviación menor a 2 tierras.");
    } else if (deviation <= 2.5) {
      metrics.manaScore = 10;
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

    // Obtener perfil de curva y rango objetivo
    const profile = formData?.curveProfile || 'balanced';
    const bounds = CURVE_BOUNDS[profile] || CURVE_BOUNDS.balanced;

    let curveDeviation = 0;
    if (vmp < bounds.min) {
      curveDeviation = bounds.min - vmp;
    } else if (vmp > bounds.max) {
      curveDeviation = vmp - bounds.max;
    }

    if (curveDeviation <= 0.2) {
      metrics.curveScore = 20;
      strengths.push(`Curva de maná óptima para la estrategia (${metrics.vmp} VMP en perfil ${profile}).`);
    } else if (curveDeviation <= 0.5) {
      metrics.curveScore = 15;
    } else if (curveDeviation <= 1.0) {
      metrics.curveScore = 10;
      warnings.push(`Curva ligeramente ineficiente para el arquetipo (VMP: ${metrics.vmp}, perfil deseado: ${profile}).`);
    } else {
      metrics.curveScore = 0;
      warnings.push(`Curva de maná muy desconectada de la estrategia seleccionada (VMP: ${metrics.vmp}, perfil deseado: ${profile}).`);
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

      const playstyle = (formData?.playstyle || 'balanced').toLowerCase();

      if (playstyle === 'linear') {
        // En lineal queremos máxima redundancia (muchos playsets)
        if (playsetRatio >= 0.5 && singletonRatio < 0.1) {
          metrics.consistencyScore = 20;
          strengths.push("Alta redundancia lineal ideal. Mazo repleto de playsets de 4x.");
        } else if (playsetRatio >= 0.3 && singletonRatio < 0.25) {
          metrics.consistencyScore = 15;
        } else {
          metrics.consistencyScore = 10;
          warnings.push("Varianza lineal mejorable. Se recomiendan más playsets (4x) para esta configuración lineal.");
        }
      } else if (playstyle === 'adaptive') {
        // En adaptativo valoramos la variedad (singletons y doubletons)
        if (singletonRatio >= 0.4 && playsetRatio <= 0.1) {
          metrics.consistencyScore = 20;
          strengths.push("Excelente versatilidad adaptativa. Configuración tipo Toolbox con variedad de 1-ofs.");
        } else if (singletonRatio >= 0.25 && playsetRatio <= 0.25) {
          metrics.consistencyScore = 15;
        } else {
          metrics.consistencyScore = 10;
          warnings.push("Varianza adaptativa subóptima. Se sugieren más cartas únicas (1-of/2-of) para mayor flexibilidad.");
        }
      } else {
        // Modo balanceado estándar
        if (playsetRatio >= 0.4 && singletonRatio < 0.2) {
          metrics.consistencyScore = 20;
          strengths.push("Alta redundancia balanceada. Gran cantidad de Playsets (4x) minimiza la varianza.");
        } else if (playsetRatio >= 0.2 && singletonRatio < 0.4) {
          metrics.consistencyScore = 15;
          strengths.push("Consistencia aceptable.");
        } else if (singletonRatio >= 0.6) {
          metrics.consistencyScore = 5;
          warnings.push("Varianza alta. Demasiadas copias únicas (1-of) sin tutores obvios.");
        } else {
          metrics.consistencyScore = 10;
        }
      }
    } else {
      metrics.consistencyScore = 10;
    }
    score += metrics.consistencyScore;
  }

  // --- STRATEGY SCORE (Max 20) ---
  if (spells.length > 0) {
    const activeStrategy = (formData?.strategy || '').toLowerCase();
    const activeTribe = (formData?.tribe || '').toLowerCase();
    
    // A. Control de Anti-sinergias Graves
    COMPETITIVE_ANTI_SYNERGIES.forEach(rule => {
      if (rule.strategy.toLowerCase() === activeStrategy) {
        const hasAntiSynergyCard = deckList.some(c => c.name.toLowerCase() === rule.card.toLowerCase());
        if (hasAntiSynergyCard) {
          metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
          warnings.push(`Anti-sinergia severa: "${rule.card}" fricciona con tu estrategia "${activeStrategy}". Razón: ${rule.reason}`);
        }
      }
    });

    // B. Presencia del Core Package
    if (activeStrategy && CORE_PACKAGES[activeStrategy]) {
      const formatKey = (formData?.format || 'MODERN').toUpperCase();
      const pkg = CORE_PACKAGES[activeStrategy];
      const formatPkg = pkg[formatKey] || pkg.MODERN || pkg.default;
      const variant = formatPkg?.default || [];
      
      if (variant.length > 0) {
        let corePresent = 0;
        let totalCoreNeeded = variant.length;
        
        variant.forEach(item => {
          const inDeck = deckList.some(c => c.name.toLowerCase() === item.name.toLowerCase());
          if (inDeck) corePresent++;
        });

        const coreRatio = corePresent / totalCoreNeeded;
        if (coreRatio < 0.75) {
          const missingPct = Math.round((1 - coreRatio) * 100);
          const penalty = Math.round((1 - coreRatio) * 10); // penalización de hasta 10 puntos
          metrics.strategyScore = Math.max(0, metrics.strategyScore - penalty);
          warnings.push(`Falta de consistencia Core. Has omitido el ${missingPct}% de las cartas clave del Core de la estrategia.`);
        } else {
          strengths.push(`Coherencia de Motores excelente: el ${Math.round(coreRatio * 100)}% del core táctico está presente.`);
        }
      }
    }

    // C. Distribución de Criaturas por Arquetipo
    const totalCreatures = deckList.filter(c => !isLand(c) && (c.type_line || '').toLowerCase().includes('creature')).reduce((sum, c) => sum + (c.quantity || 1), 0);
    const arch = (formData?.archetype || 'midrange').toLowerCase();
    
    if (arch === 'aggro' && totalCreatures < 16) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
      warnings.push(`Falta de amenaza física: Tu mazo es Aggro pero solo tienes ${totalCreatures} criaturas (se recomiendan >= 20).`);
    } else if (arch === 'control' && totalCreatures > 12) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 5);
      warnings.push(`Exceso de criaturas en mazo de Control: Tienes ${totalCreatures} criaturas (se recomiendan <= 8 para evitar no-bos con iras).`);
    } else if (arch === 'tempo' && (totalCreatures < 8 || totalCreatures > 16)) {
      metrics.strategyScore = Math.max(0, metrics.strategyScore - 3);
      warnings.push(`Inconsistencia en amenazas de Tempo: Tienes ${totalCreatures} criaturas (se recomiendan de 10 a 14).`);
    }

    if (metrics.strategyScore >= 18) {
      strengths.push("Coherencia táctica y sinérgica impecable. Sin conflictos estratégicos detectados.");
    }
    
    score += metrics.strategyScore;
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
