/**
 * ProviderRegistry.js
 * Dynamic Plugin Registry for Knowledge Providers.
 * Enables registration of new providers (Scryfall, MTGJSON, Apify, 17Lands, Moxfield) without modifying core ingestion logic.
 */

export class ProviderRegistry {
  static instance = null;

  constructor() {
    this.providers = new Map();
  }

  static getInstance() {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  register(provider) {
    if (!provider || !provider.name) {
      throw new Error('[ProviderRegistry] Provider must be an object with a name property');
    }
    this.providers.set(provider.name, provider);
  }

  get(name) {
    return this.providers.get(name) || null;
  }

  list() {
    return Array.from(this.providers.values());
  }

  async initializeAll() {
    const results = [];
    for (const p of this.providers.values()) {
      try {
        const ok = await p.initialize();
        results.push({ name: p.name, status: ok ? 'INITIALIZED' : 'FAILED' });
      } catch (err) {
        results.push({ name: p.name, status: 'ERROR', error: err.message });
      }
    }
    return results;
  }
}
