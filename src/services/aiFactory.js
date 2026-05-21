import { BATTLEBOX_BANLIST, BATTLEBOX_ARCHETYPES, MTG_STRATEGIES, BANLIST_SUBSTITUTIONS, getIntelligentSubstitution } from '../constants/legacyBattleBox.js';
import { buildCardPool } from './ragService.js';

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
SIDEBOARD (15 cartas): Cantidades exactas.`;

const DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el CONSTRUCTOR DE JSON. 
Convierte el plan en un objeto JSON.

=== REGLAS OBLIGATORIAS ===
- Debes devolver exactamente {spellCount} hechizos en el array "cards".
- Debes devolver exactamente {landCount} tierras en el array "cards".
- NUNCA pongas 60 tierras. Si el plan es pobre, rellena con cartas potentes y sinérgicas de Modern.

=== FORMATO ===
{
  "deckName": "...",
  "cards": [ {"name": "Carta", "count": 4, "type": "...", "cmc": 1} ],
  "sideboard": [ ... ]
}`;

export const DECK_SCHEMA = {
  type: "OBJECT",
  properties: {
    deckName: { type: "STRING" },
    archetype: { type: "STRING" },
    lore: { type: "STRING" },
    strategy: { type: "STRING" },
    mulligan: { type: "STRING" },
    pip_balance: {
      type: "OBJECT",
      properties: {
        W: { type: "INTEGER" },
        U: { type: "INTEGER" },
        B: { type: "INTEGER" },
        R: { type: "INTEGER" },
        G: { type: "INTEGER" },
        C: { type: "INTEGER" }
      },
      required: ["W", "U", "B", "R", "G", "C"]
    },
    cards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "INTEGER" },
          category: { type: "STRING" },
          cmc: { type: "INTEGER" }
        },
        required: ["name", "quantity", "category", "cmc"]
      }
    },
    sideboard: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "INTEGER" },
          category: { type: "STRING" },
          cmc: { type: "INTEGER" }
        },
        required: ["name", "quantity", "category", "cmc"]
      }
    }
  },
  required: ["deckName", "archetype", "lore", "strategy", "mulligan", "pip_balance", "cards", "sideboard"]
};

const UNIFIED_DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el MAESTRO ARQUITECTO DE MAZOS DE MODERN CASUAL (BATTLE BOX 1VS1).
Tu misión es diseñar un mazo temático, altamente competitivo dentro de la equidad de Battle Box, consistente y matemáticamente perfecto en un solo paso. Todas las cartas sugeridas deben ser legales en el formato Modern.

=== REGLAS TÉCNICAS E INFRAESTRUCTURA (ESQUELETO FUNCIONAL) ===
1. TAMAÑO Y SLOTS REQUERIDOS:
   - El mazo principal debe contener EXACTAMENTE 60 cartas en total: {spellCount} Hechizos (no tierras) y {landCount} Tierras.
   - Debes rellenar el array "cards" con hechizos y tierras que cumplan con este total.
   - El banquillo ("sideboard") debe contener EXACTAMENTE 15 cartas de respuesta táctica ("silver bullets") contra estrategias abusivas.

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

4. LA FÓRMULA DE MANÁ KARSTEN (90% DE PROBABILIDAD EN CURVA):
   - Evita el "Mana Screw". Para lanzar hechizos en curva:
     * Hechizo de coste C (ej. U o G) en Turno 1 -> Requiere 14 fuentes del color.
     * Hechizo de coste 1C en Turno 2 -> Requiere 13 fuentes.
     * Hechizo de coste CC (ej. UU o BB) en Turno 2 -> Requiere 21 fuentes.
     * Hechizo de coste 1CC en Turno 3 -> Requiere 18 fuentes.
     * Hechizo de coste 3CC en Turno 5 -> Requiere 15 fuentes.
   - REGLA DE TOLERANCIA DE PIPS:
     * En mazos de 3 o más colores, PROHIBIDO incluir cartas de triple coste específico (ej: RRR, WWW, BBB).
     * En mazos de 2 colores, solo se permiten cartas de doble coste específico (ej: 1UU) si ese es el color principal del mazo.

5. IDENTIDAD MECÁNICA Y "ANSWERS" POR COLOR EN MODERN:
   - BLANCO: Exilio Universal (Path to Exile, Prismatic Ending, Leyline Binding), protección (Ephemerate), criaturas Flying/Vigilance.
   - AZUL: Counters (Counterspell, Spell Pierce, Mana Leak), Cantrips (Consider, Preordain, Opt), criaturas Flying/Hexproof.
   - NEGRO: Remoción Letal (Fatal Push, Bitter Triumph, Cut Down), descarte (Inquisition of Kozilek, Thoughtseize), criaturas Deathtouch/Lifelink.
   - ROJO: Daño directo (Lightning Bolt, Unholy Heat), robo impulsivo, criaturas Prowess/Haste.
   - VERDE: Fight/Bite (remoción de criaturas), destrucción de artefactos/encantamientos, criaturas Trample/Reach.

6. VETO ABSOLUTO (BANLIST):
   - NUNCA incluyas "Emeritus of Conflict" o "Emeritus of Truce" bajo ninguna circunstancia. Está estrictamente prohibido.
   - Evita incluir cartas de la Banlist: {banlist}.

=== DETALLES TEMÁTICOS Y ENFOQUE ===
- Raza/Tribu principal: {tribe}
- Enfoque Estratégico: {strategy}
- Riqueza/Potencia: {rarityMode}
- Lore/Trasfondo: {userPrompt}

