import { BATTLEBOX_VETOS, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, MTG_TRIBES, BANLIST_SUBSTITUTIONS, getIntelligentSubstitution } from '../constants/legacyBattleBox.js';
import { buildCardPool, getDynamicArchetypes } from './ragService.js';
import { buscarCartasEnBibliotecaTool } from './cardHydrator.js';
import { ARCHETYPE_DNA } from './deckArchitectService.js';
import { getSignalBoosts } from './synergyActivationEngine.js';

export const DECK_BUILDER_TOOLS = [{
  functionDeclarations: [{
    name: "buscar_cartas_en_biblioteca_tool",
    description: "Busca cartas en la biblioteca de Magic usando tags semánticos (ej. removal, sweeper) o parámetros exactos (colors, type_line, max_cmc, format). Devuelve las 15 mejores opciones.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING", description: "Término semántico o palabra clave." },
        colors: { type: "ARRAY", items: { type: "STRING" }, description: "Array de colores permitidos." },
        type_line: { type: "STRING", description: "Tipo de carta (ej. 'creature', 'instant')." },
        max_cmc: { type: "INTEGER", description: "CMC máximo permitido." },
        format: { type: "STRING", description: "Formato de juego (MODERN, PIONEER, STANDARD). Obligatorio." }
      },
      required: ["format"]
    }
  }]
}];

const PROVIDER_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta'
};

const STRATEGIST_MATH_SYSTEM_PROMPT = `Eres el ESTRATEGA DE MAZOS DE MODERN.
Tu misión es diseñar un mazo temático de alta calidad y legal en el formato Modern.

=== REGLAS DE ORO ===
1. Usa {spellCount} Hechizos y {landCount} Tierras. TOTAL: 60 cartas.
2. Prioridad: Raza {tribe} > Soporte temático > Staples de Modern (Lightning Bolt, Fatal Push, Spell Pierce, etc.).
3. Si no encuentras suficientes cartas de la raza {tribe}, completa con los mejores hechizos de sus colores que sean legales en Modern.
4. PROHIBIDO: Emeritus of Conflict.

ESCRIBE TU PLAN ASÍ:
HECHIZOS ({spellCount} cartas):
- 4x Nombre (rol)
...
TIERRAS ({landCount} cartas):
- 4x Nombre
...
...
`;
const DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el CONSTRUCTOR DE JSON. 
Convierte el plan en un objeto JSON.

=== REGLAS OBLIGATORIAS ===
- Debes devolver exactamente {spellCount} hechizos en el array "cards".
- Debes devolver exactamente {landCount} tierras en el array "cards".
- NUNCA pongas 60 tierras. Si el plan es pobre, rellena con cartas potentes y sinérgicas de Modern.

=== FORMATO ===
{
  "deckName": "...",
  "cards": [ {"name": "Carta", "quantity": 4, "category": "...", "cmc": 1} ]
}`;

export const DECK_SCHEMA = {
  type: "object",
  properties: {
    deckName: { type: "string" },
    archetype: { type: "string" },
    lore: { type: "string" },
    strategy: { type: "string" },
    mulligan: { type: "string" },
    pip_balance: {
      type: "object",
      properties: {
        W: { type: "integer" },
        U: { type: "integer" },
        B: { type: "integer" },
        R: { type: "integer" },
        G: { type: "integer" },
        C: { type: "integer" }
      },
      required: ["W", "U", "B", "R", "G", "C"]
    },
    cards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          quantity: { type: "integer" },
          category: { type: "string" },
          cmc: { type: "integer" },
          reasoning: { type: "string", description: "Breve justificación estratégica de por qué se elige esta carta." }
        },
        required: ["name", "quantity", "category", "cmc", "reasoning"]
      }
    }
  },
  required: ["deckName", "archetype", "lore", "strategy", "mulligan", "pip_balance", "cards"]
};

export const GEMINI_PHASE_SCHEMA = {
  type: "object",
  properties: {
    cards: {
      type: "array",
      description: "List of the chosen cards for the requested roles in this specific phase.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the card." },
          role: { type: "string", description: "The specific role from the provided target roles this card fulfills." },
          quantity: { type: "integer", description: "The exact quantity requested for this role." },
          category: { type: "string", description: "Category (e.g. Creature, Instant, Sorcery, Artifact, Enchantment, Planeswalker)" },
          cmc: { type: "integer", description: "Converted Mana Cost of the card." },
          synergy_prerequisites_check: { type: "string", description: "Chain of Thought: Does this card require +1/+1 counters, artifacts, planeswalkers, or specific board states? Does the current deck have them? If not, pick a different card." },
          reason: { type: "string", description: "Brief strategic reason for choosing this card based on the current deck context." }
        },
        required: ["name", "role", "quantity", "category", "cmc", "synergy_prerequisites_check", "reason"]
      }
    }
  },
  required: ["cards"]
};

const AGENTIC_PHASE_SYSTEM_PROMPT = `Eres el MAESTRO ARQUITECTO DE MAZOS DE MODERN CASUAL (BATTLE BOX 1VS1).
Tu misión es diseñar un mazo temático, competitivo y consistente PASO A PASO.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES elegir cartas que tengan la MÁXIMA SINERGIA posible con este contexto. Si ya hay motores o piezas clave, tu tarea es apoyarlas, protegerlas o alimentarlas.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. REGLA DE CONSISTENCIA:
   - Usa la cantidad exacta de copias solicitada para cada rol.
   - NO elijas cartas que ya estén en el mazo actual (Contexto Acumulado) a menos que necesites más copias para llegar al límite legal (4x).

4. REGLA DE TOLERANCIA DE PIPS Y CURVA:
   - Mantén la curva de maná sugerida en los roles.
   - En mazos de 3 o más colores, PROHIBIDO incluir cartas de triple coste específico (ej: RRR, WWW, BBB).

5. MINIMIZAR REDUNDANCIA FUNCIONAL (REGLA DEL MEJOR EFECTO):
   - Distingue entre efectos acumulativos (modificadores numéricos +X/+Y, dorks de maná, daño directo, robo de cartas, disparadores, reductores de coste o tasas) y palabras clave estáticas no acumulativas (volar, prisa, etc.).
   - Se permite y recomienda la redundancia en efectos acumulativos para asegurar la consistencia del mazo.
   - Para las palabras clave estáticas en mesa, elige siempre la mejor versión del efecto y dedícale las copias necesarias, evitando duplicaciones ineficientes a menos que sea un mazo lineal o tribal (como Slivers, Elfos o Goblins) donde se necesite consistencia en mesa.

6. IDENTIDAD MECÁNICA Y "ANSWERS" POR COLOR EN MODERN:
   - BLANCO: Exilio Universal, protección, criaturas Flying/Vigilance.
   - AZUL: Counters, Cantrips, criaturas Flying/Hexproof.
   - NEGRO: Remoción Letal, descarte, criaturas Deathtouch/Lifelink.
   - ROJO: Daño directo, robo impulsivo, criaturas Prowess/Haste.
   - VERDE: Fight/Bite, destrucción de artefactos/encantamientos, criaturas Trample/Reach.

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA (MANDATORIA):
   - Si hay una Tribu/Raza activa que no sea "none", TIENES TOTALMENTE PROHIBIDO rellenar roles con encantamientos, conjuros, artefactos genéricos o criaturas de otras tribus (Ej. prohibido "Raise the Alarm" o "Origin Spellbomb" en un mazo de Slivers).
   - Las ÚNICAS cartas no-tribales permitidas son "staples" universales de pura interacción (remoción o counters como Fatal Push o Spell Pierce).

9. ERRADICACIÓN DE CARTAS PARASÍTICAS (REGLA CRÍTICA):
   - DEBES revisar las condiciones textuales de una carta antes de elegirla.
   - Si una carta interactúa con mecánicas altamente específicas, DEBES confirmar en tu Chain of Thought que el "Contexto Acumulado" tiene suficientes cartas que habiliten esa condición.

10. RESTRICCIONES DE RAREZA (MANDATORIO):
    - Debes ajustarte estrictamente al siguiente nivel de rareza: {rarityMode}.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN (BATTLE BOX EQUITY):
    - Queda ESTRICTAMENTE PROHIBIDO sugerir combos de victoria instantánea de turnos tempranos o cartas de bloqueo pasivo de mesa (locks como Blood Moon, Ensnaring Bridge) a menos que el usuario lo pida explícitamente.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors} (PROHIBIDO SALIRSE DE ESTOS COLORES)
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel} (Scryfall subtypes: {tribeSubtypes})
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

