/**
 * CapabilityIndex.js
 * Inverse $O(1)$ map indexing CardIDs by capability interface.
 * Structure: CapabilityInterface ➔ Set<CardID>
 */

export class CapabilityIndex {
  constructor() {
    this.index = new Map();
  }

  register(cardId, capabilityVector) {
    for (const iface of capabilityVector.interfaces) {
      if (!this.index.has(iface)) {
        this.index.set(iface, new Set());
      }
      this.index.get(iface).add(cardId);
    }
  }

  getCardIds(capabilityInterface) {
    if (!this.index.has(capabilityInterface)) {
      return [];
    }
    return Array.from(this.index.get(capabilityInterface));
  }

  clear() {
    this.index.clear();
  }
}
