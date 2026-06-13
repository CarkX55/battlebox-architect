// src/services/ragService.js
import { getBlueprint } from '../constants/blueprintTemplates.js';
import { MTG_TRIBES, MTG_STRATEGIES, PARASITIC_RULES, inferStrategyFromArchetype } from '../constants/legacyBattleBox.js';
import { getAllCards } from './dbIngestor.js';
import { loadMetaFromDB } from './mtgtop8Service.js';

let cachedObsidianGraph = null;

/**
 * Carga el Grafo Semántico pre-compilado de Obsidian de forma dinámica en el navegador.
 * Proporciona un mecanismo ultra-seguro con fallback si el JSON no existe o falla.
 */
const loadObsidianGraph = async () => {
  if (cachedObsidianGraph) return cachedObsidianGraph;
  try {
    if (typeof window === 'undefined') {
      // Entorno Node (scripts/tests): leer del sistema de archivos local
      const fs = await import('fs');
      const path = await import('path');
      const graphPath = path.resolve('public/data/synergy_graph.json');
      if (fs.existsSync(graphPath)) {
        cachedObsidianGraph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
        console.log(`📊 [Obsidian RAG - Node] Grafo semántico cargado desde archivo local.`);
        return cachedObsidianGraph;
      }
    } else {
      // Entorno Browser: usar fetch
      const response = await fetch('/data/synergy_graph.json');
      if (response.ok) {
        cachedObsidianGraph = await response.json();
        console.log(`📊 [Obsidian RAG - Browser] Grafo semántico cargado con éxito. Compilado el: ${new Date(cachedObsidianGraph.compileDate).toLocaleString()}`);
        return cachedObsidianGraph;
      }
    }
  } catch (err) {
    console.warn(`⚠️ [Obsidian RAG] No se pudo cargar el grafo semántico (/data/synergy_graph.json). Usando fallbacks competitivos estándar.`, err);
  }
  return null;
};

/**
 * Escanea el texto y type_line de la carta en busca de palabras clave.
 * Asume que text ya está en minúsculas para mayor rendimiento.
 */
const countKeywords = (lowerText, keywordsLower) => {
  if (!lowerText) return 0;
  let count = 0;
  for (let i = 0; i < keywordsLower.length; i++) {
    if (lowerText.includes(keywordsLower[i])) {
      count++;
    }
  }
  return count;
};

const FORMAT_STAPLES = {
  STANDARD: new Set([
    "sheoldred, the apocalypse", "bloodtithe harvester", "fable of the mirror-breaker", 
    "make disappear", "go for the throat", "cut down", "wandering emperor", 
    "wedding announcement", "raffine, scheming seer", "atraxa, grand unifier",
    "deep-cavern bat", "preacher of the schism", "no more lies", "sunfall",
    "slickshot show-off", "gix, yawgmoth praetor", "temporary lockdown", "cruel somnophage",
    "haughty djinn", "urabrask's forge", "glissa sunslayer", "mosswood dreadknight",
    "tishana's tidebinder", "lightning helix", "get lost", "virtue of loyalty",
    "virtue of persistence", "duress", "archangel of wrath", "delighted halfling",
    "cavern of souls", "zoetic slipstream", "elspeth's smite", "intrusive packbeast"
  ]),
  PIONEER: new Set([
    // White
    "the wandering emperor", "portable hole", "march of otherworldly light", "thalia, guardian of thraben", "adeline, resplendent cathar", 
    "brave the elements", "brutal cathar", "lay down arms", "rest in peace", "temporary lockdown", "get lost", "no more lies",
    // Blue
    "opt", "consider", "treasure cruise", "dig through time", "spell pierce", "mystical dispute", "make disappear", 
    "ledger shredder", "thing in the ice", "shark typhoon", "memory deluge", "deduce", "sleight of hand",
    // Black
    "fatal push", "thoughtseize", "sheoldred, the apocalypse", "bloodtithe harvester", "vein ripper", "go for the throat", 
    "graveyard trespasser", "sorin, imperious bloodlord", "waste not", "duress", "dreadbore", "cut down", "path of peril",
    // Red
    "fable of the mirror-breaker", "bonecrusher giant", "fiery impulse", "play with fire", "lightning axe", "monastery swiftspear", 
    "soul-scar mage", "kumano faces kakkazan", "chandra, torch of defiance", "roiling vortex", "rending volley", "arclight phoenix",
    // Green
    "llanowar elves", "elvish mystic", "cavalier of thorns", "storm the festival", "wolfwillow haven", "scavenging ooze", 
    "questing beast", "pick your poison", "sylvan caryatid", "old-growth troll", "polukranos reborn",
    // Multicolor
    "teferi, hero of dominaria", "supreme verdict", "kroxa, titan of death's hunger", "niv-mizzet reborn", "greasefang, okiba boss", 
    "spell queller", "abrupt decay", "assassin's trophy", "amalia benavides aguirre", "bloodtithe harvester",
    // Colorless / Lands
    "karn, the great creator", "nykthos, shrine to nyx", "unlicensed hearse", "smuggler's copter", "pithing needle", 
    "damping sphere", "esika's chariot", "mutavault"
  ]),
  MODERN: new Set([
    // White
    "solitude", "stoneforge mystic", "the wandering emperor", "prismatic ending", 
    "fateful absence", "leyline binding", "esper sentinel", "thalia, guardian of thraben",
    "adeline, resplendent cathar", "leonin warleader", "giver of runes", "path to exile",
    "elspeth, sun's champion", "wedding announcement", "cathar commando", "skyclave apparition",
    // Blue
    "counterspell", "archmage's charm", "subtlety", "snapcaster mage", "murktide regent",
    "delver of secrets", "ledger shredder", "the watcher in the water", "hullbreaker horror",
    "shark typhoon", "force of negation", "cryptic command", "spell pierce", "preordain",
    "consider", "opt", "jace, the mind sculptor", "brazen borrower", "tishana's tidebinder",
    // Black
    "fatal push", "thoughtseize", "inquisition of kozilek", "orcish bowmasters", "grief",
    "dauthi voidwalker", "sheoldred, the apocalypse", "necron deathmark", "toxrill, the corrosive",
    "archon of cruelty", "hero's downfall", "bitterblossom", "damnation", "toxic deluge",
    "yawgmoth, thran physician", "cut down", "bloodchief's thirst",
    // Red
    "lightning bolt", "ragavan, nimble pilferer", "monastery swiftspear", "fury",
    "dragon's rage channeler", "fable of the mirror-breaker", "unholy heat", "seasoned pyromancer",
    "krenko, mob boss", "goldspan dragon", "chandra, torch of defiance", "laelia, the blade reforged",
    "bonecrusher giant", "goblin guide", "play with fire",
    // Green
    "tarmogoyf", "noble hierarch", "ignoble hierarch", "endurance", "primeval titan",
    "questing beast", "birds of paradise", "llanowar elves", "elvish mystic", "utopia sprawl",
    "scute swarm", "craterhoof behemoth", "tireless tracker", "scavenging ooze", "elder gargaroth",
    "beast within", "heroic intervention",
    // Multicolor
    "supreme verdict", "teferi, time raveler", "teferi, hero of dominaria", "koma, cosmos serpent",
    "expressive iteration", "kolaghan's command", "prismari command", "wrenn and six",
    "unholy heat", "dreadbore", "assassin's trophy", "abrupt decay", "growth spiral", 
    "coiling oracle", "rogue refiner", "bloodbraid elf", "siege rhino", "voice of resurgence",
    // Colorless & Artifacts
    "aether vial", "shadowspear", "wurmcoil engine", "karn, the great creator", "smuggler's copter",
    "umezawa's jitte", "sword of feast and famine", "sword of fire and ice", "mind stone", 
    "talisman of progress", "talisman of dominance", "talisman of indulgence", "talisman of impulse",
    "talisman of unity", "talisman of hierarchy", "talisman of creativity", "talisman of conviction",
    "talisman of curiosity", "talisman of resilience", "solemn simulacrum", "batterskull"
  ]),
  LEGACY: new Set([
    "brainstorm", "ponder", "force of will", "daze", "wasteland", "swords to plowshares",
    "orcish bowmasters", "grief", "entomb", "reanimate", "show and tell", "delver of secrets",
    "chalice of the void", "murktide regent", "dark ritual", "lotus petal", "lion's eye diamond"
  ])
};


/**
 * Filtra y califica la inmensa base de datos para extraer un pool de élite.
 * @param {Object} formData Datos del formulario (arquetipo, tribu, colores, etc).
 * @returns {Promise<Object>} Promesa con el blueprint y las mejores 150-200 cartas.
 */
