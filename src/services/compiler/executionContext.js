/**
 * src/services/compiler/executionContext.js
 * 
 * Contenedor de Infraestructura y Runtime para BattleBox Strategic Kernel v11.
 * Separa la infraestructura (config, IDs, logger, bus, registry, snapshot) del Estado del Mazo.
 * NO contiene lógica estratégica del juego.
 */

import { CompilerEventBus } from './compilerEventBus.js';

export class ExecutionContext {
  constructor(formData = {}) {
    this.compilationId = `CMP_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    this.transactionId = `TX_001`;
    this.buildId = `BUILD_v11.0.0`;

    this.config = Object.freeze({
      format: formData.formato || formData.format || 'Legacy BattleBox',
      archetype: formData.arquetipo || formData.archetype || 'Aggro',
      colors: Array.isArray(formData.colores) ? [...formData.colores] : ['R'],
      deckSize: formData.deckSize || 60,
      userPrompt: formData.prompt || formData.userPrompt || ''
    });

    this.knowledgeSnapshot = Object.freeze({
      knowledgeVersion: '11.0.0',
      oracleDatabaseVersion: '2026.08',
      metaVersion: 'MTGTop8_Modern_Legacy_2026',
      rulesVersion: 'CR_2026',
      timestamp: Date.now()
    });

    this.eventBus = new CompilerEventBus();
    this.logger = console;
    this.metadata = new Map();
  }

  /**
   * Genera un log estructurado asociado al compilador
   */
  log(level, message, data = {}) {
    const logEntry = {
      compilationId: this.compilationId,
      level,
      message,
      data,
      timestamp: Date.now()
    };
    if (level === 'error') this.logger.error(`[KERNEL ERROR] ${message}`, data);
    else if (level === 'warn') this.logger.warn(`[KERNEL WARN] ${message}`, data);
    else this.logger.log(`[KERNEL INFO] ${message}`, data);
    return logEntry;
  }
}
