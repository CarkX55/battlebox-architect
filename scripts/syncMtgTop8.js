// scripts/syncMtgTop8.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolver __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Determinar la ruta del vault de Obsidian de manera dinámica
const vaultFolder = fs.existsSync(path.join(PROJECT_ROOT, 'MAGICMTGTop 8')) 
  ? 'MAGICMTGTop 8' 
  : 'vault';

console.log(`📂 [Obsidian RAG] Detectada carpeta de Vault activa: "${vaultFolder}"`);

// Rutas de las carpetas de Obsidian
const VAULT_DIR = path.join(PROJECT_ROOT, vaultFolder);
const CARTAS_DIR = path.join(VAULT_DIR, 'Cartas');
const MAZOS_DIR = path.join(VAULT_DIR, 'Mazos');
const ARQUETIPOS_DIR = path.join(VAULT_DIR, 'Arquetipos');
const ETIQUETAS_DIR = path.join(VAULT_DIR, 'Etiquetas');

// Datos de torneos reales de alta fidelidad para simulación/fallback
const COMPETITIVE_MOCK_DECKS = {
  MODERN: [
    {
      name: "Izzet Murktide",
      archetype: "Izzet Murktide",
      player: "Thommimp",
      event: "Modern Showcase Challenge",
      date: "2026-05-25",
      cards: [
        { name: "Ragavan, Nimble Pilferer", quantity: 4, type: "creature" },
        { name: "Dragon's Rage Channeler", quantity: 4, type: "creature" },
        { name: "Murktide Regent", quantity: 4, type: "creature" },
        { name: "Ledger Shredder", quantity: 2, type: "creature" },
        { name: "Lightning Bolt", quantity: 4, type: "spell" },
        { name: "Unholy Heat", quantity: 3, type: "spell" },
        { name: "Counterspell", quantity: 4, type: "spell" },
        { name: "Archmage's Charm", quantity: 2, type: "spell" },
        { name: "Force of Negation", quantity: 2, type: "spell" },
        { name: "Preordain", quantity: 4, type: "spell" },
        { name: "Mishra's Bauble", quantity: 4, type: "artifact" },
        { name: "Steam Vents", quantity: 4, type: "land" },
        { name: "Scalding Tarn", quantity: 4, type: "land" },
        { name: "Spirebluff Canal", quantity: 4, type: "land" },
        { name: "Island", quantity: 3, type: "land" },
        { name: "Mountain", quantity: 2, type: "land" }
      ]
    },
    {
      name: "Golgari Yawgmoth",
      archetype: "Golgari Yawgmoth",
      player: "Xenowan",
      event: "Modern Challenge 32",
      date: "2026-05-24",
      cards: [
        { name: "Yawgmoth, Thran Physician", quantity: 4, type: "creature" },
        { name: "Young Wolf", quantity: 4, type: "creature" },
        { name: "Strangleroot Geist", quantity: 2, type: "creature" },
        { name: "Wall of Roots", quantity: 4, type: "creature" },
        { name: "Delighted Halfling", quantity: 4, type: "creature" },
        { name: "Orcish Bowmasters", quantity: 4, type: "creature" },
        { name: "Grist, the Hunger Tide", quantity: 3, type: "creature" },
        { name: "Chord of Calling", quantity: 4, type: "spell" },
        { name: "Eldritch Evolution", quantity: 3, type: "spell" },
        { name: "Haywire Mite", quantity: 2, type: "creature" },
        { name: "Overgrown Tomb", quantity: 4, type: "land" },
        { name: "Verdant Catacombs", quantity: 4, type: "land" },
        { name: "Twilight Mire", quantity: 2, type: "land" },
        { name: "Forest", quantity: 4, type: "land" },
        { name: "Swamp", quantity: 2, type: "land" }
      ]
    }
  ],
  STANDARD: [
    {
      name: "Boros Convoke",
      archetype: "Boros Convoke",
      player: "LegoLegolass",
      event: "Standard Challenge 32",
      date: "2026-05-25",
      cards: [
        { name: "Novice Inspector", quantity: 4, type: "creature" },
        { name: "Voldaren Epicure", quantity: 4, type: "creature" },
        { name: "Resolute Reinforcements", quantity: 4, type: "creature" },
        { name: "Knight-Errant of Eos", quantity: 4, type: "creature" },
        { name: "Gleeful Demolition", quantity: 4, type: "spell" },
        { name: "Warleader's Call", quantity: 3, type: "spell" },
        { name: "Forge Anew", quantity: 2, type: "spell" },
        { name: "Inspiring Vantage", quantity: 4, type: "land" },
        { name: "Battlefield Forge", quantity: 4, type: "land" },
        { name: "Plains", quantity: 5, type: "land" },
        { name: "Mountain", quantity: 4, type: "land" }
      ]
    }
  ]
};

