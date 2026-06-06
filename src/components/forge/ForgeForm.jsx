import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Sparkles, Swords, Shield, Zap, Flame, Crown, BookOpen, Search, Check, Plus, AlertCircle, Wand2, Compass, PlusCircle, MinusCircle, Scroll, TrendingUp, Lock, Unlock } from 'lucide-react';

import { BATTLEBOX_BANLIST, BATTLEBOX_ARCHETYPES, getBattleBoxFormatName, BATTLEBOX_FORMAT_NAME, MTG_TRIBES, MTG_STRATEGIES, TRIBE_CATEGORIES, COLORS } from '../../constants/legacyBattleBox';
import ManaOrb from '../atoms/ManaOrb';
import { getDynamicArchetypes } from '../../services/ragService';

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

const LEGACY_ARCHETYPES = BATTLEBOX_ARCHETYPES.map(a => ({
  value: a.id,
  label: a.label.split('(')[0].trim(),
  landCount: a.landCount,
  recommendedColors: a.recommendedColors,
  speed: a.speed,
  winTurn: a.winTurn,
  colorHint: `Velocidad: ${a.speed} • Victoria: Turno ${a.winTurn}`,
  description: a.description,
  formats: ['MODERN', 'STANDARD'],
  colorGroup: 'generic'
}));

// Definiciones de tabs de grupo de color
const COLOR_GROUP_TABS = [
  { id: 'generic', label: 'Universales', icon: '⚙️', desc: 'Arquetipos base' },
  { id: 'mono', label: 'Mono-Color', icon: '🔮', desc: '1 color' },
  { id: 'bicolor', label: 'Bicolor', icon: '⚔️', desc: 'Gremios' },
  { id: 'tricolor', label: 'Tricolor', icon: '🌀', desc: 'Shards/Clanes' },
  { id: 'multicolor', label: '4-5 Colores', icon: '👑', desc: 'Multicolor' }
];

