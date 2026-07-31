import { PackageInterface, PackageComposer } from '../../src/knowledge/compiler/PackageComposer.js';

console.log('=== TEST: PackageComposer & Package Interfaces ===');

const elfPackageInterface = new PackageInterface({
  id: 'pkg_elf_ramp',
  provides: 'cap.mana.acceleration',
  quantity: 2,
  turn: 1,
  colorRequirement: 'G'
});

const mockCards = [
  { name: 'Llanowar Elves', cmc: 1, oracleText: '{T}: Add {G}.' },
  { name: 'Elvish Mystic', cmc: 1, oracleText: '{T}: Add {G}.' },
  { name: 'Giant Growth', cmc: 1, oracleText: 'Target creature gets +3/+3.' }
];

const result = PackageComposer.composePackage(elfPackageInterface, mockCards);

console.log(`[PASS] Package ID: ${result.packageId}`);
console.log(`[PASS] Selected Cards Count: ${result.selectedCards.length}`);
console.log(`[PASS] Fulfillment Rate: ${result.fulfillmentRate * 100}%`);

if (result.selectedCards.length !== 2) {
  console.error('FAILED: Expected 2 selected cards');
  process.exit(1);
}

if (result.fulfillmentRate !== 1.0) {
  console.error('FAILED: Expected 100% fulfillment rate');
  process.exit(1);
}

console.log('=== TEST SUCCESSFUL ===');