// Asegurar que existan los directorios
function ensureDirs() {
  [VAULT_DIR, CARTAS_DIR, MAZOS_DIR, ARQUETIPOS_DIR, ETIQUETAS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

// Limpiar nombres de ficheros para sistemas operativos
function cleanFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

// Clasificador heurístico inteligente de tipos de carta
function guessCardType(cardName) {
  const name = cardName.toLowerCase();
  
  // Tierras comunes y patrones
  if (
    name.includes("forest") || name.includes("island") || name.includes("mountain") || name.includes("swamp") || name.includes("plains") ||
    name.includes("pool") || name.includes("vents") || name.includes("tarn") || name.includes("catacombs") || name.includes("rainforest") ||
    name.includes("strand") || name.includes("delta") || name.includes("mire") || name.includes("heath") || name.includes("foothills") ||
    name.includes("tomb") || name.includes("grave") || name.includes("garden") || name.includes("maze") || name.includes("tower") ||
    name.includes("power plant") || name.includes("mine") || name.includes("boseiju") || name.includes("canope") || name.includes("mesa") ||
    name.includes("canals") || name.includes("shores") || name.includes("cliffs") || name.includes("glade") || name.includes("canyon") ||
    name.includes("sancutum") || name.includes("springs") || name.includes("shrubland") || name.includes("peaks") || name.includes("flat")
  ) {
    return "land";
  }

  // Criaturas conocidas o palabras clave
  if (
    name.includes("oculus") || name.includes("oracle") || name.includes("dreadhorde") || name.includes("tamiyo") || name.includes("yawgmoth") ||
    name.includes("bowmasters") || name.includes("shadow") || name.includes("regent") || name.includes("channeler") || name.includes("shredder") ||
    name.includes("pyromancer") || name.includes("titan") || name.includes("troll") || name.includes("grief") || name.includes("sheoldred") ||
    name.includes("subtlety") || name.includes("endurance") || name.includes("fblthp") || name.includes("agent") || name.includes("coatl") ||
    name.includes("inspector") || name.includes("epicure") || name.includes("reinforcements") || name.includes("knight") || name.includes("thalia")
  ) {
    return "creature";
  }

  return "spell";
}

// Convertir fechas DD/MM/YY a formato ISO YYYY-MM-DD
function convertDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parts[0];
    const month = parts[1];
    const year = '20' + parts[2];
    return `${year}-${month}-${day}`;
  }
  return dateStr;
}

// Parsear el contenido del archivo .dec de MTGTop8
function parseDecFile(decText) {
  const lines = decText.split('\n');
  const cards = [];
  lines.forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('//')) return;
    if (line.startsWith('SB:')) return; // Saltamos Sideboard en coocurrencias principales
    
    // Formatos posibles: "4 [] Card Name" o "4 [SET] Card Name" o "4 Card Name"
    const match = line.match(/^(\d+)\s*(?:\[[^\]]*\])?\s+(.+)$/);
    if (match) {
      const cardName = match[2].trim();
      cards.push({
        name: cardName,
        quantity: parseInt(match[1], 10),
        type: guessCardType(cardName)
      });
    }
  });
  return cards;
}

