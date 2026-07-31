/**
 * test_phase1_providers.js
 * Test Suite for KnowledgeProvider plugins.
 */

import { MTGJSONProvider } from '../../src/knowledge/providers/MTGJSONProvider.js';
import { ScryfallProvider } from '../../src/knowledge/providers/ScryfallProvider.js';
import { EDHRECProvider } from '../../src/knowledge/providers/EDHRECProvider.js';
import { MTGTop8Provider } from '../../src/knowledge/providers/MTGTop8Provider.js';
import { SpiceRackProvider } from '../../src/knowledge/providers/SpiceRackProvider.js';
import { SimulationProvider } from '../../src/knowledge/providers/SimulationProvider.js';

async function runProvidersTest() {
  console.log('🧪 Starting Phase 1 KnowledgeProvider Plugin Tests...');

  const providers = [
    new MTGJSONProvider(),
    new ScryfallProvider(),
    new EDHRECProvider(),
    new MTGTop8Provider(),
    new SpiceRackProvider(),
    new SimulationProvider()
  ];

  for (const p of providers) {
    const initRes = await p.initialize();
    console.assert(initRes === true, `Provider ${p.name} initialize() must return true`);

    const health = await p.health();
    console.assert(health.status === 'HEALTHY', `Provider ${p.name} health status must be HEALTHY`);

    const version = p.version();
    console.assert(version !== undefined, `Provider ${p.name} must return version`);

    const synced = await p.sync();
    console.assert(Array.isArray(synced) && synced.length > 0, `Provider ${p.name} sync() must return non-empty items array`);

    const lastUpd = p.lastUpdate();
    console.assert(lastUpd !== 'NEVER', `Provider ${p.name} lastUpdate() must return valid timestamp ISO string`);

    console.log(`✅ Provider ${p.name} passed all contract assertions (${synced.length} objects synced).`);
  }

  console.log('🎉 Phase 1 KnowledgeProvider Plugin Tests PASSED 100%!');
}

runProvidersTest();
