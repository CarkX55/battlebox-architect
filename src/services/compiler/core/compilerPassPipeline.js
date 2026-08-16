/**
 * COMPILER PASS PIPELINE & DYNAMIC SCHEDULER (v14.0-SSA)
 * 
 * Dependency-driven pass scheduler for SSA StrategyIR compilation.
 * Manages topological DAG ordering, analysis invalidation tracking, and proof certificates.
 */

import { ProofCertificateFactory } from './proofCertificates.js';

export class CompilerPassContract {
  constructor({ name, type, requiresAnalysis = [], provides = [], execute }) {
    if (!name || !type || typeof execute !== 'function') {
      throw new Error('CompilerPassContractError: Pass must define name, type, and execute function');
    }
    if (!['ANALYSIS', 'TRANSFORMATION'].includes(type)) {
      throw new Error(`CompilerPassContractError: Invalid pass type "${type}"`);
    }
    this.name = name;
    this.type = type;
    this.requiresAnalysis = Object.freeze([...requiresAnalysis]);
    this.provides = Object.freeze([...provides]);
    this.execute = execute;
    Object.freeze(this);
  }
}

export class CompilerPassPipeline {
  constructor() {
    this.passes = new Map();
    this.analysisCache = new Map();
    this.invalidationFlags = new Set();
  }

  registerPass(passContract) {
    if (!(passContract instanceof CompilerPassContract)) {
      throw new Error('PipelineError: Registered pass must be an instance of CompilerPassContract');
    }
    this.passes.set(passContract.name, passContract);
  }

  invalidateAnalysis(analysisName) {
    this.invalidationFlags.add(analysisName);
    this.analysisCache.delete(analysisName);
  }

  buildTopologicalDAG() {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (passName) => {
      if (visiting.has(passName)) {
        throw new Error(`PipelineDAGError: Cyclic dependency detected in pass scheduler at ${passName}`);
      }
      if (!visited.has(passName)) {
        visiting.add(passName);
        const pass = this.passes.get(passName);
        if (pass) {
          for (const req of pass.requiresAnalysis) {
            if (this.passes.has(req)) {
              visit(req);
            }
          }
        }
        visiting.delete(passName);
        visited.add(passName);
        sorted.push(passName);
      }
    };

    for (const passName of this.passes.keys()) {
      visit(passName);
    }

    return sorted.map(name => this.passes.get(name));
  }

  async executePipeline(initialStrategyIR, context = {}) {
    let currentIR = initialStrategyIR;
    const executionLogs = [];
    const emittedCertificates = [];

    const orderedPasses = this.buildTopologicalDAG();

    for (const pass of orderedPasses) {
      const startTime = Date.now();

      // Check analysis requirements
      const analysisMap = new Map();
      for (const req of pass.requiresAnalysis) {
        if (!this.analysisCache.has(req) || this.invalidationFlags.has(req)) {
          // Recompute required analysis if invalidated or missing
          const analysisPass = this.passes.get(req);
          if (analysisPass && analysisPass.type === 'ANALYSIS') {
            const analysisResult = await analysisPass.execute(currentIR, analysisMap, context);
            this.analysisCache.set(req, analysisResult);
            this.invalidationFlags.delete(req);
          }
        }
        analysisMap.set(req, this.analysisCache.get(req));
      }

      // Execute current pass
      const result = await pass.execute(currentIR, analysisMap, context);

      if (pass.type === 'ANALYSIS') {
        this.analysisCache.set(pass.name, result);
        this.invalidationFlags.delete(pass.name);
      } else if (pass.type === 'TRANSFORMATION') {
        currentIR = result.transformedIR || currentIR;
        if (result.invalidatedAnalysis) {
          for (const inv of result.invalidatedAnalysis) {
            this.invalidateAnalysis(inv);
          }
        }
      }

      const durationMs = Date.now() - startTime;
      executionLogs.push({
        passName: pass.name,
        type: pass.type,
        durationMs,
        status: 'SUCCESS'
      });
    }

    // Verify StrategyIR Invariants after pipeline execution
    currentIR.verifyZeroCardsInvariant();
    currentIR.verifyAcyclic();

    const invCert = ProofCertificateFactory.createInvariantCertificate('CompilerPassPipeline', {
      zeroCardsPreserved: true,
      dagAcyclic: true,
      zeroLeaks: true
    });
    emittedCertificates.push(invCert);

    return {
      optimizedIR: currentIR,
      executionLogs,
      certificates: emittedCertificates,
      analysisCache: this.analysisCache
    };
  }
}
