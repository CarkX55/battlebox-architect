// scripts/enrichGraph.js
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const GRAPH_PATH = path.join(PROJECT_ROOT, 'public/data/synergy_graph.json');

function findDatabasePath() {
  const directCandidates = [
    path.join(PROJECT_ROOT, 'DATABASE DOWNLOADS/oracle-cards-20260725090335.jsonl'),
    path.join(PROJECT_ROOT, 'database/oracle-cards-20260428090245.json')
  ];

  for (const candidate of directCandidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  // Auto-scan DATABASE DOWNLOADS directory
  const dlDir = path.join(PROJECT_ROOT, 'DATABASE DOWNLOADS');
  if (fs.existsSync(dlDir)) {
    const files = fs.readdirSync(dlDir);
    const match = files.find(f => f.startsWith('oracle-cards') && (f.endsWith('.jsonl') || f.endsWith('.json')));
    if (match) return path.join(dlDir, match);
  }

  // Auto-scan database directory
  const dbDir = path.join(PROJECT_ROOT, 'database');
  if (fs.existsSync(dbDir)) {
    const files = fs.readdirSync(dbDir);
    const match = files.find(f => f.startsWith('oracle-cards') && (f.endsWith('.jsonl') || f.endsWith('.json')));
    if (match) return path.join(dbDir, match);
  }

  return null;
}

export async function enrich() {
  console.log("🔍 [RAG Enricher] Iniciando enriquecimiento automático del grafo...");

  if (!fs.existsSync(GRAPH_PATH)) {
    console.error(`❌ [RAG Enricher] Error: No se encontró el grafo compilado en ${GRAPH_PATH}.`);
    return;
  }

  const dbPath = findDatabasePath();
  if (!dbPath) {
    console.error(`❌ [RAG Enricher] Error: No se encontró la base de datos de cartas en DATABASE DOWNLOADS/ ni en database/.`);
    return;
  }

  console.log(`📂 [RAG Enricher] Base de datos detectada: ${dbPath}`);

  try {
    const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

    // Asegurar estructura
    if (!graph.cards) graph.cards = {};
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

    // Curados e Icónicos para evitar flood en los arquetipos del grafo
    const signatureCards = {
      affinity: ['cranial plating', 'springleaf drum', 'shadowspear', 'nettlecyst', 'thoughtcast', 'metallic rebuke', 'galvanic blast', 'shrapnel blast', 'welding jar', 'tormod\'s crypt', 'steel overseer', 'patchwork automaton', 'arcbound ravager', 'walking ballista', 'hangarback walker', 'frogmite', 'myr enforcer', 'sojourner\'s companion', 'thought monitor', 'memnite', 'ornithopter', 'signal pest', 'esper sentinel', 'haywire mite', 'gingerbrute', 'stonecoil serpent', 'syr ginger, the meal ender', 'emry, lurker of the loch', 'urza, lord high artificer', 'sai, master thopterist', 'retrofitted transmogrant', 'arcbound worker', 'zabaz, the glimmerwasp', 'mystic forge', 'aether vial'],
      enchantress: ['utopia sprawl', 'wild growth', 'sterling grove', 'solitary confinement', 'sigarda\'s aid', 'sythis, harvest\'s hand', 'sanctum weaver', 'destiny spinner', 'argothian enchantress', 'eidolon of blossoms', 'enchantress\'s presence', 'all that glitters', 'ethereal armor', 'rancor', 'abundant growth', 'kenrith\'s transformation', 'slippery bogle', 'gladecover scout'],
      scales: ['hardened scales', 'the ozolith', 'ozolith, the shattered spire', 'agatha\'s soul cauldron', 'walking ballista', 'hangarback walker', 'arcbound ravager', 'patchwork automaton', 'steel overseer', 'zabaz, the glimmerwasp', 'esper sentinel', 'haywire mite', 'gingerbrute', 'stonecoil serpent', 'syr ginger, the meal ender', 'basking broodscale'],
      dredge: ['creeping chill', 'conflagrate', 'cathartic reunion', 'thrilling discovery', 'life from the loam', 'stinkweed imp', 'golgari thug', 'golgari grave-troll', 'narcomoeba', 'priest of fell rites', 'ox of agonas', 'silversmote ghoul', 'bloodghast', 'priest of forgotten gods', 'merchant of the vale', 'shriekhorn', 'tome scour'],
      reanimator: ['persist', 'goryo\'s vengeance', 'unburial rites', 'footsteps of the goryo', 'dread return', 'reanimate', 'exhume', 'animate dead', 'necromancy', 'entomb', 'buried alive', 'unmarked grave', 'faithless looting', 'careful study', 'stitcher\'s supplier', 'archon of cruelty', 'atraxa, grand unifier', 'griselbrand', 'troll of khazad-dum', 'grief'],
      aristocrats: ['blood artist', 'zulaport cutthroat', 'cruel celebrant', 'bastion of remembrance', 'viscera seer', 'yawgmoth, thran physician', 'woe strider', 'goblin bombardment', 'carrion feeder', 'plumb the forbidden', 'bloodghast', 'reassembling skeleton', 'young wolf', 'butcher ghoul', 'stitcher\'s supplier'],
      ramp: ['expedition map', 'sylvan scrying', 'ancient stirrings', 'chromatic star', 'chromatic sphere', 'karn liberated', 'wurmcoil engine', 'ulamog, the ceaseless hunger', 'primeval titan', 'craterhoof behemoth', 'cultivate', 'kodama\'s reach', 'explore', 'growth spiral', 'farseek', 'sakura-tribe elder', 'birds of paradise', 'noble hierarch', 'ignoble hierarch', 'delighted halfling', 'utopia sprawl', 'arbor elf', 'llanowar elves', 'elvish mystic'],
      burn: ['lightning bolt', 'lava spike', 'rift bolt', 'skewer the critics', 'boros charm', 'searing blaze', 'monastery swiftspear', 'goblin guide', 'eidolon of the great revel', 'roiling vortex', 'light up the stage'],
      storm: ['grapeshot', 'empty the warrens', 'past in flames', 'baral, chief of compliance', 'goblin electromancer', 'manamorphose', 'desperate ritual', 'pyretic ritual', 'gifts ungiven'],
      prowess: ['monastery swiftspear', 'soul-scar mage', 'slippery bogle', 'slickshot show-off', 'dragon\'s rage channeler', 'mishra\'s bauble', 'unholy heat', 'mutagenic growth', 'lava dart', 'crash through', 'expressive iteration'],
      elves: ['elvish archdruid', 'heritage druid', 'wirewood symbiote', 'quirion ranger', 'dwynen\'s elite', 'nettle sentinel', 'ezuri, renegade leader', 'elvish mystic', 'llanowar elves', 'fyndhorn elves', 'leaf-crowned visionary', 'realmwalker', 'elvish warmaster', 'collected company', 'chord of calling'],
      goblins: ['goblin guide', 'goblin chieftain', 'goblin warchief', 'krenko, mob boss', 'rundvelt hordemaster', 'goblin piledriver', 'conspicuous snoop', 'boggart harbinger', 'muxus, goblin grandee', 'goblin matron', 'skirk prospector'],
      merfolk: ['lord of atlantis', 'master of the pearl trident', 'vodalian hexfolder', 'silvergill adept', 'cursecatcher', 'svyelun of sea and sky', 'harbinger of the seas', 'merfolk trickster', 'subtlety', 'aether vial']
    };

    const keywords = {
      sacrifice: ["sacrifice a", "sacrifice another", "dies", "whenever another creature dies", "sacrifice outlet", "sacrifice this"],
      affinity: ["affinity for", "metalcraft", "improvise", "whenever an artifact enters", "artifact creature"],
      "counter-synergy": ["+1/+1 counter", "proliferate", "put a counter", "doubling season"],
      reanimator: ["reanimate", "return from your graveyard to the battlefield", "goryo", "persist", "reanimation"],
      lifegain: ["gain life", "lifelink", "gain 2 life", "gain 3 life"],
      "discard-enabler": ["discard a card", "discard two cards", "discarding a card"],
      enchantment: ["enchantment", "constellation", "aura", "enchant creature"],
      "ramp-dork": ["search your library for a land", "search your library for a basic land", "put onto the battlefield", "add "],
      burn: ["damage to any target", "damage to target player", "damage to each opponent"],
      storm: ["storm", "whenever you cast an instant or sorcery"],
      prowess: ["prowess", "whenever you cast a noncreature spell"]
    };

    let enrichedCount = 0;
    let scannedCount = 0;

    const processCard = (card) => {
      if (!card || !card.name) return;
      scannedCount++;

      const nameLower = card.name.toLowerCase();
      const typeLine = (card.type_line || '').toLowerCase();
      const oracleText = (card.oracle_text || '').toLowerCase();
      const cmc = card.cmc ?? card.mana_value ?? 0;

      // Evaluar tags mecánicos
      const isGreenDork = typeLine.includes("creature") && cmc <= 2 && oracleText.includes("add ") && (card.colors || []).includes("G");
      const hasSac = keywords.sacrifice.some(k => oracleText.includes(k));
      const hasAff = keywords.affinity.some(k => oracleText.includes(k)) || typeLine.includes("artifact creature") || typeLine.includes("artifact vehicle");
      const hasCoun = keywords["counter-synergy"].some(k => oracleText.includes(k));
      const hasRean = keywords.reanimator.some(k => oracleText.includes(k));
      const hasLife = keywords.lifegain.some(k => oracleText.includes(k));
      const hasDisc = keywords["discard-enabler"].some(k => oracleText.includes(k));
      const hasEnch = keywords.enchantment.some(k => oracleText.includes(k)) || typeLine.includes("enchantment");
      const hasRamp = keywords["ramp-dork"].some(k => oracleText.includes(k)) || isGreenDork;
      const hasBurn = keywords.burn.some(k => oracleText.includes(k));
      const hasStorm = keywords.storm.some(k => oracleText.includes(k));
      const hasProwess = keywords.prowess.some(k => oracleText.includes(k));

      // Verificar si es signature card de algún arquetipo
      let isSignature = false;
      for (const [arch, list] of Object.entries(signatureCards)) {
        if (list.includes(nameLower)) {
          isSignature = true;
          helperAddArchetypeCard(arch, card.name, (typeLine.includes('creature') && cmc >= 6) ? 2 : 4);
        }
      }

      const hasRelevantTag = hasSac || hasAff || hasCoun || hasRean || hasLife || hasDisc || hasEnch || hasRamp || hasBurn || hasStorm || hasProwess || isSignature;

      // Registrar solo cartas que ya existían o que tienen tags/arquetipos relevantes para mantener el grafo ágil
      if (hasRelevantTag || graph.cards[nameLower]) {
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

        if (hasSac) {
          if (!cardObj.tags.includes('tag:sacrifice')) cardObj.tags.push('tag:sacrifice');
          helperAddTag('sacrifice', card.name);
          if (signatureCards.aristocrats.includes(nameLower) || oracleText.includes("sacrifice a creature:")) {
            helperAddArchetypeCard("aristocrats", card.name, typeLine.includes("creature") ? 4 : 2);
          }
        }

        if (hasAff) {
          if (!cardObj.tags.includes('tag:affinity')) cardObj.tags.push('tag:affinity');
          helperAddTag('affinity', card.name);
          if (signatureCards.affinity.includes(nameLower) || oracleText.includes("affinity for")) {
            helperAddArchetypeCard("affinity", card.name, 4);
          }
        }

        if (hasCoun) {
          if (!cardObj.tags.includes('tag:counter-synergy')) cardObj.tags.push('tag:counter-synergy');
          helperAddTag('counter-synergy', card.name);
          if (signatureCards.scales.includes(nameLower) || oracleText.includes("hardened scales")) {
            helperAddArchetypeCard("scales", card.name, 4);
          }
        }

        if (hasRean) {
          if (!cardObj.tags.includes('tag:reanimator')) cardObj.tags.push('tag:reanimator');
          helperAddTag('reanimator', card.name);
          if (signatureCards.reanimator.includes(nameLower) || oracleText.includes("reanimate")) {
            helperAddArchetypeCard("reanimator", card.name, 4);
          }
        }

        if (hasLife) {
          if (!cardObj.tags.includes('tag:lifegain')) cardObj.tags.push('tag:lifegain');
          helperAddTag('lifegain', card.name);
        }

        if (hasDisc) {
          if (!cardObj.tags.includes('tag:discard-enabler')) cardObj.tags.push('tag:discard-enabler');
          helperAddTag('discard-enabler', card.name);
        }

        if (hasEnch) {
          if (!cardObj.tags.includes('tag:enchantment')) cardObj.tags.push('tag:enchantment');
          helperAddTag('enchantment', card.name);
          if (signatureCards.enchantress.includes(nameLower) || oracleText.includes("constellation") || oracleText.includes("enchantress")) {
            helperAddArchetypeCard("enchantress", card.name, typeLine.includes("creature") ? 3 : 4);
          }
        }

        if (hasRamp) {
          if (!cardObj.tags.includes('tag:ramp-dork')) cardObj.tags.push('tag:ramp-dork');
          helperAddTag('ramp-dork', card.name);
          if (signatureCards.ramp.includes(nameLower) || oracleText.includes("search your library for a land card")) {
            helperAddArchetypeCard("ramp", card.name, 4);
          }
        }

        if (hasBurn) {
          if (!cardObj.tags.includes('tag:burn')) cardObj.tags.push('tag:burn');
          helperAddTag('burn', card.name);
        }

        if (hasStorm) {
          if (!cardObj.tags.includes('tag:storm')) cardObj.tags.push('tag:storm');
          helperAddTag('storm', card.name);
        }

        if (hasProwess) {
          if (!cardObj.tags.includes('tag:prowess')) cardObj.tags.push('tag:prowess');
          helperAddTag('prowess', card.name);
        }
      }
    };

    if (dbPath.endsWith('.jsonl')) {
      const fileStream = fs.createReadStream(dbPath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
      for await (const line of rl) {
        if (line.trim()) {
          try {
            const card = JSON.parse(line);
            processCard(card);
          } catch (e) {}
        }
      }
    } else {
      const allCards = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      for (const card of allCards) {
        processCard(card);
      }
    }

    // Guardar el grafo enriquecido de vuelta
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(graph, null, 2), 'utf8');
    console.log(`✅ [RAG Enricher] Enriquecimiento completado. Se escanearon ${scannedCount} cartas. Se añadieron ${enrichedCount} nuevas cartas al grafo. Total en grafo: ${Object.keys(graph.cards).length} cartas.`);

  } catch (err) {
    console.error("❌ [RAG Enricher] Error durante el enriquecimiento:", err);
  }
}

// Permitir ejecución directa
if (process.argv[1] && process.argv[1].endsWith('enrichGraph.js')) {
  enrich().catch(err => console.error("❌ [RAG Enricher] Error al ejecutar enrich:", err));
}
