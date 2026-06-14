import { callAI } from './aiFactory.js';
import { getAllCards } from './dbIngestor.js';

const AUDIT_SYSTEM_PROMPT = `Eres un JUEZ SUPREMO Y CONSTRUCTOR EXPERTO DE MAZOS DE MAGIC: THE GATHERING.
Tu objetivo es dar una calificación justa, constructiva y precisa sobre la competitividad del mazo.

=== DIRECTRICES DE EVALUACIÓN EXPERTA ===
1. CALIFICACIÓN (score): Califica del 1 al 10.
   - Si el mazo tiene playsets consistentes, una base de maná matemáticamente perfecta, y sinergias claras, califícalo con un 9 o 10.
   - Penaliza por fallos objetivos: base de tierras inservible, criaturas gigantes incasteables, falta de interacción o falta total de motor.
2. ANÁLISIS FUNCIONAL Y VERDICTO (verdict): Escribe un resumen de 2-3 frases donde menciones explícitamente:
   - El desglose de roles (Amenazas vs Respuestas vs Motores).
   - El Valor de Maná Promedio (VMP) numérico real que recibes en el prompt, indicando si es adecuado para la agresividad del mazo.
3. CONSTRUCTIVO: Enfócate en la competitividad. Reporta en "warnings" la falta de "Answers" (respuestas/removal) u optimizaciones de curva.
4. MAINBOARD ONLY: Evalúa únicamente el mazo principal. Ignora el sideboard.
5. PROTECCIÓN DE NÚCLEO (CRÍTICO): Si el usuario ha definido un "Lore / Idea Personal", DEBES respetar estrictamente las cartas clave que representan esa idea. Tu labor es optimizar la base de maná y las cartas de soporte, NUNCA sugerir eliminar la condición de victoria o el capricho temático del usuario.
6. EXPLICITUD EN REEMPLAZOS: En "suggestions", DEBES especificar qué cartas se eliminan para hacer hueco a las nuevas. Justifica por qué en "text". EXCEPCIÓN: Si se te informa de que al mazo le faltan cartas para llegar al mínimo legal (60 u 80), tu prioridad es AÑADIR cartas para rellenar esos huecos SIN usar "removes" (déjalo vacío).
7. OPCIONES MÚLTIPLES: Si consideras que hay varias opciones válidas para añadir (ej: "Añadir Fatal Push o Terminate"), DEBES usar el array "addOptions" para proporcionar las alternativas, y dejar "adds" vacío. Si solo hay una opción clara, usa "adds".
8. MEJORA INTEGRAL: Propón cambios estructurales severos si es necesario para alcanzar nivel Tier 1 competitivo (salvo el núcleo).
9. COHERENCIA DE COLOR (ESTRICTO): NUNCA, bajo ningún concepto, sugieras en el texto ni incluyas en los arrays (adds/addOptions) cartas que no pertenezcan a los "Colores" especificados por el usuario. Si el mazo es Jund (BRG), no puedes sugerir cartas Azules ni Blancas.
10. COHERENCIA TRIBAL: Prioriza enormemente sugerir cartas de la Tribu elegida.
11. FORMATO DE CARTAS: SIEMPRE que menciones el nombre de una carta en cualquier campo de texto, DEBES envolverla entre dobles corchetes. Ejemplo: "Necesitas más [[Lightning Bolt]]".
12. REDUNDANCIA FUNCIONAL Y STRICT UPGRADES:
   - Distingue claramente entre efectos acumulativos (modificadores numéricos +X/+Y como Lords, dorks/aceleradores de maná, hechizos de daño directo, robo de cartas, disparadores/triggers, reductores de coste y efectos de impuestos/stax). Está PERMITIDO y recomendado llevar múltiples cartas diferentes con estos efectos acumulativos para mejorar la consistencia del mazo (ej. [[Muscle Sliver]] y [[Predatory Sliver]]). NUNCA penalices o consideres redundante esta acumulación de efectos.
   - En cambio, detecta redundancia negativa únicamente en habilidades de palabras clave estáticas no acumulativas en mesa (Volar, Prisa, Vigilancia, etc.) si se saturan en mazos genéricos. Exime de esta penalización a mazos altamente lineales o tribales (como Slivers, Goblins o Elfos) donde tener múltiples fuentes de la misma palabra clave es vital para asegurar el efecto en mesa.
   - NUNCA sugieras "añadir" una versión funcionalmente inferior o redundante si el mazo ya cuenta con copias de la versión superior.
13. LÍMITE LEGAL (REGLA DE 4X) Y REGLA DE LEYENDAS:
   - NUNCA sugieras añadir copias de una carta si la suma total en el mazo supera las 4 copias permitidas (ej. 4x Sliver Hive). (Excepción: Tierras básicas).
   - LÍMITE DE LEYENDAS PRO TOUR: Permite llevar hasta 4 copias en cartas legendarias de bajo coste (CMC <= 3) que sirvan de motores o amenazas baratas (ej. [[Thalia, Guardian of Thraben]]). Sin embargo, penaliza llevar 4 copias de leyendas pesadas de coste alto (CMC >= 4) a menos que el mazo cuente con formas muy claras de descartarlas (looting) o sacrificarlas repetidamente, sugiriendo reducir a 2 o 3 copias para evitar el atasco.
14. ANÁLISIS MATEMÁTICO REAL: Tienes estrictamente prohibido decir que la base de maná es "frágil" o "inestable" basándote solo en los nombres de las tierras. MIRA LAS "FUENTES DE MANÁ DISPONIBLES" EN LAS MÉTRICAS. Mazos tribales 5C usan [[Cavern of Souls]], [[Secluded Courtyard]], [[Sliver Hive]] y aceleradores como [[Manaweft Sliver]]. Estas son fuentes 5C perfectas. Si los números de las fuentes de color proporcionados son aceptables (ej >14), elogia la base de maná en lugar de criticarla falsamente.
15. ARQUETIPOS Y VELOCIDAD (VMP): Si el arquetipo es "Midrange" o "Control", un Valor de Maná Promedio (VMP) de hasta 3.0 es perfectamente aceptable y competitivo para su estrategia. Tienes ESTRICTAMENTE PROHIBIDO quejarte de que el mazo es "demasiado lento" si el VMP es menor o igual a 3.0 para estos arquetipos. Solo los mazos Aggro exigen VMP muy bajos (< 2.2).
16. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN (BATTLE BOX EQUITY):
    - Califica negativamente (score penalizado) si el mazo carece por completo de formas de interactuar con el oponente, o si consiste en combos degenerados que ganan de golpe de forma solitaria en los primeros turnos (ej. Splinter Twin, Thassa's Oracle combos) sin dar oportunidad de responder.
    - Debes sugerir cambiar piezas de combos instantáneos no interactivos o locks de bloqueo absoluto (como Blood Moon o Ensnaring Bridge pasivos) por motores de valor dinámicos, trucos de combate e interacción reactiva de pila.


Debes responder ÚNICAMENTE con un JSON válido usando este esquema exacto:
{
  "score": 0,          // Calificación del 1 al 10
  "verdict": "...",    // Resumen analítico mencionando el VMP y el desglose Amenazas/Respuestas/Motores
  "criticalAlerts": [], // Alertas críticas sobre errores objetivos que rompen el mazo
  "warnings": [],       // Advertencias sobre el recuento de fuentes de maná o falta de interacción
  "suggestions": [      // Sugerencias constructivas estructuradas
    {
       "text": "Eliminar 2x [[Carta A]] para añadir 2x [[Carta B]] porque mejora la curva temprana.",
       "removes": [{"name": "Carta A", "quantity": 2}],
       "adds": [{"name": "Carta B", "quantity": 2}], // Usa esto si hay una decisión única
       "addOptions": [ // Usa esto SOLO si quieres dar a elegir múltiples opciones (ej. añadir Carta B o Carta C)
         [{"name": "Carta B", "quantity": 2}],
         [{"name": "Carta C", "quantity": 2}]
       ]
    }
  ]
}`;

