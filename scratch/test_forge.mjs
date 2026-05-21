import { aplicarJuezFinal } from '../src/services/deckArchitectService.js';
import { MTG_STRATEGIES, MTG_TRIBES } from '../src/constants/legacyBattleBox.js';

console.log("=== INICIANDO VALIDACIÓN DEL JUEZ DE ESTADO FINAL DE 12 DIMENSIONES PRO TOUR ===");

const mockAddLog = (msg) => {
    console.log(`[TEST ORÁCULO LOG] ${msg}`);
};

const mockDnaData = {
    prioridad: "Eficiencia, consistencia en la curva, sinergias de juego justo y ventaja de cartas.",
    estilo: "Control de Controladores",
    regla_de_oro: "Nunca te quedes sin cartas en la mano ni dejes resolver amenazas clave."
};

const mockFormData = {
    archetype: 'control',
    strategy: 'control',
    tribe: 'none',
    colores: ['U', 'W', 'B'] // Esper / Azul-Blanco-Negro
};

// Generar una lista de cartas con potenciales fallos de las 12 dimensiones para ver cómo el juez las cura/corrige
const mockDeckResult = {
    cards: [
        // 1. Evoke pitch math deficit: Solitude sin suficientes cartas blancas
        { name: "Solitude", quantity: 4, category: "Creature", cmc: 5, role: "hybrid" },
        // Cartas blancas (menos de 14 copias)
        { name: "Esper Sentinel", quantity: 4, category: "Creature", cmc: 1, role: "threat" },
        
        // 2. Casting cost efficiency: cartas de cmc >= 5 no trampeables (ej. Ugin, the Spirit Dragon en un mazo de control normal)
        { name: "Ugin, the Spirit Dragon", quantity: 2, category: "Planeswalker", cmc: 8, role: "finishers" },
        
        // 3. Velocity check
        { name: "Preordain", quantity: 2, category: "Sorcery", cmc: 1, role: "cantrip" },
        
        // 4. Cartas Legacy prohibidas (ej. Animate Dead, Reanimate, etc.) que deben ser transmutadas
        { name: "Animate Dead", quantity: 2, category: "Enchantment", cmc: 2, role: "reanimation_spells" },
        
        // Otras cartas estándar de relleno
        { name: "Counterspell", quantity: 4, category: "Instant", cmc: 2, role: "interaction" },
        { name: "Fatal Push", quantity: 4, category: "Instant", cmc: 1, role: "interaction" },
        { name: "Snapcaster Mage", quantity: 4, category: "Creature", cmc: 2, role: "utility" },
        { name: "Teferi, Hero of Dominaria", quantity: 2, category: "Planeswalker", cmc: 5, role: "finishers" },
        { name: "Creeping Tar Pit", quantity: 4, category: "Land", cmc: 0 },
        { name: "Flooded Strand", quantity: 4, category: "Land", cmc: 0 },
        { name: "Polluted Delta", quantity: 4, category: "Land", cmc: 0 },
        { name: "Hallowed Fountain", quantity: 2, category: "Land", cmc: 0 },
        { name: "Watery Grave", quantity: 2, category: "Land", cmc: 0 },
        { name: "Island", quantity: 2, category: "Land", cmc: 0 },
        { name: "Plains", quantity: 2, category: "Land", cmc: 0 },
        { name: "Swamp", quantity: 2, category: "Land", cmc: 0 }
    ],
    sideboard: []
};

const mockRagPool = [
    { name: "Solitude", colors: ["W"], mana_value: 5 },
    { name: "Esper Sentinel", colors: ["W"], mana_value: 1 },
    { name: "Ugin, the Spirit Dragon", colors: [], mana_value: 8 },
    { name: "Preordain", colors: ["U"], mana_value: 1 },
    { name: "Animate Dead", colors: ["B"], mana_value: 2 },
    { name: "Counterspell", colors: ["U"], mana_value: 2 },
    { name: "Fatal Push", colors: ["B"], mana_value: 1 },
    { name: "Snapcaster Mage", colors: ["U"], mana_value: 2 },
    { name: "Teferi, Hero of Dominaria", colors: ["W", "U"], mana_value: 5 },
    { name: "Late to Dinner", colors: ["W"], mana_value: 4 },
    { name: "Persist", colors: ["B"], mana_value: 2 },
    { name: "Priest of Fell Rites", colors: ["W", "B"], mana_value: 2 }
];

console.log("Deck original antes de pasar por el Juez:");
mockDeckResult.cards.forEach(c => console.log(`- ${c.quantity}x ${c.name} (${c.role || 'no role'}, CMC: ${c.cmc})`));

console.log("\nEjecutando Juez Final...");
const result = aplicarJuezFinal(mockDeckResult, mockDnaData, mockFormData, mockAddLog, mockRagPool);

console.log("\nDeck resultante después de la auditoría:");
result.cards.forEach(c => console.log(`- ${c.quantity}x ${c.name} (${c.role || 'no role'}, CMC: ${c.cmc})`));

console.log("\nSideboard generado:");
result.sideboard.forEach(c => console.log(`- ${c.quantity}x ${c.name} (${c.role || 'no role'}, CMC: ${c.cmc})`));
console.log(`Sideboard Strategy: ${result.sideboard_strategy}`);

console.log("\n=== VALIDACIÓN COMPLETADA CON ÉXITO ===");
