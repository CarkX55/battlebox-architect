/**
 * src/services/hybridAssemblerService.js
 * 
 * Hito 6: Hybrid Assembler & Resource Transaction Engine
 * 
 * Ensambla el mazo seleccionando paquetes funcionales y cartas candidatas para rellenar
 * cada slot del Blueprint dinámico, escribiendo el mazo directamente en StrategicSession.working.
 */

import { addCardToWorking, takeSnapshot, consolidateDeckCards, countCopies } from '../models/strategicState.js';
import { calculateDynamicArchetypeUtility, createStrategicContributionVector } from '../models/deckModels.js';
import { matchesScryfallQuery } from '../utils/scryfallParser.js';

/**
 * Ensambla un mazo de 60 cartas en la sesión de trabajo.
 * 
 * @param {Object} session Sesión de trabajo
 * @param {Array<Object>} candidatePool Pool de cartas candidatas
 * @param {Array<Object>} functionalPackages Lista de paquetes funcionales
 * @returns {Object} StateSnapshot congelado tras ensamblado
 */
import { buildDeckIdentity } from '../judge/identity/DeckIdentityEngine.js';
import { analyzeFunctionalDependencies } from '../judge/capabilities/FunctionalDependencyMatrix.js';

/**
 * Ensambla un mazo de 60 cartas en la sesión de trabajo.
 * 
 * @param {Object} session Sesión de trabajo
 * @param {Array<Object>} candidatePool Pool de cartas candidatas
 * @param {Array<Object>} functionalPackages Lista de paquetes funcionales
 * @returns {Object} StateSnapshot congelado tras ensamblado
 */
import { evaluateCandidateAdmission } from '../judge/candidates/CandidateAdmissionGate.js';
import { scoreCapability } from '../judge/capabilities/CapabilityScorer.js';

/**
 * Ensambla un mazo de 60 cartas en la sesión de trabajo.
 * 
 * @param {Object} session Sesión de trabajo
 * @param {Array<Object>} candidatePool Pool de cartas candidatas
 * @param {Array<Object>} functionalPackages Lista de paquetes funcionales
 * @returns {Object} StateSnapshot congelado tras ensamblado
 */
