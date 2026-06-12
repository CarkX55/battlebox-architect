// scripts/compileVault.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { enrich } from './enrichGraph.js';

// Resolver __dirname en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Determinar la ruta del vault de Obsidian de manera dinámica
const vaultFolder = fs.existsSync(path.join(PROJECT_ROOT, 'MAGICMTGTop 8')) 
  ? 'MAGICMTGTop 8' 
  : 'vault';

console.log(`📂 [Obsidian Compiler] Usando carpeta de Vault activa: "${vaultFolder}"`);

const VAULT_DIR = path.join(PROJECT_ROOT, vaultFolder);
const CARTAS_DIR = path.join(VAULT_DIR, 'Cartas');
const MAZOS_DIR = path.join(VAULT_DIR, 'Mazos');
const ARQUETIPOS_DIR = path.join(VAULT_DIR, 'Arquetipos');
const ETIQUETAS_DIR = path.join(VAULT_DIR, 'Etiquetas');

const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'synergy_graph.json');

// Asegurar que existan los directorios
function ensureDirs() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// Parser simple de YAML Frontmatter sin dependencias externas
function parseFrontmatter(fileContent) {
  const result = {
    metadata: {},
    content: ''
  };

  const lines = fileContent.split('\n');
  if (lines[0].trim() !== '---') {
    result.content = fileContent;
    return result;
  }

  let yamlLines = [];
  let bodyLines = [];
  let inYaml = true;
  let yamlDelimCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') {
      yamlDelimCount++;
      if (yamlDelimCount === 2) {
        inYaml = false;
        continue;
      }
      continue;
    }

    if (inYaml) {
      yamlLines.push(line);
    } else {
      bodyLines.push(line);
    }
  }

  result.content = bodyLines.join('\n');

  // Procesar YAML básico
  let currentKey = null;
  let isInsideArray = false;
  let currentArray = [];

  yamlLines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Detectar si es un elemento de lista en YAML (ej: - name: "..." o - "tag:...")
    if (trimmed.startsWith('-')) {
      const arrayItemStr = trimmed.slice(1).trim();
      
      // Parsear elemento complejo de array (ej: name: "[[Grief]]" o coeff: 0.8)
      if (arrayItemStr.includes(':') && !arrayItemStr.startsWith('"') && !arrayItemStr.startsWith("'")) {
        const colonIndex = arrayItemStr.indexOf(':');
        const key = arrayItemStr.substring(0, colonIndex).trim();
        let val = arrayItemStr.substring(colonIndex + 1).trim();
        
        // Quitar comillas y enlaces de Obsidian [[...]]
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith('[[') && val.endsWith(']]')) val = val.slice(2, -2);
        
        // Es un objeto del array
        if (currentArray.length === 0 || typeof currentArray[currentArray.length - 1] === 'string') {
          currentArray.push({});
        }
        
        const lastObj = currentArray[currentArray.length - 1];
        lastObj[key] = isNaN(val) ? val : parseFloat(val);
      } else {
        // Elemento simple de array (ej: "tag:sacrifice-outlet")
        let val = arrayItemStr;
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith('[[') && val.endsWith(']]')) val = val.slice(2, -2);
        currentArray.push(val);
      }
      
      if (currentKey) {
        result.metadata[currentKey] = currentArray;
      }
      return;
    }

    // Es un par clave: valor estándar
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex !== -1) {
      const key = trimmed.substring(0, colonIndex).trim();
      let val = trimmed.substring(colonIndex + 1).trim();
      
      if (val.startsWith('[') && val.endsWith(']')) {
        // Es un array simple en línea (ej: [B, U])
        const rawArray = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
        result.metadata[key] = rawArray;
        return;
      }

      if (val === '') {
        // Inicializar posible array multilínea que sigue
        currentKey = key;
        currentArray = [];
        isInsideArray = true;
      } else {
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        if (val.startsWith('[[') && val.endsWith(']]')) val = val.slice(2, -2);
        result.metadata[key] = isNaN(val) ? val : parseFloat(val);
        isInsideArray = false;
        currentKey = null;
      }
    }
  });

  return result;
}