// Helper para matchear queries de Scryfall semánticas (Fase 3)
function matchesSearchQuery(card, query) {
  if (!query) return false;
  const terms = query.toLowerCase().split(/\s+/);
  const typeLine = (card.type_line || '').toLowerCase();
  const oracleText = (card.oracle_text || '').toLowerCase();
  const cardName = (card.name || '').toLowerCase();
  
  for (const term of terms) {
    if (!term) continue;
    if (term.startsWith('t:')) {
      const type = term.slice(2).trim();
      if (!typeLine.includes(type)) return false;
    } else if (term.startsWith('o:')) {
      const text = term.slice(2).replace(/['"]/g, '').trim();
      if (!oracleText.includes(text)) return false;
    } else if (term.startsWith('function:') || term.startsWith('oracletag:')) {
      const tag = term.split(':')[1].trim();
      if (tag === 'removal') {
        const isRemoval = oracleText.includes('destroy') || oracleText.includes('exile') || oracleText.includes('damage') || typeLine.includes('removal');
        if (!isRemoval) return false;
      } else if (tag === 'board-wipe') {
        const isWipe = oracleText.includes('destroy all') || oracleText.includes('exile all') || oracleText.includes('board wipe');
        if (!isWipe) return false;
      } else if (tag === 'draw') {
        const isDraw = oracleText.includes('draw a card') || oracleText.includes('draw two cards') || oracleText.includes('look at the top') || oracleText.includes('scry');
        if (!isDraw) return false;
      } else if (tag === 'ramp') {
        const isRamp = oracleText.includes('add ') || oracleText.includes('search your library for a land');
        if (!isRamp) return false;
      } else if (tag === 'counterspell') {
        const isCounter = oracleText.includes('counter target');
        if (!isCounter) return false;
      }
    } else {
      if (!cardName.includes(term) && !typeLine.includes(term) && !oracleText.includes(term)) {
        return false;
      }
    }
  }
  return true;
}

export const buildCardPool = async (formData) => {
  const allCards = await getAllCards();
  const blueprint = getBlueprint(formData.archetype);
  const blueprintRoles = formData.blueprintRoles || blueprint?.roles || [];
  
  // Cargar Grafo Semántico pre-compilado de Obsidian
  const obsidianGraph = await loadObsidianGraph();
  
  // Obtener el formato seleccionado para legalidad dinámica
  const selectedFormat = (formData.format || 'MODERN').toUpperCase();
  const formatKey = selectedFormat.toLowerCase();
  
  const excludedNames = (formData.excludedNames || []).filter(n => typeof n === 'string').map(n => n.toLowerCase());
  const injectedCoreNames = (formData.injectedCoreNames || []).filter(n => typeof n === 'string');
  
  // Cargar datos de metagame del formato para scoring dinámico y coocurrencias
  const metaProfile = loadMetaFromDB(selectedFormat);
  const metaStaples = metaProfile?.staples || {};
  const metaSynergies = metaProfile?.synergies || {};

  // Extraer Pilares del Arquetipo (Locales) o del Formato (Dinámicos)
  const archetypeKeyForPillars = (formData.archetype || '').toLowerCase();
  const localPillars = [];
  if (obsidianGraph && obsidianGraph.archetypes && obsidianGraph.archetypes[archetypeKeyForPillars]) {
    const archCards = obsidianGraph.archetypes[archetypeKeyForPillars].cards || [];
    localPillars.push(...archCards.slice(0, 5).map(c => c.name.toLowerCase()));
  }

  const dynamicPillars = Object.entries(metaStaples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);

  const activePillars = localPillars.length >= 3 ? localPillars : dynamicPillars;

  // Normalizar e inferir Tribu
  let normalizedTribe = (formData.tribe || '').toLowerCase();
  if (!normalizedTribe && formData.archetype) {
    const archLower = formData.archetype.toLowerCase();
    const knownTribes = ['elf', 'sliver', 'goblin', 'merfolk', 'zombie', 'vampire', 'human', 'faerie', 'eldrazi', 'spirit', 'soldier', 'knight', 'wizard', 'cleric', 'rogue', 'shaman', 'druid', 'ninja', 'angel', 'demon', 'dragon', 'dinosaur', 'elemental'];
    const matchedTribe = knownTribes.find(t => archLower.includes(t) || (t === 'elf' && archLower.includes('elves')) || (t === 'faerie' && archLower.includes('faeries')) || (t === 'goblin' && archLower.includes('goblins')));
    if (matchedTribe) {
      normalizedTribe = matchedTribe;
    }
  }

  // Extraer información de Tribu y Estrategia para bonus extra
  let tribeData = MTG_TRIBES.find(t => 
    t.id.toLowerCase() === normalizedTribe || 
    t.label.toLowerCase() === normalizedTribe ||
    (t.subtypes && t.subtypes.some(sub => normalizedTribe.includes(sub.toLowerCase())))
  ) || null;
  
  let strategyId = formData.strategy || '';
  strategyId = inferStrategyFromArchetype(formData.archetype, strategyId);
  const strategyData = MTG_STRATEGIES.find(s => s.id === strategyId || s.label === strategyId) || null;
  
  // Respetamos los colores elegidos por el usuario de forma prioritaria
  const allowedColors = (formData.colores && formData.colores.length > 0) 
    ? formData.colores 
    : (tribeData ? tribeData.colors : ['W','U','B','R','G']);
  
  console.log(`[RAG] Iniciando filtrado para ${formData.archetype} con estrategia ${strategyId} en formato ${selectedFormat}... Total DB: ${allCards.length}`);
 
  let creaturesPool = [];
  let spellsPool = [];

  // Pre-calcular arrays en minúsculas para countKeywords
  // Determinación Dinámica del Nivel de Pureza Tribal
  let purityLevel = 'standard';
  if (tribeData) {
    const tribeLower = tribeData.id.toLowerCase();
    if (tribeLower.includes('sliver')) {
      purityLevel = 'strict';
    } else if (strategyId === 'ramp' || strategyId === 'reanimator' || strategyId === 'combo') {
      purityLevel = 'hybrid';
    }
  }

  const blueprintBoostLower = (blueprint.ragModifiers?.boost || []).map(k => k.toLowerCase());
  const blueprintPenaltyLower = (blueprint.ragModifiers?.penalty || []).map(k => k.toLowerCase());
  const urKeywords = ['instant', 'sorcery', 'prowess', 'magecraft', 'draw', 'damage'].map(k => k.toLowerCase());
  const bgKeywords = ['graveyard', 'dredge', 'delirium', 'return from your graveyard', 'deathtouch', 'destroy'].map(k => k.toLowerCase());
  const wuKeywords = ['exile', 'return to its owner\'s hand', 'enters the battlefield', 'flying', 'flash'].map(k => k.toLowerCase());
  const brKeywords = ['sacrifice', 'discard', 'spectacle', 'madness', 'graveyard', 'loses life'].map(k => k.toLowerCase());
  const guKeywords = ['flash', 'draw a card', 'counter', 'proliferate', 'landfall', 'kicker'].map(k => k.toLowerCase());
  const wgKeywords = ['token', 'enchantment', 'aura', 'populate', 'convoke', 'counter'].map(k => k.toLowerCase());
  const wrKeywords = ['equipment', 'double strike', 'attack', 'valiant', 'red creature', 'white creature'].map(k => k.toLowerCase());
  const wbKeywords = ['lifelink', 'gain life', 'drain', 'sacrifice', 'loses life', 'exile target'].map(k => k.toLowerCase());
  const ubKeywords = ['graveyard', 'draw', 'counter', 'mill', 'surveil', 'flash'].map(k => k.toLowerCase());
  const rgKeywords = ['haste', 'trample', 'power 4 or greater', 'riot', 'fight'].map(k => k.toLowerCase());
  const taxKeywords = [
    'costs', 'unless', 'pay', 'additional cost', 'more to cast', 'tax', 
    'can\'t cast', 'can\'t attack', 'can\'t block', 'can\'t search', 'can\'t library',
    'limit', 'instead', 'only one', 'skip', 'doesn\'t untap', 'exile', 'graveyard',
    'enters the battlefield tapped', 'no more than', 'ghostly prison',
    'damping', 'deafening', 'rule of law', 'canonist', 'sentinel', 'thalia', 'magistrate'
  ].map(k => k.toLowerCase());
  const controlKeywords = ['counter target', 'destroy all', 'exile target', 'draw', 'planeswalker', 'flash', 'sweeper', 'board wipe'].map(k => k.toLowerCase());
  const aggroKeywords = ['haste', 'trample', 'prowess', 'damage to', 'deals damage', 'gets +', 'combat', 'attack'].map(k => k.toLowerCase());
  const comboKeywords = ['search', 'library', 'tutor', 'add', 'mana', 'infinite', 'win the game', 'return from your graveyard'].map(k => k.toLowerCase());
  const rampKeywords = ['search your library for a land', 'search your library for a basic land', 'add ', 'mana', 'put onto the battlefield', 'trample', 'hexproof', 'reach'].map(k => k.toLowerCase());
  const tempoKeywords = ['flash', 'flying', 'counter target', 'return to its owner\'s hand', 'cantrip', 'draw a card', 'scry'].map(k => k.toLowerCase());
  const strategyDataKeywordsLower = (strategyData?.keywords || []).map(k => k.toLowerCase());
  const strategyIdKeywordsLower = strategyId.split('-').map(k => k.toLowerCase());
 
  for (let i = 0; i < allCards.length; i++) {
    // Liberar hilo principal cada 1000 iteraciones
    if (i % 1000 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    const card = allCards[i];
 
    // 1. FILTROS ESTRICTOS (HARD FILTERS)
    if (['token', 'vanguard', 'plane', 'scheme', 'phenomenon', 'art_series'].includes(card.layout)) continue;

    // Filtro estricto de rareza (Pauper / Artisan)
    const activeRarityMode = formData.rarityMode || 'high-power';
    if (activeRarityMode === 'pauper' && card.rarity !== 'common') continue;
    if (activeRarityMode === 'artisan' && card.rarity !== 'common' && card.rarity !== 'uncommon') continue;
    
    // Excluir cartas que ya están en el Core o en Must-Include
    if (card.name && typeof card.name === 'string' && excludedNames.includes(card.name.toLowerCase())) continue;
    
    // Filtro dinámico estricto: Solo permitir cartas legales en el formato seleccionado
    if (!card.legalities || card.legalities[formatKey] !== 'legal') continue;
    
    const cardNameLower = (card.name && typeof card.name === 'string') ? card.name.toLowerCase() : '';
    const typeLine = (card.type_line && typeof card.type_line === 'string') ? card.type_line.toLowerCase() : '';
    const oracleText = (card.oracle_text && typeof card.oracle_text === 'string') ? card.oracle_text.toLowerCase() : '';
    const isCreature = typeLine.includes('creature');
    
    // Excluir custom cards en formatos construidos estándar (Modern, Pioneer, Standard, Legacy)
    if (['modern', 'pioneer', 'standard', 'legacy'].includes(formatKey)) {
      if (card.id && (card.id.startsWith('custom-') || card.id.includes('custom'))) continue;
      if (cardNameLower.includes("hamato") || cardNameLower.includes("shredder") || cardNameLower.includes("yoshi") || cardNameLower.includes("oroku saki") || cardNameLower.includes("splinter, ")) {
        continue;
      }
    }

    // --- FILTRADO PROACTIVO DE CARTAS PARASITARIAS ---
    let isParasitic = false;
    const combinedText = `${cardNameLower} | ${typeLine} | ${oracleText}`;
    
    // Clon enriquecido con tribu implícita y estrategia para la validación de parásitos
    const enrichedFormData = { ...formData, strategy: strategyId };
    if (tribeData) {
      enrichedFormData.tribe = tribeData.id;
    }

    for (const rule of PARASITIC_RULES) {
      if (rule.regex.test(combinedText)) {
        if (!rule.allowed(enrichedFormData)) {
          isParasitic = true;
          break;
        }
      }
    }
    if (isParasitic) continue;


    // Bloqueo absoluto de cartas alucinadas/inyectadas con patrón "emeritus of" (Excepto Archmage Emeritus que es real)
    if (cardNameLower.includes('emeritus of') && cardNameLower !== 'archmage emeritus') {
      continue;
    }

    // Reglas de la Casa: Filtro de Custom Banlist pre-generación RAG
    if (formData.customBanlist && card.name) {
      const customBannedNames = formData.customBanlist.split(/[,\n]/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);
      if (customBannedNames.some(banned => cardNameLower === banned || cardNameLower.includes(banned))) {
        continue;
      }
    }

    // --- FILTRADO ESTRICTO DE CURVA PARA CASCADE ---
    // Si el arquetipo o la estrategia es cascade, impedimos cualquier hechizo de CMC 1 o 2 en Maindeck
    // para evitar corromper la cascada y diluir los payoffs de coste 0 (como Crashing Footfalls).
    const isCascadeActive = (formData.archetype || '').toLowerCase().includes('cascade') || 
                            strategyId.toLowerCase().includes('cascade');
    if (isCascadeActive) {
      const cmc = card.mana_value || 0;
      if (cmc === 1 || cmc === 2) {
        const keywords = (card.oracle_text || '').toLowerCase();
        const isEvokeSpecial = keywords.includes('evoke');
        const isAdventureOrSplit = typeLine.includes('adventure') || 
                                   (typeLine.includes('instant') && typeLine.includes('creature')) ||
                                   (card.layout === 'split');
        if (!isEvokeSpecial && !isAdventureOrSplit) {
          continue; // Se excluye por completo
        }
      }
    }

    // Filtrar todas las tierras de forma absoluta, ya que se generan matemáticamente por el Ensamblador
    if (typeLine.includes('land')) continue;
    
    // --- INTEGRIDAD TRIBAL (PUREZA DINÁMICA) ---
    if (tribeData && isCreature) {
      const activeTribalSubtypes = tribeData.subtypes ? tribeData.subtypes.map(s => s.toLowerCase()) : [];
      const hasTribalSubtype = activeTribalSubtypes.some(sub => typeLine.includes(sub)) || typeLine.includes('changeling') || typeLine.includes('shapeshifter');
      
      if (!hasTribalSubtype) {
        if (purityLevel === 'strict') {
          // Rechazo absoluto de criaturas no tribales (ej. Slivers)
          continue; 
        } else if (purityLevel === 'hybrid') {
          // Se toleran dorks de maná (CMC <= 2 con 'add ') o amenazas gigantes (CMC >= 6)
          const cmc = card.mana_value || 0;
          const isDork = cmc <= 2 && oracleText.includes('add ');
          const isGiantPayoff = cmc >= 6;
          
          let isStrategicEnabler = false;
          
          // Excepción genérica universal basada en keywords de la estrategia activa (estilo Scryfall)
          if (strategyData && strategyData.keywords && cmc <= 4) {
            const strategyKeywordsLower = strategyData.keywords.map(k => k.toLowerCase());
            // Coincidencia con keywords en texto u oracle
            const hasKeywordMatch = strategyKeywordsLower.some(kw => 
              oracleText.includes(kw) || 
              cardNameLower.includes(kw)
            );
            
            // Sinergia implícita de cementerio/descarte para reanimadores
            const isGraveyardSynergy = (strategyId === 'reanimator' || strategyId === 'graveyard') && (
              oracleText.includes('discard') || 
              oracleText.includes('mill') || 
              oracleText.includes('surveil') ||
              oracleText.includes('graveyard') ||
              ['grief', 'stitcher\'s supplier', 'putrid imp', 'bloodtithe harvester', 'seasoned pyromancer', 'kroxa, titan of death\'s hunger', 'priest of fell rites'].includes(cardNameLower)
            );

            if (hasKeywordMatch || isGraveyardSynergy) {
              isStrategicEnabler = true;
            }
          }
          
          // Staples interactivos de coste <= 3 para arquetipos interactivos (Midrange / Control / Tempo)
          let isInteractiveStaple = false;
          if (['midrange', 'control', 'tempo'].includes(formData.archetype) && cmc <= 3) {
            const activeStaples = FORMAT_STAPLES[selectedFormat] || FORMAT_STAPLES.MODERN;
            if (
              activeStaples.has(cardNameLower) || 
              ['orcish bowmasters', 'dauthi voidwalker', 'grief', 'ragavan, nimble pilferer', 'kroxa, titan of death\'s hunger', 'bloodtithe harvester', 'deep-cavern bat', 'preacher of the schism', 'dark confidant'].includes(cardNameLower)
            ) {
              isInteractiveStaple = true;
            }
          }

          if (!isDork && !isGiantPayoff && !isStrategicEnabler && !isInteractiveStaple) {
            // Rechazamos bichos de utilidad de coste medio que diluyan la tribu (ej. Emeritus en Elfos Ramp)
            continue; 
          }
        }
      }
    }
    
    if (card.color_identity) {
      const isLegalColor = card.color_identity.every(c => allowedColors.includes(c));
      if (!isLegalColor) continue;
    }
 
    // 2. SISTEMA DE PUNTUACIÓN (SCORING)
    let score = 0;
 
    // A) Puntuación de Staples: Dinámico (torneos) con Fallback Estático
    const inVivoPercentage = metaStaples[cardNameLower] || 0;
    const activeStaples = FORMAT_STAPLES[selectedFormat] || FORMAT_STAPLES.MODERN;
    const stapleWeight = activeStaples.has(cardNameLower) ? 65 : 0;
    
    if (inVivoPercentage > 0) {
      // Escalado dinámico: Si se juega mucho, se le da un gran empuje
      const dynamicStapleBoost = Math.min(100, Math.round(inVivoPercentage * 1.5));
      score += dynamicStapleBoost;
    } else {
      if (stapleWeight > 0) {
        score += stapleWeight;
      }
    }

    // A.1) Grafo Semántico de Obsidian: Coocurrencias y Etiquetas Mecánicas
    if (obsidianGraph) {
      if (obsidianGraph.cards && obsidianGraph.cards[cardNameLower]) {
        const graphCard = obsidianGraph.cards[cardNameLower];

        // Sinergias del Grafo Competitivo (MTGTop8)
        if (graphCard.synergies && graphCard.synergies.length > 0) {
          graphCard.synergies.forEach(syn => {
            if (!syn || !syn.name) return;
            const synNameLower = syn.name.toLowerCase();
            const coeff = syn.coeff || 0.5;

            let hasGraphMatch = false;
            if (formData.mustInclude) {
              const mustIncludes = formData.mustInclude.toLowerCase();
              if (mustIncludes.includes(synNameLower)) hasGraphMatch = true;
            }

            const archetypePillars = {
              reanimator: ["grief", "reanimate", "troll of khazad-dum", "entomb"],
              aristocrats: ["yawgmoth, thran physician", "young wolf", "blood artist"],
              spellslinger: ["murktide regent", "arclight phoenix", "lightning bolt", "consider"],
              blink: ["solitude", "ephemerate", "teferi, time raveler"],
              prison: ["chalice of the void", "blood moon", "trinisphere"],
              control: ["teferi, hero of dominaria", "the wandering emperor", "supreme verdict"]
            };
            const pillars = archetypePillars[strategyId] || [];
            if (pillars.map(p => p.toLowerCase()).includes(synNameLower)) {
              hasGraphMatch = true;
            }

            if (hasGraphMatch) {
              const graphSynergyBonus = Math.round(coeff * 80);
              score += graphSynergyBonus;
            }
          });
        }

        // Etiquetas Mecánicas de Scryfall Tagger (Obsidian-linked)
        if (graphCard.tags && graphCard.tags.length > 0) {
          graphCard.tags.forEach(t => {
            const cleanTag = t.replace('tag:', '').toLowerCase();
            let isAlignedTag = false;

            if (strategyId === 'reanimator' && (cleanTag.includes('reanimat') || cleanTag.includes('mill') || cleanTag.includes('discard'))) {
              isAlignedTag = true;
            } else if (strategyId === 'aristocrats' && (cleanTag.includes('sacrifice') || cleanTag.includes('life-drain') || cleanTag.includes('vampire') || cleanTag.includes('zombie'))) {
              isAlignedTag = true;
            } else if (strategyId === 'spellslinger' && (cleanTag.includes('spellslinger') || cleanTag.includes('cantrip') || cleanTag.includes('dragon') || cleanTag.includes('prowess'))) {
              isAlignedTag = true;
            }

            if (isAlignedTag) {
              score += 90; // Sinergia mecánica abstracta
            }
          });
        }
      }

      // Recomendación de Arquetipo (Escalado de Sinergias)
      if (obsidianGraph.archetypes) {
        const archKey = formData.archetype.toLowerCase();
        if (obsidianGraph.archetypes[archKey]) {
          const archInfo = obsidianGraph.archetypes[archKey];
          const recCard = archInfo.cards.find(c => c.name.toLowerCase() === cardNameLower);
          if (recCard) {
            score += 250 + (recCard.avgQuantity * 20); // Impulso masivo
          }
        }
      }

      // Ponderación de etiquetas mecánicas en el grafo (+150 pts)
      if (obsidianGraph.cards && obsidianGraph.cards[cardNameLower]) {
        const graphCard = obsidianGraph.cards[cardNameLower];
        if (graphCard.tags && graphCard.tags.length > 0) {
          graphCard.tags.forEach(t => {
            const cleanTag = t.replace('tag:', '').toLowerCase();
            const isMatchingTag = (strategyId && strategyId.toLowerCase().includes(cleanTag)) || 
                                  (formData.archetype && formData.archetype.toLowerCase().includes(cleanTag));
            if (isMatchingTag) {
              score += 150; // Sinergia mecánica directa
            }
          });
        }
      }

      // Similitud Semántica Local con el Prompt
      if (formData.prompt && typeof formData.prompt === 'string') {
        const esToEnDict = {
          'trasgos': 'goblin', 'trasgo': 'goblin', 'elfos': 'elf', 'elfo': 'elf',
          'zombis': 'zombie', 'zombies': 'zombie', 'zombi': 'zombie', 'vampiros': 'vampire', 'vampiro': 'vampire',
          'humanos': 'human', 'humano': 'human', 'hadas': 'faerie', 'hada': 'faerie',
          'espiritus': 'spirit', 'espíritus': 'spirit', 'espiritu': 'spirit', 'espíritu': 'spirit',
          'artefactos': 'artifact', 'artefacto': 'artifact', 'encantamientos': 'enchantment', 'encantamiento': 'enchantment',
          'hechizos': 'spell', 'instantaneos': 'instant', 'instantáneos': 'instant', 'conjuros': 'sorcery',
          'volar': 'flying', 'arrollar': 'trample', 'prisa': 'haste', 'vinculo vital': 'lifelink', 'vínculo vital': 'lifelink',
          'cementerio': 'graveyard', 'robar': 'draw', 'descartar': 'discard',
          'daño': 'damage', 'destruir': 'destroy', 'exiliar': 'exile', 'contador': 'counter',
          'criatura': 'creature', 'criaturas': 'creature', 'tierra': 'land', 'tierras': 'land',
          'buscar': 'search', 'biblioteca': 'library', 'mano': 'hand',
          'limos': 'ooze', 'limo': 'ooze', 'tritones': 'merfolk', 'caballeros': 'knight', 'soldados': 'soldier', 'magos': 'wizard'
        };

        const promptTerms = formData.prompt.toLowerCase()
          .replace(/[^a-z0-9\sáéíóúñ]/g, '')
          .split(/\s+/)
          .map(w => esToEnDict[w] || w)
          .filter(w => w.length > 3 && !['with', 'want', 'deck', 'build', 'create', 'modern', 'standard', 'make', 'cards', 'para', 'como', 'mazo', 'hacer', 'quiero', 'necesito', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las'].includes(w));
        
        let termMatches = 0;
        promptTerms.forEach(term => {
          if (cardNameLower.includes(term)) termMatches += 3;
          if (typeLine.includes(term)) termMatches += 2;
          if (oracleText.includes(term)) termMatches += 1;
        });
        
        if (termMatches > 0) {
          score += termMatches * 30; // Impulso semántico instantáneo
        }
      }

      // Veto de Linealidad Generalizado (Protección contra Intrusos en Estrategias Lineales y Tribal en Todo Magic)
      const archLower = formData.archetype.toLowerCase();
      const strategyLower = (strategyId || '').toLowerCase();
      const tribeLower = (formData.tribe || '').toLowerCase();

      // Determinar si es una estrategia lineal/restringida en todo Magic
      const isLinearStrategy = 
        tribeLower || 
        ['affinity', 'elves', 'slivers', 'enchantress', 'scales', 'dredge', 'reanimator', 'madness', 'constellation', 'superfriends', 'landfall', 'devotion', 'goblins', 'merfolk', 'zombies', 'vampires', 'humans', 'faeries', 'eldrazi', 'spirits'].some(t => 
          archLower.includes(t) || strategyLower.includes(t)
        );

      if (isLinearStrategy && isCreature) {
        // Excepción 1: Cartas registradas en el grafo competitivo como parte de este arquetipo
        let isArchetypeMember = false;
        if (obsidianGraph && obsidianGraph.archetypes) {
          const archKey = archLower;
          if (obsidianGraph.archetypes[archKey]) {
            const archInfo = obsidianGraph.archetypes[archKey];
            isArchetypeMember = archInfo.cards && archInfo.cards.some(c => c.name.toLowerCase() === cardNameLower);
          }
        }

        // Excepción 2: Cartas ingresadas en mustInclude por el usuario
        const mustIncludeNamesList = (formData.mustInclude || '').toLowerCase();
        const isMustInclude = mustIncludeNamesList.includes(cardNameLower);

        // Excepción 3: Finishers icónicos de coste alto (CMC >= 6) que actúan como payoffs del color
        const isHighEndPayoff = card.mana_value >= 6 && (
          oracleText.includes('trample') || 
          oracleText.includes('flying') || 
          oracleText.includes('haste') || 
          oracleText.includes('enters the battlefield') || 
          oracleText.includes('cascade') ||
          oracleText.includes('annihilator') ||
          oracleText.includes('toxic') ||
          oracleText.includes('ward') ||
          oracleText.includes('indestructible')
        );

        // Excepción 4: Habilitadores de maná / buscadores rápidos (CMC <= 2) en mazos verdes
        const isManaDorkSupport = card.mana_value <= 2 && 
                                  (oracleText.includes('add ') || oracleText.includes('search your library for a land')) && 
                                  allowedColors.includes('G');

        // Excepción 5: Soporte o coincidencia de Tribu (por tipo o mención en texto oracle, ej. Wirewood Symbiote en Elfos)
        let isTribalMatch = false;
        
        // 1. Priorizar subtypes de tribeData (que tiene las formas singulares correctas)
        if (tribeData && tribeData.subtypes) {
          isTribalMatch = tribeData.subtypes.some(st => {
            const stLower = st.toLowerCase();
            return typeLine.includes(stLower) || oracleText.includes(stLower);
          });
        }
        
        // 2. Fallback a la inferencia de activeTribe si no se pudo determinar con tribeData
        if (!isTribalMatch) {
          const activeTribe = tribeLower || (archLower.includes('elves') ? 'elf' : archLower.includes('slivers') ? 'sliver' : archLower.includes('goblins') ? 'goblin' : archLower.includes('merfolk') ? 'merfolk' : archLower.includes('zombies') ? 'zombie' : archLower.includes('vampires') ? 'vampire' : archLower.includes('humans') ? 'human' : archLower.includes('faeries') ? 'faerie' : archLower.includes('eldrazi') ? 'eldrazi' : archLower.includes('spirits') ? 'spirit' : '');
          if (activeTribe) {
            const cleanTribe = activeTribe.toLowerCase().trim();
            let singularTribe = cleanTribe;
            if (cleanTribe.endsWith('s')) {
              if (cleanTribe === 'elves') singularTribe = 'elf';
              else if (cleanTribe === 'faeries') singularTribe = 'faerie';
              else if (cleanTribe === 'merfolk') singularTribe = 'merfolk';
              else singularTribe = cleanTribe.slice(0, -1);
            }
            isTribalMatch = typeLine.includes(singularTribe) || oracleText.includes(singularTribe);
          }
        }

        // Excepción 6: Coincidencia mecánica directa con la estrategia activa en Todo Magic
        let isMechanicalMatch = false;
        
        // Affinity / Artefactos
        if (archLower.includes('affinity') || strategyLower.includes('artifact') || strategyLower.includes('metalcraft') || strategyLower.includes('affinity')) {
          isMechanicalMatch = typeLine.includes('artifact') || oracleText.includes('artifact') || oracleText.includes('affinity') || oracleText.includes('metalcraft') || oracleText.includes('historic');
        }

        // Encantamientos / Enchantress
        if (archLower.includes('enchantress') || strategyLower.includes('enchantment') || strategyLower.includes('constellation')) {
          isMechanicalMatch = typeLine.includes('enchantment') || oracleText.includes('enchantment') || oracleText.includes('constellation');
        }

        // Contadores +1/+1 / Hardened Scales
        if (archLower.includes('scales') || strategyLower.includes('counter') || strategyLower.includes('hardened') || strategyLower.includes('scales')) {
          isMechanicalMatch = oracleText.includes('+1/+1') || oracleText.includes('counter') || typeLine.includes('artifact') || oracleText.includes('modular') || oracleText.includes('proliferate');
        }

        // Dragado / Cementerio / Reanimación (Dredge, Reanimator)
        if (archLower.includes('dredge') || archLower.includes('reanimator') || strategyLower.includes('graveyard') || strategyLower.includes('dredge') || strategyLower.includes('reanimator')) {
          isMechanicalMatch = oracleText.includes('dredge') || 
                              oracleText.includes('graveyard') || 
                              oracleText.includes('discard') || 
                              oracleText.includes('mill') ||
                              oracleText.includes('escape') ||
                              oracleText.includes('underworld') ||
                              oracleText.includes('reanimate') ||
                              oracleText.includes('return') ||
                              typeLine.includes('zombie') || 
                              typeLine.includes('skeleton') || 
                              typeLine.includes('spirit') ||
                              card.mana_value >= 6;
        }

        // Si no coincide con ninguno, comprobar si encaja con las palabras clave positivas del blueprint
        if (!isMechanicalMatch && blueprint.ragModifiers && blueprint.ragModifiers.boost) {
          const boostLower = blueprint.ragModifiers.boost.map(k => k.toLowerCase());
          isMechanicalMatch = boostLower.some(kw => oracleText.includes(kw) || typeLine.includes(kw) || cardNameLower.includes(kw));
        }

        // Excepción 7: Staple interactivo / de utilidad general competitivo (CMC <= 3 con interacción/robo clásica)
        const isInteractiveUtility = card.mana_value <= 3 && (
          oracleText.includes('destroy') ||
          oracleText.includes('exile') ||
          oracleText.includes('counter target') ||
          oracleText.includes('draw a card') ||
          oracleText.includes('search your library') ||
          oracleText.includes('cannot be blocked') ||
          (FORMAT_STAPLES[selectedFormat] && FORMAT_STAPLES[selectedFormat].has(cardNameLower))
        );

        const passesVeto = 
          isArchetypeMember ||
          isMustInclude ||
          isHighEndPayoff ||
          isManaDorkSupport ||
          isTribalMatch ||
          isMechanicalMatch ||
          isInteractiveUtility;

        if (!passesVeto) {
          score -= 200; // Penalización severa por intruso en estrategia lineal
        }
      }
    }

    // B) Sinergia de Coocurrencia en Metagame (Calculado Matemáticamente desde MTGTop8 / Apify)
    // Si la carta actual co-ocurre con alguna de las cartas obligatorias (Must-Include) del usuario
    if (formData.mustInclude) {
      const userMustIncludes = formData.mustInclude.split(/[,\n]/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);
      
      let mustIncludeSynergyBonus = 0;
      userMustIncludes.forEach(mustName => {
        const pairPercent = metaSynergies[cardNameLower]?.[mustName] || metaSynergies[mustName]?.[cardNameLower] || 0;
        if (pairPercent > 0) {
          mustIncludeSynergyBonus += Math.min(60, Math.round(pairPercent * 1.5));
        }
      });
      if (mustIncludeSynergyBonus > 0) {
        score += mustIncludeSynergyBonus;
      }
    }
    
    // Coocurrencia con pilares clave de cada estrategia/arquetipo
    const archetypePillars = {
      reanimator: ["grief", "reanimate", "troll of khazad-dum", "entomb"],
      aristocrats: ["yawgmoth, thran physician", "young wolf", "blood artist"],
      spellslinger: ["murktide regent", "arclight phoenix", "lightning bolt", "consider"],
      blink: ["solitude", "ephemerate", "teferi, time raveler"],
      prison: ["chalice of the void", "blood moon", "trinisphere"],
      control: ["teferi, hero of dominaria", "the wandering emperor", "supreme verdict"]
    };
    
    const pillars = archetypePillars[strategyId] || [];
    let pillarSynergyBonus = 0;
    pillars.forEach(pillarName => {
      const pairPercent = metaSynergies[cardNameLower]?.[pillarName] || metaSynergies[pillarName]?.[cardNameLower] || 0;
      if (pairPercent > 0) {
        pillarSynergyBonus += Math.min(50, Math.round(pairPercent * 1.2));
      }
    });
    if (pillarSynergyBonus > 0) {
      score += pillarSynergyBonus;
    }

    // C) Coocurrencia Global Automática con Pilares Dinámicos/Locales (Auto-Synergy Boost)
    let autoSynergyBoost = 0;
    activePillars.forEach(pillarName => {
      const pairPercent = metaSynergies[cardNameLower]?.[pillarName] || metaSynergies[pillarName]?.[cardNameLower] || 0;
      if (pairPercent > 0) {
        autoSynergyBoost += Math.round(pairPercent * 0.8);
      }
    });
    if (autoSynergyBoost > 0) {
      score += Math.min(45, autoSynergyBoost);
    }

    // === BATTLE BOX INTERACTIVE EQUITY POLICY ===
    // Penalización severa a cartas de bloqueo pasivo absoluto (locks)
    const absoluteLockCards = ["ensnaring bridge", "blood moon", "chalice of the void", "trinisphere", "mycosynth lattice", "stony silence", "rest in peace", "leyline of the void", "static orb", "winter orb"];
    if (absoluteLockCards.includes(cardNameLower)) {
      score -= 150;
    }
    // Penalizar combos de daño directo no-interactivos a la cabeza
    const nonInteractiveBurn = ["grapeshot", "boros charm", "bump in the night", "lava spike"];
    if (nonInteractiveBurn.includes(cardNameLower)) {
      score -= 80;
    }
    // Boost moderado a disparadores ETB, combate y sacrificios dinámicos
    const interactiveKeywords = ["enters the battlefield", "whenever you attack", "whenever a creature attacks", "sacrifice a creature: ", "whenever a creature dies", "when you cast this spell, draw", "explores", "surveils", "scry"];
    const matchesInteractive = interactiveKeywords.filter(kw => oracleText.includes(kw)).length;
    if (matchesInteractive > 0) {
      score += Math.min(60, matchesInteractive * 20);
    }

    if (blueprint.ragModifiers) {
      score += countKeywords(oracleText, blueprintBoostLower) * 50; // Escalado a 50
      score += countKeywords(typeLine, blueprintBoostLower) * 50; // Escalado a 50
      score -= countKeywords(oracleText, blueprintPenaltyLower) * 100; // Escalado a 100
    }

    // === MULTIDIMENSIONAL GUILD / COLOR-PAIR SYNERGY SCORING ===
    if (allowedColors.includes('U') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, urKeywords) * 8;
    }
    if (allowedColors.includes('B') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, bgKeywords) * 8;
    }
    if (allowedColors.includes('W') && allowedColors.includes('U')) {
      score += countKeywords(oracleText, wuKeywords) * 8;
    }
    if (allowedColors.includes('B') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, brKeywords) * 8;
    }
    if (allowedColors.includes('G') && allowedColors.includes('U')) {
      score += countKeywords(oracleText, guKeywords) * 8;
    }
    if (allowedColors.includes('W') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, wgKeywords) * 8;
    }
    if (allowedColors.includes('W') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, wrKeywords) * 8;
    }
    if (allowedColors.includes('W') && allowedColors.includes('B')) {
      score += countKeywords(oracleText, wbKeywords) * 8;
    }
    if (allowedColors.includes('U') && allowedColors.includes('B')) {
      score += countKeywords(oracleText, ubKeywords) * 8;
    }
    if (allowedColors.includes('R') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, rgKeywords) * 8;
    }
    // === ARCHETYPE ESSENCE BOOST ===
    const archLower = (formData.archetype || '').toLowerCase();
    if (archLower.includes('prison') || archLower.includes('taxes')) {
      const matches = countKeywords(oracleText, taxKeywords) + countKeywords(cardNameLower, taxKeywords);
      if (matches > 0) {
        score += 55; // Potente base para superar el bono tribal puro
        score += matches * 15;
      }
    } else if (archLower.includes('control') || archLower.includes('miracles')) {
      const matches = countKeywords(oracleText, controlKeywords) + countKeywords(cardNameLower, controlKeywords);
      if (matches > 0) {
        score += 45;
        score += matches * 12;
      }
      // Impulso extra y específico a Finishers/Amenazas inevitables de control puro
      const trueControlFinishers = [
        "teferi, hero of dominaria", "teferi, time raveler", "jace, the mind sculptor",
        "the wandering emperor", "shark typhoon", "solitude", "supreme verdict",
        "elspeth, sun's champion", "koma, cosmos serpent", "hullbreaker horror",
        "toxrill, the corrosive", "archon of cruelty", "sheoldred, the apocalypse"
      ];
      if (trueControlFinishers.includes(cardNameLower)) {
        score += 60; // Gran empuje para que encabecen el pool RAG
      }
    } else if (archLower.includes('aggro') || archLower.includes('burn') || archLower.includes('sligh')) {
      const matches = countKeywords(oracleText, aggroKeywords) + countKeywords(cardNameLower, aggroKeywords);
      if (matches > 0) {
        score += 35;
        score += matches * 8;
      }
    } else if (archLower.includes('combo') || archLower.includes('storm')) {
      const matches = countKeywords(oracleText, comboKeywords) + countKeywords(cardNameLower, comboKeywords);
      if (matches > 0) {
        score += 45;
        score += matches * 12;
      }
    } else if (archLower.includes('tempo') || archLower.includes('delver')) {
      const matches = countKeywords(oracleText, tempoKeywords) + countKeywords(cardNameLower, tempoKeywords);
      if (matches > 0) {
        score += 45;
        score += matches * 12;
      }
    } else if (archLower.includes('ramp') || archLower.includes('tron') || archLower.includes('amulet')) {
      const matches = countKeywords(oracleText, rampKeywords) + countKeywords(cardNameLower, rampKeywords);
      if (matches > 0) {
        score += 55;
        score += matches * 15;
      }
      // Finishers gigantescos para Ramp
      const rampFinishers = [
        "primeval titan", "craterhoof behemoth", "wurmcoil engine", "elder gargaroth",
        "archon of cruelty", "koma, cosmos serpent", "uvalammog", "ulamog, the ceaseless hunger",
        "kozilek, butcher of truth", "emrakul, the aeons torn", "sundering titan", "scute swarm",
        "genesis wave", "tooth and nail", "titan of industry", "atraxa, grand unifier"
      ];
      if (rampFinishers.includes(cardNameLower)) {
        score += 70;
      }
    } else if (strategyId.includes('reanimator') || strategyId.includes('graveyard') || archLower.includes('reanimator')) {
      const reanimatorKeywords = ['return target creature card from your graveyard to the battlefield', 'return target creature card from a graveyard to the battlefield', 'reanimate', 'discard a card', 'mill', 'put the top', 'from your library into your graveyard'].map(k => k.toLowerCase());
      const matches = countKeywords(oracleText, reanimatorKeywords) + countKeywords(cardNameLower, reanimatorKeywords);
      if (matches > 0) {
        score += 55;
        score += matches * 15;
      }
      const reanimatorStaples = [
        "persist", "goryo's vengeance", "unburial rites", "animate dead", "reanimate",
        "exhume", "priest of fell rites", "late to dinner", "stitcher's supplier",
        "entomb", "unmarked grave", "faithless looting", "careful study", "archon of cruelty", "atraxa, grand unifier", "griselbrand", "serra's emissary"
      ];
      if (reanimatorStaples.includes(cardNameLower)) {
        score += 80;
      }
    }

    // === ACCELERATION CALIBRATION: Dorks vs Talismans/Rocks ===
    if (allowedColors.includes('G')) {
      if (isCreature && card.mana_value <= 2 && (oracleText.includes('add ') || oracleText.includes('search your library for a land'))) {
        score += 45;
      }
    } else {
      if (!isCreature && card.mana_value <= 2 && typeLine.includes('artifact') && (oracleText.includes('add ') || oracleText.includes('draw a card'))) {
        score += 35;
      }
    }

    // Sanción masiva a permanentes caros (Sagas, Artefactos, Encantamientos) en Reanimator para no ensuciar los objetivos
    if (strategyId === 'reanimator') {
      if (!isCreature && card.mana_value >= 4 && (typeLine.includes('enchantment') || typeLine.includes('artifact') || typeLine.includes('planeswalker'))) {
        score -= 100;
      }
      if (isCreature && card.mana_value >= 6) {
        score += 60; // Enorme impulso a los objetivos reales de reanimación
      }
    }

    // Bonus por Tribu
    if (tribeData && tribeData.subtypes) {
      tribeData.subtypes.forEach(st => {
        const subtypeLower = st.toLowerCase();
        if (typeLine.includes(subtypeLower)) {
          if (isCreature) {
            score += 150; // ¡Base Criatura Tribal Masiva para asegurar que dominen el pool!
            if (inVivoPercentage > 0 || stapleWeight > 0) {
                score += Math.min(25, inVivoPercentage > 0 ? Math.round(inVivoPercentage) : 15);
            }
            if (strategyId !== 'reanimator' && card.mana_value > 4) {
                score -= (card.mana_value - 4) * 10; // Penalización por Coste Alto (Curva Pro Tour)
            } else if (strategyId === 'reanimator' && card.mana_value >= 6) {
                score += 40;
            }
          } else {
            // Hechizos tribales no-criatura (ej. Tarfire) reciben un bonus moderado
            score += 40;
          }
        }
        if (oracleText.includes(subtypeLower)) {
          score += 40; // Empuje base por mencionar la tribu
          
          // Detección de "Tribal Lords" y Anthems (el núcleo de cualquier mazo tribal competitivo)
          if (oracleText.includes('+1/+1') || oracleText.includes('+2/+2')) {
            score += 250; // ¡LOS LORDS QUE BUFAN STATS SON REYES INDISCUTIBLES!
          }
          
          // Detección de evasión y palabras clave letales compartidas
          const lethalKeywords = ['flying', 'haste', 'double strike', 'first strike', 'trample', 'lifelink', 'indestructible', 'hexproof', 'menace', 'deathtouch'];
          lethalKeywords.forEach(kw => {
            if (oracleText.includes(kw)) {
               score += 80; // Lords que dan habilidades son brutales
            }
          });
        }
      });
    }

    // === CALIBRACIÓN ESTRATÉGICA GENÉRICA (UNIVERSAL STRATEGY BOOST) ===
    if (strategyData && strategyData.keywords) {
      const strategyKeywordsLower = strategyData.keywords.map(k => k.toLowerCase());
      
      // Comprobar si el nombre de la carta coincide exactamente o contiene alguno de los keywords
      const isKeyStrategyCard = strategyKeywordsLower.some(kw => cardNameLower === kw || cardNameLower.includes(kw));
      
      // Comprobar coincidencia en texto u oracle
      const textMatches = countKeywords(oracleText, strategyKeywordsLower) + countKeywords(typeLine, strategyKeywordsLower);
      
      if (isKeyStrategyCard) {
        score += 170; // Super-impulso para asegurar que entre en el RAG pool de cabeza
      } else if (textMatches > 0) {
        score += 40 + (textMatches * 15);
      }

      // Calibraciones específicas de alta fidelidad por estrategia para complementar el impulso genérico:
      if (strategyId === 'reanimator') {
        const isReanimatorEnabler = ['faithless looting', 'entomb', 'careful study', 'cathartic reunion', 'thrill of possibility', 'bitter reunion', 'collector\'s vault', 'stitcher\'s supplier', 'putrid imp', 'bloodtithe harvester', 'seasoned pyromancer', 'kroxa, titan of death\'s hunger', 'grief', 'troll of khazad-dum', 'olivia\'s dragoon', 'rakdos headliner'].includes(cardNameLower);
        if (isReanimatorEnabler) {
          score += 150; // Gran empuje para enablers esenciales
        }
        if (isCreature && card.mana_value >= 6) {
          score += 65; // Empuje adicional a payoffs gigantescos para reanimar
        }
      } else if (strategyId === 'aristocrats') {
        const isAristocratsCore = ['blood artist', 'zulaport cutthroat', 'cruel celebrant', 'bastion of remembrance', 'viscera seer', 'yawgmoth, thran physician', 'yawgmoth', 'woe strider', 'goblin bombardment', 'carrion feeder', 'plumb the forbidden', 'bloodghast', 'reassembling skeleton', 'young wolf'].includes(cardNameLower);
        if (isAristocratsCore) {
          score += 130;
        }
      } else if (strategyId === 'spellslinger') {
        const isSpellslingerCore = ['murktide regent', 'arclight phoenix', 'young pyromancer', 'third path iconoclast', 'ledger shredder', 'dragon\'s rage channeler', 'monastery swiftspear', 'slickshot show-off', 'brainstorm', 'ponder', 'preordain', 'consider', 'opt'].includes(cardNameLower);
        if (isSpellslingerCore) {
          score += 130;
        }
      } else if (strategyId === 'tron') {
        const isTronCore = ["urza's tower", "urza's power plant", "urza's mine", "expedition map", "sylvan scrying", "ancient stirrings", "wurmcoil engine", "karn liberated", "sundering titan", "chromatic star", "chromatic sphere"].includes(cardNameLower);
        if (isTronCore) {
          score += 180; // Impulso máximo para asegurar Tron
        }
      } else if (strategyId === 'enchantress' || strategyId === 'voltron') {
        const isBoglesCore = ['slippery bogle', 'gladecover scout', 'ethereal armor', 'all that glitters', 'sythis, harvest\'s hand', 'rancor', 'spider umbra', 'hyena umbra', 'sigarda\'s aid', 'puresteel paladin', 'colossus hammer'].includes(cardNameLower);
        if (isBoglesCore) {
          score += 140;
        }
      } else if (cardNameLower.includes('stoneforge mystic') || ['sword of fire and ice', 'shadowspear', 'batterskull', 'kaldra compleat', 'sword of feast and famine'].includes(cardNameLower)) {
        score += 160; // Gran empuje para habilitadores y equipos premium de Stoneforge
      } else if (strategyId === 'graveyard' || strategyId === 'delirium') {
        const isDeliriumCore = ['mishra\'s bauble', 'dragon\'s rage channeler', 'tarmogoyf', 'unholy heat', 'consider', 'bauble'].includes(cardNameLower);
        if (isDeliriumCore) {
          score += 150;
        }
      }
    } else if (strategyData) {
      score += countKeywords(oracleText, strategyIdKeywordsLower) * 5;
    }

    // Penalizamos cartas inútiles sin texto si no son criaturas grandes
    if (!oracleText && card.mana_value > 2 && !isCreature) {
      score -= 15;
    }

    // --- NUEVO FASE 3: IMPULSO POR ADN COMPETITIVO (Inspiración Híbrida Semántica) ---
    let dnaBoost = 0;
    if (formData.dnaSkeleton && Array.isArray(formData.dnaSkeleton)) {
      const isInDna = formData.dnaSkeleton.some(d => d.name && d.name.toLowerCase() === cardNameLower);
      if (isInDna) {
        dnaBoost += 250; // Garantizar staples del meta en el RAG pool
      }
    }
    score += dnaBoost;

    // --- NUEVO FASE 3: IMPULSO POR BLUEPRINT JIT QUERY (Problema 7) ---
    let blueprintMatchBoost = 0;
    if (formData.blueprintRoles && Array.isArray(formData.blueprintRoles)) {
      for (const role of formData.blueprintRoles) {
        if (role.search_query && matchesSearchQuery(card, role.search_query)) {
          blueprintMatchBoost += 120; // Priorizar según query semántica del Blueprint
        }
      }
    }
    score += blueprintMatchBoost;

    // Sinergia/Impulso extra de rareza si se selecciona alta potencia sin límites
    if (activeRarityMode === 'high-power') {
      if (card.rarity === 'mythic') {
        score += 85;
      } else if (card.rarity === 'rare') {
        score += 45;
      }
    }

    // Clasificación en sus respectivos pools
    const scoredCard = {
      id: card.id,
      name: card.name,
      mana_value: card.mana_value,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      colors: card.colors,
      color_identity: card.color_identity || [],
      mana_cost: card.mana_cost || '',
      rarity: card.rarity || 'common',
      score: score,
      metaPercent: inVivoPercentage
    };

    if (isCreature) {
      creaturesPool.push(scoredCard);
    } else {
      spellsPool.push(scoredCard);
    }
  }

  // --- INICIO RAG 2.0: RED DE SINERGIA RELACIONAL (Double-Pass Synergy Graph) ---
  // 2.5. Primera ordenación provisional para sacar un Top de pre-candidatos (Mejora radical de rendimiento y cohesión)
  const maxPreCandidates = 600; // Analizamos las mejores 600 cartas para crear la red de densidad
  let allCandidates = [...creaturesPool, ...spellsPool].sort((a, b) => b.score - a.score).slice(0, maxPreCandidates);

  // Calcular métricas de densidad de este pool élite
  let densityMetrics = {
    instantSorcery: 0,
    enchantment: 0,
    artifact: 0,
    graveyard: 0,
    tribal: 0
  };

  const activeTribalSubtypes = tribeData && tribeData.subtypes ? tribeData.subtypes.map(s => s.toLowerCase()) : [];

  allCandidates.forEach(c => {
    const typeLine = c.type_line ? c.type_line.toLowerCase() : '';
    const oracleText = c.oracle_text ? c.oracle_text.toLowerCase() : '';
    
    if (typeLine.includes('instant') || typeLine.includes('sorcery')) densityMetrics.instantSorcery++;
    if (typeLine.includes('enchantment')) densityMetrics.enchantment++;
    if (typeLine.includes('artifact')) densityMetrics.artifact++;
    if (oracleText.includes('graveyard') || oracleText.includes('return') || oracleText.includes('discard')) densityMetrics.graveyard++;
    
    if (activeTribalSubtypes.length > 0) {
      const isTribalMatch = activeTribalSubtypes.some(sub => typeLine.includes(sub));
      if (isTribalMatch) densityMetrics.tribal++;
    }
  });

  console.log(`[RAG 2.0] Densidad de Red calculada en Top ${allCandidates.length} pre-candidatos:`, densityMetrics);

  // Aplicar multiplicadores de red (Segunda Pasada)
  allCandidates.forEach(card => {
    let relationalBoost = 0;
    const typeLine = card.type_line ? card.type_line.toLowerCase() : '';
    const oracleText = card.oracle_text ? card.oracle_text.toLowerCase() : '';
    const cardNameLower = card.name.toLowerCase();

    // A) Densidad Tribal (Efecto Bola de Nieve)
    if (activeTribalSubtypes.length > 0) {
      const isTribalMatch = activeTribalSubtypes.some(sub => typeLine.includes(sub));
      if (isTribalMatch) {
        // Enorme bonificación multiplicativa por cada otra carta de la tribu en el pool
        relationalBoost += densityMetrics.tribal * 12; 
        
        // BOOST INTELIGENTE: Si es un Lord o Finisher tribal (Coste alto),
        // darle un mega-boost para asegurar que entre en los buckets top-end.
        if (card.mana_value >= 4) {
          relationalBoost += 100;
        }
      }
      // Si la carta apoya a la tribu en su texto, también se beneficia del cluster
      const supportsTribe = activeTribalSubtypes.some(sub => oracleText.includes(sub));
      if (supportsTribe) {
        relationalBoost += densityMetrics.tribal * 8;
        if (card.mana_value >= 4) {
          relationalBoost += 80; // Boost para encantamientos/conjuros de tribu caros
        }
      }
    }

    // B) Auto-Alineación de Estrategias y Tipos (Gatillos Cruzados)
    if (strategyId === 'spellslinger' || strategyId === 'storm') {
      if (oracleText.includes('instant') || oracleText.includes('sorcery') || oracleText.includes('cast a spell') || oracleText.includes('storm')) {
        relationalBoost += densityMetrics.instantSorcery * 2.5;
      }
      if (typeLine.includes('instant') || typeLine.includes('sorcery')) {
        relationalBoost += 20; 
      }
      if (strategyId === 'storm' && (oracleText.includes('storm') || oracleText.includes('add ') || oracleText.includes('ritual') || oracleText.includes('unturn') || oracleText.includes('untap'))) {
        relationalBoost += 50; // Sinergia directa para enablers y rituales de Tormenta
      }
    } else if (strategyId === 'enchantress') {
      if (oracleText.includes('enchantment') || oracleText.includes('constellation')) {
        relationalBoost += densityMetrics.enchantment * 3.5;
      }
      if (typeLine.includes('enchantment')) relationalBoost += 15;
    } else if (strategyId === 'vehicles') {
      if (typeLine.includes('vehicle') || oracleText.includes('crew')) {
        relationalBoost += densityMetrics.artifact * 3.0;
      }
    } else if (strategyId === 'reanimator' || strategyId === 'graveyard') {
      if (oracleText.includes('graveyard') || oracleText.includes('discard') || oracleText.includes('return target')) {
        relationalBoost += densityMetrics.graveyard * 2.5;
      }
    } else if (strategyId === 'aristocrats') {
      if (oracleText.includes('sacrifice') || oracleText.includes('dies')) {
        relationalBoost += 40;
      }
    } else if (strategyId === 'affinity') {
      if (typeLine.includes('artifact') || oracleText.includes('artifact') || oracleText.includes('affinity') || oracleText.includes('metalcraft')) {
        relationalBoost += densityMetrics.artifact * 1.5; // Fuerte empuje por sinergia metálica
      }
      if (typeLine.includes('artifact') && typeLine.includes('creature')) {
        relationalBoost += 40; // Impulso extra a criaturas artefacto
      }
    }

    // C) Red de Coocurrencia Histórica (Metagame Net)
    let metaNetScore = 0;
    const maxCooccurrenceChecks = 50; 
    for (let j = 0; j < Math.min(maxCooccurrenceChecks, allCandidates.length); j++) {
      const otherCardName = allCandidates[j].name.toLowerCase();
      if (cardNameLower !== otherCardName) {
         const pairFreq = metaSynergies[cardNameLower]?.[otherCardName] || metaSynergies[otherCardName]?.[cardNameLower] || 0;
         if (pairFreq > 0) {
           metaNetScore += (pairFreq * 0.5); 
         }
      }
    }
    
    // Limitamos el bono de metajuego cruzado para que no domine por completo a las sinergias de texto
    relationalBoost += Math.min(150, metaNetScore);

    // D) Boost de Sinergia por Anclaje (Core Packages)
    let coreAnchorBoost = 0;
    if (injectedCoreNames && injectedCoreNames.length > 0) {
      for (const coreName of injectedCoreNames) {
        if (typeof coreName !== 'string') continue;
        const coreNameLower = coreName.toLowerCase();
        const pairFreq = metaSynergies[cardNameLower]?.[coreNameLower] || metaSynergies[coreNameLower]?.[cardNameLower] || 0;
        if (pairFreq > 0) {
          coreAnchorBoost += (pairFreq * 1.5);
        }
      }
      relationalBoost += Math.min(200, coreAnchorBoost);
    }

    // Sumar el boost relacional al score original
    card.score += Math.round(relationalBoost);
  });

  // === SEA MONSTERS DEDICATED RAG SCORING ===
  if (formData.tribe === 'sea_monsters' || strategyId === 'sea_monsters' || formData.archetype === 'sea_monsters') {
    // 1. Contar criaturas de early-game (CMC 1-2) en los candidatos provisionales
    const earlyCreatures = allCandidates.filter(c => {
      const typeLower = c.type_line ? c.type_line.toLowerCase() : '';
      const isC = typeLower.includes('creature');
      return isC && c.mana_value <= 2;
    });

    const earlyCreatureCount = earlyCreatures.length;
    console.log(`[RAG Sea Monsters] Encontradas ${earlyCreatureCount} criaturas tempranas (CMC 1-2) en pre-candidatos.`);

    // 2. Si la cantidad de juego temprano es menor de 12 (peligro de finisher-flood),
    // aplicamos penalizaciones a los finishers masivos de CMC >= 5
    if (earlyCreatureCount < 12) {
      const penaltyAmount = (12 - earlyCreatureCount) * 15;
      console.log(`[RAG Sea Monsters] Juego temprano insuficiente. Aplicando penalización de -${penaltyAmount} a finishers de CMC >= 5.`);
      allCandidates.forEach(c => {
        const typeLower = c.type_line ? c.type_line.toLowerCase() : '';
        const isC = typeLower.includes('creature');
        if (isC && c.mana_value >= 5) {
          c.score -= penaltyAmount;
        }
      });
    }

    // 3. Además, boostear específicamente a dorks de maná y aceleradores de bajo coste
    // para que tengan scores competitivos con los finishers tribales gigantescos.
    allCandidates.forEach(c => {
      const typeLower = c.type_line ? c.type_line.toLowerCase() : '';
      const isC = typeLower.includes('creature');
      const oracleText = c.oracle_text ? c.oracle_text.toLowerCase() : '';
      if (isC && c.mana_value <= 2) {
        const isRampDork = oracleText.includes('add ') || oracleText.includes('search your library for a land');
        const isEarlyInteraction = oracleText.includes('counter') || oracleText.includes('return') || oracleText.includes('draw') || typeLower.includes('flash');
        if (isRampDork) {
          c.score += 80; // Mega-boost para dorks
        } else if (isEarlyInteraction) {
          c.score += 50; // Boost para interacción barata
        }
      }
    });
  }

  // --- INICIO RAG 3.0: DESCUBRIMIENTO DE SINERGIAS OCULTAS (SPICE) ---
  console.log(`[RAG 3.0] Iniciando escaneo de Sinergias Ocultas (2do grado) en ${allCandidates.length} candidatos...`);
  let hiddenSynergyCount = 0;
  
  // Extraer un núcleo del mazo basado en altos puntajes e inVivoPercentages
  const coreCards = allCandidates.filter(c => c.score > 200 || c.metaPercent > 10).map(c => c.name.toLowerCase());
  
  allCandidates.forEach(card => {
    const cardNameLower = card.name.toLowerCase();
    
    // Filtro 1: Excluir cartas que ya son hiper staples (> 8% de juego) o parte del MUST INCLUDE
    const isMainstream = (card.metaPercent && card.metaPercent > 8) || FORMAT_STAPLES[selectedFormat]?.has(cardNameLower);
    if (isMainstream) return;
    
    let synergyScore = 0;
    let reasons = [];
    
    // Filtro 2: Análisis de Segundo Grado en Obsidian Graph
    if (obsidianGraph && obsidianGraph.cards && obsidianGraph.cards[cardNameLower]) {
      const graphCard = obsidianGraph.cards[cardNameLower];
      
      // Co-ocurrencias directas en el grafo con el núcleo del mazo
      if (graphCard.synergies && graphCard.synergies.length > 0) {
        graphCard.synergies.forEach(syn => {
          if (!syn || !syn.name) return;
          if (coreCards.includes(syn.name.toLowerCase())) {
            synergyScore += (syn.coeff || 1) * 60;
            reasons.push(`Sinergia fuerte comprobada con ${syn.name}`);
          }
        });
      }
      
      // Coincidencia de etiquetas abstractas con la estrategia actual
      if (graphCard.tags && graphCard.tags.length > 0) {
        const stratLower = strategyId.toLowerCase();
        const archLower = formData.archetype.toLowerCase();
        
        graphCard.tags.forEach(t => {
          const cleanTag = t.replace('tag:', '').toLowerCase();
          if (stratLower.includes(cleanTag) || archLower.includes(cleanTag)) {
            synergyScore += 45;
            reasons.push(`Alineado abstractamente con la mecánica ${cleanTag}`);
          }
        });
      }
    }
    
    // Filtro 3: Si la carta alcanza un umbral mágico de sinergia oculta, la marcamos
    if (synergyScore > 90) {
      card.isHiddenSynergy = true;
      card.synergyReason = `Sinergia Oculta: ${reasons.slice(0, 2).join(' y ')}. Inclusión off-meta recomendada por IA experta.`;
      card.score += 1000; // Impulso MASIVO absoluto para asegurar que quede en el pool RAG (aunque luego se capará en cantidades)
      hiddenSynergyCount++;
      console.log(`[RAG 3.0] 🔮 Sinergia Oculta Detectada: ${card.name} -> ${card.synergyReason}`);
    }
  });
  
  console.log(`[RAG 3.0] Proceso completado. ${hiddenSynergyCount} sinergias ocultas identificadas.`);
  // --- FIN RAG 3.0 ---

  // Re-separar los pools con las puntuaciones actualizadas
  creaturesPool = allCandidates.filter(c => c.type_line && c.type_line.toLowerCase().includes('creature'));
  spellsPool = allCandidates.filter(c => !c.type_line || !c.type_line.toLowerCase().includes('creature'));

  // --- FIN PROCESO RAG ---

  // 3. ORDENACIÓN POR RANGO Y CUPOS DINÁMICOS CON SELECCIÓN CONSCIENTE DE LA CURVA (DTE POOL ALLOCATION)
  spellsPool.sort((a, b) => b.score - a.score);

  // Clasificar criaturas en buckets de CMC
  const buckets = {
    cmc1: [],
    cmc2: [],
    cmc3: [],
    cmc4: [],
    cmc5Plus: []
  };

  creaturesPool.forEach(c => {
    const cmc = c.mana_value || 0;
    if (cmc <= 1) {
      buckets.cmc1.push(c);
    } else if (cmc === 2) {
      buckets.cmc2.push(c);
    } else if (cmc === 3) {
      buckets.cmc3.push(c);
    } else if (cmc === 4) {
      buckets.cmc4.push(c);
    } else {
      buckets.cmc5Plus.push(c);
    }
  });

  // Ordenar cada bucket individual por su score RAG (descendente)
  Object.keys(buckets).forEach(k => {
    buckets[k].sort((a, b) => b.score - a.score);
  });

  // Configurar las curvas estratégicas
  const strategyCurveMap = {
    reanimator:   { cmc1: 0.20, cmc2: 0.25, cmc3: 0.15, cmc4: 0.10, cmc5Plus: 0.30 },
    aristocrats:  { cmc1: 0.35, cmc2: 0.40, cmc3: 0.15, cmc4: 0.10, cmc5Plus: 0.00 },
    tokens:       { cmc1: 0.30, cmc2: 0.40, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.00 },
    spellslinger: { cmc1: 0.45, cmc2: 0.35, cmc3: 0.10, cmc4: 0.00, cmc5Plus: 0.10 },
    blink:        { cmc1: 0.15, cmc2: 0.35, cmc3: 0.35, cmc4: 0.10, cmc5Plus: 0.05 },
    enchantress:  { cmc1: 0.35, cmc2: 0.45, cmc3: 0.15, cmc4: 0.05, cmc5Plus: 0.00 },
    landfall:     { cmc1: 0.15, cmc2: 0.35, cmc3: 0.25, cmc4: 0.10, cmc5Plus: 0.15 },
    graveyard:    { cmc1: 0.30, cmc2: 0.40, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.00 },
    lifegain:     { cmc1: 0.35, cmc2: 0.40, cmc3: 0.20, cmc4: 0.05, cmc5Plus: 0.00 },
    prison:       { cmc1: 0.15, cmc2: 0.45, cmc3: 0.30, cmc4: 0.10, cmc5Plus: 0.00 },
    voltron:      { cmc1: 0.45, cmc2: 0.40, cmc3: 0.10, cmc4: 0.05, cmc5Plus: 0.00 },
    vehicles:     { cmc1: 0.30, cmc2: 0.40, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.00 },
    sea_monsters: { cmc1: 0.25, cmc2: 0.30, cmc3: 0.15, cmc4: 0.10, cmc5Plus: 0.20 },
    storm:        { cmc1: 0.40, cmc2: 0.40, cmc3: 0.15, cmc4: 0.05, cmc5Plus: 0.00 }
  };

  const archetypeCurveMap = {
    aggro:       { cmc1: 0.40, cmc2: 0.40, cmc3: 0.15, cmc4: 0.05, cmc5Plus: 0.00 },
    control:     { cmc1: 0.15, cmc2: 0.35, cmc3: 0.25, cmc4: 0.15, cmc5Plus: 0.10 },
    midrange:    { cmc1: 0.15, cmc2: 0.35, cmc3: 0.30, cmc4: 0.15, cmc5Plus: 0.05 },
    'ramp-tron': { cmc1: 0.15, cmc2: 0.25, cmc3: 0.20, cmc4: 0.15, cmc5Plus: 0.25 },
    combo:       { cmc1: 0.30, cmc2: 0.35, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.05 },
    sea_monsters: { cmc1: 0.25, cmc2: 0.30, cmc3: 0.15, cmc4: 0.10, cmc5Plus: 0.20 },
    default:     { cmc1: 0.20, cmc2: 0.35, cmc3: 0.25, cmc4: 0.15, cmc5Plus: 0.05 }
  };

  let activeCurve = strategyCurveMap[strategyId];
  if (!activeCurve && formData.archetype) {
    const archLower = formData.archetype.toLowerCase();
    const foundKey = Object.keys(archetypeCurveMap).find(k => archLower.includes(k));
    if (foundKey) {
      activeCurve = archetypeCurveMap[foundKey];
    }
  }
  if (!activeCurve) {
    activeCurve = archetypeCurveMap.default;
  }

  // Si es la tribu, estrategia o arquetipo "Terrores Marinos" (sea_monsters), forzamos una curva específica de rampa y control temprano
  if (formData.tribe === 'sea_monsters' || strategyId === 'sea_monsters' || formData.archetype === 'sea_monsters') {
    activeCurve = { cmc1: 0.25, cmc2: 0.30, cmc3: 0.15, cmc4: 0.10, cmc5Plus: 0.20 };
  }

  // Ajuste PRO: Si es Tribal y la curva no permite Costes 5+, forzamos un 5% 
  // robándolo de los drops de coste 1, para permitir Finishers (ej. Sliver Legion, Muxus).
  if (activeTribalSubtypes.length > 0) {
    const adjustedCurve = { ...activeCurve };
    if (adjustedCurve.cmc5Plus < 0.05) {
      const difference = 0.05 - adjustedCurve.cmc5Plus;
      adjustedCurve.cmc5Plus = 0.05;
      adjustedCurve.cmc1 = Math.max(0, adjustedCurve.cmc1 - difference);
    }
    if (adjustedCurve.cmc4 < 0.05) {
      const difference = 0.05 - adjustedCurve.cmc4;
      adjustedCurve.cmc4 = 0.05;
      adjustedCurve.cmc2 = Math.max(0, adjustedCurve.cmc2 - difference);
    }
    activeCurve = adjustedCurve;
  }

  // Calcular creatureRatio dinámico
  let creatureRatio = 0.5; // Reparto estándar 50/50 por defecto
  
  if (strategyId === 'spellslinger') {
    creatureRatio = 0.3; // 30% criaturas, 70% hechizos
  } else if (strategyId === 'storm') {
    creatureRatio = 0.15; // 15% criaturas (dorks/reducers), 85% hechizos (rituales/cantrips/payoffs)
  } else if (strategyId === 'reanimator') {
    creatureRatio = 0.4; // 40% criaturas, 60% hechizos
  } else if (strategyId === 'aristocrats') {
    creatureRatio = 0.65; // 65% criaturas
  } else if (strategyId === 'tokens') {
    creatureRatio = 0.5; // 50/50
  } else if (strategyId === 'blink') {
    creatureRatio = 0.6; // 60% criaturas
  } else if (strategyId === 'enchantress') {
    creatureRatio = 0.35; // 35% criaturas
  } else if (strategyId === 'landfall') {
    creatureRatio = 0.45; // 45% criaturas
  } else if (strategyId === 'graveyard') {
    creatureRatio = 0.55; // 55% criaturas
  } else if (strategyId === 'lifegain') {
    creatureRatio = 0.55; // 55% criaturas
  } else if (strategyId === 'prison') {
    creatureRatio = 0.3; // 30% criaturas
  } else if (strategyId === 'voltron') {
    creatureRatio = 0.35; // 35% criaturas
  } else if (strategyId === 'vehicles') {
    creatureRatio = 0.45; // 45% criaturas
  } else {
    // Si no hay estrategia activa, recurrimos a los límites del blueprint de arquetipo
    if (blueprint.spells && blueprint.spells.distribution && blueprint.spells.distribution.creatures) {
      const maxCreatures = blueprint.spells.distribution.creatures.max;
      const totalSpells = blueprint.spells.total || 36;
      creatureRatio = Math.min(0.8, Math.max(0.2, maxCreatures / totalSpells));
    } else if (formData.archetype && formData.archetype.toLowerCase().includes('control')) {
      creatureRatio = 0.25; // Control tradicional corre muy pocas criaturas
    } else if (formData.archetype && (formData.archetype.toLowerCase().includes('ramp') || formData.archetype.toLowerCase().includes('tron'))) {
      creatureRatio = 0.4; // Ramp corre aceleradores no criatura mayormente
    }
  }

  // Si es Terrores Marinos, forzamos un ratio específico de 45% criaturas (dorks/Tritones/finishers) y 55% hechizos de control/ramp
  if (formData.tribe === 'sea_monsters' || strategyId === 'sea_monsters' || formData.archetype === 'sea_monsters') {
    creatureRatio = 0.45;
  }

  // Establecer límites de cupo para totalizar 200 cartas
  const maxPoolSize = 200;
  const targetCreatureCount = Math.round(maxPoolSize * creatureRatio);
  const targetSpellCount = maxPoolSize - targetCreatureCount;

  // Repartir criaturas de forma consciente según la curva objetivo
  const targetCounts = {
    cmc1: Math.round(targetCreatureCount * activeCurve.cmc1),
    cmc2: Math.round(targetCreatureCount * activeCurve.cmc2),
    cmc3: Math.round(targetCreatureCount * activeCurve.cmc3),
    cmc4: Math.round(targetCreatureCount * activeCurve.cmc4),
    cmc5Plus: Math.round(targetCreatureCount * activeCurve.cmc5Plus)
  };

  // Ajustar redondeos matemáticos
  let currentSum = Object.values(targetCounts).reduce((a, b) => a + b, 0);
  let diff = targetCreatureCount - currentSum;
  if (diff !== 0) {
    let bestKey = 'cmc2';
    let maxPct = -1;
    Object.keys(activeCurve).forEach(k => {
      if (activeCurve[k] > maxPct) {
        maxPct = activeCurve[k];
        bestKey = k;
      }
    });
    targetCounts[bestKey] += diff;
  }

  // Extraer las criaturas de cada bucket
  const topCreatures = [];
  const deficits = {};

  Object.keys(buckets).forEach(k => {
    const available = buckets[k];
    const target = targetCounts[k];
    if (available.length >= target) {
      topCreatures.push(...available.slice(0, target));
      deficits[k] = 0;
    } else {
      topCreatures.push(...available);
      deficits[k] = target - available.length;
    }
  });

  // Si algún bucket quedó en déficit, cubrimos las ranuras faltantes con candidatos sobrantes globales (ordenados por RAG score)
  let totalDeficit = Object.values(deficits).reduce((a, b) => a + b, 0);
  if (totalDeficit > 0) {
    const remainingCandidatos = [];
    Object.keys(buckets).forEach(k => {
      const available = buckets[k];
      const target = targetCounts[k];
      if (available.length > target) {
        remainingCandidatos.push(...available.slice(target));
      }
    });
    remainingCandidatos.sort((a, b) => b.score - a.score);
    topCreatures.push(...remainingCandidatos.slice(0, totalDeficit));
  }

  // Tomamos los mejores hechizos no-criatura
  const topSpells = spellsPool.slice(0, targetSpellCount);

  // Si alguna categoría tiene menos cartas de las solicitadas, compensamos con la otra para completar 200 en total
  let finalPool = [...topCreatures, ...topSpells];
  
  if (finalPool.length < maxPoolSize) {
    const missingCount = maxPoolSize - finalPool.length;
    if (topCreatures.length === targetCreatureCount && creaturesPool.length > targetCreatureCount) {
      // Intentar meter más criaturas si sobran
      const extraCreatures = creaturesPool.filter(c => !topCreatures.some(tc => tc.name === c.name));
      finalPool = [...finalPool, ...extraCreatures.slice(0, missingCount)];
    } else if (topSpells.length === targetSpellCount && spellsPool.length > targetSpellCount) {
      // Intentar meter más hechizos si sobran
      const extraSpells = spellsPool.slice(targetSpellCount, targetSpellCount + missingCount);
      finalPool = [...finalPool, ...extraSpells];
    }
  }

  console.log(`[RAG] Filtrado completado. Criaturas: ${topCreatures.length}/${targetCreatureCount}, Hechizos: ${topSpells.length}/${targetSpellCount}. Total: ${finalPool.length}`);
  
  // --- NUEVO FASE 3: EXPANDIR RAG POOL POR ROL (Problema 1) ---
  if (formData.blueprintRoles && Array.isArray(formData.blueprintRoles)) {
    formData.blueprintRoles.forEach(role => {
      const matches = finalPool.filter(c => matchesSearchQuery(c, role.search_query));
      if (matches.length < 4 && role.search_query) {
        console.log(`[RAG JIT EXPANSION] Rol "${role.name}" tiene pocos candidatos (${matches.length}/4) con query "${role.search_query}". Buscando refuerzos...`);
        const reinforcementCandidates = allCards
          .filter(c => c.legalities && c.legalities[formatKey] === 'legal')
          .filter(c => !excludedNames.includes(c.name.toLowerCase()))
          .filter(c => !finalPool.some(fp => fp.name.toLowerCase() === c.name.toLowerCase()))
          .filter(c => matchesSearchQuery(c, role.search_query))
          .map(c => ({
            name: c.name,
            mana_value: c.mana_value || c.cmc || 0,
            type_line: c.type_line,
            oracle_text: c.oracle_text || '',
            colors: c.colors || [],
            color_identity: c.color_identity || [],
            mana_cost: c.mana_cost || '',
            score: 80, // Score base moderado
            metaPercent: 0
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);
          
        if (reinforcementCandidates.length > 0) {
          console.log(`[RAG JIT EXPANSION] Inyectando ${reinforcementCandidates.length} cartas de refuerzo para el rol "${role.name}":`, reinforcementCandidates.map(c => c.name));
          finalPool.push(...reinforcementCandidates);
        }
      }
    });
  }

  return {
    blueprint: getBlueprint(formData.archetype),
    pool: finalPool
  };
};

/**
 * Servicio de transformación para convertir el esquema del arquetipo de synergy_graph.json
 * en el formato compatible con la interfaz: { value, label, speed, winTurn, landCount, spellCount, description, recommendedColors, colorHint, isDynamic }.
 */
export const getDynamicArchetypes = async () => {
  try {
    const graph = await loadObsidianGraph();
    if (!graph || !graph.archetypes) {
      console.warn("⚠️ [RAG Service] No se encontraron arquetipos en el grafo de Obsidian.");
      return [];
    }

    // Cargar mapa de colores de todas las cartas de la base de datos local
    const cardColorMap = new Map();
    try {
      const allCards = await getAllCards();
      if (allCards && Array.isArray(allCards)) {
        allCards.forEach(c => {
          if (c.name) {
            // Guardar la unión de colors y color_identity para mayor cobertura
            const colors = (c.colors && c.colors.length > 0) ? c.colors : (c.color_identity || []);
            cardColorMap.set(c.name.toLowerCase(), colors);
          }
        });
      }
    } catch (err) {
      console.error("❌ [RAG Service] Error al cargar todas las cartas para mapeo de colores:", err);
    }

    const transformed = [];
    for (const [key, arch] of Object.entries(graph.archetypes)) {
      const name = arch.name || key;
      const nameLower = name.toLowerCase();
      
      // Heurísticas de velocidad, turno de victoria y cantidades de maná
      let speed = 'Media';
      let winTurn = '7-9';
      let landCount = 24;
      let spellCount = 36;
      
      if (nameLower.includes('aggro') || nameLower.includes('burn') || nameLower.includes('affinity') || nameLower.includes('prowess') || nameLower.includes('scales')) {
        speed = 'Rápida';
        winTurn = '4-5';
        landCount = 22;
        spellCount = 38;
      } else if (nameLower.includes('control') || nameLower.includes('taxes') || nameLower.includes('prison') || nameLower.includes('stax') || nameLower.includes('lantern') || nameLower.includes('tron')) {
        speed = 'Lenta';
        winTurn = '10+';
        landCount = 26;
        spellCount = 34;
      } else if (nameLower.includes('tempo') || nameLower.includes('shadow') || nameLower.includes('delver') || nameLower.includes('merfolk') || nameLower.includes('rogue')) {
        speed = 'Media-rápida';
        winTurn = '5-7';
        landCount = 20;
        spellCount = 40;
      } else if (nameLower.includes('combo') || nameLower.includes('titan') || nameLower.includes('reanimator') || nameLower.includes('creativity') || nameLower.includes('storm') || nameLower.includes('spellslinger') || nameLower.includes('belcher')) {
        speed = 'Variable';
        winTurn = '5-8';
        landCount = 22;
        spellCount = 38;
      }

      // 1. Encontrar todos los mazos en el grafo que pertenecen a este arquetipo
      const matchedDecks = Object.values(graph.decks || {}).filter(deck => {
        const cleanArch = (deck.archetype || '').replace(/[\[\]]/g, '').trim().toLowerCase();
        return cleanArch === key.toLowerCase() || cleanArch === nameLower;
      });

      // 2. Resolver formatos de manera exacta inspeccionando los mazos reales
      let formats = [];
      if (matchedDecks.length > 0) {
        formats = [...new Set(matchedDecks.map(d => d.format.toUpperCase()))];
      }

      // Heurística robusta de fallback si no hay mazos competitivos cargados
      if (formats.length === 0) {
        const MODERN_EXCLUSIVE_KEYWORDS = [
          'tron', 'murktide', 'living end', 'creativity', 'yawgmoth', 'eldrazi',
          'belcher', 'shadow', 'affinity', 'titan', 'dredge', 'amulet', 'cascade',
          'ponza', 'storm', 'hollow', 'chord', 'scepter', 'birthing', 'lantern',
          'scales', 'omniscience', 'pinnacle', 'doomsday', 'momo', 'rhinos',
          'prowess', 'reanimator', 'necrodominance', 'frog', 'cutter', 'energy', 'modern'
        ];
        const STANDARD_EXCLUSIVE_KEYWORDS = ['standard', 'soldier', 'toxic', 'poison', 'convoke'];
        const PIONEER_EXCLUSIVE_KEYWORDS = ['pioneer', 'greasefang', 'lotus field', 'hidden strings', 'amalia', 'vein ripper'];

        if (STANDARD_EXCLUSIVE_KEYWORDS.some(kw => nameLower.includes(kw))) {
          formats = ['STANDARD'];
        } else if (MODERN_EXCLUSIVE_KEYWORDS.some(kw => nameLower.includes(kw))) {
          formats = ['MODERN'];
        } else if (PIONEER_EXCLUSIVE_KEYWORDS.some(kw => nameLower.includes(kw))) {
          formats = ['PIONEER'];
        } else {
          formats = ['MODERN', 'PIONEER', 'STANDARD'];
        }
      }

      // 3. Resolver colores recomendados basándose en las cartas del arquetipo y mazos
      const colorsSet = new Set();

      // A. Cartas de la plantilla del arquetipo
      if (arch.cards && Array.isArray(arch.cards)) {
        arch.cards.forEach(c => {
          const cardColors = cardColorMap.get(c.name.toLowerCase());
          if (cardColors && cardColors.length > 0) {
            cardColors.forEach(col => colorsSet.add(col));
          }
        });
      }

      // B. Cartas de los mazos asociados
      matchedDecks.forEach(deck => {
        if (deck.cards && Array.isArray(deck.cards)) {
          deck.cards.forEach(c => {
            const cardColors = cardColorMap.get(c.name.toLowerCase());
            if (cardColors && cardColors.length > 0) {
              cardColors.forEach(col => colorsSet.add(col));
            }
          });
        }
      });

      // C. Heurística inteligente basada en gremios tradicionales de MTG como soporte/fallback
      const guildColors = [];
      if (nameLower.includes('azorius') || nameLower.includes('uw')) guildColors.push('W', 'U');
      if (nameLower.includes('dimir') || nameLower.includes('ub')) guildColors.push('U', 'B');
      if (nameLower.includes('rakdos') || nameLower.includes('br')) guildColors.push('B', 'R');
      if (nameLower.includes('gruul') || nameLower.includes('rg')) guildColors.push('R', 'G');
      if (nameLower.includes('selesnya') || nameLower.includes('wg')) guildColors.push('W', 'G');
      if (nameLower.includes('orzhov') || nameLower.includes('wb')) guildColors.push('W', 'B');
      if (nameLower.includes('izzet') || nameLower.includes('ur')) guildColors.push('U', 'R');
      if (nameLower.includes('golgari') || nameLower.includes('bg')) guildColors.push('B', 'G');
      if (nameLower.includes('boros') || nameLower.includes('wr')) guildColors.push('W', 'R');
      if (nameLower.includes('simic') || nameLower.includes('ug')) guildColors.push('U', 'G');
      if (nameLower.includes('jund')) guildColors.push('B', 'R', 'G');
      if (nameLower.includes('grixis')) guildColors.push('U', 'B', 'R');
      if (nameLower.includes('esper')) guildColors.push('W', 'U', 'B');
      if (nameLower.includes('naya')) guildColors.push('W', 'R', 'G');
      if (nameLower.includes('bant')) guildColors.push('W', 'U', 'G');
      if (nameLower.includes('abzan')) guildColors.push('W', 'B', 'G');
      if (nameLower.includes('jeskai')) guildColors.push('W', 'U', 'R');
      if (nameLower.includes('sultai')) guildColors.push('U', 'B', 'G');
      if (nameLower.includes('mardu')) guildColors.push('W', 'B', 'R');
      if (nameLower.includes('temur')) guildColors.push('U', 'R', 'G');
      if (nameLower.includes('mono-red') || nameLower.includes('mono red') || nameLower.includes('burn')) guildColors.push('R');
      if (nameLower.includes('mono-white') || nameLower.includes('mono white') || nameLower.includes('taxes')) guildColors.push('W');
      if (nameLower.includes('mono-green') || nameLower.includes('mono green') || nameLower.includes('elves')) guildColors.push('G');
      if (nameLower.includes('mono-black') || nameLower.includes('mono black') || nameLower.includes('discard')) guildColors.push('B');
      if (nameLower.includes('mono-blue') || nameLower.includes('mono blue') || nameLower.includes('merfolk')) guildColors.push('U');
      if (nameLower.includes('tron') || nameLower.includes('eldrazi')) guildColors.push('C');

      // Overrides post-baneos / Meta actual:
      if (nameLower.includes('cascade') || nameLower.includes('rhinos') || nameLower.includes('crash')) guildColors.push('W', 'U', 'R', 'G');
      if (nameLower.includes('living end')) guildColors.push('U', 'B', 'R', 'G');
      if (nameLower.includes('yawgmoth')) guildColors.push('B', 'G');
      if (nameLower.includes('scam') || nameLower.includes('grief')) guildColors.push('B', 'R', 'W');

      guildColors.forEach(col => colorsSet.add(col));

      let recommendedColors = [...colorsSet];
      if (recommendedColors.length === 0) {
        recommendedColors.push('W', 'U', 'B', 'R', 'G');
      }

      // Remover 'C' si hay más colores asociados, dejando 'C' solo si es puramente incoloro
      if (recommendedColors.includes('C') && recommendedColors.length > 1) {
        recommendedColors = recommendedColors.filter(c => c !== 'C');
      }

      const topCardNames = arch.cards ? arch.cards.slice(0, 3).map(c => c.name).join(', ') : '';

      // --- Clasificación por Grupo de Color ---
      const uniqueColors = [...new Set(recommendedColors)];
      let colorGroup = 'multicolor';
      if (uniqueColors.length === 1) {
        if (uniqueColors[0] === 'C') colorGroup = 'generic';
        else colorGroup = 'mono';
      }
      else if (uniqueColors.length === 2) colorGroup = 'bicolor';
      else if (uniqueColors.length === 3) colorGroup = 'tricolor';

      transformed.push({
        value: key.toLowerCase(),
        label: name,
        speed,
        winTurn,
        landCount,
        spellCount,
        recommendedColors,
        description: `Arquetipo dinámico RAG extraído de torneos y Obsidian. Sinergias clave con cartas como: ${topCardNames || 'de tu pool'}.`,
        colorHint: `Velocidad: ${speed} • Victoria: Turno ${winTurn}`,
        isDynamic: true,
        formats,
        colorGroup,
        allCards: arch.cards ? arch.cards.map(c => c.name) : [],
        signatureCards: arch.cards ? arch.cards.slice(0, 3).map(c => c.name) : []
      });
    }
    return transformed;
  } catch (err) {
    console.error("❌ [RAG Service] Error al transformar arquetipos dinámicos:", err);
    return [];
  }
};
