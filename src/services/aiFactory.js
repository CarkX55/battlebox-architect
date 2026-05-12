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
- Asegura que la cantidad de tierras (usualmente 19-24) se ajuste perfectamente a la curva de maná de Karsten.

REGLA CRÍTICA MATEMÁTICA (OBLIGATORIA):
- MAIN DECK: El mazo DEBE tener EXACTAMENTE 60 cartas en total.
- DIVISIÓN ESTRICTA: Tu mazo DEBE contener EXACTAMENTE {landCount} tierras (mezcla de básicas, duals, fetchlands, utilidad) y EXACTAMENTE {spellCount} hechizos/criaturas/artefactos. Si no sumas exactamente 60 con esta división, el mazo fallará.
- CONSISTENCIA: Está prohibido usar "quantity": 1 o "quantity": 2 para cartas no legendarias clave. Si es parte de tu plan, pon 3 o 4 copias.
- EXCEPCIONES: Usa 1 o 2 copias SOLO para cartas Legendarias, Finishers de altísimo coste o "Balas de Plata".
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

  prompt += `\n\nPARÁMETROS ADICIONALES:\n- Colores: ${colors.join('-')}\n- Tribu: ${tribe || 'N/A'}\n- Estrategia Mecánica: ${strategy || 'N/A'}\n- Detalles: ${userPrompt}${rarityRule}`;
  
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
  
  console.log('🔥 Forjando mazo Battle Box:', { colors: formData.colores, archetype, rarityMode: formData.rarityMode });
  
  const systemPrompt = buildDeckArchitectPrompt({
    colors: formData.colores,
    archetype,
    tribe: formData.tribe,
    strategy: formData.strategy,
    userPrompt: formData.prompt,
    rarityMode: formData.rarityMode || 'standard'
  });
  
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: formData.prompt }
  ];
  
  console.log('📜 [PASADA 1] Enviando a IA (Borrador)...');
  const draftContent = await callAI(messages, aiConfig);
  console.log('📥 [PASADA 1] Borrador recibido, iniciando Inspector...');

  const archData = BATTLEBOX_ARCHETYPES.find(a => a.id === archetype) || BATTLEBOX_ARCHETYPES[3];
  const reqLands = archData.landCount || 24;
  const reqSpells = archData.spellCount || 36;

  const inspectorPrompt = `Eres un Juez Inspector Estricto. Revisa el siguiente JSON de mazo de Magic.
Tus ÚNICAS misiones son:
1. MATEMÁTICA ESTRICTA (MAIN DECK): El mazo DEBE tener EXACTAMENTE ${reqLands} tierras y EXACTAMENTE ${reqSpells} hechizos (sumando un total de 60 cartas). Si los hechizos ("Creature", "Instant", "Sorcery", "Artifact", "Enchantment") no suman ${reqSpells}, recorta o añade copias. Si las tierras ("Land") no suman ${reqLands}, añade o quita tierras básicas hasta cuadrar EXACTAMENTE ese número.
2. MATEMÁTICA (SIDEBOARD): Suma el "sideboard". Si no son exactamente 15, arréglalo.
3. FAIR MAGIC Y BANLIST: Es tu deber sagrado auditar la legalidad. Si encuentras ALGUNA de las cartas de esta lista, DEBES reemplazarla por otra justa de Legacy que cumpla el mismo rol:
[ ${BATTLEBOX_BANLIST.join(', ')} ]
También reemplaza CUALQUIER carta con mecánicas de Infectar, Aniquilador, "Gana el juego" o "Vida total se convierte en".
Devuelve ÚNICAMENTE el JSON corregido con la misma estructura. No añadas texto fuera del JSON.`;

  const messagesPass2 = [
    { role: 'system', content: inspectorPrompt },
    { role: 'user', content: draftContent }
  ];

  console.log('🔍 [PASADA 2] Enviando a Inspector de IA...');
  const finalContent = await callAI(messagesPass2, aiConfig, { forceJSON: true });
  console.log('📥 [PASADA 2] Mazo pulido recibido');
  
  const result = parseArchitectResponse(finalContent);
  
  // --- JUEZ MATEMÁTICO EN JAVASCRIPT (EL DICTADOR FINAL) ---
  // A veces la IA devuelve 'Lands' en vez de 'Land' o lo mezcla
  const lands = result.cards.filter(c => 
    c.category && (c.category.toLowerCase().includes('land') || c.category.toLowerCase().includes('tierra'))
  );
  const spells = result.cards.filter(c => !lands.includes(c));
  
  let landSum = lands.reduce((sum, c) => sum + c.quantity, 0);
  let spellSum = spells.reduce((sum, c) => sum + c.quantity, 0);

  console.log(`⚖️ [JUEZ JS] Auditando Matemáticas -> Tierras: ${landSum}/${reqLands} | Hechizos: ${spellSum}/${reqSpells}`);

  // FIX SPELLS
  if (spellSum !== reqSpells && spells.length > 0) {
    if (spellSum > reqSpells) {
      let diff = spellSum - reqSpells;
      spells.sort((a, b) => b.quantity - a.quantity);
      for (let i = 0; i < diff; i++) {
        const target = spells.find(s => s.quantity > 1) || spells[0];
        target.quantity -= 1;
      }
    } else {
      let diff = reqSpells - spellSum;
      spells.sort((a, b) => b.quantity - a.quantity);
      for (let i = 0; i < diff; i++) {
        const target = spells.find(s => s.quantity < 4) || spells[0];
        target.quantity += 1;
      }
    }
  }

  // FIX LANDS
  if (landSum !== reqLands) {
    const pips = result.pip_balance || {};
    const bestColor = Object.keys(pips).sort((a, b) => (pips[b] || 0) - (pips[a] || 0))[0] || 'W';
    const basicMap = { 'W': 'Plains', 'U': 'Island', 'B': 'Swamp', 'R': 'Mountain', 'G': 'Forest', 'C': 'Wastes' };
    const basicName = basicMap[bestColor] || 'Plains';

    if (landSum > reqLands && lands.length > 0) {
      let diff = landSum - reqLands;
      lands.sort((a, b) => b.quantity - a.quantity);
      for (let i = 0; i < diff; i++) {
        const target = lands.find(s => s.quantity > 1 && s.name.includes(basicMap['W']) || s.name.includes(basicMap['U']) || s.name.includes(basicMap['B']) || s.name.includes(basicMap['R']) || s.name.includes(basicMap['G'])) || lands.find(s => s.quantity > 1) || lands[0];
        target.quantity -= 1;
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

  // Ensamblar de nuevo limpiando las cartas de cantidad 0
  result.cards = [...spells, ...lands].filter(c => c.quantity > 0);
  const finalTotal = result.cards.reduce((sum, c) => sum + c.quantity, 0);
  console.log(`✅ [JUEZ JS] Resultado Forzado: ${finalTotal} cartas (Hechizos: ${spells.reduce((s, c)=>s+c.quantity,0)}, Tierras: ${lands.reduce((s, c)=>s+c.quantity,0)})`);
  
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
