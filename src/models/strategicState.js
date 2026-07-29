/**
 * strategicState.js - Estado Inmutable y Sesión de Trabajo con Snapshots (Git-like)
 * 
 * Regla SSOT:
 * - StrategicSession almacena el estado vivo de la construcción
 * - Cada fase congela un StateSnapshot inmutable (Object.freeze)
 * - Los snapshots permiten comparación cuantitativa de utilidad y rollback instantáneo
 */

import { createResourceBudget } from './deckModels.js';

// ─── 1. SNAPSHOT: Estado inmutable congelado ───────────────────────────────
export function createStateSnapshot(data = {}) {
  return Object.freeze({
    snapshotId: data.snapshotId || 0,
    phase: data.phase || 'init',
    refinementPass: data.refinementPass || 0,
    timestamp: Date.now(),

    deckIntent: data.deckIntent || null,
    constraints: data.constraints || null,
    strategyPlan: data.strategyPlan || null,
    engineGraph: data.engineGraph || null,
    causalCardGraph: data.causalCardGraph || null,
    blueprint: data.blueprint || null,
    resourceBudget: data.resourceBudget ? Object.freeze({ ...data.resourceBudget }) : null,

    currentDeck: Object.freeze([...(data.currentDeck || [])]),
    remainingSlots: data.remainingSlots ?? 38,
    occupiedCurve: Object.freeze({ ...(data.occupiedCurve || {}) }),

    engineCoverage: Object.freeze({ ...(data.engineCoverage || {}) }),
    engineHealth: Object.freeze({ ...(data.engineHealth || {}) }),
    missingCapabilities: Object.freeze([...(data.missingCapabilities || [])]),
    bottlenecks: Object.freeze([...(data.bottlenecks || [])]),

    expectedAvailability: Object.freeze({ ...(data.expectedAvailability || {}) }),

    currentCurveAverage: data.currentCurveAverage || 0,
    manaProduction: Object.freeze({ ...(data.manaProduction || {}) }),
    threatDensity: data.threatDensity || 0,
    interactionDensity: data.interactionDensity || 0,
    currentWinPathProbability: data.currentWinPathProbability || 0,
    criticalPathHealth: data.criticalPathHealth || 0,
    engineActivationCurves: Object.freeze({ ...(data.engineActivationCurves || {}) }),
    hierarchicalUtility: data.hierarchicalUtility ? Object.freeze({ ...data.hierarchicalUtility }) : null,

    activeSynergies: Object.freeze([...(data.activeSynergies || [])]),
    activeWeaknesses: Object.freeze([...(data.activeWeaknesses || [])]),
    antiSynergies: Object.freeze([...(data.antiSynergies || [])])
  });
}

// ─── 2. SESSION: Contenedor principal con working state mutable ─────────────
export function createStrategicSession(deckIntent) {
  const initialBudget = createResourceBudget(deckIntent);
  const initialSnapshot = createStateSnapshot({ deckIntent, resourceBudget: initialBudget, phase: 'init' });
  
  return {
    deckIntent,
    snapshots: [initialSnapshot],
    currentSnapshotId: 0,

    working: {
      constraints: null,
      strategyPlan: null,
      engineGraph: null,
      causalCardGraph: null,
      blueprint: null,
      resourceBudget: initialBudget,
      currentDeck: [],
      remainingSlots: 38,
      occupiedCurve: {},
      engineCoverage: {},
      engineHealth: {},
      missingCapabilities: [],
      bottlenecks: [],
      expectedAvailability: {},
      currentCurveAverage: 0,
      manaProduction: {},
      threatDensity: 0,
      interactionDensity: 0,
      currentWinPathProbability: 0,
      criticalPathHealth: 0,
      engineActivationCurves: {},
      hierarchicalUtility: { totalUtility: 0, strategicUtility: 0, resourceUtility: 0, cardUtility: 0 },
      activeSynergies: [],
      activeWeaknesses: [],
      antiSynergies: []
    },

    refinementPass: 0,
    converged: false,
    candidatePool: [],
    functionalPackages: [],
    decisionLog: []
  };
}

// ─── 3. OPERACIONES SOBRE LA SESIÓN ──────────────────────────────────────────

export function takeSnapshot(session, phase) {
  session.currentSnapshotId++;
  const snapshot = createStateSnapshot({
    ...session.working,
    deckIntent: session.deckIntent,
    snapshotId: session.currentSnapshotId,
    phase,
    refinementPass: session.refinementPass
  });
  session.snapshots.push(snapshot);
  return snapshot;
}

