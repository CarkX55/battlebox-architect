import React from 'react';
import { Target, Shield, Zap, Sparkles, Scale, Crown } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function FirstLevelPrioritySliders({ intentPriorities = {}, onChange, className }) {
  const priorities = {
    competitiveVsTheme: intentPriorities.competitiveVsTheme ?? 0.8,
    tribeVsSynergy: intentPriorities.tribeVsSynergy ?? 0.8,
    innovationVsConsistency: intentPriorities.innovationVsConsistency ?? 0.2,
    ...intentPriorities
  };

  const handleSliderChange = (key, value) => {
    if (typeof onChange === 'function') {
      onChange({
        ...priorities,
        [key]: parseFloat(value)
      });
    }
  };

  return (
    <div className={cn("p-4 md:p-5 rounded-2xl bg-stone-900/80 border border-stone-700/60 shadow-xl backdrop-blur-md space-y-5", className)}>
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-amber-200">
            Controles Estratégicos de 1er Nivel
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300">
          SSOT INTENT
        </span>
      </div>

      {/* Slider 1: Potencia Competitiva vs Fidelidad Temática */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-stone-300">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Fidelidad Temática
          </span>
          <span className="text-[11px] font-mono text-amber-400">
            {Math.round(priorities.competitiveVsTheme * 100)}% Competitivo
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <Target className="w-3.5 h-3.5 text-amber-400" />
            Potencia Competitiva
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.competitiveVsTheme}
            onChange={(e) => handleSliderChange('competitiveVsTheme', e.target.value)}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500 hover:accent-amber-400 transition-all"
          />
        </div>
        <div className="flex justify-between text-[10px] text-stone-500 font-mono">
          <span>100% Lore / Tema</span>
          <span>Equilibrado</span>
          <span>100% Tier 1 Torneo</span>
        </div>
      </div>

      {/* Slider 2: Tribu Estricta vs Sinergia Pura */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-stone-300">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Tribu Estricta (100%)
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            {priorities.tribeVsSynergy > 0.6 ? 'Tribu Flexible / Bombas' : (priorities.tribeVsSynergy < 0.4 ? 'Tribu Cerrada' : 'Equilibrado')}
          </span>
          <span className="flex items-center gap-1.5 text-cyan-300">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Sinergia / Poder Libre
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.tribeVsSynergy}
            onChange={(e) => handleSliderChange('tribeVsSynergy', e.target.value)}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all"
          />
        </div>
        <div className="flex justify-between text-[10px] text-stone-500 font-mono">
          <span>Solo Criaturas de la Tribu</span>
          <span>Permitir Bombas Sinergicas</span>
          <span>Cualquier Criatura con Sinergia</span>
        </div>
      </div>

      {/* Slider 3: Innovación vs Consistencia */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="flex items-center gap-1.5 text-stone-300">
            <Crown className="w-3.5 h-3.5 text-blue-400" />
            Máxima Consistencia (Playsets 4x)
          </span>
          <span className="text-[11px] font-mono text-blue-400">
            {priorities.innovationVsConsistency > 0.5 ? 'Innovación / Spices' : 'Consistencia Meta'}
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            Innovación / Spices
          </span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={priorities.innovationVsConsistency}
            onChange={(e) => handleSliderChange('innovationVsConsistency', e.target.value)}
            className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
          />
        </div>
        <div className="flex justify-between text-[10px] text-stone-500 font-mono">
          <span>Metagame Probado</span>
          <span>Toques de Autor</span>
          <span>Descubrimiento Creativo</span>
        </div>
      </div>
    </div>
  );
}
