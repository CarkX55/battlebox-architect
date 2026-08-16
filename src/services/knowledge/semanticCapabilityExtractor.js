/**
 * SEMANTIC CAPABILITY EXTRACTOR (v20.0 Layer 2)
 * 
 * Code-driven parser automatically extracting derived capabilities and semantic tags
 * from raw card Oracle text and type lines without runtime LLM calls.
 */

export class SemanticCapabilityExtractor {
  static extractCapabilities(card) {
    if (!card || typeof card !== 'object') return [];

    const capabilities = new Set();
    const typeLine = (card.type_line || '').toLowerCase();
    const oracleText = (card.oracle_text || '').toLowerCase();
    const cmc = card.cmc || 0;

    // Type line capabilities
    if (typeLine.includes('creature')) capabilities.add('Creature');
    if (typeLine.includes('instant')) capabilities.add('Instant');
    if (typeLine.includes('sorcery')) capabilities.add('Sorcery');
    if (typeLine.includes('enchantment')) capabilities.add('Enchantment');
    if (typeLine.includes('artifact')) capabilities.add('Artifact');
    if (typeLine.includes('land')) capabilities.add('Land');
    if (typeLine.includes('giant')) capabilities.add('GiantTribe');
    if (typeLine.includes('elf')) capabilities.add('ElfTribe');

    // CMC capabilities
    if (cmc === 1) capabilities.add('OneDrop');
    if (cmc === 2) capabilities.add('TwoDrop');
    if (cmc >= 4) capabilities.add('HighCMCThreat');

    // Mana acceleration / Ramp capabilities
    if (oracleText.includes('add {') || oracleText.includes('search your library for a land')) {
      capabilities.add('ManaProducer');
      if (cmc <= 2) capabilities.add('EarlyRamp');
    }

    // Removal / Interaction capabilities
    if (oracleText.includes('destroy target') || oracleText.includes('exile target') || oracleText.includes('deals ') && oracleText.includes(' damage')) {
      capabilities.add('Removal');
      if (cmc <= 2) capabilities.add('CheapRemoval');
    }

    // Sweeper / Reset capabilities
    if (oracleText.includes('destroy all') || oracleText.includes('exile all')) {
      capabilities.add('BoardSweeper');
      capabilities.add('ResetEngine');
    }

    // Card Flow / Advantage capabilities
    if (oracleText.includes('draw a card') || oracleText.includes('draw cards')) {
      capabilities.add('CardFlowEngine');
      capabilities.add('CardAdvantage');
    }

    return Array.from(capabilities);
  }
}