// Componente Premium: Vistazo Rápido de tu Ecosistema
function QuickGlancePanel({ formData, currentArchetype, selectedTribeInfo, selectedStrategyInfo, isCustomTribe, isCustomStrategy }) {
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

  // Generar la prosa evocadora
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

export default function ForgeForm({ onSubmit, isLoading, disabled, error, lastGenerationLogs, onOpenOracleLog, selectedFormat = 'MODERN', onFormatChange }) {
  const [formData, setFormData] = useState(() => {
    let savedRarity = 'high-power';
    try {
      const savedConfig = localStorage.getItem('mtg_ai_config_forge') || localStorage.getItem('mtg_forge_ai_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        if (parsed.rarityMode) savedRarity = parsed.rarityMode;
      }
    } catch (e) {}

    return {
      formato: 'legacy-battlebox',
      archetype: '',
      colores: [],
      tribe: '',
      strategy: '',
      curveProfile: 'balanced',
      prompt: '',
      mustInclude: '',
      customBanlist: '',
      rarityMode: savedRarity,
    };
  });

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

  useEffect(() => {
    const loadDynamic = async () => {
      try {
        const dynamicArchs = await getDynamicArchetypes();
        if (dynamicArchs && dynamicArchs.length > 0) {
          // Filtrar duplicados por el campo 'value'
          const existingValues = new Set(LEGACY_ARCHETYPES.map(a => a.value));
          const filteredDynamic = dynamicArchs.filter(a => !existingValues.has(a.value));
          setArchetypesList([...LEGACY_ARCHETYPES, ...filteredDynamic]);
          console.log(`📊 [ForgeForm] Fusionados ${filteredDynamic.length} arquetipos dinámicos RAG.`);
        }
      } catch (err) {
        console.warn("⚠️ [ForgeForm] Fallo al cargar arquetipos dinámicos. Usando fallback seguro:", err);
      }
    };
    loadDynamic();
  }, []);

  const [isCustomTribe, setIsCustomTribe] = useState(false);
  const [isCustomStrategy, setIsCustomStrategy] = useState(false);
  const [activeTribeTab, setActiveTribeTab] = useState('clasica');
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [activeColorTab, setActiveColorTab] = useState('generic');
  const [searchQuery, setSearchQuery] = useState('');

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
    setErrors(prev => ({ ...prev, colores: null }));
    
    // Auto-avance místico inteligente (Piloto Automático)
    setTimeout(() => {
      if (isDynamic) {
        setCurrentStep(4); // Si es un mazo Meta/Dinámico, salta directo al final con todo rellenado
      } else {
        setCurrentStep(2); // Flujo normal para arquetipos genéricos
      }
    }, 450);
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
      onSubmit(formData);
    }
  };

  const currentArchetype = useMemo(() => {
    return archetypesList.find(a => a.value === formData.archetype);
  }, [archetypesList, formData.archetype]);

  const selectedTribeInfo = useMemo(() => {
    if (!formData.tribe || isCustomTribe) return null;
    return MTG_TRIBES.find(t => t.label === formData.tribe);
  }, [formData.tribe, isCustomTribe]);

  const selectedStrategyInfo = useMemo(() => {
    if (!formData.strategy || isCustomStrategy) return null;
    return MTG_STRATEGIES.find(s => s.label === formData.strategy);
  }, [formData.strategy, isCustomStrategy]);

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

  // Si cambia el arquetipo, reseteamos tribu y estrategia
  useEffect(() => {
    setFormData(prev => ({ ...prev, tribe: '', strategy: '' }));
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
    if (formData.archetype) {
      // 1. Si no hay tribu seleccionada, pero solo hay una tribu compatible habilitada
      const activeCompatibleTribes = availableTribes.filter(isTribeCompatible);
      if (!formData.tribe && !isCustomTribe && activeCompatibleTribes.length === 1) {
        setFormData(prev => ({ ...prev, tribe: activeCompatibleTribes[0].label }));
      }
      
      // 2. Si no hay estrategia seleccionada, pero solo hay una estrategia compatible habilitada
      const activeCompatibleStrats = availableStrategies.filter(isStrategyCompatible);
      if (!formData.strategy && !isCustomStrategy && activeCompatibleStrats.length === 1) {
        setFormData(prev => ({ ...prev, strategy: activeCompatibleStrats[0].label }));
      }
    }
  }, [
    formData.archetype, 
    formData.tribe, 
    formData.strategy, 
    isCustomTribe, 
    isCustomStrategy, 
    availableTribes, 
    availableStrategies, 
    isTribeCompatible, 
    isStrategyCompatible
  ]);



  useEffect(() => {
    const { allowed = [], primary = [] } = allowedColorsInfo || {};
    
    setFormData(prev => {
      // Si todos los colores están permitidos, no es necesario validar
      if (allowed.includes('W') && allowed.includes('U') && allowed.includes('B') && allowed.includes('R') && allowed.includes('G') && allowed.includes('C')) {
        return prev;
      }
      
      // Filtrar colores seleccionados que no estén permitidos
      const validSelected = (prev.colores || []).filter(c => allowed.includes(c));
      
      // Si la selección actual tiene colores inválidos o se quedó sin colores seleccionados
      if (validSelected.length !== (prev.colores || []).length || validSelected.length === 0) {
        // Fallback: usar los colores primarios o el primer color permitido
        const fallback = primary.filter(c => c !== 'C');
        const defaultChoice = fallback.length > 0 ? fallback : (allowed.length > 0 ? [allowed[0]] : []);
        return { ...prev, colores: validSelected.length > 0 ? validSelected : defaultChoice };
      }
      
      // Si se requiere un primario y no hay ninguno seleccionado (y primario no es incoloro)
      const hasNoPrimary = primary.length > 0 && !primary.includes('C') && !primary.some(pc => validSelected.includes(pc));
      if (hasNoPrimary) {
        const fallback = primary.filter(c => c !== 'C');
        if (fallback.length > 0) {
          // Unir el primer primario a la selección
          return { ...prev, colores: [...new Set([...validSelected, fallback[0]])] };
        }
      }
      
      return prev;
    });
  }, [allowedColorsInfo]);

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
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-500 font-cinzel text-xs font-bold",
                      isCompleted 
                        ? "bg-[#ffca58] border-[#ffca58] text-black shadow-[0_0_10px_rgba(255,202,88,0.4)]"
                        : isActive
                          ? "bg-black border-[#ffca58] text-[#ffca58] shadow-[0_0_15px_rgba(255,202,88,0.3)] scale-110"
                          : "bg-[#16120e] border-white/25 text-white/40 hover:border-white/50 hover:text-white"
                    )}
                  >
                    {isCompleted ? <Check size={14} className="stroke-[3]" /> : step.id}
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
                  {['MODERN', 'STANDARD'].map((fmt) => {
                    const isSelected = selectedFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => {
                          onFormatChange?.(fmt);
                          // Reset selection if it belongs to standard and is exclusive standard etc., or reset color tab if count is 0
                          setSearchQuery('');
                        }}
                        className={cn(
                          "flex-1 sm:flex-none px-6 py-2 rounded-lg font-cinzel text-xs font-black tracking-widest transition-all duration-300 uppercase",
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


              {/* Categorization & Search Panel */}
              <div className="space-y-4 relative z-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <label className="block text-[#ffca58] text-sm font-bold uppercase tracking-[0.2em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
                    <Crown size={14} className="text-magic-gold" /> Filtro de Arquetipos
                  </label>
                  
                  {/* Search input */}
                  <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-white placeholder-white/35 text-xs font-semibold focus:border-[#ffca58] focus:shadow-[0_0_10px_rgba(255,202,88,0.2)] focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Color Groups Tab Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {COLOR_GROUP_TABS.map((tab) => {
                    const count = colorGroupCounts[tab.id] || 0;
                    const isSelected = activeColorTab === tab.id;
                    
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => {
                          setActiveColorTab(tab.id);
                        }}
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
                        bannedCount = arch.allCards.filter(c => BATTLEBOX_BANLIST.includes(c.toLowerCase())).length;
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
                        setActiveColorTab('generic');
                      }}
                      className="mt-4 text-xs text-magic-gold font-bold hover:underline"
                    >
                      Restablecer filtros
                    </button>
                  </div>
                )}
              </div>

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
                
                {currentArchetype && !arraysEqual(formData?.colores || [], currentArchetype.recommendedColors || []) && (
                  <button
                    type="button"
                    onClick={resetColors}
                    className="bg-black/60 hover:bg-black/90 px-3 py-1.5 rounded-full text-[#ffdf91] hover:text-white border border-[#ffdf91]/30 hover:border-[#ffdf91]/65 transition-all text-[9.5px] uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-md hover:shadow-[#ffdf91]/10 self-end md:self-center"
                  >
                    <span className="text-xs">↩</span> Recomendar Colores Originales
                  </button>
                )}
              </div>

              {/* Grid Responsivo de Doble Columna */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
                {/* Lado Izquierdo: Controles */}
                <div className="lg:col-span-2 space-y-6">
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
                            disabled={!isAllowed}
                            onClick={() => toggleColor(color.id)}
                            whileHover={{ scale: isAllowed ? 1.12 : 1 }}
                            whileTap={{ scale: isAllowed ? 0.95 : 1 }}
                            className={cn(
                              "transition-all duration-300 relative flex items-center justify-center rounded-full focus:outline-none border-2 border-transparent p-0.5",
                              !isAllowed ? "opacity-20 grayscale cursor-not-allowed" :
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
                </div>

                {/* Lado Derecho: Vistazo Rápido */}
                <div className="lg:col-span-1">
                  <QuickGlancePanel
                    formData={formData}
                    currentArchetype={currentArchetype}
                    selectedTribeInfo={selectedTribeInfo}
                    selectedStrategyInfo={selectedStrategyInfo}
                    isCustomTribe={isCustomTribe}
                    isCustomStrategy={isCustomStrategy}
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
                        setFormData(prev => ({ ...prev, isExpertMode: e.target.checked }));
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
                  <div className="lg:col-span-2 space-y-6">
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
                  <div className="lg:col-span-1">
                    <QuickGlancePanel
                      formData={formData}
                      currentArchetype={currentArchetype}
                      selectedTribeInfo={null}
                      selectedStrategyInfo={null}
                      isCustomTribe={true}
                      isCustomStrategy={true}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
                  <div className="lg:col-span-2 space-y-6">
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
                                setFormData(prev => ({ ...prev, tribe: '' }));
                                setIsCustomTribe(false);
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
                              onClick={() => setFormData(prev => ({ ...prev, tribe: '' }))}
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
                                      tribe: tribe.label
                                    }));
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

                      {/* Estrategia Section (Guided Mode) */}
                      <div className="space-y-4 bg-black/35 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 relative z-10">
                          <label className="text-xs font-cinzel font-bold text-[#ffca58] uppercase tracking-wider flex items-center gap-1.5">
                            <Swords size={12} className="text-magic-gold" /> Estrategia (Guía Visual)
                          </label>
                          {formData.strategy && (
                            <button
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({ ...prev, strategy: '' }));
                                setIsCustomStrategy(false);
                              }}
                              className="text-[9px] text-red-400 hover:text-red-300 uppercase tracking-widest font-black"
                            >
                              ✕ Quitar
                            </button>
                          )}
                        </div>

                        {/* Strategies List Selector */}
                        <div className="h-[210px] overflow-y-auto p-2 bg-black/60 border border-white/10 rounded-xl space-y-2 relative z-10">
                          <div
                            onClick={() => setFormData(prev => ({ ...prev, strategy: '' }))}
                            className={cn(
                              "p-2.5 rounded-lg border transition-all duration-300 flex flex-col justify-between min-h-[70px] cursor-pointer",
                              !formData.strategy
                                ? "border-gray-400 bg-gradient-to-b from-gray-500/15 to-black/90 shadow-[0_0_8px_rgba(156,163,175,0.2)]"
                                : "bg-black/75 border-white/10 text-white/80 hover:text-white hover:border-white/30"
                            )}
                          >
                            <p className={cn("text-[10px] font-black uppercase tracking-wider", !formData.strategy ? "text-gray-300" : "text-white/60")}>
                              Sin Mecánica Específica
                            </p>
                            <p className="text-[9px] text-[#f4ece0]/40 font-serif leading-tight mt-1">
                              El mazo operará de forma versátil sin atarse a un combo o sinergia en particular.
                            </p>
                          </div>

                          {availableStrategies.map(strat => {
                            const isSelected = formData.strategy === strat.label;
                            const isCompatible = isStrategyCompatible(strat);
                            
                            return (
                              <div
                                key={strat.id}
                                onClick={() => {
                                  if (!isCompatible) return;
                                  setIsCustomStrategy(false);
                                  setFormData(prev => ({ ...prev, strategy: strat.label }));
                                }}
                                title={!isCompatible ? `Incompatible con la raza/tribu "${formData.tribe}"` : `Seleccionar ${strat.label}`}
                                className={cn(
                                  "p-3 rounded-xl border transition-all duration-300 flex flex-col gap-2 relative overflow-hidden",
                                  isSelected
                                    ? "border-[#ffca58] bg-gradient-to-b from-[#ffca58]/20 to-black/95 shadow-[0_0_15px_rgba(255,202,88,0.3)] cursor-pointer scale-[1.02] z-10"
                                    : !isCompatible
                                      ? "bg-black/30 border-white/5 text-white/30 opacity-40 grayscale cursor-not-allowed pointer-events-none"
                                      : "bg-black/80 border-white/10 text-white/80 hover:text-white hover:border-white/30 hover:bg-black cursor-pointer"
                                )}
                              >
                                {isSelected && <div className="absolute top-0 right-0 w-16 h-16 bg-[#ffca58]/10 blur-xl rounded-full" />}
                                
                                <div className="flex justify-between items-start gap-1 relative z-10">
                                  <span className={cn("font-cinzel text-xs font-black flex items-center gap-1.5", isSelected ? "text-magic-gold drop-shadow-md" : "text-white", !isCompatible && "text-white/30")}>
                                    {!isCompatible && <Lock size={10} className="text-magic-gold/60 shrink-0" />}
                                    {strat.label}
                                  </span>
                                  <div className="flex -space-x-1 shrink-0">
                                    {strat.colors.map(col => (
                                      <div key={col} className={cn("w-3.5 h-3.5 rounded-full overflow-hidden border border-black/20 shadow-sm", !isCompatible && "opacity-50")}>
                                        <img src={COLORS.find(co => co.id === col)?.icon} alt={col} className="w-full h-full object-cover" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                <p className={cn("text-[10px] font-serif leading-relaxed relative z-10", isSelected ? "text-white/90 font-medium" : "text-white/60", !isCompatible && "text-white/20")}>
                                  {strat.mechanics}
                                </p>
                                
                                {strat.keywords && strat.keywords.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1 relative z-10">
                                    {strat.keywords.slice(0, 3).map((kw, idx) => (
                                      <span key={idx} className={cn(
                                        "px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold rounded border",
                                        isSelected ? "bg-[#ffca58]/20 text-[#ffca58] border-[#ffca58]/30" : "bg-white/5 text-white/40 border-white/10"
                                      )}>
                                        {kw}
                                      </span>
                                    ))}
                                    {strat.keywords.length > 3 && (
                                      <span className="px-1.5 py-0.5 text-[8px] uppercase tracking-widest font-bold rounded border bg-transparent text-white/30 border-transparent">
                                        +{strat.keywords.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lado Derecho: Vistazo Rápido */}
                  <div className="lg:col-span-1">
                    <QuickGlancePanel
                      formData={formData}
                      currentArchetype={currentArchetype}
                      selectedTribeInfo={selectedTribeInfo}
                    selectedStrategyInfo={selectedStrategyInfo}
                    isCustomTribe={isCustomTribe}
                    isCustomStrategy={isCustomStrategy}
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

              {/* Prompts and Rules */}
              {/* Grid Responsivo de Doble Columna */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10 items-start">
                {/* Lado Izquierdo: Controles */}
                <div className="lg:col-span-2 space-y-6">
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
                    </div>

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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 bg-black/45 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider relative z-10">
                          <PlusCircle size={12} /> Incluir Obligatoriamente
                        </label>
                        <input
                          type="text"
                          value={formData.mustInclude}
                          onChange={(e) => setFormData(prev => ({ ...prev, mustInclude: e.target.value }))}
                          placeholder="Ej: Grief, Solitude, Sliver Queen"
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-medium focus:border-emerald-500 focus:outline-none relative z-10"
                        />
                        <p className="text-[9px] text-white/40 relative z-10">Nombres separados por comas que se incluirán sí o sí en el mazo.</p>
                      </div>

                      <div className="space-y-2 bg-black/45 p-4 rounded-xl border border-white/5 relative overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                        <label className="flex items-center gap-1.5 text-xs font-bold text-red-400 uppercase tracking-wider relative z-10">
                          <MinusCircle size={12} /> Prohibiciones de la Casa
                        </label>
                        <input
                          type="text"
                          value={formData.customBanlist}
                          onChange={(e) => setFormData(prev => ({ ...prev, customBanlist: e.target.value }))}
                          placeholder="Ej: Ragavan, Black Lotus"
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-medium focus:border-red-500 focus:outline-none relative z-10"
                        />
                        <p className="text-[9px] text-white/40 relative z-10">Nombres separados por comas que se prohibirán por completo en la forja.</p>
                      </div>
                    </div>
                  </div>

                {/* Lado Derecho: Vistazo Rápido */}
                <div className="lg:col-span-1">
                  <QuickGlancePanel
                    formData={formData}
                    currentArchetype={currentArchetype}
                    selectedTribeInfo={selectedTribeInfo}
                    selectedStrategyInfo={selectedStrategyInfo}
                    isCustomTribe={isCustomTribe}
                    isCustomStrategy={isCustomStrategy}
                  />
                </div>
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
    </div>
  );
}