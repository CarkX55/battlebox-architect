/**
 * Servicio de optimización y arquitectura de banquillos (Sideboard Architect)
 * Genera de forma inteligente y gratuita 15 cartas de sideboard competitivas
 * basadas en la identidad de color, formato y arquetipos dominantes del metajuego.
 */

// Base de datos de staples competitivos de banquillo (Sideboard) de Magic
const SIDEBOARD_DATABASE = {
  W: [
    { name: "Rest in Peace", category: "Graveyard", description: "Excelente contra estrategias de cementerio, combo y reanimación." },
    { name: "Deafening Silence", category: "Combo", description: "Frena en seco a mazos de tormenta (Storm) y hechizos múltiples." },
    { name: "Path to Exile", category: "Removal", description: "Remoción puntual eficiente contra criaturas grandes y amenazas rápidas." },
    { name: "Sanctifier en-Vec", category: "Red/Black Hate", description: "Protección contra rojo y negro. Exilia cartas rojas y negras en cementerio." },
    { name: "Stony Silence", category: "Artifacts", description: "Desactiva las habilidades activadas de todos los artefactos rivales." },
    { name: "Disenchant", category: "Utility", description: "Respuesta universal contra artefactos y encantamientos molestos." },
    { name: "Burrenton Tonrent-Forge", category: "Anti-Red/Sweeper", description: "Excelente para prevenir daños masivos de cartas rojas." },
    { name: "Containment Priest", category: "Anti-Cheat", description: "Excelente contra estrategias que ponen criaturas sin lanzarlas (Reanimator, Sneak Attack)." }
  ],
  U: [
    { name: "Mystical Dispute", category: "Counters", description: "Un contrahechizo extremadamente eficiente contra estrategias azules y de control." },
    { name: "Flusterstorm", category: "Counters/Combo", description: "Ideal para contrarrestar hechizos de tormenta e instantes/conjuros múltiples." },
    { name: "Hurkyl's Recall", category: "Artifacts", description: "Devuelve todos los artefactos de un jugador a su mano. Ideal contra Affinity." },
    { name: "Aether Gust", category: "Red/Green Hate", description: "Excelente para ralentizar amenazas rojas o verdes en la pila o campo." },
    { name: "Spell Pierce", category: "Counters", description: "Respuesta rápida de coste uno contra caminantes de planos, removal y combo no criatura." },
    { name: "Grafdigger's Cage", category: "Graveyard/Library", description: "Bloquea el acceso a cementerios y bibliotecas (reanimación, Green Sun's Zenith)." },
    { name: "Subtlety", category: "Free Counter/Tempo", description: "Excelente contra criaturas o caminantes de planos en formatos con alta velocidad." },
    { name: "Dress Down", category: "Utility", description: "Desactiva todas las habilidades de criaturas en juego en un turno clave." }
  ],
  B: [
    { name: "Leyline of the Void", category: "Graveyard", description: "Exilio completo de cartas rivales que vayan al cementerio. Puede jugarse gratis en turno cero." },
    { name: "Duress", category: "Disruption", description: "Descarte de coste uno para quitar caminantes, contrahechizos, removal o combos del rival." },
    { name: "Fatal Push", category: "Removal", description: "Remoción ultra-eficiente contra criaturas de bajo coste de maná convertida." },
    { name: "Nihil Spellbomb", category: "Graveyard", description: "Remoción de cementerio selectiva que te permite robar una carta al activarla." },
    { name: "Collective Brutality", category: "Utility/Versatile", description: "Flexible descarte, removal de criaturas pequeñas y drenado de vidas." },
    { name: "Damping Sphere", category: "Big Mana/Storm", description: "Frena tierras de mucho maná (Tron, Amulet) e incrementa el costo de hechizos sucesivos." },
    { name: "Plague Engineer", category: "Tribal Hate", description: "Excelente contra mazos tribales de criaturas de baja resistencia (Elfos, Humanos, Goblins)." },
    { name: "Sheoldred's Edict", category: "Removal", description: "Obliga al oponente a sacrificar criaturas o caminantes saltándose la protección de antimaleficio." }
  ],
  R: [
    { name: "Brotherhood's End", category: "Sweepers", description: "Daño masivo de 3 a todas las criaturas y caminantes, u opción de destruir artefactos de bajo coste." },
    { name: "Red Elemental Blast", category: "Anti-Blue", description: "Respuesta de coste uno roja definitiva para destruir o contrarrestar cartas azules." },
    { name: "Smash to Smithereens", category: "Artifacts", description: "Destruye un artefacto dañando además al oponente en el proceso." },
    { name: "Alpine Moon", category: "Land Hate", description: "Excelente contra tierras específicas potentes (Urza's Saga, Tron Lands)." },
    { name: "Abrade", category: "Removal/Artifacts", description: "Extrema flexibilidad: 3 puntos de daño a criatura o destrucción de un artefacto." },
    { name: "Blood Moon", category: "Land Hate", description: "Convierte todas las tierras no básicas en montañas básicas, destruyendo bases de maná codiciosas." },
    { name: "Roiling Vortex", category: "Anti-Lifegain/Free spells", description: "Excelente contra mazos de control de vidas y castiga los hechizos lanzados gratis." },
    { name: "End the Festivities", category: "Anti-Weenie", description: "Limpia mesas con múltiples criaturas pequeñas de resistencia uno rápidamente." }
  ],
  G: [
    { name: "Veil of Summer", category: "Protection/Counters", description: "La protección verde definitiva contra descarte negro y contrahechizos/remoción azul." },
    { name: "Force of Vigor", category: "Artifacts/Enchantments", description: "Destrucción gratuita de hasta dos artefactos o encantamientos en el turno rival." },
    { name: "Nature's Claim", category: "Artifacts/Enchantments", description: "Destrucción ultra-barata de coste uno a cambio de dar 4 vidas al oponente." },
    { name: "Choke", category: "Anti-Blue", description: "Castigo masivo: impide que las islas controladas por los rivales se enderecen." },
    { name: "Collector Ouphe", category: "Artifacts", description: "Criatura con efecto Stony Silence. Desactiva habilidades de artefactos." },
    { name: "Heroic Intervention", category: "Protection", description: "Otorga indestructible y antimaleficio a todos tus permanentes contra barredores." },
    { name: "Obstinate Baloth", category: "Anti-Discard/Aggro", description: "Excelente contra mazos de descarte (Liliana) o aggro extremo, ganando vidas." },
    { name: "Haywire Mite", category: "Artifacts/Enchantments", description: "Excelente bicho tutorizable que exilia artefactos o encantamientos molestos." }
  ],
  C: [
    { name: "Pithing Needle", category: "Utility/Planeswalkers", description: "Nombra cualquier permanente con habilidades activadas para desactivarlas completamente (caminantes, tierras)." },
    { name: "Damping Sphere", category: "Mana/Storm", description: "Respuesta incolora universal contra tierras especiales y tormenta." },
    { name: "Tormod's Crypt", category: "Graveyard", description: "Remoción de cementerio incolora de coste cero. Ideal para cualquier mazo." },
    { name: "Relic of Progenitus", category: "Graveyard", description: "Mantiene controlado el cementerio y se reemplaza robando una carta al sacrificarla." },
    { name: "Chalice of the Void", category: "Counters/Lock", description: "Contrarresta hechizos de un coste específico. Bloquea costes uno o cero del rival." },
    { name: "Ratchet Bomb", category: "Sweepers", description: "Limpiador incoloro flexible de mesa para fichas o permanentes del mismo coste." }
  ]
};

