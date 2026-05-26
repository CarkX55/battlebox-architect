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

// Mapa de etiquetas mecánicas para cartas clave (Fidelidad Pro-Casual y Sinergias abstractas)
const CASUAL_TAGS_MAP = {
  // Motores de Sacrificio (Sacrifice Outlets)
  "Viscera Seer": ["sacrifice-outlet", "combo-enabler", "vampire"],
  "Carrion Feeder": ["sacrifice-outlet", "zombie"],
  "Yawgmoth, Thran Physician": ["sacrifice-outlet", "draw-engine", "human"],
  "Woe Strider": ["sacrifice-outlet", "escape"],
  "Goblin Bombardment": ["sacrifice-outlet", "direct-damage"],

  // Payoffs de Aristócratas (Drenadores de vida / Muerte)
  "Blood Artist": ["sacrifice-payoff", "life-drain", "vampire"],
  "Zulaport Cutthroat": ["sacrifice-payoff", "life-drain", "human"],
  "Cruel Celebrant": ["sacrifice-payoff", "life-drain", "vampire"],
  "Mayhem Devil": ["sacrifice-payoff", "direct-damage", "devil"],
  "Bastion of Remembrance": ["sacrifice-payoff", "life-drain", "enchantment"],

  // Habilitadores de Descarte / Dragado (Discard Outlets / Mill)
  "Putrid Imp": ["discard-outlet", "reanimator-enabler", "zombie"],
  "Stitcher's Supplier": ["mill-self", "reanimator-enabler", "zombie"],
  "Grief": ["discard-outlet", "interaction", "elemental"],
  "Faithless Looting": ["discard-outlet", "cantrip", "red-staple"],
  "Entomb": ["reanimator-enabler", "search-library"],

  // Hechizos de Reanimación (Reanimation Spells)
  "Reanimate": ["reanimation-spell", "black-staple"],
  "Animate Dead": ["reanimation-spell", "aura"],
  "Priest of Fell Rites": ["reanimation-spell", "human", "lifelink"],
  "Archon of Cruelty": ["reanimator-payoff", "giant-threat"],
  "Griselbrand": ["reanimator-payoff", "giant-threat", "demon"],

  // Spellslinger / Prowess
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
}

// Limpiar nombres de ficheros
function cleanFilename(name) {
  return name.replace(/[\\/:*?"<>|]/g, '').trim();
}

async function run() {
  console.log("🚀 [Obsidian Tagger] Iniciando sincronización de Scryfall Tagger...");
  ensureDirs();

  // 1. Generar fichas de Etiquetas en `vault/Etiquetas/`
  const allUniqueTags = new Set();
  Object.values(CASUAL_TAGS_MAP).forEach(tags => tags.forEach(t => allUniqueTags.add(t)));

  console.log(`🏷️ [Obsidian Tagger] Generando ${allUniqueTags.size} fichas de etiquetas mecánicas...`);
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

  // 2. Modificar las fichas de Cartas en `vault/Cartas/` para inyectar los enlaces a las etiquetas
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
        let newContent = '';
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
