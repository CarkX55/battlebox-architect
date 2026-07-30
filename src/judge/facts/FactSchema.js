/**
 * src/judge/facts/FactSchema.js
 * Standard Fact Schema for Analysis Passes.
 */

export function createStandardFact({
  id,
  producer,
  category,
  confidence = 1.0,
  severity = 'INFO', // 'INFO' | 'WARNING' | 'CRITICAL' | 'BLOCKING'
  value,
  dependencies = [],
  description = ''
}) {
  if (!id || !producer || !category) {
    throw new Error('Fact creation requires id, producer, and category.');
  }

  return Object.freeze({
    id,
    producer,
    category,
    confidence: Number(confidence),
    severity,
    value,
    dependencies: Object.freeze([...dependencies]),
    description,
    timestamp: new Date().toISOString()
  });
}
