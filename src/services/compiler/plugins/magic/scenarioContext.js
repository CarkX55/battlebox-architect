/**
 * src/services/compiler/plugins/magic/scenarioContext.js
 * 
 * ScenarioContext: Contexto de Escenario de Torneo para Críticos y Evaluadores de MTG.
 * Encapsula las condiciones del metajuego, formato y estado de la partida:
 * - format (Modern, Pioneer, Standard, Legacy BattleBox)
 * - opponentArchetype (Mono Red Burn, Azorius Control, Tron, Dimir Inverter)
 * - gameNumber (Game 1, Game 2 post-sideboard)
 * - onThePlay (true / false)
 */

export class ScenarioContext {
  constructor(data = {}) {
    this.version = data.version || '1.0.0';
    this.format = data.format || 'Modern';
    this.opponentArchetype = data.opponentArchetype || 'Mono Red Aggro';
    this.gameNumber = Number(data.gameNumber || 1);
    this.onThePlay = data.onThePlay ?? true;
    this.sideboardActive = data.sideboardActive ?? false;
    Object.freeze(this);
  }

  toJSON() {
    return {
      version: this.version,
      format: this.format,
      opponentArchetype: this.opponentArchetype,
      gameNumber: this.gameNumber,
      onThePlay: this.onThePlay,
      sideboardActive: this.sideboardActive
    };
  }

  static fromJSON(jsonObj) {
    const data = typeof jsonObj === 'string' ? JSON.parse(jsonObj) : jsonObj;
    return new ScenarioContext(data);
  }
}
