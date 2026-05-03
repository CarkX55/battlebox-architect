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
      isPrint ? "bg-transparent border-none p-0 pt-5" : "leather-panel shadow-2xl",
      compact && !isPrint ? "p-3" : (!isPrint ? "p-6" : "")
    )}>
      {!compact && !isPrint && (
        <h4 className="font-cinzel text-[#c19b45] text-lg mb-6 flex items-center gap-2">
          <span>📊</span> Distribución de Costes
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
                        "absolute -top-6 transition-opacity font-bold leather-stats",
                        isPrint ? "text-[6px] text-black opacity-100" : "opacity-0 group-hover:opacity-100 bg-black/90 px-2 py-0.5 rounded-md border border-[#ffdf91]/30",
                        compact && !isPrint ? "text-[8px]" : "text-sm"
                      )}>
                        {count}
                      </span>
                    )}
                    
                    {/* Barra */}
                    <div 
                      className={cn(
                        "w-full transition-all duration-700 ease-out",
                        count > 0 
                          ? (isPrint ? "bg-[#92732c] rounded-t-[0.5mm]" : "bg-gradient-to-t from-[#c19b45]/40 to-[#ffdf91] rounded-t-[2px] hover:brightness-125") 
                          : (isPrint ? "bg-black/10 h-[0.1mm]" : "bg-white/5 h-[1px] opacity-20")
                      )}
                      style={{ 
                        height: count > 0 ? `${Math.max(6, height)}%` : (isPrint ? '0.1mm' : '1px'),
                        boxShadow: count > 0 && !isPrint ? '0 0 15px rgba(255, 223, 145, 0.2)' : 'none'
                      }}
                    />
                  </div>
                  
                  {/* Etiqueta de CMC */}
                  <span className={cn(
                    "mt-2 font-bold",
                    isPrint ? "text-[6px] text-black" : (compact ? "text-[9px] text-[#ffdf91]/50" : "text-xs text-[#ffdf91]")
                  )} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}>
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
