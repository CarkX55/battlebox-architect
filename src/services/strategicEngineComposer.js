/**
 * src/services/strategicEngineComposer.js
 * 
 * Hito 4: Strategic Engine Composer & Dynamic Blueprint Generation
 * 
 * Traduce el VictoryPlan, GoalGraph y EngineGraph en un Blueprint Dinámico con cuotas de slots,
 * asignando prioridades y flexibilidades sin usar plantillas estáticas rígidas.
 */

import { createFunctionalSlot, calculateDynamicObjective } from '../models/deckModels.js';

function buildSlotMetadata(node, intent) {
  const tribe = intent?.tribe && intent.tribe !== 'none' && intent.tribe !== 'ninguna' ? intent.tribe : (intent?.userPrompt || 'Ecosistema');
  const colorsStr = (intent?.colors || ['G']).join('').toLowerCase();
  const tribeLower = tribe.toLowerCase();
  const promptLower = (intent?.userPrompt || '').toLowerCase();
  const isWallDeck = promptLower.includes('muro') || promptLower.includes('wall') || promptLower.includes('defender') || tribeLower.includes('wall') || tribeLower.includes('defender');
  
  const idLower = (node.id || '').toLowerCase();
  const labelLower = (node.label || '').toLowerCase();
  
  let name = `${node.label || 'Core Motor'} (${tribe})`;
  let purposeDescription = `Despliega componentes de ${node.label || 'Motor Táctico'} alineados con el plan de victoria de ${tribe}.`;
  let searchQuery = `[CAPABILITY CONTRACT] Needs: ${node.capabilities?.[0] || 'CoreFunction'} | CMC <= 3`;
  let cmcCategory = '2';
  let finisherQuality = 'standard';

  if (isWallDeck) {
    if (idLower.includes('token') || labelLower.includes('token') || labelLower.includes('board') || idLower.includes('gowide')) {
      name = `Masa Temprana de Muros y Defensores (T1-T3)`;
      purposeDescription = `Despliega defensores eficientes a bajo coste para detener ataques iniciales y establecer la base del plan.`;
      searchQuery = `[CONTRACT: EarlyDefender] (t:wall or o:defender) mv<=3 c<=${colorsStr}`;
      cmcCategory = '2';
    } else if (idLower.includes('anthem') || idLower.includes('buff') || labelLower.includes('anthem') || labelLower.includes('lord') || labelLower.includes('synergy')) {
      name = `Habilitadores de Ataque & Payoffs de Resistencia`;
      purposeDescription = `Permite a tus defensores atacar asignando daño igual a su resistencia (Arcades, High Alert, etc.).`;
      searchQuery = `[CONTRACT: DefenderPayoff] (o:"assigns combat damage equal to its toughness" or o:"can attack as though it didn't have defender") c<=${colorsStr}`;
      cmcCategory = '3';
    } else if (idLower.includes('draw') || idLower.includes('advantage') || labelLower.includes('draw')) {
      name = `Robo de Cartas Compatible con Defensores`;
      purposeDescription = `Mantiene la ventaja de cartas mediante cantrips de muros o sinergias al entrar criaturas con defender.`;
      searchQuery = `[CONTRACT: DefenderCardDraw] (o:"creature with defender enters" or (t:wall and o:draw)) c<=${colorsStr}`;
      cmcCategory = '2';
    } else if (idLower.includes('ramp') || idLower.includes('mana') || labelLower.includes('ramp')) {
      name = `Fijado de Maná y Estabilidad de Curva`;
      purposeDescription = `Asegura tierras y maná de tus colores principales para desplegar tus cartas clave a tiempo.`;
      searchQuery = `[CONTRACT: ManaStability] (type:land or o:"add ") c<=${colorsStr} mv<=2`;
      cmcCategory = '1';
    } else if (idLower.includes('removal') || idLower.includes('protection') || idLower.includes('interaction')) {
      name = `Interacción y Remoción Puntual`;
      purposeDescription = `Elimina amenazas voladoras o clave del rival a bajo coste instantáneo.`;
      searchQuery = `[CONTRACT: Interaction] (type:instant or type:sorcery) (o:destroy or o:exile or o:counter) mv<=2 c<=${colorsStr}`;
      cmcCategory = '2';
    } else if (idLower.includes('finisher') || labelLower.includes('finisher')) {
      name = `Remate por Explosión de Resistencia`;
      purposeDescription = `Convierte la masa acumulada de muros en un golpe letal en un solo turno.`;
      searchQuery = `[CONTRACT: DefenderFinisher] (o:"creatures you control get" and o:toughness) or (o:defender and mv>=4)`;
      cmcCategory = '4+';
      finisherQuality = 'finisher';
    }
    return { name, purposeDescription, search_query: searchQuery, cmcCategory, finisherQuality };
  }

  const isSaprolingOrFungus = tribeLower.includes('saprolin') || tribeLower.includes('fungus') || tribeLower.includes('hongo');

  if (idLower.includes('token') || labelLower.includes('token') || labelLower.includes('board') || idLower.includes('gowide')) {
    name = `Generadores de Fichas (${tribe})`;
    purposeDescription = `Produce fichas de criatura ${tribe} de forma recurrente para establecer presencia temprana en mesa.`;
    searchQuery = isSaprolingOrFungus
      ? `[CONTRACT: TokenEngine] (t:saproling or t:fungus or o:"fungus creature token")`
      : `[CONTRACT: TokenEngine] (t:${tribeLower} or o:${tribeLower} or o:"create token") c<=${colorsStr}`;
    cmcCategory = '2';
  } else if (idLower.includes('sacrifice') || labelLower.includes('sacrifice') || idLower.includes('fodder')) {
    name = `Motores de Sacrificio y Alimento (${tribe})`;
    purposeDescription = `Sacrifica fichas o criaturas recurrentes para obtener ventajas de cartas, vidas o daño.`;
    searchQuery = `[CONTRACT: SacrificeEngine] (o:sacrifice or o:dies) c<=${colorsStr}`;
    cmcCategory = '2';
  } else if (idLower.includes('anthem') || idLower.includes('buff') || labelLower.includes('anthem') || labelLower.includes('lord') || labelLower.includes('synergy')) {
    name = `Himnos y Multiplicadores de Fichas`;
    purposeDescription = `Potencia a todas tus fichas y criaturas con bonificadores globales +1/+1 o multiplicadores de fichas.`;
    searchQuery = `[CONTRACT: AnthemEngine] (o:"tokens you control get" or o:"+1/+1") c<=${colorsStr}`;
    cmcCategory = '3';
  } else if (idLower.includes('draw') || idLower.includes('advantage') || labelLower.includes('draw') || labelLower.includes('card')) {
    name = `Motores de Ventaja de Cartas y Robo`;
    purposeDescription = `Mantiene la ventaja de recursos en mano aprovechando la mesa acumulada.`;
    searchQuery = `[CONTRACT: CardAdvantage] (o:draw or o:"card advantage") c<=${colorsStr}`;
    cmcCategory = '2';
  } else if (idLower.includes('ramp') || idLower.includes('mana') || labelLower.includes('ramp') || labelLower.includes('mana')) {
    name = `Aceleración y Rampa Temprana (T1-T2)`;
    purposeDescription = `Garantiza maná de curva rápida en Turno 1 y Turno 2 para acelerar el despliegue del motor principal.`;
    searchQuery = `[CONTRACT: ManaRamp] (o:"add " or type:land or o:"search your library for a land") c<=${colorsStr} mv<=2`;
    cmcCategory = '1';
  } else if (idLower.includes('removal') || idLower.includes('protection') || idLower.includes('interaction') || labelLower.includes('control') || labelLower.includes('removal')) {
    name = `Interacción y Remoción Eficiente`;
    purposeDescription = `Protege tus motores y elimina las mayores amenazas del oponente a bajo coste de maná.`;
    searchQuery = `[CONTRACT: Interaction] (type:instant or type:sorcery) (o:destroy or o:exile or o:deal) mv<=2 c<=${colorsStr}`;
    cmcCategory = '2';
  } else if (idLower.includes('finisher') || idLower.includes('apex') || labelLower.includes('finisher') || labelLower.includes('apex')) {
    name = `Rematadores y Bombas Letales`;
    purposeDescription = `Convierte la masa de criaturas acumuladas en el campo de batalla en letal inmediato.`;
    searchQuery = `[CONTRACT: Finisher] (o:"creatures you control get" and o:trample) or (o:"+x/+x" and o:trample)`;
    cmcCategory = '4+';
    finisherQuality = 'finisher';
  }

  return { name, purposeDescription, search_query: searchQuery, cmcCategory, finisherQuality };
}