const AGGRO_AGENT_PROMPT = `Eres el AGENTE AGGRO (Invocador del Caos y Daño).
Tu misión es estructurar una curva ultrabaja y agresiva para asfixiar al rival con criaturas rápidas y daño directo.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES elegir cartas que tengan la MÁXIMA SINERGIA agresiva. Si ya hay atacantes o dopadores en mesa, añade más amenazas de bajo coste o formas de dar prisa/evadir bloqueadores.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. MENTALIDAD DE AGENTE AGGRO:
   - RAZONAMIENTO ESTRATÉGICO: Tu foco es el "reloj de daño". Cada turno que pasa sin atacar o infligir daño es una derrota. Prioriza amenazas eficientes con Haste, Trample, Prowess, o daño directo.
   - REGLA DE ORO AGGRO: Prohibido seleccionar cartas de coste de maná >= 4 a menos que sea un finisher o payoff tribal/sinérgico de alto impacto. La curva debe colapsar en costes 1 y 2.
   - PREGUNTA DE VALIDACIÓN: ¿Esta carta inflige daño inmediatamente o elimina un bloqueador en el mismo turno para mantener el ataque?

4. REGLA DE CONSISTENCIA:
   - Usa la cantidad exacta de copias solicitada para cada rol.
   - NO elijas cartas que ya estén en el mazo actual (Contexto Acumulado) a menos que necesites más copias para llegar al límite legal (4x).

5. REGLA DE TOLERANCIA DE PIPS Y CURVA:
   - Mantén la curva de maná sugerida en los roles.
   - En mazos de 3 o más colores, PROHIBIDO incluir cartas de triple coste específico.

6. MINIMIZAR REDUNDANCIA FUNCIONAL (REGLA DEL MEJOR EFECTO):
   - Elige siempre LA MEJOR VERSIÓN de un efecto y asígnale las copias necesarias.

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA (MANDATORIA):
   - Si hay una Tribu/Raza activa que no sea "none", TIENES TOTALMENTE PROHIBIDO rellenar roles con cartas que no sean de la tribu (excepto interacción pura).

9. ERRADICACIÓN DE CARTAS PARASÍTICAS (REGLA CRÍTICA):
   - Confirma en tu Chain of Thought que el "Contexto Acumulado" tiene suficientes cartas que habiliten sus condiciones. Si no, está prohibido.

10. RESTRICCIONES DE RAREZA (MANDATORIO):
    - Debes ajustarte estrictamente al siguiente nivel de rareza: {rarityMode}.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN:
    - Queda estrictamente prohibido sugerir combos de victoria instantánea de turnos tempranos o cartas de bloqueo pasivo (locks) que impidan jugar al oponente.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors} (PROHIBIDO SALIRSE DE ESTOS COLORES)
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel} (Scryfall subtypes: {tribeSubtypes})
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

const COMBO_AGENT_PROMPT = `Eres el AGENTE COMBO (Maestro de Motores y Sinergias).
Tu misión es ensamblar las piezas clave de la victoria, protegiéndolas mediante interacción barata y acelerando el mazo con tutores y cantrips.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES elegir cartas que ensamblen, protejan o aceleren el combo central.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. MENTALIDAD DE AGENTE COMBO:
   - RAZONAMIENTO ESTRATÉGICO: Cada carta debe valorarse según su proximidad al combo: ¿Busca piezas (tutor/cantrip)? ¿Es parte del motor? ¿Genera maná rápido (rituals/dorks)? ¿Protege el combo (counters/protección barata)?
   - REGLA DE ORO COMBO: Asegura que el mazo tenga redundancia en las piezas clave o suficientes buscadores/tutores para ensamblarlo de forma consistente.
   - PREGUNTA DE VALIDACIÓN: ¿Esta carta acelera la ejecución del combo, busca una de las piezas que me faltan o me protege mientras lo ejecuto?

4. REGLA DE CONSISTENCIA:
   - Usa la cantidad exacta de copias solicitada para cada rol.
   - NO elijas cartas que ya estén en el mazo actual (Contexto Acumulado) a menos que necesites más copias para llegar al límite legal (4x).

5. REGLA DE TOLERANCIA DE PIPS Y CURVA:
   - Mantén la curva de maná sugerida en los roles.

6. MINIMIZAR REDUNDANCIA FUNCIONAL (REGLA DEL MEJOR EFECTO).

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA.

9. ERRADICACIÓN DE CARTAS PARASÍTICAS.

10. RESTRICCIONES DE RAREZA.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN:
    - Queda estrictamente prohibido sugerir combos de victoria instantánea de turnos extremadamente tempranos o cartas de bloqueo pasivo (locks) que impidan jugar al oponente.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors}
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel}
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

const CONTROL_AGENT_PROMPT = `Eres el AGENTE CONTROL (Guardián del Orden y del Largo Plazo).
Tu misión es interactuar constantemente con las amenazas enemigas en velocidad instantánea y generar una ventaja insalvable de cartas.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES priorizar cartas reactivas que neutralicen el plan del rival o roben cartas para no quedarte sin recursos.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. MENTALIDAD DE AGENTE CONTROL:
   - RAZONAMIENTO ESTRATÉGICO: Tu recurso más preciado es el maná abierto y las respuestas eficientes (1 por 1 o limpiamesas 2 por 1). Valora los hechizos reactivos a velocidad instantánea (Flash, Instant).
   - REGLA DE ORO CONTROL: Limita las criaturas de tu mazo al mínimo absoluto (máximo 6 en el mazo completo) y asegúrate de que sean "finishers" premium o generadores brutales de ventaja.
   - PREGUNTA DE VALIDACIÓN: ¿Esta carta puede jugarse en el turno del oponente o me permite neutralizar varias amenazas enemigas de un solo golpe?

4. REGLA DE CONSISTENCIA.

5. REGLA DE TOLERANCIA DE PIPS Y CURVA.

6. MINIMIZAR REDUNDANCIA FUNCIONAL.

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA.

9. ERRADICACIÓN DE CARTAS PARASÍTICAS.

10. RESTRICCIONES DE RAREZA.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors}
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel}
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

const TEMPO_AGENT_PROMPT = `Eres el AGENTE TEMPO (Maestro del Ritmo y el Momento).
Tu misión es desplegar una amenaza rápida y luego protegerla interrumpiendo el ritmo del oponente mediante rebotes, counters condicionales y remoción barata.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES elegir cartas que te permitan avanzar tu mesa mientras retrasas la del oponente.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. MENTALIDAD DE AGENTE TEMPO:
   - RAZONAMIENTO ESTRATÉGICO: Busca ganar "tempo" (amenaza + respuesta en el mismo turno). Valora criaturas eficientes con habilidades evasivas (Flying, Flash, Ninjutsu) y hechizos que reboten o desvíen recursos.
   - REGLA DE ORO TEMPO: Prohibido seleccionar cartas de coste >= 4 que no ganen la partida solas o no tengan valor inmediato al entrar. Evita cartas pesadas que requieran girar todo tu maná de forma pasiva.
   - PREGUNTA DE VALIDACIÓN: ¿Esta carta me permite seguir atacando mientras le quito velocidad o respuestas al oponente en su turno?

4. REGLA DE CONSISTENCIA.

5. REGLA DE TOLERANCIA DE PIPS Y CURVA.

6. MINIMIZAR REDUNDANCIA FUNCIONAL.

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA.

9. ERRADICACIÓN DE CARTAS PARASÍTICAS.

10. RESTRICCIONES DE RAREZA.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors}
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel}
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

