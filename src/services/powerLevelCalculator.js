/**
 * src/services/powerLevelCalculator.js
 * 
 * Holistic Competitive Power Level Calculator (1-10 Scale).
 * Evaluates:
 *  1. Density of constructed staples, Rares & Mythics.
 *  2. Playset consistency (4x core packages vs random 1-ofs).
 *  3. Mana base quality (Karsten duals, painlands, fastlands vs basic taplands).
 *  4. Archetype-aware velocity & engines (Ramp acceleration + big payoffs, Aggro speed, Control answers).
 *  5. Interaction and disruption density.
 */

export function calculateDeckPowerLevel(deck = [], format = 'STANDARD', archetype = '') {
  if (!Array.isArray(deck) || deck.length === 0) {
    return {
      score: 5,
      exactScore: 5.0,
      text: 'Normal',
      color: 'text-yellow-400',
      tierLabel: 'Tier 3',
      rareCount: 0,
      mythicCount: 0,
      playsetCount: 0,
      avgCmc: '0.00',
      rampCount: 0,
      finisherCount: 0,
      interactionCount: 0
    };
  }

  let rareCount = 0;
  let mythicCount = 0;
  let uncommonCount = 0;
  let commonCount = 0;
  let spellCount = 0;
  let cmcTotal = 0;
  let landCount = 0;
  let nonBasicLandCount = 0;
  let rampAccelerationCount = 0;
  let finisherThreatCount = 0;
  let interactionCount = 0;
  let playsetCount = 0;
  let singletonCount = 0;

  const archLower = (archetype || '').toLowerCase();
  const isRampOrBigMana = archLower.includes('ramp') || archLower.includes('titan') || archLower.includes('tron') || archLower.includes('big mana') || archLower.includes('reanimat');
  const isAggroOrTempo = archLower.includes('aggro') || archLower.includes('burn') || archLower.includes('sligh') || archLower.includes('tempo') || archLower.includes('prowess');
  const isControlOrMidrange = archLower.includes('control') || archLower.includes('midrange') || archLower.includes('rock');

  deck.forEach(card => {
    const qty = Number(card.quantity || 1);
    const typeLine = (card.type_line || card.cardObj?.type_line || card.details?.type_line || '').toLowerCase();
    const name = (card.name || '').toLowerCase();
    const oracle = (card.oracle_text || card.text || card.cardObj?.oracle_text || '').toLowerCase();
    const rarity = (card.rarity || card.cardObj?.rarity || card.details?.rarity || 'common').toLowerCase();
    const manaValue = Number(card.mana_value ?? card.cmc ?? card.cardObj?.mana_value ?? card.cardObj?.cmc ?? 0);

    const isLand = typeLine.includes('land');
    const isBasic = name === 'plains' || name === 'island' || name === 'swamp' || name === 'mountain' || name === 'forest' || name === 'wastes';

    if (qty >= 4) playsetCount += 1;
    else if (qty === 1 && !isBasic) singletonCount += 1;

    if (isLand) {
      landCount += qty;
      if (!isBasic) {
        nonBasicLandCount += qty;
        if (rarity === 'rare' || rarity === 'mythic') rareCount += qty;
      }
    } else {
      spellCount += qty;
      cmcTotal += manaValue * qty;

      if (rarity === 'mythic') mythicCount += qty;
      else if (rarity === 'rare') rareCount += qty;
      else if (rarity === 'uncommon') uncommonCount += qty;
      else commonCount += qty;

      // Detección de motores de aceleración / trampas
      if (
        oracle.includes('add {') || oracle.includes('search your library for a land') ||
        oracle.includes('additional land') || oracle.includes('without paying its mana cost') ||
        oracle.includes('hideaway') || oracle.includes('manifest') || (typeLine.includes('creature') && oracle.includes('{t}: add'))
      ) {
        rampAccelerationCount += qty;
      }

      // Detección de amenazas colosales / rematadores
      if (manaValue >= 5 || (typeLine.includes('creature') && Number(card.power || 0) >= 5) || (oracle.includes('trample') && manaValue >= 4)) {
        finisherThreatCount += qty;
      }

      // Detección de interacción
      if (
        oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('counter target') ||
        (oracle.includes('deals') && oracle.includes('damage to target')) || oracle.includes('choose one')
      ) {
        interactionCount += qty;
      }
    }
  });

  const avgCmc = spellCount > 0 ? cmcTotal / spellCount : 2.5;

  // ── FÓRMULA HOLÍSTICA DE PODER COMPETITIVO (Escala 1 a 10) ──
  // Base neutral calibrada: un mazo básico de comunes comienza en 3.0 (Casual)
  let powerScore = 3.0;

  // 1. Rareza de impacto Constructed (hasta +3.2 puntos)
  const highPowerCount = rareCount + mythicCount;
  const rarityContribution = (mythicCount * 0.25) + (rareCount * 0.15) + (uncommonCount * 0.02);
  powerScore += Math.min(3.2, rarityContribution);

  // 2. Cohesión y Consistencia de Playsets (hasta +1.4 puntos)
  if (playsetCount >= 6) {
    // Si los playsets son de cartas raras/míticas/buenas, el bonus es completo
    if (highPowerCount >= 8) {
      powerScore += 1.4;
    } else {
      powerScore += 0.4;
    }
  } else if (playsetCount >= 3) {
    powerScore += 0.5;
  }

  // Penalización por dispersión caótica de 1x sin tutor (salvo Commander)
  if (singletonCount >= 6 && format !== 'COMMANDER') {
    powerScore -= 0.8;
  }

  // 3. Calidad de la Base de Maná (Duals, Painlands, Fastlands, Shocks) (hasta +1.2 puntos)
  if (landCount > 0) {
    const nonBasicRatio = nonBasicLandCount / landCount;
    if (nonBasicRatio >= 0.5) powerScore += 1.2;
    else if (nonBasicRatio >= 0.25) powerScore += 0.6;
  }

  // 4. Bonificación por Inteligencia de Arquetipo (hasta +1.5 puntos)
  if (isRampOrBigMana) {
    // Si es Ramp y tiene aceleradores sólidos + rematadores brutales: ALTO PODER
    if (rampAccelerationCount >= 6 && finisherThreatCount >= 4) {
      powerScore += 1.4;
    } else if (rampAccelerationCount >= 4) {
      powerScore += 0.7;
    }
  } else if (isAggroOrTempo) {
    // Si es Aggro/Tempo y su curva es baja y veloz
    if (avgCmc <= 2.2) powerScore += 1.4;
    else if (avgCmc <= 2.6) powerScore += 0.8;
    else if (avgCmc >= 3.6) powerScore -= 0.8; // Curva demasiado pesada para Aggro
  } else if (isControlOrMidrange) {
    // Si es Control/Midrange con interacción y flujo
    if (interactionCount >= 6) powerScore += 1.2;
    if (avgCmc >= 2.3 && avgCmc <= 3.4) powerScore += 0.5;
  } else {
    // General
    if (interactionCount >= 4) powerScore += 0.4;
    if (avgCmc <= 2.8) powerScore += 0.4;
  }

  // Clamping exacto entre 1 y 10
  const finalScore = Math.max(1, Math.min(10, Math.round(powerScore * 10) / 10));
  const roundedInt = Math.max(1, Math.min(10, Math.round(finalScore)));

  let text = 'Normal / Equilibrado';
  let color = 'text-yellow-400';
  let tierLabel = 'Tier 2.5';

  if (roundedInt >= 9) {
    text = 'Competitivo Élite / Pro';
    color = 'text-amber-300';
    tierLabel = 'Tier 1 / Pro';
  } else if (roundedInt >= 7) {
    text = 'Fuerte / Optimizado';
    color = 'text-emerald-400';
    tierLabel = 'Tier 1.5 - 2';
  } else if (roundedInt >= 5) {
    text = 'Equilibrado / Construido';
    color = 'text-cyan-400';
    tierLabel = 'Tier 3';
  } else if (roundedInt >= 4) {
    text = 'Temático / Casual Pulido';
    color = 'text-stone-300';
    tierLabel = 'Casual +';
  } else {
    text = 'Casual / Principiante';
    color = 'text-stone-500';
    tierLabel = 'Casual';
  }

  return {
    score: roundedInt,
    exactScore: finalScore,
    text,
    color,
    tierLabel,
    rareCount,
    mythicCount,
    playsetCount,
    avgCmc: avgCmc.toFixed(2),
    rampCount: rampAccelerationCount,
    finisherCount: finisherThreatCount,
    interactionCount
  };
}
