import { ProviderRegistry } from '../../src/knowledge/providers/ProviderRegistry.js';

console.log('=== TEST: Dynamic ProviderRegistry ===');

const registry = ProviderRegistry.getInstance();

const mockProvider = {
  name: 'TestMockProvider',
  initialize: async () => true
};

registry.register(mockProvider);

const retrieved = registry.get('TestMockProvider');
console.log(`[PASS] Provider Registered & Retrieved: ${retrieved.name}`);

if (!retrieved) {
  console.error('FAILED: Could not retrieve registered provider');
  process.exit(1);
}

const list = registry.list();
console.log(`[PASS] Total Providers Registered: ${list.length}`);

console.log('=== TEST SUCCESSFUL ===');
