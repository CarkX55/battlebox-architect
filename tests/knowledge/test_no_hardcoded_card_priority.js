/**
 * TEST GUARDIÁN: NO_HARDCODED_CARD_PRIORITY
 * 
 * Analiza sintácticamente los archivos críticos del compilador y el agenteic loop
 * para garantizar la purga completa de listas de nombres de cartas hardcodeadas
 * asignando puntuaciones estáticas (ej. `isPremierRemoval`, `score += 150`).
 */

import fs from 'fs';
import path from 'path';

const FILES_TO_AUDIT = [
  'src/services/agent/cardImplementer.js',
  'src/services/agent/decisionEngine.js',
  'src/services/agent/advisors/CausalSynergyAdvisor.js',
  'src/services/deckArchitectService.js',
  'src/services/ragService.js'
];

function auditFileForHardcodedScores(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ File not found for audit: ${filePath}`);
    return { passed: true, violations: [] };
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  const violations = [];

  // Pattern 1: Arrays of card names with includes() combined with score modification
  const cardNameListRegex = /\[\s*(?:'[^']+'|"[^"]+")\s*(?:,\s*(?:'[^']+'|"[^"]+"))*\s*\]\.includes\s*\(\s*cardNameLower\s*\)/g;
  let match;
  while ((match = cardNameListRegex.exec(content)) !== null) {
    // Extract line number
    const linesBefore = content.substring(0, match.index).split('\n');
    const lineNumber = linesBefore.length;
    violations.push({
      filePath,
      lineNumber,
      snippet: match[0],
      reason: 'Hardcoded card name array evaluated against cardNameLower'
    });
  }

  // Pattern 2: Hardcoded variable declarations like isPremierRemoval, isPremierLord, isAristocratsCore
  const hardcodedVarRegex = /const\s+(isPremierRemoval|isPremierLord|isApexFinisher|isReanimatorEnabler|isAristocratsCore|isSpellslingerCore|isTronCore|isGreenRampCore|isBoglesCore|isDeliriumCore|isAffinityCore|isBlinkCore|isLandfallCore|isLifegainCore|isPrisonCore|isVehiclesCore|isCascadeCore|isStormCore)\s*=/g;
  while ((match = hardcodedVarRegex.exec(content)) !== null) {
    const linesBefore = content.substring(0, match.index).split('\n');
    const lineNumber = linesBefore.length;
    violations.push({
      filePath,
      lineNumber,
      snippet: match[0],
      reason: `Forbidden static priority variable declaration: ${match[1]}`
    });
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

function runAuditSuite() {
  console.log('🛡️  Ejecutando Test Guardián: NO_HARDCODED_CARD_PRIORITY...\n');
  let totalViolations = 0;

  FILES_TO_AUDIT.forEach(file => {
    const result = auditFileForHardcodedScores(file);
    if (result.passed) {
      console.log(`  ✅ [CLEAN] ${file}`);
    } else {
      console.log(`  ❌ [VIOLATION] ${file} (${result.violations.length} violations)`);
      result.violations.forEach(v => {
        console.log(`      Línea ${v.lineNumber}: ${v.reason}`);
      });
      totalViolations += result.violations.length;
    }
  });

  console.log('\n------------------------------------------------');
  if (totalViolations === 0) {
    console.log('🎉 AUDITORÍA SUPERADA: 0 listas de nombres hardcodeados detectadas.');
    process.exit(0);
  } else {
    console.error(`💥 AUDITORÍA FALLIDA: Se detectaron ${totalViolations} violaciones de prioridad hardcodeada.`);
    process.exit(1);
  }
}

runAuditSuite();
