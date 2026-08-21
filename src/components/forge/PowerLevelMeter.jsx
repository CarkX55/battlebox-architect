import React, { useMemo } from 'react';
import { cn } from '../../utils/cn';
import { Swords, Skull, Shield, Zap, Flame, Crown, Sparkles, Trophy } from 'lucide-react';
import { calculateDeckPowerLevel } from '../../services/powerLevelCalculator.js';

export { calculateDeckPowerLevel };

export const PowerLevelMeter = ({ deck, format = 'STANDARD', archetype = '', className }) => {
  const powerLevel = useMemo(() => {
    return calculateDeckPowerLevel(deck, format, archetype);
  }, [deck, format, archetype]);

  const Icon = useMemo(() => {
    const s = powerLevel?.score || 5;
    if (s >= 9) return Crown;
    if (s >= 7) return Zap;
    if (s >= 5) return Swords;
    return Shield;
  }, [powerLevel?.score]);

  if (!powerLevel || !powerLevel.score) return null;

  return (
    <div className={cn("group relative flex items-center gap-3 bg-stone-950/80 border border-stone-700/60 px-3.5 py-1.5 rounded-xl shadow-lg backdrop-blur-md", className)}>
      <div className={cn("p-1.5 rounded-lg bg-black/60 border border-stone-700/60 flex items-center justify-center", powerLevel.color)}>
        <Icon size={16} />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold leading-none">
            Nivel de Poder
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-700">
            {powerLevel.tierLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-1.5 h-3 rounded-sm transition-colors duration-500",
                  i < powerLevel.score ? powerLevel.color.replace('text-', 'bg-') : "bg-stone-800"
                )}
              />
            ))}
          </div>
          <span className={cn("text-xs font-bold ml-1 flex items-baseline gap-1", powerLevel.color)}>
            <span>{powerLevel.score}/10</span>
            <span className="opacity-80 font-normal text-[10.5px]">({powerLevel.text})</span>
          </span>
        </div>
      </div>

      {/* Tooltip Detallado del Escáner de Poder */}
      <div className="absolute top-full left-0 mt-2 w-80 p-4 bg-stone-950/95 border border-amber-500/40 rounded-2xl shadow-2xl 
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] backdrop-blur-2xl pointer-events-none text-stone-200">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2 mb-3">
          <h5 className="font-cinzel text-amber-300 text-xs tracking-widest font-black uppercase flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Diagnóstico de Poder Competitivo
          </h5>
          <span className="text-[10px] font-mono font-bold text-amber-400">
            {powerLevel.score}/10
          </span>
        </div>

        <div className="space-y-2 text-xs font-sans">
          <div className="flex justify-between items-center text-stone-400">
            <span>Raras / Míticas:</span>
            <span className="text-amber-200 font-mono font-bold">{powerLevel.rareCount} Raras / {powerLevel.mythicCount} Míticas</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Playsets 4x (Consistencia):</span>
            <span className="text-emerald-300 font-mono font-bold">{powerLevel.playsetCount} playsets</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>CMC Medio de Hechizos:</span>
            <span className="text-stone-200 font-mono font-bold">{powerLevel.avgCmc}</span>
          </div>
          {powerLevel.rampCount > 0 && (
            <div className="flex justify-between items-center text-stone-400">
              <span>Aceleradores / Trampas de Maná:</span>
              <span className="text-cyan-300 font-mono font-bold">{powerLevel.rampCount} copias</span>
            </div>
          )}
          {powerLevel.finisherCount > 0 && (
            <div className="flex justify-between items-center text-stone-400">
              <span>Amenazas Pesadas / Finishers:</span>
              <span className="text-rose-300 font-mono font-bold">{powerLevel.finisherCount} copias</span>
            </div>
          )}

          <div className="pt-2 border-t border-stone-800 mt-2 text-[11px] leading-relaxed text-stone-300 italic">
            {powerLevel.score >= 9 ? "Mazo con arquitectura de torneo: alta redundancia de playsets, aceleración/trampas de maná y amenazas demoledoras." :
             powerLevel.score >= 7 ? "Mazo fuertemente optimizado con curva sólida, gran sinergia interna y consistencia competitiva." :
             powerLevel.score >= 5 ? "Mazo equilibrado construido para juego interactivo estándar." :
             "Mazo casual o experimental, ideal para partidas relajadas."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PowerLevelMeter;
