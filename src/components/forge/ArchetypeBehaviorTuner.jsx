import React from 'react';
import { Flame, Swords, Shield, Zap, Sparkles, Sliders, Target, RefreshCw, Compass } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function ArchetypeBehaviorTuner({
  archetype = 'aggro',
  isOpenStrategy = false,
  preferences = {},
  onChange,
  className
}) {
  const archKey = (isOpenStrategy ? 'open_strategy' : (archetype || 'aggro')).toLowerCase();

  const handleFieldChange = (field, value) => {
    if (typeof onChange === 'function') {
      onChange({
        ...preferences,
        [field]: value
      });
    }
  };

  const renderRadioGroup = (field, label, options, defaultValue) => {
    const currentValue = preferences[field] || defaultValue;
    return (
      <div className="space-y-1.5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-stone-300 flex items-center gap-1">
          {label}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {options.map((opt) => {
            const isSelected = currentValue === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleFieldChange(field, opt.value)}
                className={cn(
                  "px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex flex-col justify-center",
                  isSelected
                    ? "bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10 ring-1 ring-amber-400/40"
                    : "bg-stone-800/60 border-stone-700/60 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
                )}
              >
                <span className="font-bold flex items-center gap-1">{opt.icon} {opt.label}</span>
                {opt.sub && <span className="text-[9.5px] opacity-70 font-normal mt-0.5">{opt.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("p-4 md:p-5 rounded-2xl bg-stone-900/80 border border-stone-700/60 shadow-xl backdrop-blur-md space-y-4", className)}>
      <div className="flex items-center justify-between border-b border-stone-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-amber-200">
            Ajuste de Comportamiento Estratégico {isOpenStrategy ? '[Descubrimiento Libre]' : `[${archetype.toUpperCase()}]`}
          </h3>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-blue-300">
          COMPORTAMIENTO DINÁMICO
        </span>
      </div>

      {/* ── AGGRO TUNING ── */}
      {archKey.includes('aggro') && (
        <div className="space-y-4">
          {renderRadioGroup('speed', 'Velocidad de Asalto', [
            { value: 'EXPLOSIVE', label: 'Explosivo', icon: '🔥', sub: 'Matar T1-T3 (All-In)' },
            { value: 'FAST', label: 'Rápido', icon: '⚡', sub: 'Cierre consistente T4' },
            { value: 'BALANCED', label: 'Equilibrado', icon: '⚖️', sub: 'Presión con aguante T5' }
          ], 'EXPLOSIVE')}

          {renderRadioGroup('damagePlan', 'Plan de Daño y Remate', [
            { value: 'COMBAT', label: 'Combate Puro', icon: '🗡️', sub: 'Mesa y atacantes masivos' },
            { value: 'DIRECT_BURN', label: 'Daño Directo (Burn)', icon: '🔥', sub: 'Chispas a la cara' },
            { value: 'MIXED', label: 'Mixto (Mesa + Reach)', icon: '⚔️', sub: 'Presión inicial + alcance' }
          ], 'MIXED')}

          {renderRadioGroup('reachPriority', 'Prioridad de Alcance (Reach)', [
            { value: 'HIGH', label: 'Mucho Reach', icon: '🎯', sub: 'Remate por encima de mesa' },
            { value: 'BALANCED', label: 'Equilibrado', icon: '⚖️', sub: 'Chispas modales' },
            { value: 'LOW', label: 'Más Presencia', icon: '🛡️', sub: 'Maximizar criaturas' }
          ], 'HIGH')}

          {renderRadioGroup('resilience', 'Resiliencia ante Limpiezas (Sweepers)', [
            { value: 'ALL_IN', label: 'All-In Tempo', icon: '🚀', sub: 'Matar antes del wipe' },
            { value: 'WIPE_RECOVERY', label: 'Recuperar Fuelle', icon: '🔄', sub: 'Motores de recarga' },
            { value: 'BALANCED', label: 'Equilibrado', icon: '⚖️', sub: 'Amenazas resilientes' }
          ], 'BALANCED')}
        </div>
      )}

      {/* ── TEMPO TUNING ── */}
      {archKey.includes('tempo') && (
        <div className="space-y-4">
          {renderRadioGroup('evasionPriority', 'Evasión de Criaturas', [
            { value: 'HIGH', label: 'Alta Evasión', icon: '🕊️', sub: 'Volar / Inbloqueable' },
            { value: 'BALANCED', label: 'Equilibrada', icon: '⚖️', sub: 'Menor coste de maná' },
            { value: 'GROUND', label: 'Presión Terrestre', icon: '🏃', sub: 'Prowess / Haste' }
          ], 'HIGH')}

          {renderRadioGroup('instantSpeedPlay', 'Capacidad de Juego Instantáneo', [
            { value: 'MAX_FLASH', label: 'Draw-Go / Flash', icon: '⚡', sub: 'Jugar en turno rival' },
            { value: 'MIXED', label: 'Proactivo + Respuestas', icon: '⚔️', sub: 'Amenaza T1/T2 y proteger' }
          ], 'MIXED')}

          {renderRadioGroup('protection', 'Protección de la Amenaza Clave', [
            { value: 'ACTIVE_SHIELDS', label: 'Escudos / Ward', icon: '🛡️', sub: 'Hexproof / Fases' },
            { value: 'COUNTERMAGIC', label: 'Contrahechizos', icon: '🚫', sub: 'Denegar remoción' },
            { value: 'REPLACE', label: 'Reemplazo Rápido', icon: '🔄', sub: 'Muchas amenazas baratas' }
          ], 'COUNTERMAGIC')}
        </div>
      )}

      {/* ── MIDRANGE TUNING ── */}
      {archKey.includes('midrange') && (
        <div className="space-y-4">
          {renderRadioGroup('valueEngine', 'Motor de Ventaja y Valor', [
            { value: '2_FOR_1_GRIND', label: 'Desgaste 2x1', icon: '🔨', sub: 'Comer recursos rivales' },
            { value: 'THREAT_QUALITY', label: 'Calidad Superior', icon: '👑', sub: 'Bombas independientes' },
            { value: 'CARD_FLOW', label: 'Robo Sostenido', icon: '📜', sub: 'Nunca vaciar la mano' }
          ], '2_FOR_1_GRIND')}

          {renderRadioGroup('interactionDepth', 'Profundidad de Interacción', [
            { value: 'HEAVY_DISRUPTION', label: 'Disrupción Pesada', icon: '💥', sub: 'Descarte + Removal' },
            { value: 'BALANCED', label: 'Equilibrada', icon: '⚖️', sub: 'Respuestas versátiles' },
            { value: 'PROACTIVE', label: 'Más Proactivo', icon: '⚔️', sub: 'Priorizar amenazas propias' }
          ], 'HEAVY_DISRUPTION')}

          {renderRadioGroup('threatResilience', 'Resiliencia de Amenazas', [
            { value: 'STICKY_THREATS', label: 'Pegajosas / Resilientes', icon: '🛡️', sub: 'Deathtouch / ETB / Ward' },
            { value: 'DIVERSIFIED', label: 'Diversificadas', icon: '🌟', sub: 'Criaturas + Planeswalkers' }
          ], 'STICKY_THREATS')}
        </div>
      )}

      {/* ── CONTROL TUNING ── */}
      {archKey.includes('control') && (
        <div className="space-y-4">
          {renderRadioGroup('interactionSplit', 'Reparto de Respuestas', [
            { value: 'HEAVY_REMOVAL', label: 'Más Removal', icon: '🗡️', sub: 'Destruir y exiliar mesa' },
            { value: 'HEAVY_COUNTERMAGIC', label: 'Más Counters', icon: '🚫', sub: 'Denegar desde la pila' },
            { value: 'BALANCED', label: 'Equilibrado', icon: '⚖️', sub: '50% Removal / 50% Counters' }
          ], 'BALANCED')}

          {renderRadioGroup('boardWipes', 'Densidad de Limpiezas (Sweepers)', [
            { value: 'MAX_SWEEPERS', label: 'Cólera Masiva (4-6)', icon: '☀️', sub: 'Reiniciar la mesa' },
            { value: 'TARGETED_ONLY', label: 'Removal Puntual', icon: '🎯', sub: 'Intercambios 1-a-1' },
            { value: 'BALANCED', label: 'Moderada (2-3)', icon: '⚖️', sub: 'Sweepers como seguro' }
          ], 'BALANCED')}

          {renderRadioGroup('winCondition', 'Condición de Victoria', [
            { value: 'SINGLE_THREAT_LOCK', label: 'Amenaza Única', icon: '👑', sub: 'Proteger un único finisher' },
            { value: 'PLANESWALKERS', label: 'Planeswalkers', icon: '✨', sub: 'Ventaja y ultimates' },
            { value: 'VALUE_INEVITABILITY', label: 'Inevitabilidad', icon: '⏳', sub: 'Agotar al rival' }
          ], 'PLANESWALKERS')}
        </div>
      )}

      {/* ── COMBO TUNING ── */}
      {archKey.includes('combo') && (
        <div className="space-y-4">
          {renderRadioGroup('assemblySpeed', 'Velocidad de Ensamblaje', [
            { value: 'TURN_3_BLITZ', label: 'Blitz Turno 3', icon: '🚀', sub: 'Velocidad pura' },
            { value: 'TURN_4_CONSISTENT', label: 'Consistente Turno 4', icon: '🎯', sub: 'Mayor protección' },
            { value: 'FASTEST_POSSIBLE', label: 'Lo más rápido posible', icon: '⚡', sub: 'Sin importar riesgos' }
          ], 'TURN_4_CONSISTENT')}

          {renderRadioGroup('protectionLevel', 'Nivel de Protección', [
            { value: 'HIGH_DISRUPTION_SHIELD', label: 'Escudo Pesado', icon: '🛡️', sub: 'Silencios / Counters' },
            { value: 'MEDIUM', label: 'Protección Media', icon: '⚖️', sub: 'Respuestas clave' },
            { value: 'GLASS_CANNON', label: 'Cañón de Cristal', icon: '💥', sub: '100% piezas de combo' }
          ], 'HIGH_DISRUPTION_SHIELD')}
        </div>
      )}

      {/* ── RAMP TUNING ── */}
      {archKey.includes('ramp') && (
        <div className="space-y-4">
          {renderRadioGroup('rampSpeed', 'Velocidad de Aceleración', [
            { value: 'HYPER_RAMP', label: 'Híper-Ramp T1-T2', icon: '🌱', sub: 'Dorks y piedras rápidas' },
            { value: 'CONSISTENT_MID', label: 'Estable Turnos 2-3', icon: '🌲', sub: 'Buscar tierras a la mesa' }
          ], 'CONSISTENT_MID')}

          {renderRadioGroup('payoffType', 'Tipo de Recompensa (Payoff)', [
            { value: 'TITANS_CREATURES', label: 'Criaturas Colosales', icon: '🦖', sub: 'Titanes y monstruos' },
            { value: 'SPELLS_X', label: 'Hechizos con Coste X', icon: '⚡', sub: 'Tormentas de daño/mana' },
            { value: 'PLANESWALKERS', label: 'Planeswalkers Altos', icon: '👑', sub: 'Control total de mesa' }
          ], 'TITANS_CREATURES')}
        </div>
      )}

      {/* ── ESTRATEGIA ABIERTA (OPEN STRATEGY) ── */}
      {(isOpenStrategy || archKey.includes('open')) && (
        <div className="space-y-4">
          {renderRadioGroup('discoveryGoal', 'Objetivo del Descubrimiento', [
            { value: 'MAX_POWER', label: 'Máxima Potencia', icon: '🏆', sub: 'La línea más competitiva' },
            { value: 'MAX_SYNERGY', label: 'Sinergia Pura', icon: '🌀', sub: 'Motores interconectados' },
            { value: 'BALANCED', label: 'Equilibrio Óptimo', icon: '⚖️', sub: 'Consistencia y tempo' }
          ], 'MAX_POWER')}

          {renderRadioGroup('riskTolerance', 'Tolerancia al Riesgo', [
            { value: 'CALCULATED_RELIABILITY', label: 'Consistencia Probada', icon: '🛡️', sub: 'Baja varianza' },
            { value: 'HIGH_CEILING', label: 'Techo de Poder Máximo', icon: '🚀', sub: 'Manos explosivas' }
          ], 'CALCULATED_RELIABILITY')}
        </div>
      )}
    </div>
  );
}
