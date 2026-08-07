/**
 * src/services/compiler/core/strategyMetricsDatabase.js
 * 
 * StrategyMetricsDatabase & Modular Card Profiles v1.0.
 * Card Knowledge Layer: Decomposes card metrics into modular sub-profiles:
 *   - CapabilityProfile
 *   - TempoProfile
 *   - EngineProfile
 *   - CurveProfile
 *   - InteractionProfile
 */

import { CapabilityAxisID, normalizeCapabilityAxisId } from './capabilityAxisId.js';

export class Contribution {
  constructor({ axis, amount = 0, certainty = 1.0, source = 'ORACLE_PARSER' }) {
    this.axis = normalizeCapabilityAxisId(axis);
    this.amount = Number(amount);
    this.certainty = Number(certainty);
    this.source = source;
    Object.freeze(this);
  }
}

export class CapabilityProfile {
  constructor(contributions = []) {
    this.contributions = Object.freeze(contributions.map(c => c instanceof Contribution ? c : new Contribution(c)));
    Object.freeze(this);
  }

  getContributionAmount(axisId) {
    const normalized = normalizeCapabilityAxisId(axisId);
    const matching = this.contributions.find(c => c.axis === normalized);
    return matching ? matching.amount * matching.certainty : 0;
  }
}

export class TempoProfile {
  constructor({ tags = [], speedCategory = 'MID' } = {}) {
    this.tags = Object.freeze([...tags]);
    this.speedCategory = speedCategory;
    Object.freeze(this);
  }
}

export class EngineProfile {
  constructor({ engines = [], tribalType = null } = {}) {
    this.engines = Object.freeze([...engines]);
    this.tribalType = tribalType;
    Object.freeze(this);
  }
}

export class CurveProfile {
  constructor({ cmc = 0, manaCost = '' } = {}) {
    this.cmc = Number(cmc);
    this.manaCost = manaCost;
    Object.freeze(this);
  }
}

export class InteractionProfile {
  constructor({ isRemoval = false, isSweeper = false, isCounter = false, speed = 'SORCERY' } = {}) {
    this.isRemoval = Boolean(isRemoval);
    this.isSweeper = Boolean(isSweeper);
    this.isCounter = Boolean(isCounter);
    this.speed = speed;
    Object.freeze(this);
  }
}

export class CardStrategicProfile {
  constructor({
    cardName,
    capabilityProfile = new CapabilityProfile(),
    tempoProfile = new TempoProfile(),
    engineProfile = new EngineProfile(),
    curveProfile = new CurveProfile(),
    interactionProfile = new InteractionProfile(),
    drawbacks = []
  }) {
    this.cardName = cardName;
    this.capabilityProfile = capabilityProfile;
    this.tempoProfile = tempoProfile;
    this.engineProfile = engineProfile;
    this.curveProfile = curveProfile;
    this.interactionProfile = interactionProfile;
    this.drawbacks = Object.freeze([...drawbacks]);

    Object.freeze(this);
  }

  getContributionAmount(axisId) {
    return this.capabilityProfile.getContributionAmount(axisId);
  }
}

export class StrategyMetricsDatabase {
  constructor() {
    this._profiles = new Map();
  }

  getOrExtractProfile(cardData) {
    if (!cardData || !cardData.name) {
      return new CardStrategicProfile({ cardName: 'Unknown' });
    }

    const cardNameLower = cardData.name.toLowerCase().trim();
    if (this._profiles.has(cardNameLower)) {
      return this._profiles.get(cardNameLower);
    }

    const profile = StrategyMetricsDatabase.extractProfileFromCard(cardData);
    this._profiles.set(cardNameLower, profile);
    return profile;
  }

  static extractProfileFromCard(card) {
    const name = card.name || 'Unknown';
    const typeLine = (card.type_line || card.typeLine || '').toLowerCase();
    const oracleText = (card.oracle_text || card.oracleText || '').toLowerCase();
    const cmc = Number(card.cmc || 0);

    const contributions = [];
    const tempoTags = [];
    const engines = [];
    let tribalType = null;

    if (typeLine.includes('creature')) {
      if (cmc <= 1) {
        contributions.push(new Contribution({ axis: CapabilityAxisID.TURN1_PRESSURE, amount: 10 }));
        tempoTags.push('EARLY');
      } else if (cmc === 2) {
        contributions.push(new Contribution({ axis: CapabilityAxisID.TURN2_PRESSURE, amount: 8 }));
        tempoTags.push('EARLY');
      } else if (cmc >= 4) {
        contributions.push(new Contribution({ axis: CapabilityAxisID.FINISHER, amount: 8 }));
        tempoTags.push('LATE');
      }
      contributions.push(new Contribution({ axis: CapabilityAxisID.BOARD_PRESENCE, amount: 6 }));
    }

    if (typeLine.includes('human')) {
      tribalType = 'Human';
      engines.push('HUMAN_ENGINE');
      contributions.push(new Contribution({ axis: CapabilityAxisID.TRIBAL_DENSITY, amount: 10 }));
    } else if (typeLine.includes('elf')) {
      tribalType = 'Elf';
      engines.push('ELF_ENGINE');
      contributions.push(new Contribution({ axis: CapabilityAxisID.TRIBAL_DENSITY, amount: 10 }));
    }

    const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') || (oracleText.includes('deal') && !typeLine.includes('creature'));
    if (isRemoval) {
      contributions.push(new Contribution({ axis: CapabilityAxisID.CHEAP_REMOVAL, amount: 10 }));
    }

    if (oracleText.includes('draw')) {
      contributions.push(new Contribution({ axis: CapabilityAxisID.CARD_FLOW, amount: 8 }));
    }

    if (typeLine.includes('land')) {
      contributions.push(new Contribution({ axis: CapabilityAxisID.MANA_BASE, amount: 1 }));
    }

    return new CardStrategicProfile({
      cardName: name,
      capabilityProfile: new CapabilityProfile(contributions),
      tempoProfile: new TempoProfile({ tags: tempoTags, speedCategory: cmc <= 2 ? 'FAST' : 'MID' }),
      engineProfile: new EngineProfile({ engines, tribalType }),
      curveProfile: new CurveProfile({ cmc, manaCost: card.mana_cost || '' }),
      interactionProfile: new InteractionProfile({ isRemoval, speed: typeLine.includes('instant') ? 'INSTANT' : 'SORCERY' })
    });
  }
}
