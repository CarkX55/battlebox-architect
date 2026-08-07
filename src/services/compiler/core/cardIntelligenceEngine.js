/**
 * src/services/compiler/core/cardIntelligenceEngine.js
 * 
 * CardIntelligenceEngine: SSOT Semántica Absoluta v15.
 * Compila cada carta UNA SOLA VEZ desde Oracle DB en un CardIntelligenceProfile rico e inmutable.
 * Ningún módulo del compilador vuelve a leer texto Oracle durante la construcción del mazo.
 */

export class CardIntelligenceProfile {
  constructor(data = {}) {
    this.cardName = data.cardName || 'Unknown Card';
    this.manaProfile = Object.freeze({ cmc: Number(data.manaProfile?.cmc || 0), colorCommitment: data.manaProfile?.colorCommitment || 'NONE' });
    this.boardImpact = Number(data.boardImpact || 0.5);
    this.tempoImpact = Number(data.tempoImpact || 0.5);
    this.cardAdvantage = Number(data.cardAdvantage || 0.0);
    this.interactionProfile = Number(data.interactionProfile || 0.0);
    this.resilience = Number(data.resilience || 0.5);
    this.archetypeAffinity = Object.freeze({ ...(data.archetypeAffinity || {}) });
    this.engineAffinity = Object.freeze({ ...(data.engineAffinity || {}) });
    this.manaSink = Boolean(data.manaSink);
    this.virtualCardAdvantage = Boolean(data.virtualCardAdvantage);
    this.tutorability = Boolean(data.tutorability);
    this.recursionCompatibility = Boolean(data.recursionCompatibility);
    this.graveyardDependency = Boolean(data.graveyardDependency);
    this.tribalAffinity = data.tribalAffinity || null;
    this.strategicRoles = Object.freeze([...(data.strategicRoles || [])]);
    this.activationRequirements = Object.freeze({ ...(data.activationRequirements || {}) });
    this.capabilities = Object.freeze([...(data.capabilities || [])]);

    Object.freeze(this);
  }

  evaluate(deck) {
    return { cardName: this.cardName, boardImpact: this.boardImpact, tempoImpact: this.tempoImpact };
  }
}

export class CardIntelligenceEngine {
  static profileCache = new Map();

  /**
   * Compila y devuelve el perfil semántico rico SSOT de una carta
   */
  static buildProfile(cardObj = {}) {
    const cardName = cardObj.name || 'Unknown';
    if (this.profileCache.has(cardName)) {
      return this.profileCache.get(cardName);
    }

    const typeLine = (cardObj.type_line || '').toLowerCase();
    const oracleText = (cardObj.oracle_text || '').toLowerCase();
    const cmc = Number(cardObj.cmc || 0);

    const isCreature = typeLine.includes('creature');
    const isLord = oracleText.includes('other') && oracleText.includes('get +1/+1');
    const isDork = oracleText.includes('{t}: add');
    const isDraw = oracleText.includes('draw a card') || oracleText.includes('draw cards');
    const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('deals');

    const roles = [];
    const threatOntology = [];
    if (isLord) roles.push('TRIBAL_LORD');
    if (isDork) roles.push('MANA_ENGINE');
    if (isDraw) roles.push('CARD_ADVANTAGE');
    if (isRemoval) roles.push('INTERACTION');

    // Threat Ontology Mapping SSOT v18.0
    if (oracleText.includes('return') && oracleText.includes('graveyard')) threatOntology.push('graveyard_recursion');
    if (oracleText.includes('create') && oracleText.includes('token')) threatOntology.push('wide_board');
    if (typeLine.includes('creature') && (cmc >= 5 || cardObj.power >= 5)) threatOntology.push('big_creature');
    if (oracleText.includes('whenever') && oracleText.includes('cast')) threatOntology.push('stack_combo');
    if (oracleText.includes('destroy target land') || oracleText.includes('does not untap')) threatOntology.push('mana_denial');
    if (oracleText.includes('deals') && oracleText.includes('damage to any target')) threatOntology.push('burn');
    if (typeLine.includes('artifact')) threatOntology.push('artifacts');
    if (oracleText.includes('token')) threatOntology.push('tokens');
    if (oracleText.includes('each player')) threatOntology.push('stax');

    let tribe = null;
    if (isCreature && typeLine.includes('—')) {
      const parts = typeLine.split('—')[1].trim().split(' ');
      tribe = parts[0] || null;
    }

    const profile = new CardIntelligenceProfile({
      cardName,
      manaProfile: { cmc, colorCommitment: cardObj.mana_cost || 'G' },
      boardImpact: isLord || cmc >= 3 ? 0.9 : 0.5,
      tempoImpact: isDork || isLord ? 0.95 : 0.6,
      cardAdvantage: isDraw ? 0.85 : 0.1,
      interactionProfile: isRemoval ? 0.8 : 0.1,
      resilience: oracleText.includes('indestructible') || oracleText.includes('hexproof') ? 0.95 : 0.5,
      archetypeAffinity: { merfolk: typeLine.includes('merfolk') ? 0.95 : 0.1, elves: typeLine.includes('elf') ? 0.95 : 0.1 },
      engineAffinity: { coco: cmc <= 3 && isCreature ? 0.95 : 0.1, vial: cmc <= 3 && isCreature ? 0.98 : 0.1 },
      manaSink: oracleText.includes('{x}') || oracleText.includes('pay'),
      virtualCardAdvantage: isDraw || isLord,
      tutorability: isCreature,
      recursionCompatibility: isCreature,
      graveyardDependency: oracleText.includes('graveyard'),
      tribalAffinity: typeLine.includes('merfolk') ? 'Merfolk' : typeLine.includes('elf') ? 'Elf' : null,
      strategicRoles: roles,
      activationRequirements: { minCreaturesRequired: isLord ? 20 : 0 },
      capabilities: [...roles, ...threatOntology, ...(cardObj.capabilities || [])]
    });


    this.profileCache.set(cardName, profile);
    return profile;
  }
}
