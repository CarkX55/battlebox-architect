/**
 * src/services/compiler/knowledgeLayer.js
 * 
 * Strategic Knowledge Layer: Capa de Conocimiento Primario Desacoplada.
 * Proporciona acceso a 7 Proveedores Especializados de Conocimiento:
 * 1. ArchetypeKnowledgeProvider: Taxonomías de arquetipos y estructuras de mazo.
 * 2. CardKnowledgeProvider: Metadatos avanzados, tags y roles de cartas de Scryfall/DB.
 * 3. CapabilityKnowledgeProvider: Definiciones de capacidades de maná, interacción y amenazas.
 * 4. PackageKnowledgeProvider: Paquetes dorados (Golden Cores).
 * 5. MetaKnowledgeProvider: Estadísticas de MTGTop8 y metajuego competitivo.
 * 6. RulesKnowledgeProvider: Reglas del juego, banlists e indisponibilidades.
 * 7. SimulationKnowledgeProvider: Patrones e históricos de simulaciones previas.
 */

import { MTG_TRIBES, MTG_STRATEGIES } from '../../constants/legacyBattleBox.js';
import { MOCK_METAGAME_DECKS } from '../mtgtop8Service.js';
import { CORE_PACKAGES } from '../../constants/corePackages.js';

export class StrategicKnowledgeLayer {
  constructor() {
    this.snapshot = Object.freeze({
      version: '11.0.0',
      timestamp: Date.now(),
      providersCount: 7
    });

    this.providers = {
      archetype: new ArchetypeKnowledgeProvider(),
      card: new CardKnowledgeProvider(),
      capability: new CapabilityKnowledgeProvider(),
      package: new PackageKnowledgeProvider(),
      meta: new MetaKnowledgeProvider(),
      rules: new RulesKnowledgeProvider(),
      simulation: new SimulationKnowledgeProvider()
    };
  }

  getProvider(providerName) {
    return this.providers[providerName] || null;
  }
}

class ArchetypeKnowledgeProvider {
  getArchetypeTaxonomy(archetype) {
    const name = (archetype || 'midrange').toLowerCase();
    if (name.includes('aggro')) {
      return { speed: 'fast', targetLethalTurn: 3.5, primaryResource: 'Tempo' };
    }
    if (name.includes('control')) {
      return { speed: 'slow', targetLethalTurn: 6.0, primaryResource: 'CardAdvantage' };
    }
    if (name.includes('combo')) {
      return { speed: 'burst', targetLethalTurn: 4.0, primaryResource: 'Consistency' };
    }
    return { speed: 'balanced', targetLethalTurn: 4.5, primaryResource: 'BoardPresence' };
  }
}

class CardKnowledgeProvider {
  getCardRoles(card) {
    const roles = [];
    const type = (card.type_line || '').toLowerCase();
    const oracle = (card.oracle_text || card.text || '').toLowerCase();
    
    if (type.includes('land')) roles.push('land');
    if (oracle.includes('add {') || oracle.includes('search your library for a land')) roles.push('ramp');
    if (type.includes('instant') || oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('counter target')) roles.push('removal');
    if (type.includes('creature')) roles.push('threat');
    if (oracle.includes('draw a card') || oracle.includes('draws a card')) roles.push('draw');

    return roles;
  }
}

class CapabilityKnowledgeProvider {
  getCapabilityRequirements(archetype) {
    const arch = (archetype || '').toLowerCase();
    if (arch.includes('aggro')) {
      return [
        { id: 'cap.mana.acceleration', minQty: 4, cmcCap: 1 },
        { id: 'cap.threat.pressure', minQty: 20, cmcCap: 3 },
        { id: 'cap.board.removal', minQty: 4, cmcCap: 2 }
      ];
    }
    return [
      { id: 'cap.board.removal', minQty: 8, cmcCap: 2 },
      { id: 'cap.card.draw', minQty: 6, cmcCap: 3 },
      { id: 'cap.threat.finisher', minQty: 4, cmcCap: 5 }
    ];
  }
}

class PackageKnowledgeProvider {
  getCorePackage(packageId) {
    return CORE_PACKAGES[packageId] || null;
  }
}

class MetaKnowledgeProvider {
  getTopDecksForFormat(format = 'STANDARD') {
    const fmt = format.toUpperCase();
    return MOCK_METAGAME_DECKS[fmt] || MOCK_METAGAME_DECKS['PIONEER'] || [];
  }
}

class RulesKnowledgeProvider {
  getFormatBanlist(format = 'Legacy BattleBox') {
    return ['Ancestral Recall', 'Black Lotus', 'Time Walk', 'Mox Sapphire', 'Mox Jet'];
  }
}

class SimulationKnowledgeProvider {
  getHistoricalKeepableRate(archetype) {
    return 0.84;
  }
}
