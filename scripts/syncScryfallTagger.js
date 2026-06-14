// scripts/syncScryfallTagger.js
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

// Rutas de Obsidian
const VAULT_DIR = path.join(PROJECT_ROOT, vaultFolder);
const CARTAS_DIR = path.join(VAULT_DIR, 'Cartas');
const ETIQUETAS_DIR = path.join(VAULT_DIR, 'Etiquetas');

const DB_PATH = path.join(PROJECT_ROOT, 'database/oracle-cards-20260428090245.json');
const OUTPUT_INDEX_PATH = path.join(PROJECT_ROOT, 'public/data/oracle_tags_index.json');

// Mapa de etiquetas mecánicas locales para cartas clave (Fidelidad Pro-Casual y Sinergias)
const CASUAL_TAGS_MAP = {
  "Viscera Seer": ["sacrifice-outlet", "combo-enabler", "vampire"],
  "Carrion Feeder": ["sacrifice-outlet", "zombie"],
  "Yawgmoth, Thran Physician": ["sacrifice-outlet", "draw-engine", "human"],
  "Woe Strider": ["sacrifice-outlet", "escape"],
  "Goblin Bombardment": ["sacrifice-outlet", "direct-damage"],
  "Blood Artist": ["sacrifice-payoff", "life-drain", "vampire"],
  "Zulaport Cutthroat": ["sacrifice-payoff", "life-drain", "human"],
  "Cruel Celebrant": ["sacrifice-payoff", "life-drain", "vampire"],
  "Mayhem Devil": ["sacrifice-payoff", "direct-damage", "devil"],
  "Bastion of Remembrance": ["sacrifice-payoff", "life-drain", "enchantment"],
  "Putrid Imp": ["discard-outlet", "reanimator-enabler", "zombie"],
  "Stitcher's Supplier": ["mill-self", "reanimator-enabler", "zombie"],
  "Grief": ["discard-outlet", "interaction", "elemental"],
  "Faithless Looting": ["discard-outlet", "cantrip", "red-staple"],
  "Entomb": ["reanimator-enabler", "search-library"],
  "Reanimate": ["reanimation-spell", "black-staple"],
  "Animate Dead": ["reanimation-spell", "aura"],
  "Priest of Fell Rites": ["reanimation-spell", "human", "lifelink"],
  "Archon of Cruelty": ["reanimator-payoff", "giant-threat"],
  "Griselbrand": ["reanimator-payoff", "giant-threat", "demon"],
  "Young Pyromancer": ["spellslinger-payoff", "token-generator", "human"],
  "Murktide Regent": ["spellslinger-payoff", "delve-threat", "dragon"],
  "Dragon's Rage Channeler": ["spellslinger-payoff", "mill-self", "human"],
  "Third Path Iconoclast": ["spellslinger-payoff", "token-generator", "human"],
  "Preordain": ["spellslinger-cantrip", "blue-staple"]
};

