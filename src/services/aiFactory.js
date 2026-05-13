import { BATTLEBOX_BANLIST, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, BANLIST_SUBSTITUTIONS } from '../constants/legacyBattleBox';

const PROVIDER_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta'
};

const STRATEGIST_MATH_SYSTEM_PROMPT = `Eres el Estratega-Matemático de Mazos para el formato "Legacy Battle Box (Casual)".
Tu trabajo es DOBLE: 1) Investigar las mejores cartas, y 2) Planificar las cantidades exactas.
NO generas JSON. Escribes un plan de texto con cantidades.

POOL DE CARTAS: Todas las legales en Legacy. EXCLUIR "Universes Beyond".
CARTAS ESTRICTAMENTE PROHIBIDAS (NO las incluyas): [ \${BATTLEBOX_BANLIST.join(', ')} ].
FILOSOFÍA "FAIR MAGIC": No One-Card Combos, No Infect, No Annihilator, No "Gana el juego", No maná gratis.

PROCESO:
1. INVESTIGA las mejores 15-20 cartas para la estrategia. Si hay tribu, FIDELIDAD TRIBAL ABSOLUTA.
2. PLANIFICA cantidades: Las core a 4x. Legendarias/balas de plata a 1-2x. Interacción: 10-15 cartas.
3. SUMA EXACTA: {spellCount} hechizos + {landCount} tierras = 60 cartas main deck.

ESCRIBE TU PLAN ASÍ:
HECHIZOS ({spellCount} cartas):
- 4x Nombre (rol)
- 3x Nombre (rol)
...
TIERRAS ({landCount} cartas):
- Fetchlands (máx 4 total), Duals, Shocks, Básicas
SIDEBOARD (15 cartas):
- 2x Nombre (contra qué arquetipo)

VERIFICA QUE LA SUMA SEA EXACTA.`;

const DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el Ensamblador Supremo de Mazos para el formato "Legacy Battle Box (Casual)".
Tu objetivo es diseñar mazos altamente sinérgicos, INTERACTIVOS y equilibrados para jugar entre 3 amigos usando proxies.

POOL DE CARTAS: Todas las cartas legales en Legacy (desde Alpha hasta hoy).
RESTRICCIÓN DE IP: EXCLUIR cartas de "Universes Beyond" (Fallout, Warhammer, Dr. Who, El Señor de los Anillos, Transformers, Spider-Man, Universus, etc.). Mantente fiel ÚNICAMENTE a la propiedad intelectual original de Magic: The Gathering. ESTA REGLA SE APLICA TANTO AL MAIN DECK COMO AL SIDEBOARD.
IMPORTANTE: NO se aplica la banlist oficial de Legacy. Se aplica la CUSTOM BANLIST de este formato.

