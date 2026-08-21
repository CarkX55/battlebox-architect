/**
 * src/services/compiler/core/strategicExecutionCompiler.js
 * 
 * StrategicExecutionCompiler: Top-Down Strategic Execution & Turn Plan Compiler v1.0.
 * Compiles GamePlan, TurnPlan, ResourcePlan, PressurePlan, and Victory Lines
 * before low-level card allocation.
 */

export class StrategicExecutionCompiler {
  /**
   * Compiles top-down strategic execution plan.
   * 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @returns {{ gamePlan: string, turnPlan: Object, victoryLines: Array<Object>, resourcePlan: Object, executionSummary: string }}
   */
  static compileExecutionPlan(deckIdentity, intentPackage) {
    const tribe = intentPackage?.primaryTribe || '';
    const tempo = (intentPackage?.tempo || '').toLowerCase();
    const strategy = (intentPackage?.strategy || []).join(' ').toLowerCase();
    const isAggro = tempo.includes('aggro') || (deckIdentity?.expectedKillTurn <= 4);
    const isRamp = tempo.includes('ramp') || tempo.includes('big');
    const isControl = tempo.includes('control');
    const isSacrifice = strategy.includes('sacrifice') || strategy.includes('aristocrat');
    const isSpells = strategy.includes('spell') || strategy.includes('prowess') || strategy.includes('burn');

    let turnPlan;
    let victoryLines;
    let resourcePlan;

    if (isSacrifice) {
      turnPlan = Object.freeze({
        turn1: `Desplegar Alimento Recurrente (${tribe || 'Criaturas Fodder / Fichas'})`,
        turn2: `Bajar Motor de Sacrificio (${tribe || 'Sac Outlets'})`,
        turn3: `Establecer Drenaje de Vidas & Motores de Muerte`,
        turn4: `Bucle de Sacrificio & Presión de Desgaste`,
        turn5: `Drenaje Letal & Cierre de Partida`
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: 'Alimento Recurrente ──► Sacrificio ──► Drenaje Letal',
          steps: ['T1 Fodder', 'T2 Outlet', 'T3 Drain Engine', 'T4-T5 Lethal Drain']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Ataque de Enjambre ──► Sacrificio en Respuesta ──► Limpieza Asimétrica',
          steps: ['T2 Swarm', 'T3 Combat Pressure', 'T4 Sac Value']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Bucle de Recursión de Cementerio ──► Desgaste Continuo',
          steps: ['T2 Graveyard Setup', 'T3 Recursive Loop', 'T4 Inevitable Drain']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Curva Baja & Eficiencia de Recursos',
        tempo: 'Remoción & Presión de Fichas',
        pressure: 'Drenaje Continuo de Vidas'
      });
    } else if (isSpells) {
      turnPlan = Object.freeze({
        turn1: `Desplegar Criatura con Prowess / Atacante Temprano (${tribe || 'Prowess'})`,
        turn2: `Cadena de Cantrips & Presión de Ataque`,
        turn3: `Disrupción Rápida & Hechizos de Quemadura`,
        turn4: `Ráfaga de Hechizos & Daño Letal`,
        turn5: `Remate Directo a la Cara`
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: 'Prowess T1 ──► Cadena de Cantrips ──► Ráfaga Letal',
          steps: ['T1 Prowess', 'T2 Cantrips', 'T3 Burn/Tempo', 'T4 Lethal Burst']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Control de Tempo ──► Interacción Instantánea ──► Desgaste Aéreo',
          steps: ['T1 Attacker', 'T2 Counter/Bounce', 'T3 Burn Face', 'T4 Finish']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Quemadura Directa Masiva ──► Daño a la Cara',
          steps: ['T1-T2 Chip Damage', 'T3 Reach Burn', 'T4 Double Burn Lethal']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Curva de Maná 1-2 (Ultra Eficiente)',
        tempo: 'Velocidad de Hechizos y Cantrips',
        pressure: 'Daño de Combate y Quemadura Directa'
      });
    } else if (isAggro) {
      turnPlan = Object.freeze({
        turn1: `Desplegar Atacante Rápido Turno 1 (${tribe || 'Criatura Agresiva'})`,
        turn2: `Aumentar Presión de Curva & Ataque con Prisa (${tribe || 'Lord / Enjambre'})`,
        turn3: `Interacción Rápida & Remoción de Bloqueadores`,
        turn4: `Ataque Masivo de Enjambre / Remate`,
        turn5: `Cierre Letal de Partida`
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: `Enjambre Agresivo T1-T2 (${tribe || 'Criaturas'}) ──► Potenciación ──► Ataque Letal`,
          steps: ['T1 Threat', 'T2 Lord/Haste', 'T3 Overrun', 'T4 Lethal Combat']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Ataque de Curva ──► Remoción Barata ──► Daño a la Cara',
          steps: ['T1-T2 Attackers', 'T3 Remove Blocker', 'T4 Direct Reach']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Recarga de Flujo ──► Segunda Ola de Ataque ──► Remate Final',
          steps: ['T1-T2 Attackers', 'T3 Card Flow Refill', 'T4 Secondary Wave', 'T5 Final Push']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Curva Ultra-Baja (1-3 CMC)',
        tempo: 'Presión Máxima de Mesa',
        pressure: 'Ataques Rápidos y Daño Temprano'
      });
    } else if (isRamp) {
      turnPlan = Object.freeze({
        turn1: 'Acelerar Maná / Preparar Fijación de Tierras',
        turn2: `Acelerador de Maná / Desarrollo de Motor (${tribe || 'Ramp'})`,
        turn3: `Desplegar Primera Gran Amenaza (${tribe || 'Curva Media'})`,
        turn4: `Duplicar Presión / Dominio de Combate`,
        turn5: `Rematador Colosal / Daño Letal`
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: `Aceleración Ramp ──► Amenaza Colosal (${tribe || 'Top End'}) ──► Combate Letal`,
          steps: ['T1-T2 Ramp', 'T3 Big Threat', 'T4 Overrun', 'T5 Lethal']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Ventaja de Maná ──► Encadenamiento de Amenazas ──► Desgaste Insuperable',
          steps: ['T1-T2 Ramp', 'T3 Threat 1', 'T4 Threat 2', 'T5 Overrun']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Estabilización Temprana ──► Salto de Curva ──► Finisher Protector',
          steps: ['T1 Fix Mana', 'T2 Ramp', 'T3 Stabilize', 'T4 Giant Finisher']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Ramp Engine (Aceleración Temprana)',
        tempo: 'Interacción y Remoción Temática',
        pressure: 'Amenazas Colosales Escalables'
      });
    } else if (isControl) {
      turnPlan = Object.freeze({
        turn1: 'Estabilizar Base de Maná / Cantrips',
        turn2: 'Interacción Barata / Contrahechizo / Remoción',
        turn3: 'Motor de Ventaja de Cartas / Robo',
        turn4: 'Limpieza de Mesa (Sweeper) o Control Firme',
        turn5: 'Desplegar Condición de Victoria / Cierre Protegido'
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: 'Disrupción Temprana ──► Limpieza Masiva ──► Rematador Protegido',
          steps: ['T2-T3 Answers', 'T4 Sweeper', 'T5+ Inevitable Finisher']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Bloqueo de Recursos ──► Agotamiento de Respuestas ──► Inevitabilidad',
          steps: ['T1-T3 Counter/Remove', 'T4 Card Draw Engine', 'T5+ Lockout']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Planeswalker / Manland Beatdown ──► Dominio Absoluto',
          steps: ['T3-T4 Stabilize', 'T5 Engine', 'T6+ Unstoppable Pressure']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Base de Maná Estable (26+ Tierras)',
        tempo: 'Interacción Instantánea',
        pressure: 'Inevitabilidad y Ventaja de Cartas'
      });
    } else {
      // General Midrange
      turnPlan = Object.freeze({
        turn1: 'Desarrollo de Maná / Interacción Temprana',
        turn2: `Presión de Curva (${tribe || 'Amenaza T2'})`,
        turn3: 'Motor de Valor / Remoción 2-por-1',
        turn4: 'Amenaza de Curva Alta / Consolidación de Mesa',
        turn5: 'Ataque Decisivo / Cierre'
      });
      victoryLines = Object.freeze([
        {
          lineId: 'WIN_LINE_A',
          name: 'Curva Eficiente ──► Ventaja 2x1 ──► Cierre de Partida',
          steps: ['T2 Threat', 'T3 Value Engine', 'T4 Finisher', 'T5 Lethal']
        },
        {
          lineId: 'WIN_LINE_B',
          name: 'Desgaste Temprano ──► Amenaza Clave ──► Cierre por Atrito',
          steps: ['T1-T2 Disruption', 'T3 Midrange Threat', 'T4 Clean Up', 'T5 Victory']
        },
        {
          lineId: 'WIN_LINE_C',
          name: 'Dominio de Mesa ──► Bloqueadores Superados ──► Ataque Total',
          steps: ['T2-T3 Board Build', 'T4 Removal', 'T5 Overrun']
        }
      ]);
      resourcePlan = Object.freeze({
        mana: 'Curva Equilibrada',
        tempo: 'Remoción Eficiente',
        pressure: 'Amenazas Resilientes'
      });
    }

    const gamePlan = deckIdentity ? deckIdentity.gameplan : 'Dominar la mesa ejecutando la estrategia prevista.';
    const executionSummary = `Compilado Plan de Ejecución Estratégica: 5 Turnos Planificados, ${victoryLines.length} Líneas de Victoria Independientes.`;

    return {
      gamePlan,
      turnPlan,
      victoryLines,
      resourcePlan,
      executionSummary
    };
  }
}
