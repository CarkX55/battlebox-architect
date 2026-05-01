import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSON_PATH = path.join(__dirname, '../../database/oracle-cards-20260428090245.json');

console.log('=== TEST: SCRYFALL JSON PARSING ===\n');

try {
  const raw = fs.readFileSync(JSON_PATH, 'utf-8');
  const data = JSON.parse(raw);
  
  console.log(`✓ JSON parseado correctamente`);
  console.log(`  Total de cartas: ${data.length.toLocaleString()}`);
  console.log(`  Tipo de dato: ${Array.isArray(data) ? 'Array' : typeof data}`);
  
  if (data.length > 0) {
    console.log('\n=== EJEMPLO DE CARTA (índice 0) ===');
    const sample = data[0];
    console.log('  id:', sample.id);
    console.log('  name:', sample.name);
    console.log('  mana_value:', sample.mana_value);
    console.log('  type_line:', sample.type_line);
    console.log('  oracle_text:', sample.oracle_text?.substring(0, 80) + '...');
    console.log('  colors:', sample.colors);
    console.log('  rarity:', sample.rarity);
    console.log('  image_uris:', sample.image_uris ? 'SÍ' : 'NO');
    
    console.log('\n=== BÚSQUEDA DE "LIGHTNING" ===');
    const lightning = data.filter(c => c.name && c.name.toLowerCase().includes('lightning'));
    console.log(`  Cartas con "Lightning": ${lightning.length}`);
    if (lightning.length > 0) {
      console.log('  Primeros 3:');
      lightning.slice(0, 3).forEach((c, i) => {
        console.log(`    ${i+1}. ${c.name} (${c.mana_value})`);
      });
    }
  }
} catch (err) {
  console.error('✗ ERROR:', err.message);
}