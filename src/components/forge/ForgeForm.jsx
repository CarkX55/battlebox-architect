import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

import { BATTLEBOX_ARCHETYPES, BATTLEBOX_FORMAT_NAME, MTG_TRIBES, MTG_STRATEGIES, COLORS } from '../../constants/legacyBattleBox';

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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl mx-auto">
      <div className="p-6 bg-gradient-to-b from-[#2a2318] to-[#1a1612] border-2 border-grimorio-gold/30 rounded-xl">
        <h3 className="text-xl font-cinzel text-grimorio-gold mb-6 flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          Configuración del Mazo
        </h3>

        <div className="space-y-6">
          <div>
            <label className="block text-grimorio-parchment text-sm font-medium mb-2 uppercase tracking-wider">
              Formato de Juego
            </label>
            <select
              value={formData.formato}
              onChange={(e) => setFormData(prev => ({ ...prev, formato: e.target.value }))}
              className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                         transition-all cursor-pointer mb-6"
            >
              {FORMATOS.map(f => (
                <option key={f.value} value={f.value} className="bg-[#1a1612]">
                  {f.label}
                </option>
              ))}
            </select>

            <label className="block text-grimorio-parchment text-sm font-medium mb-2 uppercase tracking-wider">
              Arquetipo de Mazo
            </label>
            <select
              value={formData.archetype}
              onChange={(e) => handleArchetypeChange(e.target.value)}
              className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                         transition-all cursor-pointer"
            >
              {ARCHETYPES.map(a => (
                <option key={a.value} value={a.value} className="bg-[#1a1612]">
                  {a.label}
                </option>
              ))}
            </select>

            {currentArchetype && (
              <div className="mt-3 p-3 bg-grimorio-gold/5 border border-grimorio-gold/20 rounded-lg">
                <p className="text-grimorio-parchment/80 text-sm leading-relaxed">
                  {currentArchetype.description}
                </p>
                <p className="text-grimorio-gold/70 text-xs mt-2 italic">
                  ⚡ {currentArchetype.colorHint}
                </p>
              </div>
            )}

            <label className="block text-grimorio-parchment text-sm font-medium mt-6 mb-2 uppercase tracking-wider">
              Nivel de Potencia / Restricción
            </label>
            <select
              value={formData.rarityMode}
              onChange={(e) => setFormData(prev => ({ ...prev, rarityMode: e.target.value }))}
              className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                         transition-all cursor-pointer"
            >
              {RARITY_MODES.map(r => (
                <option key={r.value} value={r.value} className="bg-[#1a1612]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Color Identity - contextual to archetype */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-grimorio-parchment text-sm font-medium uppercase tracking-wider">
                Identidad de Colores <span className="text-red-500">*</span>
              </label>
              {currentArchetype && !arraysEqual(formData.colores, currentArchetype.recommendedColors) && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, colores: currentArchetype.recommendedColors }))}
                  className="text-[10px] px-3 py-1 bg-grimorio-gold/10 hover:bg-grimorio-gold/20 
                             border border-grimorio-gold/30 rounded-full transition-all 
                             text-grimorio-gold/70 hover:text-grimorio-gold uppercase tracking-widest"
                >
                  ↩ Restaurar recomendados
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
                        "w-14 h-14 rounded-full border-3 flex items-center justify-center transition-all duration-300 relative",
                        isSelected
                          ? `border-grimorio-gold scale-110 shadow-[0_0_20px_rgba(193,155,69,0.6)]`
                          : "bg-[#1a1612] border-grimorio-gold/30 hover:border-grimorio-gold/60 hover:scale-105"
                      )}
                    >
                      <img src={color.icon} alt={color.name} className="w-10 h-10 object-contain" />
                      {isRecommended && (
                        <span className="absolute -top-1 -right-1 text-[10px] w-4 h-4 bg-grimorio-gold text-grimorio-dark rounded-full flex items-center justify-center font-bold shadow-md">
                          ★
                        </span>
                      )}
                    </button>
                    <span className={cn(
                      "text-[10px] uppercase tracking-wider transition-colors",
                      isSelected ? "text-grimorio-gold" : "text-grimorio-parchment/30"
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
              <p className="text-[#701b1b] text-sm mt-2 text-center font-medium">⚠️ {errors.colores}</p>
            )}
          </div>

          <div>
            <label className="block text-grimorio-parchment text-sm font-medium mb-2 uppercase tracking-wider">
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
              className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                         transition-all cursor-pointer mb-2"
            >
              <option value="">-- Ninguna / Cualquiera --</option>
              {availableTribes.map(t => (
                <option key={t.id} value={t.label}>{t.label}</option>
              ))}
              <option value="custom">Otra (Manual)...</option>
            </select>
            {isCustomTribe && (
              <input
                type="text"
                value={formData.tribe}
                onChange={(e) => setFormData(prev => ({ ...prev, tribe: e.target.value }))}
                placeholder="Escribe tu tribu manual..."
                className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                           text-grimorio-parchment placeholder-grimorio-gold/30
                           focus:border-grimorio-gold focus:outline-none transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-grimorio-parchment text-sm font-medium mb-2 uppercase tracking-wider">
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
              className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                         text-grimorio-parchment focus:border-grimorio-gold focus:outline-none
                         transition-all cursor-pointer mb-2"
            >
              <option value="">-- Ninguna --</option>
              {availableStrategies.map(s => (
                <option key={s.id} value={s.label}>{s.label}</option>
              ))}
              <option value="custom">Otra (Manual)...</option>
            </select>
            {isCustomStrategy && (
              <input
                type="text"
                value={formData.strategy}
                onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                placeholder="Escribe tu estrategia manual..."
                className="w-full px-4 py-3 bg-[#1a1612] border-2 border-grimorio-gold/30 rounded-lg 
                           text-grimorio-parchment placeholder-grimorio-gold/30
                           focus:border-grimorio-gold focus:outline-none transition-all"
              />
            )}
          </div>

          <div>
            <label className="block text-grimorio-parchment text-sm font-medium mb-2 uppercase tracking-wider">
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
                "w-full px-4 py-3 bg-[#1a1612] border-2 rounded-lg text-grimorio-parchment placeholder-grimorio-gold/30",
                "focus:border-grimorio-gold focus:outline-none transition-all resize-none border-grimorio-gold/30"
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

      <motion.button
        type="submit"
        disabled={isLoading || disabled}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className="w-full py-5 text-xl font-cinzel font-bold uppercase tracking-widest
                   bg-gradient-to-b from-[#c19b45] to-[#8b6914] text-[#1a1612]
                   border-4 border-[#c19b45] rounded-xl
                   shadow-[0_8px_32px_rgba(193,155,69,0.4),inset_0_2px_0_rgba(255,255,255,0.2)]
                   hover:shadow-[0_12px_40px_rgba(193,155,69,0.6),inset_0_2px_0_rgba(255,255,255,0.3)]
                   transition-all duration-300
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-3">
            <span className="w-5 h-5 border-2 border-[#1a1612]/30 border-t-[#1a1612] rounded-full animate-spin" />
            Forjando...
          </span>
        ) : disabled ? (
          <span className="flex items-center justify-center gap-2">
            ⚠️ Selecciona un modelo
          </span>
        ) : (
          '⚒️ Forjar Mazo con IA'
        )}
      </motion.button>

      <p className="text-center text-grimorio-gold/40 text-xs">
        * La identidad de color es obligatoria • La IA usará el prompt (si se provee) para guiar la estrategia
      </p>
    </form>
  );
}