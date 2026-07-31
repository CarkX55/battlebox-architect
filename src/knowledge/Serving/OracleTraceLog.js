/**
 * OracleTraceLog.js
 * Bitácora del Oráculo - 14-Pass Fully Observable Compiler Trace Engine.
 * Captures 100% structured observability across every compilation pass:
 * PASS 1: Capability Planner
 * PASS 2: Strategy Planner & Goal DAG
 * PASS 3: Strategy IR & Contract Specification
 * PASS 4: Package Composer
 * PASS 5: Candidate Admission Gate Audit (Admitted vs Rejected with exact reasons)
 * PASS 6: Candidate 12-D Ranking (Pairwise Candidate Scores)
 * PASS 7: IR Repair Loop
 * PASS 8: Land & Frank Karsten Calculation Justification
 * PASS 9: Candidate Exhaustion Diagnostic & Hard Failure Gate
 * PASS 10: DeckConstructionState Slot Resolution (60 Slots)
 * PASS 11: Modular DeckJudge 10-Verifier Evaluation
 * PASS 12: Level 3 Monte Carlo Simulation (5,000 Games)
 * PASS 13: CompilationProof Causal Evidence Chain
 * PASS 14: Raw Gemini LLM Input/Output JSON Log Capture
 */

export class ObservableCompilerPass {
  constructor({ passIndex, passName, category, component, status = 'PASS', inputs = {}, outputs = {}, details = {}, payload = null }) {
    this.passIndex = passIndex;
    this.passName = passName || `PASS ${passIndex}: ${category}`;
    this.category = category;
    this.component = component;
    this.status = status;
    this.timestamp = new Date().toISOString();
    this.inputs = Object.freeze({ ...inputs });
    this.outputs = Object.freeze({ ...outputs });
    this.details = Object.freeze({ ...details });
    this.payload = payload ? Object.freeze({ ...payload }) : null;
    Object.freeze(this);
  }
}

export class OracleTraceLogEngine {
  constructor() {
    this.passes = [];
    this.deckName = '';
    this.startTime = new Date().toISOString();
    this.buildStatus = 'PENDING';
    this.rawGeminiLLMLogs = null;
  }

  reset(deckName = 'Mazo Forjado') {
    this.passes = [];
    this.deckName = deckName;
    this.startTime = new Date().toISOString();
    this.buildStatus = 'PENDING';
    this.rawGeminiLLMLogs = null;
  }

  logPass({ passIndex, passName, category, component, status = 'PASS', inputs = {}, outputs = {}, details = {}, payload = null }) {
    const pass = new ObservableCompilerPass({
      passIndex: passIndex || (this.passes.length + 1),
      passName,
      category,
      component,
      status,
      inputs,
      outputs,
      details,
      payload
    });
    this.passes.push(pass);
    return pass;
  }

  logStep({ category, component, action, details = {}, payload = null }) {
    return this.logPass({
      passIndex: this.passes.length + 1,
      passName: `STEP ${this.passes.length + 1}: ${action}`,
      category,
      component,
      status: 'PASS',
      inputs: { action },
      outputs: {},
      details,
      payload
    });
  }

  recordRawGeminiLLMLog(prompt, rawResponse, cleanJSON) {
    this.rawGeminiLLMLogs = Object.freeze({
      timestamp: new Date().toISOString(),
      prompt,
      rawResponse,
      parsedJSON: cleanJSON
    });

    this.logPass({
      passIndex: 14,
      passName: 'PASS 14: Raw Gemini LLM Input/Output JSON Log Capture',
      category: 'LLM_LOG',
      component: 'GeminiLLMAdapter',
      status: 'PASS',
      inputs: { promptPreview: (prompt || '').substring(0, 300) + '...' },
      outputs: { responseLength: (rawResponse || '').length, isParsedJSONValid: !!cleanJSON },
      payload: this.rawGeminiLLMLogs
    });
  }

  setBuildFailed(reason, details = {}) {
    this.buildStatus = 'BUILD_FAILED';
    this.logPass({
      passIndex: this.passes.length + 1,
      passName: 'BUILD FAILED: Hard Gate Failure',
      category: 'HARD_FAIL_GATE',
      component: 'CompilerConvergencePipeline',
      status: 'FAIL',
      inputs: { reason },
      outputs: { compilationStatus: 'HALTED_COMPILATION_FAILED' },
      details
    });
  }

  getTraceSummary() {
    const passStatuses = {};
    for (const p of this.passes) {
      passStatuses[p.passName] = p.status;
    }
    return {
      deckName: this.deckName,
      totalPasses: this.passes.length,
      buildStatus: this.buildStatus,
      startTime: this.startTime,
      passStatuses
    };
  }

  exportTraceJSON() {
    return JSON.stringify({
      summary: this.getTraceSummary(),
      rawGeminiLLMLogs: this.rawGeminiLLMLogs,
      passes: this.passes
    }, null, 2);
  }
}

// Global Singleton Instance
export const OracleTraceLog = new OracleTraceLogEngine();
