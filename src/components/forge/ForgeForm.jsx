import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { Sparkles, Swords, Shield, Zap, Flame, Crown, BookOpen, Search, Check, Plus, AlertCircle, Wand2, Compass, PlusCircle, MinusCircle, Scroll } from 'lucide-react';

import { BATTLEBOX_ARCHETYPES, getBattleBoxFormatName, BATTLEBOX_FORMAT_NAME, MTG_TRIBES, MTG_STRATEGIES, TRIBE_CATEGORIES, COLORS } from '../../constants/legacyBattleBox';
import ManaOrb from '../atoms/ManaOrb';

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}

const ARCHETYPES = BATTLEBOX_ARCHETYPES.map(a => ({
  value: a.id,
  label: a.label.split('(')[0].trim(),
  landCount: a.landCount,
  recommendedColors: a.recommendedColors,
  speed: a.speed,
  winTurn: a.winTurn,
  colorHint: `Velocidad: ${a.speed} • Victoria: Turno ${a.winTurn}`,
  description: a.description
}));

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

export default function ForgeForm({ onSubmit, isLoading, disabled, error, lastGenerationLogs, onOpenOracleLog, selectedFormat = 'MODERN' }) {
  const [formData, setFormData] = useState({
    formato: 'legacy-battlebox',
    archetype: '',
    colores: [],
    tribe: '',
    strategy: '',
    prompt: '',
    mustInclude: '',
    customBanlist: '',
  });

  const [isCustomTribe, setIsCustomTribe] = useState(false);
  const [isCustomStrategy, setIsCustomStrategy] = useState(false);
  const [activeTribeTab, setActiveTribeTab] = useState('clasica');
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);

  // Íconos e indicadores de velocidad
  const getSpeedStyles = (speed) => {
    const speedLower = speed.toLowerCase();
    if (speedLower.includes('rápida')) return { color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]', icon: <Flame size={12} className="text-red-400 animate-pulse" /> };
    if (speedLower.includes('media-rápida')) return { color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30 shadow-[0_0_10px_rgba(249,115,22,0.15)]', icon: <Zap size={12} className="text-orange-400 animate-pulse" /> };
    if (speedLower.includes('media')) return { color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]', icon: <Swords size={12} className="text-amber-400" /> };
    if (speedLower.includes('lenta')) return { color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.15)]', icon: <Shield size={12} className="text-emerald-400" /> };
    return { color: 'text-sky-400', bg: 'bg-sky-950/40 border-sky-500/30 shadow-[0_0_10px_rgba(14,165,233,0.15)]', icon: <Shield size={12} className="text-sky-400" /> };
  };

  const handleArchetypeChange = (val) => {
    const arch = ARCHETYPES.find(a => a.value === val);
    setFormData(prev => ({
      ...prev,
      archetype: val,
      tribe: '',
      strategy: '',
      colores: arch?.recommendedColors || []
    }));
    setIsCustomTribe(false);
    setIsCustomStrategy(false);
    setErrors(prev => ({ ...prev, colores: null }));
    
    // Auto-avance místico a paso 2
    setTimeout(() => {
      setCurrentStep(2);
    }, 450);
  };

  const toggleColor = (colorId) => {
    setFormData(prev => {
      const isSelected = prev.colores.includes(colorId);
      const newColors = isSelected
        ? prev.colores.filter(c => c !== colorId)
        : [...prev.colores, colorId];
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
    if (formData.colores.length === 0 && formData.archetype !== 'legacy-eldrazi') {
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

  // Filtrado de Tribus disponibles
  const availableTribes = useMemo(() => {
    if (!formData.archetype) return [];
    
    let tribes = MTG_TRIBES.filter(t => t.archetypes && t.archetypes.includes(formData.archetype));
    
    if (formData.strategy && !isCustomStrategy) {
      const stratData = MTG_STRATEGIES.find(s => s.label === formData.strategy);
      if (stratData) {
        tribes = tribes.filter(t => {
          if (t.strategies && t.strategies.includes(stratData.id)) return true;
          if (!t.strategies || t.strategies.length === 0) {
            return t.colors.some(c => stratData.colors.includes(c));
          }
          return false;
        });
      }
    }
    return tribes;
  }, [formData.archetype, formData.strategy, isCustomStrategy]);

  // Agrupar por categoría
  const groupedTribes = useMemo(() => {
    const categoryOrder = ['clasica', 'vocacion', 'monstruo', 'exotica', 'alianza'];
    const groups = {};
    for (const cat of categoryOrder) {
      const tribesInCat = availableTribes.filter(t => t.category === cat);
      if (tribesInCat.length > 0) {
        groups[cat] = tribesInCat;
      }
    }
    return groups;
  }, [availableTribes]);

  // Estrategias disponibles
  const availableStrategies = useMemo(() => {
    if (!formData.archetype) return [];
    
    let strategies = MTG_STRATEGIES.filter(s => s.archetypes.includes(formData.archetype));
    
    if (formData.tribe && !isCustomTribe) {
      const tribeData = MTG_TRIBES.find(t => t.label === formData.tribe);
      if (tribeData) {
        if (tribeData.strategies && tribeData.strategies.length > 0) {
          strategies = strategies.filter(s => tribeData.strategies.includes(s.id));
        } else {
          strategies = strategies.filter(s => s.colors.some(c => tribeData.colors.includes(c)));
        }
      }
    }
    return strategies;
  }, [formData.archetype, formData.tribe, isCustomTribe]);

  const selectedTribeInfo = useMemo(() => {
    if (!formData.tribe || isCustomTribe) return null;
    return MTG_TRIBES.find(t => t.label === formData.tribe);
  }, [formData.tribe, isCustomTribe]);

  const selectedStrategyInfo = useMemo(() => {
    if (!formData.strategy || isCustomStrategy) return null;
    return MTG_STRATEGIES.find(s => s.label === formData.strategy);
  }, [formData.strategy, isCustomStrategy]);

  // Si cambia el arquetipo, reseteamos tribu y estrategia
  useEffect(() => {
    setFormData(prev => ({ ...prev, tribe: '', strategy: '' }));
  }, [formData.archetype]);

  // Sincronizar tab activo cuando cambian las tribus disponibles
  useEffect(() => {
    if (formData.archetype) {
      const availableCategories = Object.keys(groupedTribes);
      if (availableCategories.length > 0 && !availableCategories.includes(activeTribeTab)) {
        setActiveTribeTab(availableCategories[0]);
      }
    }
  }, [groupedTribes, formData.archetype, activeTribeTab]);

  const currentArchetype = ARCHETYPES.find(a => a.value === formData.archetype);

  const resetColors = () => {
    if (currentArchetype) {
      setFormData(prev => ({ ...prev, colores: currentArchetype.recommendedColors }));
    }
  };

  const isFormValid = formData.archetype && (formData.colores.length > 0 || formData.archetype === 'legacy-eldrazi');

  // Comprobar preset seleccionado
  const activePreset = useMemo(() => {
    return PACTOS_DE_GREMIO.find(p => arraysEqual(p.colors, formData.colores))?.id || null;
  }, [formData.colores]);

  const steps = [
    { id: 1, name: 'Clase', desc: 'Arquetipo' },
    { id: 2, name: 'Maná', desc: 'Colores' },
    { id: 3, name: 'Núcleo', desc: 'Tribu/Táctica' },
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
                      if (step.id < currentStep || (step.id === 2 && formData.archetype) || (step.id === 3 && formData.archetype && (formData.colores.length > 0 || formData.archetype === 'legacy-eldrazi')) || (step.id === 4 && formData.archetype && (formData.colores.length > 0 || formData.archetype === 'legacy-eldrazi'))) {
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
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 w-full border-b border-white/10 pb-6">
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
                      Paso 1: Elige el arquetipo de tu mazo
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col items-center md:items-end gap-1.5 bg-black/75 border border-[#ffdf91]/35 px-5 py-2.5 rounded-2xl shadow-lg">
                  <span className="text-[10px] text-magic-gold font-bold uppercase tracking-[0.2em] drop-shadow-md">Formato de Destino</span>
                  <span className="text-xs font-cinzel font-bold text-white tracking-widest drop-shadow-md">
                    {getBattleBoxFormatName(selectedFormat)}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-950/40 border-l-4 border-red-500 rounded-r-lg text-red-200 text-sm shadow-xl flex items-start gap-3 backdrop-blur-md">
                  <AlertCircle className="text-red-400 mt-0.5" size={16} />
                  <div className="flex-1">
                    <p className="font-bold text-red-400 mb-1">El Oráculo ha fallado</p>
                    <p className="text-red-200/80">{error}</p>
                  </div>
                  {lastGenerationLogs && onOpenOracleLog && (
                    <button
                      type="button"
                      onClick={onOpenOracleLog}
                      className="btn-magic-glass btn-glass-gold text-xs px-3 py-1.5 border-[#D4AF37]/30 text-[#D4AF37] self-center ml-2"
                    >
                      🔮 Ver Bitácora
                    </button>
                  )}
                </div>
              )}

              {/* Grid of Archetypes */}
              <div className="space-y-4">
                <label className="block text-[#ffca58] text-sm font-bold uppercase tracking-[0.2em] mb-3 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] flex items-center gap-2">
                  <Crown size={14} className="text-magic-gold" /> Seleccionar Arquetipo
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ARCHETYPES.map((arch) => {
                    const isSelected = formData.archetype === arch.value;
                    const speedStyles = getSpeedStyles(arch.speed);
                    
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
                          
                          <p className="text-[11.5px] text-white/90 leading-relaxed mb-4 font-serif relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-medium">
                            {arch.description}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 mt-auto relative z-10 pt-2 border-t border-white/5">
                          <div className="flex items-center gap-1.5">
                            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border", speedStyles.bg, speedStyles.color)}>
                              {speedStyles.icon}
                              <span>{arch.speed}</span>
                            </div>
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-black/65 border border-white/25 text-white">
                              <span>T{arch.winTurn}</span>
                            </div>
                          </div>
                          
                          <div className="flex -space-x-1.5">
                            {arch.recommendedColors.map(c => {
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
              </div>

              {/* Navigation buttons */}
              <div className="flex justify-end pt-4 border-t border-white/10">
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
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                    Pacto de Maná
                  </h3>
                  <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                    Paso 2: Consagra la Identidad de Color de tu ecosistema
                  </p>
                </div>
                
                {currentArchetype && !arraysEqual(formData.colores, currentArchetype.recommendedColors) && (
                  <button
                    type="button"
                    onClick={resetColors}
                    className="bg-black/60 hover:bg-black/90 px-3 py-1.5 rounded-full text-[#ffdf91] hover:text-white border border-[#ffdf91]/30 hover:border-[#ffdf91]/65 transition-all text-[9.5px] uppercase tracking-wider font-extrabold flex items-center gap-1 shadow-md hover:shadow-[#ffdf91]/10 self-end md:self-center"
                  >
                    <span className="text-xs">↩</span> Recomendar Colores Originales
                  </button>
                )}
              </div>

              {/* Glowing Mana Orbs Grid */}
              <div className="flex flex-wrap gap-6 justify-center py-6 bg-black/20 border border-white/10 rounded-2xl relative">
                {COLORS.map(color => {
                  const isSelected = formData.colores.includes(color.id);
                  const isRecommended = currentArchetype?.recommendedColors?.includes(color.id);
                  
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
                    <div key={color.id} className="flex flex-col items-center gap-3">
                      <motion.button
                        type="button"
                        onClick={() => toggleColor(color.id)}
                        whileHover={{ scale: 1.12 }}
                        whileTap={{ scale: 0.95 }}
                        className={cn(
                          "transition-all duration-300 relative flex items-center justify-center rounded-full focus:outline-none border-2 border-transparent p-0.5",
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
                        {isRecommended && (
                          <span className="absolute -top-1 -right-1 text-[9px] w-5 h-5 bg-[#ffca58] text-black rounded-full flex items-center justify-center font-bold shadow-lg border border-black/20 z-20" title="Recomendado">
                            ★
                          </span>
                        )}
                      </motion.button>
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-black transition-all duration-300 shadow-md border",
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
                  {PACTOS_DE_GREMIO.map(pact => {
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

              {errors.colores && (
                <p className="text-[#ff4d4d] text-xs text-center font-bold animate-pulse">
                  ⚠️ {errors.colores}
                </p>
              )}

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
                  disabled={formData.colores.length === 0 && formData.archetype !== 'legacy-eldrazi'}
                  onClick={() => {
                    if (formData.colores.length > 0 || formData.archetype === 'legacy-eldrazi') {
                      setCurrentStep(3);
                    } else {
                      setErrors({ colores: 'Selecciona al menos un color' });
                    }
                  }}
                  className={cn(
                    "px-6 py-2.5 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all duration-300 border shadow-lg flex items-center gap-2",
                    (formData.colores.length > 0 || formData.archetype === 'legacy-eldrazi')
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
              
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl md:text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em] mb-1">
                  Núcleo y Sinergia Táctica
                </h3>
                <p className="text-xs text-[#f4ece0]/50 tracking-wider font-semibold">
                  Paso 3: Define la raza y el motor estratégico que dominará el ecosistema
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Tribu Section */}
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
                  <div className="flex flex-wrap gap-1 border-b border-white/5 pb-2 relative z-10">
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
                            ? "bg-[#ffca58] text-black border-[#ffca58] font-black"
                            : "bg-black/90 border-white/20 text-[#f4ece0]/70 hover:text-white"
                        )}
                      >
                        {TRIBE_CATEGORIES[catKey]?.split(' ').slice(1).join(' ') || catKey}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomTribe(true);
                        setActiveTribeTab('custom');
                      }}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-wider border transition-all duration-300",
                        isCustomTribe
                          ? "bg-[#ffca58] text-black border-[#ffca58] font-black"
                          : "bg-black/90 border-white/20 text-[#f4ece0]/70 hover:text-white"
                      )}
                    >
                      Manual
                    </button>
                  </div>

                  {/* Tribe Grid selector */}
                  <div className="h-[210px] overflow-y-auto p-2 bg-black/60 border border-white/10 rounded-xl relative z-10">
                    {!isCustomTribe ? (
                      <div className="grid grid-cols-2 gap-2">
                        {groupedTribes[activeTribeTab] && groupedTribes[activeTribeTab].map(tribe => {
                          const isTribeSelected = formData.tribe === tribe.label;
                          return (
                            <button
                              key={tribe.id}
                              type="button"
                              onClick={() => {
                                const newColors = Array.isArray(tribe.primaryColor)
                                  ? [...tribe.primaryColor]
                                  : tribe.colors.slice(0, 3);
                                setFormData(prev => ({
                                  ...prev,
                                  tribe: tribe.label,
                                  colores: newColors
                                }));
                              }}
                              className={cn(
                                "p-2 rounded-lg border text-center transition-all duration-200 flex flex-col items-center justify-center gap-1",
                                isTribeSelected
                                  ? "bg-gradient-to-b from-[#ffca58]/20 to-black border-[#ffca58] text-[#ffca58] shadow-[0_0_8px_rgba(255,202,88,0.2)] font-black"
                                  : "bg-black/75 border-white/10 text-[#f4ece0]/80 hover:text-white hover:border-white/30"
                              )}
                            >
                              <span className="text-[10px] font-cinzel font-bold tracking-wide leading-tight">
                                {tribe.label}
                              </span>
                              <div className="flex gap-0.5">
                                {tribe.colors.map(col => {
                                  const cObj = COLORS.find(co => co.id === col);
                                  return (
                                    <div key={col} className="w-2.5 h-2.5 rounded-full overflow-hidden shadow-inner border border-black/30" title={cObj?.name}>
                                      <img src={cObj?.icon} alt={col} className="w-full h-full object-cover" />
                                    </div>
                                  );
                                })}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full p-2 space-y-2">
                        <span className="text-[10px] text-white/50 text-center font-medium">Escribe tu subtipo manual de criatura preferido:</span>
                        <input
                          type="text"
                          value={formData.tribe}
                          onChange={(e) => setFormData(prev => ({ ...prev, tribe: e.target.value }))}
                          placeholder="Ej: Sliver, Pirate, Soldier..."
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-semibold focus:border-[#ffca58] text-center focus:outline-none"
                        />
                      </div>
                    )}
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

                {/* Estrategia Section */}
                <div className="space-y-4 bg-black/35 p-5 rounded-2xl border border-white/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
                  <div className="flex justify-between items-center border-b border-white/10 pb-2 relative z-10">
                    <label className="text-xs font-cinzel font-bold text-[#ffca58] uppercase tracking-wider flex items-center gap-1.5">
                      <Swords size={12} className="text-magic-gold" /> Motor Táctico (Estrategia)
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
                    {availableStrategies.map(strat => {
                      const isSelected = formData.strategy === strat.label;
                      return (
                        <div
                          key={strat.id}
                          onClick={() => {
                            setIsCustomStrategy(false);
                            setFormData(prev => ({ ...prev, strategy: strat.label }));
                          }}
                          className={cn(
                            "p-2.5 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col justify-between min-h-[70px]",
                            isSelected
                              ? "border-[#ffca58] bg-gradient-to-b from-[#ffca58]/15 to-black/90 shadow-[0_0_8px_rgba(255,202,88,0.2)]"
                              : "bg-black/75 border-white/10 text-white/80 hover:text-white hover:border-white/30"
                          )}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className={cn("font-cinzel text-[10.5px] font-black", isSelected ? "text-magic-gold" : "text-white")}>
                              {strat.label}
                            </span>
                            <div className="flex -space-x-1">
                              {strat.colors.map(col => (
                                <div key={col} className="w-3 h-3 rounded-full overflow-hidden border border-black/20">
                                  <img src={COLORS.find(co => co.id === col)?.icon} alt={col} className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          </div>
                          <p className="text-[9.5px] text-white/50 font-serif leading-tight mt-1">{strat.mechanics}</p>
                        </div>
                      );
                    })}
                    <div
                      onClick={() => {
                        setIsCustomStrategy(true);
                        setFormData(prev => ({ ...prev, strategy: '' }));
                      }}
                      className={cn(
                        "p-2.5 rounded-lg border border-dashed text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[70px]",
                        isCustomStrategy ? "border-[#ffca58] bg-gradient-to-b from-[#ffca58]/15 to-black/95 text-[#ffca58]" : "bg-black/75 border-white/10 text-white/40 hover:text-white"
                      )}
                    >
                      <Plus size={14} className="mb-0.5 text-magic-gold" />
                      <span className="font-cinzel text-[10px] font-bold">Personalizar Manualmente</span>
                    </div>
                  </div>

                  {isCustomStrategy && (
                    <input
                      type="text"
                      value={formData.strategy}
                      onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                      placeholder="Ej: Dredge, Affinity, Enchanter..."
                      className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-white/35 text-xs font-semibold focus:border-[#ffca58] text-center focus:outline-none relative z-10"
                    />
                  )}
                </div>
              </div>

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
                  onClick={() => setCurrentStep(4)}
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
              <div className="space-y-5">
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

              {/* Navigation and Final Button */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/10">
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