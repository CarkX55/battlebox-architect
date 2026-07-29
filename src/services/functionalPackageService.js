/**
 * src/services/functionalPackageService.js
 * 
 * Hito 5: Functional Package Service
 * 
 * Agrupa cartas candidatas recuperadas en paquetes funcionales cohesivos (FunctionalPackages)
 * en lugar de evaluar cartas de forma aislada.
 */

import { createFunctionalPackage } from '../models/deckModels.js';
import { analyzeCardIntelligence } from './cardIntelligenceEngine.js';

/**
 * Agrupa cartas candidatas por motor y capacidades compartidas.
 * 
 * @param {Array<Object>} candidates Lista de cartas candidatas
 * @param {Object} blueprint Blueprint dinámico activo
 * @returns {Array<Object>} Lista de FunctionalPackages
 */
export function buildFunctionalPackages(candidates = [], blueprint = null) {
  const packageMap = {};

  for (const card of candidates) {
    const profile = analyzeCardIntelligence(card);
    const primaryCap = profile.produces[0] || profile.enables[0] || 'General';
    const pkgId = `pkg_${primaryCap.toLowerCase()}`;

    if (!packageMap[pkgId]) {
      packageMap[pkgId] = {
        id: pkgId,
        label: `${primaryCap} Functional Package`,
        engine: `${primaryCap.toLowerCase()}_engine`,
        capabilities: [primaryCap],
        cards: [],
        averageCMC: 0
      };
    }

    packageMap[pkgId].cards.push({
      card,
      name: card.name,
      cmc: profile.cmc,
      profile
    });
  }

  const packages = [];

  for (const [id, data] of Object.entries(packageMap)) {
    const totalCmc = data.cards.reduce((sum, c) => sum + c.cmc, 0);
    const avgCmc = data.cards.length > 0 ? totalCmc / data.cards.length : 2.0;

    const pkg = createFunctionalPackage({
      id,
      label: data.label,
      engine: data.engine,
      capabilities: data.capabilities,
      cards: data.cards,
      internalSynergy: 85,
      totalSlots: data.cards.length,
      averageCMC: parseFloat(avgCmc.toFixed(2))
    });

    packages.push(pkg);
  }

  return packages;
}