// Asegurar que existan los directorios
function ensureDirs() {
  [VAULT_DIR, CARTAS_DIR, ETIQUETAS_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  const outputDir = path.dirname(OUTPUT_INDEX_PATH);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
}

// Limpiar nombres de ficheros
function cleanFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

async function run() {
  console.log("🚀 [Obsidian Tagger] Iniciando sincronización de Scryfall Tagger...");
  ensureDirs();

  // 1. Cargar la DB local de cartas para mapear oracle_id -> name
  console.log("⏳ [Obsidian Tagger] Cargando base de datos para mapear oracle_id a nombre...");
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ [Obsidian Tagger] Error: No existe la base de datos de cartas en ${DB_PATH}.`);
    process.exit(1);
  }
  
  const cards = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  const oracleIdToName = {};
  for (const card of cards) {
    if (card.oracle_id && card.name) {
      oracleIdToName[card.oracle_id] = card.name.toLowerCase();
    }
  }
  console.log(`✅ [Obsidian Tagger] Mapeados ${Object.keys(oracleIdToName).length} oracle_ids.`);

  // 2. Descargar e indexar los tags oficiales de Scryfall Tagger
  console.log("🌐 [Obsidian Tagger] Obteniendo metadata de Scryfall Bulk Data...");
  const bulkRes = await fetch('https://api.scryfall.com/bulk-data', {
    headers: { 'User-Agent': 'BattleboxArchitect/1.0', 'Accept': 'application/json' }
  });
  const bulkJson = await bulkRes.json();
  const tagsObj = bulkJson.data.find(d => d.type === 'oracle_tags');
  if (!tagsObj) {
    throw new Error('oracle_tags not found in Scryfall bulk data list');
  }

  console.log(`📥 [Obsidian Tagger] Descargando tags oficiales desde: ${tagsObj.download_uri}`);
  const tagsRes = await fetch(tagsObj.download_uri, {
    headers: { 'User-Agent': 'BattleboxArchitect/1.0' }
  });
  const tagsJson = await tagsRes.json();
  console.log(`✅ [Obsidian Tagger] Cargados ${tagsJson.length} tags oficiales.`);

  const oracleTagsIndex = {};

  // Procesar tags descargados
  for (const tag of tagsJson) {
    const tagSlug = tag.slug;
    if (!tagSlug || !tag.taggings) continue;
    
    for (const tagging of tag.taggings) {
      const oId = tagging.oracle_id;
      if (!oId) continue;
      const cardName = oracleIdToName[oId];
      if (cardName) {
        if (!oracleTagsIndex[cardName]) {
          oracleTagsIndex[cardName] = [];
        }
        if (!oracleTagsIndex[cardName].includes(tagSlug)) {
          oracleTagsIndex[cardName].push(tagSlug);
        }
      }
    }
  }

  // Integrar CASUAL_TAGS_MAP manual en el índice también
  console.log("➕ [Obsidian Tagger] Integrando tags manuales del CASUAL_TAGS_MAP...");
  Object.entries(CASUAL_TAGS_MAP).forEach(([cardName, tags]) => {
    const cardNameLower = cardName.toLowerCase();
    if (!oracleTagsIndex[cardNameLower]) {
      oracleTagsIndex[cardNameLower] = [];
    }
    tags.forEach(t => {
      if (!oracleTagsIndex[cardNameLower].includes(t)) {
        oracleTagsIndex[cardNameLower].push(t);
      }
    });
  });

  // Guardar archivo public/data/oracle_tags_index.json
  fs.writeFileSync(OUTPUT_INDEX_PATH, JSON.stringify(oracleTagsIndex, null, 2), 'utf8');
  console.log(`✨ [Obsidian Tagger] Índice de Oracle Tags exportado a: ${OUTPUT_INDEX_PATH}`);

  // 3. Generar fichas de Etiquetas en `vault/Etiquetas/` para Obsidian
  const allUniqueTags = new Set();
  Object.values(CASUAL_TAGS_MAP).forEach(tags => tags.forEach(t => allUniqueTags.add(t)));

  console.log(`🏷️ [Obsidian Tagger] Generando ${allUniqueTags.size} fichas de etiquetas mecánicas en Obsidian...`);
  allUniqueTags.forEach(tag => {
    const filename = cleanFilename(`tag-${tag}`) + '.md';
    const filepath = path.join(ETIQUETAS_DIR, filename);

    // Buscar qué cartas tienen esta etiqueta
    const matchingCards = Object.keys(CASUAL_TAGS_MAP).filter(cardName => 
      CASUAL_TAGS_MAP[cardName].includes(tag)
    );

    const content = `---\ntag: "${tag}"\n---\n# Etiqueta Mecánica: tag:${tag}

Esta etiqueta agrupa a las cartas que cumplen el rol de **${tag.replace('-', ' ')}** en el ecosistema de sinergias.

### Cartas enlazadas a esta mecánica:
${matchingCards.map(c => `- [[${c}]]`).join('\n')}

---
*Etiqueta clasificada por el motor semántico de BattleBox Tagger.*
`;
    fs.writeFileSync(filepath, content, 'utf8');
  });

  // 4. Modificar las fichas de Cartas en `vault/Cartas/` para inyectar los enlaces a las etiquetas
  console.log("🔗 [Obsidian Tagger] Enlazando etiquetas a las fichas de cartas en `vault/Cartas/`...");
  Object.keys(CASUAL_TAGS_MAP).forEach(cardName => {
    const filename = cleanFilename(cardName) + '.md';
    const filepath = path.join(CARTAS_DIR, filename);

    const tags = CASUAL_TAGS_MAP[cardName];
    const tagLinks = tags.map(t => `[[tag-${t}]]`);

    if (fs.existsSync(filepath)) {
      let content = fs.readFileSync(filepath, 'utf8');

      // Si la carta ya tiene las etiquetas inyectadas, no la duplicamos
      if (!content.includes('tag:')) {
        // Encontrar la sección de metadatos o el final del frontmatter para inyectar
        const lines = content.split('\n');
        let frontmatterEndIndex = -1;
        let countYaml = 0;

        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim() === '---') {
            countYaml++;
            if (countYaml === 2) {
              frontmatterEndIndex = i;
              break;
            }
          }
        }

        if (frontmatterEndIndex !== -1) {
          // Inyectamos las etiquetas en el YAML Frontmatter
          lines.splice(frontmatterEndIndex, 0, `tags:\n${tags.map(t => `  - "tag:${t}"`).join('\n')}`);
          
          // También inyectamos enlaces de texto al final del archivo
          let body = lines.join('\n');
          body += `\n\n### Ecosistemas Mecánicos (Tagger Links)\n`;
          body += `${tagLinks.map(link => `- ${link}`).join('\n')}\n`;

          fs.writeFileSync(filepath, body, 'utf8');
          console.log(`✅ [Obsidian Tagger] Conectada carta [[${cardName}]] con etiquetas: ${tags.join(', ')}`);
        }
      }
    } else {
      // Si la carta no existía en los mazos competitivos, creamos una ficha de carta casual desde cero
      let frontmatterYaml = `---\ntitle: "${cardName}"\ntype: "creature"\ncmc: 2\ntags:\n${tags.map(t => `  - "tag:${t}"`).join('\n')}\nsynergies: []\n---\n`;
      let content = `${frontmatterYaml}# ${cardName}

- **Tipo:** Carta Casual de Sinergia
- **Etiquetas de Rol:** ${tags.map(t => `[[tag-${t}]]`).join(', ')}

---
*Ficha casual de sinergia generada por BattleBox Tagger.*
`;
      fs.writeFileSync(filepath, content, 'utf8');
      console.log(`🆕 [Obsidian Tagger] Creada ficha para carta casual [[${cardName}]] con etiquetas: ${tags.join(', ')}`);
    }
  });

  console.log("✨ [Obsidian Tagger] ¡Sincronización de Scryfall Tagger completada con éxito!");
}

run().catch(err => {
  console.error("❌ [Obsidian Tagger] Error crítico en la sincronización:", err);
});
