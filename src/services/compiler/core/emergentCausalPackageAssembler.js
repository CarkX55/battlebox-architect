/**
 * src/services/compiler/core/emergentCausalPackageAssembler.js
 * 
 * EmergentCausalPackageAssembler: Zero-Template Causal Engine Discovery v28.2.
 * 
 * Dynamically discovers multi-card synergy engines purely through graph traversal
 * on CardCausalContracts (Producer-Consumer, Amplifier-Target, Death-Flow).
 * Contains ZERO hardcoded strategy packages or pre-baked catalogues.
 */

import { CardCausalContract } from './cardCausalContract.js';
import { IdentityFirewall } from './identityFirewall.js';

export class EmergentPackage {
  constructor({
    packageId,
    name,
    cards = [],
    causalEdges = [],
    cohesionScore = 1.0,
    role = 'EMERGENT_ENGINE'
  } = {}) {
    this.packageId = packageId;
    this.name = name;
    this.cards = Object.freeze([...cards]);
    this.causalEdges = Object.freeze([...causalEdges]);
    this.cohesionScore = cohesionScore;
    this.role = role;
    this.requiredSlotsCount = cards.reduce((sum, c) => sum + (c.defaultCopies || 2), 0);
    Object.freeze(this);
  }
}

export class EmergentCausalPackageAssembler {
  /**
   * Dynamically discovers emergent multi-card packages from the candidate pool.
   * 
   * @param {Array<Object>} candidatePool 
   * @param {import('./intentPackage.js').IntentPackage} intentPackage 
   * @param {Object} deckIdentity 
   * @returns {Array<EmergentPackage>}
   */
  static discoverPackages(candidatePool = [], intentPackage = {}, deckIdentity = {}, gameplanContract = null) {
    const spellPool = candidatePool.filter(c => {
      const type = (c.type_line || c.type || '').toLowerCase();
      return !type.includes('land');
    });

    const parsedContracts = spellPool.map(card => ({
      card,
      contract: CardCausalContract.parse(card),
      type: (card.type_line || card.type || '').toLowerCase(),
      oracle: (card.oracle_text || card.oracleText || card.text || '').toLowerCase(),
      cmc: Number(card.cmc || card.mana_value || 0)
    }));

    const discovered = [];
    let pkgCounter = 1;

    const primaryTribe = (intentPackage.primaryTribe && intentPackage.primaryTribe !== 'None' ? intentPackage.primaryTribe : '').toLowerCase();

    // 1. Discover Amplifier-Target Synergy Clusters
    for (const item of parsedContracts) {
      const { card, oracle, type, cmc } = item;
      const cardNameLower = (card.name || '').toLowerCase();
      
      // Check if amplifier belongs to an alien tribe in a tribal deck
      if (primaryTribe) {
        const alienTribes = ['goblin', 'elf', 'merfolk', 'zombie', 'vampire', 'sliver', 'faerie', 'soldier', 'human', 'werewolf', 'wolf'].filter(t => t !== primaryTribe);
        const isAlienTribeCard = alienTribes.some(at => (cardNameLower.includes(at) || type.includes(at)) && !type.includes(primaryTribe));
        if (isAlienTribeCard) continue;
      }

      // Detect Lord / Amplifier / Anthem mechanics
      const isLord = (oracle.includes('other ') && (oracle.includes('get +1/+1') || oracle.includes('gets +1/+1') || oracle.includes('battle cry'))) ||
                     oracle.includes('creatures you control get');

      if (isLord) {
        // Find matching targets in the pool
        const matchingTargets = parsedContracts.filter(target => {
          if (target.card.id === card.id || target.card.name === card.name) return false;
          if (!target.type.includes('creature')) return false;

          // Check tribal match if deck is tribal
          if (primaryTribe) {
            return target.type.includes(primaryTribe) || (target.oracle && target.oracle.includes('changeling'));
          }
          // Generic low-cost attacker target
          return target.cmc <= 2;
        });

        if (matchingTargets.length >= 2) {
          const topTargets = matchingTargets.slice(0, 3);
          const pkgCards = [
            { card, defaultCopies: item.contract?.isLegendary ? 2 : 3, role: 'AMPLIFIER_CORE' },
            ...topTargets.map(t => ({ card: t.card, defaultCopies: t.cmc <= 1 ? 4 : 3, role: 'PRESSURE_TARGET' }))
          ];
          const causalEdges = topTargets.map(t => `${card.name} AMPLIFIES ${t.card.name}`);
          const cohesion = EmergentCausalPackageAssembler.computePackageCausalCohesion({
            cards: pkgCards,
            causalEdges,
            primaryTribe
          });

          if (cohesion.isConnected) {
            discovered.push(new EmergentPackage({
              packageId: `PKG_EMERGENT_AMP_${pkgCounter++}`,
              name: `Emergent Amplifier Engine (${card.name})`,
              cards: pkgCards,
              causalEdges,
              cohesionScore: cohesion.cohesionScore,
              role: 'BOARD_PRESSURE_CLUSTER'
            }));
          }
        }
      }
    }

    // 2. Discover Producer-Consumer Death Flow & Sacrifice Engines
    const deathPayoffs = parsedContracts.filter(i => 
      i.oracle.includes('whenever a creature you control dies') || 
      i.oracle.includes('dies, you may play') ||
      i.oracle.includes('dies, exile') ||
      i.oracle.includes('whenever another creature dies')
    );

    const deathFodder = parsedContracts.filter(i =>
      i.oracle.includes('when this creature dies, create') ||
      i.oracle.includes('sacrifice this') ||
      i.oracle.includes('when ~ enters, create a token') ||
      (i.cmc === 1 && i.type.includes('creature') && (i.oracle.includes('deals 1 damage') || i.oracle.includes('sacrifice')))
    );

    if (deathPayoffs.length > 0 && deathFodder.length > 0) {
      for (const payoff of deathPayoffs.slice(0, 2)) {
        const matchingFodder = deathFodder.slice(0, 2);
        const pkgCards = [
          { card: payoff.card, defaultCopies: payoff.contract?.isLegendary ? 2 : 3, role: 'DEATH_FLOW_PAYOFF' },
          ...matchingFodder.map(f => ({ card: f.card, defaultCopies: 4, role: 'DEATH_FODDER' }))
        ];
        const causalEdges = matchingFodder.map(f => `${f.card.name} DEATH_TRIGGERS ${payoff.card.name}`);
        const cohesion = EmergentCausalPackageAssembler.computePackageCausalCohesion({
          cards: pkgCards,
          causalEdges,
          primaryTribe
        });

        if (cohesion.isConnected) {
          discovered.push(new EmergentPackage({
            packageId: `PKG_EMERGENT_DEATHFLOW_${pkgCounter++}`,
            name: `Emergent Death Flow Engine (${payoff.card.name})`,
            cards: pkgCards,
            causalEdges,
            cohesionScore: cohesion.cohesionScore,
            role: 'CARD_FLOW_AND_ATTRITION'
          }));
        }
      }
    }

    // 3. Discover Velocity & Direct Reach Engines (Cheap Creatures + Burn Reach)
    const directBurn = parsedContracts.filter(i => 
      i.contract?.interactionProof?.effectScope === 'DAMAGE_REMOVAL' &&
      i.contract?.interactionProof?.targetScope === 'ANY_TARGET' &&
      i.cmc <= 2
    );

    const haste1Drops = parsedContracts.filter(i => 
      i.cmc === 1 && i.type.includes('creature') && (i.oracle.includes('haste') || Number(i.card.power) >= 2)
    );

    if (directBurn.length > 0 && haste1Drops.length > 0) {
      const burnCard = directBurn[0];
      const fastThreat = haste1Drops[0];
      const pkgCards = [
        { card: fastThreat.card, defaultCopies: 4, role: 'EARLY_PRESSURE' },
        { card: burnCard.card, defaultCopies: 4, role: 'DIRECT_REACH' }
      ];
      const causalEdges = [`${fastThreat.card.name} REDUCES_LIFE_TOTAL`, `${burnCard.card.name} CLOSES_LETHAL_WINDOW`];
      const cohesion = EmergentCausalPackageAssembler.computePackageCausalCohesion({
        cards: pkgCards,
        causalEdges,
        primaryTribe
      });

      if (cohesion.isConnected) {
        discovered.push(new EmergentPackage({
          packageId: `PKG_EMERGENT_REACH_${pkgCounter++}`,
          name: `Emergent Velocity & Reach Engine (${fastThreat.card.name} + ${burnCard.card.name})`,
          cards: pkgCards,
          causalEdges,
          cohesionScore: cohesion.cohesionScore,
          role: 'VELOCITY_AND_REACH'
        }));
      }
    }

    if (gameplanContract) {
      const activeDemands = (gameplanContract.turnRequirements || []).flatMap(tr => (tr.functionalDemands || []).map(fd => fd.functionName));
      const requiredCaps = new Set(gameplanContract.identityConstraints?.requiredMechanicCapabilities || []);
      const primaryIdentity = (gameplanContract.identityConstraints?.primaryIdentity || intentPackage?.primaryTribe || '').toLowerCase();
      const allowOffTribe = intentPackage ? intentPackage.allowOffTribe === true : false;
      const derivedKillTurn = Number(gameplanContract.derivedKillTurn || (intentPackage?.strategicTempo === 'AGGRO' ? 4 : 6));

      return discovered.filter(pkg => {
        // Invariant 1: Timing Window Constraint — No card in package may exceed derivedKillTurn
        const violatesTiming = pkg.cards.some(c => Number(c.card.cmc || c.card.mana_value || 0) > derivedKillTurn);
        if (violatesTiming) return false;

        // Invariant 2: STRICT_TRIBE Identity Constraint — No off-identity creatures in package
        if (primaryIdentity && !allowOffTribe) {
          const hasOffTribeCreature = pkg.cards.some(c => {
            const type = (c.card.type_line || c.card.type || '').toLowerCase();
            if (!type.includes('creature')) return false;
            return !IdentityFirewall.isMatchingTribe(c.card, primaryIdentity);
          });
          if (hasOffTribeCreature) return false;
        }

        // Invariant 3: Full Causal Path Closure — The package DRIVER/CORE must advance the Gameplan
        // A collateral 1-drop target cannot justify an unanchored amplifier/payoff core!
        const driverEntry = pkg.cards.find(c => c.role.includes('CORE') || c.role.includes('PAYOFF')) || pkg.cards[0];
        const driverCard = driverEntry?.card;
        if (!driverCard) return false;

        const driverContract = CardCausalContract.parse(driverCard);
        const driverCaps = new Set([
          ...(driverContract.supplies || []).map(s => s.capability),
          ...(driverCard.capabilities || [])
        ]);
        const driverCmc = Number(driverCard.cmc || driverCard.mana_value || 0);

        const driverSuppliesRequiredCap = Array.from(driverCaps).some(cap => requiredCaps.has(cap));
        const driverAdvancesTurnDemand = activeDemands.some(d => {
          if (d.includes('1CMC')) return driverCmc <= 1;
          if (d.includes('2CMC')) return driverCmc <= 2;
          if (d.includes('AMPLIFY')) return driverCmc <= 3 && (driverCaps.has('TRIBAL_LORD') || driverCaps.has('DAYBOUND_NIGHTBOUND') || driverCaps.has('COUNTER_GENERATOR') || driverCaps.has('SACRIFICE_OUTLET'));
          if (d.includes('LETHAL') || d.includes('CONVERT')) return driverCmc <= derivedKillTurn && (driverCaps.has('PLAYER_REACH') || driverCaps.has('CHEAP_REMOVAL'));
          return false;
        });

        return driverSuppliesRequiredCap || driverAdvancesTurnDemand;
      });
    }

    return discovered;
  }