FILOSOFÍA DEL FORMATO ("FAIR MAGIC" ESTRICTO):
1. INTERACTIVIDAD OBLIGATORIA: Todo mazo debe poder responder y ser respondido. PROHIBIDAS las "One-Card Combos" y amenazas intocables (ej. True-Name Nemesis, Hexproof masivo, Thassa's Oracle).
2. REGLA DEL TURNO 4: Ningún mazo puede ganar consistentemente antes del turno 4.
3. CERO MANÁ RÁPIDO INJUSTO: Totalmente prohibido el maná gratis y los aceleradores rotos (Moxes, Dark Ritual, Sol Ring, Ancient Tomb, City of Traitors, Grim Monolith).
4. MECÁNICAS "ANTIDEPORTIVAS" PROHIBIDAS: No utilices cartas con las siguientes mecánicas que arruinan la diversión casual:
   - INFECT (Infectar) / VENENO: No incluyas ninguna carta que use contadores de veneno.
   - ANNIHILATOR (Aniquilador): No incluyas Eldrazis con Aniquilador.
   - VICTORIAS INSTANTÁNEAS: Prohibido cualquier efecto de "gana el juego" o "el oponente pierde el juego".
   - MANIPULACIÓN DE VIDA EXTREMA: Prohibido poner la vida a un número fijo (ej. Master of Cruelties, Sorin Markov).
5. VICTORIAS POR SINERGIA: Los "Finishers" deben requerir sinergia, montaje en mesa o estrategia.

MANUAL DE ARQUITECTURA (INFRAESTRUCTURA Y DENSIDAD):
Eres un arquitecto. El mazo no es una suma de cartas buenas, es una máquina con "slots" matemáticos:
- DENSIDAD DE CRIATURAS: Aggro (24-28 bajas), Midrange (15-20 alto impacto), Tempo (8-14 eficientes), Control/Prisión/Combo (4-8 finishers o piezas clave).
- DENSIDAD DE INTERACCIÓN (LA REGLA 10-15): Todo mazo (especialmente Midrange y Control) DEBE incluir entre 10 y 15 cartas de interacción (Remoción, Counters, Descarte, Edictos) para sobrevivir hasta su Turno Fundamental. Un mazo sin interacción es un mazo fallido.
- CURVA DE MANÁ (EL PICO EN 2): En Legacy, el turno 2 es el núcleo. Maximiza jugadas de coste 1 y 2. Evita amontonar cartas de coste 3. Los costes 4+ deben ser Finishers absolutos.

BASE DE MANÁ (HIGH FIDELITY):
Eres el responsable absoluto de diseñar la base de maná. No uses tierras básicas aleatorias si el mazo exige colores complejos.
- Utiliza la proporción perfecta de Fetchlands, Shocklands, Dual Lands (si aplica) y tierras de utilidad (Wasteland, Karakas, etc.).
- LÍMITE DE FETCHLANDS: Dado que es un entorno Casual, el mazo NO PUEDE contener más de 4 Fetchlands (tierras que pagas 1 vida y sacrificas para buscar) en total. Rellena la fijación de maná con Shocklands, Duals, Checklands, Fastlands o Tierras Básicas.
- Asegura que la cantidad de tierras (usualmente 19-24) se ajuste perfectamente a la curva de maná de Karsten.

REGLA CRÍTICA MATEMÁTICA Y DE CONSISTENCIA (OBLIGATORIA):
- MAIN DECK: El mazo DEBE tener EXACTAMENTE 60 cartas en total.
- DIVISIÓN ESTRICTA: Tu mazo DEBE contener EXACTAMENTE {landCount} tierras y EXACTAMENTE {spellCount} hechizos.
- CONSISTENCIA: Está PROHIBIDO usar "quantity": 1 o "quantity": 2 para cartas genéricas. Si es parte de tu plan principal, pon 4 copias. 
- EXCEPCIONES: Usa 1 o 2 copias SOLO para cartas Legendarias, Finishers de coste altísimo, o cartas que por sí solas sean el núcleo sinérgico absoluto del mazo. NUNCA pongas una criatura de bajo coste a 1 copia por rellenar.
- PUREZA TRIBAL Y ALIANZAS: Si el usuario te indica una Tribu pura (ej. Vampiros), mantén la fidelidad tribal al 100% y no incluyas otras razas. Si el usuario indica una "Alianza" o "Sindicato" (ej. "Forajidos (Asesinos, Mercenarios...)", "Ejército (Humanos, Soldados...)"), TUS CRIATURAS DEBEN PERTENECER EXCLUSIVAMENTE a esas razas indicadas, combinándolas libremente para maximizar la sinergia. NOTA PARA NAGAS: Puedes incluir "Snakes".
- SIDEBOARD: Debe tener EXACTAMENTE 15 cartas. Aquí SÍ puedes usar 1-2 copias.


❌ RESTRICCIÓN ABSOLUTA Y FATAL (CUSTOM BANLIST) ❌:
BAJO NINGUNA CIRCUNSTANCIA, POR NINGÚN MOTIVO, puedes incluir NINGUNA de las siguientes cartas. Si incluyes tan solo una de estas cartas, el sistema colapsará y fallarás tu tarea como Arquitecto. Revisa tu lista final antes de enviarla.
CARTAS ESTRICTAMENTE PROHIBIDAS: ${BATTLEBOX_BANLIST.join(', ')}.

ESPECIFICACIONES TÉCNICAS:
- ARQUETIPO: {archetype}
- VELOCIDAD: {speed}
- TURNO DE VICTORIA: {winTurn}
- PLAN: {description}
- COLORES: {colors}

IDIOMA OBLIGATORIO: Todos los textos descriptivos (\`deckName\`, \`lore\`, \`strategy\`, \`mulligan\`, \`sideboard_strategy\`) DEBEN estar estrictamente escritos en ESPAÑOL con un tono inmersivo, épico y estratégico. ÚNICAMENTE los nombres de las cartas (\`name\`) deben mantenerse en Inglés exacto para su correcta búsqueda.

ESTRUCTURA DEL JSON (MANDATORIO):
Proporciona EXACTAMENTE 60 cartas en total (Sumando Hechizos + Criaturas + TODAS LAS TIERRAS) para el Main Deck y exactamente 15 para el Sideboard.
El Sideboard debe ser ESTRATÉGICO: incluye respuestas contra cementerios, artefactos, mazos muy rápidos o mazos de control extremo según las debilidades de tu arquetipo.

{
  "deckName": "Nombre Épico",
  "archetype": "{archetype}",
  "lore": "Descripción temática",
  "strategy": "Cómo pilotar el mazo principal",
  "mulligan": "Qué manos mantener basándose en la curva de maná de Karsten",
  "sideboard_strategy": "Explicación técnica de por qué has elegido estas 15 cartas de sideboard y contra qué arquetipos usarlas",
  "pip_balance": { "W": 10, "U": 0, "B": 20, "R": 0, "G": 30 },
  "cards": [
    { "name": "Exact English Name", "quantity": 4, "category": "Creature|Instant|Sorcery|Artifact|Enchantment" }
  ],
  "sideboard": [
    { "name": "Exact English Name", "quantity": 2 }
  ]
}`;

export function buildDeckArchitectPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode } = params;

  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  
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
    .replace(/{speed}/g, archData.speed)
    .replace(/{winTurn}/g, archData.winTurn)
    .replace(/{description}/g, archData.description)
    .replace(/{colors}/g, colors.join('-'))
    .replace(/{landCount}/g, archData.landCount || 24)
    .replace(/{spellCount}/g, archData.spellCount || 36);

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = '\nREGLA DE POTENCIA: "Alta Potencia". Eres libre de usar tantas cartas Raras y Míticas como desees para maximizar el poder del mazo. SIN EMBARGO, cada carta mítica o de alto poder DEBE tener una sinergia directa y lógica con el arquetipo, la tribu y el prompt del usuario. No incluyas "cartas buenas por ser buenas" si no encajan directamente en la estrategia y el motor principal del mazo.';
      break;
    case 'pauper':
      rarityRule = '\nREGLA DE POTENCIA: "Pauper". TODAS las cartas del mazo principal y banquillo (excepto tierras básicas) DEBEN haber sido impresas como COMUNES alguna vez en la historia de Magic. Ninguna rara ni infrecuente. No incluyas "cartas buenas por ser buenas" si no encajan directamente en la estrategia y el motor principal del mazo.';
      break;
    case 'artisan':
      rarityRule = '\nREGLA DE POTENCIA: "Artisan". TODAS las cartas elegidas deben ser de rareza COMÚN o INFRECUENTE. No se permite ninguna carta Rara ni Mítica. No incluyas "cartas buenas por ser buenas" si no encajan directamente en la estrategia y el motor principal del mazo.';
      break;
    case 'standard':
    default:
      rarityRule = '\nREGLA DE POTENCIA: "Estándar". Busca un equilibrio razonable. No incluyas "cartas buenas por ser buenas" si no encajan directamente en la estrategia y el motor principal del mazo.';
      break;
  }

  prompt += `\n\nPARÁMETROS ADICIONALES (OBLIGATORIOS):\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Enfoque Estratégico y Mecánico: ${strategyMechanics}\n- Detalles e Instrucciones del Jugador: ${userPrompt}${rarityRule}`;
  
  return prompt;
}

