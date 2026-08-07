/**
 * src/services/compiler/core/strategicMemoryEngine.js
 * 
 * StrategicMemoryEngine: Base de Conocimiento Estratégica Basada en Evidencia Causal v19.0.
 * NO guarda recetas rígidas de cartas ("11 Llanowar").
 * Guarda patrones causales reutilizables ("Incremente una-mana acceleration capability density").
 * Utiliza StrategicKnowledgeValidator para promover únicamente aprendizajes validados científicamente.
 */

import fs from 'fs';
import path from 'path';
import { StrategicKnowledgeValidator } from './strategicKnowledgeValidator.js';

export class StrategicMemoryEngine {
  static memoryFilePath = 'C:\\Users\\Marcos\\.gemini\\antigravity-ide\\knowledge\\compiler\\strategic_memory.json';

  /**
   * Carga el estado inmutable de la memoria de conocimiento estratégico desde disco
   */
  static loadMemory() {
    try {
      if (fs.existsSync(this.memoryFilePath)) {
        const raw = fs.readFileSync(this.memoryFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('⚠️ No se pudo leer strategic_memory.json, iniciando memoria limpia:', e.message);
    }
    return { patterns: [], lastUpdated: Date.now() };
  }

  /**
   * Registra una nueva evidencia empírica observada y valida su promoción
   */
  static recordEvidence(causalEvidence = {}) {
    const memory = this.loadMemory();

    const validationReport = StrategicKnowledgeValidator.validatePatternForPromotion(causalEvidence);

    if (validationReport.promoted) {
      const patternEntry = {
        deckFamily: causalEvidence.deckFamily || 'General',
        format: causalEvidence.format || 'Modern',
        problem: causalEvidence.problem || 'Execution Bottleneck',
        causalCapabilityAction: causalEvidence.causalCapabilityAction || 'INCREASE_MANA_ACCELERATION_DENSITY',
        deltaGain: causalEvidence.deltaGain || 10,
        confidence: validationReport.validatedConfidence,
        validationCount: (causalEvidence.validationCount || 1) + 1,
        lastValidated: Date.now()
      };

      memory.patterns.push(patternEntry);
      memory.lastUpdated = Date.now();

      try {
        const dir = path.dirname(this.memoryFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.memoryFilePath, JSON.stringify(memory, null, 2), 'utf8');
      } catch (e) {
        console.warn('⚠️ No se pudo guardar strategic_memory.json:', e.message);
      }
    }

    return Object.freeze({
      promoted: validationReport.promoted,
      validatedConfidence: validationReport.validatedConfidence,
      validationReason: validationReport.validationReason
    });
  }

  /**
   * Consulta patrones de evidencia reutilizables para una familia de mazos
   */
  static queryLearnedCapabilityActions(deckFamily = 'General', format = 'Modern') {
    const memory = this.loadMemory();
    const familyLower = deckFamily.toLowerCase();

    return memory.patterns.filter(p => {
      const pFamily = (p.deckFamily || '').toLowerCase();
      return pFamily.includes(familyLower) || pFamily === 'general';
    });
  }
}