/**
 * Extrae la identidad de color de un mazo basándose en sus cartas.
 * @param {Array} deck - Cartas en el mazo
 * @returns {Array} - Lista de colores presentes (W, U, B, R, G)
 */
export function getDeckColorIdentity(deck) {
  const colors = new Set();
  deck.forEach(c => {
    // Si la carta tiene colores definidos
    if (c.colors && Array.isArray(c.colors)) {
      c.colors.forEach(col => colors.add(col.toUpperCase()));
    }
    // O si se puede inferir del coste de maná
    const manaCost = (c.mana_cost || c.cost || '').toUpperCase();
    if (manaCost.includes('W')) colors.add('W');
    if (manaCost.includes('U')) colors.add('U');
    if (manaCost.includes('B')) colors.add('B');
    if (manaCost.includes('R')) colors.add('R');
    if (manaCost.includes('G')) colors.add('G');
  });
  
  return Array.from(colors).filter(c => ['W', 'U', 'B', 'R', 'G'].includes(c));
}

/**
 * Optimiza y sugiere 15 cartas para el banquillo
 * @param {Array} mainboard - Cartas del mazo principal
 * @param {string} format - Formato (Standard, Pioneer, Modern, Legacy, etc.)
 * @param {Array} metagame - Mazos o arquetipos del metajuego actual
 * @returns {Array} - Lista de 15 cartas de Sideboard optimizadas con meta y explicaciones
 */