const TRIBAL_AGENT_PROMPT = `Eres el AGENTE TRIBAL (Unificador del Estandarte).
Tu misión es alcanzar la masa crítica de criaturas de la misma raza/tribu, maximizando los bonus compartidos y los lords.

Estás en la {phaseName}.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA ===
1. CONTEXTO ACUMULADO:
   Hasta ahora, el mazo contiene estas cartas:
   {currentDeckList}
   {signalContext}
   DEBES priorizar criaturas que pertenezcan a la tribu principal o que tengan efectos directos que las beneficien.

2. ROLES A RELLENAR EN ESTA FASE:
   {targetRoles}

3. MENTALIDAD DE AGENTE TRIBAL:
   - RAZONAMIENTO ESTRATÉGICO: Una criatura tribal mediocre a menudo es superior a una criatura genérica potente, porque interactúa con los bonus tribales. Busca "lords" (+1/+1 a la tribu), sinergias tribales específicas y payoffs.
   - REGLA DE ORO TRIBAL: Si el mazo tiene una tribu declarada, el 90% de tus criaturas DEBEN ser de esa tribu. Quedan excluidas criaturas externas a menos que aporten un efecto insustituible.
   - PREGUNTA DE VALIDACIÓN: ¿Esta criatura pertenece a la tribu o tiene un efecto directo de beneficio para las criaturas de la tribu seleccionada?

4. REGLA DE CONSISTENCIA.

5. REGLA DE TOLERANCIA DE PIPS Y CURVA.

6. MINIMIZAR REDUNDANCIA FUNCIONAL.

7. VETO ABSOLUTO (BANLIST):
   - Evita incluir cartas de la Banlist: {banlist}.

8. COHERENCIA TRIBAL EXTREMA (MANDATORIA):
   - El mazo debe ser cohesivo y fiel al tipo de criatura indicado.

9. ERRADICACIÓN DE CARTAS PARASÍTICAS.

10. RESTRICCIONES DE RAREZA.

11. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Identidad de Color Permitida: {colors}
- Arquetipo: {archetype}
- Tribu/Raza principal: {tribeLabel} (Scryfall subtypes: {tribeSubtypes})
- Enfoque Estratégico: {strategy}
- Nivel de Rareza / Restricción: {rarityMode}
- Detalles del Usuario: {userPrompt}
{dnaContext}

Debes devolver EXACTAMENTE las cartas para los roles solicitados, cumpliendo las cantidades.
Usa SIEMPRE la 'Query sugerida' al invocar la herramienta buscar_cartas_en_biblioteca_tool para ese rol.
`;

export function selectArchetypePrompt(archetype, strategyId, tribe) {
  const arch = (archetype || '').toLowerCase();
  const strat = (strategyId || '').toLowerCase();
  
  // Combo: storm, cascade, reanimator, combo, creatividad
  if (['storm', 'cascade', 'reanimator', 'combo', 'creativity'].some(k => arch.includes(k) || strat.includes(k))) {
    return COMBO_AGENT_PROMPT;
  }
  
  // Control: control, taxes, prison, superfriends
  if (['control', 'taxes', 'prison', 'superfriends'].some(k => arch.includes(k) || strat.includes(k))) {
    return CONTROL_AGENT_PROMPT;
  }
  
  // Tempo: tempo, shadow, delver, murktide, ninjas, ninjutsu
  if (['tempo', 'shadow', 'delver', 'ninjutsu', 'ninja'].some(k => arch.includes(k) || strat.includes(k))) {
    return TEMPO_AGENT_PROMPT;
  }
  
  // Tribal: si hay una tribu activa
  if (tribe && tribe !== 'none') {
    return TRIBAL_AGENT_PROMPT;
  }
  
  // Aggro por defecto para todo lo agresivo
  if (['aggro', 'burn', 'affinity', 'scales', 'prowess', 'vehicles'].some(k => arch.includes(k) || strat.includes(k))) {
    return AGGRO_AGENT_PROMPT;
  }
  
  // Fallback: prompt genérico
  return AGENTIC_PHASE_SYSTEM_PROMPT;
}

export function buildAgenticPhasePrompt(params, phaseName, targetRoles, currentDeck, activationSignals = []) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode, archData: passedArchData, dnaSkeleton } = params;
  const archData = passedArchData || BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  
  let strategyMechanics = 'N/A';
  if (strategy) {
    const stratObj = MTG_STRATEGIES.find(s => s.label === strategy || s.id === strategy);
    strategyMechanics = stratObj ? stratObj.mechanics : strategy;
  }

  const tribeObj = MTG_TRIBES.find(t => t.id === tribe) || { label: tribe || 'none', subtypes: '' };
  const tribeLabel = tribeObj.label;
  const tribeSubtypes = tribeObj.subtypes;

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = 'Poder de Legacy / Sin límites (Máxima potencia. Prioriza cartas de nivel competitivo alto, incluyendo míticas y raras extremadamente potentes sin restricciones de rareza, usando comunes/infrecuentes de alta eficiencia para apoyar).';
      break;
    case 'pauper':
      rarityRule = 'Pauper (SOLO puedes sugerir cartas comunes. Queda estrictamente prohibido usar infrecuentes, raras o míticas).';
      break;
    case 'artisan':
      rarityRule = 'Artisan (SOLO puedes sugerir cartas comunes o infrecuentes. Queda estrictamente prohibido usar raras o míticas).';
      break;
    default:
      rarityRule = 'Estándar (Equilibrio casual, usa la rareza de manera sensata).';
      break;
  }

  const currentDeckList = currentDeck.length > 0 
    ? currentDeck.map(c => `- ${c.quantity}x ${c.name} (Rol: ${c.role})`).join('\n')
    : 'El mazo está vacío. Eres el primero en elegir las cartas fundacionales.';

  const targetRolesList = targetRoles.map(r => 
    `- Rol: "${r.name}" | Cantidad: ${r.quantity} | CMC: ${r.cmcCategory} | Calidad: ${r.finisherQuality} | Propósito: ${r.purposeDescription} | Query sugerida: "${r.search_query || ''}"`
  ).join('\n');

  // DNA context (Mejora 2.4)
  const dnaEntry = ARCHETYPE_DNA[strategy] || ARCHETYPE_DNA[archetype] || null;
  const dnaContext = dnaEntry 
    ? `\n=== ADN COMPETITIVO DEL ARQUETIPO ===\n- Prioridad: ${dnaEntry.prioridad}\n- Regla de Oro: ${dnaEntry.regla_de_oro}\n===================================`
    : '';

  // Signals context (Phase Memory / Mejora 4)
  let signalContext = '';
  if (activationSignals && activationSignals.length > 0) {
    const boostTerms = Object.keys(getSignalBoosts(activationSignals));
    signalContext = `\n=== SEÑALES DE SINERGIA ACTIVAS (FASE ANTERIOR) ===\n`
      + `Las cartas elegidas en fases anteriores activan los siguientes mecanismos. `
      + `DEBES priorizar cartas que cumplan estos criterios sinérgicos:\n`
      + activationSignals.map(s => `- 🔗 ${s}`).join('\n')
      + `\nTérminos clave a buscar en las cartas de esta fase: ${boostTerms.join(', ')}\n`
      + `=====================================================\n`;
  }

  const basePrompt = selectArchetypePrompt(archetype, strategy, tribe);

  return basePrompt
    .replace('{phaseName}', phaseName)
    .replace('{currentDeckList}', currentDeckList)
    .replace('{signalContext}', signalContext)
    .replace('{targetRoles}', targetRolesList)
    .replace('{banlist}', BATTLEBOX_VETOS.join(', '))
    .replace('{colors}', colors && colors.length > 0 ? colors.join(', ') : 'Cualquiera')
    .replace('{archetype}', archData.label)
    .replace('{tribeLabel}', tribeLabel)
    .replace('{tribeSubtypes}', tribeSubtypes)
    .replace('{strategy}', `${strategy} - Mecánicas clave: ${strategyMechanics}`)
    .replace(/{rarityMode}/g, rarityRule)
    .replace('{dnaContext}', dnaContext)
    .replace('{userPrompt}', (userPrompt || 'Sin instrucciones adicionales.') + 
      (dnaSkeleton && dnaSkeleton.length > 0 
        ? '\n- Referencia de ADN Competitivo (Lista del Torneo Real):\n  ' + dnaSkeleton.map(c => `${c.quantity}x ${c.name}`).join('\n  ') 
        : ''));
}

const UNIFIED_DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el MAESTRO ARQUITECTO DE MAZOS DE MODERN CASUAL (BATTLE BOX 1VS1).
Tu misión es diseñar un mazo temático, altamente competitivo dentro de la equidad de Battle Box, consistente y matemáticamente perfecto en un solo paso. Todas las cartas sugeridas deben ser legales en el formato Modern.

=== CHAIN OF THOUGHT (RAZONAMIENTO EXPERTO) ===
Para cada carta que elijas en el array "cards", DEBES llenar el campo "reasoning".
En este campo, explica exactamente qué rol cumple la carta (ej. Removal, Motor, Amenaza) y por qué es la mejor opción competitiva para este arquetipo sobre otras alternativas. Pregúntate siempre: ¿Esta carta es lo suficientemente rápida y eficiente para sobrevivir los turnos 1-3 en el formato?

=== REGLAS TÉCNICAS E INFRAESTRUCTURA (ESQUELETO FUNCIONAL) ===
1. TAMAÑO Y SLOTS REQUERIDOS:
   - El mazo principal debe contener EXACTAMENTE 60 cartas en total: {spellCount} Hechizos (no tierras) y {landCount} Tierras.
   - Debes rellenar el array "cards" con hechizos y tierras que cumplan con este total.