// Ejecutar compilación de Obsidian a JSON estático
async function run() {
  console.log("🚀 [Obsidian Compiler] Iniciando pre-compilación del Vault de Obsidian...");
  ensureDirs();

  if (!fs.existsSync(VAULT_DIR)) {
    console.error(`❌ [Obsidian Compiler] Error: La carpeta "${vaultFolder}/" no existe. Ejecuta primero scripts/syncMtgTop8.js`);
    process.exit(1);
  }

  const consolidatedGraph = {
    compileDate: Date.now(),
    cards: {},
    decks: {},
    archetypes: {},
    tags: {}
  };

  // 1. Escanear Cartas
  if (fs.existsSync(CARTAS_DIR)) {
    const cardFiles = fs.readdirSync(CARTAS_DIR).filter(f => f.endsWith('.md'));
    console.log(`🔍 [Obsidian Compiler] Escaneando ${cardFiles.length} fichas de cartas...`);
    cardFiles.forEach(file => {
      const content = fs.readFileSync(path.join(CARTAS_DIR, file), 'utf8');
      const parsed = parseFrontmatter(content);
      const title = parsed.metadata.title || path.basename(file, '.md');
      
      consolidatedGraph.cards[title.toLowerCase()] = {
        name: title,
        type: parsed.metadata.type || 'creature',
        cmc: parsed.metadata.cmc || 2,
        synergies: parsed.metadata.synergies || [],
        tags: parsed.metadata.tags || []
      };
    });
  }

  // 2. Escanear Mazos
  if (fs.existsSync(MAZOS_DIR)) {
    const deckFiles = fs.readdirSync(MAZOS_DIR).filter(f => f.endsWith('.md'));
    console.log(`🔍 [Obsidian Compiler] Escaneando ${deckFiles.length} listas de mazos...`);
    deckFiles.forEach(file => {
      const content = fs.readFileSync(path.join(MAZOS_DIR, file), 'utf8');
      const parsed = parseFrontmatter(content);
      const title = parsed.metadata.title || path.basename(file, '.md');

      // Extraer cartas de la lista leyendo los enlaces del markdown
      const cards = [];
      const lines = parsed.content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s*-\s*(\d+)x\s+\[\[(.*?)\]\]/);
        if (match) {
          cards.push({
            name: match[2].trim(),
            quantity: parseInt(match[1], 10)
          });
        }
      });

      consolidatedGraph.decks[title.toLowerCase()] = {
        name: title,
        format: parsed.metadata.format || 'MODERN',
        archetype: parsed.metadata.archetype || '',
        player: parsed.metadata.player || '',
        event: parsed.metadata.event || '',
        date: parsed.metadata.date || '',
        cards: cards
      };
    });
  }

  // 3. Escanear Arquetipos
  if (fs.existsSync(ARQUETIPOS_DIR)) {
    const archFiles = fs.readdirSync(ARQUETIPOS_DIR).filter(f => f.endsWith('.md'));
    console.log(`🔍 [Obsidian Compiler] Escaneando ${archFiles.length} perfiles de arquetipo...`);
    archFiles.forEach(file => {
      const content = fs.readFileSync(path.join(ARQUETIPOS_DIR, file), 'utf8');
      const parsed = parseFrontmatter(content);
      const archetypeKey = parsed.metadata.archetype || path.basename(file, '.md');

      // Extraer cartas recomendadas del cuerpo de texto
      const recommendedCards = [];
      const lines = parsed.content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s*-\s*\[\[(.*?)\]\]\s*\(Promedio:\s*(\d+)\s*copias\)/);
        if (match) {
          recommendedCards.push({
            name: match[1].trim(),
            avgQuantity: parseInt(match[2], 10)
          });
        }
      });

      consolidatedGraph.archetypes[archetypeKey.toLowerCase()] = {
        name: archetypeKey,
        cards: recommendedCards
      };
    });
  }

  // 4. Escanear Etiquetas (Tagger)
  if (fs.existsSync(ETIQUETAS_DIR)) {
    const tagFiles = fs.readdirSync(ETIQUETAS_DIR).filter(f => f.endsWith('.md'));
    console.log(`🔍 [Obsidian Compiler] Escaneando ${tagFiles.length} etiquetas mecánicas...`);
    tagFiles.forEach(file => {
      const content = fs.readFileSync(path.join(ETIQUETAS_DIR, file), 'utf8');
      const parsed = parseFrontmatter(content);
      const tagKey = parsed.metadata.tag || path.basename(file, '.md').replace('tag-', '');

      // Extraer cartas asociadas
      const cards = [];
      const lines = parsed.content.split('\n');
      lines.forEach(line => {
        const match = line.match(/^\s*-\s*\[\[(.*?)\]\]/);
        if (match) {
          cards.push(match[1].trim());
        }
      });

      consolidatedGraph.tags[tagKey.toLowerCase()] = {
        tag: tagKey,
        cards: cards
      };
    });
  }

  // 5. Guardar Grafo Semántico pre-compilado en JSON
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(consolidatedGraph, null, 2), 'utf8');
  console.log(`✨ [Obsidian Compiler] ¡Grafo consolidado exportado a: ${OUTPUT_FILE}!`);
  
  // Enriquecer el grafo con todos los datos de Scryfall
  enrich();
}

run().catch(err => {
  console.error("❌ [Obsidian Compiler] Error crítico en la compilación:", err);
});
