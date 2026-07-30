/**
 * tests/judge/test_assembler_context_ranking.js
 * Verification test for local ContextScore selection and per-slot audit logging.
 */

import { createStrategicSession } from '../../src/models/strategicState.js';
import { composeDynamicBlueprint } from '../../src/services/strategicEngineComposer.js';
import { assembleDeckInSession } from '../../src/services/hybridAssemblerService.js';

async function testAssemblerContextRanking() {
  console.log('🧪 Testing Assembler Local ContextScore Selection...');

  const session = createStrategicSession({
    userPrompt: 'Mazo de Muros y Defensores (walls - arcades combo) Control',
    colors: ['W', 'U', 'G'],
    strategicArchetype: 'Control'
  });

  const candidatePool = [
    {
      name: 'Three Steps Ahead',
      type_line: 'Instant',
      oracle_text: 'Choose one or more — Counter target spell; or Create a token; or Draw two cards.',
      mana_value: 3,
      colors: ['U'],
      score: 1800 // High global score
    },
    {
      name: 'Avengers Assemble!',
      type_line: 'Enchantment',
      oracle_text: 'Heroes you control get +2/+2. Draw a card.',
      mana_value: 5,
      colors: ['W'],
      score: 1500
    },
    {
      name: 'The Endstone',
      type_line: 'Legendary Artifact',
      oracle_text: 'Whenever you play a land, draw a card. Life becomes half.',
      mana_value: 7,
      colors: [],
      score: 1400
    },
    {
      name: 'Wall of Omens',
      type_line: 'Creature — Wall',
      oracle_text: 'Defender. When Wall of Omens enters the battlefield, draw a card.',
      mana_value: 2,
      colors: ['W'],
      score: 850 // Moderate global score
    },
    {
      name: 'Overgrown Battlement',
      type_line: 'Creature — Wall',
      oracle_text: 'Defender. {T}: Add {G} for each creature with defender you control.',
      mana_value: 2,
      colors: ['G'],
      score: 900
    },
    {
      name: 'High Alert',
      type_line: 'Enchantment',
      oracle_text: 'Each creature you control assigns combat damage equal to its toughness rather than its power.',
      mana_value: 3,
      colors: ['W', 'U'],
      score: 1100
    },
    {
      name: 'Counterspell',
      type_line: 'Instant',
      oracle_text: 'Counter target spell.',
      mana_value: 2,
      colors: ['U'],
      score: 1200
    }
  ];

  const engineGraph = {
    nodes: [
      { id: 'token_engine', type: 'primary', label: 'Masa Temprana de Muros', capabilities: ['EarlyDefender'] },
      { id: 'anthem_engine', type: 'primary', label: 'Habilitadores & Payoffs', capabilities: ['DefenderPayoff'] },
      { id: 'draw_engine', type: 'support', label: 'Robo de Cartas', capabilities: ['DefenderCardDraw'] },
      { id: 'removal_engine', type: 'support', label: 'Interacción', capabilities: ['Interaction'] }
    ]
  };

  const blueprint = composeDynamicBlueprint(session, engineGraph);
  session.working.blueprint = blueprint;

  // Execute assembler
  assembleDeckInSession(session, candidatePool, []);

  const assembledDeck = session.working.currentDeck;
  console.log('\n================================================');
  console.log('📦 MAZO RESULTANTE ENSAMBLADO (60 CARTAS):');
  console.log('================================================');
  assembledDeck.forEach(c => {
    console.log(` - ${c.name} (${c.quantity}x)`);
  });

  const wallOfOmensInDeck = assembledDeck.some(c => c.name === 'Wall of Omens');
  const highAlertInDeck = assembledDeck.some(c => c.name === 'High Alert');
  const avengersInDeck = assembledDeck.some(c => c.name === 'Avengers Assemble!');

  if (wallOfOmensInDeck && highAlertInDeck && !avengersInDeck) {
    console.log('\n🎉 TEST EXITOSO: El ensamblador seleccionó por ContextScore Local! Wall of Omens y High Alert superaron a cartas con mayor score global.');
  } else {
    throw new Error('Test fallido: El ensamblador no seleccionó por ContextScore correctamente.');
  }
}

testAssemblerContextRanking().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
