import { aplicarJuezFinal } from '../src/services/deckArchitectService.js';

function runJuezTest() {
  console.log("🧪 --- TESTING APLICAR JUEZ FINAL (Pilar 4: Ratio & roles) ---");

  const colors = ["U", "G"];
  const deckResult = {
    cards: [
      // Land
      { name: "Misty Rainforest", category: "Land", quantity: 4 },
      { name: "Tropical Island", category: "Land", quantity: 4 },
      { name: "Island", category: "Land", quantity: 8 },
      { name: "Forest", category: "Land", quantity: 8 },
      
      // Threats (Finisher, etc)
      { name: "The Watcher in the Water", category: "Creature", cmc: 5, role: "finisher_control", quantity: 4 },
      { name: "Tarmogoyf", category: "Creature", cmc: 2, role: "threat", quantity: 4 },
      { name: "Ice-Fang Coatl", category: "Creature", cmc: 2, role: "threat_utility", quantity: 4 },
      
      // Answers
      { name: "Counterspell", category: "Instant", cmc: 2, role: "removal_and_interaction", quantity: 4 },
      { name: "Spell Pierce", category: "Instant", cmc: 1, role: "removal_and_interaction", quantity: 4 },
      { name: "Force of Will", category: "Instant", cmc: 5, role: "removal_and_interaction", quantity: 4 },
      { name: "Subtlety", category: "Creature", cmc: 4, role: "removal_and_interaction", quantity: 4 },
      { name: "Brainstorm", category: "Instant", cmc: 1, role: "enablers", quantity: 4 },
      { name: "Ponder", category: "Sorcery", cmc: 1, role: "enablers", quantity: 4 },
      { name: "Preordain", category: "Sorcery", cmc: 1, role: "enablers", quantity: 4 }
    ]
  };

  const dnaData = {};
  const formData = {
    archetype: 'control',
    colores: colors,
    tribe: 'none'
  };

  const logTrace = [];
  const addLog = (msg) => logTrace.push(msg);

  console.log("Input non-land spells:", deckResult.cards.filter(c => c.category !== 'Land').reduce((sum, c) => sum + c.quantity, 0));
  console.log("Input threats count:", deckResult.cards.filter(c => c.category !== 'Land' && (c.category === 'Creature' || c.role?.includes('threat') || c.role?.includes('finisher'))).reduce((sum, c) => sum + c.quantity, 0));

  const balancedResult = aplicarJuezFinal(deckResult, dnaData, formData, addLog);
  const balancedDeck = balancedResult.cards;
  
  console.log("\nOutput balanced deck spell list:");
  let totalSpells = 0;
  let threatsCount = 0;
  balancedDeck.forEach(c => {
    if (c.category !== 'Land') {
      totalSpells += c.quantity;
      const isThreat = c.category === 'Creature' || c.role?.includes('threat') || c.role?.includes('finisher');
      if (isThreat) threatsCount += c.quantity;
      console.log(`- ${c.quantity}x ${c.name} (${c.role}) ${isThreat ? '🔥' : '🛡️'}`);
    }
  });

  console.log(`\nResults:`);
  console.log(`Total non-land spells: ${totalSpells} (Expected: 36)`);
  console.log(`Threats count: ${threatsCount} (~9 copias de 36 spells = 25% target)`);
  console.log(`The Watcher in the Water quantity:`, balancedDeck.find(c => c.name === "The Watcher in the Water")?.quantity || 0, "(Expected: 4 copies preserved because of esRolProtegido)");

  // Let's print logs
  console.log("\n--- Juez Logs ---");
  logTrace.forEach(line => console.log(">", line));
}

runJuezTest();
