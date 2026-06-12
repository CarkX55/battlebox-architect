// scripts/enrichGraph.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const DB_PATH = path.join(PROJECT_ROOT, 'database/oracle-cards-20260428090245.json');
const GRAPH_PATH = path.join(PROJECT_ROOT, 'public/data/synergy_graph.json');

export function enrich() {
  console.log("🔍 [RAG Enricher] Iniciando enriquecimiento automático del grafo...");

  if (!fs.existsSync(GRAPH_PATH)) {
    console.error(`❌ [RAG Enricher] Error: No se encontró el grafo compilado en ${GRAPH_PATH}.`);
    return;
  }

  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ [RAG Enricher] Error: No se encontró la base de datos de cartas en ${DB_PATH}.`);
    return;
  }

  try {
    const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    const allCards = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));

    console.log(`📊 [RAG Enricher] Cargadas ${allCards.length} cartas de la base de datos y ${Object.keys(graph.cards).length} del grafo.`);

    // Asegurar estructura
    if (!graph.tags) graph.tags = {};
    if (!graph.archetypes) graph.archetypes = {};

    const helperAddTag = (tagName, cardName) => {
      const tagKey = tagName.toLowerCase();
      if (!graph.tags[tagKey]) {
        graph.tags[tagKey] = { tag: tagName, cards: [] };
      }
      if (!graph.tags[tagKey].cards.includes(cardName)) {
        graph.tags[tagKey].cards.push(cardName);
      }
    };

    const helperAddArchetypeCard = (archetypeId, cardName, avgQty = 4) => {
      const archKey = archetypeId.toLowerCase();
      if (!graph.archetypes[archKey]) {
        graph.archetypes[archKey] = { name: archetypeId, cards: [] };
      }
      const existing = graph.archetypes[archKey].cards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      if (!existing) {
        graph.archetypes[archKey].cards.push({ name: cardName, avgQuantity: avgQty });
      }
    };

    let enrichedCount = 0;

    for (const card of allCards) {
      if (!card.name) continue;

      const nameLower = card.name.toLowerCase();
      const typeLine = (card.type_line || '').toLowerCase();
      const oracleText = (card.oracle_text || '').toLowerCase();
      const cmc = card.cmc ?? card.mana_value ?? 0;

      // 1. Registrar carta en el grafo si no existe
      if (!graph.cards[nameLower]) {
        graph.cards[nameLower] = {
          name: card.name,
          type: typeLine.includes('creature') ? 'creature' : (typeLine.includes('land') ? 'land' : 'spell'),
          cmc: cmc,
          synergies: [],
          tags: []
        };
        enrichedCount++;
      }

      const cardObj = graph.cards[nameLower];
      if (!cardObj.tags) cardObj.tags = [];

      // 2. Escanear y añadir tags mecánicos
      const keywords = {
        sacrifice: ["sacrifice a", "sacrifice another", "dies", "whenever another creature dies", "sacrifice outlet", "sacrifice this"],
        affinity: ["affinity for", "metalcraft", "improvise", "whenever an artifact enters", "artifact creature"],
        "counter-synergy": ["+1/+1 counter", "proliferate", "put a counter", "doubling season"],
        reanimator: ["reanimate", "return from your graveyard to the battlefield", "goryo", "persist", "reanimation"],
        lifegain: ["gain life", "lifelink", "gain 2 life", "gain 3 life"],
        "discard-enabler": ["discard a card", "discard two cards", "discarding a card"],
        enchantment: ["enchantment", "constellation", "aura", "enchant creature"],
        "ramp-dork": ["search your library for a land", "search your library for a basic land", "put onto the battlefield", "add "]
      };

      // Curados e Icónicos para evitar flood en los arquetipos del grafo
      const signatureCards = {
        affinity: ['cranial plating', 'springleaf drum', 'shadowspear', 'nettlecyst', 'thoughtcast', 'metallic rebuke', 'galvanic blast', 'shrapnel blast', 'welding jar', 'tormod\'s crypt', 'steel overseer', 'patchwork automaton', 'arcbound ravager', 'walking ballista', 'hangarback walker', 'frogmite', 'myr enforcer', 'sojourner\'s companion', 'thought monitor', 'memnite', 'ornithopter', 'signal pest', 'esper sentinel', 'haywire mite', 'gingerbrute', 'stonecoil serpent', 'syr ginger, the meal ender', 'emry, lurker of the loch', 'urza, lord high artificer', 'sai, master thopterist', 'retrofitted transmogrant', 'arcbound worker', 'zabaz, the glimmerwasp', 'mystic forge', 'aether vial'],
        enchantress: ['utopia sprawl', 'wild growth', 'sterling grove', 'solitary confinement', 'sigarda\'s aid', 'sythis, harvest\'s hand', 'sanctum weaver', 'destiny spinner', 'argothian enchantress', 'eidolon of blossoms', 'enchantress\'s presence', 'all that glitters', 'ethereal armor', 'rancor', 'abundant growth', 'kenrith\'s transformation', 'slippery bogle', 'gladecover scout'],
        scales: ['hardened scales', 'the ozolith', 'ozolith, the shattered spire', 'agatha\'s soul cauldron', 'walking ballista', 'hangarback walker', 'arcbound ravager', 'patchwork automaton', 'steel overseer', 'zabaz, the glimmerwasp', 'esper sentinel', 'haywire mite', 'gingerbrute', 'stonecoil serpent', 'syr ginger, the meal ender', 'basking broodscale'],
        dredge: ['creeping chill', 'conflagrate', 'cathartic reunion', 'thrilling discovery', 'life from the loam', 'stinkweed imp', 'golgari thug', 'golgari grave-troll', 'narcomoeba', 'priest of fell rites', 'ox of agonas', 'silversmote ghoul', 'bloodghast', 'priest of forgotten gods', 'merchant of the vale', 'shriekhorn', 'tome scour'],
        reanimator: ['persist', 'goryo\'s vengeance', 'unburial rites', 'footsteps of the goryo', 'dread return', 'reanimate', 'exhume', 'animate dead', 'necromancy', 'entomb', 'buried alive', 'unmarked grave', 'faithless looting', 'careful study', 'stitcher\'s supplier', 'archon of cruelty', 'atraxa, grand unifier', 'griselbrand', 'troll of khazad-dum', 'grief'],
        aristocrats: ['blood artist', 'zulaport cutthroat', 'cruel celebrant', 'bastion of remembrance', 'viscera seer', 'yawgmoth, thran physician', 'woe strider', 'goblin bombardment', 'carrion feeder', 'plumb the forbidden', 'bloodghast', 'reassembling skeleton', 'young wolf', 'butcher ghoul', 'stitcher\'s supplier'],
        ramp: ['expedition map', 'sylvan scrying', 'ancient stirrings', 'chromatic star', 'chromatic sphere', 'karn liberated', 'wurmcoil engine', 'ulamog, the ceaseless hunger', 'primeval titan', 'craterhoof behemoth', 'cultivate', 'kodama\'s reach', 'explore', 'growth spiral', 'farseek', 'sakura-tribe elder', 'birds of paradise', 'noble hierarch', 'ignoble hierarch', 'delighted halfling', 'utopia sprawl', 'arbor elf', 'llanowar elves', 'elvish mystic']
      };

      // Aplicar tags e inyectar en arquetipos
      // A) SACRIFICE / ARISTOCRATS
      const hasSac = keywords.sacrifice.some(k => oracleText.includes(k));
      if (hasSac) {
        const tag = "sacrifice";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictSac = signatureCards.aristocrats.includes(nameLower) || oracleText.includes("sacrifice a creature:");
        if (isStrictSac) {
          helperAddArchetypeCard("aristocrats", card.name, typeLine.includes("creature") ? 4 : 2);
        }
      }

      // B) AFFINITY
      const hasAff = keywords.affinity.some(k => oracleText.includes(k)) || typeLine.includes("artifact creature") || typeLine.includes("artifact vehicle");
      if (hasAff) {
        const tag = "affinity";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictAff = signatureCards.affinity.includes(nameLower) || oracleText.includes("affinity for");
        if (isStrictAff) {
          helperAddArchetypeCard("affinity", card.name, 4);
        }
      }

      // C) COUNTERS
      const hasCoun = keywords["counter-synergy"].some(k => oracleText.includes(k));
      if (hasCoun) {
        const tag = "counter-synergy";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictCoun = signatureCards.scales.includes(nameLower) || oracleText.includes("hardened scales");
        if (isStrictCoun) {
          helperAddArchetypeCard("scales", card.name, 4);
        }
      }

      // D) REANIMATOR
      const hasRean = keywords.reanimator.some(k => oracleText.includes(k));
      if (hasRean) {
        const tag = "reanimator";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictRean = signatureCards.reanimator.includes(nameLower) || oracleText.includes("reanimate");
        if (isStrictRean) {
          helperAddArchetypeCard("reanimator", card.name, 4);
        }
      }
      // Payoffs de reanimación (criaturas gigantes CMC >= 6)
      if (typeLine.includes("creature") && cmc >= 6 && signatureCards.reanimator.includes(nameLower)) {
        helperAddArchetypeCard("reanimator", card.name, 2);
      }

      // E) LIFEGAIN
      const hasLife = keywords.lifegain.some(k => oracleText.includes(k));
      if (hasLife) {
        const tag = "lifegain";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictLife = signatureCards.lifegain?.includes(nameLower) || oracleText.includes("whenever you gain life");
        if (isStrictLife) {
          helperAddArchetypeCard("lifegain", card.name, 4);
        }
      }

      // F) DISCARD
      const hasDisc = keywords["discard-enabler"].some(k => oracleText.includes(k));
      if (hasDisc) {
        const tag = "discard-enabler";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        if (hasRean && signatureCards.reanimator.includes(nameLower)) {
          helperAddArchetypeCard("reanimator", card.name, 4);
        }
      }

      // G) ENCHANTRESS
      const hasEnch = keywords.enchantment.some(k => oracleText.includes(k)) || typeLine.includes("enchantment");
      if (hasEnch) {
        const tag = "enchantment";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictEnch = signatureCards.enchantress.includes(nameLower) || oracleText.includes("constellation") || oracleText.includes("enchantress");
        if (isStrictEnch) {
          helperAddArchetypeCard("enchantress", card.name, typeLine.includes("creature") ? 3 : 4);
        }
      }

      // H) RAMP / DORK
      const isGreenDork = typeLine.includes("creature") && cmc <= 2 && oracleText.includes("add ") && card.colors?.includes("G");
      const hasRamp = keywords["ramp-dork"].some(k => oracleText.includes(k)) || isGreenDork;
      if (hasRamp) {
        const tag = "ramp-dork";
        if (!cardObj.tags.includes(`tag:${tag}`)) cardObj.tags.push(`tag:${tag}`);
        helperAddTag(tag, card.name);
        
        const isStrictRamp = signatureCards.ramp.includes(nameLower) || oracleText.includes("search your library for a land card");
        if (isStrictRamp) {
          helperAddArchetypeCard("ramp", card.name, 4);
        }
      }
      // Payoffs de Ramp (criaturas gigantes)
      if (typeLine.includes("creature") && cmc >= 6 && hasRamp && signatureCards.ramp.includes(nameLower)) {
        helperAddArchetypeCard("ramp", card.name, 2);
      }
    }

    // Guardar el grafo enriquecido de vuelta
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');
    console.log(`✅ [RAG Enricher] Enriquecimiento completado. Se añadieron ${enrichedCount} nuevas cartas al grafo.`);

  } catch (err) {
    console.error("❌ [RAG Enricher] Error durante el enriquecimiento:", err);
  }
}

// Permitir ejecución directa
if (process.argv[1] && process.argv[1].endsWith('enrichGraph.js')) {
  enrich();
}
