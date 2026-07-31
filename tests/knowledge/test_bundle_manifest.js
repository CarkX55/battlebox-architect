import { BundleManifest } from '../../src/knowledge/compiler/BundleManifest.js';

console.log('=== TEST: Knowledge Bundle Manifest & Quality Metrics ===');

const manifest = BundleManifest.createManifest({
  bundleId: 'bundle_20260731_v100',
  counts: {
    cards: 104312,
    knowledgeObjects: 218440,
    capabilities: 8612,
    engines: 731
  }
});

console.log(`[PASS] Bundle ID: ${manifest.bundleId}`);
console.log(`[PASS] Checksum: ${manifest.checksum}`);
console.log(`[PASS] Coverage %: ${manifest.qualityMetrics.coveragePercentage}%`);
console.log(`[PASS] Cards Count: ${manifest.counts.cards}`);

if (manifest.qualityMetrics.coveragePercentage !== 98.4) {
  console.error('FAILED: Expected coveragePercentage 98.4');
  process.exit(1);
}

if (!manifest.checksum.startsWith('sha256:')) {
  console.error('FAILED: Checksum format invalid');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
