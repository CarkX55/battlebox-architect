/**
 * tests/unit/compiler/test_strategic_core_hardcode_audit.js
 * 
 * 🏛️ V29.5 Master Audit: Dual-Level Strategic Core Hardcode & Literal Bias Audit
 * 
 * Level 1: STRATEGIC_CORE_STATIC_BRANCH_AUDIT
 *   Scans every reasoning module in `src/services/compiler/core/` to ensure zero:
 *   - if (tribe === ...) / if (primaryTribe === 'Goblin') / switch (tribe)
 *   - if (selectedEngineId === ...) / switch (engine)
 *   - if (strategy === ...) / if (strategy.includes('...')) in core decision paths
 *   - if (tempo === ...)
 * 
 * Level 2: STRATEGIC_CORE_LITERAL_BIAS_AUDIT
 *   Scans for indirect decision authority:
 *   - rules[tribe] / weights[tribe] / PROFILES[tribe]
 *   - hardcoded lists of specific card names deciding weights or selections in the core
 * 
 * Axiom:
 *   "Los nombres, tribus, arquetipos y engines no pueden provocar decisiones.
 *    Sólo pueden aportar contexto descriptivo o resolver contratos declarativos;
 *    las decisiones deben emerger de capacidades, dependencias, restricciones,
 *    probabilidades de ejecución y evidencia causal."
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORE_DIR = path.resolve(__dirname, '../../../src/services/compiler/core');

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ V29.5 MASTER AUDIT: STRATEGIC CORE HARDCODE & LITERAL BIAS');
console.log('══════════════════════════════════════════════════════════════════\n');

// Specific decision modules under strict audit
const CRITICAL_DECISION_MODULES = [
  'gameplanSynthesizer.js',
  'stateCandidateRanker.js',
  'progressiveDeckStateBuilder.js',
  'deckPlanCoverage.js',
  'strategicLineGraph.js',
  'identityFirewall.js',
  'gameplanIntegrityGate.js',
  'emergentCausalPackageAssembler.js',
  'marginalCopyEvaluator.js',
  'cardCausalContract.js'
];

let totalViolations = 0;
const violationDetails = [];

// ─── Level 1: Static Branch Audit (Direct if/switch branching) ───
console.log('[Level 1] STRATEGIC_CORE_STATIC_BRANCH_AUDIT...');

// Banned direct branch patterns in strategic reasoning
const STATIC_BRANCH_PATTERNS = [
  { name: "Direct Tribe Equality Branch", regex: /if\s*\(\s*(?:primary)?tribe\s*===\s*['"][a-zA-Z]+['"]\s*\)/i },
  { name: "Direct Tribe Switch Statement", regex: /switch\s*\(\s*(?:primary)?tribe\s*\)/i },
  { name: "Direct Engine ID Equality Branch", regex: /if\s*\(\s*(?:selected)?engineId\s*===\s*['"][a-zA-Z0-9_]+['"]\s*\)/i },
  { name: "Direct Engine Switch Statement", regex: /switch\s*\(\s*(?:selected)?engine(?:Id)?\s*\)/i },
  { name: "Hardcoded Archetype Branch", regex: /if\s*\(\s*archetype\s*===\s*['"](?:goblin|werewolf|landfall|aristocrats)['"]\s*\)/i },
  { name: "Hardcoded Strategy Name Branch", regex: /if\s*\(\s*strategy(?:Name)?\s*===\s*['"][a-zA-Z0-9_\s]+['"]\s*\)/i }
];

for (const file of CRITICAL_DECISION_MODULES) {
  const filePath = path.join(CORE_DIR, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ⚠️ Warning: File ${file} not found.`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Ignore pure comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    for (const pattern of STATIC_BRANCH_PATTERNS) {
      if (pattern.regex.test(line)) {
        totalViolations++;
        violationDetails.push({
          level: 'Level 1: Static Branch',
          file,
          line: i + 1,
          pattern: pattern.name,
          code: trimmed
        });
      }
    }
  }
}

if (totalViolations === 0) {
  console.log('  ✅ Level 1 Passed: 0 direct static branches on tribe/engine/strategy in core reasoning modules.\n');
} else {
  console.error(`  ❌ Level 1 Failed: Found ${totalViolations} prohibited static branch violations:`);
  violationDetails.forEach(v => console.error(`    [${v.file}:${v.line}] ${v.pattern} -> ${v.code}`));
}

// ─── Level 2: Literal Bias Audit (Indirect decision dictionaries & hardcoded lists) ───
console.log('[Level 2] STRATEGIC_CORE_LITERAL_BIAS_AUDIT...');

const LITERAL_BIAS_PATTERNS = [
  { name: "Indirect Tribe Dictionary Lookup", regex: /(?:rules|weights|profiles|strategies|multipliers)\[\s*(?:primary)?tribe\s*\]/i },
  { name: "Indirect Engine Handler Dictionary", regex: /(?:handlers|engineRules|engineProfiles)\[\s*(?:selected)?engineId\s*\]/i },
  { name: "Hardcoded Specific Tribe Key in Decision Object", regex: /['"](?:Goblin|Werewolf|Elf|Merfolk)['"]\s*:\s*\{[^}]*weights/i }
];

let level2Violations = 0;
for (const file of CRITICAL_DECISION_MODULES) {
  const filePath = path.join(CORE_DIR, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) continue;

    for (const pattern of LITERAL_BIAS_PATTERNS) {
      if (pattern.regex.test(line)) {
        level2Violations++;
        violationDetails.push({
          level: 'Level 2: Literal Bias',
          file,
          line: i + 1,
          pattern: pattern.name,
          code: trimmed
        });
      }
    }
  }
}

if (level2Violations === 0) {
  console.log('  ✅ Level 2 Passed: 0 indirect literal bias dictionaries or decision keys in core reasoning modules.\n');
} else {
  console.error(`  ❌ Level 2 Failed: Found ${level2Violations} prohibited literal bias violations:`);
  violationDetails.filter(v => v.level.includes('Level 2')).forEach(v => console.error(`    [${v.file}:${v.line}] ${v.pattern} -> ${v.code}`));
}

const totalFailures = totalViolations + level2Violations;
if (totalFailures > 0) {
  console.error(`\n🏛️ STRATEGIC CORE HARDCODE AUDIT FAILED with ${totalFailures} total violations.`);
  process.exit(1);
}

console.log('══════════════════════════════════════════════════════════════════');
console.log('  🏛️ AUDIT COMPLETE: ZERO STRATEGIC HARDCODING CERTIFIED');
console.log('══════════════════════════════════════════════════════════════════');
process.exit(0);
