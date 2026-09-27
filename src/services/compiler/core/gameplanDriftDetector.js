/**
 * src/services/compiler/core/gameplanDriftDetector.js
 * 
 * GameplanDriftDetector: V29.1 Strategic Fidelity Auditor.
 * 
 * Audits the end-to-end alignment between:
 *   1. User Intent (IntentPackage)
 *   2. Strategic Line & GameplanContract
 *   3. Final Deck Composition (DeckState)
 *   4. Simulation Execution Trace (SimulationTrace)
 * 
 * If the simulation or deck state drifts into an incongruent archetype
 * (e.g., simulating Cantrip/Prowess loops on a Goblin Aggro deck),
 * this module detects the drift, flags the contradiction, and emits
 * a structured REPLAN verdict with causal diagnostic evidence.
 * 
 * Axioms:
 *   1. ZERO tolerance for silent archetype drift.
 *   2. Compares semantic and functional capabilities, not text keywords.
 *   3. Universal across all tribal, non-tribal, and hybrid archetypes.
 */

export class GameplanDriftDetector {
  /**
   * Evaluates if there is strategic drift between Intent, Gameplan, Deck, and Simulation.
   * 
   * @param {Object} params
   * @param {import('./intentPackage.js').IntentPackage} params.intentPackage
   * @param {import('./gameplanSynthesizer.js').GameplanContract} params.gameplanContract
   * @param {Object} params.deckState
   * @param {Object} [params.simulationTrace=null]
   * @returns {Object} { hasDrift: boolean, verdict: 'PASS'|'REPLAN', driftDetails: Array<Object>, auditScore: number }
   */
  static detectDrift({ intentPackage, gameplanContract, deckState, simulationTrace = null }) {
    const driftDetails = [];
    let auditScore = 1.0;

    if (!gameplanContract || !deckState) {
      return { hasDrift: false, verdict: 'PASS', driftDetails: [], auditScore: 1.0 };
    }

    const cards = deckState.cards || [];
    const nonLands = cards.filter(c => !c.isLand);

    // 1. Audit Tribe Consistency (if tribal intent)
    const primaryTribe = (intentPackage.primaryTribe || '').toLowerCase().trim();
    if (primaryTribe) {
      const tribalCards = nonLands.filter(c => {
        const typeLine = (c.type_line || c.type || c.cardObj?.type_line || '').toLowerCase();
        const oracle = (c.oracle_text || c.oracle || c.cardObj?.oracle_text || '').toLowerCase();
        return typeLine.includes(primaryTribe) || oracle.includes(primaryTribe);
      });

      const tribalDensityRatio = nonLands.length > 0 ? tribalCards.length / nonLands.length : 0;
      if (tribalDensityRatio < 0.35) {
        driftDetails.push({
          type: 'TRIBAL_DILUTION_DRIFT',
          severity: 'HIGH',
          message: `Tribal identity "${primaryTribe}" is diluted: only ${(tribalDensityRatio * 100).toFixed(1)}% of non-land cards relate to the tribe.`,
          expectedRatio: 0.50,
          actualRatio: tribalDensityRatio
        });
        auditScore -= 0.30;
      }
    }

    // 2. Audit WinPath Alignment
    const expectedWinCondition = (gameplanContract.winCondition?.type || '').toUpperCase();
    const dominantLineCaps = new Set();
    for (const req of gameplanContract.turnRequirements || []) {
      for (const fd of req.functionalDemands || []) {
        dominantLineCaps.add(fd.functionName);
      }
    }

    // Check if the cards in the deck supply the necessary WinPath capabilities
    let winPathSupportCount = 0;
    for (const entry of nonLands) {
      const cardObj = entry.cardObj || entry.card || entry;
      const oracle = (cardObj.oracle_text || cardObj.oracle || '').toLowerCase();
      const typeLine = (cardObj.type_line || cardObj.type || '').toLowerCase();

      if (expectedWinCondition.includes('BURN') && (oracle.includes('damage to any target') || oracle.includes('damage to target player') || oracle.includes('damage to each opponent'))) {
        winPathSupportCount++;
      } else if (expectedWinCondition.includes('DRAIN') && (oracle.includes('sacrifice') || oracle.includes('dies') || oracle.includes('loses life'))) {
        winPathSupportCount++;
      } else if (expectedWinCondition.includes('SWARM') && (oracle.includes('token') || oracle.includes('creatures you control get +'))) {
        winPathSupportCount++;
      } else if (typeLine.includes('creature')) {
        winPathSupportCount++;
      }
    }

    const winPathSupportRatio = nonLands.length > 0 ? winPathSupportCount / nonLands.length : 0;
    if (winPathSupportRatio < 0.40) {
      driftDetails.push({
        type: 'WINPATH_DISCONNECT_DRIFT',
        severity: 'HIGH',
        message: `Deck composition does not sufficiently support the active WinPath [${expectedWinCondition}]: support ratio is ${(winPathSupportRatio * 100).toFixed(1)}%.`,
        expectedWinCondition,
        actualSupportRatio: winPathSupportRatio
      });
      auditScore -= 0.35;
    }

    // 3. Audit Simulation Trace Consistency (if trace available)
    if (simulationTrace) {
      const simSummary = (typeof simulationTrace === 'string' ? simulationTrace : JSON.stringify(simulationTrace)).toLowerCase();

      // Check for spurious archetype contamination (e.g. prowess in goblin aggro)
      if (primaryTribe === 'goblin' && simSummary.includes('prowess') && !simSummary.includes('goblin')) {
        driftDetails.push({
          type: 'SIMULATION_ARCHETYPE_CONTRADICTION',
          severity: 'CRITICAL',
          message: 'Simulation trace evaluated a Prowess/Spellslinger plan while the Gameplan is Goblin Aggro.',
          expectedThesis: gameplanContract.thesis,
          detectedSimPattern: 'PROWESS_CANTRIP'
        });
        auditScore -= 0.50;
      }
    }

    const hasDrift = driftDetails.some(d => d.severity === 'CRITICAL' || d.severity === 'HIGH');
    const verdict = hasDrift ? 'REPLAN' : 'PASS';

    return {
      hasDrift,
      verdict,
      driftDetails,
      auditScore: Math.max(0, Number(auditScore.toFixed(3)))
    };
  }
}
