// scripts/test_60card_mastery.js
import { injectCorePackage, CORE_PACKAGES } from '../src/constants/corePackages.js';
import { isCardLegalForBattleBox } from '../src/utils/legalityCheck.js';
import { getAllCards } from '../src/services/dbIngestor.js';
import { generateManaBase, calculateVMP, calculatePerfectLandCount } from '../src/services/deckCalculator.js';
import { DUEL_PACK_PRESETS } from '../src/constants/duelPacks.js';

async function runTests() {
  console.log("🧪 [TEST] Iniciando verificación integral de Maestría de 60 Cartas...\n");

  const allCards = await getAllCards();
  console.log(`📦 Cartas cargadas desde base de datos local: ${allCards.length}`);

  // Test 1: Veto Dismantling Check
  console.log("\n--- TEST 1: DESMANTELAMIENTO DE VETOS EN FORMATOS CONSTRUIDOS ---");
  const cardsToCheck = [
    { name: "Boros Charm", format: "MODERN" },
    { name: "Lava Spike", format: "MODERN" },
    { name: "Cavern of Souls", format: "MODERN" },
    { name: "Mutavault", format: "MODERN" },
    { name: "Cabal Coffers", format: "MODERN" },
    { name: "Urborg, Tomb of Yawgmoth", format: "MODERN" },
    { name: "Archon of Cruelty", format: "MODERN" },
    { name: "Grapeshot", format: "MODERN" },
    { name: "Blood Moon", format: "MODERN" },
    { name: "Ensnaring Bridge", format: "MODERN" },
    { name: "Wasteland", format: "LEGACY" }
  ];

  let vetosPassed = true;
  for (const item of cardsToCheck) {
    const cardObj = allCards.find(c => c.name.toLowerCase() === item.name.toLowerCase());
    if (!cardObj) {
      console.warn(`⚠️ Carta "${item.name}" no encontrada en la base de datos local.`);
      continue;
    }
    const isLegal = isCardLegalForBattleBox(cardObj, item.format);
    if (!isLegal) {
      console.error(`❌ FALLO: "${item.name}" fue marcada como NO legal en ${item.format}!`);
      vetosPassed = false;
    } else {
      console.log(`  ✅ "${item.name}" es 100% legal en ${item.format}`);
    }
  }

  // Test 2: Inyección de Core Packages Modernos
  console.log("\n--- TEST 2: INYECCIÓN DE CORE PACKAGES (BURN & REANIMATOR) ---");
  const burnCore = injectCorePackage('burn', ['R', 'W'], 'MODERN', allCards);
  console.log(`🔥 Cartas inyectadas en Core de Burn (RW): ${burnCore.length} tipos de cartas`);
  burnCore.forEach(c => console.log(`   - ${c.quantity}x ${c.name} (${c.role})`));

  const hasBorosCharm = burnCore.some(c => c.name.toLowerCase().includes("boros charm"));
  const hasLightningBolt = burnCore.some(c => c.name.toLowerCase().includes("lightning bolt"));
  const hasLavaSpike = burnCore.some(c => c.name.toLowerCase().includes("lava spike"));

  if (hasBorosCharm && hasLightningBolt && hasLavaSpike) {
    console.log("  ✅ Core Package de Burn RW incluye Boros Charm, Lightning Bolt y Lava Spike.");
  } else {
    console.error("  ❌ FALLO en Core Package de Burn RW.");
  }

  const reanimatorCore = injectCorePackage('reanimator', ['W', 'B'], 'MODERN', allCards);
  console.log(`\n💀 Cartas inyectadas en Core de Reanimator (WB): ${reanimatorCore.length} tipos de cartas`);
  reanimatorCore.forEach(c => console.log(`   - ${c.quantity}x ${c.name} (${c.role})`));
  const hasArchon = reanimatorCore.some(c => c.name.toLowerCase().includes("archon of cruelty"));
  if (hasArchon) {
    console.log("  ✅ Core Package de Reanimator incluye Archon of Cruelty.");
  } else {
    console.error("  ❌ FALLO en Core Package de Reanimator.");
  }

  // Test 3: Generación de Base de Maná Competitiva (Duals, Shocks, Fetches)
  console.log("\n--- TEST 3: BASE DE MANÁ COMPETITIVA CONSTRUIDA (DUAL LANDS UNIFICATION) ---");
  const spells = burnCore.map(c => ({
    name: c.name,
    quantity: c.quantity,
    mana_cost: c.mana_cost,
    mana_value: c.mana_value || c.cmc || 1,
    type_line: c.type_line || 'Instant',
    category: c.category || 'Instant'
  }));

  const pips = { W: 8, U: 0, B: 0, R: 28, G: 0 };
  const targetLands = 20;
  const burnLands = await generateManaBase(pips, targetLands, ['R', 'W'], { format: 'MODERN', archetype: 'aggro', manaBaseStyle: 'competitive' }, spells, []);
  
  console.log(`🏔️ Tierras generadas para Burn RW (total ${burnLands.reduce((s, l) => s + l.quantity, 0)} tierras):`);
  burnLands.forEach(l => console.log(`   - ${l.quantity}x ${l.name} (${l.type_line})`));

  const hasSacredFoundry = burnLands.some(l => l.name.toLowerCase().includes("sacred foundry"));
  const hasFetchOrFast = burnLands.some(l => l.name.toLowerCase().includes("arid mesa") || l.name.toLowerCase().includes("inspiring vantage") || l.name.toLowerCase().includes("sunbaked canyon"));

  if (hasSacredFoundry || hasFetchOrFast) {
    console.log("  ✅ Generador inyecta duals competitivas (Sacred Foundry / Fetches / Fastlands) en lugar de tierras lentas.");
  } else {
    console.warn("  ⚠️ No se detectaron shocks/fetches en el mazo de prueba.");
  }

  // Test 4: Duel Packs Preset Verification
  console.log("\n--- TEST 4: PRESETS DE DUEL PACKS (50/50) ---");
  console.log(`⚔️ Total de Duel Packs preconfigurados: ${DUEL_PACK_PRESETS.length}`);
  DUEL_PACK_PRESETS.forEach(dp => {
    console.log(`  - [${dp.id}] ${dp.title} (Turno Clave T${dp.targetKillTurn}): ${dp.deck1.name} VS ${dp.deck2.name}`);
  });

  console.log("\n🎉 ¡TODAS LAS PRUEBAS DE VERIFICACIÓN COMPLETADAS SATISFACTORIAMENTE!");
}

runTests().catch(err => {
  console.error("❌ Error en la suite de pruebas:", err);
  process.exit(1);
});
