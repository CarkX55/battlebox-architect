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

function CategorySection({ title, icon, cards, onRemove, onAdd, isEditing }) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4 pb-2 border-b border-magic-gold/20">
        <span className="text-xl drop-shadow-md">{icon}</span>
        <h3 className="text-lg font-cinzel text-magic-gold tracking-wide">{title}</h3>
        <span className="text-[10px] px-3 py-1 frosted-panel border-magic-gold/30 ml-auto font-bold uppercase tracking-widest text-magic-gold">
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
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

export default function VisualGrid({ cards, onRemoveCard, onAddCard, isEditing }) {
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

  const totalPrice = cards.reduce((sum, c) => {
    const price = parseFloat(c.prices?.usd || c.prices?.usd_foil || c.prices?.eur || 0);
    return sum + (price * (c.quantity || 1));
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-around gap-2 p-6 frosted-panel shadow-2xl relative overflow-hidden">
        {/* Decoración de fondo opcional */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-10 pointer-events-none" />
        
        <div className="text-center px-4 relative z-10">
          <p className="text-3xl font-cinzel text-magic-gold leading-none">{totalCards}</p>
          <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Total</p>
        </div>
        <div className="w-px h-12 line-magic-gold opacity-40" />
        <div className="text-center px-4 relative z-10">
          <p className="text-2xl font-cinzel text-white leading-none">{creatures}</p>
          <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Criaturas</p>
        </div>
        <div className="w-px h-12 line-magic-gold opacity-40" />
        <div className="text-center px-4 relative z-10">
          <p className="text-2xl font-cinzel text-blue-400 leading-none">{spells}</p>
          <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Hechizos</p>
        </div>
        <div className="w-px h-12 line-magic-gold opacity-40" />
        <div className="text-center px-4 relative z-10">
          <p className="text-2xl font-cinzel text-gray-400 leading-none">{artifacts}</p>
          <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Artefactos</p>
        </div>
        <div className="w-px h-12 line-magic-gold opacity-40" />
        <div className="text-center px-4 relative z-10">
          <p className="text-2xl font-cinzel text-green-400 leading-none">{lands}</p>
          <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Tierras</p>
        </div>
        {totalPrice > 0 && (
          <>
            <div className="w-px h-12 line-magic-gold opacity-40" />
            <div className="text-center px-4 relative z-10">
              <p className="text-2xl font-cinzel text-amber-500 leading-none">${totalPrice.toFixed(2)}</p>
              <p className="text-[10px] text-[#f4ece0]/60 uppercase tracking-[0.2em] mt-1">Mercado</p>
            </div>
          </>
        )}
      </div>

      <div className="space-y-2">
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
          <CategorySection 
            key={key} 
            title={label} 
            icon={icon} 
            cards={cardsByCategory[key] || []} 
            onRemove={onRemoveCard}
            onAdd={onAddCard}
            isEditing={isEditing}
          />
        ))}
      </div>
    </div>
  );
}