  /**
   * Computes structural causal graph cohesion metrics.
   * Replaces unverified scalar estimates with directed edge density,
   * connected component integrity, and mutual capability compatibility.
   * 
   * @param {Object} params
   * @param {Array<Object>} params.cards
   * @param {Array<string>} params.causalEdges
   * @param {string} [params.primaryTribe]
   * @returns {Object} { cohesionScore, isConnected, directedEdgeDensity, orphanRate, compatibility }
   */
  static computePackageCausalCohesion({ cards = [], causalEdges = [], primaryTribe = '' }) {
    if (cards.length <= 1) return { cohesionScore: 1.0, isConnected: true, directedEdgeDensity: 1.0, orphanRate: 0, compatibility: 1.0 };
    const numCards = cards.length;
    const maxEdges = numCards * (numCards - 1);
    const edgeCount = causalEdges.length;
    const directedEdgeDensity = Math.min(1.0, edgeCount / Math.max(1, maxEdges));

    // Connected Component Integrity: ensure every card participates in at least one causal edge
    const participatingNames = new Set();
    for (const edge of causalEdges) {
      for (const c of cards) {
        if (edge.includes(c.card.name)) {
          participatingNames.add(c.card.name);
        }
      }
    }
    const orphanCount = cards.filter(c => !participatingNames.has(c.card.name)).length;
    const orphanRate = orphanCount / numCards;
    const isConnected = orphanCount === 0;

    // Target Supply/Demand Compatibility: assess mechanical or tribal alignment
    let alignedCardsCount = 0;
    for (const c of cards) {
      const type = (c.card.type_line || c.card.type || '').toLowerCase();
      const oracle = (c.card.oracle_text || c.card.text || '').toLowerCase();
      if (primaryTribe && (type.includes(primaryTribe) || oracle.includes(primaryTribe) || oracle.includes('changeling'))) {
        alignedCardsCount++;
      } else if (!primaryTribe && (c.role === 'AMPLIFIER_CORE' || c.role === 'PRESSURE_TARGET' || c.role === 'EARLY_PRESSURE' || c.role === 'DIRECT_REACH')) {
        alignedCardsCount++;
      }
    }
    const compatibility = alignedCardsCount / numCards;

    const rawScore = 0.4 * directedEdgeDensity + 0.4 * compatibility + 0.2 * (1 - orphanRate);
    const cohesionScore = Number(Math.max(0.1, Math.min(1.0, rawScore)).toFixed(2));

    return {
      cohesionScore,
      isConnected,
      directedEdgeDensity,
      orphanRate,
      compatibility
    };
  }
}