/**
 * Compone un Blueprint Dinámico a partir de la sesión de trabajo y el EngineGraph.
 * 
 * @param {Object} session Sesión de trabajo
 * @param {Object} engineGraph Grafo de motores
 * @returns {Object} Blueprint Dinámico compuesto
 */
export function composeDynamicBlueprint(session, engineGraph) {
  const slots = [];
  const totalSpellQuota = 36;
  const totalLandQuota = 24;

  const intent = session?.deckIntent || session?.working?.intent || {};
  const deckIdentity = session?.working?.deckIdentity || session?.deckIdentity;
  const allowedEngineIds = new Set(['token_engine', 'sacrificefodder_engine', 'anthem_engine', 'draw_engine', 'ramp_engine', 'removal_engine', 'finisher_engine', 'protection_engine']);
  
  // Filter out engines forbidden by DeckIdentity (e.g. sacrificefodder_engine in a Wall deck)
  const validNodes = (engineGraph?.nodes || []).filter(n => {
    if (!allowedEngineIds.has(n.id)) return false;
    if (deckIdentity && deckIdentity.forbiddenDirections) {
      if (deckIdentity.forbiddenDirections.includes('sacrifice') && n.id === 'sacrificefodder_engine') return false;
      if (deckIdentity.forbiddenDirections.includes('surveil') && n.id.includes('surveil')) return false;
    }
    return true;
  });

  const primaryNodes = validNodes.filter(n => n.type === 'primary');
  const supportNodes = validNodes.filter(n => n.type !== 'primary');

  let assignedSpells = 0;

  // 1. Asignación de cuotas a Motores Primarios
  for (const node of primaryNodes) {
    const objPct = calculateDynamicObjective(node.id, session?.working || {}, 2);
    const qty = Math.max(6, Math.min(12, Math.round((objPct / 100) * 10)));
    const meta = buildSlotMetadata(node, intent);

    const slot = createFunctionalSlot(node, {
      id: `${node.id}_primary_slot`,
      label: meta.name,
      name: meta.name,
      purposeDescription: meta.purposeDescription,
      search_query: meta.search_query,
      cmcCategory: meta.cmcCategory,
      finisherQuality: meta.finisherQuality,
      quantity: qty,
      capabilities: node.capabilities,
      priority: 'high',
      flexibility: 'low'
    });

    slots.push(slot);
    assignedSpells += qty;
  }

  // 2. Asignación de cuotas a Motores de Soporte
  for (const node of supportNodes) {
    const qty = Math.max(4, Math.min(8, Math.round((totalSpellQuota - assignedSpells) / (supportNodes.length || 1))));
    const meta = buildSlotMetadata(node, intent);

    const slot = createFunctionalSlot(node, {
      id: `${node.id}_support_slot`,
      label: meta.name,
      name: meta.name,
      purposeDescription: meta.purposeDescription,
      search_query: meta.search_query,
      cmcCategory: meta.cmcCategory,
      finisherQuality: meta.finisherQuality,
      quantity: qty,
      capabilities: node.capabilities,
      priority: 'medium',
      flexibility: 'medium'
    });

    slots.push(slot);
    assignedSpells += qty;
  }

  // Fallback si no hay slots generados
  if (slots.length === 0) {
    const defaultMeta = buildSlotMetadata({ id: 'core_spells', label: 'Core Motor' }, intent);
    slots.push(createFunctionalSlot({ id: 'core_spells' }, {
      id: 'core_spells_slot',
      label: defaultMeta.name,
      name: defaultMeta.name,
      purposeDescription: defaultMeta.purposeDescription,
      search_query: defaultMeta.search_query,
      cmcCategory: defaultMeta.cmcCategory,
      finisherQuality: defaultMeta.finisherQuality,
      quantity: totalSpellQuota,
      capabilities: ['GeneralDevelopment'],
      priority: 'high',
      flexibility: 'medium'
    }));
    assignedSpells = totalSpellQuota;
  }

  // 3. Normalizador de Cuotas (Ajustar a 36 hechizos)
  if (assignedSpells !== totalSpellQuota && slots.length > 0) {
    const diff = totalSpellQuota - assignedSpells;
    slots[0].quantity += diff;
  }

  // 4. Slot de Tierras
  const landSlot = createFunctionalSlot({ id: 'mana_base' }, {
    id: 'mana_base_slot',
    label: 'Mana Base & Lands',
    name: 'Mana Base & Lands',
    purposeDescription: 'Asegura la estabilidad de maná y fijado de colores para todos tus hechizos.',
    search_query: 'type:land',
    cmcCategory: 'any',
    finisherQuality: 'standard',
    quantity: totalLandQuota,
    capabilities: ['Mana', 'ColorFixing'],
    priority: 'critical',
    flexibility: 'none'
  });
  slots.push(landSlot);

  const archetypeTitle = intent.strategicArchetype 
    ? intent.strategicArchetype.charAt(0).toUpperCase() + intent.strategicArchetype.slice(1)
    : 'Midrange';
  const tribeTitle = intent.tribe && intent.tribe !== 'none' && intent.tribe !== 'ninguna' ? intent.tribe : (intent.userPrompt || 'Ecosistema');

  const deckName = `${tribeTitle} ${archetypeTitle} v6.0`;
  const lore = `Un mazo forjado en torno al motor causal de ${tribeTitle}, combinando desarrollo en curva y explosión de recursos.`;
  const strategy = `Plan de juego causal: Inicia con aceleración en T1, establece la masa de ${tribeTitle} en T2-T3, e impón rematadores en T4+.`;
  const mulligan = `Conserva manos iniciales con 2-3 tierras de tus colores [${(intent.colors || []).join(', ')}] y presencia en mesa desde Turno 1 o Turno 2.`;

  const blueprint = {
    blueprintId: `bp_dyn_${Date.now()}`,
    deckName,
    lore,
    strategy,
    mulligan,
    targetSpells: totalSpellQuota,
    targetLands: totalLandQuota,
    totalCards: 60,
    roles: slots,
    slots,
    decisionPolicies: session?.working?.strategyPlan?.decisionPolicies || []
  };

  return blueprint;
}
