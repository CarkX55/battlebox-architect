/**
 * ObservabilityLogger.js
 * OpenTelemetry-style Structured JSON Telemetry & Metrics Logger.
 * Logs operation timing, memory consumption, provider traces, and query latencies.
 */

export class ObservabilityLogger {
  static logTrace(traceName, durationMs, metadata = {}) {
    const trace = {
      traceName: `[${traceName.toUpperCase()}]`,
      timestamp: new Date().toISOString(),
      durationMs,
      memoryUsageMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      metadata
    };

    console.log(JSON.stringify(trace));
    return trace;
  }

  static logMetric(metricName, value, unit = 'ms') {
    const metric = {
      metricName,
      value,
      unit,
      timestamp: new Date().toISOString()
    };

    console.log(`[METRIC] ${metricName}=${value}${unit}`);
    return metric;
  }
}