export function buildStrategistMathPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode } = params;
  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  const landCount = archData.landCount || 24;
  const spellCount = archData.spellCount || 36;
  
  let prompt = STRATEGIST_MATH_SYSTEM_PROMPT
    .replace(/{spellCount}/g, spellCount)
    .replace(/{landCount}/g, landCount);

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power': rarityRule = 'Poder Alto (Raras/míticas permitidas si sinergizan)'; break;
    case 'pauper': rarityRule = 'Pauper (SOLO cartas comunes)'; break;
    case 'artisan': rarityRule = 'Artisan (Solo comunes e infrecuentes)'; break;
    default: rarityRule = 'Estándar (equilibrado)'; break;
  }

  prompt += `\n\n=== REQUISITOS DEL MAZO ===\n- Arquetipo: ${archData.label}\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Estrategia: ${strategy || 'N/A'}\n- Nivel de Rareza: ${rarityRule}\n- Hechizos: ${spellCount} | Tierras: ${landCount}\n- Deseos del Usuario: ${userPrompt}\n\nINVESTIGA LAS CARTAS Y PLANIFICA LAS CANTIDADES AHORA:`;
  return prompt;
}

export async function callAI(messages, config, options = {}) {
  const { provider, apiKey, selectedModel, baseUrl } = config;
  const { forceJSON = false, maxTokens = 8000, onRetry = null } = options;
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
        temperature: 0.1,
        ...(forceJSON ? { responseMimeType: 'application/json' } : {})
      }
    };
  } else {
    url = PROVIDER_URLS[provider] || PROVIDER_URLS.openai;
    body = {
      model: selectedModel,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      ...(forceJSON ? { response_format: { type: 'json_object' } } : {})
    };
  }

  // --- RETRY CON BACKOFF EXPONENCIAL AGRESIVO (para APIs gratuitas con "high demand") ---
  const MAX_RETRIES = 5; 
  const BASE_DELAY = 8000; // 8 segundos base para dar tiempo a que el modelo se libere

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    console.log(`🤖 Llamando a ${provider}/${selectedModel} (JSON: ${forceJSON}, tokens: ${maxTokens})${attempt > 0 ? ` [Reintento ${attempt}/${MAX_RETRIES}]` : ''}`);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isRetryable = [429, 500, 503, 504].includes(response.status) || 
                         errorText.toLowerCase().includes('high demand') || 
                         errorText.toLowerCase().includes('overloaded') || 
                         errorText.toLowerCase().includes('resource exhausted') ||
                         errorText.toLowerCase().includes('quota');
      
      if (isRetryable && attempt < MAX_RETRIES) {
        // Backoff exponencial + Jitter (variación aleatoria) para evitar colisiones
        const jitter = Math.random() * 2000;
        const delay = (BASE_DELAY * Math.pow(2, attempt)) + jitter;
        
        const retryMsg = `⚠️ [Intento ${attempt+1}] ${provider} saturado (${response.status}). Reintentando en ${Math.round(delay/1000)}s...`;
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
    sideboard: [],
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
    if (parsed && parsed.cards && parsed.cards.length > 0) {
      return {
        deckName: parsed.deckName || 'Unnamed Deck',
        archetype: parsed.archetype || 'midrange',
        lore: parsed.lore || '',
        strategy: parsed.strategy || '',
        mulligan: parsed.mulligan || '',
        pipBalance: parsed.pip_balance || null,
        cards: parsed.cards || [],
        sideboard: parsed.sideboard || []
      };
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
        cards: parsed.cards || [],
        sideboard: parsed.sideboard || []
      };
    }
    
    throw new Error('La IA no devolvió un formato de mazo JSON válido.');
  } catch (e) {
    console.error('❌ Error fatal parseando respuesta del Arquitecto:', e);
    console.log('Contenido problemático:', cleanContent.substring(0, 500) + '...');
    throw new Error('La IA falló al estructurar el mazo. Esto puede pasar si el tipo de mazo es muy complejo (como un Combo). Intenta simplificar la idea o inténtalo de nuevo.');
  }
}

