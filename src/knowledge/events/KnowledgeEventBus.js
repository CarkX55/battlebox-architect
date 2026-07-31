/**
 * KnowledgeEventBus.js
 * Decoupled Event Bus for Knowledge Lifecycle Events.
 * Triggers: SetReleased -> CardUpdated -> KnowledgeInvalidated -> EngineRecomputed -> BundlePublished.
 */

export class KnowledgeEventBus {
  static instance = null;

  constructor() {
    this.listeners = new Map();
  }

  static getInstance() {
    if (!KnowledgeEventBus.instance) {
      KnowledgeEventBus.instance = new KnowledgeEventBus();
    }
    return KnowledgeEventBus.instance;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, payload = {}) {
    const callbacks = this.listeners.get(event) || [];
    const results = [];
    for (const fn of callbacks) {
      try {
        results.push(fn(payload));
      } catch (err) {
        console.error(`[KnowledgeEventBus] Error in listener for event ${event}:`, err);
      }
    }
    return results;
  }
}
