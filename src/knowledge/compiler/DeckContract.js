/**
 * DeckContract.js
 * Master Deck Specification Contract created before compilation starts.
 * The Supreme Judge strictly evaluates the compiled deck against this contract.
 */

export class DeckContract {
  constructor({
    requiredCards = 60,
    requiredLands = 24,
    requiredRamp = 10,
    requiredInteraction = 8,
    requiredDraw = 8,
    requiredCurve = { cmc1: 8, cmc2: 14, cmc3: 12, cmc4: 8, cmc5Plus: 4 },
    requiredCapabilities = ['cap.mana.acceleration', 'cap.card.draw', 'cap.removal.single_target'],
    requiredPackages = ['pkg_elf_ramp', 'pkg_resource_engine', 'pkg_interaction']
  } = {}) {
    this.requiredCards = requiredCards;
    this.requiredLands = requiredLands;
    this.requiredRamp = requiredRamp;
    this.requiredInteraction = requiredInteraction;
    this.requiredDraw = requiredDraw;
    this.requiredCurve = Object.freeze({ ...requiredCurve });
    this.requiredCapabilities = Object.freeze([...requiredCapabilities]);
    this.requiredPackages = Object.freeze([...requiredPackages]);
    Object.freeze(this);
  }

  static createFromPlan(plan) {
    const isCommander = (plan.format || '').toUpperCase() === 'COMMANDER';
    const total = isCommander ? 100 : 60;
    const lands = isCommander ? 37 : 24;

    return new DeckContract({
      requiredCards: total,
      requiredLands: lands,
      requiredRamp: Math.round(total * 0.16),
      requiredInteraction: Math.round(total * 0.12),
      requiredDraw: Math.round(total * 0.12)
    });
  }
}