export function compareSnapshots(snapshotA, snapshotB) {
  const utilA = snapshotA.hierarchicalUtility?.totalUtility || snapshotA.currentWinPathProbability || 0;
  const utilB = snapshotB.hierarchicalUtility?.totalUtility || snapshotB.currentWinPathProbability || 0;
  
  return {
    snapshotAId: snapshotA.snapshotId,
    snapshotBId: snapshotB.snapshotId,
    utilityDelta: utilB - utilA,
    winPathDelta: (snapshotB.currentWinPathProbability || 0) - (snapshotA.currentWinPathProbability || 0),
    criticalPathHealthDelta: (snapshotB.criticalPathHealth || 0) - (snapshotA.criticalPathHealth || 0),
    deckSizeDelta: snapshotB.currentDeck.length - snapshotA.currentDeck.length,
    improved: utilB >= utilA
  };
}

export function rollbackToSnapshot(session, snapshotId) {
  const target = session.snapshots.find(s => s.snapshotId === snapshotId);
  if (!target) {
    throw new Error(`Snapshot ID ${snapshotId} not found in session history`);
  }

  session.working = {
    constraints: target.constraints,
    strategyPlan: target.strategyPlan,
    engineGraph: target.engineGraph,
    causalCardGraph: target.causalCardGraph,
    blueprint: target.blueprint,
    resourceBudget: target.resourceBudget ? { ...target.resourceBudget } : null,
    currentDeck: [...target.currentDeck],
    remainingSlots: target.remainingSlots,
    occupiedCurve: { ...target.occupiedCurve },
    engineCoverage: JSON.parse(JSON.stringify(target.engineCoverage)),
    engineHealth: JSON.parse(JSON.stringify(target.engineHealth)),
    missingCapabilities: [...target.missingCapabilities],
    bottlenecks: [...target.bottlenecks],
    expectedAvailability: JSON.parse(JSON.stringify(target.expectedAvailability)),
    currentCurveAverage: target.currentCurveAverage,
    manaProduction: { ...target.manaProduction },
    threatDensity: target.threatDensity,
    interactionDensity: target.interactionDensity,
    currentWinPathProbability: target.currentWinPathProbability,
    criticalPathHealth: target.criticalPathHealth,
    engineActivationCurves: JSON.parse(JSON.stringify(target.engineActivationCurves)),
    hierarchicalUtility: target.hierarchicalUtility ? { ...target.hierarchicalUtility } : null,
    activeSynergies: [...target.activeSynergies],
    activeWeaknesses: [...target.activeWeaknesses],
    antiSynergies: [...target.antiSynergies]
  };

  session.decisionLog.push({
    action: 'ROLLBACK',
    toSnapshotId: snapshotId,
    pass: session.refinementPass,
    timestamp: Date.now()
  });

  return session.working;
}

export function addCardToWorking(session, card, slot = null, engine = null) {
  session.working.currentDeck.push({ ...card, slot, engine });
  session.working.remainingSlots--;
  
  session.decisionLog.push({
    action: 'ADD_CARD',
    cardName: card.name,
    slot,
    engine,
    pass: session.refinementPass,
    timestamp: Date.now()
  });
}

export function removeCardFromWorking(session, cardName) {
  const idx = session.working.currentDeck.findIndex(c => c.name === cardName);
  if (idx !== -1) {
    const removed = session.working.currentDeck.splice(idx, 1)[0];
    session.working.remainingSlots++;

    session.decisionLog.push({
      action: 'REMOVE_CARD',
      cardName,
      slot: removed.slot,
      engine: removed.engine,
      pass: session.refinementPass,
      timestamp: Date.now()
    });
    return removed;
  }
  return null;
}

export function advanceRefinementPass(session, reason = '') {
  session.refinementPass++;
  session.decisionLog.push({
    action: 'ADVANCE_PASS',
    pass: session.refinementPass,
    reason,
    timestamp: Date.now()
  });
}

export function updateWorkingStrategyPlan(session, newStrategyPlan) {
  session.working.strategyPlan = newStrategyPlan;
  session.decisionLog.push({
    action: 'UPDATE_STRATEGY_PLAN',
    planId: newStrategyPlan.planId,
    version: newStrategyPlan.version,
    pass: session.refinementPass,
    timestamp: Date.now()
  });
}

export function updateWorkingBlueprint(session, newBlueprint, reason = '') {
  session.working.blueprint = newBlueprint;
  session.decisionLog.push({
    action: 'UPDATE_BLUEPRINT',
    reason,
    pass: session.refinementPass,
    timestamp: Date.now()
  });
}

export function consolidateDeckCards(cards = []) {
  const map = new Map();
  for (const card of cards) {
    if (!card || !card.name) continue;
    const nameKey = card.name.trim().toLowerCase();
    const qty = Number(card.quantity || 1);
    if (map.has(nameKey)) {
      const existing = map.get(nameKey);
      existing.quantity += qty;
    } else {
      map.set(nameKey, { ...card, name: card.name.trim(), quantity: qty });
    }
  }
  return Array.from(map.values());
}