export function assembleDeckInSession(session, candidatePool = [], functionalPackages = []) {
  const blueprint = session.working.blueprint;
  if (!blueprint || (!blueprint.slots && !blueprint.roles)) {
    throw new Error('No dynamic blueprint found in working session');
  }

  const slotsList = blueprint.slots || blueprint.roles || [];
  session.working.currentDeck = [];
  session.working.remainingSlots = 60;

  const spellSlots = slotsList.filter(s => s.id !== 'mana_base_slot' && !(s.name || '').toLowerCase().includes('mana base'));
  const landSlot = slotsList.find(s => s.id === 'mana_base_slot' || (s.name || '').toLowerCase().includes('mana base'));

  const intent = session.deckIntent || session.working?.intent || {};
  const deckIdentity = buildDeckIdentity(intent);

  // 1. Pool Limpio Inicial (SIN ORDENAMIENTO GLOBAL)
  const cleanPool = candidatePool.filter(c => !deckIdentity.isCardForbidden(c));

  console.log(`\n================================================`);
  console.log(`🚀 INICIANDO ENSAMBLADO V7 (CAPABILITY DRIVEN)`);
  console.log(`Pool inicial limpio: ${cleanPool.length} cartas`);
  console.log(`================================================\n`);

  // 2. Rellenar slots de hechizos mediante RANKING LOCAL Y CONTEXTSCORE POR SLOT
  for (const slot of spellSlots) {
    let needed = slot.quantity || 4;
    const slotName = slot.name || slot.label || slot.id;

    // A. Intentar rellenar desde Functional Packages
    const matchingPkg = functionalPackages.find(p => p.engine === slot.sourceEngine || p.capabilities?.some(c => slot.capabilities?.includes(c)));

    if (matchingPkg && matchingPkg.cards.length > 0) {
      for (const item of matchingPkg.cards) {
        if (needed <= 0) break;
        const existingCopies = countCopies(session.working.currentDeck.filter(c => c.name.toLowerCase() === item.card.name.toLowerCase()));
        const allowed = Math.min(needed, 4 - existingCopies);

        if (allowed > 0) {
          addCardToWorking(session, { ...item.card, quantity: allowed }, slot.id, slot.sourceEngine);
          needed -= allowed;
        }
      }
    }

    // B. Rellenar con evaluación de contrato + ranking local por ContextScore
    if (needed > 0) {
      const acceptedCandidates = [];
      const rejectedReasons = {};

      for (const card of cleanPool) {
        // Validación de admisible por Gate y Contrato
        const gateResult = evaluateCandidateAdmission(card, {
          contract: slot,
          deckIdentity,
          currentDeck: session.working.currentDeck,
          requestedColors: intent.colors
        });

        // Validación adicional por Scryfall Syntax si existe
        let matchesQuery = true;
        if (slot.search_query) {
          try {
            matchesQuery = matchesScryfallQuery(card, slot.search_query);
          } catch (e) {
            matchesQuery = true;
          }
        }

        if (gateResult.allowed && matchesQuery) {
          const capScore = scoreCapability(card, slot);
          if (capScore.valid) {
            acceptedCandidates.push({
              card,
              contextScore: capScore.contextScore,
              confidence: capScore.confidence,
              breakdown: capScore.breakdown,
              satisfiedContracts: capScore.satisfiedContracts
            });
          } else {
            rejectedReasons['CONTEXT_SCORE_ZERO'] = (rejectedReasons['CONTEXT_SCORE_ZERO'] || 0) + 1;
          }
        } else {
          const primaryReason = gateResult.reasons[0] || (!matchesQuery ? 'QUERY_MISMATCH' : 'REJECTED');
          rejectedReasons[primaryReason] = (rejectedReasons[primaryReason] || 0) + 1;
        }
      }

      // ORDENAMIENTO ESTRICTAMENTE LOCAL PARA ESTE SLOT POR CONTEXTSCORE
      acceptedCandidates.sort((a, b) => {
        if (b.contextScore !== a.contextScore) {
          return b.contextScore - a.contextScore; // Primary key: ContextScore
        }
        return (b.card.score || 0) - (a.card.score || 0); // Tie-breaker: Global Score
      });

      // LOG AUDITABLE COMPLETO POR SLOT
      const totalRejected = Object.values(rejectedReasons).reduce((a, b) => a + b, 0);
      console.log(`================================================`);
      console.log(`Slot: ${slotName}`);
      console.log(`================================================`);
      console.log(`Pool inicial: ${cleanPool.length} cartas`);
      console.log(`↓\nCapabilityValidator & AdmissionGate`);
      console.log(`Aceptadas: ${acceptedCandidates.length}`);
      console.log(`Rechazadas: ${totalRejected}`);
      console.log(`Motivos de Rechazo:`, rejectedReasons);
      console.log(`↓\nCapabilityScorer (Top 5 Candidatos Locales):`);
      acceptedCandidates.slice(0, 5).forEach((item, idx) => {
        console.log(`  ${idx + 1}. ${item.card.name} | ContextScore: ${item.contextScore} | Breakdown:`, item.breakdown);
      });

      let candidateIdx = 0;
      while (needed > 0 && candidateIdx < acceptedCandidates.length) {
        const candidateItem = acceptedCandidates[candidateIdx];
        const card = candidateItem.card;
        const existingCount = countCopies(session.working.currentDeck.filter(c => c.name.toLowerCase() === card.name.toLowerCase()));

        if (existingCount < 4) {
          const allowed = Math.min(needed, 4 - existingCount);
          addCardToWorking(session, { ...card, quantity: allowed }, slot.id, slot.sourceEngine);
          needed -= allowed;
          console.log(`↓\nSeleccionada para mazo: ${card.name} (${allowed}x) [ContextScore: ${candidateItem.contextScore}]`);
        }
        candidateIdx++;
      }
      console.log(`================================================\n`);
    }
  }

  // 2. Rellenar slot de tierras de forma dinámica según pips de color reales del mazo de hechizos
  const currentSpells = session.working.currentDeck;
  const landQuota = landSlot ? landSlot.quantity : 24;

  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  currentSpells.forEach(c => {
    const cost = c.mana_cost || c.cost || '';
    const qty = Number(c.quantity || 1);
    if (cost.includes('{W}')) pips.W += (cost.match(/\{W\}/g) || []).length * qty;
    if (cost.includes('{U}')) pips.U += (cost.match(/\{U\}/g) || []).length * qty;
    if (cost.includes('{B}')) pips.B += (cost.match(/\{B\}/g) || []).length * qty;
    if (cost.includes('{R}')) pips.R += (cost.match(/\{R\}/g) || []).length * qty;
    if (cost.includes('{G}')) pips.G += (cost.match(/\{G\}/g) || []).length * qty;
  });

  const totalPips = Object.values(pips).reduce((a, b) => a + b, 0);
  const activeColors = (intent.colors && intent.colors.length > 0) ? intent.colors : Object.keys(pips).filter(k => pips[k] > 0);
  const basicNames = { W: 'Plains', U: 'Island', B: 'Swamp', R: 'Mountain', G: 'Forest' };
  const basicTypes = { W: 'Basic Land — Plains', U: 'Basic Land — Island', B: 'Basic Land — Swamp', R: 'Basic Land — Mountain', G: 'Basic Land — Forest' };

  if (activeColors.length > 0) {
    let assignedLands = 0;
    activeColors.forEach((color, idx) => {
      const colorPips = pips[color] || 1;
      const share = totalPips > 0 ? colorPips / totalPips : 1 / activeColors.length;
      let qty = (idx === activeColors.length - 1) 
        ? Math.max(1, landQuota - assignedLands) 
        : Math.max(1, Math.round(landQuota * share));
      
      assignedLands += qty;

      const basicLand = {
        name: basicNames[color] || 'Forest',
        type_line: basicTypes[color] || 'Basic Land — Forest',
        cmc: 0,
        produces: ['Mana'],
        quantity: qty
      };
      addCardToWorking(session, basicLand, 'mana_base_slot', 'mana_engine');
    });
  } else {
    const defaultForest = { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, produces: ['Mana'], quantity: Math.ceil(landQuota / 2) };
    const defaultPlains = { name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0, produces: ['Mana'], quantity: Math.floor(landQuota / 2) };
    addCardToWorking(session, defaultForest, 'mana_base_slot', 'mana_engine');
    addCardToWorking(session, defaultPlains, 'mana_base_slot', 'mana_engine');
  }

  // Consolidar el mazo de trabajo para agrupar en 4x / 2x
  session.working.currentDeck = consolidateDeckCards(session.working.currentDeck);

  // 3. Calcular métricas iniciales y Utilidad Dinámica
  session.working.hierarchicalUtility = calculateDynamicArchetypeUtility(
    {
      policyComplianceScore: 85,
      currentWinPathProbability: 62,
      avgCardMetaConfidence: 80
    },
    session.deckIntent.strategicArchetype
  );

  // 4. Tomar Snapshot del estado ensamblado
  const snapshot = takeSnapshot(session, 'assembled');
  return snapshot;
}
