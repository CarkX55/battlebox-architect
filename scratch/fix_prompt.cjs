const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'services', 'deckArchitectService.js');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = 'const rarityConstraints = {';
const endMarker = '2. Construir el Prompt con el "ADN" inyectado y el Plano';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find markers!", { startIndex, endIndex });
  process.exit(1);
}

// Find the line start of rarityConstraints
let targetStart = startIndex;
while (targetStart > 0 && content[targetStart - 1] !== '\n') {
  targetStart--;
}

// Find the line start of the endMarker line
let targetEnd = endIndex;
while (targetEnd > 0 && content[targetEnd - 1] !== '\n') {
  targetEnd--;
}

const replacement = `    const rarityConstraints = {
      pauper: "RESTRICCIÓN ABSOLUTA DE RAREZA: Solo usa cartas de rareza 'common' (comunes). Bajo ninguna circunstancia uses infrecuentes, raras o míticas.",
      artisan: "RESTRICCIÓN ABSOLUTA DE RAREZA: Solo usa cartas de rareza 'common' (comunes) o 'uncommon' (infrecuentes). Bajo ninguna circunstancia uses raras o míticas.",
      'high-power': "SIN RESTRICCIÓN DE RAREZA: Tienes total libertad para usar las versiones y cartas más potentes disponibles en raras, míticas, infrecuentes y comunes.",
      standard: "RESTRICCIÓN DE RAREZA ESTÁNDAR: Enfoque equilibrado general."
    };
    const activeRarityMode = formData.rarityMode || (aiConfig && aiConfig.rarityMode) || 'high-power';
    const rarityText = rarityConstraints[activeRarityMode] || rarityConstraints['high-power'];

    const STRICT_INSTRUCTIONS_PROMPT = \`
Eres un Ingeniero y Diseñador de Mazos de Magic: The Gathering de nivel Pro Tour.
Tu única e inamovible tarea es rellenar con precisión quirúrgica el siguiente PLANO DE ROLES Y CANTIDADES ESTRATÉGICAS:
\\\${JSON.stringify(blueprint.roles)}

REGLAS DE ACERADO ESTRATÉGICO Y EVALUACIÓN:
1. EVALUACIÓN PIEZA A PIEZA DEL POOL: Evalúa concienzudamente las cartas del "RAG CARD POOL OBLIGATORIO" una a una. Selecciona las cartas de mayor potencia individual, eficiencia en maná y perfecta sinergia competitiva para cada rol específico.
2. CUBRIMIENTO EXACTO DEL PLANO: Debes generar exactamente la cantidad de copias especificadas para cada rol en el plano. La suma de las copias (quantity) de todos los hechizos devueltos DEBE ser exactamente de \\\${blueprint.totalSpells} copias.
3. EXCLUSIÓN DE LA CATEGORÍA CRIATURA EN DETERMINADOS ROLES: Cualquier rol cuyo nombre contenga 'creature' o 'targets' (ej. 'reanimation_creature_targets', 'core_creatures', 'sac_fodder_creatures', 'prowess_creatures', 'etb_value_creatures', 'landfall_creatures') DEBE ser asignado exclusivamente a cartas de tipo criatura (category: 'Creature'). Bajo ninguna circunstancia uses Encantamientos, Conjuros o Sagas en estos roles.
4. REGLA ESPECIAL DE FINISHERS PARA CONTROL: En un mazo de arquetipo Control ('control'), el rol 'finishers' DEBE llenarse con amenazas inevitables de fin de partida (win conditions) de alto impacto. Está estrictamente permitido y recomendado incluir Caminantes de Planos (Planeswalkers) como 'Teferi, Hero of Dominaria' o 'Jace, the Mind Sculptor', o encantamientos con gran valor de combate como 'Shark Typhoon'. EVITA categóricamente usar criaturas ligeras de flash/tempo de bajo coste (como 'Spell Queller' o 'Vendilion Clique') en el rol 'finishers' de Control puro, ya que pertenecen más bien al rol de interacción o soporte.
5. COHERENCIA TRIBAL: Si se ha especificado la Tribu [\\\${tribeLabel}], toda criatura incluida debe pertenecer a dicha tribu (\\\${tribeSubtypes}).
6. NO METAS CARTAS DE RELLENO (FILLER). SI TE SOBRA ESPACIO, AÑADE MÁS 'interaction' O 'enablers'.
7. RESTRICCIÓN ABSOLUTA DE RAREZA GLOBAL:
   - \\\${rarityText}
8. ASIGNACIÓN RIGUROSA DE ROLES: Cada carta devuelta debe tener un campo 'role' que coincida exactamente con las claves del plano: \\\${Object.keys(blueprint.roles).join(', ')}. No te inventes nuevos nombres de roles.
\`;

`;

const newContent = content.substring(0, targetStart) + replacement + content.substring(targetEnd);
fs.writeFileSync(filePath, newContent, 'utf8');
console.log("Successfully fixed deckArchitectService.js using more permissive markers!");
