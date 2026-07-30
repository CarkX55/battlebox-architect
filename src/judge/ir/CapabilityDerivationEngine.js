/**
 * CapabilityDerivationEngine.js
 * Frontend Derivation Pipeline:
 * Oracle Text ➔ Atomic Facts ➔ Fact Normalization ➔ Capability Derivation ➔ CardSemanticProfile & CapabilityVector
 */

import { CardSemanticProfile } from './CardSemanticProfile.js';
import { CapabilityVector } from './CapabilityVector.js';
import { Effect } from './Effect.js';

export class CapabilityDerivationEngine {
  static deriveProfile(rawCard) {
    const oracleText = (rawCard.oracle_text || rawCard.text || '').toLowerCase();
    const typeLine = (rawCard.type_line || '').toLowerCase();

    // 1. Atomic Fact Extraction & Normalization
    const atomicFacts = {
      isCreature: typeLine.includes('creature'),
      isLand: typeLine.includes('land'),
      isInstantOrSorcery: typeLine.includes('instant') || typeLine.includes('sorcery'),
      producesMana: oracleText.includes('add ') || typeLine.includes('land'),
      drawsCards: oracleText.includes('draw '),
      destroysOrExiles: oracleText.includes('destroy ') || oracleText.includes('exile '),
      resetsBoard: oracleText.includes('destroy all') || oracleText.includes('exile all') || (oracleText.includes('destroy') && oracleText.includes('each creature')),
      createsTokens: oracleText.includes('create ') && oracleText.includes('token'),
      sacrificesCreatures: oracleText.includes('sacrifice ') && oracleText.includes('creature'),
      millsSelf: oracleText.includes('mill ') || (oracleText.includes('put') && oracleText.includes('from your library into your graveyard')),
      reanimates: oracleText.includes('return ') && oracleText.includes('from your graveyard to the battlefield')
    };

    // 2. Build Physical CardSemanticProfile (v1)
    const profile = CardSemanticProfile.create(rawCard, atomicFacts);

    // 3. Derive Functional CapabilityVector (v1)
    const interfaces = [];
    const effects = [];
    const traits = [];

    if (atomicFacts.isCreature) traits.push('Creature');
    if (atomicFacts.isLand) traits.push('Land');

    if (atomicFacts.producesMana) {
      interfaces.push('ManaAcceleration');
      effects.push(new Effect({
        lifetime: atomicFacts.isLand || atomicFacts.isCreature ? Effect.LIFETIMES.PERMANENT : Effect.LIFETIMES.TRANSIENT,
        latency: Effect.LATENCIES.IMMEDIATE,
        repeatability: atomicFacts.isLand || atomicFacts.isCreature ? Effect.REPEATABILITIES.INFINITE : Effect.REPEATABILITIES.ONE_SHOT
      }));
    }

    if (atomicFacts.drawsCards) {
      interfaces.push('CardDraw');
      effects.push(new Effect({
        lifetime: Effect.LIFETIMES.TRANSIENT,
        latency: Effect.LATENCIES.IMMEDIATE,
        repeatability: Effect.REPEATABILITIES.ONE_SHOT
      }));
    }

    if (atomicFacts.resetsBoard) {
      interfaces.push('BoardReset');
    } else if (atomicFacts.destroysOrExiles) {
      interfaces.push('SingleTargetRemoval');
    }

    if (atomicFacts.createsTokens) {
      interfaces.push('TokenGeneration');
    }

    if (atomicFacts.sacrificesCreatures) {
      interfaces.push('SacrificeOutlet');
    }

    if (atomicFacts.millsSelf) {
      interfaces.push('SelfMill');
    }

    if (atomicFacts.reanimates) {
      interfaces.push('ReanimateTarget');
    }

    const vector = new CapabilityVector({
      id: `${profile.cardId}_Vector`,
      interfaces,
      effects,
      traits
    });

    return { profile, vector };
  }
}
