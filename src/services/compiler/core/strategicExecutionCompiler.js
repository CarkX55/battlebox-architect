/**
 * src/services/compiler/core/strategicExecutionCompiler.js
 * 
 * StrategicExecutionCompiler: V29.2 Strategic Execution Plan Projection.
 * 
 * Renders an observable human-readable projection of the Single Source of Truth
 * (GameplanContract). Does NOT invent alternative plans or guess heuristic templates.
 */

export class StrategicExecutionCompiler {
  /**
   * Compiles top-down strategic execution plan from GameplanContract.
   * 
   * @param {import('./deckIdentityModel.js').DeckIdentity} deckIdentity 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {import('./gameplanSynthesizer.js').GameplanContract} [gameplanContract=null]
   * @returns {{ gamePlan: string, turnPlan: Object, victoryLines: Array<Object>, resourcePlan: Object, executionSummary: string }}
   */
  static compileExecutionPlan(deckIdentity, intentPackage, gameplanContract = null) {
    const tribe = intentPackage?.primaryTribe || '';
    const format = intentPackage?.format || 'Pioneer';
    const tempo = intentPackage?.tempo || 'Aggro';
    
    // Dynamic Projection from GameplanContract SSOT
    if (gameplanContract && (gameplanContract.turnRequirements || []).length > 0) {
      const turnPlan = {};
      const steps = [];

      for (const req of gameplanContract.turnRequirements) {
        const turnKey = `turn${req.turn}`;
        const demandNames = req.functionalDemands.map(d => d.functionName).join(', ');
        turnPlan[turnKey] = `${req.description} [${demandNames}]`;
        steps.push(`T${req.turn}: ${req.description}`);
      }

      const winCondType = gameplanContract.winCondition?.type || 'COMBAT_LETHAL';
      const victoryLines = Object.freeze([
        {
          lineId: 'PRIMARY_WINPATH',
          name: `Gameplan Execution: ${winCondType}`,
          steps: Object.freeze(steps)
        }
      ]);

      const resourcePlan = Object.freeze({
        mana: `Target Kill Turn: T${gameplanContract.derivedKillTurn}`,
        tempo: `Archetype: ${tempo}`,
        pressure: `Win Condition: ${winCondType}`
      });

      return {
        gamePlan: gameplanContract.thesis || `Execute ${tempo} gameplan for ${format}.`,
        turnPlan: Object.freeze(turnPlan),
        victoryLines,
        resourcePlan,
        executionSummary: `V29.2 SSOT Plan: ${gameplanContract.thesis}`
      };
    }

    // Fallback if no gameplanContract available
    return {
      gamePlan: `Execute ${tempo} strategy for ${tribe || 'deck'}.`,
      turnPlan: Object.freeze({
        turn1: 'Deploy early play or enabler',
        turn2: 'Develop board or advance engine',
        turn3: 'Amplify board state or interact',
        turn4: 'Execute primary win path'
      }),
      victoryLines: Object.freeze([
        {
          lineId: 'DEFAULT_LINE',
          name: `${tempo} Core Line`,
          steps: ['T1 Early Play', 'T2 Development', 'T3 Pressure', 'T4 Win']
        }
      ]),
      resourcePlan: Object.freeze({
        mana: 'Curve-Optimized Mana Base',
        tempo: tempo,
        pressure: 'Board & Strategic Execution'
      }),
      executionSummary: `Standard ${tempo} Execution Plan.`
    };
  }
}