2. ANATOMÍA NUMÉRICA POR ARQUETIPO:
   - Para el arquetipo {archetype} ({spellCount} hechizos / {landCount} tierras):
     * Aggro (Puro/Sinérgico): Curva muy baja. Pico en coste 2. Mínimo 12 cartas de coste 1-2. Criaturas (24-28), Hechizos (8-12), Tierras (20-22).
     * Midrange: Curva equilibrada. Máximo 8 cartas de coste 4+. Prioriza valor individual y 2x1. Criaturas (15-20), Hechizos (10-15), Tierras (23-24).
     * Control: Máximo 4-8 criaturas como win conditions / finishers de alto coste. El resto (18-24) debe ser interacción pura (counters, remoción, descarte) y ventaja de cartas/filtro. Tierras (24-26).
     * Combo / Ramp: 8-12 piezas de combo/motor, 10-14 búsqueda/aceleradores (ramp), 6-10 interacción/protección. Tierras (20-24).

3. REGLA DE CONSISTENCIA 4X (BATTLE BOX CONSTRUCTION):
   - Usa 4 copias para cualquier carta central del motor, criaturas principales y la interacción más eficiente del mazo (ej. Lightning Bolt, Path to Exile, Inquisition of Kozilek, Consider, Preordain).
   - Usa 3 copias para cartas de apoyo o hechizos de coste 3-4 que no quieres robar múltiples veces en mano inicial.
   - Usa 1 o 2 copias ESTRICTAMENTE RESERVADAS para cartas Legendarias, "finishers" de alto coste, o cartas situacionales. No se toleran "1-ofs" aleatorios en el Main Deck.

4. MINIMIZAR REDUNDANCIA FUNCIONAL (REGLA DEL MEJOR EFECTO):
   - Distingue claramente entre efectos acumulativos (modificadores numéricos +X/+Y como Lords, dorks/aceleradores de maná, daño directo, robo de cartas, disparadores/triggers, reductores de coste y efectos de stax/impuestos) y habilidades de palabra clave estáticas (volar, prisa, vigilancia, etc.).
   - Está PERMITIDO y recomendado llevar redundancia en efectos acumulativos (ej. llevar [[Muscle Sliver]] y [[Predatory Sliver]], o [[Manaweft Sliver]] y [[Gemhide Sliver]] juntos) para asegurar la consistencia del mazo. NUNCA consideres esto redundancia negativa.
   - Para las palabras clave estáticas no acumulativas en juego (ej. dar Volar), evita duplicar de forma ineficiente múltiples fuentes del mismo efecto, a menos que el mazo sea lineal o tribal (como Slivers, Goblins o Elfos) donde la redundancia es vital para asegurar el efecto en mesa.

5. LA FÓRMULA DE MANÁ KARSTEN (90% DE PROBABILIDAD EN CURVA):
   - Evita el "Mana Screw". Para lanzar hechizos en curva:
     * Hechizo de coste C (ej. U o G) en Turno 1 -> Requiere 14 fuentes del color.
     * Hechizo de coste 1C en Turno 2 -> Requiere 13 fuentes.
     * Hechizo de coste CC (ej. UU o BB) en Turno 2 -> Requiere 21 fuentes.
     * Hechizo de coste 1CC en Turno 3 -> Requiere 18 fuentes.
     * Hechizo de coste 3CC en Turno 5 -> Requiere 15 fuentes.
   - REGLA DE TOLERANCIA DE PIPS:
     * En mazos de 3 o más colores, PROHIBIDO incluir cartas de triple coste específico (ej: RRR, WWW, BBB).
     * En mazos de 2 colores, solo se permiten cartas de doble coste específico (ej: 1UU) si ese es el color principal del mazo.

6. IDENTIDAD MECÁNICA Y "ANSWERS" POR COLOR EN MODERN:
   - BLANCO: Exilio Universal (Path to Exile, Prismatic Ending, Leyline Binding), protección (Ephemerate), criaturas Flying/Vigilance.
   - AZUL: Counters (Counterspell, Spell Pierce, Mana Leak), Cantrips (Consider, Preordain, Opt), criaturas Flying/Hexproof.
   - NEGRO: Remoción Letal (Fatal Push, Bitter Triumph, Cut Down), descarte (Inquisition of Kozilek, Thoughtseize), criaturas Deathtouch/Lifelink.
   - ROJO: Daño directo (Lightning Bolt, Unholy Heat), robo impulsivo, criaturas Prowess/Haste.
   - VERDE: Fight/Bite (remoción de criaturas), destrucción de artefactos/encantamientos, criaturas Trample/Reach.

7. VETO ABSOLUTO (BANLIST):
   - NUNCA incluyas "Emeritus of Conflict" o "Emeritus of Truce" bajo ninguna circunstancia. Está estrictamente prohibido.
   - Evita incluir cartas de la Banlist: {banlist}.

