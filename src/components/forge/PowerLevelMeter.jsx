import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { Swords, Skull, Shield, Zap } from 'lucide-react';

export const PowerLevelMeter = ({ deck, className }) => {
  const powerLevel = useMemo(() => {
    if (!deck || deck.length === 0) return { score: 0, text: 'Desconocido', color: 'text-gray-500', icon: Shield };

    let rareCount = 0;
    let mythicCount = 0;
    let cmcTotal = 0;
    let spellCount = 0;

    deck.forEach(card => {
      const qty = Number(card.quantity || 1);
      const isLand = (card.type_line || '').toLowerCase().includes('land');
      
      if (!isLand && card.mana_value) {
        cmcTotal += card.mana_value * qty;
        spellCount += qty;
      }

      if (card.rarity === 'rare') rareCount += qty;
      if (card.rarity === 'mythic') mythicCount += qty;
    });

    const avgCmc = spellCount > 0 ? cmcTotal / spellCount : 0;

    let score = 3; // Base score for a casual deck

    // Rare/Mythic weight
    score += (rareCount * 0.2) + (mythicCount * 0.4);

    // Efficiency weight (lower curve = higher power)
    if (avgCmc > 0) {
      if (avgCmc <= 2.2) score += 2;
      else if (avgCmc <= 2.8) score += 1;
      else if (avgCmc >= 4.0) score -= 1;
    }

    // Clamp score between 1 and 10
    score = Math.max(1, Math.min(10, Math.round(score)));

    let text = 'Casual';
    let color = 'text-green-400';
    let icon = Shield;

    if (score >= 9) {
      text = 'Competitivo / Injusto';
      color = 'text-red-500';
      icon = Skull;
    } else if (score >= 7) {
      text = 'Fuerte / Optimizado';
      color = 'text-orange-400';
      icon = Zap;
    } else if (score >= 5) {
      text = 'Normal / Equilibrado';
      color = 'text-yellow-400';
      icon = Swords;
    }

    return { score, text, color, icon };
  }, [deck]);

  if (!powerLevel.score) return null;

  const Icon = powerLevel.icon;

  return (
    <div className={cn("flex items-center gap-3 bg-black/40 border border-white/5 px-3 py-1.5 rounded-lg shadow-inner", className)}>
      <div className={cn("p-1.5 rounded-md bg-black/50 border border-white/10", powerLevel.color)}>
        <Icon size={16} />
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold leading-none mb-1">
          Nivel de Poder
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-3 rounded-sm transition-colors duration-500",
                  i < powerLevel.score ? powerLevel.color.replace('text-', 'bg-') : "bg-white/10"
                )}
              />
            ))}
          </div>
          <span className={cn("text-xs font-bold ml-1", powerLevel.color)}>
            {powerLevel.score}/10 <span className="opacity-75 font-normal text-[10px]">({powerLevel.text})</span>
          </span>
        </div>
      </div>
    </div>
  );
};