export async function auditDeckWithAI(deckCards, _sideboardCards, formData, aiConfig, onProgress = () => {}) {
  onProgress('audit', '🕵️‍♂️ El Juez está auditando la estructura matemática del mazo...');
  
  const allCards = await getAllCards();
  const selectedFormat = (formData.format || 'modern').toLowerCase();
  const bannedCards = allCards.filter(c => c.legalities && c.legalities[selectedFormat] === 'banned').map(c => c.name);
  const bannedText = bannedCards.length > 0 
    ? `\n\nCARTAS BANEADAS EN ESTE FORMATO (${selectedFormat}): ${bannedCards.join(', ')}. No las sugieras.`
    : "";

  const deckListText = deckCards.map(c => `${c.quantity}x ${c.name} (Cat: ${c.category}, Cost: ${c.mana_cost || c.cmc || '?'})`).join('\n');

  // Construir string de métricas matemáticas si existen
  const metricsText = formData?.metrics ? `
=== MÉTRICAS MATEMÁTICAS ESTRICTAS ===
- Valor de Maná Promedio (VMP): ${formData.metrics.vmp}
- Fuentes de Maná Disponibles: ${JSON.stringify(formData.metrics.sources)}
  (Analiza estas métricas para comprobar si la curva es muy alta o si faltan fuentes de color, indícalo en el veredicto o warnings).
` : '';

  const userLoreText = formData?.prompt ? `\nLore / Idea Personal del Usuario (¡DEBES PROTEGER ESTAS CARTAS!): "${formData.prompt}"` : '';

  // Calcular si faltan cartas en el mazo
  const totalCards = deckCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const targetCards = (formData?.companero?.toLowerCase().includes("yorion")) ? 80 : 60;
  const deckSizeWarning = totalCards < targetCards 
    ? `\n\n[¡ALERTA CRÍTICA MATEMÁTICA!]: Al mazo le faltan cartas (Tiene ${totalCards} y necesita ${targetCards}). El usuario eliminó cartas manualmente y quiere que tú rellenes el hueco. REGLA INVIOLABLE: Tienes ESTRICTAMENTE PROHIBIDO eliminar más cartas. El array "removes" DEBE ESTAR OBLIGATORIAMENTE VACÍO []. Tu única tarea es proponer "adds" o "addOptions" cuya suma total de cantidades sea EXACTAMENTE ${targetCards - totalCards}.`
    : `\n\n[INFORMACIÓN MATEMÁTICA ESTRICTA]: He sumado la cantidad de copias de todas las cartas por ti. El mazo tiene EXACTAMENTE ${totalCards} cartas (un número perfectamente legal). TIENES TOTALMENTE PROHIBIDO alucinar diciendo que al mazo le faltan cartas. Si en tus 'suggestions' sugieres cambios, DEBES asegurar que la cantidad de cartas que eliminas ("removes") sea EXACTAMENTE IGUAL a la cantidad de cartas que añades ("adds"), de modo que el mazo se mantenga exactamente en ${totalCards} cartas.`;

  const userPrompt = `Analiza este mazo matemáticamente:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Tribu: ${formData?.tribe || 'Ninguna / Desconocida'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}${userLoreText}${bannedText}
${metricsText}${deckSizeWarning}
=== DECKLIST ===
${deckListText}

Genera el reporte de auditoría estricto en JSON.`;

  try {
    const response = await callAI([
      { role: 'system', content: AUDIT_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 2000 });

    let jsonResult;
    try {
        jsonResult = JSON.parse(response);
    } catch(e) {
        // Fallback para extraer JSON si Gemini lo envolvió en markdown
        const match = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (match) {
            jsonResult = JSON.parse(match[1]);
        } else {
            const first = response.indexOf('{');
            const last = response.lastIndexOf('}');
            if (first !== -1 && last > first) {
                jsonResult = JSON.parse(response.substring(first, last + 1));
            } else {
                throw new Error("No se pudo parsear el JSON.");
            }
        }
    }
    return jsonResult;
  } catch (error) {
    console.error("Error en la auditoría con IA:", error);
    throw new Error("Fallo al auditar el mazo. El Juez no está disponible.");
  }
}

const INTERNAL_SYNERGY_PROMPT = `Eres el Crítico de Sinergia Interno de un constructor maestro de mazos de MTG.
El Diseñador acaba de crear un esqueleto inicial de hechizos (SIN TIERRAS).
Tu misión es evaluarlo en busca de fallos fatales de construcción o sinergia rota:
- Falta de "payoffs" para los "enablers" (ej. cartas que ganan vida sin cartas que triggereen al ganar vida).
- Falta de protección o interacción básica para el arquetipo.
- Cartas disfuncionales o que entorpecen la estrategia.
- Cartas fuera de los colores permitidos o sin sentido en la tribu elegida.
- Detección de Antijuego (Battle Box Equity): Identifica y sugiere eliminar combos degenerados de victoria instantánea en turnos tempranos o cartas de bloqueo pasivo absoluto que impidan interactuar al oponente. Sugiere motores de valor o trucos de combate interactivos alternativos.

Si el esqueleto está bien, devuelve sugerencias vacías.
Si necesita correcciones obligatorias, provee un array "suggestions" con removes y adds. Sé exacto.
Tu json de salida debe seguir esta estructura exacta:
{
  "criticalAlerts": ["alert 1", "alert 2"],
  "suggestions": [
    {
      "text": "Cambio la Carta A por la Carta B porque necesitamos X",
      "removes": [{"name": "Carta A", "quantity": 1}],
      "adds": [{"name": "Carta B", "quantity": 1}]
    }
  ]
}
`;

export async function internalSynergyAudit(deckSpells, formData, aiConfig) {
  const deckListText = deckSpells.map(c => `${c.quantity}x ${c.name} (Cat: ${c.category}, Cost: ${c.mana_cost || c.cmc || '?'})`).join('\n');
  const userPrompt = `Revisa el siguiente esqueleto de hechizos:
Arquetipo Objetivo: ${formData?.archetype || 'Desconocido'}
Estrategia: ${formData?.strategy || 'Desconocida'}
Tribu: ${formData?.tribe || 'Ninguna'}
Colores: ${formData?.colores?.join(', ') || 'No especificados'}
=== SPELLS ===
${deckListText}
`;
  try {
    const response = await callAI([
      { role: 'system', content: INTERNAL_SYNERGY_PROMPT },
      { role: 'user', content: userPrompt }
    ], aiConfig, { forceJSON: true, maxTokens: 1000 });
    
    let jsonResult;
    try {
        jsonResult = JSON.parse(response);
    } catch(e) {
        const match = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
        if (match) {
            jsonResult = JSON.parse(match[1]);
        } else {
            const first = response.indexOf('{');
            const last = response.lastIndexOf('}');
            if (first !== -1 && last > first) {
                jsonResult = JSON.parse(response.substring(first, last + 1));
            } else {
                return { suggestions: [] };
            }
        }
    }
    return jsonResult;
  } catch (error) {
    console.warn("Error en el Crítico Interno (ignorando):", error);
    return { suggestions: [] };
  }
}
