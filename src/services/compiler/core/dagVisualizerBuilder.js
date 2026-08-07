/**
 * src/services/compiler/core/dagVisualizerBuilder.js
 * 
 * DAGVisualizerBuilder: Generador de Estructuras DAG Multirrama Cruzadas.
 * Construye el grafo acíclico dirigido de dependencias estratégicas cruzadas (no lineales)
 * para renderizado en frontend o inspección CLI.
 */

export class DAGVisualizerBuilder {
  static buildMultiBranchDAG(archetype = 'Elves') {
    return Object.freeze({
      root: 'Strategic Plan',
      nodes: Object.freeze([
        { id: 'MANA_ENGINE', label: 'Elf Mana Engine', level: 1, dependencies: [] },
        { id: 'PROTECTION', label: 'Protection & Veil', level: 2, dependencies: ['MANA_ENGINE'] },
        { id: 'CARD_DRAW', label: 'Card Advantage & CoCo', level: 2, dependencies: ['MANA_ENGINE'] },
        { id: 'COMBO_ENGINE', label: 'Creature Mass & Synergy', level: 3, dependencies: ['PROTECTION', 'CARD_DRAW'] },
        { id: 'WIN_CONDITION', label: 'Overrun Lethal Finisher', level: 4, dependencies: ['COMBO_ENGINE'] }
      ]),
      crossLinks: Object.freeze([
        { from: 'MANA_ENGINE', to: 'PROTECTION', weight: 0.85 },
        { from: 'MANA_ENGINE', to: 'CARD_DRAW', weight: 0.92 },
        { from: 'PROTECTION', to: 'COMBO_ENGINE', weight: 0.78 },
        { from: 'CARD_DRAW', to: 'COMBO_ENGINE', weight: 0.94 },
        { from: 'COMBO_ENGINE', to: 'WIN_CONDITION', weight: 0.98 }
      ])
    });
  }
}