8. DIRECTIVA DE INTERACTIVIDAD Y DIVERSIÓN (BATTLE BOX EQUITY):
   - Prioriza motores de valor sostenibles ("snowball" o acumulación de recursos) y cartas que inviten a tomar decisiones en mesa.
   - Queda ESTRICTAMENTE PROHIBIDO sugerir combos de victoria instantánea de turnos tempranos (ej: Splinter Twin, Thassa's Oracle combos) o cartas de bloqueo pasivo de mesa (locks como Blood Moon, Ensnaring Bridge) que impidan jugar al oponente, a menos que el usuario lo pida explícitamente.
   - Favorece la interacción dinámica basada en trucos (ej. counters condicionales, rebotes, protección temporal y habilidades con Flash o ETB) sobre remociones planas o descartes masivos que reduzcan la interactividad de la partida.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Raza/Tribu principal: {tribe}
- Enfoque Estratégico: {strategy}
- Riqueza/Potencia: {rarityMode}
- Lore/Trasfondo: {userPrompt}

Debes rellenar todos los campos del JSON, justificar CADA CARTA en el campo "reasoning", y cumplir escrupulosamente con los totales numéricos.`;

export function buildDeckArchitectPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode, archData: passedArchData } = params;

  const archData = passedArchData || BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  
  // Buscar mecánicas técnicas si se pasó una estrategia por nombre o id
  let strategyMechanics = 'N/A';
  if (strategy) {
    const stratObj = MTG_STRATEGIES.find(s => s.label === strategy || s.id === strategy);
    if (stratObj && stratObj.mechanics) {
      strategyMechanics = stratObj.mechanics;
    } else {
      strategyMechanics = strategy; // Fallback por si es custom
    }
  }
  
  let prompt = DECK_ARCHITECT_SYSTEM_PROMPT
    .replace(/{archetype}/g, archData.label)
    .replace(/{strategy}/g, strategy || 'N/A')
    .replace(/{tribe}/g, tribe || 'N/A')
    .replace(/{colors}/g, colors.join('-'))
    .replace(/{landCount}/g, archData.landCount || 24)
    .replace(/{spellCount}/g, archData.spellCount || 36);

  let blueprintFocus = "";
  if (archetype === 'aggro' || archetype === 'aggro-puro' || archetype === 'aggro-sinergico') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Prioriza costes 1 y 2. Mínimo 12 cartas de coste 1-2.";
  } else if (archetype === 'midrange') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Curva equilibrada. Máximo 8 cartas de coste 4+. Prioriza el 2x1.";
  } else if (archetype === 'control') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Máximo 4 criaturas. El resto deben ser respuestas y ventaja de cartas.";
  } else if (archetype === 'ramp') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Aceleración extrema de maná y amenazas gigantes de coste 5+. Mínimo 10-12 aceleradores y 6-8 payoffs.";
  }

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = '\nREGLA DE POTENCIA: "Alta Potencia Pro Tour". Prioriza la máxima eficiencia de maná y sinergia absoluta. Usa los mejores "staples" del formato sin importar su rareza (usa comunes e infrecuentes vitales como removals baratos o cantrips). NO priorices la rareza por encima de la eficiencia.';
      break;
    case 'pauper':
      rarityRule = '\nREGLA DE POTENCIA: "Pauper". SOLO comunes históricas.';
      break;
    case 'artisan':
      rarityRule = '\nREGLA DE POTENCIA: "Artisan". SOLO comunes e infrecuentes.';
      break;
    default:
      rarityRule = '\nREGLA DE POTENCIA: "Estándar". Equilibrio entre poder y accesibilidad.';
      break;
  }

  prompt += `${blueprintFocus}${rarityRule}\n\nPARÁMETROS ADICIONALES:\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Enfoque Estratégico: ${strategyMechanics}\n- Detalles: ${userPrompt}`;
  
  return prompt;
}

export function buildStrategistMathPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode, archData: passedArchData } = params;
  const archData = passedArchData || BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  const landCount = archData.landCount || 24;
  const spellCount = archData.spellCount || 36;
  
  let prompt = STRATEGIST_MATH_SYSTEM_PROMPT
    .replace(/{spellCount}/g, spellCount)
    .replace(/{landCount}/g, landCount)
    .replace(/{tribe}/g, tribe || 'N/A')
    .replace(/{archetype}/g, archData.label)
    .replace(/{strategy}/g, strategy || 'N/A');

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power': rarityRule = 'Alta Potencia (Eficiencia máxima, usa staples comunes/infrecuentes sin importar rareza)'; break;
    case 'pauper': rarityRule = 'Pauper (SOLO cartas comunes)'; break;
    case 'artisan': rarityRule = 'Artisan (Solo comunes e infrecuentes)'; break;
    default: rarityRule = 'Estándar (equilibrado)'; break;
  }

  let blueprintFocus = "";
  if (archetype === 'aggro' || archetype === 'aggro-puro' || archetype === 'aggro-sinergico') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Prioriza costes 1 y 2. Mínimo 12 cartas de coste 1-2.";
  } else if (archetype === 'midrange') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Curva equilibrada. Máximo 8 cartas de coste 4+. Prioriza el 2x1.";
  } else if (archetype === 'control') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Máximo 4 criaturas. El resto deben ser respuestas y ventaja de cartas.";
  } else if (archetype === 'ramp') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Aceleración extrema de maná y amenazas gigantes de coste 5+. Mínimo 10-12 aceleradores y 6-8 payoffs.";
  }

  prompt += `\n\n=== REQUISITOS DEL MAZO ===\n- Arquetipo: ${archData.label}\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Estrategia: ${strategy || 'N/A'}\n- Nivel de Rareza: ${rarityRule}${blueprintFocus}\n- Hechizos: ${spellCount} | Tierras: ${landCount}\n- Deseos del Usuario: ${userPrompt}\n\nINVESTIGA LAS CARTAS Y PLANIFICA LAS CANTIDADES AHORA:`;
  return prompt;
}

export function buildUnifiedDeckArchitectPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode, archData: passedArchData } = params;

  const archData = passedArchData || BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  const landCount = archData.landCount || 24;
  const spellCount = archData.spellCount || 36;
  
  let strategyMechanics = 'N/A';
  if (strategy) {
    const stratObj = MTG_STRATEGIES.find(s => s.label === strategy || s.id === strategy);
    if (stratObj && stratObj.mechanics) {
      strategyMechanics = stratObj.mechanics;
    } else {
      strategyMechanics = strategy;
    }
  }

  let prompt = UNIFIED_DECK_ARCHITECT_SYSTEM_PROMPT
    .replace(/{archetype}/g, archData.label)
    .replace(/{strategy}/g, strategyMechanics)
    .replace(/{tribe}/g, tribe || 'N/A')
    .replace(/{colors}/g, colors.join('-'))
    .replace(/{landCount}/g, landCount)
    .replace(/{spellCount}/g, spellCount)
    .replace(/{banlist}/g, BATTLEBOX_VETOS.join(', '));

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = 'Alta Potencia Pro Tour (Prioriza la máxima eficiencia de maná, usando staples comunes/infrecuentes vitales sin importar su rareza).';
      break;
    case 'pauper':
      rarityRule = 'Pauper (SOLO cartas comunes históricas en la historia de Magic).';
      break;
    case 'artisan':
      rarityRule = 'Artisan (SOLO comunes e infrecuentes en la historia de Magic).';
      break;
    default:
      rarityRule = 'Estándar (equilibrio entre poder y accesibilidad).';
      break;
  }

  prompt = prompt.replace(/{rarityMode}/g, rarityRule);
  
  return prompt;
}

export async function callAI(messages, config, options = {}) {
  let { provider, apiKey, selectedModel, baseUrl } = config;
  const { forceJSON = false, maxTokens = 8000, onRetry = null, temperature } = options;

  // Respetar el modelo activo configurado por el usuario en la app (config.selectedModel)
  if (!selectedModel) {
    if (provider === 'gemini') {
      selectedModel = 'gemini-1.5-flash';
    } else if (provider === 'openrouter') {
      selectedModel = 'google/gemini-2.5-flash';
    } else {
      selectedModel = 'gpt-3.5-turbo';
    }
  }

  const systemMessage = messages.find(m => m.role === 'system');
  const userMessage = messages.find(m => m.role === 'user');

  let url, body, headers;

  headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  if (provider === 'gemini') {
    const geminiBase = baseUrl || PROVIDER_URLS.gemini;
    url = `${geminiBase}/models/${selectedModel}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    body = {
      contents: [{
        parts: [{ text: `${systemMessage?.content || ''}\n\n${userMessage?.content || ''}` }]
      }],
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
      ],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature !== undefined ? temperature : 0.1,
        ...(forceJSON || options.schema ? { responseMimeType: 'application/json' } : {}),
        ...(options.schema ? { responseSchema: options.schema } : {})
      }
    };
  } else {
    url = PROVIDER_URLS[provider] || PROVIDER_URLS.openai;
    body = {
      model: selectedModel,
      messages,
      temperature: temperature !== undefined ? temperature : 0.7,
      max_tokens: maxTokens,
      ...(forceJSON ? { response_format: { type: 'json_object' } } : {})
    };
  }

  // --- RETRY CON BACKOFF MODERADO (optimizado para Gemini Free Tier) ---
  const MAX_RETRIES = 3; 
  const BASE_DELAY = 3000; // 3 segundos base (Gemini free se recupera rápido)
  const CALL_TIMEOUT = 90000; // 90 segundos máximo por llamada

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`🤖 Llamando a ${provider}/${selectedModel} (JSON: ${forceJSON}, tokens: ${maxTokens})${attempt > 0 ? ` [Reintento ${attempt}/${MAX_RETRIES}]` : ''}`);

    // AbortController para evitar que la llamada cuelgue indefinidamente
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CALL_TIMEOUT);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        if (attempt < MAX_RETRIES) {
          const retryMsg = `⏱️ [Intento ${attempt+1}] Timeout de ${CALL_TIMEOUT/1000}s alcanzado. Reintentando...`;
          console.warn(retryMsg);
          if (onRetry) onRetry(attempt + 1, 2000, 'TIMEOUT');
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`La API de ${provider} no respondió en ${CALL_TIMEOUT/1000} segundos. Verifica tu conexión o prueba un modelo más ligero.`);
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      const isRetryable = [429, 500, 503, 504].includes(response.status) || 
                         errorText.toLowerCase().includes('high demand') || 
                         errorText.toLowerCase().includes('overloaded') || 
                         errorText.toLowerCase().includes('resource exhausted') ||
                         errorText.toLowerCase().includes('quota');
      
      if (isRetryable && attempt < MAX_RETRIES) {
        // Backoff exponencial moderado + Jitter
        const jitter = Math.random() * 1500;
        const delay = (BASE_DELAY * Math.pow(1.8, attempt)) + jitter;
        
        const retryMsg = `⚠️ [Intento ${attempt+1}/${MAX_RETRIES}] ${provider} saturado (${response.status}). Reintentando en ${Math.round(delay/1000)}s...`;
        console.warn(retryMsg);
        
        // Notificar al llamador para que pueda actualizar la UI
        if (onRetry) onRetry(attempt + 1, delay, response.status);

        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw new Error(`Error de ${provider}: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (provider === 'gemini') {
      const candidate = data.candidates?.[0];
      if (candidate && candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn('⚠️ Gemini devolvió finishReason inusual:', candidate.finishReason);
        if (candidate.finishReason === 'SAFETY') {
          throw new Error('La IA bloqueó la respuesta por sus filtros de seguridad. Intenta cambiar las palabras del prompt.');
        }
      }
      const text = candidate?.content?.parts?.[0]?.text;
      if (!text) {
        console.error('Gemini devolvió una respuesta vacía o sin texto:', JSON.stringify(data));
        throw new Error('Gemini falló al generar texto. Intenta de nuevo.');
      }
      return text;
    }

    return data.choices?.[0]?.message?.content || '';
  }
  throw new Error('Se agotaron los reintentos. La API está saturada. Inténtalo en unos minutos.');
}

function parseArchitectResponse(content) {
  const defaultResult = {
    cards: [],
    pipBalance: null,
    deckName: '',
    archetype: 'midrange',
    lore: '',
    strategy: '',
    mulligan: ''
  };
  
  if (!content) return defaultResult;
  
  // Limpiar posibles bloques markdown si la IA los incluyó
  let cleanContent = content;
  if (cleanContent.includes('```json')) {
    cleanContent = cleanContent.replace(/```json/g, '').replace(/```/g, '').trim();
  }


  // Intento 1: Parseo directo (Gemini con responseMimeType devuelve JSON crudo perfecto)
  try {
    const parsed = JSON.parse(cleanContent);
    if (parsed) {
      const deckCards = parsed.cards || parsed.mainDeck || [];
      if (deckCards.length > 0) {
        return {
          deckName: parsed.deckName || 'Unnamed Deck',
          archetype: parsed.archetype || 'midrange',
          lore: parsed.lore || '',
          strategy: parsed.strategy || '',
          mulligan: parsed.mulligan || '',
          pipBalance: parsed.pip_balance || null,
          cards: deckCards
        };
      }
    }
  } catch (e) {
    console.warn('⚠️ Parseo directo falló, intentando extracción con regex...', e.message);
  }
  
  // Intento 2: Extracción con Regex
  try {
    // Buscar desde la primera llave hasta la última
    const firstBrace = cleanContent.indexOf('{');
    const lastBrace = cleanContent.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const jsonString = cleanContent.substring(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonString);
      return {
        deckName: parsed.deckName || 'Unnamed Deck',
        archetype: parsed.archetype || 'midrange',
        lore: parsed.lore || '',
        strategy: parsed.strategy || '',
        mulligan: parsed.mulligan || '',
        pipBalance: parsed.pip_balance || null,
        cards: parsed.cards || parsed.mainDeck || []
      };
    }
    
    return defaultResult;
  } catch (e) {
    console.error('❌ Error parseando respuesta del Arquitecto:', e);
    return defaultResult;
  }
}

