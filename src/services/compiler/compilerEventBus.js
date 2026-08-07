/**
 * src/services/compiler/compilerEventBus.js
 * 
 * Bus de Eventos de Auditoría y Observabilidad para BattleBox Strategic Kernel v11.
 * Los eventos son inmutables y sirven para auditoría, timeline, depuración y UI.
 * NO reconstruyen el estado principal (el estado es el SSOT explícito).
 */

export const CORE_EVENT_TYPES = {
  STATE_CHANGED: 'StateChanged',
  PASS_STARTED: 'PassStarted',
  PASS_FINISHED: 'PassFinished',
  DECISION_TAKEN: 'DecisionTaken',
  COMPILATION_FINISHED: 'CompilationFinished',
  GOAL_LOCKED: 'GoalLocked',
  CAPABILITY_SATISFIED: 'CapabilitySatisfied',
  SLOT_BOUND: 'SlotBound',
  SLOT_UNBOUND: 'SlotUnbound',
  INVARIANT_VIOLATED: 'InvariantViolated'
};

export class CompilerEventBus {
  constructor() {
    this.listeners = new Map(); // eventType -> Set<Function>
    this.globalListeners = new Set();
    this.eventHistory = [];
  }

  /**
   * Suscribe un listener a un tipo de evento específico o a todos ('*')
   */
  subscribe(eventType, callback) {
    if (typeof callback !== 'function') return () => {};

    if (eventType === '*') {
      this.globalListeners.add(callback);
      return () => this.globalListeners.delete(callback);
    }

    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    return () => {
      const set = this.listeners.get(eventType);
      if (set) set.delete(callback);
    };
  }

  /**
   * Emite un evento inmutable con trazabilidad
   */
  emit(eventType, payload = {}, metadata = {}) {
    const event = Object.freeze({
      id: `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: eventType,
      timestamp: Date.now(),
      payload: Object.freeze({ ...payload }),
      metadata: Object.freeze({ ...metadata })
    });

    this.eventHistory.push(event);

    // Notificar listeners globales
    for (const listener of this.globalListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[CompilerEventBus Error] Listener global falló:`, err);
      }
    }

    // Notificar listeners específicos
    const specificSet = this.listeners.get(eventType);
    if (specificSet) {
      for (const listener of specificSet) {
        try {
          listener(event);
        } catch (err) {
          console.error(`[CompilerEventBus Error] Listener para ${eventType} falló:`, err);
        }
      }
    }

    return event;
  }

  /**
   * Obtiene la traza completa de eventos emitidos
   */
  getHistory() {
    return [...this.eventHistory];
  }

  /**
   * Limpia el historial para una nueva compilación
   */
  clearHistory() {
    this.eventHistory = [];
  }
}
