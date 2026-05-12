import { motion } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';
import { cn } from '../../utils/cn';
import { Layers, Swords, Zap, Gem, Mountain, Coins, Scroll, Sparkles, User, Flame } from 'lucide-react';

const CATEGORIES = {
  Creature: { label: 'Criaturas', icon: Swords },
  Instant: { label: 'Instantáneos', icon: Zap },
  Sorcery: { label: 'Conjuros', icon: Scroll },
  Artifact: { label: 'Artefactos', icon: Gem },
  Enchantment: { label: 'Encantamientos', icon: Sparkles },
  Planeswalker: { label: 'Planeswalkers', icon: User },
  Land: { label: 'Tierras', icon: Mountain },
};

function CategorySection({ title, icon: Icon, cards, onRemove, onAdd, isEditing }) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-6 pb-2 border-b border-magic-gold/10 relative">
        <div className="w-10 h-10 rounded-lg bg-magic-gold/5 border border-magic-gold/20 flex items-center justify-center shadow-inner text-magic-gold">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-2xl font-cinzel text-magic-gold tracking-widest uppercase">{title}</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-magic-gold/20 mr-2" />
          <span className="text-[10px] px-3 py-1 rounded-full bg-magic-gold/10 border border-magic-gold/30 font-bold uppercase tracking-[0.2em] text-magic-gold/80">
            {cards.reduce((sum, c) => sum + (c.quantity || 1), 0)} Registros
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
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
    <div className="space-y-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: totalCards, color: 'text-magic-gold', icon: Layers },
          { label: 'Criaturas', value: creatures, color: 'text-red-400', icon: Swords },
          { label: 'Hechizos', value: spells, color: 'text-blue-400', icon: Zap },
          { label: 'Artefactos', value: artifacts, color: 'text-gray-300', icon: Gem },
          { label: 'Tierras', value: lands, color: 'text-green-400', icon: Mountain },
          { label: 'Valor', value: `$${totalPrice.toFixed(0)}`, color: 'text-amber-400', icon: Coins }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-black/60 border border-magic-gold/20 rounded-2xl p-5 flex flex-col items-center justify-center group hover:border-magic-gold/50 hover:bg-black/80 transition-all duration-500 shadow-xl relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <Icon className={cn("w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110", stat.color)} />
               <p className={cn("text-3xl font-cinzel leading-none drop-shadow-md relative z-10", stat.color)}>{stat.value}</p>
               <p className="text-[10px] text-white/50 uppercase tracking-[0.25em] mt-3 font-bold relative z-10">{stat.label}</p>
            </div>
          );
        })}
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