export async function generateDeckTactics(deck, aiConfig) {
  const deckList = deck.cards.map(c => `${c.quantity}x ${c.name}`).join('\n');
  
  const systemPrompt = `Eres un Pro-Player de Legacy. Genera una guía táctica institucional para un mazo.
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

export async function forgeMazo(formData, aiConfig, onProgress = () => {}) {
  const archetype = formData.archetype || 'midrange';
  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  const reqLands = archData.landCount || 24;
  const reqSpells = archData.spellCount || 36;
  
  console.log('🔥 Forjando mazo Battle Box:', { colors: formData.colores, archetype, reqLands, reqSpells, rarityMode: formData.rarityMode });

  const promptParams = {
    colors: formData.colores,
    archetype,
    tribe: formData.tribe,
    strategy: formData.strategy,
    userPrompt: formData.prompt,
    rarityMode: formData.rarityMode || 'standard'
  };

  // ═══════════════════════════════════════════════════════════════
  // PASO 1: EL ESTRATEGA-MATEMÁTICO — Investiga cartas + Planifica cantidades
  // ═══════════════════════════════════════════════════════════════
  onProgress('strategist', '🧠 Investigando cartas y calculando proporciones...');
  const strategistPrompt = buildStrategistMathPrompt(promptParams);
  
  console.log('🧠 [PASO 1/3] Consultando al Estratega-Matemático...');
  const masterPlan = await callAI([
    { role: 'system', content: strategistPrompt },
    { role: 'user', content: 'Investiga las mejores cartas y planifica las cantidades exactas ahora.' }
  ], aiConfig, { 
    forceJSON: false, 
    maxTokens: 4000,
    onRetry: (num, wait, status) => onProgress('strategist', `⚠️ API Ocupada (${status}). Reintento ${num}/5 en ${Math.round(wait/1000)}s...`)
  });
  console.log('📋 [PASO 1/3] Plan estratégico-matemático recibido:', masterPlan.substring(0, 120) + '...');

  // ⏳ Pausa de cortesía prolongada para APIs gratuitas (evitar rate limit de TPM)
  console.log('⏳ Pausa de seguridad (8s) para liberar cuota de tokens...');
  await new Promise(r => setTimeout(r, 8000));

  // ═══════════════════════════════════════════════════════════════
  // PASO 2: EL ENSAMBLADOR — Genera el JSON final
  // ═══════════════════════════════════════════════════════════════
  onProgress('assembler', '⚙️ Ensamblando el código del mazo...');
  const assemblerPrompt = buildDeckArchitectPrompt(promptParams);

  console.log('⚙️ [PASO 2/3] Enviando al Ensamblador JSON...');
  const finalContent = await callAI([
    { role: 'system', content: assemblerPrompt },
    { role: 'user', content: `El Estratega-Matemático ha preparado este plan con cartas y cantidades exactas:\n\n${masterPlan}\n\nConvierte este plan EXACTO a formato JSON. Respeta las cantidades. Main deck = 60 cartas, Sideboard = 15 cartas.` }
  ], aiConfig, { 
    forceJSON: true, 
    maxTokens: 6000,
    onRetry: (num, wait, status) => onProgress('assembler', `⚠️ API Saturada (${status}). Reintento ${num}/5 en ${Math.round(wait/1000)}s...`)
  });
  console.log('📥 [PASO 2/3] JSON de mazo recibido');

  const result = parseArchitectResponse(finalContent);

  // ═══════════════════════════════════════════════════════════════
  // PASO 3: EL JUEZ — JavaScript (Banlist + Fetchlands + Matemáticas)
  // ═══════════════════════════════════════════════════════════════
  onProgress('judge', '⚖️ El Juez audita las reglas...');
  console.log('⚖️ [PASO 3/3] El Juez JS entra en acción...');

  // --- 4A: AUTO-SWAP DE BANLIST ---
  const banlistSwaps = [];
  const swapBannedCard = (card) => {
    if (BATTLEBOX_BANLIST.includes(card.name)) {
      const replacement = BANLIST_SUBSTITUTIONS[card.name];
      if (replacement) {
        console.log(`🚫 [JUEZ] Carta prohibida detectada: "${card.name}" → Reemplazada por "${replacement}"`);
        banlistSwaps.push({ original: card.name, replacement });
        card.name = replacement;
      } else {
        console.warn(`🚫 [JUEZ] Carta prohibida SIN sustituto: "${card.name}" — Eliminada`);
        card.quantity = 0;
        banlistSwaps.push({ original: card.name, replacement: '(eliminada)' });
      }
    }
  };

  result.cards.forEach(swapBannedCard);
  if (result.sideboard) result.sideboard.forEach(swapBannedCard);
  result.cards = result.cards.filter(c => c.quantity > 0);
  if (result.sideboard) result.sideboard = result.sideboard.filter(c => c.quantity > 0);

  if (banlistSwaps.length > 0) {
    console.log(`⚖️ [JUEZ] ${banlistSwaps.length} carta(s) prohibida(s) corregida(s) automáticamente.`);
  }

  // --- 4B: SEPARAR TIERRAS Y HECHIZOS ---
  const lands = result.cards.filter(c => 
    c.category && (c.category.toLowerCase().includes('land') || c.category.toLowerCase().includes('tierra'))
  );
  const spells = result.cards.filter(c => !lands.includes(c));
  
  let landSum = lands.reduce((sum, c) => sum + c.quantity, 0);
  let spellSum = spells.reduce((sum, c) => sum + c.quantity, 0);

  console.log(`⚖️ [JUEZ] Auditando Matemáticas → Tierras: ${landSum}/${reqLands} | Hechizos: ${spellSum}/${reqSpells}`);

  // --- 4C: FIX HECHIZOS ---
  if (spellSum !== reqSpells && spells.length > 0) {
    if (spellSum > reqSpells) {
      let diff = spellSum - reqSpells;
      for (let i = 0; i < diff; i++) {
        const target = spells.find(s => s.quantity > 2) || spells.find(s => s.quantity > 1) || spells[0];
        if (target) target.quantity -= 1;
      }
    } else {
      let diff = reqSpells - spellSum;
      for (let i = 0; i < diff; i++) {
        const target = spells.find(s => s.quantity === 3) || spells.find(s => s.quantity === 2) || spells.find(s => s.quantity < 4 && s.quantity > 1) || spells[0];
        if (target) target.quantity += 1;
      }
    }
  }

  // --- 4D: FIX FETCHLANDS (Hard Limit of 4) ---
  const FETCHLANDS = ["Flooded Strand", "Polluted Delta", "Bloodstained Mire", "Wooded Foothills", "Windswept Heath", "Marsh Flats", "Scalding Tarn", "Verdant Catacombs", "Arid Mesa", "Misty Rainforest"];
  
  let fetchlandCount = 0;
  lands.forEach(l => { if (FETCHLANDS.includes(l.name)) fetchlandCount += l.quantity; });

  if (fetchlandCount > 4) {
    let excess = fetchlandCount - 4;
    for (let i = 0; i < lands.length; i++) {
      if (FETCHLANDS.includes(lands[i].name) && excess > 0) {
        let toRemove = Math.min(lands[i].quantity, excess);
        lands[i].quantity -= toRemove;
        excess -= toRemove;
      }
    }
    const pips = result.pip_balance || {};
    const sortedColors = Object.keys(pips).sort((a, b) => (pips[b] || 0) - (pips[a] || 0));
    const c1 = sortedColors[0] || 'W';
    const c2 = sortedColors[1] || 'U';
    const basicMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest', 'C': 'Wastes' };
    let replacementName = basicMap[c1] || 'Plains';
    
    if (pips[c2] && pips[c2] > 0) {
      const DUALS = {
        'WU': 'Tundra', 'UW': 'Tundra', 'UB': 'Underground Sea', 'BU': 'Underground Sea',
        'BR': 'Badlands', 'RB': 'Badlands', 'RG': 'Taiga', 'GR': 'Taiga',
        'GW': 'Savannah', 'WG': 'Savannah', 'WB': 'Scrubland', 'BW': 'Scrubland',
        'UR': 'Volcanic Island', 'RU': 'Volcanic Island', 'BG': 'Bayou', 'GB': 'Bayou',
        'RW': 'Plateau', 'WR': 'Plateau', 'GU': 'Tropical Island', 'UG': 'Tropical Island'
      };
      const SHOCKLANDS = {
        'WU': 'Hallowed Fountain', 'UW': 'Hallowed Fountain', 'UB': 'Watery Grave', 'BU': 'Watery Grave',
        'BR': 'Blood Crypt', 'RB': 'Blood Crypt', 'RG': 'Stomping Ground', 'GR': 'Stomping Ground',
        'GW': 'Temple Garden', 'WG': 'Temple Garden', 'WB': 'Godless Shrine', 'BW': 'Godless Shrine',
        'UR': 'Steam Vents', 'RU': 'Steam Vents', 'BG': 'Overgrown Tomb', 'GB': 'Overgrown Tomb',
        'RW': 'Sacred Foundry', 'WR': 'Sacred Foundry', 'GU': 'Breeding Pool', 'UG': 'Breeding Pool'
      };
      const pair = c1 + c2;
      const dualName = DUALS[pair];
      const shockName = SHOCKLANDS[pair];
      const dualInDeck = lands.find(l => l.name === dualName);
      const shockInDeck = lands.find(l => l.name === shockName);
      
      if (dualName && (!dualInDeck || dualInDeck.quantity < 4)) {
        replacementName = dualName;
      } else if (shockName && (!shockInDeck || shockInDeck.quantity < 4)) {
        replacementName = shockName;
      }
    }

    let target = lands.find(l => l.name === replacementName);
    if (target) {
      target.quantity += (fetchlandCount - 4);
    } else {
      lands.push({ name: replacementName, quantity: (fetchlandCount - 4), category: 'Land' });
    }
    console.log(`⚖️ [JUEZ] Fetchlands excesivas (${fetchlandCount}). Reducidas a 4, compensadas con ${replacementName}.`);
  }

  // --- 4E: FIX TIERRAS (General sum fix) ---
  landSum = lands.reduce((sum, c) => sum + c.quantity, 0);
  if (landSum !== reqLands) {
    const pips = result.pip_balance || {};
    const bestColor = Object.keys(pips).sort((a, b) => (pips[b] || 0) - (pips[a] || 0))[0] || 'W';
    const basicMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest', 'C': 'Wastes' };
    const basicName = basicMap[bestColor] || 'Plains';

    if (landSum > reqLands && lands.length > 0) {
      let diff = landSum - reqLands;
      for (let i = 0; i < diff; i++) {
        const target = lands.find(s => s.quantity > 2) || lands.find(s => s.quantity > 1) || lands[0];
        if (target) target.quantity -= 1;
      }
    } else {
      let diff = reqLands - landSum;
      let basicTarget = lands.find(l => l.name === basicName);
      if (basicTarget) {
        basicTarget.quantity += diff;
      } else {
        lands.push({ name: basicName, quantity: diff, category: 'Land' });
      }
    }
  }

  // --- ENSAMBLAR RESULTADO FINAL ---
  result.cards = [...spells, ...lands].filter(c => c.quantity > 0);
  result.banlistSwaps = banlistSwaps;
  
  const finalTotal = result.cards.reduce((sum, c) => sum + c.quantity, 0);
  console.log(`✅ [JUEZ] Resultado Final: ${finalTotal} cartas (Hechizos: ${spells.reduce((s, c) => s + c.quantity, 0)}, Tierras: ${lands.reduce((s, c) => s + c.quantity, 0)})`);
  if (banlistSwaps.length > 0) console.log(`⚖️ [JUEZ] Correcciones de banlist:`, banlistSwaps);
  
  onProgress('done', '✅ ¡Mazo forjado!');
  return result;
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
- POWER LEVEL: Si un mazo tiene cartas "staples" de Legacy demasiado opresivas (ej. Ragavan, Mana Drain) y los otros no, rebaja el nivel de esas cartas a alternativas potentes pero justas.
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
  
  const deckList = deck.map(c => `${c.quantity}x ${c.name}`).join('\n');
  const systemPrompt = `Eres un asesor experto en Magic (Legacy Casual).
Tu tarea es sugerir EXACTAMENTE 3 intercambios (swaps) que mejorarían la sinergia, la curva de maná o la interacción del mazo, CUMPLIENDO PRIMERO la configuración original que pidió el usuario a la forja.

CONFIGURACIÓN ORIGINAL DEL JUGADOR:
- Tribu / Raza: "${tribe}"
- Estrategia: "${strategy}"
- Instrucción / Lore deseado: "${playerPrompt}"
- Colores forzados: ${playerColors}

CONTEXTO ACTUAL DEL MAZO:
- Arquetipo: ${arch}
- Coste de Maná Promedio (Hechizos): ${avgCmc}
*Si la curva actual es muy alta para el arquetipo (ej. >2.2 en Aggro, >2.8 en Midrange, >3.2 en Control), tus sugerencias DEBEN enfocarse en reducir el coste. Si es muy baja, sugiere mayor impacto.*

RESTRICCIONES ESTRICTAS (JUEZ VIRTUAL):
1. SUSTITUCIÓN 1:1 EXACTA: Las cartas sugeridas DEBEN mantener la cantidad exacta que se quita. Si sugieres quitar 3 copias, debes añadir 3 copias. El tamaño del mazo NO PUEDE CAMBIAR.
2. IDENTIDAD DE ARQUETIPO: NUNCA sustituyas Criaturas por Hechizos (o viceversa) si esto va a romper la receta del arquetipo. Protege los ratios del mazo.
3. FIDELIDAD TRIBAL O ALIANZA: Si el mazo tiene una tribu o alianza asignada (${tribe}), las criaturas sugeridas DEBEN pertenecer a las razas indicadas en ese grupo. NO sugieras criaturas ajenas a ese grupo, incluso si son "staples". Si no hay tribu, mantén la consistencia.
4. VARIEDAD Y CREATIVIDAD: Busca en toda la historia de Magic. NO sugieras siempre las mismas cartas genéricas o staples aburridas; encuentra gemas ocultas que sinergicen perfectamente con la tribu o estrategia.
5. LEGALIDAD: NO sugieras cartas de la Banlist: ${BATTLEBOX_BANLIST.join(', ')}
5. El campo "cut" debe ser el nombre exacto de una carta que YA EXISTA en el mazo.
6. El "reason" debe ser extremadamente corto y estratégico.

Responde EXCLUSIVAMENTE con este JSON:
{
  "suggestions": [
    {
      "name": "Nombre Exacto Nueva",
      "cut": "Nombre Exacto A Quitar",
      "quantity": 2,
      "reason": "Para mejorar la sinergia [Tribu/Estrategia], he sustituido [Carta A] (xN) por [Carta B] (xN) porque [Razón táctica corta]."
    }
  ]
}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Mazo actual:\n${deckList}` }
  ];

  console.log('🔮 Solicitando sugerencias al Oráculo...');
  const response = await callAI(messages, aiConfig, { forceJSON: true });

  
  try {
    const jsonBlock = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlock) return JSON.parse(jsonBlock[1]).suggestions;
    const first = response.indexOf('{');
    const last = response.lastIndexOf('}');
    if (first !== -1 && last > first) return JSON.parse(response.substring(first, last + 1)).suggestions;
    return [];
  } catch (e) {
    console.error('Error parseando sugerencias:', e);
    return [];
  }
}
