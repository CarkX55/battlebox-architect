import React, { useMemo, memo } from 'react';
import { cn } from '../../utils/cn';
import { BarChart3 } from 'lucide-react';

const ManaCurve = memo(({ deck, compact = false, isPrint = false, archetype = '' }) => {
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

  const curveAnalysis = useMemo(() => {
    if (!deck || !Array.isArray(deck) || !archetype) return null;
    
    let totalCmc = 0;
    let spellCount = 0;

    deck.forEach(card => {
      const type = (card.type_line || card.type || '').toLowerCase();
      if (type.includes('land')) return;
      
      const rawCmc = card.mana_value !== undefined ? card.mana_value : (card.cmc !== undefined ? card.cmc : card.cost);
      const cmc = Number(rawCmc || 0);
      const qty = Number(card.quantity || 1);
      
      totalCmc += (cmc * qty);
      spellCount += qty;
    });

    if (spellCount === 0) return null;
    
    const avgCmc = totalCmc / spellCount;
    const arch = archetype.toLowerCase();
    
    let status = 'optimal';
    let message = '';

    if (arch.includes('aggro')) {
      if (avgCmc > 2.5) { status = 'high'; message = `Curva Peligrosamente Alta para Aggro (${avgCmc.toFixed(2)} CMC). Debería ser < 2.2.`; }
      else if (avgCmc > 2.2) { status = 'warning'; message = `Curva algo alta para Aggro (${avgCmc.toFixed(2)} CMC). Ideal: < 2.2.`; }
      else { message = `Curva Óptima para Aggro (${avgCmc.toFixed(2)} CMC). Ideal: < 2.2.`; }
    } else if (arch.includes('midrange')) {
      if (avgCmc > 3.0) { status = 'high'; message = `Curva Alta para Midrange (${avgCmc.toFixed(2)} CMC). Ideal: 2.2 - 2.8.`; }
      else if (avgCmc < 1.8) { status = 'low'; message = `Curva Baja para Midrange (${avgCmc.toFixed(2)} CMC). Puede faltar impacto en lategame.`; }
      else { message = `Curva Óptima para Midrange (${avgCmc.toFixed(2)} CMC). Ideal: 2.2 - 2.8.`; }
    } else if (arch.includes('control') || arch.includes('combo')) {
      if (avgCmc > 3.5) { status = 'high'; message = `Curva muy alta para Control/Combo (${avgCmc.toFixed(2)} CMC). Ideal: 2.5 - 3.2.`; }
      else if (avgCmc < 2.0) { status = 'low'; message = `Curva inusualmente baja para Control/Combo (${avgCmc.toFixed(2)} CMC).`; }
      else { message = `Curva Óptima para Control/Combo (${avgCmc.toFixed(2)} CMC). Ideal: 2.5 - 3.2.`; }
    } else {
      message = `Curva Media: ${avgCmc.toFixed(2)} CMC`;
    }

    return { status, message, avgCmc };
  }, [deck, archetype]);

  const manaBaseAnalysis = useMemo(() => {
    if (!deck || !Array.isArray(deck) || isPrint || compact) return null;

    let pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let sources = { W: 0, U: 0, B: 0, R: 0, G: 0 };
    let landCount = 0;

    deck.forEach(card => {
      const type = (card.type_line || card.type || '').toLowerCase();
      const qty = Number(card.quantity || 1);

      if (type.includes('land')) {
        landCount += qty;
        let produced = card.produced_mana || [];
        if (produced.length === 0) {
           if (type.includes('plains') || card.name.includes('Plains')) produced.push('W');
           if (type.includes('island') || card.name.includes('Island')) produced.push('U');
           if (type.includes('swamp') || card.name.includes('Swamp')) produced.push('B');
           if (type.includes('mountain') || card.name.includes('Mountain')) produced.push('R');
           if (type.includes('forest') || card.name.includes('Forest')) produced.push('G');
        }
        if (produced.length === 0 && card.color_identity) {
           produced = card.color_identity;
        }
        produced.forEach(color => {
          if (sources[color] !== undefined) sources[color] += qty;
        });
      } else {
        const cost = card.mana_cost || '';
        if (cost.includes('{W}')) pips.W += (cost.match(/\{W\}/g) || []).length * qty;
        if (cost.includes('{U}')) pips.U += (cost.match(/\{U\}/g) || []).length * qty;
        if (cost.includes('{B}')) pips.B += (cost.match(/\{B\}/g) || []).length * qty;
        if (cost.includes('{R}')) pips.R += (cost.match(/\{R\}/g) || []).length * qty;
        if (cost.includes('{G}')) pips.G += (cost.match(/\{G\}/g) || []).length * qty;
      }
    });

    if (landCount === 0) return null;

    let warnings = [];
    const colorEmojis = { W: 'Llanuras ☀️', U: 'Islas 💧', B: 'Pantanos 💀', R: 'Montañas 🔥', G: 'Bosques 🌳' };

    Object.keys(pips).forEach(color => {
      if (pips[color] > 0) {
        if (sources[color] === 0) {
           warnings.push(`Faltan ${colorEmojis[color]}`);
        } else if (pips[color] >= 5 && sources[color] < 9) {
           warnings.push(`Poco maná para ${colorEmojis[color]} (${sources[color]} fuentes)`);
        } else if (pips[color] >= 12 && sources[color] < 13) {
           warnings.push(`Sube maná para ${colorEmojis[color]} (tienes ${sources[color]}, ideal 13+)`);
        }
      }
    });

    if (landCount > 0 && landCount < 20) warnings.push(`Pocas tierras en total (${landCount})`);
    else if (landCount > 28) warnings.push(`Demasiadas tierras (${landCount})`);

    if (warnings.length === 0) {
       return { status: 'optimal', message: `Base de maná perfecta (${landCount} tierras). El Juez aprueba esto.` };
    } else {
       return { status: 'warning', message: 'Inspector de Tierras: ' + warnings.join(' | ') };
    }
  }, [deck, isPrint, compact]);

  const maxVal = Math.max(...Object.values(stats), 1);

  return (
    <div className={cn(
      isPrint ? "bg-transparent border-none p-0 pt-5" : "leather-panel shadow-2xl",
      compact && !isPrint ? "p-3" : (!isPrint ? "p-6" : "")
    )}>
      {!compact && !isPrint && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h4 className="font-cinzel text-[#c19b45] text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#c19b45]" /> Distribución de Costes
          </h4>
          
          <div className="flex flex-col gap-2">
            {curveAnalysis && (
              <div className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold shadow-inner border transition-all duration-300",
                curveAnalysis.status === 'high' ? "bg-red-500/10 text-red-400 border-red-500/30" : 
                curveAnalysis.status === 'low' ? "bg-blue-500/10 text-blue-400 border-blue-500/30" :
                curveAnalysis.status === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" :
                "bg-green-500/10 text-green-400 border-green-500/30"
              )}>
                {curveAnalysis.status === 'optimal' ? <span className="text-green-400">✨</span> : <span className="animate-pulse">⚠️</span>}
                {curveAnalysis.message}
              </div>
            )}
            
            {manaBaseAnalysis && (
              <div className={cn(
                "px-3 py-1.5 rounded flex items-center gap-2 text-xs font-bold shadow-inner border transition-all duration-300",
                manaBaseAnalysis.status === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/30" : "bg-green-500/10 text-green-400 border-green-500/30"
              )}>
                {manaBaseAnalysis.status === 'optimal' ? <span className="text-green-400">⚖️</span> : <span className="animate-pulse">🗺️</span>}
                {manaBaseAnalysis.message}
              </div>
            )}
          </div>
        </div>
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
});

export default ManaCurve;