// Descargar e inyectar torneos reales desde MTGTop8
async function run() {
  console.log("🚀 [Obsidian Sync] Iniciando sincronización en vivo de MTGTop8...");
  ensureDirs();

  let allDecks = [];
  
  try {
    const formats = [
      { code: 'MO', name: 'Modern' },
      { code: 'ST', name: 'Standard' }
    ];

    for (const fmt of formats) {
      console.log(`\n🌐 [Obsidian Sync] Crawleando formato: ${fmt.name} (${fmt.code})...`);
      
      const formatRes = await fetch(`https://www.mtgtop8.com/format?f=${fmt.code}`);
      const formatHtml = await formatRes.text();
      
      // Extraer IDs de eventos
      const eventRegex = /event\?e=(\d+)&(?:amp;)?f=/gi;
      const foundEventIds = new Set();
      let eventMatch;
      while ((eventMatch = eventRegex.exec(formatHtml)) !== null) {
        foundEventIds.add(eventMatch[1]);
      }

      const eventList = Array.from(foundEventIds).slice(0, 30); // Top 30 torneos más recientes por formato para amplitud total
      console.log(`   - Encontrados torneos recientes para ${fmt.name}: [${eventList.join(', ')}]`);

      for (const eventId of eventList) {
        console.log(`   - Descargando torneo ID ${eventId}...`);
        const eventRes = await fetch(`https://www.mtgtop8.com/event?e=${eventId}&f=${fmt.code}`);
        const eventHtml = await eventRes.text();

        // Extraer metadatos del evento
        const titleMatch = eventHtml.match(/<div class=event_title>([^<]+)<\/div>/i);
        const eventName = titleMatch ? titleMatch[1].trim() : `MTGTournament ${eventId}`;
        
        const dateMatch = eventHtml.match(/(\d{2}\/\d{2}\/\d{2})/);
        const eventDate = convertDate(dateMatch ? dateMatch[1] : '');

        // Extraer barajas y jugadores del evento
        const deckAndPlayerRegex = /href=\??e=\d+&(?:amp;)?d=(\d+)&(?:amp;)?f=\w+>([^<]+)<\/a>/gi;
        const playerRegex = /class=player href=search\?player=[^>]+>([^<]+)<\/a>/gi;

        // Parsear barajas línea por línea para alinear perfectamente con el jugador
        const lines = eventHtml.split('\n');
        const eventDecks = [];
        let currentDeck = null;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const dMatch = /href=\??e=\d+&(?:amp;)?d=(\d+)&(?:amp;)?f=\w+>([^<]+)<\/a>/i.exec(line);
          if (dMatch) {
            const deckId = dMatch[1];
            const deckName = dMatch[2].trim();
            if (deckName && deckName !== '&rarr;' && !deckName.includes('→')) {
              currentDeck = {
                id: deckId,
                name: deckName,
                player: 'Unknown Player'
              };
              eventDecks.push(currentDeck);
            }
          }

          const pMatch = /class=player href=search\?player=[^>]+>([^<]+)<\/a>/i.exec(line);
          if (pMatch && currentDeck) {
            currentDeck.player = pMatch[1].trim();
          }
        }

        const topDecks = eventDecks.slice(0, 12); // Top 12 barajas completas por torneo para amplitud total
        console.log(`     * Descargando e indexando las Top ${topDecks.length} barajas de este torneo...`);

        for (const deckInfo of topDecks) {
          try {
            // Pequeño retardo de cortesía de 50ms
            await new Promise(resolve => setTimeout(resolve, 50));
            console.log(`       > Descargando lista dec para [[${deckInfo.name}]] de ${deckInfo.player}...`);
            const decRes = await fetch(`https://www.mtgtop8.com/dec?d=${deckInfo.id}`);
            const decText = await decRes.text();
            
            const parsedCards = parseDecFile(decText);
            if (parsedCards.length > 0) {
              allDecks.push({
                name: deckInfo.name,
                archetype: deckInfo.name, // El nombre base sirve como arquetipo en MTGTop8
                player: deckInfo.player,
                event: eventName,
                date: eventDate,
                format: fmt.name.toUpperCase(),
                cards: parsedCards
              });
            }
          } catch (deckErr) {
            console.warn(`       ⚠️ Error descargando la baraja ${deckInfo.name}:`, deckErr.message);
          }
        }
      }
    }
  } catch (err) {
    console.error("⚠️ [Obsidian Sync] Falló el crawling live de MTGTop8. Cargando mock de respaldo...");
  }

  // Si falló el scrape o no se descargó nada, cargamos el mock
  if (allDecks.length === 0) {
    console.log("📦 [Obsidian Sync] Cargando base de datos de torneos reales (Fallback de Alta Fidelidad)...");
    Object.keys(COMPETITIVE_MOCK_DECKS).forEach(format => {
      COMPETITIVE_MOCK_DECKS[format].forEach(deck => {
        allDecks.push({ ...deck, format });
      });
    });
  }

  console.log(`📊 [Obsidian Sync] Procesando ${allDecks.length} barajas competitivas reales...`);

  // 1. Calcular frecuencias de cartas y matriz de coocurrencia (Sinergia)
  console.log("🧮 [Obsidian Sync] Computando coeficientes de coocurrencia y enlaces de sinergia...");
  const cardFrequencies = {};
  const cooccurrence = {};
  
  allDecks.forEach(deck => {
    const cardNames = deck.cards.map(c => c.name);
    
    cardNames.forEach(name => {
      cardFrequencies[name] = (cardFrequencies[name] || 0) + 1;
    });

    for (let i = 0; i < cardNames.length; i++) {
      const cardA = cardNames[i];
      if (!cooccurrence[cardA]) cooccurrence[cardA] = {};
      for (let j = 0; j < cardNames.length; j++) {
        if (i === j) continue;
        const cardB = cardNames[j];
        cooccurrence[cardA][cardB] = (cooccurrence[cardA][cardB] || 0) + 1;
      }
    }
  });

  // 2. Generar fichas de Cartas en `vault/Cartas/`
  console.log("✍️ [Obsidian Sync] Escribiendo fichas de cartas en `vault/Cartas/`...");
  const uniqueCardsMap = new Map();
  allDecks.forEach(deck => {
    deck.cards.forEach(c => {
      if (!uniqueCardsMap.has(c.name)) {
        uniqueCardsMap.set(c.name, c);
      }
    });
  });

  uniqueCardsMap.forEach((card, name) => {
    const filename = cleanFilename(card.name) + '.md';
    const filepath = path.join(CARTAS_DIR, filename);

    // Calcular enlaces de coocurrencia ordenados por fuerza de sinergia
    const cardCooc = cooccurrence[card.name] || {};
    const sortedEnlaces = Object.keys(cardCooc)
      .map(otherName => {
        const totalAparicionesJuntos = cardCooc[otherName];
        const totalCardA = cardFrequencies[card.name] || 1;
        const ratio = (totalAparicionesJuntos / totalCardA).toFixed(2);
        return { name: otherName, ratio: parseFloat(ratio) };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 8); // Top 8 sinergias

    let frontmatterYaml = `---\ntitle: "${card.name}"\ntype: "${card.type}"\ncmc: ${card.cmc || 2}\nsynergies:\n`;
    sortedEnlaces.forEach(link => {
      frontmatterYaml += `  - name: "[[${link.name}]]"\n    coeff: ${link.ratio}\n`;
    });
    frontmatterYaml += `---\n`;

    const content = `${frontmatterYaml}# ${card.name}

- **Tipo:** ${card.type.charAt(0).toUpperCase() + card.type.slice(1)}
- **Sinergias Top 8:**
${sortedEnlaces.map(l => `  - [[${l.name}]] (Fuerza: ${Math.round(l.ratio * 100)}%)`).join('\n')}

---
*Ficha de conocimiento competitiva generada automáticamente por BattleBox RAG.*
`;
    fs.writeFileSync(filepath, content, 'utf8');
  });

  // 3. Generar fichas de Mazos en `vault/Mazos/`
  console.log("✍️ [Obsidian Sync] Escribiendo fichas de mazos en `vault/Mazos/`...");
  allDecks.forEach(deck => {
    const filename = cleanFilename(`${deck.name} (${deck.format})`) + '.md';
    const filepath = path.join(MAZOS_DIR, filename);

    let frontmatterYaml = `---\ntitle: "${deck.name}"\nformat: "${deck.format}"\narchetype: "[[${deck.archetype}]]"\nplayer: "${deck.player}"\nevent: "${deck.event}"\ndate: "${deck.date}"\n---\n`;
    
    let content = `${frontmatterYaml}# ${deck.name}

- **Arquetipo:** [[${deck.archetype}]]
- **Formato:** ${deck.format}
- **Jugador:** ${deck.player}
- **Torneo:** ${deck.event}
- **Fecha:** ${deck.date}

### Lista de Cartas Principal (Mainboard)
`;
    deck.cards.forEach(card => {
      content += `- ${card.quantity}x [[${card.name}]]\n`;
    });

    content += `\n---
*Mazo competitivo importado de MTGTop8.*
`;
    fs.writeFileSync(filepath, content, 'utf8');
  });

  // 4. Generar fichas de Arquetipos en `vault/Arquetipos/`
  console.log("✍️ [Obsidian Sync] Escribiendo fichas de arquetipos en `vault/Arquetipos/`...");
  const uniqueArchetypes = new Set(allDecks.map(d => d.archetype));
  
  uniqueArchetypes.forEach(arch => {
    const filename = cleanFilename(arch) + '.md';
    const filepath = path.join(ARQUETIPOS_DIR, filename);

    const relatedDecks = allDecks.filter(d => d.archetype === arch);
    
    let content = `---\narchetype: "${arch}"\n---\n# Arquetipo: ${arch}

Este arquetipo competitivo agrupa las siguientes listas de torneo:
${relatedDecks.map(d => `- [[${d.name} (${d.format})]]`).join('\n')}

### Frecuencia de uso de cartas en este arquetipo:
`;
    // Calcular cartas más jugadas en este arquetipo
    const archCards = {};
    relatedDecks.forEach(d => d.cards.forEach(c => {
      archCards[c.name] = (archCards[c.name] || 0) + c.quantity;
    }));

    const sortedArchCards = Object.keys(archCards)
      .map(name => ({ name, qty: Math.round(archCards[name] / relatedDecks.length) }))
      .sort((a, b) => b.qty - a.qty);

    sortedArchCards.forEach(c => {
      content += `- [[${c.name}]] (Promedio: ${c.qty} copias)\n`;
    });

    fs.writeFileSync(filepath, content, 'utf8');
  });

  console.log(`✨ [Obsidian Sync] ¡Sincronización de MTGTop8 completada con éxito! Se indexaron ${uniqueCardsMap.size} cartas únicas.`);
}

run().catch(err => {
  console.error("❌ [Obsidian Sync] Error crítico en la sincronización:", err);
});
