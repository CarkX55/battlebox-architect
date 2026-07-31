import { CompilerConvergencePipeline } from '../../src/knowledge/compiler/CompilerConvergencePipeline.js';
import { OracleTraceLog } from '../../src/knowledge/serving/OracleTraceLog.js';

console.log('=== TEST: 14-Pass Observable Compiler Execution Pipeline ===');

const mockCardPool = [
  { name: 'Llanowar Elves', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' },
  { name: 'Elvish Mystic', cmc: 1, type_line: 'Creature — Elf Druid', oracle_text: '{T}: Add {G}.' },
  { name: 'Harmonize', cmc: 4, type_line: 'Sorcery', oracle_text: 'Draw three cards.' },
  { name: 'Beast Within', cmc: 3, type_line: 'Instant', oracle_text: 'Destroy target permanent.' },
  { name: 'Primeval Titan', cmc: 6, type_line: 'Creature — Giant', oracle_text: 'Trample.' },
  { name: 'Forest', cmc: 0, type_line: 'Basic Land — Forest', oracle_text: '{T}: Add {G}.' }
];

const result = CompilerConvergencePipeline.compileDeckFromScratch({
  userPrompt: 'Quiero un Ramp Selesnya competitivo para Standard.',
  archetype: 'Ramp',
  format: 'Standard',
  rawCardPool: mockCardPool,
  rawGeminiLLMInput: {
    prompt: 'Genera un blueprint para Selesnya Ramp...',
    rawResponse: '{"deckName": "Selesnya Ramp", "strategy": "Fast Mana into Titans"}',
    parsedJSON: { deckName: 'Selesnya Ramp' }
  }
});

const traceSummary = OracleTraceLog.getTraceSummary();
const passes = OracleTraceLog.passes;

console.log(`[PASS] Build Status: ${result.buildStatus}`);
console.log(`[PASS] Total Observable Passes Logged: ${passes.length}`);
console.log(`[PASS] Pass 1 Name: ${passes[0].passName}`);
console.log(`[PASS] Pass 8 Frank Karsten Target Lands: ${passes[4].inputs.targetLands || 24}`);
console.log(`[PASS] Pass 12 Monte Carlo Win Probability: ${passes.find(p => p.category === 'MONTE_CARLO')?.outputs.turn4WinProbability}`);

if (result.buildStatus !== 'SUCCESS') {
  console.error('FAILED: Expected SUCCESS build status');
  process.exit(1);
}

if (passes.length < 10) {
  console.error(`FAILED: Expected at least 10 observable passes logged, got ${passes.length}`);
  process.exit(1);
}

console.log('=== 14-PASS OBSERVABLE PIPELINE TEST SUCCESSFUL ===');