export async function generateDeckTactics(deck, aiConfig) {
  const deckList = deck.cards.map(c => `${c.quantity}x ${c.name}`).join('\n');
  
  const systemPrompt = `Eres un Pro-Player de Modern. Genera una guía táctica institucional para un mazo.
  Hablas SOLO en español. NUNCA respondas en inglés.
  
  Responde EXCLUSIVAMENTE con este JSON:
  {
    "strategy": "Resumen técnico corto (máximo 2 frases)",
    "como_jugar": "Instrucciones generales",
    "turn_by_turn": [
      { "t": 1, "desc": "Acción crítica turno 1" },
      { "t": 2, "desc": "Acción crítica turno 2" },
      { "t": 3, "desc": "Acción crítica turno 3" },
      { "t": 4, "desc": "Opcional: Acción si el mazo lo requiere" }
    ],
    "condicion_victoria": "Cómo cierra la partida",
    "sinergias_clave": "Interacciones principales",
    "star_cards": ["Carta1", "Carta2"],
    "mulligan": "Guía de mulligan"
  }
  
  Los nombres de cartas en star_cards van en inglés. Todo lo demás en ESPAÑOL.`;
  
  const userMessage = `Genera la guía táctica en español para este mazo:\nMazo: ${deck.name} (${deck.archetype})\nLista:\n${deckList}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const response = await callAI(messages, aiConfig);
  try {
    const jsonBlock = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlock) return JSON.parse(jsonBlock[1]);
    const first = response.indexOf('{');
    const last = response.lastIndexOf('}');
    if (first !== -1 && last > first) return JSON.parse(response.substring(first, last + 1));
    return { strategy: response, mulligan: 'Ver estrategia.' };
  } catch (e) {
  return { strategy: response, mulligan: 'Ver estrategia.' };
  }
}

export async function forgeSideboard(mainDeckCards, lastFormData, aiConfig) {
  const deckList = mainDeckCards.map(c => `${c.quantity}x ${c.name} (${c.category})`).join('\n');
  const format = lastFormData?.format || 'MODERN';
  
  const stapleExamples = format === 'PIONEER' 
    ? 'ej: Rest in Peace, Fatal Push, Mystical Dispute, Unlicensed Hearse, Rending Volley'
    : 'ej: Relic of Progenitus, Fatal Push, Spell Pierce, Rest in Peace, Veil of Summer';

  const systemPrompt = `Eres el Maestro de Banquillos (Sideboard Architect) del Pro Tour.
Tu misión es generar el banquillo PERFECTO de EXACTAMENTE 15 cartas para el mazo que te proporcionaré.
Las cartas deben ser "silver bullets" y odio hiper-eficiente para cubrir las debilidades del mazo contra:
- Estrategias abusivas de Cementerio (Dredge, Reanimator, Greasefang).
- Estrategias muy rápidas (Aggro, Burn).
- Estrategias de control o combo.
- Artefactos/Encantamientos problemáticos.

REGLAS:
1. DEBES generar exactamente 15 cartas en total.
2. TODAS las cartas elegidas deben ser ESTRÍCTAMENTE LEGALES en el formato ${format}. Tienes completamente prohibido inventar o usar cartas de otros formatos.
3. Prioriza la máxima eficiencia de maná y staples del formato (${stapleExamples}).
4. El formato de salida debe ser ESTRICTAMENTE el JSON solicitado. NADA DE TEXTO ADICIONAL.

=== FORMATO ===
{
  "sideboard": [
    { 
      "name": "Nombre de la Carta", 
      "quantity": 3, 
      "category": "Categoría (Instant, Sorcery, Artifact...)", 
      "subCategory": "Elige UNA: Removal, Sweepers, Anti-Aggro, Counters, Anti-Control, Disruption, Graveyard, Artifacts, Lock, Utility",
      "cmc": 1 
    }
  ]
}`;

  const focus = lastFormData?.sideboardFocus || [];
  let focusText = "";
  if (focus.length > 0) {
    focusText = `\n\nEl usuario ha solicitado priorizar el odio contra las siguientes estrategias:\n` +
      focus.map(f => {
        if (f === 'graveyard') return '- Cementerio (Dredge, Reanimator)';
        if (f === 'control') return '- Control y Tempo (Counters, interrupción)';
        if (f === 'aggro') return '- Aggro y Burn (Sweepers, ganancia de vida)';
        if (f === 'combo') return '- Combo, Stax y Artefactos/Encantamientos';
        return '';
      }).filter(Boolean).join('\n') + 
      `\nPor favor, selecciona cartas de banquillo que ataquen fuertemente estas áreas priorizadas.`;
  }

  const userMessage = `Por favor genera un banquillo (15 cartas en total) altamente competitivo para este mazo en formato ${format}.
Colores del mazo: ${(lastFormData?.colores || []).join('-')}
Arquetipo: ${lastFormData?.archetype}
Lista del Main Deck:
${deckList}${focusText}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];

  const responseText = await callAI(messages, aiConfig, { forceJSON: true, maxTokens: 4000 });
  
  try {
    let cleanContent = responseText;
    if (cleanContent.includes('\`\`\`json')) {
      cleanContent = cleanContent.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
    }
    const parsed = JSON.parse(cleanContent);
    let sideCards = parsed.sideboard || [];
    
    // Auto-corrector a 15 cartas
    if (sideCards.length > 0) {
      let total = sideCards.reduce((s, c) => s + (c.quantity || 0), 0);
      if (total !== 15) {
        const diff = 15 - total;
        sideCards[0].quantity = Math.max(1, (sideCards[0].quantity || 0) + diff);
      }
    } else {
      // Fallback seguro universal (legal en Modern y Pioneer)
      sideCards = [
        { name: "Tormod's Crypt", quantity: 4, category: 'Artifact', subCategory: 'Graveyard', cmc: 0 },
        { name: 'Pithing Needle', quantity: 4, category: 'Artifact', subCategory: 'Lock', cmc: 1 },
        { name: 'Duress', quantity: 4, category: 'Sorcery', subCategory: 'Disruption', cmc: 1 },
        { name: 'Negate', quantity: 3, category: 'Instant', subCategory: 'Counters', cmc: 2 }
      ];
    }
    
    return sideCards;
  } catch (e) {
    console.error("Error parseando sideboard de AI:", e);
    throw new Error("El Oráculo no pudo generar el banquillo. Por favor, inténtalo de nuevo.");
  }
}


