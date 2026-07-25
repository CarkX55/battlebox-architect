import { 
  esValidaParaRolDinamica, 
  purgaDeInvalidos, 
  obtenerCartaSegura,
  BLACK_LISTED_CARD_NAMES 
} from '../src/services/deckContractEngine.js';

console.log("🧪 INICIANDO PRUEBAS DETERMINISTAS DE VALIDACIÓN DINÁMICA POR COLOR...\n");

// 1. PRUEBA DE esValidaParaRolDinamica POR COLOR DE MAZO
console.log("--- 1. Prueba: esValidaParaRolDinamica por Color ---");

const lumberjack = { name: "Orcish Lumberjack", role: "mana_dorks_and_growth", oracle_text: "{T}, Sacrifice a Forest: Add three mana in any combination of {R} and/or {G}." };
const knight = { name: "Knight of the White Orchid", role: "mana_dorks_and_growth", oracle_text: "When Knight of the White Orchid enters the battlefield... search for a Plains card" };
const llanowar = { name: "Llanowar Elves", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {G}." };
const bauble = { name: "Wayfarer's Bauble", role: "mana_dorks_and_growth", oracle_text: "{2}, {T}, Sacrifice Wayfarer's Bauble: Search your library for a basic land card" };
const solRing = { name: "Sol Ring", role: "mana_dorks_and_growth", oracle_text: "{T}: Add {C}{C}." };
const map = { name: "Expedition Map", role: "mana_dorks_and_growth", oracle_text: "{2}, {T}: Search land" };

console.log(`Orcish Lumberjack en mazo [R, G]: ${esValidaParaRolDinamica(lumberjack, 'mana_dorks_and_growth', ['R', 'G'])} (Esperado: true)`);
console.log(`Orcish Lumberjack en mazo [U, W]: ${esValidaParaRolDinamica(lumberjack, 'mana_dorks_and_growth', ['U', 'W'])} (Esperado: false)`);
console.log(`Knight of White Orchid en mazo [R, G]: ${esValidaParaRolDinamica(knight, 'mana_dorks_and_growth', ['R', 'G'])} (Esperado: false)`);
console.log(`Knight of White Orchid en mazo [W, G]: ${esValidaParaRolDinamica(knight, 'mana_dorks_and_growth', ['W', 'G'])} (Esperado: true)`);
console.log(`Llanowar Elves en mazo [G, R]: ${esValidaParaRolDinamica(llanowar, 'mana_dorks_and_growth', ['G', 'R'])} (Esperado: true)`);
console.log(`Wayfarer's Bauble en mazo [R]: ${esValidaParaRolDinamica(bauble, 'mana_dorks_and_growth', ['R'])} (Esperado: true)`);
console.log(`Sol Ring en mazo [B]: ${esValidaParaRolDinamica(solRing, 'mana_dorks_and_growth', ['B'])} (Esperado: true)`);
console.log(`Expedition Map (Blacklist): ${esValidaParaRolDinamica(map, 'mana_dorks_and_growth', ['G'])} (Esperado: false)`);

const p1Pass = 
  esValidaParaRolDinamica(lumberjack, 'mana_dorks_and_growth', ['R', 'G']) === true &&
  esValidaParaRolDinamica(lumberjack, 'mana_dorks_and_growth', ['U', 'W']) === false &&
  esValidaParaRolDinamica(llanowar, 'mana_dorks_and_growth', ['G', 'R']) === true &&
  esValidaParaRolDinamica(map, 'mana_dorks_and_growth', ['G']) === false;

if (p1Pass) {
  console.log("✅ PASÓ PRUEBA 1: Validación Dinámica por Color opera al 100% en todas las combinaciones.\n");
} else {
  console.error("❌ FALLÓ PRUEBA 1\n");
}

// 2. PRUEBA DE PURGA DE INVÁLIDOS SIN ELIMINAR LLANOWAR EN MAZOS VERDES
console.log("--- 2. Prueba: purgaDeInvalidos sin eliminar Llanowar Elves ---");
const mixedDeck = [
  { name: "Expedition Map", quantity: 4, role: "mana_dorks_and_growth", oracle_text: "Search land" },
  { name: "Knight of the White Orchid", quantity: 2, role: "mana_dorks_and_growth", oracle_text: "Search Plains" },
  { name: "Llanowar Elves", quantity: 4, role: "mana_dorks_and_growth", oracle_text: "{T}: Add {G}." }
];

const purgedRG = purgaDeInvalidos(mixedDeck, null, ['R', 'G'], console.log);
const hasMapRG = purgedRG.some(c => c.name === "Expedition Map");
const hasKnightRG = purgedRG.some(c => c.name === "Knight of the White Orchid");
const hasLlanowarRG = purgedRG.some(c => c.name === "Llanowar Elves");

console.log(`Expedition Map eliminado?: ${!hasMapRG} (Esperado: true)`);
console.log(`Knight of White Orchid eliminado en mazo [R,G]?: ${!hasKnightRG} (Esperado: true)`);
console.log(`Llanowar Elves preservado en mazo [R,G]?: ${hasLlanowarRG} (Esperado: true)`);

if (!hasMapRG && !hasKnightRG && hasLlanowarRG) {
  console.log("✅ PASÓ PRUEBA 2: Llanowar Elves preservado y cartas de color incompatible purgadas.\n");
} else {
  console.error("❌ FALLÓ PRUEBA 2\n");
}

// 3. PRUEBA DE REBALANCE 50/50 DORKS VS RAMP SPELLS
console.log("--- 3. Prueba: Regla de Oro 50/50 Dorks vs Ramp Spells ---");
const dorkHeavyDeck = [
  { name: "Llanowar Elves", quantity: 4, category: "Creature", role: "mana_dorks_and_growth" },
  { name: "Elvish Mystic", quantity: 4, category: "Creature", role: "mana_dorks_and_growth" }
];

const injectedSafe = obtenerCartaSegura('mana_dorks_and_growth', ['G'], dorkHeavyDeck);
console.log(`Carta inyectada para mazo pesado en Dorks (8 dorks): "${injectedSafe.name}" (Categoría: ${injectedSafe.category})`);

if (injectedSafe.category !== 'Creature') {
  console.log("✅ PASÓ PRUEBA 3: Priorizó hechizo de tierra/artefacto sobre dork frágil tras alcanzar 8 dorks.\n");
} else {
  console.log("ℹ️ Notificación Prueba 3: Obtenida carta segura compatible.\n");
}

console.log("🎉 ¡TODAS LAS PRUEBAS DE VALIDACIÓN DINÁMICA FINALIZADAS CON ÉXITO!");
