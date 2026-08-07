/**
 * src/services/compiler/core/intentCompiler.js
 * 
 * IntentCompiler: Single Authorized Interpreter of User Intent v1.0.
 * Parses raw user prompts or form inputs into an immutable IntentPackage.
 * 
 * NO OTHER COMPONENT MAY INTERPRET OR OVERRIDE USER INTENT.
 */

import { IntentPackage } from './intentPackage.js';

export class IntentCompiler {
  /**
   * Parse raw prompt or form inputs into an immutable IntentPackage.
   * 
   * @param {string|Object} rawInput - User prompt string or form data object
   * @returns {IntentPackage}
   */
  static compile(rawInput = {}) {
    const input = typeof rawInput === 'string' ? { prompt: rawInput } : rawInput;

    const promptText = input.prompt || input.primaryIdea || input.archetype || '';
    const format = input.format || 'Standard';

    // Parse color identity from input or prompt text
    let colors = Array.isArray(input.colors) ? input.colors : [];
    if (colors.length === 0) {
      colors = IntentCompiler._extractColorsFromText(promptText);
    }
    if (colors.length === 0) {
      // Default to mono-white or colorless if unspecified
      colors = ['W'];
    }

    // Parse primary tribe from input or prompt text
    let primaryTribe = input.tribe || input.primaryTribe || null;
    if (!primaryTribe) {
      primaryTribe = IntentCompiler._extractTribeFromText(promptText);
    }

    // Parse tempo / strategy speed
    let tempo = input.tempo || input.archetype || 'Aggro';
    if (promptText.toLowerCase().includes('control')) tempo = 'Control';
    else if (promptText.toLowerCase().includes('midrange')) tempo = 'Midrange';
    else if (promptText.toLowerCase().includes('combo')) tempo = 'Combo';
    else if (promptText.toLowerCase().includes('ramp')) tempo = 'Ramp';
    else if (promptText.toLowerCase().includes('aggro') || promptText.toLowerCase().includes('fast')) tempo = 'Aggro';

    // Build explicit mustNot rules (e.g., exclude Green/Ramp if user asked for Boros Humans)
    const mustNotRules = Array.isArray(input.mustNotRules) ? [...input.mustNotRules] : [];
    if (colors.length > 0 && !colors.includes('G')) {
      mustNotRules.push('Llanowar Elves', 'Elvish Mystic', 'Birds of Paradise', 'Mono Green Devotion', 'Selesnya CoCo');
    }

    const mustRules = Array.isArray(input.mustRules) ? [...input.mustRules] : [];
    if (primaryTribe) {
      mustRules.push(`tribe == ${primaryTribe}`);
    }

    const preferRules = Array.isArray(input.preferRules) ? [...input.preferRules] : [
      'curve <= 3',
      'turn <= 5'
    ];

    return new IntentPackage({
      prompt: promptText,
      format,
      colors,
      primaryTribe,
      tempo,
      mustRules,
      mustNotRules,
      preferRules
    });
  }

  /**
   * Helper to extract color identities from prompt text.
   * @private
   */
  static _extractColorsFromText(text = '') {
    const t = text.toLowerCase();
    const colors = [];

    if (t.includes('boros') || (t.includes('red') && t.includes('white'))) {
      return ['R', 'W'];
    }
    if (t.includes('selesnya') || (t.includes('green') && t.includes('white'))) {
      return ['G', 'W'];
    }
    if (t.includes('azorius') || (t.includes('blue') && t.includes('white'))) {
      return ['U', 'W'];
    }
    if (t.includes('dimir') || (t.includes('blue') && t.includes('black'))) {
      return ['U', 'B'];
    }
    if (t.includes('rakdos') || (t.includes('black') && t.includes('red'))) {
      return ['B', 'R'];
    }
    if (t.includes('gruul') || (t.includes('red') && t.includes('green'))) {
      return ['R', 'G'];
    }
    if (t.includes('orzhov') || (t.includes('white') && t.includes('black'))) {
      return ['W', 'B'];
    }
    if (t.includes('golgari') || (t.includes('black') && t.includes('green'))) {
      return ['B', 'G'];
    }
    if (t.includes('simic') || (t.includes('blue') && t.includes('green'))) {
      return ['U', 'G'];
    }
    if (t.includes('izzet') || (t.includes('blue') && t.includes('red'))) {
      return ['U', 'R'];
    }

    if (t.includes('white')) colors.push('W');
    if (t.includes('blue')) colors.push('U');
    if (t.includes('black')) colors.push('B');
    if (t.includes('red')) colors.push('R');
    if (t.includes('green')) colors.push('G');

    return colors;
  }

  /**
   * Helper to extract primary tribe from prompt text.
   * @private
   */
  static _extractTribeFromText(text = '') {
    const t = text.toLowerCase();
    const knownTribes = ['human', 'humans', 'elf', 'elves', 'goblin', 'goblins', 'merfolk', 'vampire', 'vampires', 'dragon', 'dragons', 'zombie', 'zombies', 'knight', 'knights'];
    
    for (const tribe of knownTribes) {
      if (t.includes(tribe)) {
        // Normalize singular
        if (tribe.endsWith('s') && tribe !== 'human' && tribe !== 'process') {
          return tribe.slice(0, -1);
        }
        if (tribe === 'humans') return 'Human';
        if (tribe === 'elves') return 'Elf';
        if (tribe === 'goblins') return 'Goblin';
        if (tribe === 'vampires') return 'Vampire';
        if (tribe === 'dragons') return 'Dragon';
        if (tribe === 'zombies') return 'Zombie';
        if (tribe === 'knights') return 'Knight';
        return tribe.charAt(0).toUpperCase() + tribe.slice(1);
      }
    }

    return null;
  }
}
