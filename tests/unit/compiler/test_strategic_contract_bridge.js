/**
 * tests/unit/compiler/test_strategic_contract_bridge.js
 * 
 * Verifies that IntentBuilder and StrategicContractBridge correctly compile
 * declarative intent into formal strategic contracts (Step 5 Preview).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import { IntentBuilder } from '../../../src/services/compiler/core/intentBuilder.js';
import { StrategicContractBridge } from '../../../src/services/compiler/core/strategicContractBridge.js';

test('StrategicContractBridge: compiles valid StrategicContractPreview from UI form state', () => {
  const uiState = {
    format: 'STANDARD',
    colors: ['R', 'B'],
    archetype: 'aggro',
    tribe: 'Goblin',
    archetypePreferences: {
      speed: 'EXPLOSIVE',
      damagePlan: 'MIXED',
      reachPriority: 'HIGH',
      resilience: 'BALANCED'
    },
    intentPriorities: {
      competitiveVsTheme: 0.9,
      tribeVsSynergy: 0.85,
      innovationVsConsistency: 0.15
    },
    tripartiteConstraints: {
      hard: ['tribe == Goblin'],
      preferred: ['Reckless Lackey', 'Goblin Guide'],
      open: true
    },
    thesisRefutationPolicy: 'REFORMULATE_IF_BETTER'
  };

  const intent = IntentBuilder.buildFromUI(uiState);
  assert.equal(intent.format, 'STANDARD');
  assert.equal(intent.primaryTribe, 'Goblin');
  assert.equal(intent.tempo, 'aggro');
  assert.equal(intent.isOpenStrategy, false);
  assert.equal(intent.archetypePreferences.speed, 'EXPLOSIVE');
  assert.equal(intent.intentPriorities.competitiveVsTheme, 0.9);
  assert.equal(intent.thesisRefutationPolicy, 'REFORMULATE_IF_BETTER');

  const contract = StrategicContractBridge.buildStrategicContractPreview(intent);
  assert.ok(contract.thesis, 'Thesis must be defined');
  assert.match(contract.thesis.title, /Goblin/i);
  assert.ok(contract.winPath.length >= 4, 'WinPath must have at least 4 causal steps');
  assert.ok(contract.proofObligations.length >= 4, 'Proof obligations must be present');
  assert.equal(contract.proofObligations[0].status, 'SUPPORTED');
  assert.ok(contract.alternatives.length >= 2, 'Alternatives must be evaluated');
  assert.equal(contract.thesisRefutationPolicy, 'REFORMULATE_IF_BETTER');

  console.log('✅ StrategicContractBridge compiled contract successfully:');
  console.log(`   - Thesis: ${contract.thesis.title}`);
  console.log(`   - Expected Kill Turn: T${contract.thesis.expectedKillTurn}`);
  console.log(`   - WinPath Steps: ${contract.winPath.length}`);
  console.log(`   - Proof Obligations: ${contract.proofObligations.map(p => p.id).join(', ')}`);
});

test('StrategicContractBridge: handles Open Strategy discovery cleanly', () => {
  const uiState = {
    format: 'MODERN',
    colors: ['U', 'R'],
    isOpenStrategy: true
  };

  const intent = IntentBuilder.buildFromUI(uiState);
  assert.equal(intent.isOpenStrategy, true);

  const contract = StrategicContractBridge.buildStrategicContractPreview(intent);
  assert.match(contract.thesis.title, /Descubrimiento Estratégico/i);
  assert.ok(contract.winPath.length >= 3);
  console.log('✅ Open Strategy contract verified successfully');
});

test('StrategicContractBridge: compiles tailored Sea Monsters Ramp contract with bespoke alternatives', () => {
  const uiState = {
    format: 'MODERN',
    colors: ['U', 'G'],
    archetype: 'ramp',
    tribe: '🌊 Terrores Marinos (Tritones, Krakens, Leviatanes)',
    strategy: 'big mana'
  };

  const intent = IntentBuilder.buildFromUI(uiState);
  assert.equal(intent.primaryTribe, 'Sea_monsters');
  assert.equal(intent.tempo, 'ramp');

  const contract = StrategicContractBridge.buildStrategicContractPreview(intent);
  assert.ok(contract.thesis, 'Thesis must be defined');
  assert.match(contract.thesis.title, /Terrores Marinos/i);
  assert.equal(contract.thesis.expectedKillTurn, 6);

  // WinPath for Ramp
  assert.equal(contract.winPath[0].label, 'Setup & Aceleración');
  assert.equal(contract.winPath[2].label, 'Despliegue de Amenazas Colosales');

  // Proof obligations for Ramp
  const obligationIds = contract.proofObligations.map(p => p.id);
  assert.ok(obligationIds.includes('T1_T2_RAMP'));
  assert.ok(obligationIds.includes('TRIBAL_OR_COLOSSAL_DENSITY'));
  assert.ok(obligationIds.includes('INTERACTION_STABILIZATION'));
  assert.ok(obligationIds.includes('MANA_CONSISTENCY'));

  // Alternatives tailored to Sea Monsters Ramp
  assert.equal(contract.alternatives.length, 3);
  assert.equal(contract.alternatives[0].label, 'Ramp Oceánico de Terrores Marinos (Recomendada)');
  assert.equal(contract.alternatives[0].isRecommended, true);
  assert.equal(contract.alternatives[1].label, 'Tempo Oceánico & Rebote Asimétrico (Whelming Wave)');
  assert.equal(contract.alternatives[2].label, 'Midrange Tritones & Motores de Valor (Aesi/Kiora)');

  // Critical demands are tailored and NOT generic burn/reach
  assert.ok(contract.criticalDemands.some(d => d.includes('Krakens, Leviatanes')));
  assert.ok(!contract.criticalDemands.some(d => d.includes('reach')));

  console.log('✅ Sea Monsters Ramp contract compiled with tailored alternatives:');
  contract.alternatives.forEach(alt => console.log(`   - [${alt.isRecommended ? '★ REC' : '  ALT'}] ${alt.label} (${alt.speed})`));
});

test('StrategicContractBridge: compiles tailored Walls & Defenders Toughness Combat contract', () => {
  const uiState = {
    format: 'MODERN',
    colors: ['W', 'U', 'G'],
    archetype: 'midrange',
    tribe: 'Wall',
    mechanics: ['Toughness Matters', 'Defender'],
    strategy: 'Toughness combat'
  };

  const intent = IntentBuilder.buildFromUI(uiState);
  assert.equal(intent.primaryTribe, 'Wall');

  const contract = StrategicContractBridge.buildStrategicContractPreview(intent);
  assert.ok(contract.thesis, 'Thesis must be defined');
  assert.match(contract.thesis.title, /Muros/i);
  assert.match(contract.thesis.title, /Arcades/i);

  // WinPath for Walls
  assert.equal(contract.winPath[0].label, 'Despliegue de Muros & Aceleración');
  assert.equal(contract.winPath[1].label, 'Rampa de Defensores & Ventaja');
  assert.equal(contract.winPath[2].label, 'Activación de Combate por Resistencia');
  assert.equal(contract.winPath[3].label, 'Golpe Letal por Resistencia');

  // Proof obligations for Walls
  const obligationIds = contract.proofObligations.map(p => p.id);
  assert.ok(obligationIds.includes('TOUGHNESS_ENABLERS'), 'Must include TOUGHNESS_ENABLERS proof obligation');
  assert.ok(obligationIds.includes('WALL_DENSITY'), 'Must include WALL_DENSITY proof obligation');
  assert.ok(obligationIds.includes('DEFENDER_RAMP_DRAW'), 'Must include DEFENDER_RAMP_DRAW proof obligation');
  assert.ok(obligationIds.includes('MANA_CONSISTENCY'));

  // Alternatives tailored to Walls Toughness Combat
  assert.equal(contract.alternatives.length, 3);
  assert.match(contract.alternatives[0].label, /Arcades Toughness Beatdown/i);
  assert.equal(contract.alternatives[0].isRecommended, true);
  assert.match(contract.alternatives[1].label, /Defender Mana Combo/i);
  assert.match(contract.alternatives[2].label, /Wall Prison/i);

  // Critical demands are tailored to Arcades / Toughness enablers
  assert.ok(contract.criticalDemands.some(d => d.includes('Arcades') || d.includes('resistencia')));
  assert.ok(!contract.criticalDemands.some(d => d.includes('curva 5+ para rentabilizar la aceleración')));

  console.log('✅ Walls & Defenders Toughness Combat contract compiled successfully:');
  console.log(`   - Title: ${contract.thesis.title}`);
  contract.alternatives.forEach(alt => console.log(`   - [${alt.isRecommended ? '★ REC' : '  ALT'}] ${alt.label} (${alt.speed})`));
});


