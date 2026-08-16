import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Sparkles, Swords, Shield, Zap, Flame, Crown, BookOpen, Search, Check, Plus, AlertCircle, Wand2, Compass, PlusCircle, MinusCircle, Scroll, TrendingUp, Lock, Unlock, ShieldAlert, RefreshCw, Globe } from 'lucide-react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { vibrateTouch } from '../../utils/haptic';
import BottomSheet from '../atoms/BottomSheet';

import { BATTLEBOX_VETOS, BATTLEBOX_ARCHETYPES, getBattleBoxFormatName, BATTLEBOX_FORMAT_NAME, MTG_TRIBES, MTG_STRATEGIES, TRIBE_CATEGORIES, COLORS, HISTORICAL_DECKS_CATALOG, inferStrategyFromArchetype, UNIVERSAL_ENGINES } from '../../constants/legacyBattleBox';
import ManaOrb from '../atoms/ManaOrb';
import { getDynamicArchetypes, buildCardPool } from '../../services/ragService';
import { injectCorePackage } from '../../constants/corePackages';
import { getAllCards } from '../../services/dbIngestor';
import ManaCurve from './ManaCurve';
import { composeTwoLayerBlueprint } from '../../constants/blueprintTemplates';
import { isUniversesBeyondOrCustom } from '../../utils/legalityCheck';

