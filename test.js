import { generateManaBase } from './src/services/deckCalculator.js';
const pips = { B: 0, G: 0, R: 0, U: 30, W: 0 };
const formData = {
  archetype: 'control',
  strategy: 'General',
  colores: ['U', 'C'],
  tribe: 'Ninguna'
};
const aiUtils = ["Urza's Tower", "Urza's Mine", "Urza's Power Plant", "The Mycosynth Gardens"];
const res = generateManaBase(pips, 24, ['U', 'C'], formData, [], aiUtils);
console.log(res);
