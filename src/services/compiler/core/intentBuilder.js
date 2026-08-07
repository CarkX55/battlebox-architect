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
    const primaryTribe = input.tribe || input.tribu || input.primaryTribe || null;

    const strategy = Array.isArray(input.strategy) ? input.strategy : (input.estrategia ? [input.estrategia] : []);
    const mechanics = Array.isArray(input.mechanics) ? input.mechanics : (input.mecanicas ? [input.mecanicas] : []);
    
    const budget = input.budget || input.presupuesto || 'Unlimited';
    const powerLevel = input.powerLevel || input.nivelPoder || 'Competitive';

    const userConstraints = {
      prioritizePlaysets: input.prioritizePlaysets !== false && input.priorizar4x !== false,
      avoidRotation: Boolean(input.avoidRotation || input.evitarRotacion),
      excludedMechanics: Array.isArray(input.excludedMechanics) ? [...input.excludedMechanics] : (Array.isArray(input.mecanicasExcluidas) ? [...input.mecanicasExcluidas] : []),
      excludedCards: Array.isArray(input.excludedCards) ? [...input.excludedCards] : (Array.isArray(input.cartasExcluidas) ? [...input.cartasExcluidas] : []),
      companero: input.companero || input.companion || null,
      deckSize: Number(input.deckSize || input.tamanoMazo || 60)
    };

    const mustRules = Array.isArray(input.mustRules) ? [...input.mustRules] : [];
    if (primaryTribe) {
      mustRules.push(`tribe == ${primaryTribe}`);
    }
    if (userConstraints.companero) {
      mustRules.push(`companion == ${userConstraints.companero}`);
    }

    const mustNotRules = Array.isArray(input.mustNotRules) ? [...input.mustNotRules] : [];
    if (userConstraints.excludedCards.length > 0) {
      mustNotRules.push(...userConstraints.excludedCards);
    }
    if (colors.length > 0 && !colors.includes('G')) {
      mustNotRules.push('Llanowar Elves', 'Elvish Mystic', 'Birds of Paradise', 'Mono Green Devotion', 'Selesnya CoCo');
    }

    const preferRules = Array.isArray(input.preferRules) ? [...input.preferRules] : [];
    if (mechanics.length > 0) {
      preferRules.push(...mechanics.map(m => `mechanic == ${m}`));
    }

    return new IntentPackage({
      prompt: input.prompt || input.customPrompt || `${archetype} ${format}`,
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
