// src/services/ragService.js
import { getBlueprint } from '../constants/blueprintTemplates.js';
import { MTG_TRIBES, MTG_STRATEGIES } from '../constants/legacyBattleBox.js';
import { getAllCards } from './dbIngestor.js';
import { loadMetaFromDB } from './mtgtop8Service.js';


/**
 * Escanea el texto y type_line de la carta en busca de palabras clave.
 */
const countKeywords = (text, keywords) => {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  return keywords.reduce((count, kw) => {
    return count + (lowerText.includes(kw.toLowerCase()) ? 1 : 0);
  }, 0);
};

const FORMAT_STAPLES = {
  STANDARD: new Set([
    "sheoldred, the apocalypse", "bloodtithe harvester", "fable of the mirror-breaker", 
    "make disappear", "go for the throat", "cut down", "wandering emperor", 
    "wedding announcement", "raffine, scheming seer", "atraxa, grand unifier",
    "deep-cavern bat", "preacher of the schism", "no more lies", "sunfall"
  ]),
  PIONEER: new Set([
    "fatal push", "thoughtseize", "fable of the mirror-breaker", "bloodtithe harvester",
    "bonecrusher giant", "treasure cruise", "arclight phoenix", "opt", "consider",
    "teferi, hero of dominaria", "supreme verdict", "sheoldred, the apocalypse",
    "nykthos, shrine to nyx", "karn, the great creator", "vein ripper"
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
export const buildCardPool = async (formData) => {
  const allCards = await getAllCards();
  const blueprint = getBlueprint(formData.archetype);
  
  // Obtener el formato seleccionado para legalidad dinámica
  const selectedFormat = (formData.format || 'MODERN').toUpperCase();
  const formatKey = selectedFormat.toLowerCase();
  
  // Cargar datos de metagame del formato para scoring dinámico y coocurrencias
  const metaProfile = loadMetaFromDB(selectedFormat);
  const metaStaples = metaProfile?.staples || {};
  const metaSynergies = metaProfile?.synergies || {};

  // Extraer Top 5 Pilares Dinámicos del Formato
  const dynamicPillars = Object.entries(metaStaples)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(entry => entry[0]);

  // Extraer información de Tribu y Estrategia para bonus extra
  const tribeData = MTG_TRIBES.find(t => t.id === formData.tribe || t.label === formData.tribe) || null;
  const strategyData = MTG_STRATEGIES.find(s => s.id === formData.strategy || s.label === formData.strategy) || null;
  
  const strategyId = strategyData ? strategyData.id : (formData.strategy || '');
  
  // Respetamos los colores elegidos por el usuario de forma prioritaria
  const allowedColors = (formData.colores && formData.colores.length > 0) 
    ? formData.colores 
    : (tribeData ? tribeData.colors : ['W','U','B','R','G']);
  
  console.log(`[RAG] Iniciando filtrado para ${formData.archetype} con estrategia ${strategyId} en formato ${selectedFormat}... Total DB: ${allCards.length}`);
 
  let creaturesPool = [];
  let spellsPool = [];
 
  for (let i = 0; i < allCards.length; i++) {
    const card = allCards[i];
 
    // 1. FILTROS ESTRICTOS (HARD FILTERS)
    if (['token', 'vanguard', 'plane', 'scheme', 'phenomenon', 'art_series'].includes(card.layout)) continue;
    
    // Filtro dinámico estricto: Solo permitir cartas legales en el formato seleccionado
    if (!card.legalities || card.legalities[formatKey] !== 'legal') continue;
    
    // Reglas de la Casa: Filtro de Custom Banlist pre-generación RAG
    if (formData.customBanlist && card.name) {
      const customBannedNames = formData.customBanlist.split(/[,\n]/)
        .map(s => s.trim().toLowerCase())
        .filter(s => s.length > 0);
      const cardNameLower = card.name.toLowerCase();
      if (customBannedNames.some(banned => cardNameLower === banned || cardNameLower.includes(banned))) {
        continue;
      }
    }
    
    const typeLine = card.type_line ? card.type_line.toLowerCase() : '';
    // Filtrar todas las tierras de forma absoluta, ya que se generan matemáticamente por el Ensamblador
    if (typeLine.includes('land')) continue;
    
    if (card.color_identity) {
      const isLegalColor = card.color_identity.every(c => allowedColors.includes(c));
      if (!isLegalColor) continue;
    }
 
    // 2. SISTEMA DE PUNTUACIÓN (SCORING)
    let score = 0;
    const oracleText = card.oracle_text ? card.oracle_text.toLowerCase() : '';
    const cardNameLower = card.name ? card.name.toLowerCase() : '';
 
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

    // C) Coocurrencia Global Automática con Pilares Dinámicos (Auto-Synergy Boost)
    let autoSynergyBoost = 0;
    dynamicPillars.forEach(pillarName => {
      const pairPercent = metaSynergies[cardNameLower]?.[pillarName] || metaSynergies[pillarName]?.[cardNameLower] || 0;
      if (pairPercent > 0) {
        autoSynergyBoost += Math.round(pairPercent * 0.8);
      }
    });
    if (autoSynergyBoost > 0) {
      score += Math.min(45, autoSynergyBoost);
    }

    if (blueprint.ragModifiers) {
      score += countKeywords(oracleText, blueprint.ragModifiers.boost) * 5;
      score += countKeywords(typeLine, blueprint.ragModifiers.boost) * 5;
      score -= countKeywords(oracleText, blueprint.ragModifiers.penalty) * 10;
    }

    const isCreature = typeLine.includes('creature');

    // === MULTIDIMENSIONAL GUILD / COLOR-PAIR SYNERGY SCORING ===
    // 1. Izzet (U/R) - Spellslinger & Tempo
    if (allowedColors.includes('U') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, ['instant', 'sorcery', 'prowess', 'magecraft', 'draw', 'damage']) * 8;
    }
    // 2. Golgari (B/G) - Dredge & Graveyard Midrange
    if (allowedColors.includes('B') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, ['graveyard', 'dredge', 'delirium', 'return from your graveyard', 'deathtouch', 'destroy']) * 8;
    }
    // 3. Azorius (W/U) - Blink, Tempo & Control
    if (allowedColors.includes('W') && allowedColors.includes('U')) {
      score += countKeywords(oracleText, ['exile', 'return to its owner\'s hand', 'enters the battlefield', 'flying', 'flash']) * 8;
    }
    // 4. Rakdos (B/R) - Aristocrats, Burn & Madness
    if (allowedColors.includes('B') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, ['sacrifice', 'discard', 'spectacle', 'madness', 'graveyard', 'loses life']) * 8;
    }
    // 5. Simic (G/U) - Flash, Tempo, +1/+1 Counters & Landfall
    if (allowedColors.includes('G') && allowedColors.includes('U')) {
      score += countKeywords(oracleText, ['flash', 'draw a card', 'counter', 'proliferate', 'landfall', 'kicker']) * 8;
    }
    // 6. Selesnya (W/G) - Tokens & Enchantress
    if (allowedColors.includes('W') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, ['token', 'enchantment', 'aura', 'populate', 'convoke', 'counter']) * 8;
    }
    // 7. Boros (W/R) - Equipment, Aggro & Combat Tricks
    if (allowedColors.includes('W') && allowedColors.includes('R')) {
      score += countKeywords(oracleText, ['equipment', 'double strike', 'attack', 'valiant', 'red creature', 'white creature']) * 8;
    }
    // 8. Orzhov (W/B) - Aristocrats, Lifegain & Drain
    if (allowedColors.includes('W') && allowedColors.includes('B')) {
      score += countKeywords(oracleText, ['lifelink', 'gain life', 'drain', 'sacrifice', 'loses life', 'exile target']) * 8;
    }
    // 9. Dimir (U/B) - Control, Tempo & Mill
    if (allowedColors.includes('U') && allowedColors.includes('B')) {
      score += countKeywords(oracleText, ['graveyard', 'draw', 'counter', 'mill', 'surveil', 'flash']) * 8;
    }
    // 10. Gruul (R/G) - Stompy, Haste, Midrange
    if (allowedColors.includes('R') && allowedColors.includes('G')) {
      score += countKeywords(oracleText, ['haste', 'trample', 'power 4 or greater', 'riot', 'fight']) * 8;
    }
    // === ARCHETYPE ESSENCE BOOST ===
    if (formData.archetype === 'prison') {
      const taxKeywords = [
        'costs', 'unless', 'pay', 'additional cost', 'more to cast', 'tax', 
        'can\'t cast', 'can\'t attack', 'can\'t block', 'can\'t search', 'can\'t library',
        'limit', 'instead', 'only one', 'skip', 'doesn\'t untap', 'exile', 'graveyard',
        'enters the battlefield tapped', 'no more than', 'ghostly prison',
        'damping', 'deafening', 'rule of law', 'canonist', 'sentinel', 'thalia', 'magistrate'
      ];
      const matches = countKeywords(oracleText, taxKeywords) + countKeywords(card.name.toLowerCase(), taxKeywords);
      if (matches > 0) {
        score += 55; // Potente base para superar el bono tribal puro
        score += matches * 15;
      }
    } else if (formData.archetype === 'control') {
      const controlKeywords = ['counter target', 'destroy all', 'exile target', 'draw', 'planeswalker', 'flash', 'sweeper', 'board wipe'];
      const matches = countKeywords(oracleText, controlKeywords) + countKeywords(card.name.toLowerCase(), controlKeywords);
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
    } else if (formData.archetype === 'aggro') {
      const aggroKeywords = ['haste', 'trample', 'prowess', 'damage to', 'deals damage', 'gets +', 'combat', 'attack'];
      const matches = countKeywords(oracleText, aggroKeywords) + countKeywords(card.name.toLowerCase(), aggroKeywords);
      if (matches > 0) {
        score += 35;
        score += matches * 8;
      }
    } else if (formData.archetype === 'combo') {
      const comboKeywords = ['search', 'library', 'tutor', 'add', 'mana', 'infinite', 'win the game', 'return from your graveyard'];
      const matches = countKeywords(oracleText, comboKeywords) + countKeywords(card.name.toLowerCase(), comboKeywords);
      if (matches > 0) {
        score += 45;
        score += matches * 12;
      }
    } else if (formData.archetype === 'tempo') {
      const tempoKeywords = ['flash', 'flying', 'counter target', 'return to its owner\'s hand', 'cantrip', 'draw a card', 'scry'];
      const matches = countKeywords(oracleText, tempoKeywords) + countKeywords(card.name.toLowerCase(), tempoKeywords);
      if (matches > 0) {
        score += 45;
        score += matches * 12;
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
            score += 30; // Base Criatura Tribal
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
            score += 10;
          }
        }
        if (oracleText.includes(subtypeLower)) {
          score += 10;
        }
      });
    }

    // Bonus por Estrategia
    if (strategyData && strategyData.keywords) {
      const matches = countKeywords(oracleText, strategyData.keywords) + countKeywords(typeLine, strategyData.keywords);
      score += matches * 12;
      if (matches > 0 && strategyId === 'reanimator') {
        score += 25;
      }
    } else if (strategyData) {
      const strategyKeywords = strategyId.split('-');
      score += countKeywords(oracleText, strategyKeywords) * 5;
    }

    // Penalizamos cartas inútiles sin texto si no son criaturas grandes
    if (!oracleText && card.mana_value > 2 && !isCreature) {
      score -= 15;
    }

    // Clasificación en sus respectivos pools
    const scoredCard = {
      name: card.name,
      mana_value: card.mana_value,
      type_line: card.type_line,
      oracle_text: card.oracle_text,
      colors: card.colors,
      score: score,
      metaPercent: inVivoPercentage
    };

    if (isCreature) {
      creaturesPool.push(scoredCard);
    } else {
      spellsPool.push(scoredCard);
    }
  }

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
    vehicles:     { cmc1: 0.30, cmc2: 0.40, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.00 }
  };

  const archetypeCurveMap = {
    aggro:       { cmc1: 0.40, cmc2: 0.40, cmc3: 0.15, cmc4: 0.05, cmc5Plus: 0.00 },
    control:     { cmc1: 0.15, cmc2: 0.35, cmc3: 0.25, cmc4: 0.15, cmc5Plus: 0.10 },
    midrange:    { cmc1: 0.15, cmc2: 0.35, cmc3: 0.30, cmc4: 0.15, cmc5Plus: 0.05 },
    'ramp-tron': { cmc1: 0.15, cmc2: 0.25, cmc3: 0.20, cmc4: 0.15, cmc5Plus: 0.25 },
    combo:       { cmc1: 0.30, cmc2: 0.35, cmc3: 0.20, cmc4: 0.10, cmc5Plus: 0.05 },
    default:     { cmc1: 0.20, cmc2: 0.35, cmc3: 0.25, cmc4: 0.15, cmc5Plus: 0.05 }
  };

  const activeCurve = strategyCurveMap[strategyId] || 
                      archetypeCurveMap[formData.archetype] || 
                      archetypeCurveMap.default;

  // Calcular creatureRatio dinámico
  let creatureRatio = 0.5; // Reparto estándar 50/50 por defecto
  
  if (strategyId === 'spellslinger') {
    creatureRatio = 0.3; // 30% criaturas, 70% hechizos
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
    } else if (formData.archetype === 'control') {
      creatureRatio = 0.25; // Control tradicional corre muy pocas criaturas
    } else if (formData.archetype === 'ramp-tron') {
      creatureRatio = 0.4; // Ramp corre aceleradores no criatura mayormente
    }
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
  
  return {
    blueprint,
    pool: finalPool
  };
};
