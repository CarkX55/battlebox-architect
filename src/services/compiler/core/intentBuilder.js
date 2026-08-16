/**
 * src/services/compiler/core/intentBuilder.js
 * 
 * IntentBuilder: Pure UI Form State Transformer v1.0.
 * Transforms 100% of UI form inputs directly into a typed IntentPackage.
 * 
 * PRINCIPLE #1: BATTLEBOX IS A COMPILER, NOT A CHATBOT.
 * ZERO AI, ZERO PROMPT RE-PARSING, ZERO INFERENCES, ZERO LOST FORM FIELDS.
 */

import { IntentPackage } from './intentPackage.js';
import { IntentNormalizer } from './intentNormalizer.js';
import { GOLDEN_CORE_PACKAGES, UNIVERSAL_ENGINES, MTG_TRIBES, MTG_STRATEGIES } from '../../../constants/legacyBattleBox.js';

export class IntentBuilder {
  /**
   * Pure transformation of UI Form State into an immutable IntentPackage.
   * 
   * @param {Object} uiState - Raw form state from React UI
   * @returns {IntentPackage}
   */
  static buildFromUI(uiState = {}) {
    const input = uiState || {};

    const format = (input.format || input.formato || 'Standard').toUpperCase();
    
    let colors = Array.isArray(input.colors) ? input.colors : (Array.isArray(input.colores) ? input.colores : []);
    colors = colors.map(c => c.toUpperCase());
    if (colors.length === 0 && input.color) {
      colors = [input.color.toUpperCase()];
    }

    const archetype = input.archetype || input.arquetipo || input.tempo || 'Aggro';
    const rawTribe = input.tribe || input.tribu || input.primaryTribe || null;
    let primaryTribe = rawTribe ? IntentNormalizer.normalizeTribe(rawTribe) : null;
    
    // Auto-detect primaryTribe from selectedEngineId or engineFlavor if tribe is unselected
    const engId = (input.selectedEngineId || input.engineId || '').toLowerCase();
    const engFlav = (input.engineFlavor || input.flavor || '').toLowerCase();
    const comb = `${engId} ${engFlav}`;
    if (!primaryTribe || primaryTribe.toLowerCase() === 'none' || primaryTribe.toLowerCase() === 'general' || primaryTribe.toLowerCase() === 'null') {
      if (comb.includes('goblin')) primaryTribe = 'Goblin';
      else if (comb.includes('dragon')) primaryTribe = 'Dragon';
      else if (comb.includes('elf')) primaryTribe = 'Elf';
      else if (comb.includes('merfolk')) primaryTribe = 'Merfolk';
      else if (comb.includes('vampire')) primaryTribe = 'Vampire';
      else if (comb.includes('zombie')) primaryTribe = 'Zombie';
      else if (comb.includes('angel')) primaryTribe = 'Angel';
      else if (comb.includes('demon')) primaryTribe = 'Demon';
    }

    const strategy = Array.isArray(input.strategy) ? input.strategy : (input.estrategia ? [input.estrategia] : []);
    const mechanics = Array.isArray(input.mechanics) ? input.mechanics : (input.mecanicas ? [input.mecanicas] : []);
    
    const budget = input.budget || input.presupuesto || 'Unlimited';
    const powerLevel = input.powerLevel || input.nivelPoder || 'Competitive';

    const rarityMode = input.rarityMode || input.modoRareza || 'high-power';
    let allowedRarities = [];
    if (Array.isArray(input.allowedRarities) && input.allowedRarities.length > 0) {
      allowedRarities = input.allowedRarities.map(r => String(r).toLowerCase());
    } else if (rarityMode === 'pauper') {
      allowedRarities = ['common'];
    } else if (rarityMode === 'artisan') {
      allowedRarities = ['common', 'uncommon'];
    } else if (rarityMode === 'standard') {
      allowedRarities = ['common', 'uncommon', 'rare'];
    } else {
      allowedRarities = ['common', 'uncommon', 'rare', 'mythic'];
    }

    const generationPriority = input.generationPriority || input.prioridadSeleccion || 'balanced';

    const selectedEngineId = input.selectedEngineId || input.engineId || null;
    const engineFlavor = input.engineFlavor || input.flavor || input.subEstrategia || null;
    const rawBoostKws = input.boostKeywords || input.keywords || [];
    const initialBoostKeywords = Array.isArray(rawBoostKws) ? [...rawBoostKws] : (typeof rawBoostKws === 'string' ? rawBoostKws.split(',').map(k => k.trim()) : []);

    // Master Strategic Enrichment Pipeline (100% Pure Agentic Reasoning)
    const selectedCorePackagesSet = new Set(Array.isArray(input.selectedCorePackages) ? input.selectedCorePackages : []);
    const boostKeywordsSet = new Set(initialBoostKeywords);
    const vetoedKeywordsSet = new Set(Array.isArray(input.vetoedKeywords) ? input.vetoedKeywords : []);

    const tribeKey = primaryTribe ? primaryTribe.toLowerCase() : '';
    const stratKey = (selectedEngineId || (strategy[0] || '')).toLowerCase();

    // Inject boost keywords for RAG guidance without preloading static packages
    const matchingEngine = UNIVERSAL_ENGINES.find(e => e.id === selectedEngineId || e.id.replace('_generic','') === stratKey);
    if (matchingEngine) {
      if (matchingEngine.boostKeywords) matchingEngine.boostKeywords.forEach(kw => boostKeywordsSet.add(kw));
      if (matchingEngine.vetoedKeywords) matchingEngine.vetoedKeywords.forEach(kw => vetoedKeywordsSet.add(kw));
      if (colors.length === 0 && matchingEngine.requiredColors) colors = [...matchingEngine.requiredColors];
    }

    const matchingTribe = MTG_TRIBES.find(t => t.id === tribeKey || t.subtypes?.includes(tribeKey) || t.label.toLowerCase().includes(tribeKey));
    if (matchingTribe) {
      if (colors.length === 0 && matchingTribe.colors) colors = [...matchingTribe.colors];
      if (matchingTribe.flavors) {
        const matchingFlavor = matchingTribe.flavors.find(f => f.id === selectedEngineId || f.label.toLowerCase() === engineFlavor?.toLowerCase());
        if (matchingFlavor) {
          if (matchingFlavor.corePackageId) selectedCorePackagesSet.add(matchingFlavor.corePackageId);
          if (matchingFlavor.boostKeywords) matchingFlavor.boostKeywords.forEach(kw => boostKeywordsSet.add(kw));
          if (matchingFlavor.vetoedKeywords) matchingFlavor.vetoedKeywords.forEach(kw => vetoedKeywordsSet.add(kw));
        }
      }
    }

    const matchingStrategy = MTG_STRATEGIES.find(s => s.id === stratKey || s.label.toLowerCase().includes(stratKey));
    if (matchingStrategy) {
      if (matchingStrategy.keywords) matchingStrategy.keywords.forEach(kw => boostKeywordsSet.add(kw));
      if (colors.length === 0 && matchingStrategy.colors) colors = [...matchingStrategy.colors];
    }

    const boostKeywords = Array.from(boostKeywordsSet);
    const vetoedKeywords = Array.from(vetoedKeywordsSet);
    const selectedCorePackages = Array.from(selectedCorePackagesSet);

    const userConstraints = {
      prioritizePlaysets: input.prioritizePlaysets !== false && input.priorizar4x !== false,
      avoidRotation: Boolean(input.avoidRotation || input.evitarRotacion),
      mustInclude: Array.isArray(input.mustInclude) ? [...input.mustInclude] : (Array.isArray(input.cartasObligatorias) ? [...input.cartasObligatorias] : []),
      selectedCorePackages,
      customBanlist: Array.isArray(input.customBanlist) ? [...input.customBanlist] : (Array.isArray(input.vetoedCards) ? [...input.vetoedCards] : []),
      vetoedCards: Array.isArray(input.vetoedCards) ? [...input.vetoedCards] : (Array.isArray(input.customBanlist) ? [...input.customBanlist] : []),
      excludedCards: Array.isArray(input.excludedCards) ? [...input.excludedCards] : (Array.isArray(input.cartasExcluidas) ? [...input.cartasExcluidas] : []),
      excludedMechanics: Array.isArray(input.excludedMechanics) ? [...input.excludedMechanics] : (Array.isArray(input.mecanicasExcluidas) ? [...input.mecanicasExcluidas] : []),
      vetoedKeywords,
      selectedEngineId,
      engineFlavor,
      boostKeywords,
      rarityMode,
      allowedRarities,
      generationPriority,
      allowCustomCards: input.allowCustomCards !== false,
      creativity: Number(input.creativity !== undefined ? input.creativity : 50),
      playstyle: input.playstyle || input.playStyle || 'balanced',
      stance: input.stance || 'balanced',
      goal: input.goal || 'BALANCED',
      explosiveness: input.explosiveness || 'BALANCED',
      complexity: input.complexity || 'MEDIUM',
      innovation: input.innovation || 'SLIGHT_INNOVATION',
      themePriority: input.themePriority || 'STRICT_THEME_FIDELITY',
      curveProfile: input.curveProfile || 'balanced',
      customPrompt: input.customPrompt || input.prompt || '',
      singleton: Boolean(input.singleton),
      maxCopies: Number(input.maxCopies || (input.singleton ? 1 : 4)),
      maxBudget: input.maxBudget || input.presupuesto || 'unlimited',
      manaGreed: input.manaGreed || 'balanced',
      manaBaseStyle: input.manaBaseStyle || 'competitive',
      sideboardFocus: Array.isArray(input.sideboardFocus) ? [...input.sideboardFocus] : [],
      sideboardSize: Number(input.sideboardSize || 15),
      companero: input.companero || input.companion || null,
      deckSize: Number(input.deckSize || input.tamanoMazo || 60)
    };

    const mustRules = Array.isArray(input.mustRules) ? [...input.mustRules] : [];
    if (primaryTribe) {
      mustRules.push(`tribe == ${primaryTribe}`);
    }
    if (userConstraints.mustInclude.length > 0) {
      mustRules.push(...userConstraints.mustInclude.map(c => `mustInclude == ${c}`));
    }
    if (userConstraints.companero) {
      mustRules.push(`companion == ${userConstraints.companero}`);
    }

    const mustNotRules = Array.isArray(input.mustNotRules) ? [...input.mustNotRules] : [];
    if (userConstraints.excludedCards.length > 0) {
      mustNotRules.push(...userConstraints.excludedCards);
    }
    if (userConstraints.customBanlist.length > 0) {
      mustNotRules.push(...userConstraints.customBanlist);
    }
    if (colors.length > 0 && !colors.includes('G')) {
      mustNotRules.push('Llanowar Elves', 'Elvish Mystic', 'Birds of Paradise', 'Mono Green Devotion', 'Selesnya CoCo');
    }

    const preferRules = Array.isArray(input.preferRules) ? [...input.preferRules] : [];
    if (mechanics.length > 0) {
      preferRules.push(...mechanics.map(m => `mechanic == ${m}`));
    }

    return new IntentPackage({
      prompt: input.customPrompt || input.prompt || `${archetype} ${format}`,
      format,
      colors,
      primaryTribe,
      tempo: archetype,
      strategy,
      mechanics,
      budget,
      powerLevel,
      userConstraints,
      mustRules,
      mustNotRules,
      preferRules,
      source: 'UI_FORM_STATE'
    });

  }
}

