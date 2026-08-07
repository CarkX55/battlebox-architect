/**
 * src/services/compiler/core/compilerPerformanceProfiler.js
 * 
 * CompilerPerformanceProfiler: Perfilador de Rendimiento y Heatmap de Decisiones v16.1.
 * Mide latencias en milisegundos en 11 fases desacopladas y genera el Heatmap del Embudo de Selección:
 * Candidates -> Pareto -> Beam -> MonteCarlo -> Finalists -> Winner.
 */

export class CompilerPerformanceProfiler {
  constructor() {
    this.timestamps = new Map();
    this.durations = new Map();
    this.decisionFunnel = {
      initialCandidates: 0,
      paretoFrontierCount: 0,
      beamSearchCount: 0,
      monteCarloCount: 0,
      finalistsCount: 0,
      winnerCount: 1
    };
  }

  startPhase(phaseName) {
    this.timestamps.set(phaseName, performance.now());
  }

  endPhase(phaseName) {
    const start = this.timestamps.get(phaseName) || performance.now();
    const duration = Math.round((performance.now() - start) * 100) / 100;
    this.durations.set(phaseName, duration);
    return duration;
  }

  recordFunnelStep(stepName, count) {
    if (stepName in this.decisionFunnel) {
      this.decisionFunnel[stepName] = count;
    }
  }

  getProfilingReport() {
    const totalDuration = Array.from(this.durations.values()).reduce((sum, d) => sum + d, 0);
    return Object.freeze({
      totalDurationMs: Math.round(totalDuration * 100) / 100,
      phaseDurations: Object.freeze(Object.fromEntries(this.durations)),
      decisionFunnelHeatmap: Object.freeze({ ...this.decisionFunnel })
    });
  }
}
