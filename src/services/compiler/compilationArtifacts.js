/**
 * src/services/compiler/compilationArtifacts.js
 * 
 * CompilationArtifacts: Contenedor para Artefactos Derivados de Auditoría y Métricas.
 * Desglosa internamente en contenedores limpios:
 * - timeline: Diffs históricos con hashes de decisión.
 * - facts: Hechos tipados estructurados (FactType).
 * - metrics: Métricas numéricas agregadas.
 * - hypotheses: Hipótesis científicas pendiéntes de validar.
 * - alerts: Invariantes y advertencias estructurales.
 * - evidenceLedger: Registro append-only de evidencias y Claims.
 */

export class CompilationArtifacts {
  constructor() {
    this.timeline = [];       // Array de Snapshots por Diff + DecisionHash
    this.facts = new Map();         // factId -> Fact
    this.metrics = new Map();       // metricId -> Metric
    this.hypotheses = new Map();    // hypothesisId -> Hypothesis
    this.alerts = [];              // Array de Alert/Violation
    this.evidenceLedger = [];      // Append-only Array de EvidenceRecord
  }

  /**
   * Registro append-only en el Evidence Ledger
   */
  addEvidence(source, primaryData, generatedClaims = [], confidence = 0.9) {
    const entry = Object.freeze({
      id: `EVID_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      source,
      primaryData: Object.freeze({ ...primaryData }),
      claims: Object.freeze(generatedClaims.map(c => ({
        claimId: c.id || `CLM_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        statement: c.statement,
        confidence: c.confidence || confidence
      }))),
      timestamp: Date.now()
    });
    this.evidenceLedger.push(entry);
    return entry;
  }

  /**
   * Registra un hecho tipado estructurado en el Blackboard
   */
  addFact(factType, value, expected = null, confidence = 1.0, producer = 'Compiler') {
    const factId = `FACT_${factType}_${Date.now()}`;
    const fact = Object.freeze({
      id: factId,
      type: factType,
      value,
      expected,
      confidence,
      producer,
      timestamp: Date.now()
    });
    this.facts.set(factId, fact);
    return fact;
  }

  /**
   * Registra una métrica agregada derivada
   */
  setMetric(metricName, value, unit = 'ratio') {
    const metric = Object.freeze({
      name: metricName,
      value,
      unit,
      timestamp: Date.now()
    });
    this.metrics.set(metricName, metric);
    return metric;
  }

  /**
   * Añade una alerta/advertencia estructural
   */
  addAlert(level, invariantId, message, suggestedFix = null) {
    const alert = Object.freeze({
      id: `ALT_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      level, // RULE | ARCHETYPE | STYLE | META
      invariantId,
      message,
      suggestedFix,
      timestamp: Date.now()
    });
    this.alerts.push(alert);
    return alert;
  }

  /**
   * Registra una instantánea de timeline por Diff
   */
  recordTimelineDiff(phaseName, diff, decisionHash) {
    const step = Object.freeze({
      id: this.timeline.length,
      phase: phaseName,
      timestamp: Date.now(),
      diff: Object.freeze({ ...diff }),
      decisionHash
    });
    this.timeline.push(step);
    return step;
  }
}
