import { obtenerCartaSegura, purgaDeInvalidos } from '../src/services/deckContractEngine.js';

console.log("🧪 PROBANDO MAZO AZORIUS (U/W) TEMPO Y OBTENCIÓN DE CARTAS DE SEGURIDAD...\n");

const uCards = obtenerCartaSegura('protection_and_interaction', ['U', 'W'], []);
console.log(`Carta de Interacción Segura obtenida para Azorius (U/W): "${uCards.name}" (${uCards.category})`);

const drawCards = obtenerCartaSegura('card_advantage_draw', ['U', 'W'], []);
console.log(`Carta de Robar Segura obtenida para Azorius (U/W): "${drawCards.name}" (${drawCards.category})`);

const testDeck = [
  { name: "Expedition Map", quantity: 2, role: "mana_dorks_and_growth", oracle_text: "Search land" },
  { name: "Counterspell", quantity: 4, role: "protection_and_interaction", oracle_text: "Counter target spell." }
];

const purgedAzorius = purgaDeInvalidos(testDeck, null, ['U', 'W'], console.log);
console.log("Mazo Azorius tras purga:", purgedAzorius.map(c => `${c.quantity}x ${c.name}`));

console.log("\n✅ MAZO AZORIUS PROBADO SIN NINGÚN ERROR!");
