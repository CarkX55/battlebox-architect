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
  const tribeLower = (intent.tribe || intent.userPrompt || '').toLowerCase();

  // Filtrar candidatePool con DeckIdentityEngine (eliminar direcciones prohibidas)
  const cleanPool = candidatePool.filter(c => !deckIdentity.isCardForbidden(c));

  // Ordenar el pool de candidatos priorizando coincidencia temática/tribal genuina (Lord, Miembro o Generador)
  const sortedPool = [...cleanPool].sort((a, b) => {
    const typeLineA = (a.type_line || '').toLowerCase();
    const typeLineB = (b.type_line || '').toLowerCase();
    const textA = `${a.name} ${a.type_line || ''} ${a.oracle_text || ''}`.toLowerCase();
    const textB = `${b.name} ${b.type_line || ''} ${b.oracle_text || ''}`.toLowerCase();
    
    // Coincidencia tribal si es de la tribu o genera fichas/himnos de la tribu (NO si es un removal anti-tribu)
    const isProTribeA = tribeLower && (typeLineA.includes(tribeLower) || (textA.includes(tribeLower) && (textA.includes('create') || textA.includes('token') || textA.includes('control'))));
    const isProTribeB = tribeLower && (typeLineB.includes(tribeLower) || (textB.includes(tribeLower) && (textB.includes('create') || textB.includes('token') || textB.includes('control'))));

    const tribeMatchA = isProTribeA ? 500 : 0;
    const tribeMatchB = isProTribeB ? 500 : 0;
    
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
        const existingCopies = countCopies(session.working.currentDeck.filter(c => c.name.toLowerCase() === item.card.name.toLowerCase()));
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
        // Rampa exige aceleración real de maná (prohibir hechizos de cmc<=2 sin aceleración)
        if (isRampSlot) return text.includes('add ') || text.includes('search your library for a land') || text.includes('search your library for a basic land') || text.includes('put a land card') || text.includes('additional land');
        // Remoción exige interacción (prohibir cantrips o tutores pasivos)
        if (isRemovalSlot) return text.includes('destroy') || text.includes('exile') || text.includes('deal') || text.includes('counter target') || text.includes('fight') || text.includes('-x/-x');
        // Finishers exigen impacto real en mesa
        if (isFinisherSlot) return text.includes('trample') || text.includes('+x/+x') || text.includes('haste') || text.includes('creatures you control get') || text.includes('flying') || text.includes('indestructible') || text.includes('win the game') || (card.mana_value || card.cmc || 0) >= 5;
        return true;
      });

      const poolToUse = categoryFiltered.length > 0 ? categoryFiltered : matchingCandidates;
      let candidateIdx = 0;

      while (needed > 0 && poolToUse.length > 0 && candidateIdx < poolToUse.length * 2) {
        const card = poolToUse[candidateIdx % poolToUse.length];
        const depAnalysis = analyzeFunctionalDependencies(card, session.working.currentDeck);
        const existingCount = countCopies(session.working.currentDeck.filter(c => c.name.toLowerCase() === card.name.toLowerCase()));

        if (existingCount < 4 && depAnalysis.isSatisfied) {
          const allowed = Math.min(needed, 4 - existingCount);
          addCardToWorking(session, { ...card, quantity: allowed }, slot.id, slot.sourceEngine);
          needed -= allowed;
        }
        candidateIdx++;
      }
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
