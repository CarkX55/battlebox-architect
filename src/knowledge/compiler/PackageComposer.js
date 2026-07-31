/**
 * PackageComposer.js
 * Package Composer operating on abstract Package Interfaces.
 */

export class PackageInterface {
  constructor({ id, provides, quantity, turn, colorRequirement }) {
    this.id = id;
    this.provides = provides; // cap.mana.acceleration, cap.card.draw, etc.
    this.quantity = quantity;
    this.turn = turn;
    this.colorRequirement = colorRequirement;
    Object.freeze(this);
  }
}

export class PackageComposer {
  static composePackage(packageInterface, availableCards = []) {
    if (!packageInterface || !packageInterface.provides) {
      return { packageId: 'empty', cards: [] };
    }

    const matchingCards = availableCards.filter(card => {
      const text = (card.oracleText || card.oracle_text || '').toLowerCase();
      if (packageInterface.provides === 'cap.mana.acceleration') {
        return (card.cmc || 1) <= 2 && (text.includes('add ') || text.includes('search your library for a land'));
      }
      if (packageInterface.provides === 'cap.card.draw') {
        return text.includes('draw');
      }
      return true;
    }).slice(0, packageInterface.quantity);

    return {
      packageId: packageInterface.id,
      interface: packageInterface,
      selectedCards: matchingCards,
      fulfillmentRate: matchingCards.length / packageInterface.quantity
    };
  }
}