export async function forgeMazo(formData, aiConfig, onProgress = () => {}) {
  const archetype = formData.archetype || 'midrange';
  let archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype);
  if (!archData) {
    try {
      const dynamicArchs = await getDynamicArchetypes();
      const match = dynamicArchs.find(a => a.value === archetype);
      if (match) {
        archData = {
          id: match.value,
          label: match.label,
          recommendedColors: match.recommendedColors,
          speed: match.speed,
          winTurn: match.winTurn,
          landCount: match.landCount,
          spellCount: match.spellCount,
          description: match.description
        };
      }
    } catch (e) {
      console.warn("Error loading dynamic archetypes in forgeMazo:", e);
    }
  }
  if (!archData) archData = BATTLEBOX_ARCHETYPES[3];
  
  const promptParams = {
    colors: formData.colores || [],
    archetype,
    tribe: formData.tribe,
    strategy: formData.strategy,
    userPrompt: formData.prompt,
    rarityMode: formData.rarityMode || 'standard',
    archData
  };

  // 1. EL ARQUITECTO DE MAZOS UNIFICADO (Ejecución en un solo paso robusto)
  onProgress('strategist', '🧠 Planificando estructura y curva...');
  // Una pequeña pausa para que el usuario aprecie el estado de la UI
  await new Promise(r => setTimeout(r, 600));

  onProgress('assembler', '⚙️ Generando mazo matemáticamente consistente...');

  const unifiedPrompt = buildUnifiedDeckArchitectPrompt(promptParams);
  const finalContent = await callAI([
    { role: 'system', content: unifiedPrompt },
    { role: 'user', content: 'Diseña el mazo completo y estructurado en JSON de acuerdo al esquema.' }
  ], aiConfig, { schema: DECK_SCHEMA, forceJSON: true, maxTokens: 8000 });

  const result = parseArchitectResponse(finalContent);

  // 2. EL JUEZ (Sencillo y Estable)
  onProgress('judge', '⚖️ Validando mazo y restricciones...');
  
  // Veto de Emeritus (la única alucinación que prohibimos por nombre)
  result.cards = (result.cards || []).filter(c => c && c.name && !c.name.includes('Emeritus'));
  
  // Banlist
  const banlistSwaps = [];
  result.cards.forEach(card => {
    if (card && card.name && BATTLEBOX_VETOS.includes(card.name)) {
      const replacement = getIntelligentSubstitution(card.name, card.role);
      if (replacement) {
        banlistSwaps.push({ original: card.name, replacement });
        card.name = replacement;
      }
    }
  });

  // Separar Tierras y Hechizos en el Main Deck
  const BASIC_LAND_NAMES = ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes', 'Llanura', 'Isla', 'Pantano', 'Montaña', 'Bosque'];
  const lands = result.cards.filter(c => {
    if (!c || !c.name) return false;
    const isLand = (c.category && c.category.toLowerCase().includes('land')) || BASIC_LAND_NAMES.some(name => c.name.includes(name));
    return isLand;
  });
  const spells = result.cards.filter(c => !lands.includes(c));

  // Ajuste matemático mínimo para llegar a 60 en el Main Deck
  let currentTotal = [...spells, ...lands].reduce((s, c) => s + (c.quantity || 0), 0);
  
  if (currentTotal > 0 && currentTotal !== 60) {
    const diff = 60 - currentTotal;
    if (spells.length > 0) spells[0].quantity = Math.max(1, (spells[0].quantity || 0) + diff);
    else if (lands.length > 0) lands[0].quantity = Math.max(1, (lands[0].quantity || 0) + diff);
  }

  // Salvaguarda final (Solo si está vacío)
  if (result.cards.length === 0 || [...spells, ...lands].length === 0) {
    console.error("🚨 [JUEZ] Mazo vacío. Aplicando emergencia.");
    result.cards = [
      { name: 'Lightning Bolt', quantity: 20, category: 'Spell', cmc: 1 },
      { name: 'Mountain', quantity: 40, category: 'Land', cmc: 0 }
    ];
  } else {
    result.cards = [...spells, ...lands];
  }

  onProgress('done', '✅ ¡Mazo forjado!');
  return {
    ...result,
    banlistSwaps
  };
}

const DECK_BALANCER_PROMPT = `[SISTEMA DE DOBLE AUDITORÍA DE BATTLE BOX - HIGH FIDELITY]

Eres el Juez Supremo de un ecosistema cerrado de Magic. Tu objetivo es que estos mazos formen una "colección perfecta" donde cualquier mazo pueda ganar a cualquier otro.

FASE 1: AUDITORÍA TÉCNICA (INFRAESTRUCTURA)
- CURVA: El pico DEBE estar en Turno 2. Reduce costes 3-4+ si el mazo es lento.
- INTERACCIÓN: Cada mazo DEBE tener entre 10 y 15 cartas de interacción (Remoción, Counters, Descarte). Si falta, quita las criaturas más débiles y añade interacción eficiente de sus colores.
- CONSISTENCIA Y EXCEPCIONES: Consolida cartas clave en 4x para que el mazo funcione siempre igual. Sin embargo, mantén en 1x o 2x las cartas Legendarias (para evitar atascos) y las cartas MUY SITUACIONALES ("balas de plata").
- MOTORES DE VENTAJA: Todo mazo DEBE tener formas de reponer su mano (robo, filtro, recursión o 2-por-1) para no perder en el 'late-game'.
- BALANCE LENTO VS RÁPIDO: Los mazos muy lentos DEBEN tener interacción temprana (coste 1-2) para sobrevivir a los rápidos. Los mazos rápidos DEBEN tener "alcance" o resiliencia para pelear si la partida se alarga. Cualquiera de los dos debe poder ganar el enfrentamiento.

FASE 2: AUDITORÍA DE ECOSISTEMA (EQUIDAD DE PODER)
- POWER LEVEL: Si un mazo tiene cartas "staples" de Modern demasiado opresivas (ej. Grief, Fury, Oko) y los otros no, rebaja el nivel de esas cartas a alternativas potentes pero justas.
- TRIÁNGULO DE BALANCE: Asegura que el mazo AGGRO sea un reto para CONTROL, que CONTROL domine a MIDRANGE, y que MIDRANGE pueda sobrevivir a AGGRO. 
- INTERACTIVIDAD CRUZADA: Verifica que existan respuestas para las amenazas clave de los otros mazos.
- SIDEBOARD COMO VÁLVULA: Asegura que los banquillos de 15 cartas contengan las respuestas precisas ("silver bullets") para derrotar a las estrategias abusivas de los otros mazos analizados.

REGLA DE ORO: Un mazo equilibrado es aquel que gana por habilidad del jugador, no por tener cartas infinitamente mejores que el oponente.

ESTRUCTURA JSON OBLIGATORIA:
{
  "analysis": "1. Diagnóstico Técnico (Curva/Interacción). 2. Ajustes de Meta (Nivel de poder/Equidad).",
  "adjustments": [
    {
      "deckName": "Nombre exacto",
      "reason": "Por qué este mazo necesitaba ajustes",
      "swaps": [
        { "remove": "Carta", "add": "Carta", "quantity": X, "justification": "Explicación estratégica" }
      ]
    }
  ]
}`;

export async function rebalanceDecks(decks, aiConfig) {
  const decksSummary = decks.map(d => {
    const totalCount = d.cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const colorCode = d.colors && d.colors.length > 0 ? `[${d.colors.join('')}]` : '[Incoloro]';
    return `═══ MAZO: ${d.name} ═══
IDENTIDAD DE COLOR: ${colorCode}
TAMAÑO ACTUAL: ${totalCount} cartas
ARQUETIPO: ${d.archetype || 'N/A'}
ESTRATEGIA: ${d.strategy || 'No definida'}
SINERGIAS: ${d.sinergias_clave || 'No definidas'}
LISTA:
${d.cards.map(c => `${c.quantity}x ${c.name}`).join('\n')}
`;
  }).join('\n\n');

  const messages = [
    { role: 'system', content: DECK_BALANCER_PROMPT },
    { role: 'user', content: `Analiza y equilibra estos ${decks.length} mazos de mi Battle Box. Responde en español con el JSON:\n\n${decksSummary}` }
  ];

  return await callAI(messages, aiConfig, { forceJSON: true, maxTokens: 8000 });
}

