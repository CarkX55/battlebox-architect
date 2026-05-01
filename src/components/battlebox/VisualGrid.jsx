import { motion } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';

const CATEGORIES = {
  Creature: { label: 'Criaturas', icon: '⚔️' },
  Instant: { label: 'Instantáneos', icon: '⚡' },
  Sorcery: { label: 'Conjuros', icon: '📜' },
  Artifact: { label: 'Artefactos', icon: '💎' },
  Enchantment: { label: 'Encantamientos', icon: '✨' },
  Planeswalker: { label: 'Planeswalkers', icon: '🌌' },
  Land: { label: 'Tierras', icon: '🌍' },
};

function CategorySection({ title, icon, cards, onRemove, isEditing }) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-grimorio-gold/20">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-cinzel text-grimorio-gold">{title}</h3>
        <span className="text-sm text-grimorio-parchment/50 ml-auto">
          {cards.reduce((sum, c) => sum + (c.quantity || 1), 0)} cartas
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <MagicCard 
            key={`${card.name}-${idx}`} 
            card={card} 
            isEditing={isEditing}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  );
}

export default function VisualGrid({ cards, onRemoveCard, isEditing }) {
  // Función para determinar la categoría única de una carta por prioridad
  const getPrimaryCategory = (card) => {
    const type = card.type_line || '';
    if (type.includes('Creature')) return 'Creature';
    if (type.includes('Planeswalker')) return 'Planeswalker';
    if (type.includes('Enchantment')) return 'Enchantment';
    if (type.includes('Artifact')) return 'Artifact';
    if (type.includes('Sorcery')) return 'Sorcery';
    if (type.includes('Instant')) return 'Instant';
    if (type.includes('Land')) return 'Land';
    return 'Other';
  };

  const cardsByCategory = cards.reduce((acc, card) => {
    const cat = getPrimaryCategory(card);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(card);
    return acc;
  }, {});

  const totalCards = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const creatures = cardsByCategory.Creature?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
  const spells = (cardsByCategory.Instant?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0) +
                 (cardsByCategory.Sorcery?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0) +
                 (cardsByCategory.Enchantment?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0);
  const artifacts = (cardsByCategory.Artifact?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0);
  const lands = cardsByCategory.Land?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-4 p-4 bg-gradient-to-b from-[#2a2318] to-[#1a1612] border border-grimorio-gold/30 rounded-xl shadow-2xl">
        <div className="text-center px-4">
          <p className="text-3xl font-cinzel text-grimorio-gold">{totalCards}</p>
          <p className="text-xs text-grimorio-parchment/60 uppercase tracking-wider">Total</p>
        </div>
        <div className="w-px bg-grimorio-gold/20" />
        <div className="text-center px-4">
          <p className="text-2xl font-cinzel text-white">{creatures}</p>
          <p className="text-xs text-grimorio-parchment/60 uppercase tracking-wider">Criaturas</p>
        </div>
        <div className="w-px bg-grimorio-gold/20" />
        <div className="text-center px-4">
          <p className="text-2xl font-cinzel text-blue-400">{spells}</p>
          <p className="text-xs text-grimorio-parchment/60 uppercase tracking-wider">Hechizos</p>
        </div>
        <div className="w-px bg-grimorio-gold/20" />
        <div className="text-center px-4">
          <p className="text-2xl font-cinzel text-gray-400">{artifacts}</p>
          <p className="text-xs text-grimorio-parchment/60 uppercase tracking-wider">Artefactos</p>
        </div>
        <div className="w-px bg-grimorio-gold/20" />
        <div className="text-center px-4">
          <p className="text-2xl font-cinzel text-green-400">{lands}</p>
          <p className="text-xs text-grimorio-parchment/60 uppercase tracking-wider">Tierras</p>
        </div>
      </div>

      <div className="space-y-2">
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
          <CategorySection 
            key={key} 
            title={label} 
            icon={icon} 
            cards={cardsByCategory[key] || []} 
            onRemove={onRemoveCard}
            isEditing={isEditing}
          />
        ))}
      </div>
    </div>
  );
}