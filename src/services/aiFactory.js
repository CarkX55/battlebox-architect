import { BATTLEBOX_BANLIST, BATTLEBOX_ARCHETYPES } from '../constants/legacyBattleBox';

const PROVIDER_URLS = {
  openai: 'https://api.openai.com/v1/chat/completions',
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  anthropic: 'https://api.anthropic.com/v1/messages',
  gemini: 'https://generativelanguage.googleapis.com/v1beta'
};

const DECK_ARCHITECT_SYSTEM_PROMPT = `Eres el Arquitecto Supremo de Mazos para el formato "Legacy Battle Box (Casual)".
Tu objetivo es diseñar mazos altamente sinérgicos, INTERACTIVOS y equilibrados para jugar entre 3 amigos usando proxies.

POOL DE CARTAS: Todas las cartas legales en Legacy (desde Alpha hasta hoy).
RESTRICCIÓN DE IP: EXCLUIR cartas de "Universes Beyond" (Fallout, Warhammer, Dr. Who, El Señor de los Anillos, Transformers, Spider-Man, Universus, etc.). Mantente fiel ÚNICAMENTE a la propiedad intelectual original de Magic: The Gathering. ESTA REGLA SE APLICA TANTO AL MAIN DECK COMO AL SIDEBOARD - NO uses ninguna carta de universos alternativos en ninguna parte del mazo.
IMPORTANTE: NO se aplica la banlist oficial de Legacy. Se aplica la CUSTOM BANLIST de este formato.

FILOSOFÍA DEL FORMATO:
1. INTERACTIVIDAD OBLIGATORIA: Todo mazo debe poder responder y ser respondido.
2. REGLA DEL TURNO 4: Ningún mazo puede ganar consistentemente antes del turno 4.
3. MANÁ PAGADO: Prohibido maná gratis (moxes, rituales, tierras de 2 manas).
4. SIN HECHIZOS GRATIS: Prohibido lanzar hechizos sin pagar su coste de maná.

REGLAS DE COHERENCIA Y SINERGIA:
1. MOTOR PRINCIPAL: Identifica el "Core Engine" del arquetipo (ej: en Enchantress son las cartas que roban por cada encantamiento) e inclúyelo obligatoriamente.
2. CURVA DE MANÁ FUNCIONAL: La mayoría de las cartas deben tener coste de maná 1, 2 y 3. Las de coste 4+ deben ser finishers.
3. CONSISTENCIA: Usa mayoritariamente 4 copias para las piezas clave del motor.
4. COHESIÓN: Cada carta debe ayudar al plan de victoria de {archetype}. Si no ayuda, no la incluyas.
5. SIN COPIAS SUELTAS (REGLA ESTRICTA): 
   - En el MAIN DECK: NUNCA uses quantity: 1 a menos que la carta sea legendaria (type_line contiene "Legendary") o una pieza única que funcione por sí misma (ej: The One Ring, Jace, Teferi, etc.).
   - En el SIDEBOARD: Máximos permitidos: quantity 1-2 solo para respuestas específicas. Justifica cualquier quantity: 1.
   - PREFERENCIA: Siempre usa 4 copias de las cartas clave del motor.
   - Esta regla aplica tanto al MAIN DECK como al SIDEBOARD.

DIRECTRICES DE CONSTRUCCIÓN (DENSIDAD DE CRIATURAS):
- AGGRO/TRIBU: 20–28 criaturas.
- MIDRANGE: 14–20 criaturas de alto valor.
- TEMPO: 8–14 amenazas eficientes.
- CONTROL/COMBO/PRISIÓN: Mínimo 4–8 criaturas finishers.
- NUNCA generes un mazo con menos de 4 criaturas.

RESTRICCIONES ESTRICTAS (CUSTOM BANLIST):
Cartas prohibidas: ${BATTLEBOX_BANLIST.join(', ')}.

ESPECIFICACIONES TÉCNICAS:
- ARQUETIPO: {archetype}
- VELOCIDAD: {speed}
- TURNO DE VICTORIA: {winTurn}
- PLAN: {description}
- COLORES: {colors}

ESTRUCTURA DEL JSON (MANDATORIO):
Proporciona exactamente 36-38 cartas (Hechizos + Criaturas) para el Main Deck y exactamente 15 para el Sideboard.
El Sideboard debe ser ESTRATÉGICO: incluye respuestas contra cementerios, artefactos, mazos muy rápidos o mazos de control extremo según las debilidades de tu arquetipo.

{
  "deckName": "Nombre Épico",
  "archetype": "{archetype}",
  "lore": "Descripción temática",
  "strategy": "Cómo pilotar el mazo principal",
  "mulligan": "Qué manos mantener",
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
  const { colors, archetype, tribe, userPrompt } = params;

  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  
  let prompt = DECK_ARCHITECT_SYSTEM_PROMPT
    .replace(/{archetype}/g, archData.label)
    .replace(/{speed}/g, archData.speed)
    .replace(/{winTurn}/g, archData.winTurn)
    .replace(/{description}/g, archData.description)
    .replace(/{colors}/g, colors.join('-'));

  prompt += `\n\nPARÁMETROS ADICIONALES:\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Detalles: ${userPrompt}`;
  
  return prompt;
}


export async function callAI(messages, config, options = {}) {
  const { provider, apiKey, selectedModel, baseUrl } = config;
  const { forceJSON = false, maxTokens = 4000 } = options;
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
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.1,
        responseMimeType: 'application/json'
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

  console.log(`🤖 Llamando a ${provider}/${selectedModel} (JSON: ${forceJSON}, tokens: ${maxTokens})`);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error de ${provider}: ${response.status} - ${error}`);
  }

  const data = await response.json();

  if (provider === 'gemini') {
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  return data.choices?.[0]?.message?.content || '';
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
  
  try {
    const jsonMatch = content.match(/\{[\s\S]*"cards"\s*:\s*\[[\s\S]*\][\s\S]*\}/m);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
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
    
    return defaultResult;
  } catch (e) {
    console.error('Error parseando respuesta:', e);
    return defaultResult;
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

export async function forgeMazo(formData, aiConfig) {
  const format = "BATTLEBOX";
  const archetype = formData.archetype || 'midrange';
  
  console.log('🔥 Forjando mazo Battle Box:', { colors: formData.colores, archetype });
  
  const systemPrompt = buildDeckArchitectPrompt({
    colors: formData.colores,
    archetype,
    tribe: formData.tribe,
    userPrompt: formData.prompt
  });
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: formData.prompt }
  ];
  
  console.log('📜 Enviando a IA...');
  const content = await callAI(messages, aiConfig);
  console.log('📥 Respuesta recibida');
  
  const result = parseArchitectResponse(content);
  
  const totalCards = result.cards.reduce((sum, c) => sum + c.quantity, 0);
  console.log(`✅ ${result.cards.length} entradas, ${totalCards} copias`);
  
  // Validación flexible para Battle Box (34-42 hechizos para un mazo de 60)
  if (totalCards < 34 || totalCards > 42) {
    console.warn(`⚠️ Aviso: La IA generó ${totalCards} cartas. Lo ideal son ~36 para dejar espacio a tierras.`);
  }
  
  return result;
}

const DECK_BALANCER_PROMPT = `[SISTEMA DE AUDITORÍA MTG]
OBLIGATORIO: Respuesta en JSON puro.

REGLAS MATEMÁTICAS:
1. TARGET_SIZE = 60.
2. AJUSTE: Si Tamaño > 60, eliminar (Tamaño - 60) cartas.
3. COLOR_PURGE: Eliminar cualquier carta fuera de la Identidad de Color.
4. COPIAS: Máximo 4 copias por nombre.

ESTRUCTURA JSON:
{
  "analysis": "Cálculo: [Total] -> [Eliminadas] -> [Final 60]",
  "adjustments": [
    {
      "deckName": "Nombre",
      "swaps": [
        { "remove": "Carta", "add": "", "quantity": X }
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
