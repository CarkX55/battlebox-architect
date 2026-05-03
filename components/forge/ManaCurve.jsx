import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';

const ManaCurve = ({ deck, compact = false, isPrint = false }) => {
  const stats = useMemo(() => {
    const s = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, '6+': 0 };
    if (!deck || !Array.isArray(deck)) return s;
    
    deck.forEach(card => {
      // Ignorar tierras
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land')) return;
      
      // Ser tolerante con el nombre del campo de coste (mana_value, cmc, cost)
      const rawCmc = card.mana_value !== undefined ? card.mana_value : (card.cmc !== undefined ? card.cmc : card.cost);
      const cmc = Number(rawCmc || 0);
      const qty = Number(card.quantity || 1);
      
      if (cmc >= 6) s['6+'] += qty;
      else s[Math.floor(cmc)] += qty;
    });
    
    return s;
  }, [deck]);

  const maxVal = Math.max(...Object.values(stats), 1);

  return (
    <div className={cn(
      isPrint ? "bg-transparent border-none p-0 pt-5" : "bg-gradient-to-b from-[#1a1612]/40 to-[#14110e]/60 border border-grimorio-gold/10 rounded-xl",
      compact && !isPrint ? "p-2" : (!isPrint ? "p-6" : "")
    )}>
      {!compact && !isPrint && (
        <h4 className="font-cinzel text-grimorio-gold text-[10px] mb-4 opacity-50 tracking-widest uppercase">
          Distribución de Costes
        </h4>
      )}
      
      <div className={cn("flex items-end justify-between gap-1", compact || isPrint ? "h-12" : "h-28")}>
        {Object.entries(stats).map(([cmc, count]) => {
          const height = (count / maxVal) * 100;
          return (
            <div key={cmc} className="flex-1 flex flex-col items-center group h-full justify-end">
              <div className="relative w-full flex flex-col items-center h-full justify-end">
                {/* Conteo siempre visible en impresión */}
                {count > 0 && (
                  <span className={cn(
                    "absolute -top-4 transition-opacity font-bold",
                    isPrint ? "text-[6px] text-black opacity-100" : "text-grimorio-gold opacity-0 group-hover:opacity-100 bg-black/80 px-1 rounded",
                    compact && !isPrint ? "text-[7px]" : ""
                  )}>
                    {count}
                  </span>
                )}
                
                {/* Barra */}
                <div 
                  className={cn(
                    "w-full transition-all duration-700 ease-out",
                    count > 0 
                      ? (isPrint ? "bg-[#92732c] rounded-t-[0.5mm]" : "bg-gradient-to-t from-grimorio-gold/20 to-grimorio-gold/80 rounded-t-[1px] hover:brightness-150") 
                      : (isPrint ? "bg-black/10 h-[0.1mm]" : "bg-white/5 h-[1px] opacity-20")
                  )}
                  style={{ 
                    height: count > 0 ? `${Math.max(6, height)}%` : (isPrint ? '0.1mm' : '1px'),
                    boxShadow: count > 0 && !isPrint ? '0 0 10px rgba(193, 155, 69, 0.1)' : 'none'
                  }}
                />
              </div>
              
              {/* Etiqueta de CMC */}
              <span className={cn(
                "mt-1 font-bold",
                isPrint ? "text-[6px] text-black" : (compact ? "text-[7px] text-[#c19b45]/30" : "text-[9px] text-[#c19b45]/50")
              )}>
                {cmc}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ManaCurve;