export function generateSideboard(mainboard, format = 'modern', metagame = []) {
  if (!mainboard || mainboard.length === 0) return [];

  const colors = getDeckColorIdentity(mainboard);
  
  // Si el mazo es incoloro, solo puede usar incoloras
  const allowedPools = colors.length > 0 ? [...colors, 'C'] : ['C'];
  
  // Recopilar candidatos de los pools permitidos
  let candidates = [];
  allowedPools.forEach(color => {
    if (SIDEBOARD_DATABASE[color]) {
      SIDEBOARD_DATABASE[color].forEach(card => {
        candidates.push({
          ...card,
          color,
          weight: 1.0 // Peso base
        });
      });
    }
  });

  // Ajustar pesos en base al metajuego actual si está disponible en localStorage o por parámetro
  let analyzedMetagame = metagame;
  if (!analyzedMetagame || analyzedMetagame.length === 0) {
    try {
      const stored = localStorage.getItem('mtg_metagame_decks');
      if (stored) {
        analyzedMetagame = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("No se pudo cargar el metajuego para afinar el sideboard", e);
    }
  }

  // Si hay metajuego, ajustamos los pesos de las categorías de banquillo
  if (analyzedMetagame && analyzedMetagame.length > 0) {
    // Determinar arquetipos rivales populares
    let graveyardDecksCount = 0;
    let aggroDecksCount = 0;
    let controlDecksCount = 0;
    let comboDecksCount = 0;
    let artifactDecksCount = 0;

    analyzedMetagame.forEach(deck => {
      const arche = (deck.archetype || deck.name || '').toLowerCase();
      const tags = Array.isArray(deck.tags) ? deck.tags.map(t => t.toLowerCase()) : [];
      
      if (arche.includes('reanimate') || arche.includes('dredge') || arche.includes('murktide') || arche.includes('living end') || tags.includes('graveyard')) {
        graveyardDecksCount++;
      }
      if (arche.includes('burn') || arche.includes('aggro') || arche.includes('red') || arche.includes('prowess') || tags.includes('aggro')) {
        aggroDecksCount++;
      }
      if (arche.includes('control') || arche.includes('murktide') || arche.includes('shadow') || tags.includes('control')) {
        controlDecksCount++;
      }
      if (arche.includes('combo') || arche.includes('storm') || arche.includes('amulet') || arche.includes('yawgmoth') || tags.includes('combo')) {
        comboDecksCount++;
      }
      if (arche.includes('affinity') || arche.includes('hammer') || arche.includes('artifacts') || tags.includes('artifacts')) {
        artifactDecksCount++;
      }
    });

    // Ajustar pesos según conteos
    candidates.forEach(c => {
      if (c.category === 'Graveyard' && graveyardDecksCount > 0) c.weight += graveyardDecksCount * 0.4;
      if ((c.category === 'Sweepers' || c.category === 'Removal' || c.category === 'Anti-Red/Sweeper' || c.category === 'Anti-Weenie') && aggroDecksCount > 0) c.weight += aggroDecksCount * 0.4;
      if ((c.category === 'Counters' || c.category === 'Anti-Blue' || c.category === 'Protection') && controlDecksCount > 0) c.weight += controlDecksCount * 0.4;
      if ((c.category === 'Combo' || c.category === 'Big Mana/Storm' || c.category === 'Counters/Combo') && comboDecksCount > 0) c.weight += comboDecksCount * 0.4;
      if (c.category === 'Artifacts' && artifactDecksCount > 0) c.weight += artifactDecksCount * 0.4;
    });
  }

  // Ordenar candidatos por peso e introducir un leve toque aleatorio controlado para dar frescura
  candidates.sort((a, b) => b.weight - a.weight);

  // Seleccionar cartas únicas para el banquillo
  const selectedCards = [];
  const selectedNames = new Set();
  
  // Asegurarnos de tener una variedad saludable de categorías (Removal, Counters, Graveyard Hate, Sweepers, etc.)
  const categoryCounts = {};

  for (let cand of candidates) {
    if (selectedCards.length >= 15) break;
    
    // Evitar duplicados
    if (selectedNames.has(cand.name)) continue;

    // Limitar excesiva concentración en una sola categoría para mantener el banquillo equilibrado
    const cat = cand.category;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    if (categoryCounts[cat] > 3) {
      // Si ya hay más de 3 cartas de esta categoría, reducir prioridad de cara a la variedad
      cand.weight *= 0.5;
      continue; 
    }

    selectedCards.push({
      name: cand.name,
      quantity: cand.category === 'Removal' || cand.category === 'Graveyard' ? 2 : 1, // Duplicar cartas críticas para consistencia si es oportuno
      category: "Sideboard",
      subCategory: cand.category,
      color: cand.color,
      description: cand.description,
      weight: cand.weight
    });
    
    selectedNames.add(cand.name);
  }

  // Si no llegamos a 15 (mazos incoloros o muy específicos), rellenamos con incoloros universales
  if (selectedCards.length < 15) {
    SIDEBOARD_DATABASE.C.forEach(cand => {
      if (selectedCards.length < 15 && !selectedNames.has(cand.name)) {
        selectedCards.push({
          name: cand.name,
          quantity: 2,
          category: "Sideboard",
          subCategory: cand.category,
          color: "C",
          description: cand.description,
          weight: 1.0
        });
        selectedNames.add(cand.name);
      }
    });
  }

  // Ajustar cantidades exactas para que sumen exactamente 15 cartas de banquillo
  let currentSum = selectedCards.reduce((acc, c) => acc + c.quantity, 0);
  
  while (currentSum > 15) {
    // Reducir la cantidad de las que tengan cantidad 2 de abajo hacia arriba
    for (let i = selectedCards.length - 1; i >= 0; i--) {
      if (selectedCards[i].quantity > 1) {
        selectedCards[i].quantity--;
        currentSum--;
        if (currentSum === 15) break;
      }
    }
    if (currentSum === 15) break;
    // Si sigue pasándose, recortar la última carta
    const popped = selectedCards.pop();
    currentSum -= popped.quantity;
  }

  while (currentSum < 15) {
    // Incrementar cantidad de las cartas con mayor peso hasta llegar a 15
    for (let i = 0; i < selectedCards.length; i++) {
      if (selectedCards[i].quantity < 3) { // Máximo 3 de una carta de banquillo
        selectedCards[i].quantity++;
        currentSum++;
        if (currentSum === 15) break;
      }
    }
  }

  return selectedCards;
}

/**
 * Genera una guía de banquilleo simétrica (Sideboard Guide)
 * deduciendo qué cartas del mainboard sacar (OUT) y cuáles del sideboard meter (IN)
 * para los tres emparejamientos competitivos clave.
 * @param {Array} mainboard - Hechizos del mazo principal
 * @param {Array} sideboard - Cartas del banquillo
 * @returns {Object} - Matriz de intercambio por matchup { aggro: { in, out }, control, combo }
 */
export function generateSideboardGuide(mainboard, sideboard) {
  if (!mainboard || !sideboard) return null;

  const spellsOnly = mainboard.filter(c => c.category !== 'Land');
  
  // Categorizar cartas del banquillo (Sideboard) según utilidad táctica
  const aggroHate = sideboard.filter(c => ['Removal', 'Sweepers', 'Anti-Red/Sweeper', 'Anti-Weenie', 'Red/Black Hate', 'Anti-Aggro'].includes(c.subCategory));
  const controlHate = sideboard.filter(c => ['Counters', 'Anti-Blue', 'Protection', 'Disruption', 'Utility/Versatile', 'Anti-Control'].includes(c.subCategory));
  const comboHate = sideboard.filter(c => ['Combo', 'Big Mana/Storm', 'Counters/Combo', 'Graveyard', 'Lock', 'Artifacts', 'Utility'].includes(c.subCategory));

  // Categorizar cartas del mainboard potencialmente débiles por matchup (Candidatos a salir)
  // 1. Débiles contra Aggro: Spells lentos, caminantes caros o motores lentos (CMC >= 4)
  const weakVsAggro = [...spellsOnly]
    .filter(c => c.cmc >= 4 || (c.role && (c.role.includes('finisher') || c.role.includes('engine')) && c.cmc >= 3))
    .sort((a, b) => b.cmc - a.cmc);

  // 2. Débiles contra Control: Removals de criatura "muertos" (Fatal Push, Lightning Bolt de baja escala, sweepers)
  const weakVsControl = [...spellsOnly]
    .filter(c => ['Fatal Push', 'Lightning Bolt', 'Unholy Heat', 'Go for the Throat', 'Cut Down'].includes(c.name) || (c.role && c.role.includes('interaction') && c.cmc <= 2))
    .sort((a, b) => a.cmc - b.cmc);

  // 3. Débiles contra Combo: Hechizos de control de mesa pesados o limpiamesas conjuro de CMC >= 4
  const weakVsCombo = [...spellsOnly]
    .filter(c => c.name.toLowerCase().includes('verdict') || c.name.toLowerCase().includes('depopulate') || c.cmc >= 4)
    .sort((a, b) => b.cmc - a.cmc);

  const buildMatchupGuide = (sideboardHate, weakMainboardList) => {
    const guideIn = [];
    const guideOut = [];
    
    let totalInQty = sideboardHate.reduce((sum, c) => sum + c.quantity, 0);
    if (totalInQty === 0) return { in: [], out: [] };

    // Añadir al IN
    sideboardHate.forEach(c => {
      guideIn.push({ name: c.name, quantity: c.quantity });
    });

    // Rellenar el OUT simétricamente quitando de los más débiles
    let remainingOut = totalInQty;
    
    // Primero, usar candidatos específicos débiles del Maindeck
    for (let c of weakMainboardList) {
      if (remainingOut <= 0) break;
      const existingInMain = spellsOnly.find(main => main.name.toLowerCase() === c.name.toLowerCase());
      if (existingInMain) {
        const take = Math.min(existingInMain.quantity, remainingOut);
        if (take > 0) {
          guideOut.push({ name: c.name, quantity: take });
          remainingOut -= take;
        }
      }
    }

    // Si aún falta por emparejar el OUT (ej. no hay suficientes cartas débiles obvias),
    // recortar copias de cartas genéricas no protegidas de coste medio
    if (remainingOut > 0) {
      const genericSpells = spellsOnly.filter(c => c.quantity > 1 && !guideOut.some(o => o.name === c.name) && c.cmc >= 2);
      for (let c of genericSpells) {
        if (remainingOut <= 0) break;
        const take = Math.min(c.quantity - 1, remainingOut);
        if (take > 0) {
          guideOut.push({ name: c.name, quantity: take });
          remainingOut -= take;
        }
      }
    }

    return {
      in: guideIn,
      out: guideOut
    };
  };

  return {
    aggro: buildMatchupGuide(aggroHate.slice(0, 4), weakVsAggro),
    control: buildMatchupGuide(controlHate.slice(0, 4), weakVsControl),
    combo: buildMatchupGuide(comboHate.slice(0, 4), weakVsCombo)
  };
}
