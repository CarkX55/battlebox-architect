/**
 * src/judge/facts/FactsRepository.js
 * Central Repository for Standard Facts emitted by Analysis Passes.
 */

import { createStandardFact } from './FactSchema.js';

export class FactsRepository {
  constructor() {
    this.facts = [];
  }

  addFact(factParams) {
    const fact = createStandardFact(factParams);
    this.facts.push(fact);
    return fact;
  }

  getFactsByCategory(category) {
    return this.facts.filter(f => f.category === category);
  }

  getFactsByProducer(producer) {
    return this.facts.filter(f => f.producer === producer);
  }

  getFactsBySeverity(severity) {
    return this.facts.filter(f => f.severity === severity);
  }

  getAllFacts() {
    return Object.freeze([...this.facts]);
  }

  clear() {
    this.facts = [];
  }
}
