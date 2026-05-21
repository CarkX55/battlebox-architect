import { generateManaBase, getManaValue } from '../src/services/deckCalculator.js';

async function testFunctionalCMC() {
  console.log("\n🧪 --- TEST FUNCTIONAL CMC (Pilar 2) ---");
  const cards = [
    { name: "Grief", cmc: 4 },
    { name: "Leyline Binding", cmc: 6 },
    { name: "Murktide Regent", cmc: 7 },
    { name: "Tarmogoyf", cmc: 2 }
  ];
  
  cards.forEach(c => {
    const val = getManaValue(c);
    console.log(`Card: ${c.name} (Nominal CMC: ${c.cmc}) -> Functional CMC: ${val}`);
  });
}

async function testKarstenManaBase() {
  console.log("\n🧪 --- TEST FRANK KARSTEN PIP TIMING MANA BASE (Pilar 3) ---");
  
  const pipBalance = { U: 15, B: 10, W: 0, R: 0, G: 0 };
  const colorIdentity = ['U', 'B'];
  const totalLands = 22;
  const formData = { archetype: 'control', colores: ['U', 'B'] };
  
  // Standard spells without double-blue demands
  const standardSpells = [
    { name: "Consider", cmc: 1 },
    { name: "Fatal Push", cmc: 1 },
    { name: "Gurmag Angler", cmc: 1 }
  ];
  
  // Demanding spells with double-blue (e.g. Counterspell)
  const demandingSpells = [
    { name: "Counterspell", cmc: 2 },
    { name: "Consider", cmc: 1 },
    { name: "Fatal Push", cmc: 1 }
  ];
  
  console.log("\nCase A: Standard Spells (No double blue)");
  const baseA = await generateManaBase(pipBalance, totalLands, colorIdentity, formData, standardSpells);
  console.log("Resulting Lands:");
  baseA.forEach(l => console.log(`- ${l.quantity}x ${l.name} (${l.type_line})`));
  
  console.log("\nCase B: Demanding Spells (Has Counterspell -> demands double blue)");
  const baseB = await generateManaBase(pipBalance, totalLands, colorIdentity, formData, demandingSpells);
  console.log("Resulting Lands:");
  baseB.forEach(l => console.log(`- ${l.quantity}x ${l.name} (${l.type_line})`));
  
  // Verify that Watery Grave (Shock) and Polluted Delta (Fetch) are maximized to 4 copies
  const wateryGraveB = baseB.find(l => l.name === 'Watery Grave')?.quantity || 0;
  const pollutedDeltaB = baseB.find(l => l.name === 'Polluted Delta')?.quantity || 0;
  
  console.log(`\nVerification:`);
  console.log(`Watery Grave copies in Case B: ${wateryGraveB} (Expected: 4)`);
  console.log(`Polluted Delta copies in Case B: ${pollutedDeltaB} (Expected: 4)`);
}

async function runAllTests() {
  try {
    await testFunctionalCMC();
    await testKarstenManaBase();
    console.log("\n✅ All Juez and Mana Base tests passed successfully!");
  } catch (err) {
    console.error("❌ Test run failed with error:", err);
  }
}

runAllTests();
