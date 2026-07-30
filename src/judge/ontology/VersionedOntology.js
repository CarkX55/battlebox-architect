/**
 * src/judge/ontology/VersionedOntology.js
 * Version management for Ontology, DSL, IR, and Pass schemas.
 */

export const ONTOLOGY_VERSION_MANIFEST = Object.freeze({
  OntologyVersion: '1.0.0',
  DSLVersion: '1.0.0',
  CardSemanticIRVersion: '1.0.0',
  StrategicIRVersion: '1.0.0',
  PlannerVersion: '1.0.0',
  PassGraphVersion: '1.0.0',
  ConstraintVersion: '1.0.0',
  KnowledgeVersion: '1.0.0',
  SemanticResolverVersion: '1.0.0'
});

export function generateAuditVersionFingerprint(seed = 42) {
  return {
    timestamp: new Date().toISOString(),
    seed,
    manifest: ONTOLOGY_VERSION_MANIFEST,
    auditHash: `audit_v7_${seed}_${Date.now().toString(36)}`
  };
}
