/**
 * KnowledgeProvider.js
 * Abstract Plugin Contract for all Knowledge Providers.
 */

export class KnowledgeProvider {
  constructor(name = 'AbstractProvider') {
    this.name = name;
    this.lastSyncTimestamp = null;
    this.isInitialized = false;
  }

  async initialize() {
    this.isInitialized = true;
    return true;
  }

  async sync() {
    throw new Error(`[KnowledgeProvider] ${this.name} must implement sync()`);
  }

  async health() {
    return { status: this.isInitialized ? 'HEALTHY' : 'UNINITIALIZED', name: this.name };
  }

  version() {
    return '1.0.0';
  }

  lastUpdate() {
    return this.lastSyncTimestamp ? new Date(this.lastSyncTimestamp).toISOString() : 'NEVER';
  }
}
