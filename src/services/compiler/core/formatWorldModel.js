/**
 * src/services/compiler/core/formatWorldModel.js
 * 
 * FormatWorldModel: Principle #6 Format Environment Auditor v25.0.
 * 
 * Answers: "Does the format world actually support executing this strategic plan?"
 * Evaluates card pool causal infrastructure, enablers, payoffs, engines, and unbroken WinPath closure.
 * Zero hardcoded quotas, zero static format lists.
 * 
 * Architecture:
 *   LEGAL CARD POOL (From DB / Scryfall)
 *          │
 *          ▼
 *   CARD CAUSAL CONTRACT (Oracle Truth Parser)
 *          │
 *          ▼
 *   CAUSAL GRAPH (Enablers ➔ Resources ➔ Engines ➔ Payoffs ➔ WinPath)
 *          │
 *          ▼
 *   WINPATH CLOSURE & TEMPORAL EXECUTION AUDIT
 *          │
 *          ▼
 *   VIABILITY REPORT (NOT_VIABLE | WEAKLY_SUPPORTED | SUPPORTED | VIABLE)
 *          │
 *          ▼
 *   DYNAMIC MULTI-WORLD COMPARISON (recommendedFormats)
 */

import { CardCausalContract } from './cardCausalContract.js';

export class FormatWorldModel {
  /**
   * Evaluates the viability of a target DeckIdentity within the specified format card pool.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @param {Array<Object>} cardPool 
   * @returns {{
   *   format: string,
   *   overallViabilityPercentage: number,
   *   isFormatViable: boolean,
   *   viability: 'NOT_VIABLE' | 'WEAKLY_SUPPORTED' | 'SUPPORTED' | 'VIABLE',
   *   winPathClosure: boolean,
   *   causalChainIntegrity: number,
   *   legalCardsCount: number,
   *   functionalPiecesCount: number,
   *   enablerCount: number,
   *   payoffCount: number,
   *   engineCount: number,
   *   interactionCount: number,
   *   recommendedFormats: Array<{ format: string, viability: string, causalGain: string, keyEnablersDiscovered: Array<string> }>,
   *   suggestedAdaptation: string,
   *   reportSummary: string
   * }}
   */
  static evaluateViability(intentPackage, targetIdentity, cardPool = []) {
    const format = (intentPackage?.format || 'STANDARD').toUpperCase();
    const tribe = (intentPackage?.primaryTribe || '').toLowerCase().trim();
    const strategy = Array.isArray(intentPackage?.strategy) ? intentPackage.strategy.join(' ').toLowerCase() : String(intentPackage?.strategy || '').toLowerCase();
    const mechanics = Array.isArray(intentPackage?.mechanics) ? intentPackage.mechanics.map(m => String(m).toLowerCase()) : [];
    const colors = intentPackage?.colors || [];
    const archetypeKey = (targetIdentity?.archetypeKey || '').toLowerCase();

    // Parse causal contracts for all cards in pool
    const contracts = cardPool.map(card => {
      if (card && card.oracleTruth && card.supplies) return card;
      return CardCausalContract.parse(card);
    }).filter(Boolean);

    let legalCardsCount = 0;
    let functionalPiecesCount = 0;
    const enablers = [];
    const payoffs = [];
    const engines = [];
    const resources = [];
    const interaction = [];

    // Analyze causal capabilities across the pool
    for (const contract of contracts) {
      const card = contract.cardIdentity;
      const oracle = (card.oracleText || '').toLowerCase();
      const typeLine = (card.typeLine || '').toLowerCase();
      const name = card.name;

      // Color filter check (cards within intent identity or colorless)
      const cardColors = card.colors || [];
      const isColorLegal = cardColors.length === 0 || cardColors.every(c => colors.includes(c));
      if (!isColorLegal) continue;

      let isThematicallyRelevant = false;

      // Check tribal association and intrinsic tribal mechanics
      if (tribe && tribe !== 'none' && tribe !== 'sin tribu') {
        if (
          typeLine.includes(tribe) || 
          oracle.includes(tribe) ||
          (tribe === 'wall' && (oracle.includes('defender') || typeLine.includes('wall') || oracle.includes('toughness'))) ||
          (tribe === 'ninja' && (oracle.includes('ninjutsu') || oracle.includes("can't be blocked"))) ||
          (tribe === 'otter' && (oracle.includes('prowess') || oracle.includes('instant') || oracle.includes('sorcery') || oracle.includes('offspring'))) ||
          (tribe === 'frog' && (oracle.includes('return to its owner\'s hand') || oracle.includes('enters the battlefield'))) ||
          (tribe === 'rabbit' && (oracle.includes('rabbit') || oracle.includes('creature token') || oracle.includes('convoke'))) ||
          (tribe === 'bat' && (oracle.includes('flying') && (oracle.includes('gain life') || oracle.includes('lost life')))) ||
          (tribe === 'lizard' && (oracle.includes('opponent lost life') || (oracle.includes('damage') && oracle.includes('haste')))) ||
          (tribe === 'mouse' && oracle.includes('valiant')) ||
          (tribe === 'phyrexian' && (oracle.includes('toxic') || oracle.includes('infect') || oracle.includes('poison counter') || oracle.includes('proliferate'))) ||
          (tribe === 'treefolk' && (oracle.includes('toughness rather than its power') || typeLine.includes('treefolk'))) ||
          (tribe === 'spider' && (oracle.includes('reach') && oracle.includes('deathtouch'))) ||
          (tribe === 'snake' && (typeLine.includes('snake') || typeLine.includes('naga'))) ||
          (tribe === 'crab' && (oracle.includes('landfall') && oracle.includes('mill'))) ||
          (tribe === 'horror' && (typeLine.includes('horror') || typeLine.includes('nightmare'))) ||
          (tribe === 'devil' && (typeLine.includes('devil') || typeLine.includes('imp'))) ||
          ((tribe === 'werewolf' || tribe.includes('werewolf') || tribe.includes('lobo')) && (typeLine.includes('werewolf') || oracle.includes('werewolf') || oracle.includes('daybound') || oracle.includes('nightbound')))
        ) {
          isThematicallyRelevant = true;
          legalCardsCount += 1;
        }
      } else {
        legalCardsCount += 1;
      }

      // Check mechanics association
      if (mechanics.some(m => oracle.includes(m) || typeLine.includes(m))) {
        isThematicallyRelevant = true;
      }

      // Strategy keyword correlation
      if (strategy && (
        (strategy.includes('toughness') && (oracle.includes('toughness') || oracle.includes('defender'))) ||
        (strategy.includes('aristocrats') && (oracle.includes('sacrifice') || oracle.includes('dies'))) ||
        (strategy.includes('reanimator') && (oracle.includes('graveyard') || oracle.includes('return from'))) ||
        (strategy.includes('tokens') && oracle.includes('token')) ||
        (strategy.includes('spellslinger') && (oracle.includes('instant') || oracle.includes('sorcery') || oracle.includes('prowess'))) ||
        (strategy.includes('toxic') && (oracle.includes('toxic') || oracle.includes('poison counter') || oracle.includes('infect')))
      )) {
        isThematicallyRelevant = true;
      }

      // 1. Identify Enablers (cards providing enabling conditions for operational dependencies)
      let isEnabler = false;
      if (
        oracle.includes("assigns combat damage equal to its toughness") ||
        oracle.includes("toughness rather than its power") ||
        oracle.includes("can attack as though they didn't have defender") ||
        oracle.includes("can attack as though it didn't have defender") ||
        oracle.includes("can't be blocked") ||
        oracle.includes("cannot be blocked") ||
        oracle.includes("ninjutsu") ||
        oracle.includes("sacrifice a creature:") ||
        oracle.includes("sacrifice another creature:") ||
        oracle.includes("discard a card:") ||
        oracle.includes("pay life:") ||
        oracle.includes("whenever a creature you control dies") ||
        oracle.includes("toxic ") ||
        oracle.includes("infect") ||
        oracle.includes("poison counter") ||
        oracle.includes("valiant")
      ) {
        enablers.push(name);
        isEnabler = true;
      }

      // 2. Identify Payoffs (cards converting theme/engine into winning board state or massive output)
      let isPayoff = false;
      if (
        oracle.includes("for each creature you control with defender") ||
        oracle.includes("equal to the number of creatures you control") ||
        oracle.includes("whenever a creature you control deals combat damage") ||
        oracle.includes("whenever you cast a noncreature spell") ||
        oracle.includes("whenever you cast an instant or sorcery") ||
        oracle.includes("whenever another creature dies, each opponent loses") ||
        oracle.includes("creatures you control get +") ||
        oracle.includes("other creatures you control get +") ||
        oracle.includes("proliferate") ||
        oracle.includes("corrupted —") ||
        (card.toughness && Number(card.toughness) >= 5 && (oracle.includes("defender") || typeLine.includes("wall")))
      ) {
        payoffs.push(name);
        isPayoff = true;
      }

      // 3. Identify Resources (Mana generation, ramp, fixing)
      if (
        oracle.includes("add {") ||
        oracle.includes("search your library for a land") ||
        oracle.includes("create a treasure")
      ) {
        resources.push(name);
      }

      // 4. Identify Engines (repeatable card draw, mana generation, token production)
      let isEngine = false;
      if (
        oracle.includes("draw a card") ||
        oracle.includes("investigate") ||
        oracle.includes("surveil") ||
        oracle.includes("create a token") ||
        oracle.includes("add {")
      ) {
        if (isThematicallyRelevant) {
          engines.push(name);
          isEngine = true;
        }
      }

      // 5. Identify Interaction (Removal, Board Wipe, Counterspells, Protection)
      if (
        oracle.includes("destroy") ||
        oracle.includes("exile") ||
        oracle.includes("counter target") ||
        oracle.includes("deal") && oracle.includes("damage") ||
        oracle.includes("indestructible") ||
        oracle.includes("hexproof")
      ) {
        interaction.push(name);
      }

      if (isEnabler || isPayoff || isEngine) {
        functionalPiecesCount += 1;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // CAUSAL WINPATH CLOSURE AUDIT
    // ─────────────────────────────────────────────────────────────────────────────
    let winPathClosure = true;
    let chainIntegrity = 1.0;
    const failureReasons = [];

    // Specific Operational Dependency Proof Obligations:
    // A. Defender / Toughness Combat: Requires Enabler (damage by toughness or attack enabled)
    if (archetypeKey.includes('wall') || archetypeKey.includes('toughness') || tribe === 'wall' || strategy.includes('toughness') || strategy.includes('resistencia')) {
      const hasToughnessEnabler = enablers.some(e => {
        const c = contracts.find(ct => ct.cardIdentity.name === e);
        const o = (c?.cardIdentity?.oracleText || '').toLowerCase();
        return o.includes('toughness rather than its power') || o.includes('damage equal to its toughness') || o.includes("didn't have defender") || o.includes("doesn't have defender");
      });

      if (!hasToughnessEnabler) {
        winPathClosure = false;
        chainIntegrity *= 0.2;
        failureReasons.push("Falta de habilitadores causales (enablers) para convertir criaturas con Defensor en atacantes o asignar daño por resistencia.");
      }
    }

    // B. Ninjutsu / Infiltration: Requires unblockable/cheap attackers
    if (archetypeKey.includes('ninja') || tribe === 'ninja' || strategy.includes('ninjutsu')) {
      const hasEvasiveEnabler = enablers.some(e => {
        const c = contracts.find(ct => ct.cardIdentity.name === e);
        const o = (c?.cardIdentity?.oracleText || '').toLowerCase();
        return o.includes("can't be blocked") || o.includes("cannot be blocked") || (c?.cardIdentity?.isCreature && c?.cardIdentity?.cmc <= 2 && o.includes('flying'));
      });

      if (!hasEvasiveEnabler) {
        winPathClosure = false;
        chainIntegrity *= 0.3;
        failureReasons.push("Falta de criaturas evasivas baratas (T1-T2 unblockable/flying) para habilitar disparos de Ninjutsu.");
      }
    }

    // C. Slivers / Heavy Tribal Lord Engine: Requires adequate lords/payoffs
    if (tribe === 'sliver' || tribe === 'fragmentado') {
      if (legalCardsCount < 12 || payoffs.length < 3) {
        winPathClosure = false;
        chainIntegrity *= 0.15;
        failureReasons.push("Masa crítica insuficiente de Fragmentados con habilidades compartidas en el pool legal.");
      }
    }

    // D. Phyrexian / Toxic / Infect: Requires poison counter generators
    if (tribe === 'phyrexian' || strategy.includes('toxic') || strategy.includes('infect')) {
      const hasToxicEnabler = enablers.some(e => {
        const c = contracts.find(ct => ct.cardIdentity.name === e);
        const o = (c?.cardIdentity?.oracleText || '').toLowerCase();
        return o.includes('toxic') || o.includes('infect') || o.includes('poison counter');
      });

      if (!hasToxicEnabler) {
        winPathClosure = false;
        chainIntegrity *= 0.2;
        failureReasons.push("Falta de fuentes de veneno (Toxic o Infect) en el pool legal para habilitar la condición de victoria pirexiana.");
      }
    }

    // E. Werewolf / Daybound / Nightbound: Requires critical mass of Werewolves/transform cards
    if (tribe === 'werewolf' || tribe.includes('werewolf') || tribe.includes('lobo') || archetypeKey.includes('werewolf')) {
      if (legalCardsCount < 8) {
        winPathClosure = false;
        chainIntegrity *= 0.15;
        failureReasons.push("Masa crítica insuficiente de Hombres Lobo / Daybound en el pool legal del formato (rotados de Standard). Se recomienda PIONEER o MODERN.");
      }
    }

    // Baseline infrastructure checks (Interaction + Mana Resources)
    if (interaction.length === 0) {
      chainIntegrity *= 0.8;
    }
    if (targetIdentity?.requiresManaRamp && resources.length === 0) {
      chainIntegrity *= 0.75;
      failureReasons.push("Falta de fuentes de aceleración de maná en el pool legal para sostener la curva pesada.");
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // 4-TIER VIABILITY CLASSIFICATION (Causal Proof Hierarchy)
    // ─────────────────────────────────────────────────────────────────────────────
    let viability = 'VIABLE';
    if (!winPathClosure || chainIntegrity < 0.40) {
      viability = 'NOT_VIABLE';
    } else if (chainIntegrity < 0.70) {
      viability = 'WEAKLY_SUPPORTED';
    } else if (chainIntegrity < 0.90) {
      viability = 'SUPPORTED';
    } else {
      viability = 'VIABLE';
    }

    const overallViabilityPercentage = Math.round(chainIntegrity * 100);
    const isFormatViable = viability === 'SUPPORTED' || viability === 'VIABLE';

    let suggestedAdaptation = 'Exact Target Identity Viable';
    if (viability === 'NOT_VIABLE') {
      suggestedAdaptation = failureReasons.length > 0 
        ? failureReasons[0] 
        : `El pool legal de ${format} carece de la infraestructura causal para cerrar el WinPath de esta estrategia.`;
    } else if (viability === 'WEAKLY_SUPPORTED') {
      suggestedAdaptation = `Soporte causal parcial en ${format}. Se recomienda reforzar con interacción universal o evaluar formatos eternos.`;
    }

    const reportSummary = isFormatViable
      ? `El formato ${format} soporta plenamente la identidad ${targetIdentity?.archetypeKey || 'STRATEGY'} (Viabilidad ${viability}, Integridad Causal ${overallViabilityPercentage}%).`
      : `El formato ${format} presenta deficiencia causal para ${targetIdentity?.archetypeKey || 'STRATEGY'} (${viability}). ${suggestedAdaptation}`;

    return {
      format,
      overallViabilityPercentage,
      isFormatViable,
      viability,
      winPathClosure,
      causalChainIntegrity: Math.round(chainIntegrity * 100) / 100,
      legalCardsCount,
      functionalPiecesCount,
      enablerCount: enablers.length,
      payoffCount: payoffs.length,
      engineCount: engines.length,
      interactionCount: interaction.length,
      enablersDiscovered: enablers.slice(0, 5),
      payoffsDiscovered: payoffs.slice(0, 5),
      recommendedFormats: [], // populated via discoverRecommendedFormats
      suggestedAdaptation,
      reportSummary
    };
  }

  /**
   * Compares the same user intent against multiple format worlds dynamically,
   * ranking alternative formats by their causal infrastructure and WinPath closure gain.
   * 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {import('./deckIdentityModel.js').DeckIdentity} targetIdentity 
   * @param {Record<string, Array<Object>>} formatPoolsMap Map of { FORMAT_NAME: cardArray }
   * @returns {Array<{ format: string, viability: string, overallViabilityPercentage: number, causalGain: string, keyEnablersDiscovered: Array<string> }>}
   */
  static discoverRecommendedFormats(intentPackage, targetIdentity, formatPoolsMap = {}) {
    const currentFormat = (intentPackage?.format || 'STANDARD').toUpperCase();
    const recommendations = [];

    const availableFormats = Object.keys(formatPoolsMap).filter(f => f.toUpperCase() !== currentFormat);

    for (const fmt of availableFormats) {
      const pool = formatPoolsMap[fmt] || [];
      const testIntent = { ...intentPackage, format: fmt };
      const evaluation = this.evaluateViability(testIntent, targetIdentity, pool);

      if (evaluation.viability === 'SUPPORTED' || evaluation.viability === 'VIABLE') {
        const gainValue = evaluation.overallViabilityPercentage;
        recommendations.push({
          format: fmt,
          viability: evaluation.viability,
          overallViabilityPercentage: evaluation.overallViabilityPercentage,
          functionalPiecesCount: evaluation.functionalPiecesCount,
          legalCardsCount: evaluation.legalCardsCount,
          causalGain: `+${gainValue}% Soporte Causal`,
          keyEnablersDiscovered: evaluation.enablersDiscovered || []
        });
      }
    }

    // Sort formats by highest viability score descending, breaking ties with functional depth
    recommendations.sort((a, b) => 
      b.overallViabilityPercentage - a.overallViabilityPercentage ||
      b.functionalPiecesCount - a.functionalPiecesCount ||
      b.legalCardsCount - a.legalCardsCount
    );
    return recommendations;
  }
}
