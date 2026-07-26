/**
 * src/services/strategyReasoningEngine.js
 * 
 * Hito 3: Motor de Razonamiento Estratégico y Pipeline Inverso.
 * 
 * Genera el Strategy Graph abstracto a partir del objetivo del usuario ANTES de consultar cartas.
 * Traduce el objetivo en un Vector de Capacidades Requeridas para instruir al RAG sobre qué buscar.
 */

/**
 * Genera el Strategy Graph abstracto e independiente de las cartas para una petición dada.
 * 
 * @param {Object} formData Datos del formulario del usuario (archetype, strategy, format, prompt, tribe)
 * @returns {Object} Strategy Plan completo (strategyGraph, requiredCapabilities, targetTurnExecution)
 */
export function generateAbstractStrategyPlan(formData = {}) {
  const archetype = (formData.archetype || 'midrange').toLowerCase();
  const strategy = (formData.strategy || '').toLowerCase();
  const userPrompt = (formData.prompt || '').toLowerCase();

  let strategyGraph = [];
  let requiredCapabilities = {};
  let targetTurnExecution = 4;

  if (archetype.includes('aggro') || strategy.includes('blitz') || strategy.includes('burn')) {
    targetTurnExecution = 3.5;
    strategyGraph = [
      { step: 1, node: 'AceleraciónTemprana', objective: 'Colocar presencia en mesa en turno 1.', required: 'TurnAcceleration', priority: 100 },
      { step: 2, node: 'DesarrolloDePresión', objective: 'Maximizar daño por turno antes de que el rival estabilice.', required: 'BoardPressure', priority: 95 },
      { step: 3, node: 'InterrupciónDeBloqueadores', objective: 'Eliminar bloqueadores o rematar con daño directo.', required: 'RemovalImpact', priority: 80 },
      { step: 4, node: 'EjecuciónLethal', objective: 'Cerrar la partida antes del turno 4.', required: 'FinisherLethality', priority: 90 }
    ];
    requiredCapabilities = {
      ManaAcceleration: 60,
      BoardPressure: 95,
      RemovalImpact: 70,
      FinisherLethality: 85,
      CardDrawEfficiency: 30
    };
  } else if (archetype.includes('control') || strategy.includes('prison') || strategy.includes('taxes')) {
    targetTurnExecution = 6;
    strategyGraph = [
      { step: 1, node: 'SupervivenciaEInterrupción', objective: 'Frenar el tempo inicial con counters o remoción barata.', required: 'RemovalImpact', priority: 100 },
      { step: 2, node: 'EstabilizaciónYBorrado', objective: 'Limpiar la mesa y denegar recursos.', required: 'BoardControl', priority: 95 },
      { step: 3, node: 'GeneraciónDeVentaja', objective: 'Recargar mano con cantrips o motores de robo.', required: 'CardDrawEfficiency', priority: 90 },
      { step: 4, node: 'CierreIneludible', objective: 'Desplegar un finisher protegido para cerrar.', required: 'FinisherLethality', priority: 85 }
    ];
    requiredCapabilities = {
      RemovalImpact: 95,
      CardDrawEfficiency: 90,
      FinisherLethality: 70,
      ManaAcceleration: 40,
      BoardPressure: 30
    };
  } else if (archetype.includes('combo') || strategy.includes('reanimate') || strategy.includes('storm')) {
    targetTurnExecution = 4;
    strategyGraph = [
      { step: 1, node: 'BúsquedaYConsistencia', objective: 'Filtrar mazo y buscar piezas del combo.', required: 'Consistency', priority: 100 },
      { step: 2, node: 'AceleraciónYEnsamblaje', objective: 'Acumular maná o recursos de cementerio/tokens.', required: 'TurnAcceleration', priority: 95 },
      { step: 3, node: 'ProtecciónDelCombo', objective: 'Cubrir la ventana de combo contra remoción/counters.', required: 'Protection', priority: 90 },
      { step: 4, node: 'EjecuciónInmediata', objective: 'Disparar la interacción ganadora.', required: 'AlphaStrike', priority: 100 }
    ];
    requiredCapabilities = {
      CardDrawEfficiency: 95,
      ManaAcceleration: 85,
      FinisherLethality: 100,
      RemovalImpact: 50,
      BoardPressure: 40
    };
  } else {
    // Midrange / Aristocrats / General
    targetTurnExecution = 4.5;
    strategyGraph = [
      { step: 1, node: 'DesarrolloDeMotor', objective: 'Establecer generadores de maná o tokens.', required: 'TurnAcceleration', priority: 90 },
      { step: 2, node: 'IntercambioDeRecursos', objective: 'Controlar amenazas mientras se acumula ventaja.', required: 'RemovalImpact', priority: 85 },
      { step: 3, node: 'SinergiaYMultiplicación', objective: 'Conectar motores de sacrificio, robo o contadores.', required: 'CardDrawEfficiency', priority: 95 },
      { step: 4, node: 'DominioDeMesa', objective: 'Cerrar mediante presión acumulada o finisher.', required: 'FinisherLethality', priority: 85 }
    ];
    requiredCapabilities = {
      BoardPressure: 80,
      CardDrawEfficiency: 80,
      RemovalImpact: 80,
      ManaAcceleration: 70,
      FinisherLethality: 80
    };
  }

  return {
    archetype,
    strategy,
    targetTurnExecution,
    strategyGraph,
    requiredCapabilities
  };
}