// Componente de Renderizado Gráfico de Coste de Maná Premium (Scryfall Style)
export function RenderManaCost({ manaCost, className }) {
  if (!manaCost || typeof manaCost !== 'string') return null;

  // Extraer los símbolos individuales encerrados entre llaves {}
  const symbols = manaCost.match(/\{[^}]+\}/g) || [];

  return (
    <div className={cn("inline-flex items-center gap-0.5", className)}>
      {symbols.map((sym, idx) => {
        const cleanSym = sym.replace(/[{}]/g, '').toUpperCase();
        let bgStyle = "bg-stone-500 text-white";
        let label = cleanSym;

        if (cleanSym === 'W') {
          return <img key={idx} src="/ASSETS/manaBlanco.webp" alt="W" className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain select-none" />;
        } else if (cleanSym === 'U') {
          return <img key={idx} src="/ASSETS/manaAzul.webp" alt="U" className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain select-none" />;
        } else if (cleanSym === 'B') {
          return <img key={idx} src="/ASSETS/manaNegro.webp" alt="B" className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain select-none" />;
        } else if (cleanSym === 'R') {
          return <img key={idx} src="/ASSETS/manaRojo.webp" alt="R" className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain select-none" />;
        } else if (cleanSym === 'G') {
          return <img key={idx} src="/ASSETS/manaVerde.webp" alt="G" className="w-3.5 h-3.5 md:w-4 md:h-4 object-contain select-none" />;
        } else if (cleanSym === 'C') {
          bgStyle = "bg-gradient-to-br from-[#cfd4d6] to-[#7f888c] border-stone-500/30 text-stone-900 shadow-sm";
        } else if (cleanSym === 'X') {
          bgStyle = "bg-gradient-to-br from-[#8e8e8e] to-[#4c4c4c] border-stone-600/40 text-white shadow-sm";
        } else if (cleanSym.includes('/')) {
          const parts = cleanSym.split('/');
          const colorsMap = {
            'W': '#fffdf0',
            'U': '#106296',
            'B': '#150d12',
            'R': '#ab1c0e',
            'G': '#186b24',
            'C': '#7f888c',
            'P': '#7a2048'
          };
          const c1 = colorsMap[parts[0]] || '#4c4c4c';
          const c2 = colorsMap[parts[1]] || '#4c4c4c';
          
          return (
            <span
              key={idx}
              className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center border border-black/40 text-[8px] md:text-[9.5px] font-black font-sans leading-none shadow-md"
              style={{
                background: `linear-gradient(135deg, ${c1} 50%, ${c2} 50%)`,
                color: parts.includes('W') ? '#1c1917' : '#ffffff'
              }}
            >
              {cleanSym.replace('/', '')}
            </span>
          );
        } else {
          bgStyle = "bg-gradient-to-br from-[#a3a3a3] to-[#525252] border-stone-600/20 text-white text-[9px] md:text-[10px] font-bold";
        }

        return (
          <span 
            key={idx} 
            className={cn(
              "w-3.5 h-3.5 md:w-4 md:h-4 rounded-full flex items-center justify-center border border-black/50 text-[8.5px] md:text-[10px] font-black font-sans leading-none shadow-sm select-none",
              bgStyle
            )}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

export function getProsaEpica(formData, currentArchetype) {
  if (!currentArchetype) return '';
  const nombresColores = (formData?.colores || []).map(c => COLORS.find(co => co.id === c)?.name).filter(Boolean);
  const coloresTexto = nombresColores.length > 0 
    ? nombresColores.slice(0, -1).join(', ') + (nombresColores.length > 1 ? ' y ' : '') + nombresColores.slice(-1)
    : 'incoloras';

  let prosepica = `Bajo el signo del arquetipo **${currentArchetype.label}**, canalizarás energías **${coloresTexto}** para dar forma a una estrategia de velocidad **${currentArchetype.speed}**.`;
  if (formData?.tribe) {
    prosepica += ` Invocarás la fuerza e identidad de la facción de los **${formData.tribe}**, `;
  } else {
    prosepica += ` Mantendrás un ejército diversificado sin afiliación tribal estricta, `;
  }
  if (formData?.strategy) {
    prosepica += `articulando cada jugada en base al motor de **${formData.strategy}**.`;
  } else {
    prosepica += `confiando en la excelencia de la pura ventaja de cartas.`;
  }
  return prosepica;
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

const LEGACY_ARCHETYPES = BATTLEBOX_ARCHETYPES.map(a => {
  return {
    value: a.id,
    label: a.label.split('(')[0].trim(),
    landCount: a.landCount,
    recommendedColors: a.recommendedColors,
    speed: a.speed,
    winTurn: a.winTurn,
    colorHint: `Velocidad: ${a.speed} • Victoria: Turno ${a.winTurn}`,
    description: a.description,
    formats: ['MODERN', 'PIONEER', 'STANDARD'],
    colorGroup: 'generic',
    difficulty: a.difficulty,
    signatureCards: a.signatureCards,
    jargonTags: a.jargonTags,
    beginnerTip: a.beginnerTip
  };
});

// Definiciones de tabs de grupo de color
const COLOR_GROUP_TABS = [
  { id: 'generic', label: 'Universales', icon: '⚙️', desc: 'Arquetipos base' },
  { id: 'mono', label: 'Mono-Color', icon: '🔮', desc: '1 color' },
  { id: 'bicolor', label: 'Bicolor', icon: '⚔️', desc: 'Gremios' },
  { id: 'tricolor', label: 'Tricolor', icon: '🌀', desc: 'Shards/Clanes' },
  { id: 'multicolor', label: '4-5 Colores / Incoloro', icon: '👑', desc: 'Eldrazi, Tron y Multicolor' }
];

// Componente Premium: Vistazo Rápido de tu Ecosistema
function QuickGlancePanel({ formData, currentArchetype, selectedTribeInfo, selectedStrategyInfo, isCustomTribe, isCustomStrategy, pseudoDeck }) {
  if (!currentArchetype) {
    return (
      <div className="frosted-panel border-2 border-magic-gold/30 p-6 rounded-2xl bg-gradient-to-b from-[#18120c] via-[#0b0805] to-black text-center space-y-4 relative overflow-hidden shadow-2xl">
        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
        <Scroll className="w-10 h-10 text-magic-gold mx-auto animate-pulse" />
        <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.15em] text-[#ffca58]">El Grimorio está Vacío</h4>
        <p className="text-[11.5px] text-white/60 font-serif leading-relaxed">
          Selecciona una clase y arquetipo en el primer paso para comenzar a trazar las runas de tu mazo competitivo.
        </p>
      </div>
    );
  }

  // Estilos de velocidad dinámicos
  const getSpeedStyle = (speed) => {
    const s = (speed || '').toLowerCase();
    if (s.includes('rápida')) return { border: 'border-red-500/40 bg-red-950/45 text-red-400', label: 'Blitz/Agresivo' };
    if (s.includes('media-rápida')) return { border: 'border-orange-500/40 bg-orange-950/45 text-orange-400', label: 'Tempo' };
    if (s.includes('media')) return { border: 'border-amber-500/40 bg-amber-950/45 text-amber-400', label: 'Midrange' };
    return { border: 'border-emerald-500/40 bg-emerald-950/45 text-emerald-400', label: 'Control/Taxes' };
  };

  const speedStyle = getSpeedStyle(currentArchetype.speed);

  const prosepica = getProsaEpica(formData, currentArchetype);

  return (
    <div className="frosted-panel border-2 border-magic-gold/45 p-6 rounded-2xl bg-gradient-to-b from-[#1c140e] via-[#0d0906] to-[#040303] shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_20px_rgba(255,202,88,0.15)] space-y-6 relative overflow-hidden h-fit sticky top-6">
      {/* Runas de fondo */}
      <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
      
      {/* Título de Cabecera */}
      <div className="border-b border-magic-gold/25 pb-3.5 flex items-center justify-between relative z-10">
        <h4 className="font-cinzel text-[13px] font-black uppercase tracking-[0.2em] text-magic-gold flex items-center gap-2 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          <Scroll size={14} className="text-magic-gold animate-pulse" /> Vistazo del Ecosistema
        </h4>
        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-[#ffca58]/40 bg-[#ffca58]/10 text-magic-gold shadow-[0_0_8px_rgba(255,202,88,0.1)]">
          {currentArchetype.isDynamic ? "RAG Dinámico" : "Legacy"}
        </span>
      </div>

      {/* Grid de Métricas Rúnicas */}
      <div className="grid grid-cols-2 gap-3.5 relative z-10">
        <div className={cn("p-3 rounded-xl border flex flex-col justify-between min-h-[70px] shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]", speedStyle.border, speedStyle.glow)}>
          <span className="text-[8.5px] uppercase tracking-widest text-[#ffdf91] font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Cadencia</span>
          <span className="text-xs font-cinzel font-black tracking-wide leading-none mt-1.5 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">{currentArchetype.speed}</span>
          <span className="text-[8px] font-sans font-bold text-white/70 leading-none mt-1">{speedStyle.label}</span>
        </div>
        <div className="p-3 rounded-xl border border-white/15 bg-black/85 shadow-[inset_0_0_10px_rgba(0,0,0,0.9),0_0_15px_rgba(255,255,255,0.03)] flex flex-col justify-between min-h-[70px]">
          <span className="text-[8.5px] uppercase tracking-widest text-[#ffdf91] font-black leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Turno Crítico</span>
          <span className="text-sm font-cinzel font-black text-magic-gold leading-none mt-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">T{currentArchetype.winTurn}</span>
          <span className="text-[8px] font-sans font-bold text-white/60 leading-none mt-1">Victoria Optimizada</span>
        </div>
      </div>

      {/* Visualizador de Orbes de Maná Consagrados */}
      <div className="space-y-2 relative z-10">
        <span className="text-[9px] uppercase tracking-widest text-[#ffdf91] font-black block drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Maná Consagrado:</span>
        <div className="flex gap-1.5 p-3 bg-black/90 border border-white/10 rounded-xl justify-center shadow-inner min-h-[40px]">
          {(formData?.colores || []).length > 0 ? (
            (formData?.colores || []).map(c => {
              const cObj = COLORS.find(co => co.id === c);
              return (
                <div key={c} className="w-5.5 h-5.5 rounded-full overflow-hidden shadow-md border-2 border-black/80 hover:scale-125 hover:border-magic-gold transition-all duration-300 cursor-help" title={cObj?.name}>
                  <img src={cObj?.icon} alt={c} className="w-full h-full object-cover" />
                </div>
              );
            })
          ) : (
            <span className="text-[9.5px] text-white/50 font-serif self-center italic">Sin colores consagrados</span>
          )}
        </div>
      </div>

      {/* Sinergias del Núcleo */}
      <div className="space-y-4 relative z-10 border-t border-white/10 pt-4">
        <div>
          <span className="text-[8.5px] uppercase tracking-widest text-[#ffdf91] font-black block leading-none mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Identidad Tribal:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">🧬</span>
            <span className={cn("text-[11.5px] font-cinzel font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]", formData.tribe ? "text-white" : "text-white/40 italic")}>
              {formData.tribe ? formData.tribe : "Sin Afiliación Tribal"}
            </span>
            {selectedTribeInfo && (
              <div className="flex gap-0.5 ml-auto">
                {selectedTribeInfo.colors.map(col => (
                  <div key={col} className="w-3.5 h-3.5 rounded-full border border-black/50 overflow-hidden shadow-md" title={COLORS.find(co => co.id === col)?.name}>
                    <img src={COLORS.find(co => co.id === col)?.icon} alt={col} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <span className="text-[8.5px] uppercase tracking-widest text-[#ffdf91] font-black block leading-none mb-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">Motor de Combate:</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">⚔️</span>
            <span className={cn("text-[11.5px] font-cinzel font-black tracking-wide drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]", formData.strategy ? "text-white" : "text-white/40 italic")}>
              {formData.strategy ? formData.strategy : "Sin Sinergia Específica"}
            </span>
            {selectedStrategyInfo && (
              <div className="flex gap-0.5 ml-auto">
                {selectedStrategyInfo.colors.map(col => (
                  <div key={col} className="w-3.5 h-3.5 rounded-full border border-black/50 overflow-hidden shadow-md" title={COLORS.find(co => co.id === col)?.name}>
                    <img src={COLORS.find(co => co.id === col)?.icon} alt={col} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prosa Mística y Épica */}
      <div className="p-4 bg-black/90 border border-magic-gold/30 rounded-xl relative z-10 shadow-2xl">
        <span className="text-[9px] uppercase tracking-[0.15em] text-magic-gold font-black block mb-2 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <TrendingUp size={10} className="text-magic-gold" /> Revelación del Oráculo
        </span>
        <p 
          className="text-[12px] text-white/95 font-serif leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]"
          dangerouslySetInnerHTML={{ 
            __html: prosepica
              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#ffdf91] font-black drop-shadow-[0_1px_3px_rgba(255,202,88,0.5)]">$1</strong>')
          }}
        />
      </div>

      {/* Curva de Maná Estimada */}
      {pseudoDeck && pseudoDeck.length > 0 && (
        <div className="space-y-2 relative z-10 border-t border-white/10 pt-4">
          <span className="text-[9px] uppercase tracking-widest text-[#ffdf91] font-black block drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            Curva de Maná Estimada ({pseudoDeck.reduce((acc, c) => acc + c.quantity, 0)} cartas):
          </span>
          <ManaCurve deck={pseudoDeck} compact={true} archetype={currentArchetype?.value || ''} />
        </div>
      )}

      {/* Reglas Especiales y Excepciones Tácticas (Pro Tour) */}
      <div className="space-y-2 relative z-10">
        {formData?.companero?.toLowerCase().includes("yorion") && (
          <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-center gap-2">
            <Sparkles size={14} className="text-blue-400 animate-pulse" />
            <div>
              <span className="text-[10px] font-bold text-blue-400 block uppercase tracking-wide">Companion: Yorion</span>
              <span className="text-[9px] text-blue-200/70 leading-tight block">El mazo escalará a 80 cartas.</span>
            </div>
          </div>
        )}
        
        {(currentArchetype.id === 'legacy-eldrazi' || (formData?.strategy || '').toLowerCase().includes('tron')) && (
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
            <span className="text-sm">⚙️</span>
            <div>
              <span className="text-[10px] font-bold text-amber-400 block uppercase tracking-wide">Motor Tron Asegurado</span>
              <span className="text-[9px] text-amber-200/70 leading-tight block">El Juez inyectará 12 Urza Lands obligatoriamente.</span>
            </div>
          </div>
        )}

        {(currentArchetype.id === 'aggro' || (formData?.strategy || '').toLowerCase().includes('burn')) && (
          <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <Flame size={14} className="text-red-400" />
            <div>
              <span className="text-[10px] font-bold text-red-400 block uppercase tracking-wide">Inmunidad Agresiva</span>
              <span className="text-[9px] text-red-200/70 leading-tight block">El daño directo no será recortado por el Juez.</span>
            </div>
          </div>
        )}
      </div>

      {/* Nota sutil de tierras */}
      <div className="text-[9px] text-[#ffdf91]/50 text-center font-sans font-semibold tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">
        El Juez Supremo optimizará la base de maná para un total de {formData?.companero?.toLowerCase().includes("yorion") ? 80 : 60} cartas.
      </div>
    </div>
  );
}

// Pactos de Gremio (Presets de Color rápidos)
const PACTOS_DE_GREMIO = [
  // Guilds (2 colores)
  { id: 'azorius', label: 'Azorius (WU)', colors: ['W', 'U'] },
  { id: 'dimir', label: 'Dimir (UB)', colors: ['U', 'B'] },
  { id: 'rakdos', label: 'Rakdos (BR)', colors: ['B', 'R'] },
  { id: 'gruul', label: 'Gruul (RG)', colors: ['R', 'G'] },
  { id: 'selesnya', label: 'Selesnya (WG)', colors: ['W', 'G'] },
  { id: 'orzhov', label: 'Orzhov (WB)', colors: ['W', 'B'] },
  { id: 'izzet', label: 'Izzet (UR)', colors: ['U', 'R'] },
  { id: 'golgari', label: 'Golgari (BG)', colors: ['B', 'G'] },
  { id: 'boros', label: 'Boros (WR)', colors: ['W', 'R'] },
  { id: 'simic', label: 'Simic (UG)', colors: ['U', 'G'] },
  // Shards / Clans (3 colores)
  { id: 'grixis', label: 'Grixis (UBR)', colors: ['U', 'B', 'R'] },
  { id: 'jund', label: 'Jund (BRG)', colors: ['B', 'R', 'G'] },
  { id: 'esper', label: 'Esper (WUB)', colors: ['W', 'U', 'B'] },
  { id: 'naya', label: 'Naya (WRG)', colors: ['W', 'R', 'G'] },
  { id: 'bant', label: 'Bant (WUG)', colors: ['W', 'U', 'G'] },
  { id: 'abzan', label: 'Abzan (WBG)', colors: ['W', 'B', 'G'] },
  { id: 'jeskai', label: 'Jeskai (WUR)', colors: ['W', 'U', 'R'] },
  { id: 'sultai', label: 'Sultai (UBG)', colors: ['U', 'B', 'G'] },
  { id: 'mardu', label: 'Mardu (WBR)', colors: ['W', 'B', 'R'] },
  { id: 'temur', label: 'Temur (URG)', colors: ['U', 'R', 'G'] }
];

const RARITY_MODES = [
  { value: 'high-power', label: 'Poder de Legacy', icon: '⚡', desc: 'Acceso total a míticas y raras sin límites.', detail: 'Acceso total a cartas raras y míticas sin restricción de rareza, manteniendo la balanza de Battle Box.' },
  { value: 'standard', label: 'Estándar', icon: '⚖️', desc: 'Equilibrio casual general.', detail: 'Equilibrio casual equilibrado general.' },
  { value: 'artisan', label: 'Artisan', icon: '🛡️', desc: 'Comunes e Infrecuentes.', detail: 'El Oráculo y el Juez de Estado forzarán exclusivamente cartas Comunes e Infrecuentes. Rarezas superiores serán transmutadas.' },
  { value: 'pauper', label: 'Pauper', icon: '🍃', desc: 'Únicamente cartas Comunes.', detail: 'El Oráculo y el Juez de Estado forzarán exclusivamente cartas Comunes. Cualquier carta de rareza superior será transmutada.' }
];

const GENERATION_PRIORITIES = [
  { value: 'hybrid', label: 'Balanceado', icon: '⚖️', desc: 'Equilibrio de sinergia y metagame.', detail: 'Equilibrio balanceado óptimo entre la sinergia interna del mazo y el nivel de poder individual de las cartas.' },
  { value: 'synergy', label: 'Sinergia Pura', icon: '🔗', desc: 'Enfoque en combos y motores de juego.', detail: 'Prioridad máxima a la sinergia mecánica y la interconectividad de cartas. Favorece motores y combos, incluso si usan cartas menos comunes en torneos.' },
  { value: 'competitive', label: 'Competitivo', icon: '🏆', desc: 'Prioriza staples y poder de metagame.', detail: 'Prioriza el nivel de poder individual de las cartas basándose en la base de datos de torneos competitivos de Modern y coocurrencias.' },
  { value: 'thematic', label: 'Temático / Casual', icon: '🎨', desc: 'Fidelidad extrema a tus instrucciones.', detail: 'Prioriza la interpretación del prompt y sabor de tus instrucciones. Potencia la originalidad del mazo.' }
];

const detectFunctionalRole = (card) => {
  if (!card) return "🔮 Payoff";
  const name = (card.name || "").toLowerCase();
  const typeLine = (card.type_line || "").toLowerCase();
  const oracleRaw = card.oracle_text || card.text || "";
  const oracle = oracleRaw.toLowerCase().replace(/\([^)]*\)/g, ""); // Limpiar textos en paréntesis

  if (typeLine.includes("land")) return "⚙️ Tierra";
  
  // 1. Reanimador
  if (name.includes("reanimate") || oracle.includes("return target creature card from your graveyard to the battlefield") || oracle.includes("put target creature card from a graveyard")) {
    return "⚰️ Reanimador";
  }
  
  // 2. Remoción (Chequear antes de Robo/Cantrip)
  if (
    oracle.includes("destroy target") || 
    oracle.includes("exile target") || 
    oracle.includes("damage to target") || 
    oracle.includes("damage to any target") || 
    (oracle.includes("deals ") && oracle.includes(" damage to ")) ||
    name.includes("smite") || 
    name.includes("slash") || 
    name.includes("helix") || 
    name.includes("push") || 
    name.includes("bolt") || 
    name.includes("path to exile") || 
    name.includes("swords to plowshares") ||
    oracle.includes("destroy all") ||
    oracle.includes("exile all")
  ) {
    return "⚔️ Remoción";
  }

  // 3. Contrahechizo
  if (oracle.includes("counter target spell") || oracle.includes("counter target activated") || name.includes("counterspell")) {
    return "🛡️ Contrahechizo";
  }

  // 4. Rampa
  if (
    oracle.includes("add {") || 
    oracle.includes("add one mana") || 
    oracle.includes("add mana") || 
    oracle.includes("search your library for a land") || 
    oracle.includes("search your library for a basic land") || 
    oracle.includes("play an additional land") ||
    name.includes("talisman") || 
    name.includes("signet") || 
    name.includes("locket") ||
    typeLine.includes("mana dork")
  ) {
    return "⚡ Rampa";
  }

  // 5. Motores / Sinergias (Triggered abilities)
  if (oracle.includes("whenever") || oracle.includes("at the beginning of") || oracle.includes("at the end of")) {
    return "⚙️ Motor";
  }

  // 6. Robo / Cantrip
  if (
    oracle.includes("draw ") || 
    oracle.includes("look at the top") || 
    oracle.includes("scry") || 
    oracle.includes("surveil") || 
    name.includes("ponder") || 
    name.includes("brainstorm") || 
    name.includes("consider") || 
    name.includes("preordain")
  ) {
    return "👁️ Robo/Cantrip";
  }

  // 7. Amenazas grandes / Planeswalkers
  if (typeLine.includes("planeswalker")) {
    return "💀 Planeswalker";
  }
  const power = parseInt(card.power || "0", 10);
  const cmc = card.mana_value ?? card.cmc ?? 0;
  if (typeLine.includes("creature") && (power >= 4 || cmc >= 4)) {
    return "🔥 Amenaza";
  }

  return "🔮 Payoff";
};

export default function ForgeForm({ onSubmit, isLoading, disabled, error, lastGenerationLogs, onOpenOracleLog, selectedFormat = 'MODERN', onFormatChange, initialSeedCards = {}, initialFormData = null }) {
  const isMobile = useIsMobile();
  const [showMobileGlance, setShowMobileGlance] = useState(false);
  const [formData, setFormData] = useState(() => {
    let savedRarity = 'high-power';
    let savedAllowCustom = false;
    let savedPriority = 'hybrid';
    try {
      const savedConfig = localStorage.getItem('mtg_ai_config_forge') || localStorage.getItem('mtg_forge_ai_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.rarityMode) savedRarity = parsed.rarityMode;
        if (parsed.allowCustomCards !== undefined) savedAllowCustom = !!parsed.allowCustomCards;
        if (parsed.generationPriority) savedPriority = parsed.generationPriority;
      }
    } catch (e) {}

    return {
      formato: 'legacy-battlebox',
      archetype: '',
      colores: [],
      tribe: '',
      strategy: '',
      selectedEngineId: '',
      engineFlavor: '',
      customPrompt: '',
      curveProfile: 'balanced',
      prompt: '',
      mustInclude: '',
      customBanlist: '',
      rarityMode: savedRarity,
      allowCustomCards: savedAllowCustom,
      generationPriority: savedPriority,
      vetoedKeywords: [],
      vetoedCards: [],
      playstyle: 'balanced',
      stance: 'balanced',
      deckSize: 60,
      sideboardSize: 15,
      singleton: false,
      maxCopies: 4,
      maxBudget: 'unlimited',
      allowedRarities: ['common', 'uncommon', 'rare', 'mythic'],
      aestheticFilters: [],
      creativity: 50,
      selectedModel: 'flash',
      selectedCorePackages: [],
      predefinedBanned: [],
      manaGreed: 'balanced',
      manaBaseStyle: 'competitive',
      sideboardFocus: [],
    };
  });

  useEffect(() => {
    if (initialFormData) {
      setFormData(prev => ({
        ...prev,
        ...initialFormData
      }));
      const isStatic = LEGACY_ARCHETYPES.some(la => la.value === initialFormData.archetype);
      if (isStatic) {
        setActiveSenda('sandbox');
        setActiveColorTab('generic');
      } else {
        setActiveSenda('meta');
        setActiveColorTab(initialFormData.colorGroup || 'bicolor');
      }
    }
  }, [initialFormData]);

  useEffect(() => {
    if (initialSeedCards && Object.keys(initialSeedCards).length > 0) {
      setSeedCards(initialSeedCards);
    }
  }, [initialSeedCards]);

  useEffect(() => {
    if (selectedFormat === 'COMMANDER') {
      setFormData(prev => ({
        ...prev,
        singleton: true,
        maxCopies: 1,
        deckSize: 100,
        sideboardSize: 0,
        playstyle: 'adaptive',
        companero: prev.companero?.toLowerCase().includes('yorion') ? '' : prev.companero
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        singleton: false,
        maxCopies: prev.maxCopies === 1 ? 4 : prev.maxCopies,
        deckSize: prev.companero?.toLowerCase().includes('yorion') ? 80 : 60,
        sideboardSize: 15
      }));
    }
  }, [selectedFormat]);

  const CURVE_PROFILES = [
    { id: 'blitz', label: 'Blitz', icon: '🔥', desc: 'Ultra-baja. Burn, Prowess', avgCmc: '1.4–1.8' },
    { id: 'aggressive', label: 'Agresiva', icon: '⚡', desc: 'Tempo, Tribal Aggro', avgCmc: '1.8–2.2' },
    { id: 'balanced', label: 'Equilibrada', icon: '⚔️', desc: 'Midrange, Blink, Aristocrats', avgCmc: '2.2–2.8' },
    { id: 'heavy', label: 'Pesada', icon: '🛡️', desc: 'Control, Ramp, Reanimator', avgCmc: '2.8–3.5' }
  ];

  const ARCHETYPE_DEFAULT_CURVE = {
    aggro: 'aggressive', tempo: 'aggressive', midrange: 'balanced',
    control: 'heavy', combo: 'balanced', prison: 'heavy',
    'legacy-eldrazi': 'heavy'
  };

  const [archetypesList, setArchetypesList] = useState(LEGACY_ARCHETYPES);
  const [isGuidedMode, setIsGuidedMode] = useState(true);
  const [lockedColors, setLockedColors] = useState(false);
  const [activeSenda, setActiveSenda] = useState(null); // 'sandbox' o 'meta'

  useEffect(() => {
    const loadDynamic = async () => {
      try {
        const dynamicArchs = await getDynamicArchetypes();
        if (dynamicArchs && dynamicArchs.length > 0) {
          // Reasignar incoloros dinámicos ('generic') a 'multicolor' para Senda 2
          const transformedDynamic = dynamicArchs.map(a => {
            if (a.colorGroup === 'generic') {
              return { ...a, colorGroup: 'multicolor' };
            }
            return a;
          });

          // Filtrar duplicados por el campo 'value'
          const existingValues = new Set(LEGACY_ARCHETYPES.map(a => a.value));
          const filteredDynamic = transformedDynamic.filter(a => !existingValues.has(a.value));
          setArchetypesList([...LEGACY_ARCHETYPES, ...filteredDynamic]);
          console.log(`📊 [ForgeForm] Fusionados ${filteredDynamic.length} arquetipos dinámicos RAG.`);
        }
      } catch (err) {
        console.warn("⚠️ [ForgeForm] Fallo al cargar arquetipos dinámicos. Usando fallback seguro:", err);
      }
    };
    loadDynamic();
  }, []);

  // Auto-detección de senda al volver atrás o cargar un arquetipo seleccionado
  useEffect(() => {
    if (formData.archetype) {
      const arch = archetypesList.find(a => a.value === formData.archetype);
      if (arch) {
        const isStatic = LEGACY_ARCHETYPES.some(la => la.value === arch.value);
        if (isStatic) {
          setActiveSenda('sandbox');
          setActiveColorTab('generic');
        } else {
          setActiveSenda('meta');
          setActiveColorTab(arch.colorGroup || 'bicolor');
        }
      }
    }
  }, [formData.archetype, archetypesList]);

  const [isCustomTribe, setIsCustomTribe] = useState(false);
  const [isCustomStrategy, setIsCustomStrategy] = useState(false);
  const [hasUserClearedTribe, setHasUserClearedTribe] = useState(false);
  const [hasUserClearedStrategy, setHasUserClearedStrategy] = useState(false);
  const [activeTribeTab, setActiveTribeTab] = useState('clasica');
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [activeColorTab, setActiveColorTab] = useState('generic');
  const [searchQuery, setSearchQuery] = useState('');
  const [colorSuggestion, setColorSuggestion] = useState(null);

  const [vetoedKeywords, setVetoedKeywords] = useState([]);
  const [vetoedCards, setVetoedCards] = useState([]);
  const [seedCards, setSeedCards] = useState({});
  const [seedPriorities, setSeedPriorities] = useState({});
  const [isTuningOpen, setIsTuningOpen] = useState(true);
  const [isSummaryOpen, setIsSummaryOpen] = useState(true);

  const toggleSeedPriority = (cardName) => {
    setSeedPriorities(prev => ({
      ...prev,
      [cardName]: prev[cardName] === 'high' ? 'normal' : 'high'
    }));
  };

  const [seedSearchQuery, setSeedSearchQuery] = useState('');
  const [seedSearchResults, setSeedSearchResults] = useState([]);
  const [vetoSearchQuery, setVetoSearchQuery] = useState('');
  const [vetoSearchResults, setVetoSearchResults] = useState([]);
  const [allCards, setAllCards] = useState([]);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [flipStates, setFlipStates] = useState({});

  const [isPackLoading, setIsPackLoading] = useState(false);
  const [packCards, setPackCards] = useState([]);
  const [synergyTypeFilter, setSynergyTypeFilter] = useState('all');
  const [synergyRoleFilter, setSynergyRoleFilter] = useState('all');
  const [synergyCmcFilter, setSynergyCmcFilter] = useState('all');
  const [synergyRarityFilter, setSynergyRarityFilter] = useState('all');
  const [synergySortBy, setSynergySortBy] = useState('synergy');
  const [synergyBlueprintContainer, setSynergyBlueprintContainer] = useState('all');

  const [forgeHistory, setForgeHistory] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mtg_forge_history');
      if (raw) {
        setForgeHistory(JSON.parse(raw));
      }
    } catch (e) {}
  }, []);

  // Cargar todas las cartas de la base de datos local para búsquedas e inyección
  useEffect(() => {
    const loadCards = async () => {
      try {
        const cards = await getAllCards();
        setAllCards(cards || []);
      } catch (e) {
        console.warn("Failed to load local IndexedDB cards:", e);
      }
    };
    loadCards();
  }, []);

  const currentArchetype = useMemo(() => {
    return archetypesList.find(a => a.value === formData.archetype);
  }, [archetypesList, formData.archetype]);

  const pseudoDeck = useMemo(() => {
    const list = [];
    Object.entries(seedCards || {}).forEach(([cardName, qty]) => {
      const cardObj = allCards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      if (cardObj) {
        list.push({
          ...cardObj,
          quantity: qty
        });
      } else {
        list.push({
          name: cardName,
          quantity: qty,
          mana_value: 0,
          type_line: 'Spell'
        });
      }
    });
    return list;
  }, [seedCards, allCards]);

  const getStepStatus = useCallback((stepId) => {
    switch (stepId) {
      case 1:
        return formData.archetype ? 'complete' : 'empty';
      case 2:
        if (currentArchetype?.isDynamic) return 'complete';
        if (formData.isExpertMode) {
          return formData.customPrompt ? 'complete' : 'empty';
        }
        if (formData.tribe && formData.strategy) return 'complete';
        if (formData.tribe || formData.strategy) return 'partial';
        return 'empty';
      case 3:
        return ((formData.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi') ? 'complete' : 'empty';
      case 4:
        const hasSeeds = Object.keys(seedCards || {}).length > 0;
        const hasVetos = (vetoedKeywords || []).length > 0 || (vetoedCards || []).length > 0;
        const hasPredefinedBanned = (formData.predefinedBanned || []).length > 0;
        if (formData.prompt || hasSeeds || hasVetos || hasPredefinedBanned) return 'complete';
        return 'partial';
      default:
        return 'empty';
    }
  }, [formData, currentArchetype, seedCards, vetoedKeywords, vetoedCards]);

  const incompatibleSeeds = useMemo(() => {
    if ((formData.colores || []).length === 0 || Object.keys(seedCards || {}).length === 0) return [];
    if (formData.archetype === 'legacy-eldrazi') return [];
    
    const list = [];
    Object.keys(seedCards).forEach(cardName => {
      const cardObj = allCards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
      if (cardObj && cardObj.color_identity && cardObj.color_identity.length > 0) {
        const isMatch = cardObj.color_identity.every(col => (formData.colores || []).includes(col));
        if (!isMatch) {
          list.push(cardName);
        }
      }
    });
    return list;
  }, [seedCards, formData.colores, formData.archetype, allCards]);

  const selectedTribeInfo = useMemo(() => {
    if (!formData.tribe || isCustomTribe) return null;
    return MTG_TRIBES.find(t => t.label === formData.tribe);
  }, [formData.tribe, isCustomTribe]);

  const selectedStrategyInfo = useMemo(() => {
    if (!formData.strategy || isCustomStrategy) return null;
    const realId = inferStrategyFromArchetype(formData.archetype, formData.strategy, formData.prompt);
    return MTG_STRATEGIES.find(s => s.id === realId || s.label === formData.strategy);
  }, [formData.archetype, formData.strategy, formData.prompt, isCustomStrategy]);

  const allowedColorsInfo = useMemo(() => {
    let allowed = [];
    let primary = [];

    if (currentArchetype) {
      allowed = [...(currentArchetype.recommendedColors || [])];
      primary = [...allowed];
    }

    // Unimos los colores de la tribu seleccionada para permitir combinaciones como Slivers 5C en Tempo
    if (selectedTribeInfo && selectedTribeInfo.colors) {
      allowed = [...new Set([...allowed, ...selectedTribeInfo.colors])];
    }

    // Unimos los colores de la estrategia seleccionada
    if (selectedStrategyInfo && selectedStrategyInfo.colors) {
      allowed = [...new Set([...allowed, ...selectedStrategyInfo.colors])];
    }

    // Fallback por si no queda ningún color habilitado
    if (allowed.length === 0) {
      allowed = ['W', 'U', 'B', 'R', 'G', 'C'];
    }

    return { allowed, primary: primary.length > 0 ? primary : allowed };
  }, [currentArchetype, selectedTribeInfo, selectedStrategyInfo]);

  const allEngines = useMemo(() => {
    return [...UNIVERSAL_ENGINES, ...MTG_TRIBES.flatMap(t => t.flavors || [])];
  }, []);

  // --- INICIO DE AGREGACIONES ORACLE TUNER ---
  const getEngineIcon = (id) => {
    if (!id) return '🔮';
    const cleanId = id.toLowerCase();
    if (cleanId.includes('aristocrats')) return '💀';
    if (cleanId.includes('reanimator')) return '⚰️';
    if (cleanId.includes('spellslinger')) return '⚡';
    if (cleanId.includes('blink')) return '🌀';
    if (cleanId.includes('landfall')) return '🌳';
    if (cleanId.includes('graveyard')) return '🪦';
    if (cleanId.includes('lifegain')) return '❤️';
    if (cleanId.includes('prison')) return '⛓️';
    if (cleanId.includes('voltron')) return '🛡️';
    if (cleanId.includes('storm')) return '🌪️';
    if (cleanId.includes('affinity')) return '⚙️';
    if (cleanId.includes('lords')) return '👑';
    if (cleanId.includes('amass')) return '🧟';
    if (cleanId.includes('aggro')) return '⚔️';
    if (cleanId.includes('tempo')) return '⏱️';
    return '🔮';
  };

  const getCardImageUrl = (card) => {
    if (!card) return '';
    const face = card.card_faces ? card.card_faces[flipStates[card.id] || 0] : null;
    const uri = (face && face.image_uris?.normal) ? face.image_uris.normal : card.image_uris?.normal;
    if (uri) return uri;
    return `https://api.scryfall.com/cards/named?format=image&exact=${encodeURIComponent(card.name)}`;
  };

  const isEngineColorCompatible = useCallback((engine) => {
    if (!engine.requiredColors || engine.requiredColors.length === 0) return true;
    const currentColors = formData.colores || [];
    if (currentColors.length === 0) return true;
    return engine.requiredColors.some(c => currentColors.includes(c));
  }, [formData.colores]);

  const availableEngines = useMemo(() => {
    const activeTribe = formData.tribe;
    if (activeTribe) {
      const tData = MTG_TRIBES.find(t => t.id === activeTribe || t.label === activeTribe);
      if (tData && tData.flavors) {
        return tData.flavors;
      }
    }
    if (formData.archetype) {
      const archLower = formData.archetype.toLowerCase();
      return [...UNIVERSAL_ENGINES].sort((a, b) => {
        const stratA = MTG_STRATEGIES.find(s => s.id === a.id.replace('_generic', ''));
        const stratB = MTG_STRATEGIES.find(s => s.id === b.id.replace('_generic', ''));
        
        const isCompatibleA = stratA?.archetypes?.some(arch => archLower.includes(arch)) ? 1 : 0;
        const isCompatibleB = stratB?.archetypes?.some(arch => archLower.includes(arch)) ? 1 : 0;
        
        return isCompatibleB - isCompatibleA;
      });
    }
    return UNIVERSAL_ENGINES;
  }, [formData.tribe, formData.archetype]);

  const maxSpells = useMemo(() => {
    const isYorion = formData?.companero?.toLowerCase().includes("yorion");
    const baseCards = isYorion ? 80 : 60;
    const landCount = currentArchetype?.landCount || 22;
    const resolvedLandCount = isYorion ? Math.round(landCount * 1.33) : landCount;
    return baseCards - resolvedLandCount;
  }, [formData.companero, currentArchetype]);

  const totalSelectedSpells = useMemo(() => {
    return Object.values(seedCards).reduce((acc, q) => acc + q, 0);
  }, [seedCards]);

  const composedBlueprint = useMemo(() => {
    try {
      const arch = formData.archetype || 'midrange';
      const strat = formData.selectedEngineId || formData.strategy || '';
      return composeTwoLayerBlueprint(arch, strat, formData);
    } catch (e) {
      return null;
    }
  }, [formData.archetype, formData.selectedEngineId, formData.strategy, formData.colores]);

  const matchesContainerRole = useCallback((card, container) => {
    if (!card || !container) return false;
    const cmc = card.cmc ?? card.mana_value ?? 0;
    const role = detectFunctionalRole(card).toLowerCase();
    const oracle = (card.oracle_text || card.text || '').toLowerCase();
    const typeLine = (card.type_line || '').toLowerCase();
    const roleKey = (container.roleKey || '').toLowerCase();

    if (container.cmc) {
      if (typeof container.cmc === 'number' && container.quality === 'finisher' && cmc < 5) return false;
      if (roleKey.includes('early') && cmc > 3) return false;
    }

    if (roleKey.includes('dork') || roleKey.includes('ramp')) {
      return role.includes('rampa') || oracle.includes('add {') || oracle.includes('search your library for a land');
    }
    if (roleKey.includes('removal') || roleKey.includes('clear')) {
      return role.includes('remoción') || oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('deals');
    }
    if (roleKey.includes('draw')) {
      return role.includes('robo') || oracle.includes('draw');
    }
    if (roleKey.includes('finisher') || roleKey.includes('threat') || roleKey.includes('apex')) {
      return cmc >= 4 || typeLine.includes('planeswalker') || (typeLine.includes('creature') && parseInt(card.power || '0') >= 3);
    }
    if (roleKey.includes('fodder') || roleKey.includes('sac')) {
      return oracle.includes('sacrifice') || oracle.includes('dies') || cmc <= 2;
    }
    if (roleKey.includes('reanimat') || roleKey.includes('target')) {
      return cmc >= 6 || oracle.includes('reanimate') || oracle.includes('graveyard');
    }

    return true;
  }, []);

  const containerProgress = useMemo(() => {
    if (!composedBlueprint || !composedBlueprint.containers) return [];
    return composedBlueprint.containers.map(ct => {
      let currentCopies = 0;
      packCards.forEach(card => {
        const count = seedCards[card.name] || 0;
        if (count > 0 && matchesContainerRole(card, ct)) {
          currentCopies += count;
        }
      });
      return {
        ...ct,
        currentCopies,
        isFilled: currentCopies >= (ct.targetCopies || 4)
      };
    });
  }, [composedBlueprint, packCards, seedCards, matchesContainerRole]);

  const handleAutoFillBlueprint = useCallback(() => {
    if (!composedBlueprint || !composedBlueprint.containers || packCards.length === 0) return;
    vibrateTouch();

    const newSeed = {};
    let currentTotal = 0;
    const targetTotal = maxSpells || 35;

    composedBlueprint.containers.forEach(ct => {
      const needed = ct.targetCopies || 4;
      let filled = 0;

      const matching = packCards.filter(card => matchesContainerRole(card, ct));
      for (const card of matching) {
        if (filled >= needed || currentTotal >= targetTotal) break;
        const currentInSeed = newSeed[card.name] || 0;
        if (currentInSeed < 4) {
          const add = Math.min(4 - currentInSeed, Math.min(needed - filled, targetTotal - currentTotal));
          if (add > 0) {
            newSeed[card.name] = currentInSeed + add;
            filled += add;
            currentTotal += add;
          }
        }
      }
    });

    if (currentTotal < targetTotal) {
      for (const card of packCards) {
        if (currentTotal >= targetTotal) break;
        const currentInSeed = newSeed[card.name] || 0;
        if (currentInSeed < 4) {
          const add = Math.min(4 - currentInSeed, targetTotal - currentTotal);
          newSeed[card.name] = currentInSeed + add;
          currentTotal += add;
        }
      }
    }

    setSeedCards(newSeed);
  }, [composedBlueprint, packCards, maxSpells, matchesContainerRole]);

  const filteredPackCards = useMemo(() => {
    let result = packCards.filter(card => {
      // 1. Tipo
      if (synergyTypeFilter !== 'all') {
        const type = (card.type_line || '').toLowerCase();
        if (synergyTypeFilter === 'creature' && !type.includes('creature')) return false;
        if (synergyTypeFilter === 'spell' && !type.includes('instant') && !type.includes('sorcery')) return false;
        if (synergyTypeFilter === 'other' && (type.includes('creature') || type.includes('instant') || type.includes('sorcery'))) return false;
      }
      // 2. Rol
      if (synergyRoleFilter !== 'all') {
        const role = detectFunctionalRole(card).toLowerCase();
        if (synergyRoleFilter === 'removal' && !role.includes('remoción')) return false;
        if (synergyRoleFilter === 'ramp' && !role.includes('rampa')) return false;
        if (synergyRoleFilter === 'draw' && !role.includes('robo')) return false;
        if (synergyRoleFilter === 'motor' && !role.includes('motor')) return false;
        if (synergyRoleFilter === 'payoff' && !role.includes('payoff')) return false;
      }
      // 3. CMC
      const cmc = card.cmc ?? card.mana_value ?? 0;
      if (synergyCmcFilter === '1' && cmc !== 1) return false;
      if (synergyCmcFilter === '2' && cmc !== 2) return false;
      if (synergyCmcFilter === '3' && cmc !== 3) return false;
      if (synergyCmcFilter === '4' && cmc !== 4) return false;
      if (synergyCmcFilter === '5+' && cmc < 5) return false;

      // 4. Rareza
      if (synergyRarityFilter !== 'all') {
        const rarity = (card.rarity || 'common').toLowerCase();
        if (synergyRarityFilter === 'common' && rarity !== 'common') return false;
        if (synergyRarityFilter === 'uncommon' && rarity !== 'uncommon') return false;
        if (synergyRarityFilter === 'rare' && (rarity !== 'rare' && rarity !== 'mythic')) return false;
      }

      // 5. Blueprint Container
      if (synergyBlueprintContainer !== 'all' && composedBlueprint && composedBlueprint.containers) {
        const targetContainer = composedBlueprint.containers.find(c => c.roleKey === synergyBlueprintContainer);
        if (targetContainer && !matchesContainerRole(card, targetContainer)) return false;
      }

      // 6. Universes Beyond (Crossover / Custom)
      if (!formData.allowCustomCards && isUniversesBeyondOrCustom(card)) {
        return false;
      }

      return true;
    });

    return result.sort((a, b) => {
      const cmcA = a.cmc ?? a.mana_value ?? 0;
      const cmcB = b.cmc ?? b.mana_value ?? 0;
      if (synergySortBy === 'cmc_asc') return cmcA - cmcB;
      if (synergySortBy === 'cmc_desc') return cmcB - cmcA;
      if (synergySortBy === 'meta') return (b.metaPercent || 0) - (a.metaPercent || 0);
      return (b.score || 0) - (a.score || 0);
    });
  }, [packCards, synergyTypeFilter, synergyRoleFilter, synergyCmcFilter, synergyRarityFilter, synergyBlueprintContainer, synergySortBy, composedBlueprint, matchesContainerRole, formData.allowCustomCards]);

  // Cargar el pack de sinergias (estático o RAG local)
  useEffect(() => {
    const engineId = formData.selectedEngineId;
    if (!engineId && !formData.archetype) {
      setPackCards([]);
      return;
    }

    const loadSynergyPack = async () => {
      setIsPackLoading(true);
      try {
        const engine = allEngines.find(e => e.id === engineId);
        const corePkgId = engine?.corePackageId;
        let loadedCards = [];

        const hasTribe = formData.tribe && formData.tribe !== 'none' && formData.tribe !== 'ninguna';
        if (corePkgId && !hasTribe) {
          const pkg = injectCorePackage(corePkgId, formData.colores || [], selectedFormat, allCards);
          if (pkg && pkg.length > 0) {
            loadedCards = pkg;
            console.log(`[Tuner Pack] Loaded static pack "${corePkgId}" with ${loadedCards.length} cards.`);
          }
        }

        if (loadedCards.length === 0) {
          console.log(`[Tuner Pack] JIT RAG scan for engine "${engineId || formData.archetype}"...`);
          const ragResult = await buildCardPool({
            ...formData,
            strategy: engineId || '',
            format: selectedFormat || 'MODERN',
            colores: formData.colores,
            mustInclude: ''
          });

          if (ragResult && ragResult.pool) {
            const userColors = formData.colores || [];
            const colorFilteredPool = ragResult.pool.filter(card => {
              if (userColors.length === 0) return true;
              const cardColors = card.colors || card.color_identity || [];
              return cardColors.every(c => userColors.includes(c));
            });
            const sorted = [...colorFilteredPool].sort((a, b) => (b.score || 0) - (a.score || 0));
            loadedCards = sorted.slice(0, 32).map(card => {
              const dbCard = allCards.find(c => c.name.toLowerCase() === card.name.toLowerCase());
              return dbCard || card;
            });
            console.log(`[Tuner Pack] JIT RAG returned ${loadedCards.length} cards.`);
          }
        }

        setPackCards(loadedCards);
      } catch (err) {
        console.warn("Failed to load synergy pack:", err);
      } finally {
        setIsPackLoading(false);
      }
    };

    loadSynergyPack();
  }, [formData.selectedEngineId, formData.archetype, formData.colores, selectedFormat, allCards, allEngines]);

  // Sincronizar seedCards a mustInclude
  useEffect(() => {
    const list = [];
    Object.entries(seedCards).forEach(([cardName, qty]) => {
      const priority = seedPriorities[cardName] || 'normal';
      const weightLabel = priority === 'high' ? '[OBLIGATORIA]' : '[PREFERIDA]';
      list.push(`${qty}x ${cardName} ${weightLabel}`);
    });
    const mustIncludeStr = list.join(', ');
    if (formData.mustInclude !== mustIncludeStr) {
      setFormData(prev => ({ ...prev, mustInclude: mustIncludeStr }));
    }
  }, [seedCards, seedPriorities]);

  // Sincronizar vetoedKeywords y vetoedCards a formData
  useEffect(() => {
    const customBanlistStr = vetoedCards.join(', ');
    if (formData.customBanlist !== customBanlistStr) {
      setFormData(prev => ({
        ...prev,
        customBanlist: customBanlistStr,
        vetoedCards: vetoedCards,
        vetoedKeywords: vetoedKeywords
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vetoedCards: vetoedCards,
        vetoedKeywords: vetoedKeywords
      }));
    }
  }, [vetoedCards, vetoedKeywords]);

  // Autocompletes de Semillas
  useEffect(() => {
    if (!seedSearchQuery.trim()) {
      setSeedSearchResults([]);
      return;
    }
    const q = seedSearchQuery.toLowerCase();
    const formatKey = selectedFormat.toLowerCase();
    const deckColors = new Set(formData.colores || []);

    const filtered = allCards.filter(card => {
      if (!card.name) return false;
      const nameLower = card.name.toLowerCase();
      if (!nameLower.includes(q)) return false;

      const typeLower = (card.type_line || '').toLowerCase();
      if (typeLower.includes('land')) return false;

      if (card.legalities && card.legalities[formatKey] !== 'legal') return false;

      const cardColors = card.colors || [];
      const isColorOk = cardColors.every(c => deckColors.has(c));
      if (!isColorOk) return false;

      return true;
    });

    setSeedSearchResults(filtered.slice(0, 10));
  }, [seedSearchQuery, allCards, selectedFormat, formData.colores]);

  // Autocompletes de Vetos
  useEffect(() => {
    if (!vetoSearchQuery.trim()) {
      setVetoSearchResults([]);
      return;
    }
    const q = vetoSearchQuery.toLowerCase();
    const filtered = allCards.filter(card => {
      if (!card.name) return false;
      return card.name.toLowerCase().includes(q);
    });
    setVetoSearchResults(filtered.slice(0, 10));
  }, [vetoSearchQuery, allCards]);

  // LocalStorage tuner persistence
  useEffect(() => {
    if (formData.archetype) {
      const storageKey = `mtg_tuner_state_${formData.archetype}_${formData.tribe || 'none'}`;
      const stateToSave = {
        selectedEngineId: formData.selectedEngineId,
        seedCards,
        vetoedKeywords,
        vetoedCards
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }
  }, [formData.archetype, formData.tribe, formData.selectedEngineId, seedCards, vetoedKeywords, vetoedCards]);

  useEffect(() => {
    if (formData.archetype) {
      const storageKey = `mtg_tuner_state_${formData.archetype}_${formData.tribe || 'none'}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(prev => ({
            ...prev,
            selectedEngineId: parsed.selectedEngineId || ''
          }));
          setSeedCards(parsed.seedCards || {});
          setVetoedKeywords(parsed.vetoedKeywords || []);
          setVetoedCards(parsed.vetoedCards || []);
        } catch (e) {
          console.warn("Failed to load saved tuner state:", e);
        }
      } else {
        setFormData(prev => ({ ...prev, selectedEngineId: '' }));
        setSeedCards({});
        setVetoedKeywords([]);
        setVetoedCards([]);
      }
    }
  }, [formData.archetype, formData.tribe]);
  // --- FIN DE AGREGACIONES ORACLE TUNER ---

  // Filtrado de arquetipos por formato + grupo de color + búsqueda
  const filteredArchetypes = useMemo(() => {
    return archetypesList.filter(arch => {
      // Filtro por formato
      if (arch.formats && !arch.formats.includes(selectedFormat)) return false;
      // Filtro por grupo de color
      if (arch.colorGroup !== activeColorTab) return false;
      // Filtro por búsqueda de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchLabel = arch.label.toLowerCase().includes(q);
        const matchDesc = arch.description?.toLowerCase().includes(q);
        if (!matchLabel && !matchDesc) return false;
      }
      return true;
    });
  }, [archetypesList, selectedFormat, activeColorTab, searchQuery]);

  // Conteo de arquetipos por grupo de color (para badges)
  const colorGroupCounts = useMemo(() => {
    const counts = { generic: 0, mono: 0, bicolor: 0, tricolor: 0, multicolor: 0 };
    archetypesList.forEach(arch => {
      if (arch.formats && !arch.formats.includes(selectedFormat)) return;
      const group = arch.colorGroup || 'generic';
      if (counts[group] !== undefined) counts[group]++;
    });
    return counts;
  }, [archetypesList, selectedFormat]);

  // Íconos e indicadores de velocidad
  const getSpeedStyles = (speed) => {
    const speedLower = (speed || '').toLowerCase();
    if (speedLower.includes('rápida')) return { color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]', icon: <Flame size={12} className="text-red-400 animate-pulse" /> };
    if (speedLower.includes('media-rápida')) return { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]', icon: <Zap size={12} className="text-orange-400 animate-pulse" /> };
    if (speedLower.includes('media')) return { color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]', icon: <Swords size={12} className="text-amber-400" /> };
    if (speedLower.includes('lenta')) return { color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]', icon: <Shield size={12} className="text-emerald-400" /> };
    return { color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]', icon: <Shield size={12} className="text-sky-400" /> };
  };

  const handleSendaChange = (senda) => {
    if (activeSenda === senda) return;

    setFormData(prev => ({
      ...prev,
      archetype: '',
      colores: [],
      tribe: '',
      strategy: '',
      selectedEngineId: '',
      curveProfile: 'balanced'
    }));

    setSearchQuery('');
    setActiveSenda(senda);

    if (senda === 'sandbox') {
      setActiveColorTab('generic');
    } else {
      setActiveColorTab('bicolor');
    }
  };

  const handleLoadHistory = (item) => {
    setFormData(prev => ({
      ...prev,
      ...item
    }));
    const isStatic = LEGACY_ARCHETYPES.some(la => la.value === item.archetype);
    if (isStatic) {
      setActiveSenda('sandbox');
      setActiveColorTab('generic');
    } else {
      setActiveSenda('meta');
      setActiveColorTab(item.colorGroup || 'bicolor');
    }
    setCurrentStep(1);
  };

  const handleArchetypeChange = (val) => {
    const arch = archetypesList.find(a => a.value === val);
    const isDynamic = arch?.isDynamic;

    setFormData(prev => ({
      ...prev,
      archetype: val,
      tribe: '',
      strategy: '',
      colores: arch?.recommendedColors || [],
      curveProfile: ARCHETYPE_DEFAULT_CURVE[val] || 'balanced'
    }));
    setIsCustomTribe(false);
    setIsCustomStrategy(false);
    setHasUserClearedTribe(false);
    setHasUserClearedStrategy(false);
    setErrors(prev => ({ ...prev, colores: null }));
    
    // Auto-avance místico inteligente hacia el Paso 2
    setTimeout(() => {
      setCurrentStep(2);
    }, 350);
  };

  const toggleColor = (colorId) => {
    setFormData(prev => {
      const currentColors = prev?.colores || [];
      const isSelected = currentColors.includes(colorId);
      const newColors = isSelected
        ? currentColors.filter(c => c !== colorId)
        : [...currentColors, colorId];
      return { ...prev, colores: newColors };
    });
    setErrors(prev => ({ ...prev, colores: null }));
  };

  const applyGuildPreset = (colors) => {
    setFormData(prev => ({ ...prev, colores: colors }));
    setErrors(prev => ({ ...prev, colores: null }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.archetype) {
      newErrors.archetype = 'Debes seleccionar un arquetipo';
    }
    if ((formData?.colores || []).length === 0 && formData.archetype !== 'legacy-eldrazi') {
      newErrors.colores = 'Selecciona al menos un color para tu mazo';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      try {
        const historyKey = 'mtg_forge_history';
        const rawHistory = localStorage.getItem(historyKey);
        const history = rawHistory ? JSON.parse(rawHistory) : [];
        
        const entry = {
          timestamp: Date.now(),
          archetype: formData.archetype,
          colores: formData.colores,
          tribe: formData.tribe,
          strategy: formData.strategy,
          selectedEngineId: formData.selectedEngineId,
          customPrompt: formData.customPrompt,
          prompt: formData.prompt,
          rarityMode: formData.rarityMode,
          generationPriority: formData.generationPriority,
          deckSize: formData.deckSize,
          sideboardSize: formData.sideboardSize,
          singleton: formData.singleton,
          maxCopies: formData.maxCopies
        };
        
        const filtered = history.filter(h => h.archetype !== entry.archetype || h.tribe !== entry.tribe || JSON.stringify(h.colores) !== JSON.stringify(entry.colores));
        filtered.unshift(entry);
        localStorage.setItem(historyKey, JSON.stringify(filtered.slice(0, 5)));
        setForgeHistory(filtered.slice(0, 5));
      } catch (err) {
        console.warn("Failed to save to forge history:", err);
      }
      onSubmit(formData);
    }
  };

  // Si cambia el arquetipo, reseteamos tribu y estrategia y los flags de limpieza manual
  useEffect(() => {
    setFormData(prev => ({ ...prev, tribe: '', strategy: '' }));
    setHasUserClearedTribe(false);
    setHasUserClearedStrategy(false);
    setColorSuggestion(null);
  }, [formData.archetype]);

  // Lógica Avanzada de Compatibilidad de Sinergias (Razas + Mecánicas)
  const isTribeCompatible = useCallback((tribe) => {
    if (!tribe) return false;
    if (!formData.strategy || isCustomStrategy) return true;
    const stratData = MTG_STRATEGIES.find(s => s.label === formData.strategy);
    if (!stratData) return true;
    
    // Si la tribu tiene estrategias recomendadas explícitas, comprobamos compatibilidad
    if (tribe.strategies && tribe.strategies.length > 0) {
      return tribe.strategies.includes(stratData.id);
    }
    // Si no, verificamos que compartan algún color
    return Array.isArray(tribe.colors) && Array.isArray(stratData.colors) && tribe.colors.some(c => stratData.colors.includes(c));
  }, [formData.strategy, isCustomStrategy]);

  const isStrategyCompatible = useCallback((strat) => {
    if (!strat) return false;
    if (!formData.tribe || isCustomTribe) return true;
    const tribeData = MTG_TRIBES.find(t => t.label === formData.tribe);
    if (!tribeData) return true;
    
    // Si la tribu tiene estrategias recomendadas explícitas, comprobamos compatibilidad
    if (tribeData.strategies && tribeData.strategies.length > 0) {
      return tribeData.strategies.includes(strat.id);
    }
    // Si no, verificamos que compartan algún color
    return Array.isArray(strat.colors) && Array.isArray(tribeData.colors) && strat.colors.some(c => tribeData.colors.includes(c));
  }, [formData.tribe, isCustomTribe]);

  // Filtrado de Tribus viables para el Arquetipo y Formato
  const availableTribes = useMemo(() => {
    const list = MTG_TRIBES.filter(t => {
      if (!t) return false;
      // Si la tribu especifica formatos y no incluye el seleccionado, se descarta
      if (t.formats && !t.formats.includes(selectedFormat)) return false;
      return true;
    });

    if (!formData.archetype) return [];
    if (formData.isFreeMode) return list;
    
    return list.filter(t => t.archetypes && t.archetypes.includes(formData.archetype));
  }, [formData.archetype, formData.isFreeMode, selectedFormat]);

  // Agrupar por categoría
  const groupedTribes = useMemo(() => {
    const categoryOrder = ['clasica', 'vocacion', 'monstruo', 'exotica', 'alianza'];
    const groups = {};
    for (const cat of categoryOrder) {
      const tribesInCat = availableTribes.filter(t => t && t.category === cat);
      if (tribesInCat.length > 0) {
        groups[cat] = tribesInCat;
      }
    }
    return groups;
  }, [availableTribes]);

  // Estrategias viables para el Arquetipo y Formato
  const availableStrategies = useMemo(() => {
    const list = MTG_STRATEGIES.filter(s => {
      if (!s) return false;
      // Si la estrategia especifica formatos y no incluye el seleccionado, se descarta
      if (s.formats && !s.formats.includes(selectedFormat)) return false;
      return true;
    });

    if (!formData.archetype) return [];
    if (formData.isFreeMode) return list;
    
    return list.filter(s => s.archetypes && s.archetypes.includes(formData.archetype));
  }, [formData.archetype, formData.isFreeMode, selectedFormat]);

  // Autoselección reactiva inteligente cuando queda un único camino habilitado
  useEffect(() => {
    if (formData.archetype && !formData.isExpertMode) {
      // 1. Si no hay tribu seleccionada, pero solo hay una tribu compatible habilitada y no ha sido limpiada manualmente
      const activeCompatibleTribes = availableTribes.filter(isTribeCompatible);
      if (!formData.tribe && !isCustomTribe && !hasUserClearedTribe && activeCompatibleTribes.length === 1) {
        setFormData(prev => ({ ...prev, tribe: activeCompatibleTribes[0].label }));
      }
      
      // 2. Si no hay estrategia seleccionada, pero solo hay una estrategia compatible habilitada y no ha sido limpiada manualmente
      const activeCompatibleStrats = availableStrategies.filter(isStrategyCompatible);
      if (!formData.strategy && !isCustomStrategy && !hasUserClearedStrategy && activeCompatibleStrats.length === 1) {
        setFormData(prev => ({ ...prev, strategy: activeCompatibleStrats[0].label }));
      }
    }
  }, [
    formData.archetype, 
    formData.isExpertMode,
    formData.tribe, 
    formData.strategy, 
    isCustomTribe, 
    isCustomStrategy, 
    hasUserClearedTribe,
    hasUserClearedStrategy,
    availableTribes, 
    availableStrategies, 
    isTribeCompatible, 
    isStrategyCompatible
  ]);



  useEffect(() => {
    const { allowed = [], primary = [] } = allowedColorsInfo || {};
    
    // Si la selección actual (Step 3) no coincide con la tribu/estrategia (Step 2),
    // mostramos una sugerencia en lugar de forzar el cambio.
    const currentColors = formData.colores || [];
    
    if (allowed.includes('W') && allowed.includes('U') && allowed.includes('B') && allowed.includes('R') && allowed.includes('G') && allowed.includes('C')) {
      setColorSuggestion(null);
      return;
    }

    const hasNoPrimary = primary.length > 0 && !primary.includes('C') && !primary.some(pc => currentColors.includes(pc));
    
    if (hasNoPrimary && currentColors.length > 0) {
      const fallback = primary.filter(c => c !== 'C');
      if (fallback.length > 0) {
        setColorSuggestion({
          missingColors: fallback,
          tribe: formData.tribe,
          strategy: formData.strategy
        });
        return;
      }
    }
    
    setColorSuggestion(null);
  }, [allowedColorsInfo, formData.colores, formData.tribe, formData.strategy]);

  // Sincronizar tab activo cuando cambian las tribus disponibles
  useEffect(() => {
    if (formData.archetype) {
      const availableCategories = Object.keys(groupedTribes);
      if (availableCategories.length > 0 && !availableCategories.includes(activeTribeTab)) {
        setActiveTribeTab(availableCategories[0]);
      }
    }
  }, [groupedTribes, formData.archetype, activeTribeTab]);

  const resetColors = () => {
    if (currentArchetype) {
      setFormData(prev => ({ ...prev, colores: currentArchetype.recommendedColors }));
    }
  };

  const isFormValid = formData.archetype && ((formData?.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi');

  // Comprobar preset seleccionado
  const activePreset = useMemo(() => {
    return PACTOS_DE_GREMIO.find(p => arraysEqual(p.colors, formData?.colores || []))?.id || null;
  }, [formData?.colores]);

  const steps = [
    { id: 1, name: 'Clase', desc: 'Arquetipo' },
    { id: 2, name: 'Núcleo', desc: 'Tribu/Táctica' },
    { id: 3, name: 'Maná', desc: 'Colores' },
    { id: 4, name: 'Sello', desc: 'Conjuración' }
  ];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 4-Step Magic Wizard Progress Bar */}
      {isMobile ? (
        <div className="sticky top-0 z-30 w-full bg-black/90 backdrop-blur-md border-b border-magic-gold/20 py-3 px-4 flex flex-col gap-2 relative overflow-hidden">
          <div className="flex justify-between items-center text-xs font-cinzel text-magic-gold font-bold">
            <span>PASO {currentStep}/4</span>
            <span className="uppercase tracking-wider">
              {steps.find(s => s.id === currentStep)?.name}
            </span>
          </div>
          <div className="w-full bg-white/10 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-magic-gold to-[#ffca58] h-full transition-all duration-300"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div className="w-full py-6 px-6 frosted-panel shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
          <div className="max-w-3xl mx-auto relative z-10">
            <div className="flex items-center justify-between relative">
              {/* Background progress line */}
              <div className="absolute left-0 right-0 top-[18px] h-[2px] bg-white/10 z-0" />
              {/* Active glowing progress line */}
              <div 
                className="absolute left-0 top-[18px] h-[2px] bg-gradient-to-r from-magic-gold to-[#ffca58] shadow-[0_0_8px_#ffca58] z-0 transition-all duration-500 ease-out" 
                style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
              />

              {steps.map((step) => {
                const isCompleted = currentStep > step.id;
                const isActive = currentStep === step.id;
                const stepStatus = getStepStatus(step.id);
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative z-10">
                    <button
                      type="button"
                      onClick={() => {
                        if (step.id < currentStep || (step.id === 2 && formData.archetype) || (step.id === 3 && formData.archetype && ((formData?.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi')) || (step.id === 4 && formData.archetype && ((formData?.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi'))) {
                          setCurrentStep(step.id);
                        }
                      }}
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 font-cinzel text-xs font-bold relative",
                        isCompleted 
                          ? "bg-[#ffca58] border-[#ffca58] text-black shadow-[0_0_10px_rgba(255,202,88,0.4)]"
                          : isActive
                            ? "bg-black border-[#ffca58] text-[#ffca58] shadow-[0_0_15px_rgba(255,202,88,0.3)] scale-110"
                            : "bg-[#16120e] border-white/25 text-white/40 hover:border-white/50 hover:text-white"
                      )}
                    >
                      {isCompleted ? <Check size={14} className="stroke-[3]" /> : step.id}
                      
                      {/* Indicador de Estado del Paso */}
                      {formData.archetype && (
                        <span className={cn(
                          "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-black shadow-md",
                          stepStatus === 'complete' ? "bg-emerald-500" :
                          stepStatus === 'partial' ? "bg-amber-500 animate-pulse" :
                          "bg-stone-700 opacity-55"
                        )} />
                      )}
                    </button>
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest mt-2 font-bold transition-all duration-300",
                      isActive ? "text-magic-gold font-black drop-shadow-[0_0_5px_rgba(255,202,88,0.3)]" : isCompleted ? "text-[#f4ece0]/80" : "text-[#f4ece0]/40"
                    )}>
                      {step.name}
                    </span>
                    <span className="text-[8px] text-white/30 hidden sm:block mt-0.5 font-medium">
                      {step.desc}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border-l-4 border-red-500 rounded-r-lg text-red-200 text-sm shadow-xl flex items-start gap-3 backdrop-blur-md relative z-10">
            <AlertCircle className="text-red-400 mt-0.5" size={16} />
            <div className="flex-1">
              <p className="font-bold text-red-400 mb-1">El Oráculo ha fallado</p>
              <p className="text-red-200/80">{error}</p>
            </div>
            {lastGenerationLogs && onOpenOracleLog && (
              <button
                type="button"
                onClick={onOpenOracleLog}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 border border-red-500/30 rounded text-xs transition-colors whitespace-nowrap flex items-center gap-1.5 font-bold"
              >
                <Scroll size={12} /> Ver Bitácora
              </button>
            )}
          </div>
        )}
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full p-8 frosted-panel shadow-2xl relative space-y-6"
            >
              <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
              
              {/* Header and Format Selection */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 w-full border-b border-white/10 pb-6 relative z-10">
                <div className="flex items-center gap-4">
                  <motion.img 
                    src="/ASSETS/Engranaje.webp" 
                    alt="Config" 
                    className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,202,88,0.4)]"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                  />
                  <div>
                    <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                      Clase de Combate
                    </h3>
                    <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                      Paso 1: Selecciona el formato de destino y la senda del arquetipo
                    </p>
                  </div>
                </div>
                
                {/* Format selection tabs */}
                <div className="flex bg-black/60 p-1 rounded-xl border border-white/10 shadow-inner w-full sm:w-auto">
                  {['MODERN', 'PIONEER', 'STANDARD', 'COMMANDER', 'PAUPER', 'LEGACY'].map((fmt) => {
                    const isSelected = selectedFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          onFormatChange?.(fmt);
                          setSearchQuery('');
                          if (fmt === 'COMMANDER') {
                            setFormData(prev => ({
                              ...prev,
                              deckSize: 100,
                              sideboardSize: 0,
                              singleton: true,
                              maxCopies: 1
                            }));
                          } else if (fmt === 'PAUPER') {
                            setFormData(prev => ({
                              ...prev,
                              rarityMode: 'pauper',
                              deckSize: 60,
                              singleton: false,
                              maxCopies: 4
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              deckSize: prev.deckSize === 100 ? 60 : prev.deckSize,
                              singleton: prev.deckSize === 100 ? false : prev.singleton,
                              maxCopies: prev.deckSize === 100 ? 4 : prev.maxCopies
                            }));
                          }
                        }}
                        className={cn(
                          "flex-1 sm:flex-none px-4 py-2 rounded-lg font-cinzel text-[10px] sm:text-xs font-black tracking-widest transition-all duration-300 uppercase",
                          isSelected
                            ? "bg-[#ffca58] text-black shadow-[0_0_10px_rgba(255,202,88,0.25)] font-bold scale-[1.02]"
                            : "text-[#f4ece0]/60 hover:text-white hover:bg-white/5"
                        )}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Configuración de Estructura de Mazo */}
              <div className="bg-black/40 border border-white/10 p-5 rounded-2xl relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Tamaño Principal</label>
                  <select
                    value={formData.deckSize || 60}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setFormData(prev => ({
                        ...prev,
                        deckSize: val,
                        singleton: val === 100 ? true : prev.singleton,
                        maxCopies: val === 100 ? 1 : prev.maxCopies,
                        sideboardSize: val === 100 ? 0 : prev.sideboardSize
                      }));
                    }}
                    className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-xs focus:border-[#ffca58] focus:outline-none"
                  >
                    <option value={40}>40 cartas (Limitado)</option>
                    <option value={60}>60 cartas (Estándar)</option>
                    <option value={80}>80 cartas (Yorion)</option>
                    <option value={100}>100 cartas (Commander)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-white/40 mb-1 block">Tamaño Banquillo</label>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={formData.sideboardSize !== undefined ? formData.sideboardSize : 15}
                    disabled={formData.deckSize === 100}
                    onChange={(e) => {
                      const val = Math.min(15, Math.max(0, parseInt(e.target.value) || 0));
                      setFormData(prev => ({ ...prev, sideboardSize: val }));
                    }}
                    className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-xs focus:border-[#ffca58] focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex items-center justify-between sm:justify-center sm:gap-4 pt-4 sm:pt-2">
                  <label className="text-[10px] uppercase font-bold text-white/40 cursor-pointer flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!formData.singleton}
                      disabled={formData.deckSize === 100}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          singleton: checked,
                          maxCopies: checked ? 1 : 4
                        }));
                      }}
                      className="rounded border-white/20 bg-black text-[#ffca58] focus:ring-0"
                    />
                    <span>Regla Singleton</span>
                  </label>
                </div>
              </div>

              {/* Forjas Recientes */}
              {forgeHistory && forgeHistory.length > 0 && (
                <div className="bg-black/40 border border-white/10 p-5 rounded-2xl relative z-10 space-y-3">
                  <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.15em] text-[#ffca58] flex items-center gap-2">
                    📜 Conjuraciones Recientes
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {forgeHistory.map((item, idx) => {
                      const archLabel = LEGACY_ARCHETYPES.find(a => a.value === item.archetype)?.label || item.archetype;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleLoadHistory(item)}
                          className="p-3 rounded-xl border border-white/10 bg-black/60 hover:bg-black/80 hover:border-magic-gold/50 cursor-pointer transition-all duration-300 flex flex-col justify-between min-h-[90px] relative group overflow-hidden"
                        >
                          <div className="space-y-1">
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-cinzel text-[11px] font-bold text-white group-hover:text-magic-gold transition-colors truncate w-full" title={archLabel}>
                                {archLabel}
                              </span>
                              <div className="flex -space-x-1 shrink-0">
                                {(item.colores || []).map(c => {
                                  const colObj = COLORS.find(co => co.id === c);
                                  return (
                                    <div key={c} className="w-3.5 h-3.5 rounded-full overflow-hidden border border-black/50" title={colObj?.name}>
                                      <img src={colObj?.icon} alt={c} className="w-full h-full object-cover" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1 text-[8.5px] font-sans text-white/50">
                              {item.tribe && <span className="bg-white/5 px-1 py-0.5 rounded border border-white/10">🧬 {item.tribe}</span>}
                              {item.strategy && <span className="bg-white/5 px-1 py-0.5 rounded border border-white/10">⚔️ {item.strategy}</span>}
                              {item.deckSize && <span className="bg-white/5 px-1 py-0.5 rounded border border-white/10">🎴 {item.deckSize}c</span>}
                            </div>
                          </div>
                          <div className="text-[8px] text-white/30 font-mono mt-2 flex justify-between items-center">
                            <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                            <span className="text-[#ffca58] opacity-0 group-hover:opacity-100 transition-opacity font-bold uppercase">Cargar ➔</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dual Senda Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                {/* Senda 1: Sandbox */}
                <div
                  onClick={() => handleSendaChange('sandbox')}
                  className={cn(
                    "border p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:border-magic-gold/80 hover:shadow-[0_0_20px_rgba(255,202,88,0.2),_inset_0_0_25px_rgba(0,0,0,0.85)] bg-black",
                    activeSenda === 'sandbox'
                      ? "border-magic-gold shadow-[0_0_20px_rgba(255,202,88,0.35),_inset_0_0_20px_rgba(0,0,0,0.9)] scale-[1.02] brightness-110 contrast-115"
                      : activeSenda === null
                        ? "border-[#ffca58]/20 shadow-[0_4px_10px_rgba(0,0,0,0.5),_inset_0_0_20px_rgba(0,0,0,0.8)]"
                        : "border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] opacity-35 scale-[0.98] brightness-[0.4]"
                  )}
                >
                  {/* Obsidian Texture Layer at high opacity */}
                  <div 
                    style={{
                      backgroundImage: "url('/ASSETS/Obsidiana.webp')",
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                    className="absolute inset-0 opacity-80 pointer-events-none"
                  />
                  {/* Gradient Scrim: Darker on the left (under text) and fading on the right */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/25 pointer-events-none" />
                  
                  <div className="space-y-2 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-2xl transition-all duration-300",
                        activeSenda === 'sandbox' ? "scale-110 drop-shadow-[0_0_8px_#ffca58]" : ""
                      )}>
                        🛠️
                      </span>
                      <div>
                        <h4 className={cn(
                          "font-cinzel text-xs font-black uppercase tracking-[0.15em] transition-colors duration-300",
                          activeSenda === 'sandbox' ? "text-[#ffca58] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" : "text-[#ffca58]"
                        )}>
                          Senda 1: Diseñador a Medida
                        </h4>
                        <span className={cn(
                          "text-[9px] font-cinzel font-black uppercase tracking-wider block mt-0.5 transition-colors duration-300",
                          activeSenda === 'sandbox' ? "text-[#ffca58]/80" : "text-[#ffca58]/60"
                        )}>
                          Sandbox de Arquetipos Universales
                        </span>
                      </div>
                    </div>
                    <p className="text-[11.5px] font-cinzel leading-relaxed pt-1 text-[#f4ece0] drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)]">
                      Ideal para experimentar y aprender. Eliges una plantilla base (Aggro, Midrange, Control...) y le inyectas mecánicas (ej. Aristócratas) o tribus (ej. Trasgos) en los siguientes pasos para forjar algo único.
                    </p>
                  </div>
                </div>

                {/* Senda 2: Meta */}
                <div
                  onClick={() => handleSendaChange('meta')}
                  className={cn(
                    "border p-6 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden flex flex-col justify-between hover:scale-[1.01] hover:border-magic-gold/80 hover:shadow-[0_0_20px_rgba(255,202,88,0.2),_inset_0_0_25px_rgba(0,0,0,0.85)] bg-black",
                    activeSenda === 'meta'
                      ? "border-magic-gold shadow-[0_0_20px_rgba(255,202,88,0.35),_inset_0_0_20px_rgba(0,0,0,0.9)] scale-[1.02] brightness-110 contrast-115"
                      : activeSenda === null
                        ? "border-[#ffca58]/20 shadow-[0_4px_10px_rgba(0,0,0,0.5),_inset_0_0_20px_rgba(0,0,0,0.8)]"
                        : "border-white/5 shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] opacity-35 scale-[0.98] brightness-[0.4]"
                  )}
                >
                  {/* Obsidian Texture Layer at high opacity */}
                  <div 
                    style={{
                      backgroundImage: "url('/ASSETS/Obsidiana.webp')",
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }}
                    className="absolute inset-0 opacity-80 pointer-events-none"
                  />
                  {/* Gradient Scrim: Darker on the left (under text) and fading on the right */}
                  <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/25 pointer-events-none" />
                  
                  <div className="space-y-2 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,1)]">
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-2xl transition-all duration-300",
                        activeSenda === 'meta' ? "scale-110 drop-shadow-[0_0_8px_#ffca58]" : ""
                      )}>
                        🏆
                      </span>
                      <div>
                        <h4 className={cn(
                          "font-cinzel text-xs font-black uppercase tracking-[0.15em] transition-colors duration-300",
                          activeSenda === 'meta' ? "text-[#ffca58] drop-shadow-[0_2px_4px_rgba(0,0,0,1)]" : "text-[#ffca58]"
                        )}>
                          Senda 2: Recetas del Meta
                        </h4>
                        <span className={cn(
                          "text-[9px] font-cinzel font-black uppercase tracking-wider block mt-0.5 transition-colors duration-300",
                          activeSenda === 'meta' ? "text-[#ffca58]/80" : "text-[#ffca58]/60"
                        )}>
                          Mazos Preconstruidos Reales
                        </span>
                      </div>
                    </div>
                    <p className="text-[11.5px] font-cinzel leading-relaxed pt-1 text-[#f4ece0] drop-shadow-[0_1.5px_2px_rgba(0,0,0,1)]">
                      Ideal para jugar rápido y competir. Carga un mazo real extraído de torneos de Magic (ej. Izzet Murktide o Azorius Blink). Las recetas ya están balanceadas, saltándote la selección de mecánicas.
                    </p>
                  </div>
                </div>
              </div>

              {activeSenda === null ? (
                /* Waiting simple state */
                <div className="p-12 text-center bg-black/45 border border-dashed border-white/10 rounded-2xl relative z-10">
                  <p className="text-white/60 text-xs font-cinzel tracking-wider">
                    Por favor, selecciona una Senda para mostrar los arquetipos disponibles.
                  </p>
                </div>
              ) : (
                <>
                  {/* Categorization & Search Panel */}
                  <div className="space-y-4 relative z-10 border-t border-white/5 pt-4">
                    {activeSenda === 'meta' ? (
                      <>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <label className="block text-[#ffca58] text-sm font-bold uppercase tracking-[0.2em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
                            <Crown size={14} className="text-magic-gold" /> Filtro por Colores
                          </label>
                          
                          {/* Search input */}
                          <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                            <input
                              type="text"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Buscar mazo por nombre..."
                              className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/35 text-xs font-semibold focus:border-[#ffca58] focus:shadow-[0_0_10px_rgba(255,202,88,0.2)] focus:outline-none transition-all"
                            />
                          </div>
                        </div>

                        {/* Color Groups Tab Bar (Excluding generic) */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {COLOR_GROUP_TABS.filter(t => t.id !== 'generic').map((tab) => {
                            const count = colorGroupCounts[tab.id] || 0;
                            const isSelected = activeColorTab === tab.id;
                            
                            return (
                              <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveColorTab(tab.id)}
                                className={cn(
                                  "px-3 py-2.5 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden",
                                  isSelected
                                    ? "border-magic-gold bg-gradient-to-b from-magic-gold/15 to-black/90 shadow-[0_0_10px_rgba(255,202,88,0.15)]"
                                    : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-black/60"
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">{tab.icon}</span>
                                  <span className={cn(
                                    "font-cinzel text-[10.5px] font-black tracking-wider transition-colors",
                                    isSelected ? "text-magic-gold" : "text-white/70 group-hover:text-white"
                                  )}>
                                    {tab.label}
                                  </span>
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                                    isSelected ? "bg-magic-gold/20 text-[#ffca58]" : "bg-white/10 text-white/50"
                                  )}>
                                    {count}
                                  </span>
                                </div>
                                <span className="text-[8px] text-white/40 group-hover:text-white/60 transition-colors mt-0.5 block font-sans truncate w-full text-center">
                                  {tab.desc}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <label className="block text-[#ffca58] text-sm font-bold uppercase tracking-[0.2em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
                          <Crown size={14} className="text-magic-gold" /> Arquetipos Universales (Chasis)
                        </label>
                        <div className="relative w-full md:w-72">
                          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar arquetipo por nombre..."
                            className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/35 text-xs font-semibold focus:border-[#ffca58] focus:shadow-[0_0_10px_rgba(255,202,88,0.2)] focus:outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grid of Filtered Archetypes */}
                  <div className="space-y-4 relative z-10">
                    {filteredArchetypes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredArchetypes.map((arch) => {
                          const isSelected = formData.archetype === arch.value;
                          const safeSpeed = arch.speed || 'Media';
                          const speedStyles = getSpeedStyles(safeSpeed);
                          
                          let bannedCount = 0;
                          if (arch.allCards && arch.allCards.length > 0) {
                            bannedCount = arch.allCards.filter(c => BATTLEBOX_VETOS.some(v => v.toLowerCase() === c.toLowerCase())).length;
                          }
                          
                          return (
                            <motion.div
                              key={arch.value}
                              onClick={() => handleArchetypeChange(arch.value)}
                              whileHover={{ scale: 1.02, translateY: -2 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-md flex flex-col justify-between min-h-[170px]",
                                isSelected
                                  ? "border-magic-gold bg-black/85 shadow-[0_0_20px_rgba(255,202,88,0.25)] ring-1 ring-magic-gold/50"
                                  : "border-white/20 bg-black/75 hover:border-white/40 hover:bg-black/85"
                              )}
                            >
                              <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                              
                              <div>
                                <div className="flex justify-between items-start gap-2 mb-2 relative z-10">
                                  <h4 className={cn(
                                    "font-cinzel text-sm font-bold tracking-wide transition-colors leading-tight",
                                    isSelected ? "text-magic-gold animate-pulse" : "text-white"
                                  )}>
                                    {arch.label}
                                  </h4>
                                  {isSelected && (
                                    <div className="w-5 h-5 rounded-full bg-[#ffca58] flex items-center justify-center shadow-lg border border-black/30">
                                      <Check size={10} className="text-black font-black" />
                                    </div>
                                  )}
                                </div>
                                
                                <p className="text-[11.5px] text-white/90 leading-relaxed mb-3 font-serif relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium line-clamp-3">
                                  {arch.description}
                                </p>
                                
                                {activeSenda === 'sandbox' && arch.beginnerTip && (
                                  <div className="mt-3 p-2.5 bg-[#ffca58]/10 border border-[#ffca58]/20 rounded-xl text-[10px] text-[#ffca58] relative z-10 font-serif leading-relaxed italic">
                                    💡 {arch.beginnerTip}
                                  </div>
                                )}
                                
                                {/* Salud de la Banlist (Característica B) */}
                                {arch.isDynamic && (
                                  <div className="mb-3 relative z-10">
                                    {bannedCount === 0 ? (
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-green-950/40 border border-green-500/30 rounded-lg inline-flex">
                                        <Shield size={12} className="text-green-400" />
                                        <span className="text-[9px] font-bold text-green-400 uppercase tracking-widest">🟢 100% Legal</span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-yellow-950/40 border border-yellow-500/30 rounded-lg inline-flex" title="El Juez Supremo transmutará estas cartas automáticamente durante la forja.">
                                        <AlertCircle size={12} className="text-yellow-400 animate-pulse" />
                                        <span className="text-[9px] font-bold text-yellow-400 uppercase tracking-widest">🟡 {bannedCount} Baneadas (A sustituir)</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {arch.signatureCards && arch.signatureCards.length > 0 && (
                                  <div className="mb-4 relative z-10">
                                    <span className="text-[8.5px] text-white/40 uppercase tracking-widest font-sans mb-1 block">Cartas Insignia:</span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {arch.signatureCards.map((sc, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] text-[9px] rounded font-mono font-semibold" title="Carta representativa de este arquetipo">
                                          {sc}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-2 mt-auto relative z-10 pt-2 border-t border-white/5">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {/* Dificultad */}
                                  <div className={cn(
                                    "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border cursor-help",
                                    arch.difficulty === 1 ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                    arch.difficulty === 3 ? "bg-red-500/10 border-red-500/20 text-red-400" :
                                    "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                  )} title={`Dificultad de Juego: ${arch.difficulty === 1 ? 'Ideal para principiantes' : arch.difficulty === 3 ? 'Requiere mucha experiencia' : 'Dificultad moderada'}`}>
                                    <span>{arch.difficulty === 1 ? '🟢 Fácil' : arch.difficulty === 3 ? '🔴 Difícil' : '🟡 Medio'}</span>
                                  </div>
                                  
                                  {/* Velocidad */}
                                  <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border cursor-help", speedStyles.bg, speedStyles.color)} title="Cadencia y velocidad del mazo">
                                    {speedStyles.icon}
                                    <span>{safeSpeed}</span>
                                  </div>
                                </div>
                                
                                <div className="flex -space-x-1.5">
                                  {(arch.recommendedColors || []).map(c => {
                                    const colObj = COLORS.find(co => co.id === c);
                                    return (
                                      <div key={c} className="w-4 h-4 rounded-full border border-black/50 overflow-hidden shadow" title={colObj?.name}>
                                        <img src={colObj?.icon} alt={c} className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-12 text-center bg-black/45 border border-dashed border-white/10 rounded-2xl">
                        <p className="text-white/40 text-sm font-cinzel tracking-wider">No se encontraron arquetipos con estos filtros</p>
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            if (activeSenda === 'sandbox') {
                              setActiveColorTab('generic');
                            } else {
                              setActiveColorTab('bicolor');
                            }
                          }}
                          className="mt-4 text-xs text-magic-gold font-bold hover:underline"
                        >
                          Restablecer filtros
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-end pt-4 border-t border-white/10 relative z-10">
                <button
                  type="button"
                  disabled={!formData.archetype}
                  onClick={() => setCurrentStep(2)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-lg flex items-center gap-2",
                    formData.archetype
                      ? "bg-[#ffca58] border-[#ffca58] text-black hover:shadow-[0_0_15px_rgba(255,202,88,0.4)]"
                      : "bg-black/50 border-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  Siguiente Paso ➔
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full p-8 frosted-panel shadow-2xl relative space-y-6"
            >
              <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                    Pacto de Maná
                  </h3>
                  <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                    Paso 3: Consagra la Identidad de Color de tu ecosistema
                  </p>
                </div>
                
                {lockedColors && (
                  <button
                    type="button"
                    onClick={() => setLockedColors(false)}
                    className="bg-black/60 hover:bg-black/90 px-3 py-1.5 rounded-full text-red-400 hover:text-white border border-red-500/30 hover:border-red-500/65 transition-all text-[9.5px] uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-md self-end md:self-center"
                  >
                    <Unlock size={12} /> Desbloquear Colores
                  </button>
                )}
                {currentArchetype && !arraysEqual(formData?.colores || [], currentArchetype.recommendedColors || []) && !lockedColors && (
                  <button
                    type="button"
                    onClick={resetColors}
                    className="bg-black/60 hover:bg-black/90 px-3 py-1.5 rounded-full text-[#ffdf91] hover:text-white border border-[#ffdf91]/30 hover:border-[#ffdf91]/65 transition-all text-[9.5px] uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-md hover:shadow-[#ffdf91]/10 self-end md:self-center"
                  >
                    <span className="text-xs">↩</span> Recomendar Colores Originales
                  </button>
                )}
              </div>

              {incompatibleSeeds.length > 0 && (
                <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-3 relative z-10 animate-pulse shadow-md">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1 text-xs text-amber-200/90 leading-relaxed font-sans">
                    <strong className="text-amber-300 block uppercase tracking-wider mb-1">⚠️ Incompatibilidad de Semillas Firma</strong>
                    Has seleccionado cartas firma en el Step 4 cuyos colores de identidad no se corresponden con el Pacto de Maná activo:
                    <div className="text-white font-bold font-mono mt-1.5 p-2 bg-black/40 border border-white/5 rounded-lg">
                      {incompatibleSeeds.join(', ')}
                    </div>
                    <span className="text-[11px] block mt-1.5 text-amber-400/80 italic font-semibold">➔ Por favor, añade los colores correspondientes o remueve las semillas en el Step 4 para asegurar la estabilidad del mazo.</span>
                  </div>
                </div>
              )}

              {/* Sugerencia de Color (Railroading) */}
              {colorSuggestion && (
                <div className="bg-yellow-900/40 border border-yellow-500/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg backdrop-blur-sm relative z-10">
                  <div className="flex gap-3">
                    <div className="mt-1">
                      <AlertCircle className="text-yellow-400" size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-yellow-400 font-cinzel mb-1">
                        Alineación Mágica Recomendada
                      </h4>
                      <p className="text-xs text-white/80 leading-relaxed font-sans">
                        La senda de <span className="font-black text-white">{colorSuggestion.tribe || colorSuggestion.strategy}</span> requiere magia específica para desplegar todo su potencial. 
                        ¿Deseas sintonizar tu maná con {colorSuggestion.missingColors.map(c => COLORS.find(co => co.id === c)?.name || c).join(', ')}?
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, colores: [...new Set([...(prev.colores || []), ...colorSuggestion.missingColors])] }));
                      setColorSuggestion(null);
                    }}
                    className="shrink-0 bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-lg text-[10px] uppercase font-black tracking-widest transition-colors flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:shadow-[0_0_20px_rgba(234,179,8,0.5)]"
                  >
                    <span>✦</span> Aplicar Ajuste
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-start">
                {/* Lado Izquierdo: Controles */}
                <div className="md:col-span-2 space-y-6">
                  {/* Banner de Leyenda */}
                  {currentArchetype && (
                    <div className="p-4 bg-black/90 border border-magic-gold/30 rounded-xl shadow-2xl relative overflow-hidden">
                      <span className="text-[9.5px] uppercase tracking-[0.15em] text-magic-gold font-black block mb-2 flex items-center gap-1.5">
                        <Scroll size={10} className="text-magic-gold" /> Revelación del Oráculo (Leyenda del Mazo)
                      </span>
                      <p 
                        className="text-[12px] text-white/95 font-serif leading-relaxed"
                        dangerouslySetInnerHTML={{ 
                          __html: getProsaEpica(formData, currentArchetype)
                            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#ffdf91] font-black">$1</strong>')
                        }}
                      />
                    </div>
                  )}
                  {/* Glowing Mana Orbs Grid */}
                  <div className="flex flex-wrap gap-6 justify-center py-6 bg-black/20 border border-white/10 rounded-2xl relative">
                    {COLORS.map(color => {
                      const isSelected = (formData?.colores || []).includes(color.id);
                      const isRecommended = currentArchetype?.recommendedColors?.includes(color.id);
                      const allowedList = allowedColorsInfo?.allowed || [];
                      const isAllowed = allowedList.length === 6 || allowedList.includes(color.id);
                      
                      // Brillo de orbe dinámico premium
                      let shadowGlow = "";
                      if (isSelected) {
                        if (color.id === 'W') shadowGlow = 'shadow-[0_0_25px_rgba(248,246,216,0.6)] border-[#f8f6d8]/60';
                        else if (color.id === 'U') shadowGlow = 'shadow-[0_0_25px_rgba(14,104,171,0.7)] border-[#0e68ab]/60';
                        else if (color.id === 'B') shadowGlow = 'shadow-[0_0_25px_rgba(255,255,255,0.3)] border-white/40';
                        else if (color.id === 'R') shadowGlow = 'shadow-[0_0_25px_rgba(211,32,42,0.7)] border-[#d3202a]/60';
                        else if (color.id === 'G') shadowGlow = 'shadow-[0_0_25px_rgba(0,115,62,0.7)] border-[#00733e]/60';
                        else if (color.id === 'C') shadowGlow = 'shadow-[0_0_25px_rgba(150,153,154,0.6)] border-[#96999a]/60';
                      }

                      return (
                        <div 
                          key={color.id} 
                          className="flex flex-col items-center gap-3"
                          title={!isAllowed ? `La senda del color ${color.name} está vedada para la naturaleza de ${currentArchetype?.label || 'este arquetipo'}` : isRecommended ? `Color recomendado para ${currentArchetype?.label}` : ''}
                        >
                          <motion.button
                            type="button"
                            disabled={!isAllowed || lockedColors}
                            onClick={() => toggleColor(color.id)}
                            whileHover={{ scale: isAllowed && !lockedColors ? 1.12 : 1 }}
                            whileTap={{ scale: isAllowed && !lockedColors ? 0.95 : 1 }}
                            className={cn(
                              "transition-all duration-300 relative flex items-center justify-center rounded-full focus:outline-none border-2 border-transparent p-0.5",
                              (!isAllowed || lockedColors) ? "opacity-20 grayscale cursor-not-allowed" :
                              isSelected
                                ? "scale-110 z-10"
                                : "opacity-35 grayscale-[0.3] hover:opacity-100 hover:grayscale-0"
                            )}
                          >
                            <ManaOrb 
                              color={color.id} 
                              size="w-14 h-14 md:w-16 md:h-16" 
                              className={cn(
                                "transition-shadow duration-300",
                                shadowGlow
                              )}
                            />
                            {isRecommended && isAllowed && (
                              <span className="absolute -top-1 -right-1 text-[9px] w-5 h-5 bg-[#ffca58] text-black rounded-full flex items-center justify-center font-bold shadow-lg border border-black/20 z-20" title="Recomendado">
                                ★
                              </span>
                            )}
                            {!isAllowed && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/85 rounded-full border border-red-500/20 shadow-[inset_0_0_8px_rgba(239,68,68,0.2)]">
                                <span className="text-[10px] text-red-500 font-extrabold select-none">🔒</span>
                              </div>
                            )}
                          </motion.button>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black transition-all duration-300 shadow-md border",
                            !isAllowed ? "bg-stone-950/40 text-stone-600 border-stone-900/30 line-through opacity-40" :
                            isSelected
                              ? "bg-[#ffca58] text-black border-[#ffca58] shadow-[0_0_10px_rgba(255,202,88,0.4)]"
                              : "bg-black/90 text-white/95 border-white/20"
                          )}>
                            {color.name}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Guild Presets */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[10px] text-[#ffca58] uppercase tracking-[0.15em] font-extrabold block drop-shadow-md">
                      Presets Rápidos (Pactos de Gremio y Alianzas):
                    </span>
                    <div className="flex flex-wrap gap-2 justify-center max-h-[140px] overflow-y-auto p-2 bg-black/35 rounded-xl border border-white/5">
                      {PACTOS_DE_GREMIO.filter(pact => pact.colors.every(c => {
                        const allowedList = allowedColorsInfo?.allowed || [];
                        return allowedList.length === 6 || allowedList.includes(c);
                      })).map(pact => {
                        const isSelected = activePreset === pact.id;
                        return (
                          <button
                            key={pact.id}
                            type="button"
                            onClick={() => applyGuildPreset(pact.colors)}
                            className={cn(
                              "px-3 py-1.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wider border transition-all duration-300 cursor-pointer shadow-md",
                              isSelected
                                ? "bg-[#ffca58] border-[#ffca58] text-black shadow-[0_0_12px_rgba(255,202,88,0.4)] font-black"
                                : "bg-black/90 border-white/20 text-white/95 hover:border-white/50 hover:bg-black hover:text-white"
                            )}
                          >
                            {pact.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Codicia de Maná (Mana Greed) */}
                  <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden mt-6">
                    <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                    <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 relative z-10">
                      ⚖️ Codicia de Maná (Base de Tierras)
                    </label>
                    <p className="text-[10px] text-[#f4ece0]/60 tracking-wide leading-relaxed font-sans relative z-10">
                      Ajusta el perfil de riesgo de tu base de tierras. El Juez modificará el cálculo de Karsten para arriesgar con menos tierras o asegurar land drops.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10">
                      {[
                        { id: 'greedy', label: 'Codiciosa (-2 tierras)', desc: 'Maximiza hechizos y velocidad' },
                        { id: 'balanced', label: 'Estándar', desc: 'Matemática de Karsten pura' },
                        { id: 'safe', label: 'Conservadora (+2 tierras)', desc: 'Asegura land drops estables' }
                      ].map(opt => {
                        const isSel = (formData.manaGreed || 'balanced') === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setFormData(prev => ({ ...prev, manaGreed: opt.id }))}
                            className={cn(
                              "p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between items-start min-h-[75px] backdrop-blur-md relative overflow-hidden group text-left",
                              isSel
                                ? "border-[#ffca58] bg-[#ffca58]/15 shadow-md scale-[1.02] shadow-[0_0_10px_rgba(255,202,88,0.15)]"
                                : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/30"
                            )}
                          >
                            <span className={cn("text-[9.5px] font-black uppercase tracking-wider", isSel ? "text-magic-gold" : "text-white/80")}>
                              {opt.label}
                            </span>
                            <span className="text-[8.5px] text-white/40 leading-tight mt-1 font-sans">
                              {opt.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estilo y Preferencia de Tierras */}
                  <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden mt-6">
                    <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                    <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-1.5 relative z-10">
                      🌍 Estilo y Preferencia de Tierras
                    </label>
                    <p className="text-[10px] text-[#f4ece0]/60 tracking-wide leading-relaxed font-sans relative z-10">
                      Selecciona la prioridad y presupuesto para la base de tierras de doble color.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
                      {[
                        { id: 'competitive', label: 'Ultra-Competitivo', desc: 'Shocklands, Fetchlands y Tierras Rápidas' },
                        { id: 'no-pain', label: 'Sin Auto-Daño', desc: 'Prioriza Tierras Lentas/Rápidas, de Espionaje y Básicas' },
                        { id: 'utility', label: 'Utilidad y Man-Lands', desc: 'Prioriza Tierras que se convierten en criaturas y de canal' },
                        { id: 'budget', label: 'Económico / Casual', desc: 'Tierras Básicas, Temples y Painlands básicas' }
                      ].map(opt => {
                        const isSel = (formData.manaBaseStyle || 'competitive') === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => setFormData(prev => ({ ...prev, manaBaseStyle: opt.id }))}
                            className={cn(
                              "p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between items-start min-h-[75px] backdrop-blur-md relative overflow-hidden group text-left",
                              isSel
                                ? "border-[#ffca58] bg-[#ffca58]/15 shadow-md scale-[1.02] shadow-[0_0_10px_rgba(255,202,88,0.15)]"
                                : "bg-black/40 border-white/10 hover:bg-black/60 hover:border-white/30"
                            )}
                          >
                            <span className={cn("text-[9.5px] font-black uppercase tracking-wider", isSel ? "text-magic-gold" : "text-white/80")}>
                              {opt.label}
                            </span>
                            <span className="text-[8.5px] text-white/40 leading-tight mt-1 font-sans">
                              {opt.desc}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Lado Derecho: Vistazo Rápido */}
                <div className="hidden md:block md:col-span-1">
                  <QuickGlancePanel
                    formData={formData}
                    currentArchetype={currentArchetype}
                    selectedTribeInfo={selectedTribeInfo}
                    selectedStrategyInfo={selectedStrategyInfo}
                    isCustomTribe={isCustomTribe}
                    isCustomStrategy={isCustomStrategy}
                    pseudoDeck={pseudoDeck}
                  />
                </div>
              </div>


              {errors.colores && (
                <p className="text-[#ff4d4d] text-xs text-center font-bold animate-pulse">
                  ⚠️ {errors.colores}
                </p>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-5 py-2.5 bg-black/60 hover:bg-black text-[#ffca58] hover:text-white border border-[#ffca58]/30 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all"
                >
                  📋 Regresar
                </button>
                <button
                  type="button"
                  disabled={(formData?.colores || []).length === 0 && formData.archetype !== 'legacy-eldrazi'}
                  onClick={() => {
                    if ((formData?.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi') {
                      setCurrentStep(4);
                    } else {
                      setErrors({ colores: 'Selecciona al menos un color' });
                    }
                  }}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-lg flex items-center gap-2",
                    ((formData?.colores || []).length > 0 || formData.archetype === 'legacy-eldrazi')
                      ? "bg-[#ffca58] border-[#ffca58] text-black hover:shadow-[0_0_15px_rgba(255,202,88,0.4)]"
                      : "bg-black/50 border-white/10 text-white/30 cursor-not-allowed"
                  )}
                >
                  Siguiente Paso ➔
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full p-8 frosted-panel shadow-2xl relative space-y-6"
            >
              <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
              
              <div className="border-b border-white/10 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                    Núcleo y Sinergia Táctica
                  </h3>
                  <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                    Paso 2: Define la raza y el motor estratégico que dominará el ecosistema
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-black/60 px-3 py-2 rounded-xl border border-white/10 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-magic-gold/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  <label className="text-[10px] text-white/70 font-sans font-bold uppercase tracking-wider cursor-pointer flex items-center gap-2">
                    {formData.isExpertMode ? <Wand2 size={14} className="text-[#ffca58]" /> : <Compass size={14} className="text-emerald-400" />}
                    <span>{formData.isExpertMode ? '🔮 Modo Oráculo (Experto)' : 'Modo Guía (Principiante)'}</span>
                    <input
                      type="checkbox"
                      checked={!!formData.isExpertMode}
                      onChange={(e) => {
                        setFormData(prev => ({ 
                          ...prev, 
                          isExpertMode: e.target.checked,
                          tribe: '',
                          strategy: ''
                        }));
                        setLockedColors(false);
                      }}
                      className="sr-only"
                    />
                    <div className={cn("w-7 h-4 rounded-full transition-colors relative", formData.isExpertMode ? "bg-[#ffca58]/40" : "bg-emerald-500/40")}>
                      <div className={cn("absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform", formData.isExpertMode ? "translate-x-3" : "translate-x-0")} />
                    </div>
                  </label>
                </div>
              </div>

              {formData.isExpertMode ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-start">
                  <div className="md:col-span-2 space-y-6">
                    <div className="bg-black/40 border border-[#ffca58]/30 p-6 rounded-2xl shadow-[0_0_15px_rgba(255,202,88,0.1)]">
                      <h4 className="text-[#ffca58] font-cinzel text-lg font-bold mb-4 flex items-center gap-2">
                        <Wand2 size={18} /> Petición Directa al Oráculo
                      </h4>
                      <p className="text-white/60 text-xs mb-6">
                        Has desactivado las ruedas de entrenamiento. El motor algorítmico leerá exactamente lo que escribas aquí.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Tribu / Raza Base (Opcional)</label>
                          <input
                            type="text"
                            value={formData.tribe}
                            onChange={(e) => setFormData(prev => ({ ...prev, tribe: e.target.value }))}
                            placeholder="Ej: Merfolk, Pirate..."
                            className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white placeholder-white/20 text-xs focus:border-[#ffca58] focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Estrategia Base (Opcional)</label>
                          <input
                            type="text"
                            value={formData.strategy}
                            onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                            placeholder="Ej: Ad Nauseam, Doomsday..."
                            className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white placeholder-white/20 text-xs focus:border-[#ffca58] focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-[#ffca58] mb-1.5 block flex items-center gap-1">
                          <Crown size={12} /> Directriz Estricta (Prompt del Sistema)
                        </label>
                        <textarea
                          value={formData.customPrompt || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, customPrompt: e.target.value }))}
                          placeholder="Ej: Quiero un combo de maná infinito usando exclusivamente a Kiki-Jiki y Deceiver Exarch. Asegúrate de incluir muchísima protección y no uses otras win conditions. Ignora restricciones de costes."
                          className="w-full h-40 px-4 py-3 bg-black/80 border border-[#ffca58]/40 rounded-xl text-white placeholder-[#ffca58]/20 text-xs focus:border-[#ffca58] focus:shadow-[0_0_15px_rgba(255,202,88,0.2)] focus:outline-none resize-none leading-relaxed"
                        ></textarea>
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block md:col-span-1">
                    <QuickGlancePanel
                      formData={formData}
                      currentArchetype={currentArchetype}
                      selectedTribeInfo={null}
                      selectedStrategyInfo={null}
                      isCustomTribe={true}
                      isCustomStrategy={true}
                      pseudoDeck={pseudoDeck}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-start">
                  <div className="md:col-span-2 space-y-6">
                    {/* Universes Beyond Quick Control Bar */}
                    <div className="p-3.5 bg-black/60 border border-purple-500/30 rounded-xl relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                      <div className="flex items-center gap-2.5">
                        <Globe className={formData.allowCustomCards ? "text-purple-400 animate-pulse" : "text-white/40"} size={18} />
                        <div>
                          <span className="text-xs font-cinzel font-bold text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                            Ediciones Universes Beyond (Crossovers)
                          </span>
                          <span className="text-[10px] text-white/50 font-serif block">
                            El Señor de los Anillos, Fallout, Final Fantasy, Marvel, Doctor Who, Warhammer 40k...
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          vibrateTouch();
                          setFormData(prev => ({ ...prev, allowCustomCards: !prev.allowCustomCards }));
                        }}
                        className={cn(
                          "px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center gap-2 shrink-0 select-none shadow-md",
                          formData.allowCustomCards
                            ? "bg-purple-950/90 border-purple-500/70 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] scale-[1.02]"
                            : "bg-black/60 border-white/15 text-white/40 hover:text-white hover:border-white/30"
                        )}
                      >
                        {formData.allowCustomCards ? '🌌 INCLUIDOS ✓' : '🚫 EXCLUIDOS ✕'}
                      </button>
                    </div>

                    {/* Banner de Leyenda */}
                    {currentArchetype && (
                      <div className="p-4 bg-black/90 border border-magic-gold/30 rounded-xl shadow-2xl relative overflow-hidden">
                        <span className="text-[9.5px] uppercase tracking-[0.15em] text-magic-gold font-black block mb-2 flex items-center gap-1.5">
                          <Scroll size={10} className="text-magic-gold" /> Revelación del Oráculo (Leyenda del Mazo)
                        </span>
                        <p 
                          className="text-[12px] text-white/95 font-serif leading-relaxed"
                          dangerouslySetInnerHTML={{ 
                            __html: getProsaEpica(formData, currentArchetype)
                              .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#ffdf91] font-black">$1</strong>')
                          }}
                        />
                      </div>
                    )}
                    {/* Historical Modules Carousel */}
                    {HISTORICAL_DECKS_CATALOG[formData.archetype] && HISTORICAL_DECKS_CATALOG[formData.archetype].filter(deck => !deck.formats || deck.formats.includes(selectedFormat)).length > 0 && (
                      <div className="bg-black/40 border border-magic-gold/30 p-5 rounded-2xl shadow-[0_0_15px_rgba(255,202,88,0.1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <h4 className="text-magic-gold font-cinzel text-sm font-bold mb-3 flex items-center gap-2 relative z-10">
                          <BookOpen size={16} /> Tomos Históricos (Principiantes)
                        </h4>
                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-magic-gold/50 scrollbar-track-black/50 relative z-10 snap-x">
                          {HISTORICAL_DECKS_CATALOG[formData.archetype].filter(deck => !deck.formats || deck.formats.includes(selectedFormat)).map(deck => {
                            const isSelected = formData.strategy === deck.title;
                            return (
                              <button
                                key={deck.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    strategy: deck.title,
                                    colores: deck.colors,
                                    tribe: '' // Clear tribe when selecting a historical deck
                                  }));
                                  setLockedColors(true);
                                  setIsCustomStrategy(false);
                                  setIsCustomTribe(false);
                                  setHasUserClearedTribe(true);
                                  setHasUserClearedStrategy(false);
                                }}
                                className={cn(
                                  "min-w-[220px] max-w-[220px] p-4 rounded-xl border transition-all duration-300 text-left flex flex-col gap-2 snap-center relative",
                                  isSelected
                                    ? "bg-gradient-to-b from-magic-gold/20 to-black border-magic-gold text-white shadow-[0_0_10px_rgba(255,202,88,0.3)] scale-[1.02]"
                                    : "bg-black/60 border-white/10 text-white/70 hover:border-white/30 hover:bg-black/80"
                                )}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-cinzel font-bold text-sm text-magic-gold whitespace-nowrap overflow-hidden text-ellipsis mr-2">{deck.title}</span>
                                  {deck.difficulty === 'Fácil' && <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold uppercase shrink-0">Fácil</span>}
                                  {deck.difficulty === 'Media' && <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 font-bold uppercase shrink-0">Media</span>}
                                  {deck.difficulty === 'Difícil' && <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded border border-rose-500/30 font-bold uppercase shrink-0">Difícil</span>}
                                </div>
                                <p className="text-[10px] font-serif leading-tight text-white/50 min-h-[30px]">{deck.description}</p>
                                <div className="flex gap-1 mt-auto pt-2 border-t border-white/5">
                                  {deck.colors.map(col => {
                                    const cObj = COLORS.find(co => co.id === col);
                                    return (
                                      <div key={col} className="w-3.5 h-3.5 rounded-full overflow-hidden shadow-inner border border-black/50" title={cObj?.name}>
                                        <img src={cObj?.icon} alt={col} className="w-full h-full object-cover" />
                                      </div>
                                    );
                                  })}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Tribu Section (Guided Mode) */}
                      <div className="space-y-4 bg-black/35 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 relative z-10">
                          <label className="text-xs font-cinzel font-bold text-[#ffca58] uppercase tracking-wider flex items-center gap-1.5">
                            <Wand2 size={12} className="text-magic-gold" /> Identidad Tribal (Raza)
                          </label>
                          {formData.tribe && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, tribe: '', selectedEngineId: '' }));
                                setIsCustomTribe(false);
                                setHasUserClearedTribe(true);
                              }}
                              className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black"
                            >
                              ✕ Quitar
                            </button>
                          )}
                        </div>

                        {/* Subcategories Selector */}
                        <div className="flex flex-wrap gap-1 border-b border-white/10 pb-2 relative z-10">
                          {Object.entries(groupedTribes).map(([catKey, tribes]) => (
                            <button
                              key={catKey}
                              type="button"
                              onClick={() => {
                                setIsCustomTribe(false);
                                setActiveTribeTab(catKey);
                              }}
                              className={cn(
                                "px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border transition-all duration-300",
                                activeTribeTab === catKey && !isCustomTribe
                                  ? "bg-magic-gold text-black border-magic-gold font-black shadow-[0_0_10px_rgba(255,202,88,0.25)] scale-[1.02]"
                                  : "bg-black/85 border-white/10 text-white/80 hover:border-white/30 hover:text-white"
                              )}
                            >
                              {TRIBE_CATEGORIES[catKey]?.split(' ').slice(1).join(' ') || catKey}
                            </button>
                          ))}
                        </div>

                        {/* Tribe Grid selector */}
                        <div className="h-[210px] overflow-y-auto p-2 bg-black/60 border border-white/10 rounded-xl relative z-10">
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, tribe: '', selectedEngineId: '' }));
                                setHasUserClearedTribe(true);
                              }}
                              className={cn(
                                "p-2 rounded-lg border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1 relative min-h-[56px]",
                                !formData.tribe
                                  ? "bg-gradient-to-b from-gray-500/20 to-black border-gray-400 text-gray-300 shadow-[0_0_8px_rgba(156,163,175,0.2)] font-black scale-[1.02]"
                                  : "bg-black/85 border-white/10 text-white/80 hover:border-white/30 hover:bg-black/95 hover:scale-[1.01]"
                              )}
                            >
                              <span className="text-[10px] uppercase tracking-wider font-cinzel text-gray-400">Sin Tribu / Omitir</span>
                              <div className="text-[9px] text-gray-500 font-sans font-medium line-clamp-1">Base de mazo genérica</div>
                            </button>

                            {groupedTribes[activeTribeTab] && groupedTribes[activeTribeTab].map(tribe => {
                              const isTribeSelected = formData.tribe === tribe.label;
                              const isCompatible = isTribeCompatible(tribe);
                              
                              return (
                                <button
                                  key={tribe.id}
                                  type="button"
                                  disabled={!isCompatible}
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      tribe: tribe.label,
                                      selectedEngineId: ''
                                    }));
                                    setHasUserClearedTribe(false);
                                  }}
                                  title={!isCompatible ? `Incompatible con la estrategia "${formData.strategy}"` : `Seleccionar ${tribe.label}`}
                                  className={cn(
                                    "p-2 rounded-lg border text-center transition-all duration-300 flex flex-col items-center justify-center gap-1 relative min-h-[56px]",
                                    isTribeSelected
                                      ? "bg-gradient-to-b from-[#ffca58]/20 to-black border-[#ffca58] text-[#ffca58] shadow-[0_0_8px_rgba(255,202,88,0.2)] font-black scale-[1.02]"
                                      : !isCompatible
                                        ? "bg-black/30 border-white/5 text-[#f4ece0]/30 opacity-40 grayscale pointer-events-none"
                                        : "bg-black/75 border-white/10 text-[#f4ece0]/80 hover:text-white hover:border-white/30"
                                  )}
                                >
                                  <span className="text-[10px] font-cinzel font-bold tracking-wide leading-tight flex items-center gap-1">
                                    {!isCompatible && <Lock size={9} className="text-magic-gold/60 shrink-0" />}
                                    {tribe.label}
                                  </span>
                                  <div className="flex gap-0.5 mt-0.5">
                                    {tribe.colors.map(col => {
                                      const cObj = COLORS.find(co => co.id === col);
                                      return (
                                        <div key={col} className={cn("w-2.5 h-2.5 rounded-full overflow-hidden shadow-inner border border-black/35", !isCompatible && "opacity-50")} title={cObj?.name}>
                                          <img src={cObj?.icon} alt={col} className="w-full h-full object-cover" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {selectedTribeInfo && (
                          <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg flex items-center justify-between relative z-10">
                            <div>
                              <p className="text-emerald-400 text-[9px] font-black uppercase tracking-wider mb-0.5">Tribu Seleccionada</p>
                              <p className="text-[10px] text-[#f4ece0]/60 font-serif leading-none">Los {selectedTribeInfo.label} son ideales.</p>
                            </div>
                            <div className="flex gap-0.5">
                              {selectedTribeInfo.colors.map(c => (
                                <div key={c} className="w-4 h-4 rounded-full overflow-hidden border border-black/40">
                                  <img src={COLORS.find(co => co.id === c)?.icon} alt={c} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Oracle Tuner Accordion (Personalización Avanzada del Motor) */}
                      <div className="space-y-4">
                        <div className="border border-magic-gold/30 bg-black/40 rounded-2xl overflow-hidden shadow-lg">
                          <button
                            type="button"
                            onClick={() => setIsTuningOpen(!isTuningOpen)}
                            className="w-full px-5 py-4 bg-gradient-to-r from-black/80 to-black/40 flex items-center justify-between text-left border-b border-white/10 hover:bg-black/90 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <Wand2 className="text-magic-gold w-5 h-5 animate-pulse" />
                              <div>
                                <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.15em] text-[#ffca58]">
                                  Oracle Tuner (Motor de Sinergias)
                                </h4>
                                <p className="text-[10px] text-white/50 font-serif">
                                  {formData.tribe ? `Sintoniza los sabores para la tribu de ${formData.tribe}` : 'Sintoniza los motores de sinergia universales'}
                                </p>
                              </div>
                            </div>
                            <span className="text-magic-gold text-xs font-bold">{isTuningOpen ? '▲ OCULTAR' : '▼ MOSTRAR'}</span>
                          </button>

                          <AnimatePresence>
                            {isTuningOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="p-4 space-y-4 overflow-hidden border-t border-white/5"
                              >
                                <div className="grid grid-cols-1 gap-2 max-h-[220px] overflow-y-auto p-1 scrollbar-thin">
                                  {availableEngines.map(engine => {
                                    const isSelected = formData.selectedEngineId === engine.id;
                                    const isColorOk = isEngineColorCompatible(engine);
                                    
                                    const strat = MTG_STRATEGIES.find(s => s.id === engine.id.replace('_generic', ''));
                                    const isRecommended = formData.archetype && strat?.archetypes?.some(arch => formData.archetype.toLowerCase().includes(arch));

                                    return (
                                      <button
                                        key={engine.id}
                                        type="button"
                                        disabled={!isColorOk}
                                        onClick={() => {
                                          setFormData(prev => ({
                                            ...prev,
                                            selectedEngineId: engine.id,
                                            strategy: engine.label,
                                            engineFlavor: engine.label
                                          }));
                                        }}
                                        className={cn(
                                          "p-3 rounded-xl border text-left transition-all duration-300 flex items-start gap-3 relative",
                                          isSelected
                                            ? "border-[#ffca58] bg-[#ffca58]/10 shadow-[0_0_12px_rgba(255,202,88,0.2)] font-black scale-[1.01]"
                                            : !isColorOk
                                              ? "opacity-30 cursor-not-allowed border-white/5 bg-transparent"
                                              : "bg-black/60 border-white/10 hover:border-white/30 hover:bg-black/85"
                                        )}
                                      >
                                        <span className="text-xl shrink-0 mt-0.5">{getEngineIcon(engine.id)}</span>
                                        <div className="flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="font-cinzel text-xs font-bold text-white leading-tight">
                                              {engine.label}
                                            </span>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                              {isRecommended && !formData.tribe && (
                                                <span className="text-[8px] bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">
                                                  ★ Sinergia
                                                </span>
                                              )}
                                              {!isColorOk && (
                                                <span className="text-[8px] bg-red-950/60 border border-red-500/30 text-red-400 px-1.5 py-0.5 rounded font-mono uppercase tracking-widest">
                                                  Incompatible
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-white/50 font-serif leading-snug mt-1">
                                            {engine.description}
                                          </p>
                                          {engine.requiredColors && engine.requiredColors.length > 0 && (
                                            <div className="flex gap-1 mt-1.5">
                                              {engine.requiredColors.map(c => (
                                                <div key={c} className="w-3 h-3 rounded-full overflow-hidden border border-black/30 shadow-sm">
                                                  <img src={COLORS.find(co => co.id === c)?.icon} alt={c} className="w-full h-full object-cover" />
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Synergy Pack Selector & Blueprint Role Guide */}
                    {(formData.selectedEngineId || formData.archetype) && (
                      <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        
                        {/* Header con Auto-Completar y Contador */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-3 relative z-10">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <label className="text-xs font-cinzel font-bold text-[#ffca58] uppercase tracking-wider flex items-center gap-1.5">
                                <Scroll size={12} className="text-magic-gold" /> Synergy Pack (Cartas Sugeridas)
                              </label>
                              {composedBlueprint && (
                                <span className="text-[9px] bg-purple-950/80 border border-purple-500/40 text-purple-300 font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                  Blueprint: {composedBlueprint.archetype.toUpperCase()} + {composedBlueprint.strategy.toUpperCase()}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-white/50 font-serif mt-0.5">
                              {formData.selectedEngineId 
                                ? "Ajusta las copias recomendadas o usa la guía Blueprint para equilibrar tu mazo."
                                : "Selección personalizada guiada por las cuotas Pro-Tour del Blueprint."}
                            </p>
                          </div>
                          
                          {/* Botón Auto-Completar y Barra de Progreso */}
                          <div className="flex items-center gap-3 shrink-0">
                            {composedBlueprint && (
                              <button
                                type="button"
                                onClick={handleAutoFillBlueprint}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-400 hover:to-emerald-500 text-black font-extrabold rounded-xl text-[10px] uppercase tracking-wider shadow-lg shadow-amber-900/30 transition-all flex items-center gap-1.5 border border-amber-300/40"
                              >
                                <Sparkles size={12} /> Auto-Completar según Blueprint
                              </button>
                            )}

                            <div className="flex flex-col items-end shrink-0">
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider",
                                totalSelectedSpells > maxSpells ? "text-red-400 font-extrabold animate-pulse" : "text-magic-gold"
                              )}>
                                Hechizos: {totalSelectedSpells} / {maxSpells}
                              </span>
                              <div className="w-28 h-2 bg-white/10 rounded-full mt-1 overflow-hidden border border-white/5 relative">
                                <div 
                                  className={cn(
                                    "h-full transition-all duration-300 rounded-full",
                                    totalSelectedSpells > maxSpells 
                                      ? "bg-red-500 shadow-[0_0_8px_#ef4444]" 
                                      : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
                                  )}
                                  style={{ width: `${Math.min(100, (totalSelectedSpells / maxSpells) * 100)}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* GUÍA VISUAL POR BLUEPRINT (PARA JUGADORES INEXPERTOS) */}
                        {containerProgress.length > 0 && (
                          <div className="relative z-10 space-y-1.5 pt-1 border-b border-white/5 pb-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-[#ffca58] uppercase tracking-[0.15em] font-black flex items-center gap-1">
                                <Compass size={11} /> GUÍA DE CUOTAS BLUEPRINT (HAZ CLIC PARA FILTRAR):
                              </span>
                              {synergyBlueprintContainer !== 'all' && (
                                <button
                                  type="button"
                                  onClick={() => setSynergyBlueprintContainer('all')}
                                  className="text-[8px] text-amber-400/80 hover:text-amber-300 underline font-mono uppercase"
                                >
                                  Ver todos los roles
                                </button>
                              )}
                            </div>
                            <div className="flex gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
                              {containerProgress.map((ct, idx) => {
                                const isSelected = synergyBlueprintContainer === ct.roleKey;
                                return (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => {
                                      vibrateTouch();
                                      setSynergyBlueprintContainer(isSelected ? 'all' : ct.roleKey);
                                    }}
                                    className={cn(
                                      "px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 shrink-0",
                                      isSelected
                                        ? "bg-amber-400 text-black border-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.5)] font-black scale-105"
                                        : ct.isFilled
                                          ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/50"
                                          : ct.currentCopies > 0
                                            ? "bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/50"
                                            : "bg-black/40 border-white/10 text-white/50 hover:border-white/30"
                                    )}
                                  >
                                    <span>{ct.name}</span>
                                    <span className={cn(
                                      "px-1.5 py-0.2 rounded-full text-[8px] font-black font-mono",
                                      ct.isFilled ? "bg-emerald-500 text-black" : "bg-black/60 text-white"
                                    )}>
                                      {ct.currentCopies}/{ct.targetCopies || 4} {ct.isFilled ? '✓' : ''}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* BARRA DE FILTROS Y ORDENACIÓN AVANZADA (PARA PROS Y PRINCIPIANTES) */}
                        <div className="relative z-10 space-y-2.5 pt-1 border-b border-white/5 pb-3">
                          {/* Fila 1: Maná Orbs & Universes Beyond Control */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] text-[#ffca58] uppercase tracking-[0.15em] font-extrabold select-none">
                                Filtrar Color de Maná:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  vibrateTouch();
                                  setFormData(prev => ({ ...prev, allowCustomCards: !prev.allowCustomCards }));
                                }}
                                className={cn(
                                  "px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase tracking-wider border transition-all flex items-center gap-1.5 shrink-0 select-none ml-2",
                                  formData.allowCustomCards
                                    ? "bg-purple-950/90 border-purple-500/60 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)] scale-105"
                                    : "bg-black/40 border-white/10 text-white/40 hover:text-white hover:border-white/20"
                                )}
                                title="Incluir o excluir ediciones de Universes Beyond (Lord of the Rings, Fallout, Final Fantasy, Marvel, Doctor Who, Warhammer, etc.)"
                              >
                                <Globe size={11} className={formData.allowCustomCards ? "text-purple-400 animate-pulse" : "text-white/40"} />
                                <span>Universes Beyond:</span>
                                <span className={cn(
                                  "px-1.5 py-0.2 rounded text-[8px] font-black font-mono",
                                  formData.allowCustomCards ? "bg-purple-500 text-black" : "bg-white/10 text-white/40"
                                )}>
                                  {formData.allowCustomCards ? 'INCLUIDOS ✓' : 'EXCLUIDOS ✕'}
                                </span>
                              </button>
                            </div>
                            
                            <div className="flex gap-2 justify-center p-1.5 bg-black/40 border border-white/10 rounded-xl">
                              {COLORS.map(color => {
                                const isSelected = (formData?.colores || []).includes(color.id);
                                const allowedList = allowedColorsInfo?.allowed || [];
                                const isAllowed = allowedList.length === 6 || allowedList.includes(color.id);
                                
                                let shadowGlow = "";
                                if (isSelected) {
                                  if (color.id === 'W') shadowGlow = 'shadow-[0_0_12px_rgba(248,246,216,0.6)] border-[#f8f6d8]/60 scale-105';
                                  else if (color.id === 'U') shadowGlow = 'shadow-[0_0_12px_rgba(14,104,171,0.7)] border-[#0e68ab]/60 scale-105';
                                  else if (color.id === 'B') shadowGlow = 'shadow-[0_0_12px_rgba(255,255,255,0.3)] border-white/40 scale-105';
                                  else if (color.id === 'R') shadowGlow = 'shadow-[0_0_12px_rgba(211,32,42,0.7)] border-[#d3202a]/60 scale-105';
                                  else if (color.id === 'G') shadowGlow = 'shadow-[0_0_12px_rgba(0,115,62,0.7)] border-[#00733e]/60 scale-105';
                                  else if (color.id === 'C') shadowGlow = 'shadow-[0_0_12px_rgba(150,153,154,0.6)] border-[#96999a]/60 scale-105';
                                }

                                return (
                                  <button
                                    key={color.id}
                                    type="button"
                                    disabled={!isAllowed || lockedColors}
                                    onClick={() => {
                                      vibrateTouch();
                                      toggleColor(color.id);
                                    }}
                                    className={cn(
                                      "transition-all duration-300 relative flex items-center justify-center rounded-full focus:outline-none border border-transparent p-0.5",
                                      (!isAllowed || lockedColors) ? "opacity-20 grayscale cursor-not-allowed" :
                                      isSelected ? "opacity-100" : "opacity-35 hover:opacity-85"
                                    )}
                                    title={color.name}
                                  >
                                    <ManaOrb color={color.id} size="w-6 h-6" className={shadowGlow} />
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Fila 2: Filtros de Tipo, Rol, CMC, Rareza y Ordenación */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[8px]">
                            {/* Filtro de Tipo */}
                            <div className="flex flex-col gap-1 bg-black/40 p-2 border border-white/10 rounded-xl">
                              <span className="text-[#ffca58] uppercase font-bold tracking-wider">Tipo de Carta:</span>
                              <div className="flex gap-1 flex-wrap">
                                {[
                                  { id: 'all', label: 'Todos' },
                                  { id: 'creature', label: 'Criaturas' },
                                  { id: 'spell', label: 'Hechizos' },
                                  { id: 'other', label: 'Otros' }
                                ].map(t => (
                                  <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSynergyTypeFilter(t.id)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-extrabold uppercase transition-all",
                                      synergyTypeFilter === t.id ? "bg-[#ffca58] text-black font-black" : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                  >
                                    {t.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Filtro de Curva / CMC */}
                            <div className="flex flex-col gap-1 bg-black/40 p-2 border border-white/10 rounded-xl">
                              <span className="text-[#ffca58] uppercase font-bold tracking-wider">Coste de Maná (CMC):</span>
                              <div className="flex gap-1 flex-wrap">
                                {[
                                  { id: 'all', label: 'Todos' },
                                  { id: '1', label: '1' },
                                  { id: '2', label: '2' },
                                  { id: '3', label: '3' },
                                  { id: '4', label: '4' },
                                  { id: '5+', label: '5+' }
                                ].map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setSynergyCmcFilter(c.id)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-extrabold uppercase transition-all",
                                      synergyCmcFilter === c.id ? "bg-amber-400 text-black font-black" : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                  >
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Filtro de Rol Funcional */}
                            <div className="flex flex-col gap-1 bg-black/40 p-2 border border-white/10 rounded-xl">
                              <span className="text-[#ffca58] uppercase font-bold tracking-wider">Rol Funcional:</span>
                              <div className="flex gap-1 flex-wrap">
                                {[
                                  { id: 'all', label: 'Todos' },
                                  { id: 'removal', label: 'Remoción' },
                                  { id: 'ramp', label: 'Rampa' },
                                  { id: 'draw', label: 'Robo' },
                                  { id: 'motor', label: 'Motor' },
                                  { id: 'payoff', label: 'Payoff' }
                                ].map(r => (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setSynergyRoleFilter(r.id)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-extrabold uppercase transition-all",
                                      synergyRoleFilter === r.id ? "bg-[#ffca58] text-black font-black" : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Ordenación Pro */}
                            <div className="flex flex-col gap-1 bg-black/40 p-2 border border-white/10 rounded-xl">
                              <span className="text-[#ffca58] uppercase font-bold tracking-wider">Ordenar Sugerencias:</span>
                              <div className="flex gap-1 flex-wrap">
                                {[
                                  { id: 'synergy', label: '★ Sinergia' },
                                  { id: 'cmc_asc', label: 'CMC ↑' },
                                  { id: 'cmc_desc', label: 'CMC ↓' },
                                  { id: 'meta', label: 'Meta %' }
                                ].map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => setSynergySortBy(s.id)}
                                    className={cn(
                                      "px-1.5 py-0.5 rounded font-extrabold uppercase transition-all",
                                      synergySortBy === s.id ? "bg-purple-400 text-black font-black" : "bg-white/5 text-white/40 hover:text-white"
                                    )}
                                  >
                                    {s.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Spinner de carga */}
                        {isPackLoading ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3 relative z-10">
                            <RefreshCw className="text-[#ffca58] w-6 h-6 animate-spin" />
                            <span className="text-xs text-white/40 font-mono tracking-widest uppercase animate-pulse">Sintonizando frecuencias RAG...</span>
                          </div>
                        ) : packCards.length > 0 ? (
                          filteredPackCards.length > 0 ? (
                            <div className={cn(
                              "relative z-10 p-1",
                              isMobile 
                                ? "flex flex-row overflow-x-auto snap-x shrink-0 gap-3 pb-2 custom-scrollbar" 
                                : "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto"
                            )}>
                              {filteredPackCards.map(card => {
                              const copies = seedCards[card.name] || 0;
                              const isLegal = !card.legalities || card.legalities[selectedFormat.toLowerCase()] === 'legal';
                              const cmcVal = card.cmc ?? card.mana_value ?? 0;
                              const isUB = isUniversesBeyondOrCustom(card);
                              
                              return (
                                <div
                                  key={card.id || card.name}
                                  onMouseEnter={() => setHoveredCard(card)}
                                  onMouseLeave={() => setHoveredCard(null)}
                                  className={cn(
                                    "p-2.5 rounded-xl border transition-all duration-300 bg-black/60 flex flex-col justify-between min-h-[105px] group hover:bg-black/80 hover:border-white/25 relative overflow-hidden",
                                    isMobile ? "min-w-[160px] snap-center shrink-0" : "",
                                    copies > 0 ? "border-[#ffca58]/60 shadow-[0_0_12px_rgba(255,202,88,0.15)] bg-amber-950/20" : "border-white/15"
                                  )}
                                >
                                  <div>
                                    <div className="flex justify-between items-start gap-1">
                                      <span className="font-cinzel text-[10.5px] font-bold text-white group-hover:text-[#ffca58] transition-colors leading-tight truncate w-full" title={card.name}>
                                        {card.name}
                                      </span>
                                      {card.mana_cost ? (
                                        <RenderManaCost manaCost={card.mana_cost} className="shrink-0 select-none" />
                                      ) : (
                                        <span className="text-[9px] font-mono text-white/40 bg-white/10 px-1 rounded">CMC {cmcVal}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between gap-1 mt-0.5">
                                      <span className="text-[8px] text-white/45 font-sans truncate uppercase tracking-widest">
                                        {card.type_line?.split('—')[0].trim()}
                                      </span>
                                      <span className="text-[8px] font-mono text-amber-300/80 bg-black/40 px-1 rounded border border-amber-500/20">
                                        CMC {cmcVal}
                                      </span>
                                    </div>
                                    
                                    <div className="flex gap-1 flex-wrap mt-0.5">
                                      {!isLegal && (
                                        <span className="text-[8px] text-red-400 bg-red-950/40 border border-red-500/20 px-1 py-0.5 rounded uppercase font-bold tracking-wider inline-block">
                                          No legal en {selectedFormat}
                                        </span>
                                      )}
                                      {isUB && (
                                        <span className="text-[7.5px] bg-purple-950/80 border border-purple-500/40 text-purple-300 px-1 py-0.2 rounded uppercase font-bold tracking-wider inline-flex items-center gap-0.5">
                                          <Globe size={8} /> UB Crossover
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-white/5">
                                    <span className="text-[9.5px] text-[#ffca58] font-bold truncate">
                                      {detectFunctionalRole(card)}
                                    </span>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={copies === 0}
                                        onClick={() => {
                                          setSeedCards(prev => {
                                            const next = { ...prev };
                                            if (copies === 1) {
                                              delete next[card.name];
                                            } else {
                                              next[card.name] = copies - 1;
                                            }
                                            return next;
                                          });
                                        }}
                                        className={cn(
                                          "rounded-full flex items-center justify-center border transition-all text-xs font-bold font-mono",
                                          isMobile ? "w-8 h-8 min-w-[32px] min-h-[32px]" : "w-5 h-5",
                                          copies > 0 
                                            ? "border-[#ffca58]/40 hover:bg-[#ffca58] hover:text-black text-[#ffca58]" 
                                            : "border-white/10 text-white/20 cursor-not-allowed"
                                        )}
                                      >
                                        -
                                      </button>
                                      
                                      <span className={cn(
                                        "text-xs font-black font-mono w-4 text-center",
                                        copies > 0 ? "text-[#ffca58]" : "text-white/40"
                                      )}>
                                        {copies}
                                      </span>
                                      
                                      <button
                                        type="button"
                                        disabled={copies === 4 || totalSelectedSpells >= maxSpells}
                                        onClick={() => {
                                          setSeedCards(prev => ({ ...prev, [card.name]: copies + 1 }));
                                        }}
                                        className={cn(
                                          "rounded-full flex items-center justify-center border transition-all text-xs font-bold font-mono",
                                          isMobile ? "w-8 h-8 min-w-[32px] min-h-[32px]" : "w-5 h-5",
                                          copies < 4 && totalSelectedSpells < maxSpells
                                            ? "border-[#ffca58]/40 hover:bg-[#ffca58] hover:text-black text-[#ffca58]"
                                            : "border-white/10 text-white/20 cursor-not-allowed"
                                        )}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                            </div>
                          ) : (
                            <div className="py-8 flex flex-col items-center justify-center text-center relative z-10 bg-black/30 rounded-xl border border-white/5">
                              <span className="text-xs text-white/35 font-serif">No hay cartas sugeridas que coincidan con los filtros de tipo, CMC, rareza o rol elegidos.</span>
                            </div>
                          )
                        ) : (
                          <div className="p-8 text-center bg-black/30 rounded-xl border border-white/5 relative z-10">
                            <span className="text-white/40 text-[10px] font-mono uppercase tracking-widest">Selecciona colores viables o un motor para cargar sinergias</span>
                          </div>
                        )}
                          
                        {totalSelectedSpells > maxSpells && (
                          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl flex items-center gap-2 relative z-10 animate-pulse">
                            <ShieldAlert className="text-red-400 shrink-0" size={16} />
                            <span className="text-[10px] text-red-200 font-sans font-bold">
                              ¡Límite de hechizos superado! Has seleccionado {totalSelectedSpells} copias obligatorias pero el mazo admite máximo {maxSpells}. Reduce copias para habilitar la forja.
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Lado Derecho: Vistazo Rápido */}
                  <div className="hidden md:block md:col-span-1">
                    <QuickGlancePanel
                      formData={formData}
                      currentArchetype={currentArchetype}
                      selectedTribeInfo={selectedTribeInfo}
                      selectedStrategyInfo={selectedStrategyInfo}
                      isCustomTribe={isCustomTribe}
                      isCustomStrategy={isCustomStrategy}
                      pseudoDeck={pseudoDeck}
                    />
                  </div>
              </div>
            )}
              {/* Curve Profile Selector Removed as per user request */}

              {/* Navigation buttons */}
              <div className="flex justify-between pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-2.5 bg-black/60 hover:bg-black text-[#ffca58] hover:text-white border border-[#ffca58]/30 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all"
                >
                  📋 Regresar
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2.5 bg-[#ffca58] border-[#ffca58] text-black hover:shadow-[0_0_15px_rgba(255,202,88,0.4)] rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-lg flex items-center gap-2"
                >
                  Siguiente Paso ➔
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full p-8 frosted-panel shadow-2xl relative space-y-6"
            >
              <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
              
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                  El Sello de Conjuración
                </h3>
                <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                  Paso 4: Define la visión creativa y las reglas personalizadas de tu ecosistema
                </p>
              </div>

              {incompatibleSeeds.length > 0 && (
                <div className="p-4 bg-amber-950/40 border border-amber-500/30 rounded-2xl flex items-start gap-3 relative z-10 animate-pulse shadow-md">
                  <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div className="flex-1 text-xs text-amber-200/90 leading-relaxed font-sans">
                    <strong className="text-amber-300 block uppercase tracking-wider mb-1">⚠️ Semillas Firma fuera de los Colores Consagrados</strong>
                    Has seleccionado semillas firma que no pertenecen a la identidad de color de tu mazo:
                    <div className="text-white font-bold font-mono mt-1.5 p-2 bg-black/40 border border-white/5 rounded-lg">
                      {incompatibleSeeds.join(', ')}
                    </div>
                    <span className="text-[11px] block mt-1.5 text-amber-400/80 italic font-semibold">➔ Se aconseja remover estas semillas o regresar al Step 3 para agregar los colores que faltan.</span>
                  </div>
                </div>
              )}

              {/* Prompts and Rules */}
              {/* Grid Responsivo de Doble Columna */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10 items-start">
                {/* Lado Izquierdo: Controles */}
                <div className="md:col-span-2 space-y-6">
                  {/* Prompts and Rules */}
                  <div className="space-y-5">
                    {/* Restricción de Rareza */}
                    <div className="space-y-3 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                      <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5 relative z-10">
                        🛡️ Restricción Global de Rareza
                      </label>
                      <p className="text-[10px] text-[#f4ece0]/60 tracking-wide leading-relaxed relative z-10 font-sans">
                        Establece el límite de rareza máximo permitido para todas las cartas propuestas e hidratadas del mazo. El Juez de Estado transmutará automáticamente las infracciones.
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 relative z-10">
                        {RARITY_MODES.map(mode => {
                          const isSelected = formData.rarityMode === mode.value;
                          return (
                            <div
                              key={mode.value}
                              onClick={() => setFormData(prev => ({ ...prev, rarityMode: mode.value }))}
                              className={cn(
                                "p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between items-start min-h-[90px] backdrop-blur-md relative overflow-hidden group",
                                isSelected
                                  ? "border-[#ffca58] bg-gradient-to-b from-[#ffca58]/15 via-black/80 to-black shadow-[0_0_12px_rgba(255,202,88,0.25)] scale-[1.02]"
                                  : "bg-black/60 border-white/10 hover:border-white/25 hover:bg-black/80 hover:scale-[1.01]"
                              )}
                            >
                              <div className="flex justify-between items-center w-full mb-1">
                                <span className="text-lg">{mode.icon}</span>
                                {isSelected && (
                                  <span className="text-[9px] font-black uppercase text-magic-gold px-1.5 py-0.5 rounded bg-magic-gold/10 border border-magic-gold/30 tracking-widest animate-pulse">
                                    Activo
                                  </span>
                                )}
                              </div>
                              <div>
                                <h4 className={cn("font-cinzel text-[10px] font-black tracking-wider transition-colors", isSelected ? "text-magic-gold" : "text-white/80")}>
                                  {mode.label}
                                </h4>
                                <p className="text-[8.5px] text-white/40 leading-tight mt-0.5 group-hover:text-white/60 transition-colors font-sans">
                                  {mode.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Explicación Mística del Modo de Rareza Activo */}
                      <div className="p-3 rounded-lg bg-black/60 border border-white/5 relative z-10 transition-all duration-300">
                        <p className="text-[10px] text-[#f4ece0]/70 font-serif leading-relaxed flex items-start gap-2">
                          <span className="text-magic-gold font-bold">↳</span>
                          <span>
                            {RARITY_MODES.find(m => m.value === formData.rarityMode)?.detail}
                          </span>
                        </p>
                      </div>
                      </div>

                      {/* Prioridad de Selección (RAG) */}
                      <div className="space-y-3 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5 relative z-10">
                          🎯 Prioridad de Selección
                        </label>
                        <p className="text-[10px] text-[#f4ece0]/60 tracking-wide leading-relaxed relative z-10 font-sans">
                          Ajusta el equilibrio algorítmico del RAG. Puedes priorizar cartas que generen combos/sinergias internas, cartas competitivas probadas en torneos, o ceñirte al prompt.
                        </p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1 relative z-10">
                          {GENERATION_PRIORITIES.map(priority => {
                            const isSelected = formData.generationPriority === priority.value;
                            return (
                              <div
                                key={priority.value}
                                onClick={() => setFormData(prev => ({ ...prev, generationPriority: priority.value }))}
                                className={cn(
                                  "p-3 rounded-xl border cursor-pointer transition-all duration-300 flex flex-col justify-between items-start min-h-[90px] backdrop-blur-md relative overflow-hidden group",
                                  isSelected
                                    ? "border-[#ffca58] bg-gradient-to-b from-[#ffca58]/15 via-black/80 to-black shadow-[0_0_12px_rgba(255,202,88,0.25)] scale-[1.02]"
                                    : "bg-black/60 border-white/10 hover:border-white/25 hover:bg-black/80 hover:scale-[1.01]"
                                )}
                              >
                                <div className="flex justify-between items-center w-full mb-1">
                                  <span className="text-lg">{priority.icon}</span>
                                  {isSelected && (
                                    <span className="text-[9px] font-black uppercase text-magic-gold px-1.5 py-0.5 rounded bg-magic-gold/10 border border-magic-gold/30 tracking-widest animate-pulse">
                                      Activo
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <h4 className={cn("font-cinzel text-[10px] font-black tracking-wider transition-colors", isSelected ? "text-magic-gold" : "text-white/80")}>
                                    {priority.label}
                                  </h4>
                                  <p className="text-[8.5px] text-white/40 leading-tight mt-0.5 group-hover:text-white/60 transition-colors font-sans font-medium">
                                    {priority.desc}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explicación Detallada de la Prioridad Activa */}
                        <div className="p-3 rounded-lg bg-black/60 border border-white/5 relative z-10 transition-all duration-300">
                          <p className="text-[10px] text-[#f4ece0]/70 font-serif leading-relaxed flex items-start gap-2">
                            <span className="text-magic-gold font-bold">↳</span>
                            <span>
                              {GENERATION_PRIORITIES.find(p => p.value === formData.generationPriority)?.detail || GENERATION_PRIORITIES[0].detail}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedFormat !== 'COMMANDER' && (
                      <div className="space-y-3 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5 relative z-10">
                          <Crown size={12} className="text-magic-gold" /> Compañero (Companion)
                        </label>
                        <p className="text-[10px] text-[#f4ece0]/60 tracking-wide leading-relaxed relative z-10 font-sans">
                          Si seleccionas a Yorion, el Juez Supremo cambiará drásticamente todas sus fórmulas matemáticas para construir una biblioteca competitiva de 80 cartas exactas.
                        </p>
                        <div 
                          onClick={() => {
                            const isYorion = formData?.companero?.toLowerCase().includes("yorion");
                            setFormData(prev => ({ ...prev, companero: isYorion ? '' : 'Yorion, Sky Nomad' }));
                          }}
                          className={cn(
                            "p-3 rounded-xl border cursor-pointer transition-all duration-300 flex items-center justify-between relative z-10",
                            formData?.companero?.toLowerCase().includes("yorion")
                              ? "border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                              : "border-white/10 bg-black/40 hover:bg-black/60 hover:border-white/30"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <img src="https://cards.scryfall.io/art_crop/front/2/7/275426c4-c14e-47d0-a9d4-24da7f6f6911.jpg?1616182288" alt="Yorion" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                            <div>
                              <span className={cn("text-xs font-bold uppercase block", formData?.companero?.toLowerCase().includes("yorion") ? "text-blue-400" : "text-white")}>
                                Yorion, Sky Nomad
                              </span>
                              <span className="text-[10px] text-gray-400 font-sans block mt-0.5">Regla Pro Tour: 80 Cartas.</span>
                            </div>
                          </div>
                          {formData?.companero?.toLowerCase().includes("yorion") && (
                            <span className="text-[10px] font-black uppercase text-blue-400 px-2 py-1 rounded bg-blue-500/20 border border-blue-500/40 tracking-widest animate-pulse">
                              Activo
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Parámetros Tácticos de Estilo de Juego */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                      
                      {/* Sub-bloque Playstyle */}
                      <div className="space-y-3 relative z-10">
                        <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
                          📈 Estilo de Redundancia
                        </label>
                        <p className="text-[9px] text-[#f4ece0]/60 leading-tight font-sans">
                          Controla la redundancia de cartas. Lineal favorece 4x copias. Adaptativo prefiere variedad de 1x/2x copias (Toolbox).
                        </p>
                        {selectedFormat === 'COMMANDER' ? (
                          <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/30 text-blue-300 text-xs font-black uppercase text-center tracking-widest shadow-sm select-none">
                            🔒 Forzado a Singleton (Commander)
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {[
                              { value: 'balanced', label: 'Equilibrado', desc: 'Sinergia balanceada estándar' },
                              { value: 'linear', label: 'Lineal (Consistente)', desc: 'Maximiza playsets de 4x' },
                              { value: 'adaptive', label: 'Adaptativo (Diversificado)', desc: 'Favorece 1-ofs (Toolbox)' }
                            ].map(opt => {
                              const isSel = formData.playstyle === opt.value;
                              return (
                                <button
                                  type="button"
                                  key={opt.value}
                                  onClick={() => setFormData(prev => ({ ...prev, playstyle: opt.value }))}
                                  className={cn(
                                    "p-2 text-left rounded-xl border text-xs transition-all duration-200",
                                    isSel 
                                      ? "border-[#ffca58] bg-[#ffca58]/10 text-white shadow-md font-bold" 
                                      : "border-white/10 bg-black/30 hover:bg-black/60 text-white/70 hover:text-white"
                                  )}
                                >
                                  <span className="block text-[10px] tracking-wide uppercase">{opt.label}</span>
                                  <span className="block text-[8px] opacity-50 font-sans mt-0.5">{opt.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Sub-bloque Stance */}
                      <div className="space-y-3 relative z-10">
                        <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] flex items-center gap-1.5">
                          ⚔️ Enfoque Táctico
                        </label>
                        <p className="text-[9px] text-[#f4ece0]/60 leading-tight font-sans">
                          Ajusta la postura del mazo. Proactivo inyecta más criaturas y amenazas. Reactivo prioriza counterspells e interacción.
                        </p>
                        <div className="flex flex-col gap-2">
                          {[
                            { value: 'balanced', label: 'Equilibrado', desc: 'Ratio recomendado estándar' },
                            { value: 'proactive', label: 'Proactivo (Agresivo)', desc: 'Más amenazas, menos interacción' },
                            { value: 'reactive', label: 'Reactivo (Controlador)', desc: 'Más interacción, menos amenazas' }
                          ].map(opt => {
                            const isSel = formData.stance === opt.value;
                            return (
                              <button
                                type="button"
                                key={opt.value}
                                onClick={() => setFormData(prev => ({ ...prev, stance: opt.value }))}
                                className={cn(
                                  "p-2 text-left rounded-xl border text-xs transition-all duration-200",
                                  isSel 
                                    ? "border-blue-500/50 bg-blue-500/10 text-white shadow-md font-bold" 
                                    : "border-white/10 bg-black/30 hover:bg-black/60 text-white/70 hover:text-white"
                                )}
                              >
                                <span className="block text-[10px] tracking-wide uppercase">{opt.label}</span>
                                <span className="block text-[8px] opacity-50 font-sans mt-0.5">{opt.desc}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Presupuesto y Restricciones Avanzadas */}
                    <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                        ⚙️ Restricciones Avanzadas de Construcción
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Límite de Presupuesto por Carta</label>
                          <select
                            value={formData.maxBudget || 'unlimited'}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxBudget: e.target.value }))}
                            className="w-full px-3 py-2 bg-black/60 border border-white/20 rounded-lg text-white text-xs focus:border-[#ffca58] focus:outline-none"
                          >
                            <option value="unlimited">Ilimitado (Sin Restricción)</option>
                            <option value="1.00">Económico (menos de $1.00 USD)</option>
                            <option value="5.00">Budget (menos de $5.00 USD)</option>
                            <option value="15.00">Semi-Competitivo (menos de $15.00 USD)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Máximo Copias Repetidas</label>
                          <input
                            type="range"
                            min={1}
                            max={4}
                            disabled={formData.singleton || selectedFormat === 'COMMANDER'}
                            value={formData.maxCopies || 4}
                            onChange={(e) => setFormData(prev => ({ ...prev, maxCopies: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-magic-gold disabled:opacity-30"
                          />
                          <span className="text-[10px] text-white/60 block mt-1 text-right">{selectedFormat === 'COMMANDER' ? '1 (Forzado por Commander)' : (formData.singleton ? '1 (Forzado Singleton)' : `${formData.maxCopies || 4} copias` )}</span>
                        </div>
                      </div>

                      {/* Estética de cartas */}
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-white/50 uppercase tracking-wider block font-bold">Estética Visual y Marcos:</span>
                        <div className="flex flex-wrap gap-4">
                          {[
                            { value: 'is:full', label: 'Arte Completo (Full Art)' },
                            { value: 'is:old', label: 'Borde Retro Clásico' },
                            { value: 'is:foil', label: 'Versiones Foil' }
                          ].map(item => {
                            const currentFilters = formData.aestheticFilters || [];
                            const isChecked = currentFilters.includes(item.value);
                            return (
                              <label key={item.value} className="text-[10px] text-white/70 cursor-pointer flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    const nextFilters = e.target.checked
                                      ? [...currentFilters, item.value]
                                      : currentFilters.filter(f => f !== item.value);
                                    setFormData(prev => ({ ...prev, aestheticFilters: nextFilters }));
                                  }}
                                  className="rounded border-white/20 bg-black text-[#ffca58] focus:ring-0"
                                />
                                <span>{item.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Enfoque del Sideboard */}
                    {selectedFormat !== 'COMMANDER' && (
                      <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5 relative z-10">
                          🛡️ Enfoque del Sideboard (Banquillo)
                        </label>
                        <p className="text-[9px] text-[#f4ece0]/60 leading-tight font-sans relative z-10">
                          Selecciona contra qué estrategias quieres prepararte en tu banquillo de 15 cartas. La IA inyectará respuestas y odio específicos.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 relative z-10">
                          {[
                            { id: 'graveyard', label: 'Anti-Cementerio 💀', desc: 'RIP, Criptas, Leylines' },
                            { id: 'control', label: 'Anti-Control 🛡️', desc: 'Veil, Veto, Counters' },
                            { id: 'aggro', label: 'Anti-Aggro 🌋', desc: 'Sweepers, Life Gain' },
                            { id: 'combo', label: 'Anti-Combo/Stax ⛓️', desc: 'Spheres, Agujas' }
                          ].map(focus => {
                            const list = formData.sideboardFocus || [];
                            const isChecked = list.includes(focus.id);
                            return (
                              <div
                                key={focus.id}
                                onClick={() => {
                                  const next = isChecked ? list.filter(id => id !== focus.id) : [...list, focus.id];
                                  setFormData(prev => ({ ...prev, sideboardFocus: next }));
                                }}
                                className={cn(
                                  "p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between text-left",
                                  isChecked
                                    ? "border-[#ffca58] bg-[#ffca58]/10 text-white"
                                    : "border-white/10 bg-black/35 hover:bg-black/50 text-white/70"
                                )}
                              >
                                <div>
                                  <span className="block text-[10px] font-bold uppercase">{focus.label}</span>
                                  <span className="block text-[8px] opacity-50 font-sans mt-0.5">{focus.desc}</span>
                                </div>
                                <div className="flex justify-end w-full mt-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    readOnly
                                    className="rounded border-white/20 bg-black text-[#ffca58] focus:ring-0"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Ajustes de Inteligencia Artificial (IA) */}
                    <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                        🔮 Parámetros del Motor de IA (Gemini)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Creatividad / "Jankiness"</label>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={formData.creativity || 50}
                            onChange={(e) => setFormData(prev => ({ ...prev, creativity: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-magic-gold"
                          />
                          <div className="flex justify-between text-[9px] text-white/40 mt-1">
                            <span>Meta Estable (0)</span>
                            <span className="text-magic-gold font-bold">{formData.creativity || 50}%</span>
                            <span>Wild Jank (100)</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-white/40 mb-1.5 block">Modelo de Lenguaje</label>
                          <div className="flex gap-2">
                            {[
                              { id: 'flash', label: 'Gemini Flash', desc: 'Rápido' },
                              { id: 'pro', label: 'Gemini Pro', desc: 'Complejo/Profundo' }
                            ].map(m => {
                              const isSelected = (formData.selectedModel || 'flash') === m.id;
                              return (
                                <button
                                  type="button"
                                  key={m.id}
                                  onClick={() => setFormData(prev => ({ ...prev, selectedModel: m.id }))}
                                  className={cn(
                                    "flex-1 p-2 rounded-xl border text-center transition-all duration-200",
                                    isSelected
                                      ? "border-magic-gold bg-magic-gold/10 text-magic-gold shadow-md font-bold"
                                      : "border-white/10 bg-black/40 text-white/60 hover:text-white"
                                  )}
                                >
                                  <span className="block text-[10px] uppercase tracking-wider">{m.label}</span>
                                  <span className="block text-[8px] opacity-40">{m.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Paquetes Core Integrados (Skeletons) */}
                    <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                        📦 Paquetes Core Fijos (DNA Skeletons)
                      </label>
                      <p className="text-[9px] text-[#f4ece0]/60 leading-tight font-sans">
                        Marca los paquetes indispensables. La IA los inyectará y adaptará el resto de la baraja para hacerles espacio de manera equilibrada.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {[
                          { id: 'mana_lands', label: 'Fetch & Shock Lands', desc: 'Base de maná óptima y equilibrada' },
                          { id: 'cantrips', label: 'Pack Cantrips Azules', desc: 'Brainstorm, Ponder, Preordain' },
                          { id: 'removal', label: 'Remoción Eficiente', desc: 'Lightning Bolt, Path, Push' },
                          { id: 'discard', label: 'Interrupción Negra', desc: 'Thoughtseize, Inquisition' }
                        ].map(pkg => {
                          const list = formData.selectedCorePackages || [];
                          const isChecked = list.includes(pkg.id);
                          return (
                            <div
                              key={pkg.id}
                              onClick={() => {
                                const next = isChecked ? list.filter(id => id !== pkg.id) : [...list, pkg.id];
                                setFormData(prev => ({ ...prev, selectedCorePackages: next }));
                              }}
                              className={cn(
                                "p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-left",
                                isChecked
                                  ? "border-[#ffca58] bg-[#ffca58]/10 text-white"
                                  : "border-white/10 bg-black/35 hover:bg-black/50 text-white/70"
                              )}
                            >
                              <div>
                                <span className="block text-[10px] font-bold uppercase">{pkg.label}</span>
                                <span className="block text-[8px] opacity-50 font-sans mt-0.5">{pkg.desc}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                readOnly
                                className="rounded border-white/20 bg-black text-[#ffca58] focus:ring-0"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Checkbox de Baneables Frecuentes */}
                    <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                      <label className="block text-red-400 text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                        🚫 Prohibiciones Rápidas del Oráculo (Banlist Checklist)
                      </label>
                      <p className="text-[9px] text-[#f4ece0]/60 leading-tight font-sans">
                        Banea instantáneamente del catálogo local las cartas más opresivas de Magic con un solo clic.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                        {(() => {
                          const banCandidates = {
                            COMMANDER: [
                              { name: 'Mana Crypt', label: 'Mana Crypt 💀' },
                              { name: 'Jeweled Lotus', label: 'Jeweled Lotus 🌸' },
                              { name: 'Dockside Extortionist', label: 'Dockside 🦎' },
                              { name: 'Nadu, Winged Wisdom', label: 'Nadu 🐦' }
                            ],
                            MODERN: [
                              { name: 'Grief', label: 'Grief 👤' },
                              { name: 'Fury', label: 'Fury 🔥' },
                              { name: 'Nadu, Winged Wisdom', label: 'Nadu 🐦' },
                              { name: 'Violent Outburst', label: 'Outburst 🌪️' },
                              { name: 'Sol Ring', label: 'Sol Ring 💍' },
                              { name: 'Mana Crypt', label: 'Mana Crypt 💀' }
                            ],
                            PIONEER: [
                              { name: 'Fable of the Mirror-Breaker', label: 'Fable 👺' },
                              { name: 'Karn, the Great Creator', label: 'Karn 🤖' },
                              { name: 'Geological Appraiser', label: 'Appraiser ⛏️' },
                              { name: 'Smuggler\'s Copter', label: 'Looter Copter 🚁' }
                            ],
                            LEGACY: [
                              { name: 'Grief', label: 'Grief 👤' },
                              { name: 'Ragavan, Nimble Pilferer', label: 'Ragavan 🐒' },
                              { name: 'Sol Ring', label: 'Sol Ring 💍' },
                              { name: 'Mana Crypt', label: 'Mana Crypt 💀' },
                              { name: 'Deathrite Shaman', label: 'Deathrite ☠️' }
                            ],
                            STANDARD: [
                              { name: 'Fable of the Mirror-Breaker', label: 'Fable 👺' },
                              { name: 'Invoke Despair', label: 'Invoke Despair 🌪️' },
                              { name: 'The Meathook Massacre', label: 'Meathook 🪝' }
                            ]
                          };
                          return banCandidates[selectedFormat] || banCandidates.MODERN;
                        })().map(ban => {
                          const list = formData.predefinedBanned || [];
                          const isChecked = list.includes(ban.name);
                          return (
                            <button
                              type="button"
                              key={ban.name}
                              onClick={() => {
                                const next = isChecked ? list.filter(n => n !== ban.name) : [...list, ban.name];
                                const nextVetoed = isChecked 
                                  ? vetoedCards.filter(n => n !== ban.name)
                                  : [...vetoedCards, ban.name];
                                
                                setFormData(prev => ({ ...prev, predefinedBanned: next }));
                                setVetoedCards(nextVetoed);
                              }}
                              className={cn(
                                "p-2 rounded-lg border text-center text-[10px] font-bold transition-all truncate",
                                isChecked
                                  ? "border-red-500 bg-red-950/20 text-red-200"
                                  : "border-white/10 bg-black/40 hover:bg-black/60 text-white/70"
                              )}
                            >
                              {ban.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[#ffca58] text-xs font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-1.5">
                        <Sparkles size={12} className="text-magic-gold animate-pulse" /> Visión Creativa / Temática
                      </label>
                      <textarea
                        value={formData.prompt}
                        onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Ej: 'Un mazo de vampiros y aristócratas letales que sacrifican a sus siervos para drenar vidas desde las sombras.'"
                        rows={3}
                        className="w-full px-3 py-2 bg-black border border-white/35 rounded-xl text-white placeholder-white/40 text-xs font-medium focus:border-[#ffca58] focus:shadow-[0_0_10px_rgba(255,202,88,0.2)] focus:outline-none transition-all resize-none font-serif"
                      />
                    </div>

                    {/* Universes Beyond & Custom Cards Toggle */}
                    <div className="flex items-center justify-between gap-4 bg-black/55 p-4 rounded-xl border border-purple-500/30 relative overflow-hidden group mb-4 shadow-[0_0_15px_rgba(168,85,247,0.1)]">
                      <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <div className="relative z-10 space-y-1">
                        <label className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider">
                          <Globe size={14} className="text-purple-400 animate-pulse" /> Ediciones Universes Beyond (Crossovers) & Custom
                        </label>
                        <p className="text-[10px] text-[#f4ece0]/60 tracking-wider font-serif">
                          Incluye o excluye expansiones crossover oficiales (El Señor de los Anillos, Fallout, Final Fantasy, Marvel, Doctor Who, Warhammer 40k, etc.). Desactívalo si buscas estricta fidelidad al MTG clásico.
                        </p>
                      </div>
                      <label className="relative z-10 flex items-center gap-2 cursor-pointer select-none shrink-0">
                        <input
                          type="checkbox"
                          checked={!!formData.allowCustomCards}
                          onChange={(e) => {
                            vibrateTouch();
                            setFormData(prev => ({ 
                              ...prev, 
                              allowCustomCards: e.target.checked
                            }));
                          }}
                          className="sr-only"
                        />
                        <div className={cn("w-10 h-5 rounded-full transition-all relative border", formData.allowCustomCards ? "bg-purple-900/80 border-purple-400" : "bg-white/10 border-white/20")}>
                          <div className={cn("absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all shadow-md", formData.allowCustomCards ? "bg-purple-300 translate-x-5" : "bg-white/60 translate-x-0")} />
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Lado Izquierdo: Cartas Firma (Semillas) */}
                      <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider relative z-10">
                          <span className="flex items-center gap-1.5"><PlusCircle size={14} /> Cartas Firma Obligatorias (Semillas)</span>
                          <span className={cn("text-[9px] font-mono", totalSelectedSpells > maxSpells ? "text-red-400 font-extrabold" : "text-white/40")}>
                            {totalSelectedSpells} / {maxSpells}
                          </span>
                        </label>
                        
                        {/* Buscador Autocompletable */}
                        <div className="relative z-10">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                            <input
                              type="text"
                              value={seedSearchQuery}
                              onChange={(e) => setSeedSearchQuery(e.target.value)}
                              placeholder="Buscar cartas firma legales..."
                              className="w-full pl-9 pr-4 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-medium focus:border-emerald-500 focus:outline-none"
                            />
                          </div>
                          
                          {seedSearchResults.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-black/95 border border-white/15 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                              {seedSearchResults.map(card => (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => {
                                    const current = seedCards[card.name] || 0;
                                    if (current < 4 && totalSelectedSpells < maxSpells) {
                                      setSeedCards(prev => ({ ...prev, [card.name]: current + 1 }));
                                    }
                                    setSeedSearchQuery('');
                                    setSeedSearchResults([]);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs text-white hover:bg-emerald-500/20 hover:text-[#ffca58] transition-colors border-b border-white/5 flex items-center justify-between"
                                >
                                  <span>{card.name}</span>
                                  <RenderManaCost manaCost={card.mana_cost} className="text-[10px]" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Lista de Semillas Seleccionadas */}
                        <div className="flex flex-wrap gap-2 pt-2 relative z-10 max-h-[140px] overflow-y-auto">
                          {Object.keys(seedCards).length === 0 ? (
                            <span className="text-[9.5px] text-white/30 font-mono uppercase tracking-widest py-2">Sin semillas obligatorias</span>
                          ) : (
                            Object.entries(seedCards).map(([cardName, copies]) => (
                              <div 
                                key={cardName} 
                                className="px-2 py-1 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 rounded-lg text-[10.5px] font-sans font-semibold flex items-center gap-1.5 shadow-md"
                              >
                                <span>{cardName}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleSeedPriority(cardName)}
                                  className={cn(
                                    "px-1 py-0.5 rounded text-[8px] font-bold uppercase transition-all",
                                    seedPriorities[cardName] === 'high'
                                      ? "bg-red-500/20 text-red-300 border border-red-500/30 shadow-[0_0_6px_rgba(239,68,68,0.25)]"
                                      : "bg-white/5 text-white/50 border border-white/10 hover:text-white"
                                  )}
                                  title="Alternar prioridad de la semilla"
                                >
                                  {seedPriorities[cardName] === 'high' ? '🔴 ALTA' : '🟡 MED'}
                                </button>
                                <div className="flex items-center gap-1 bg-black/40 px-1 py-0.5 rounded border border-white/5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSeedCards(prev => {
                                        const next = { ...prev };
                                        if (copies === 1) {
                                          delete next[cardName];
                                        } else {
                                          next[cardName] = copies - 1;
                                        }
                                        return next;
                                      });
                                    }}
                                    className="text-[9px] hover:text-[#ffca58] w-3 h-3 flex items-center justify-center font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="text-[10px] font-black font-mono text-white/80">{copies}</span>
                                  <button
                                    type="button"
                                    disabled={copies === 4 || totalSelectedSpells >= maxSpells}
                                    onClick={() => {
                                      setSeedCards(prev => ({ ...prev, [cardName]: copies + 1 }));
                                    }}
                                    className="text-[9px] hover:text-[#ffca58] disabled:opacity-20 disabled:hover:text-emerald-400 w-3 h-3 flex items-center justify-center font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSeedCards(prev => {
                                      const next = { ...prev };
                                      delete next[cardName];
                                      return next;
                                    });
                                  }}
                                  className="text-red-400 hover:text-red-300 ml-1 font-bold text-[9px]"
                                >
                                  ✕
                                </button>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Preview Visual de Semillas */}
                        {Object.keys(seedCards).length > 0 && (
                          <div className="mt-4 pt-3 border-t border-white/10 space-y-2 relative z-10">
                            <span className="text-[10px] text-white/40 uppercase tracking-widest font-sans font-bold block">Preview Visual:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto p-1">
                              {Object.entries(seedCards).map(([cardName, copies]) => {
                                const cardObj = allCards.find(c => c.name.toLowerCase() === cardName.toLowerCase());
                                const displayCard = cardObj || { name: cardName, type_line: 'Hechizo', mana_cost: '' };
                                return (
                                  <div
                                    key={cardName}
                                    onMouseEnter={() => setHoveredCard(cardObj || null)}
                                    onMouseLeave={() => setHoveredCard(null)}
                                    className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex flex-col justify-between min-h-[85px] group hover:bg-emerald-950/20 transition-all duration-300"
                                  >
                                    <div>
                                      <div className="flex justify-between items-start gap-1">
                                        <span className="font-cinzel text-[10px] font-bold text-white group-hover:text-emerald-300 transition-colors leading-tight truncate w-full" title={displayCard.name}>
                                          {displayCard.name}
                                        </span>
                                        {displayCard.mana_cost && (
                                          <RenderManaCost manaCost={displayCard.mana_cost} className="shrink-0 select-none" />
                                        )}
                                      </div>
                                      <span className="text-[7.5px] text-white/45 font-sans block mt-0.5 truncate uppercase tracking-widest">
                                        {displayCard.type_line?.split('—')[0].trim()}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                                      <button
                                        type="button"
                                        onClick={() => toggleSeedPriority(cardName)}
                                        className={cn(
                                          "text-[8.5px] font-bold px-1.5 py-0.5 rounded border transition-colors",
                                          seedPriorities[cardName] === 'high'
                                            ? "bg-red-500/20 border-red-500/30 text-red-300"
                                            : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                                        )}
                                        title="Alternar prioridad de la semilla"
                                      >
                                        {seedPriorities[cardName] === 'high' ? '🔴 ALTA' : '🟡 NORMAL'}
                                      </button>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSeedCards(prev => {
                                              const next = { ...prev };
                                              if (copies === 1) {
                                                delete next[cardName];
                                              } else {
                                                next[cardName] = copies - 1;
                                              }
                                              return next;
                                            });
                                          }}
                                          className="w-4 h-4 rounded-full flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:text-black text-white/60 text-[10px] font-bold"
                                        >
                                          -
                                        </button>
                                        <span className="text-[10px] font-black text-white w-3 text-center">{copies}</span>
                                        <button
                                          type="button"
                                          disabled={copies === 4 || totalSelectedSpells >= maxSpells}
                                          onClick={() => {
                                            setSeedCards(prev => ({ ...prev, [cardName]: copies + 1 }));
                                          }}
                                          className="w-4 h-4 rounded-full flex items-center justify-center border border-white/10 hover:bg-emerald-500 hover:text-black text-white/60 text-[10px] font-bold disabled:opacity-20"
                                        >
                                          +
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Lado Derecho: Vetos y Exclusiones */}
                      <div className="space-y-4 bg-black/45 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider relative z-10">
                          <MinusCircle size={14} /> Vetos Mecánicos y de Cartas
                        </label>
                        
                        {/* A. Veto de Palabras Clave */}
                        <div className="space-y-1.5 relative z-10">
                          <span className="text-[8.5px] text-white/40 uppercase tracking-widest font-sans font-bold">Veto de Conceptos / Palabras Clave</span>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              id="tuner-keyword-input"
                              placeholder="Ej: amass, poison, infect, zombie..."
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = e.target.value.trim().toLowerCase();
                                  if (val && !vetoedKeywords.includes(val)) {
                                    setVetoedKeywords(prev => [...prev, val]);
                                  }
                                  e.target.value = '';
                                }
                              }}
                              className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-medium focus:border-red-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.getElementById('tuner-keyword-input');
                                const val = input.value.trim().toLowerCase();
                                if (val && !vetoedKeywords.includes(val)) {
                                  setVetoedKeywords(prev => [...prev, val]);
                                }
                                input.value = '';
                              }}
                              className="px-3 bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 rounded-lg text-xs font-bold uppercase transition-colors"
                            >
                              Añadir
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-1.5">
                            {vetoedKeywords.length === 0 ? (
                              <span className="text-[8.5px] text-white/30 font-mono">Sin palabras clave excluidas</span>
                            ) : (
                              vetoedKeywords.map(kw => (
                                <span key={kw} className="px-2 py-0.5 bg-red-950/40 border border-red-500/30 text-red-400 text-[9.5px] rounded-lg font-sans font-semibold flex items-center gap-1 shadow-sm">
                                  {kw}
                                  <button type="button" onClick={() => setVetoedKeywords(prev => prev.filter(k => k !== kw))} className="text-red-400/60 hover:text-red-300 font-bold ml-0.5">✕</button>
                                </span>
                              ))
                            )}
                          </div>

                          {/* Chips de Veto Rápido */}
                          <div className="flex flex-wrap gap-1 pt-2">
                            {[
                              { id: 'infect', label: '☣️ Infect/Veneno' },
                              { id: 'annihilator', label: '🪐 Aniquilador' },
                              { id: 'destroy all lands', label: '💥 Destruir Tierras' },
                              { id: 'extra turn', label: '⏱ Turnos Extra' },
                              { id: 'monarch', label: '👑 Monarca' },
                              { id: 'initiative', label: '⚔️ Iniciativa' }
                            ].map(kw => {
                              const isVetoed = vetoedKeywords.includes(kw.id);
                              return (
                                <button
                                  type="button"
                                  key={kw.id}
                                  onClick={() => {
                                    vibrateTouch();
                                    if (isVetoed) {
                                      setVetoedKeywords(prev => prev.filter(k => k !== kw.id));
                                    } else {
                                      setVetoedKeywords(prev => [...prev, kw.id]);
                                    }
                                  }}
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[8.5px] font-bold uppercase transition-all border",
                                    isVetoed
                                      ? "bg-red-500/20 border-red-500/30 text-red-300 shadow-[0_0_6px_rgba(239,68,68,0.25)]"
                                      : "bg-white/5 border-white/10 text-white/50 hover:text-white"
                                  )}
                                  title={isVetoed ? 'Quitar veto' : 'Vetar concepto de todo el mazo'}
                                >
                                  {kw.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* B. Veto de Cartas Específicas */}
                        <div className="space-y-1.5 relative z-10">
                          <span className="text-[8.5px] text-white/40 uppercase tracking-widest font-sans font-bold">Prohibir Cartas Específicas</span>
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/40" />
                            <input
                              type="text"
                              value={vetoSearchQuery}
                              onChange={(e) => setVetoSearchQuery(e.target.value)}
                              placeholder="Buscar cartas a vetar..."
                              className="w-full pl-9 pr-4 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-medium focus:border-red-500 focus:outline-none"
                            />
                          </div>

                          {vetoSearchResults.length > 0 && (
                            <div className="absolute left-0 right-0 mt-1 bg-black/95 border border-white/15 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                              {vetoSearchResults.map(card => (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => {
                                    if (!vetoedCards.includes(card.name)) {
                                      setVetoedCards(prev => [...prev, card.name]);
                                    }
                                    setVetoSearchQuery('');
                                    setVetoSearchResults([]);
                                  }}
                                  className="w-full px-4 py-2 text-left text-xs text-white hover:bg-red-500/20 hover:text-[#ffca58] transition-colors border-b border-white/5"
                                >
                                  {card.name}
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5 pt-1.5 max-h-[80px] overflow-y-auto">
                            {vetoedCards.length === 0 ? (
                              <span className="text-[8.5px] text-white/30 font-mono">Sin cartas prohibidas</span>
                            ) : (
                              vetoedCards.map(cardName => (
                                <span key={cardName} className="px-2 py-0.5 bg-red-950/40 border border-red-500/30 text-red-400 text-[9.5px] rounded-lg font-sans font-semibold flex items-center gap-1 shadow-sm">
                                  {cardName}
                                  <button type="button" onClick={() => setVetoedCards(prev => prev.filter(c => c !== cardName))} className="text-red-400/60 hover:text-red-300 font-bold ml-0.5">✕</button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Lado Derecho: Vistazo Rápido */}
                <div className="hidden md:block md:col-span-1">
                  <QuickGlancePanel
                    formData={formData}
                    currentArchetype={currentArchetype}
                    selectedTribeInfo={selectedTribeInfo}
                    selectedStrategyInfo={selectedStrategyInfo}
                    isCustomTribe={isCustomTribe}
                    isCustomStrategy={isCustomStrategy}
                    pseudoDeck={pseudoDeck}
                  />
                </div>
              </div>

              {/* Resumen Final de la Invocación */}
              <div className="border border-magic-gold/30 bg-black/50 rounded-2xl overflow-hidden shadow-lg w-full relative z-10">
                <button
                  type="button"
                  onClick={() => setIsSummaryOpen(!isSummaryOpen)}
                  className="w-full px-5 py-3.5 bg-gradient-to-r from-black/85 to-black/30 flex items-center justify-between text-left border-b border-white/10 hover:bg-black/90 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="text-magic-gold w-4 h-4 animate-pulse" />
                    <h4 className="font-cinzel text-xs font-black uppercase tracking-[0.15em] text-[#ffca58]">
                      Resumen de la Invocación
                    </h4>
                  </div>
                  <span className="text-magic-gold text-[10px] font-bold">{isSummaryOpen ? '▲ OCULTAR' : '▼ MOSTRAR'}</span>
                </button>
                
                <AnimatePresence>
                  {isSummaryOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="p-4 overflow-hidden border-t border-white/5 space-y-4 text-xs font-sans"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Estructura Base</span>
                          <p className="text-white/80"><strong className="text-magic-gold font-bold">Arquetipo:</strong> {currentArchetype?.label || 'Eldrazi/Otro'}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <strong className="text-magic-gold font-bold">Colores:</strong>
                            <div className="flex gap-0.5">
                              {(formData.colores || []).map(c => (
                                <div key={c} className="w-3.5 h-3.5 rounded-full overflow-hidden border border-black/55 shadow-inner" title={COLORS.find(co => co.id === c)?.name}>
                                  <img src={COLORS.find(co => co.id === c)?.icon} alt={c} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                          {formData.tribe && <p className="text-white/80 mt-1"><strong className="text-magic-gold font-bold">Tribu:</strong> {formData.tribe}</p>}
                          {formData.strategy && <p className="text-white/80"><strong className="text-magic-gold font-bold">Motor:</strong> {formData.strategy}</p>}
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Reglas de Conjuración</span>
                          <p className="text-white/80"><strong className="text-magic-gold font-bold">Tamaño Mazo:</strong> {formData.deckSize} cartas</p>
                          <p className="text-white/80"><strong className="text-magic-gold font-bold">Banquillo:</strong> {formData.sideboardSize} cartas</p>
                          <p className="text-white/80">
                            <strong className="text-magic-gold font-bold">Singleton:</strong> {formData.singleton ? '✅ Sí (Forzado)' : '❌ No'}
                          </p>
                          <p className="text-white/80">
                            <strong className="text-magic-gold font-bold">Compañero:</strong> {formData.companero ? '🐉 Yorion' : 'Ninguno'}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block">Detalles Técnicos</span>
                          <p className="text-white/80"><strong className="text-magic-gold font-bold">Rareza Máx:</strong> {formData.rarityMode}</p>
                          <p className="text-white/80"><strong className="text-magic-gold font-bold">Personalidad (Creatividad):</strong> {formData.creativity}%</p>
                          <p className="text-white/80">
                            <strong className="text-magic-gold font-bold">Semillas Firma:</strong> {Object.keys(seedCards).length} cartas ({totalSelectedSpells} copias)
                          </p>
                          <p className="text-white/80">
                            <strong className="text-magic-gold font-bold">Vetos:</strong> {vetoedCards.length} cartas, {vetoedKeywords.length} palabras clave
                          </p>
                        </div>
                      </div>
                      
                      {formData.prompt && (
                        <div className="p-2.5 bg-black/30 border border-white/5 rounded-lg">
                          <span className="text-[9px] uppercase tracking-wider text-white/40 font-bold block mb-1">Visión Creativa</span>
                          <p className="text-white/80 italic font-serif">"{formData.prompt}"</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation and Final Button */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/10 relative z-10">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-black/60 hover:bg-black text-[#ffca58] hover:text-white border border-[#ffca58]/30 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all"
                >
                  📋 Regresar
                </button>

                <button
                  type="submit"
                  disabled={isLoading || disabled || !isFormValid}
                  className={cn(
                    "w-full sm:w-auto btn-asset py-3 px-8 transition-all duration-300",
                    (!isFormValid || isLoading || disabled) && "opacity-50 cursor-not-allowed pointer-events-none filter grayscale border-white/15 bg-stone-900"
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-3 text-stone-engraved animate-pulse text-sm">
                      <span className="w-4 h-4 border-2 border-[#ffca58]/30 border-t-[#ffca58] rounded-full animate-spin" />
                      Invocando IA...
                    </span>
                  ) : (
                    <span className="text-stone-engraved uppercase tracking-[0.15em] text-sm md:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] font-black">
                      🔥 Conjuración Final (Forjar)
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Visual Hover Preview Card Overlay */}
      <AnimatePresence>
        {hoveredCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-64 p-3 bg-black/90 border border-magic-gold/30 rounded-2xl shadow-[0_0_30px_rgba(255,202,88,0.25)] backdrop-blur-md overflow-hidden"
          >
            <div className="relative w-full h-full">
              {/* Card Image */}
              <img 
                src={getCardImageUrl(hoveredCard)} 
                alt={hoveredCard.name} 
                onClick={() => {
                  if (hoveredCard.card_faces) {
                    setFlipStates(prev => ({
                      ...prev,
                      [hoveredCard.id]: (prev[hoveredCard.id] || 0) === 0 ? 1 : 0
                    }));
                  }
                }}
                className={cn(
                  "w-full h-auto rounded-xl shadow-lg border border-white/10 select-none block",
                  hoveredCard.card_faces ? "cursor-pointer hover:ring-2 hover:ring-[#ffca58]" : ""
                )}
              />
              
              {/* Extra details on hover preview */}
              <div className="mt-2.5 space-y-1">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-cinzel font-black text-[#ffca58] truncate max-w-[160px]">
                    {hoveredCard.name}
                  </span>
                  <RenderManaCost manaCost={hoveredCard.mana_cost} className="text-[10px]" />
                </div>
                <p className="text-[8.5px] text-[#f4ece0]/65 font-serif leading-relaxed line-clamp-3">
                  {hoveredCard.oracle_text || 'Sin texto de reglas.'}
                </p>
                {hoveredCard.card_faces && (
                  <div className="pt-1.5 flex justify-center">
                    <span className="text-[8px] bg-white/10 hover:bg-white/20 text-[#ffca58] px-2 py-0.5 rounded-full border border-white/15 cursor-pointer uppercase tracking-widest font-black" onClick={() => {
                      setFlipStates(prev => ({
                        ...prev,
                        [hoveredCard.id]: (prev[hoveredCard.id] || 0) === 0 ? 1 : 0
                      }));
                    }}>
                      🔄 Girar Carta (MDFC)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Quick Glance FAB and BottomSheet */}
      {isMobile && currentArchetype && (
        <>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => {
              vibrateTouch();
              setShowMobileGlance(true);
            }}
            className="fixed bottom-24 right-4 z-40 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50 active:scale-95 cursor-pointer"
          >
            <Scroll size={24} className="text-black" />
          </motion.button>

          <BottomSheet
            isOpen={showMobileGlance}
            onClose={() => setShowMobileGlance(false)}
            title="Vistazo del Ecosistema"
          >
            <div className="pb-8">
              <QuickGlancePanel
                formData={formData}
                currentArchetype={currentArchetype}
                selectedTribeInfo={selectedTribeInfo}
                selectedStrategyInfo={selectedStrategyInfo}
                isCustomTribe={isCustomTribe}
                isCustomStrategy={isCustomStrategy}
                pseudoDeck={pseudoDeck}
              />
            </div>
          </BottomSheet>
        </>
      )}
    </div>
  );
}