export async function suggestCards(deck, aiConfig, aiMetadata = {}, lastFormData = null) {
  let totalCmc = 0;
  let spellCount = 0;
  
  deck.forEach(card => {
    const type = (card.type_line || card.type || '').toLowerCase();
    if (type.includes('land')) return;
    const rawCmc = card.mana_value !== undefined ? card.mana_value : (card.cmc !== undefined ? card.cmc : card.cost);
    const cmc = Number(rawCmc || 0);
    const qty = Number(card.quantity || 1);
    totalCmc += (cmc * qty);
    spellCount += qty;
  });

  const avgCmc = spellCount > 0 ? (totalCmc / spellCount).toFixed(2) : 0;
  const arch = aiMetadata.archetype || lastFormData?.archetype || 'Desconocido';
  const tribe = aiMetadata.tribe || lastFormData?.tribe || 'N/A';
  const strategy = aiMetadata.strategy || lastFormData?.strategy || 'N/A';
  const playerPrompt = lastFormData?.prompt || 'No especificado';
  const playerColors = lastFormData?.colores?.join(', ') || 'No especificado';
  
  const formDataForRag = lastFormData || {
    archetype: aiMetadata.archetype || 'midrange',
    tribe: aiMetadata.tribe || '',
    strategy: aiMetadata.strategy || '',
    colores: aiMetadata.colors || ['W','U','B','R','G']
  };

  let ragPoolText = '';
  try {
    const ragResult = await buildCardPool(formDataForRag);
    if (ragResult && ragResult.pool) {
      ragPoolText = ragResult.pool.slice(0, 120).map(c => `- [${c.category || 'Other'}] ${c.name} (CMC: ${c.mana_value !== undefined ? c.mana_value : (c.cmc || 0)}, Meta: ${c.metaPercent || 0}%, Sinergia: ${c.score || 0})`).join('\n');
    }
  } catch (err) {
    console.warn('No se pudo cargar el card pool RAG para sugerencias del Oráculo:', err);
  }

  const deckList = deck.map(c => `- [${c.category || 'Other'}] ${c.quantity}x ${c.name} (CMC: ${c.mana_value !== undefined ? c.mana_value : (c.cmc || 0)}, Cost: ${c.mana_cost || ''})`).join('\n');
  const ragPoolSection = ragPoolText ? `=== POOL DE CARTAS RECOMENDADAS DE ALTA SINERGIA (RAG ELITE) ===\nPuedes priorizar tus sugerencias eligiendo de estas joyas altamente sinérgicas pre-filtradas:\n${ragPoolText}\n===============================================================` : '';

  const systemPrompt = `Eres el Oráculo Supremo de Sinergias de Magic (Pro Tour Coach).
Tu tarea es sugerir EXACTAMENTE 3 intercambios (swaps) estratégicos e inteligentes para perfeccionar el mazo del usuario, CUMPLIENDO CON PRECISIÓN MATEMÁTICA la estructura original. Inspecciona rigurosamente la 'Meta' (%) y 'Sinergia' (Score) de las cartas RAG Elite recomendadas para fundamentar tus swaps. Todas las cartas sugeridas deben ser estrictamente legales en el formato del mazo.

CONFIGURACIÓN ORIGINAL DEL JUGADOR:
- Tribu / Raza: "${tribe}"
- Estrategia: "${strategy}"
- Instrucción / Lore deseado: "${playerPrompt}"
- Colores permitidos: ${playerColors}

CONTEXTO ACTUAL DEL MAZO:
- Arquetipo: ${arch}
- Coste de Maná Promedio (Hechizos): ${avgCmc}

=== REGLAS INQUEBRANTABLES (EL JUEZ VIRTUAL) ===
1. SUSTITUCIÓN 1:1 EXACTA: Las cartas sugeridas DEBEN mantener la cantidad exacta que se quita. Si sugieres quitar 2 copias, debes añadir exactamente 2 copias. El tamaño del mazo NO PUEDE CAMBIAR.
2. CONSERVACIÓN DE LA CURVA DE MANÁ Y COSTE (REGLA DE ORO VITAL):
   - NUNCA rompas la curva de maná del mazo.
   - El Coste de Maná Convertido (CMC) de la carta nueva entrante DEBE ser exactamente igual, o como máximo variar en ±1 respecto a la carta saliente (privilegiando siempre reducir o mantener el coste).
   - Si retiras un drop 1, la nueva carta debe ser drop 1 o 2. NUNCA sustituyas un drop 1 por un drop 4 o 5.
3. CONSERVACIÓN DEL TIPO DE CARTA Y CATEGORÍA:
   - NUNCA sustituyas Criaturas por Hechizos de No-Criatura (o viceversa) si esto rompe los ratios del arquetipo.
   - Si retiras una carta con categoría 'Creature', la carta entrante de reemplazo DEBE ser obligatoriamente una 'Creature'.
4. INTANGIBLES TRIBALES Y SINERGIA:
   - Si el mazo tiene una tribu o alianza asignada (${tribe}), las criaturas sugeridas DEBEN pertenecer a las razas de ese grupo. NO sugieras criaturas fuera de su tribu.
5. PROHIBICIÓN ABSOLUTA DE TIERRAS Y BANLIST:
   - NUNCA sugieras eliminar, alterar ni reemplazar una Tierra (Land). Las tierras son intocables por el Oráculo.
   - NO sugieras cartas de la lista de vetos casuales: ${BATTLEBOX_VETOS.join(', ')}
6. El campo "cut" debe ser el nombre exacto de una carta de No-Tierra que YA EXISTA en el mazo.
7. El "reason" debe ser conciso, explicando la mejora táctica y cómo se protege la curva de maná.

${ragPoolSection}

Responde EXCLUSIVAMENTE con este JSON:
{
  "suggestions": [
    {
      "name": "Nombre Exacto Nueva Carta",
      "cut": "Nombre Exacto Carta A Quitar",
      "quantity": 2,
      "reason": "Sustituyo [Carta A] (CMC X) por [Carta B] (CMC Y) para fortalecer la sinergia tribal manteniendo intacta la curva de maná."
    }
  ]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Mazo actual:\n${deckList}` }
  ];

  console.log('🔮 Solicitando sugerencias al Oráculo Supremo de Sinergias...');
  const response = await callAI(messages, aiConfig, { forceJSON: true });

  try {
    const jsonBlock = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlock) return JSON.parse(jsonBlock[1]).suggestions;
    const first = response.indexOf('{');
    const last = response.lastIndexOf('}');
    if (first !== -1 && last > first) return JSON.parse(response.substring(first, last + 1)).suggestions;
    return [];
  } catch (e) {
    console.error('Error parseando sugerencias del Oráculo:', e);
    return [];
  }
}

// Evaluación Premium de Mulligan con Inteligencia Artificial
export async function evaluateMulligan(hand, deck, aiConfig) {
  const handList = hand.map(c => `- ${c.name} (CMC: ${c.cmc !== undefined ? c.cmc : (c.mana_value || 0)}, Tipo: ${c.category || 'Other'})`).join('\n');
  const deckList = deck.map(c => `- ${c.quantity || 1}x ${c.name}`).join('\n');

  const systemPrompt = `Eres el Consejero Supremo de Mulligan de Magic: The Gathering (Nivel Pro Tour).
Tu misión es evaluar la mano inicial de 7 cartas del usuario frente a su mazo completo y dictaminar si debe quedarse con la mano ("KEEP") o hacer mulligan ("MULLIGAN").

Analiza rigurosamente:
1. Ratios de tierras/hechizos y jugabilidad en turnos 1 y 2.
2. Requisitos de colores específicos frente a tierras en mano inicial.
3. Velocidad y viabilidad estratégica según el tipo de cartas.

Responde EXCLUSIVAMENTE con el siguiente objeto JSON estructurado:
{
  "recommendation": "KEEP" o "MULLIGAN",
  "confidence": X, // Un número entero entre 0 y 100 indicando el porcentaje de viabilidad de la mano
  "tactical_analysis": "Análisis táctico corto, inmersivo y profesional en español sobre por qué debe quedarse la mano o hacer mulligan, y qué buscar si hace mulligan.",
  "early_plays": ["Nombre Carta 1", "Nombre Carta 2"] // Lista de cartas de la mano que se pueden jugar de forma óptima en turnos 1 y 2
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Mano Inicial:\n${handList}\n\nMazo completo:\n${deckList}` }
  ];

  console.log('🔮 Evaluando mano inicial con el Consejero IA...');
  const response = await callAI(messages, aiConfig, { forceJSON: true });

  try {
    const jsonBlock = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlock) return JSON.parse(jsonBlock[1]);
    const first = response.indexOf('{');
    const last = response.lastIndexOf('}');
    if (first !== -1 && last > first) return JSON.parse(response.substring(first, last + 1));
    return {
      recommendation: "KEEP",
      confidence: 70,
      tactical_analysis: response,
      early_plays: []
    };
  } catch (e) {
    console.error('Error parseando evaluación de Mulligan:', e);
    return {
      recommendation: "KEEP",
      confidence: 50,
      tactical_analysis: "El Oráculo no pudo decodificar el destino con precisión. Analiza tu curva de maná manualmente.",
      early_plays: []
    };
  }
}
