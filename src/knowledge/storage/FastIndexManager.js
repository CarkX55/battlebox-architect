/**
 * FastIndexManager.js
 * In-memory + SQLite fast lookup indexes for: Card, Type, Color, Format, Engine, Capability, Synergy, Archetype, Concept.
 */

export class FastIndexManager {
  constructor(database) {
    this.database = database;
    this.memoryIndexes = new Map();
  }

  indexObject(obj) {
    if (!obj || !obj.data) return;

    const categories = ['card', 'type', 'color', 'format', 'engine', 'capability', 'synergy', 'archetype', 'concept'];

    for (const cat of categories) {
      const val = obj.data[cat] || (obj.type.toLowerCase().includes(cat) ? obj.id : null);
      if (val) {
        const key = `${cat}:${val}`.toLowerCase();
        if (!this.memoryIndexes.has(key)) {
          this.memoryIndexes.set(key, new Set());
        }
        this.memoryIndexes.get(key).add(obj.id);

        if (this.database) {
          this.database.upsertIndex(cat, String(val), obj.id);
        }
      }
    }
  }

  search(category, value) {
    const key = `${category}:${value}`.toLowerCase();
    if (this.memoryIndexes.has(key)) {
      return Array.from(this.memoryIndexes.get(key));
    }
    if (this.database) {
      return this.database.searchIndexes(category, String(value));
    }
    return [];
  }
}
