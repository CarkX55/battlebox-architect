/**
 * src/services/compiler/core/kernelTelemetry.js
 * 
 * KernelTelemetry: Telemetría Determinista y Comparativa entre Versiones.
 * Almacena metadatos de versionado y hashes deterministas (sin Date.now())
 * para responder a: "¿Por qué la versión v13.2 compila mejores mazos que la v13.1?"
 */

import { COMPILER_VERSION } from './compilerVersion.js';

export class KernelTelemetry {
  constructor(config = {}) {
    const seed = config.seed || 42;
    const strategyName = config.searchStrategy || 'HybridSearchStrategy';
    
    // Hash determinista basado en parámetros estables (no Date.now())
    const configDataStr = JSON.stringify({ seed, strategyName, format: config.format || 'Modern' });
    const configHash = this.computeDeterministicHash(configDataStr);

    this.header = Object.freeze({
      compilerVersion: COMPILER_VERSION.compiler,
      pluginVersions: COMPILER_VERSION.plugins,
      oracleVersion: COMPILER_VERSION.oracle,
      contractsVersion: COMPILER_VERSION.contracts,
      simulationSeed: seed,
      searchStrategy: strategyName,
      oracleSnapshotHash: `ORACLE_HASH_${this.computeDeterministicHash(COMPILER_VERSION.oracle)}`,
      pluginSnapshotHash: `PLUGIN_HASH_${this.computeDeterministicHash(COMPILER_VERSION.plugins)}`,
      configurationHash: `CONFIG_HASH_${configHash}`
    });

    this.metrics = {
      startTime: Date.now(),
      totalDurationMs: 0,
      nodesExplored: 0,
      rolloutsExecuted: 0,
      prunedBranches: 0,
      cacheHits: 0,
      pluginTimings: new Map()
    };
  }

  computeDeterministicHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase();
  }

  recordPluginTime(pluginId, durationMs) {
    this.metrics.pluginTimings.set(pluginId, (this.metrics.pluginTimings.get(pluginId) || 0) + durationMs);
  }

  recordRollout(count = 1) {
    this.metrics.rolloutsExecuted += count;
  }

  recordNodeExplored(count = 1) {
    this.metrics.nodesExplored += count;
  }

  finish(deckHash = '') {
    this.metrics.totalDurationMs = Date.now() - this.metrics.startTime;
    return Object.freeze({
      header: this.header,
      metrics: Object.freeze({
        ...this.metrics,
        deckHash: deckHash || `DECK_HASH_${this.computeDeterministicHash(deckHash || 'empty')}`,
        pluginTimings: Object.fromEntries(this.metrics.pluginTimings)
      })
    });
  }
}
