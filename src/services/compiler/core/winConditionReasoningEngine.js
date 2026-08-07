/**
 * src/services/compiler/core/winConditionReasoningEngine.js
 * 
 * WinConditionReasoningEngine: Generador Dinámico de Cadenas Causales de Victoria v20.0.
 * CERO explicaciones de texto plano almacenadas manualmente.
 * Construye la lógica causal dinámica:
 * Goal -> Structural Advantage -> Resources Needed -> Conversion Engine -> Closing Pattern -> Failure Modes
 */

import { EmergentStrategyGrammarEngine } from './emergentStrategyGrammarEngine.js';

export class WinConditionReasoningEngine {
  /**
   * Genera el razonamiento causal de victoria dinámico para un mazo compilado
   */
  static reasonWinCondition(deckCards = [], primaryIdea = 'Midrange') {
    const grammar = EmergentStrategyGrammarEngine.deriveEmergentGrammar(deckCards);
    const ideaLower = primaryIdea.toLowerCase();

    let structuralAdvantage = 'Masa Crítica de Amenazas y Eficiencia de Maná';
    let conversionPattern = 'Intercambio favorable de recursos e interacción en mesa';
    let closingPattern = 'Ataque sostenido y presión de daño directo';

    if (ideaLower.includes('hydra') || ideaLower.includes('hidra')) {
      structuralAdvantage = 'Exceso de maná escalable con amenazas que superan el removal medio';
      conversionPattern = 'Conversión de aceleración temprana en criaturas de gran tamaño con contadores';
      closingPattern = 'Arrollar la defensa rival antes de que puedan estabilizarse';
    } else if (ideaLower.includes('merfolk') || ideaLower.includes('elf')) {
      structuralAdvantage = 'Evasión insuperable (Islandwalk/Swarm) impulsada por Aether Vial y Lords';
      conversionPattern = 'Multiplicación de poder tribal a velocidad de instante sin perder tempo';
      closingPattern = 'Ataque masivo inbloqueable en Turno 4-5';
    }

    return Object.freeze({
      primaryIdea,
      structuralAdvantage,
      resourcesNeeded: Object.freeze([...grammar.resourceEngine.slice(0, 4)]),
      conversionEngine: conversionPattern,
      closingPattern,
      failureModes: Object.freeze([
        'Mana Screw en turnos iniciales',
        'Falta de fuentes de robo en turnos tardíos',
        'Barrido masivo de mesa antes de la fase de cierre'
      ]),
      emergentDNASignature: grammar.emergentDNASignature
    });
  }
}
