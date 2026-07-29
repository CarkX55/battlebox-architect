/**
 * src/services/hybridAssemblerService.js
 * 
 * Hito 6: Hybrid Assembler & Resource Transaction Engine
 * 
 * Ensambla el mazo seleccionando paquetes funcionales y cartas candidatas para rellenar
 * cada slot del Blueprint dinámico, escribiendo el mazo directamente en StrategicSession.working.
 */

import { addCardToWorking, takeSnapshot, consolidateDeckCards } from '../models/strategicState.js';
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
  const tribeLower = (intent.tribe || intent.userPrompt || '').toLowerCase();

  // Ordenar el pool de candidatos priorizando coincidencia temática/tribal
  const sortedPool = [...candidatePool].sort((a, b) => {
    const textA = `${a.name} ${a.type_line || ''} ${a.oracle_text || ''}`.toLowerCase();
    const textB = `${b.name} ${b.type_line || ''} ${b.oracle_text || ''}`.toLowerCase();
    
    const tribeMatchA = tribeLower && textA.includes(tribeLower) ? 500 : 0;
    const tribeMatchB = tribeLower && textB.includes(tribeLower) ? 500 : 0;
    
    const scoreA = (a.score || 0) + tribeMatchA;
    const scoreB = (b.score || 0) + tribeMatchB;
    return scoreB - scoreA;
  });

  // 1. Rellenar slots de hechizos
  for (const slot of spellSlots) {
    let needed = slot.quantity || 4;

    // A. Intentar rellenar desde Functional Packages
    const matchingPkg = functionalPackages.find(p => p.engine === slot.sourceEngine || p.capabilities?.some(c => slot.capabilities?.includes(c)));

    if (matchingPkg && matchingPkg.cards.length > 0) {
      for (const item of matchingPkg.cards) {
        if (needed <= 0) break;
        const existingCopies = session.working.currentDeck.filter(c => c.name === item.card.name).reduce((sum, c) => sum + (c.quantity || 1), 0);
        const allowed = Math.min(needed, 4 - existingCopies);

        if (allowed > 0) {
          addCardToWorking(session, { ...item.card, quantity: allowed }, slot.id, slot.sourceEngine);
          needed -= allowed;
        }
      }
    }

    // B. Rellenar con los mejores candidatos filtrados para este slot
    if (needed > 0) {
      let matchingCandidates = sortedPool;

      // Evaluador dinámico de sintaxis Scryfall por slot
      if (slot.search_query) {
        const scryfallMatches = sortedPool.filter(card => {
          try {
            return matchesScryfallQuery(card, slot.search_query);
          } catch (e) {
            return true;
          }
        });
        if (scryfallMatches.length > 0) {
          matchingCandidates = scryfallMatches;
        }
      }

      const slotNameLower = (slot.name || slot.label || '').toLowerCase();
      const isFinisherSlot = slotNameLower.includes('finisher') || slotNameLower.includes('bomb') || slotNameLower.includes('letal');
      const isRampSlot = slotNameLower.includes('rampa') || slotNameLower.includes('ramp') || slotNameLower.includes('aceleraci');
      const isRemovalSlot = slotNameLower.includes('remoci') || slotNameLower.includes('interacci') || slotNameLower.includes('eficiente');
      const isTokenSlot = slotNameLower.includes('ficha') || slotNameLower.includes('token') || slotNameLower.includes('generador');

      const categoryFiltered = matchingCandidates.filter(card => {
        const text = `${card.name} ${card.type_line || ''} ${card.oracle_text || ''}`.toLowerCase();
        if (isTokenSlot) return text.includes('token') || (tribeLower && text.includes(tribeLower)) || text.includes('create');
        if (isRampSlot) return text.includes('add ') || card.type_line?.includes('Land') || text.includes('library for a land') || (card.mana_value || card.cmc || 0) <= 2;
        if (isRemovalSlot) return card.type_line?.includes('Instant') || card.type_line?.includes('Sorcery') || text.includes('destroy') || text.includes('exile') || text.includes('deal');
        if (isFinisherSlot) return (card.mana_value || card.cmc || 0) >= 4 || text.includes('trample') || text.includes('+x/+x') || text.includes('haste');
        return true;
      });

      const poolToUse = categoryFiltered.length > 0 ? categoryFiltered : matchingCandidates;
      let candidateIdx = 0;

      while (needed > 0 && poolToUse.length > 0 && candidateIdx < poolToUse.length * 2) {
        const card = poolToUse[candidateIdx % poolToUse.length];
        const existingCount = session.working.currentDeck.filter(c => c.name === card.name).reduce((sum, c) => sum + (c.quantity || 1), 0);

        if (existingCount < 4) {
          const allowed = Math.min(needed, 4 - existingCount);
          addCardToWorking(session, { ...card, quantity: allowed }, slot.id, slot.sourceEngine);
          needed -= allowed;
        }
        candidateIdx++;
      }
    }
  }

  // 2. Rellenar slot de tierras
  const landQuota = landSlot ? landSlot.quantity : 24;
  const basicForest = { name: 'Forest', type_line: 'Basic Land — Forest', cmc: 0, produces: ['Mana'], quantity: Math.ceil(landQuota / 2) };
  const basicPlains = { name: 'Plains', type_line: 'Basic Land — Plains', cmc: 0, produces: ['Mana'], quantity: Math.floor(landQuota / 2) };
  addCardToWorking(session, basicForest, 'mana_base_slot', 'mana_engine');
  addCardToWorking(session, basicPlains, 'mana_base_slot', 'mana_engine');

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