Debes rellenar todos los campos del JSON y cumplir escrupulosamente con los totales numéricos.`;

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
    .replace(/{strategy}/g, strategy || 'N/A')
    .replace(/{tribe}/g, tribe || 'N/A')
    .replace(/{colors}/g, colors.join('-'))
    .replace(/{landCount}/g, archData.landCount || 24)
    .replace(/{spellCount}/g, archData.spellCount || 36);

  let blueprintFocus = "";
  if (archetype === 'aggro-puro' || archetype === 'aggro-sinergico') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Prioriza costes 1 y 2. Mínimo 12 cartas de coste 1-2.";
  } else if (archetype === 'midrange') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Curva equilibrada. Máximo 8 cartas de coste 4+. Prioriza el 2x1.";
  } else if (archetype === 'control') {
    blueprintFocus = "\nFOCUS ARQUITECTURA: Máximo 4 criaturas. El resto deben ser respuestas y ventaja de cartas.";
  }

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = '\nREGLA DE POTENCIA: "Alta Potencia". Usa las mejores versiones de cada carta (Raras/Míticas) siempre que encajen en el motor.';
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
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode } = params;
  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
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
    case 'high-power': rarityRule = 'Poder Alto (Raras/míticas permitidas si sinergizan)'; break;
    case 'pauper': rarityRule = 'Pauper (SOLO cartas comunes)'; break;
    case 'artisan': rarityRule = 'Artisan (Solo comunes e infrecuentes)'; break;
    default: rarityRule = 'Estándar (equilibrado)'; break;
  }

  let blueprintFocus = "";
  if (archetype === 'aggro-puro' || archetype === 'aggro-sinergico') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Prioriza costes 1 y 2. Mínimo 12 cartas de coste 1-2.";
  } else if (archetype === 'midrange') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Curva equilibrada. Máximo 8 cartas de coste 4+. Prioriza el 2x1.";
  } else if (archetype === 'control') {
    blueprintFocus = "\n- FOCUS ARQUITECTURA: Máximo 4 criaturas. El resto deben ser respuestas y ventaja de cartas.";
  }

  prompt += `\n\n=== REQUISITOS DEL MAZO ===\n- Arquetipo: ${archData.label}\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Estrategia: ${strategy || 'N/A'}\n- Nivel de Rareza: ${rarityRule}${blueprintFocus}\n- Hechizos: ${spellCount} | Tierras: ${landCount}\n- Deseos del Usuario: ${userPrompt}\n\nINVESTIGA LAS CARTAS Y PLANIFICA LAS CANTIDADES AHORA:`;
  return prompt;
}

export function buildUnifiedDeckArchitectPrompt(params) {
  const { colors, archetype, tribe, strategy, userPrompt, rarityMode } = params;

  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
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
    .replace(/{banlist}/g, BATTLEBOX_BANLIST.join(', '));

  let rarityRule = '';
  switch(rarityMode) {
    case 'high-power':
      rarityRule = 'Alta Potencia (Raras y Míticas de alto impacto permitidas).';
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
        ...(forceJSON || options.schema ? { responseMimeType: 'application/json' } : {}),
        ...(options.schema ? { responseSchema: options.schema } : {})
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
          cards: deckCards,
          sideboard: parsed.sideboard || []
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
        cards: parsed.cards || parsed.mainDeck || [],
        sideboard: parsed.sideboard || []
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

export async function forgeMazo(formData, aiConfig, onProgress = () => {}) {
  const archetype = formData.archetype || 'midrange';
  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  
  const promptParams = {
    colors: formData.colores || [],
    archetype,
    tribe: formData.tribe,
    strategy: formData.strategy,
    userPrompt: formData.prompt,
    rarityMode: formData.rarityMode || 'standard'
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
  if (result.sideboard) {
    result.sideboard = result.sideboard.filter(c => c && c.name && !c.name.includes('Emeritus'));
  }
  
  // Banlist
  const banlistSwaps = [];
  result.cards.forEach(card => {
    if (card && card.name && BATTLEBOX_BANLIST.includes(card.name)) {
      const replacement = getIntelligentSubstitution(card.name, card.role);
      if (replacement) {
        banlistSwaps.push({ original: card.name, replacement });
        card.name = replacement;
      }
    }
  });

  if (result.sideboard) {
    result.sideboard.forEach(card => {
      if (card && card.name && BATTLEBOX_BANLIST.includes(card.name)) {
        const replacement = getIntelligentSubstitution(card.name, card.role);
        if (replacement) {
          card.name = replacement;
        }
      }
    });
  }

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

  // Ajuste matemático del banquillo a 15 cartas
  if (result.sideboard && result.sideboard.length > 0) {
    let sideTotal = result.sideboard.reduce((s, c) => s + (c.quantity || 0), 0);
    if (sideTotal !== 15) {
      const diff = 15 - sideTotal;
      result.sideboard[0].quantity = Math.max(1, (result.sideboard[0].quantity || 0) + diff);
    }
  } else {
    // Si el sideboard está vacío, rellenamos con 15 cartas genéricas de banquillo
    result.sideboard = [
      { name: 'Relic of Progenitus', quantity: 4, category: 'Artifact', cmc: 1 },
      { name: 'Pithing Needle', quantity: 4, category: 'Artifact', cmc: 1 },
      { name: 'Red Elemental Blast', quantity: 4, category: 'Instant', cmc: 1 },
      { name: 'Pyroblast', quantity: 3, category: 'Instant', cmc: 1 }
    ];
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
   - NO sugieras cartas de la Banlist: ${BATTLEBOX_BANLIST.join(', ')}
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
