import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

import { BATTLEBOX_ARCHETYPES, BATTLEBOX_FORMAT_NAME, MTG_TRIBES, MTG_STRATEGIES, COLORS } from '../../constants/legacyBattleBox';
import ManaOrb from '../atoms/ManaOrb';

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sorted1 = [...a].sort();
  const sorted2 = [...b].sort();
  return sorted1.every((v, i) => v === sorted2[i]);
}


const FORMATOS = [
  { value: 'legacy-battlebox', label: BATTLEBOX_FORMAT_NAME },
];

const RARITY_MODES = [
  { value: 'standard', label: 'Estándar (Equilibrado)' },
  { value: 'high-power', label: 'Alta Potencia (Raras y Míticas ilimitadas)' },
  { value: 'pauper', label: 'Pauper (Solo Comunes)' },
  { value: 'artisan', label: 'Artisan (Comunes e Infrecuentes)' }
];

const ARCHETYPES = BATTLEBOX_ARCHETYPES.map(a => ({
  value: a.id,
  label: a.label,
  recommendedColors: a.recommendedColors,
  colorHint: `Velocidad: ${a.speed} • Victoria: Turno ${a.winTurn}`,
  description: a.description
}));

export default function ForgeForm({ onSubmit, isLoading, disabled }) {
  const [formData, setFormData] = useState({
    formato: 'legacy-battlebox',
    rarityMode: 'standard',
    archetype: 'midrange',
    colores: ['B', 'G', 'W'],
    tribe: '',
    strategy: '',
    prompt: '',
  });
  
  const [isCustomTribe, setIsCustomTribe] = useState(false);
  const [isCustomStrategy, setIsCustomStrategy] = useState(false);
  const [errors, setErrors] = useState({});

  const handleArchetypeChange = (val) => {
    const arch = ARCHETYPES.find(a => a.value === val);
    setFormData(prev => ({
      ...prev,
      archetype: val,
      colores: arch?.recommendedColors || prev.colores
    }));
  };


  const toggleColor = (colorId) => {
    setFormData(prev => ({
      ...prev,
      colores: prev.colores.includes(colorId)
        ? prev.colores.filter(c => c !== colorId)
        : [...prev.colores, colorId]
    }));
    setErrors(prev => ({ ...prev, colores: null }));
  };

  const validate = () => {
    const newErrors = {};
    
    // Permitimos incoloro solo para Eldrazi
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

  const availableTribes = useMemo(() => {
    return MTG_TRIBES.filter(t => 
      t.colors.some(c => formData.colores.includes(c)) && 
      (!t.archetypes || t.archetypes.includes(formData.archetype))
    );
  }, [formData.colores, formData.archetype]);

  const availableStrategies = useMemo(() => {
    let strats = MTG_STRATEGIES.filter(s => 
      s.colors.some(c => formData.colores.includes(c)) &&
      (!s.archetypes || s.archetypes.includes(formData.archetype))
    );
    
    if (formData.tribe && !isCustomTribe) {
      const selectedTribe = MTG_TRIBES.find(t => t.label === formData.tribe);
      if (selectedTribe && selectedTribe.strategies) {
        strats = strats.filter(s => selectedTribe.strategies.includes(s.id));
      }
    }
    
    return strats;
  }, [formData.colores, formData.archetype, formData.tribe, isCustomTribe]);

  const currentArchetype = ARCHETYPES.find(a => a.value === formData.archetype);

  const resetColors = () => {
    if (currentArchetype) {
      setFormData(prev => ({ ...prev, colores: currentArchetype.recommendedColors }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto">
      <div className="w-full p-8 frosted-panel shadow-2xl">
      <div className="flex items-center justify-center gap-3 mb-8 w-full">
          <img src="/ASSETS/Engranaje.webp" alt="Config" className="w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.5)]" />
          <h3 className="text-2xl font-cinzel text-magic-gold uppercase tracking-[0.15em]">
            Configuración del Mazo
          </h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-[#ffca58] text-sm font-bold mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Formato de Juego
            </label>
            <select
              value={formData.formato}
              onChange={(e) => setFormData(prev => ({ ...prev, formato: e.target.value }))}
              className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                         text-white focus:border-white/40 focus:outline-none
                         transition-all cursor-pointer mb-6 backdrop-blur-xl font-medium"
            >
              {FORMATOS.map(f => (
                <option key={f.value} value={f.value} className="bg-[#0a101a] text-[#f4ece0]">
                  {f.label}
                </option>
              ))}
            </select>

            <label className="block text-[#ffca58] text-sm font-bold mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Arquetipo de Mazo
            </label>
            <select
              value={formData.archetype}
              onChange={(e) => handleArchetypeChange(e.target.value)}
              className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                         text-white focus:border-white/40 focus:outline-none
                         transition-all cursor-pointer backdrop-blur-xl font-medium"
            >
              {ARCHETYPES.map(a => (
                <option key={a.value} value={a.value} className="bg-[#0a101a] text-[#f4ece0]">
                  {a.label}
                </option>
              ))}
            </select>

            {currentArchetype && (
              <div className="mt-3 p-3 bg-white/10 border border-[#ffdf91]/20 rounded-lg backdrop-blur-sm">
                <p className="text-[#f4ece0] text-sm leading-relaxed">
                  {currentArchetype.description}
                </p>
                <p className="text-[#ffca58] text-xs mt-2 italic font-black drop-shadow-[0_0_10px_rgba(255,202,88,0.4)] uppercase tracking-widest">
                  ⚡ {currentArchetype.colorHint}
                </p>
              </div>
            )}

            <label className="block text-[#ffca58] text-sm font-bold mt-6 mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Nivel de Potencia / Restricción
            </label>
            <select
              value={formData.rarityMode}
              onChange={(e) => setFormData(prev => ({ ...prev, rarityMode: e.target.value }))}
              className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                         text-white focus:border-white/40 focus:outline-none
                         transition-all cursor-pointer backdrop-blur-xl font-medium"
            >
              {RARITY_MODES.map(r => (
                <option key={r.value} value={r.value} className="bg-[#0a101a] text-[#f4ece0]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Identity - contextual to archetype */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-[#ffca58] text-sm font-bold uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                Identidad de Colores <span className="text-red-500">*</span>
              </label>
              {currentArchetype && !arraysEqual(formData.colores, currentArchetype.recommendedColors) && (
                <button
                  type="button"
                  onClick={resetColors}
                  className="text-[10px] text-[#ffdf91]/60 hover:text-[#ffdf91] uppercase tracking-wider flex items-center gap-1 transition-colors font-bold"
                >
                  <span className="text-xs">↩</span> Restaurar Recomendados
                </button>
              )}
            </div>

            <div className="flex gap-3 justify-center">
              {COLORS.map(color => {
                const isSelected = formData.colores.includes(color.id);
                const isRecommended = currentArchetype?.recommendedColors?.includes(color.id);
                
                return (
                  <div key={color.id} className="flex flex-col items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleColor(color.id)}
                      className={cn(
                        "transition-all duration-300 relative flex items-center justify-center rounded-full",
                        isSelected
                          ? "scale-125 z-10"
                          : "opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0 hover:scale-110"
                      )}
                    >
                      <ManaOrb 
                        color={color.id} 
                        size="w-14 h-14" 
                        className={cn(
                          "transition-shadow duration-300",
                          isSelected && "shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                        )}
                      />
                      {isRecommended && (
                        <span className="absolute -top-1 -right-1 text-[10px] w-5 h-5 bg-grimorio-gold text-grimorio-dark rounded-full flex items-center justify-center font-bold shadow-lg border border-grimorio-dark/20 z-20">
                          ★
                        </span>
                      )}
                    </button>
                    <span className={cn(
                      "text-[10px] uppercase tracking-widest font-bold transition-colors",
                      isSelected ? "text-magic-gold" : "text-white/40"
                    )}>
                      {color.name}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-grimorio-parchment/40 text-xs mt-3 text-center">
              ★ = recomendado para {currentArchetype?.label || 'este arquetipo'} · Pulsa para añadir o quitar colores
            </p>

            {errors.colores && (
              <p className="text-[#ff4d4d] text-sm mt-3 text-center font-black animate-pulse drop-shadow-[0_0_10px_rgba(255,77,77,0.5)]">
                ⚠️ {errors.colores}
              </p>
            )}
          </div>

          <div>
            <label className="block text-[#ffca58] text-sm font-bold mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Tribu / Raza (opcional)
            </label>
            <select
              value={isCustomTribe ? 'custom' : formData.tribe}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomTribe(true);
                  setFormData(prev => ({ ...prev, tribe: '' }));
                } else {
                  setIsCustomTribe(false);
                  setFormData(prev => ({ ...prev, tribe: e.target.value }));
                }
              }}
              className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                         text-white focus:border-white/40 focus:outline-none
                         transition-all cursor-pointer mb-2 backdrop-blur-xl font-medium"
            >
              <option value="" className="bg-[#0a101a] text-[#f4ece0]">-- Ninguna / Cualquiera --</option>
              {availableTribes.map(t => (
                <option key={t.id} value={t.label} className="bg-[#0a101a] text-[#f4ece0]">{t.label}</option>
              ))}
              <option value="custom" className="bg-[#0a101a] text-[#f4ece0]">Otra (Manual)...</option>
            </select>
            {isCustomTribe && (
              <input
                type="text"
                value={formData.tribe}
                onChange={(e) => setFormData(prev => ({ ...prev, tribe: e.target.value }))}
                placeholder="Escribe tu tribu manual..."
                className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                           text-white placeholder-white/20
                           focus:border-white/40 focus:outline-none transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-[#ffca58] text-sm font-bold mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Estrategia Mecánica (opcional)
            </label>
            <select
              value={isCustomStrategy ? 'custom' : formData.strategy}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setIsCustomStrategy(true);
                  setFormData(prev => ({ ...prev, strategy: '' }));
                } else {
                  setIsCustomStrategy(false);
                  setFormData(prev => ({ ...prev, strategy: e.target.value }));
                }
              }}
              className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                         text-white focus:border-white/40 focus:outline-none
                         transition-all cursor-pointer mb-2 backdrop-blur-xl font-medium"
            >
              <option value="" className="bg-[#0a101a] text-[#f4ece0]">-- Ninguna --</option>
              {availableStrategies.map(s => (
                <option key={s.id} value={s.label} className="bg-[#0a101a] text-[#f4ece0]">{s.label}</option>
              ))}
              <option value="custom" className="bg-[#0a101a] text-[#f4ece0]">Otra (Manual)...</option>
            </select>
            {isCustomStrategy && (
              <input
                type="text"
                value={formData.strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                placeholder="Escribe tu estrategia manual..."
                className="w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg 
                           text-white placeholder-white/20
                           focus:border-white/40 focus:outline-none transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-[#ffca58] text-sm font-bold mb-2 uppercase tracking-[0.15em] drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
              Prompt Creativo / Estrategia (opcional)
            </label>
            <textarea
              value={formData.prompt}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, prompt: e.target.value }));
              }}
              placeholder="Describe tu visión... Ej: 'Quiero un mazo de pirates voladores que controlen el cielo y roben cartas del oponente'"
              rows={5}
              className={cn(
                "w-full px-4 py-3 bg-black/60 border border-white/20 rounded-lg text-white placeholder-white/20",
                "focus:border-white/40 focus:outline-none transition-all resize-none backdrop-blur-xl"
              )}
            />
            <div className="flex justify-end mt-2">
              <span className="text-xs text-grimorio-gold/40">
                {formData.prompt.length} caracteres
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 flex justify-center">
        <motion.button
          type="submit"
          onClick={handleSubmit}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading || disabled}
          className="btn-asset"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-3 text-stone-engraved">
              <span className="w-5 h-5 border-2 border-[#ffca58]/30 border-t-[#ffca58] rounded-full animate-spin" />
              Forjando...
            </span>
          ) : (
            <span className="text-stone-engraved uppercase tracking-[0.2em]">
              Forjar Mazo Con IA
            </span>
          )}
        </motion.button>
      </div>

      <p className="text-center text-grimorio-gold/40 text-xs">
        * La identidad de color es obligatoria • La IA usará el prompt (si se provee) para guiar la estrategia
      </p>
    </form>
  );
}