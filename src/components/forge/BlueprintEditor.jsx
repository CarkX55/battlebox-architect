import { useState, useEffect, useMemo } from 'react';
import { cn } from '../../utils/cn';
import { 
  PlusCircle, 
  MinusCircle, 
  Check, 
  ArrowLeft, 
  Zap, 
  Sparkles, 
  Flame, 
  Wrench, 
  Terminal,
  Scroll,
  Swords,
  BookOpen,
  Crown,
  Layers,
  Eye,
  EyeOff,
  AlertTriangle,
  HelpCircle,
  Activity,
  ShieldCheck
} from 'lucide-react';

export default function BlueprintEditor({ blueprint, format, onAssemble, onBack }) {
  const [editedBlueprint, setEditedBlueprint] = useState(() => JSON.parse(JSON.stringify(blueprint)));
  const [selectedCommander, setSelectedCommander] = useState('');
  const [showJson, setShowJson] = useState(false);

  // Auto-select first suggested commander on mount if commander format
  useEffect(() => {
    if (format?.toUpperCase() === 'COMMANDER' && editedBlueprint.suggestedCommanders?.length > 0) {
      setSelectedCommander(editedBlueprint.suggestedCommanders[0]);
    }
  }, [format, editedBlueprint.suggestedCommanders]);

  // --- CÁLCULOS MATEMÁTICOS DE SALUD EN TIEMPO REAL (FRANK KARSTEN & VMP) ---
  const currentTotal = editedBlueprint.roles.reduce((sum, r) => sum + r.quantity, 0);
  const targetTotal = blueprint.totalSpells || 40;
  const isCountMatch = currentTotal === targetTotal;

  const estimatedVmp = useMemo(() => {
    const total = currentTotal || 1;
    const weightedCmc = editedBlueprint.roles.reduce((sum, r) => sum + (r.target_cmc || 2) * r.quantity, 0);
    return (weightedCmc / total).toFixed(2);
  }, [editedBlueprint.roles, currentTotal]);

  const recommendedLands = useMemo(() => {
    const vmpNum = parseFloat(estimatedVmp) || 2.5;
    const isCommander = format?.toUpperCase() === 'COMMANDER';
    if (isCommander) {
      return Math.round(36 + (vmpNum - 2.5) * 3);
    }
    return Math.round(24 + (vmpNum - 2.5) * 2.5);
  }, [estimatedVmp, format]);

  const liveHealthScore = useMemo(() => {
    let score = 98;
    if (!isCountMatch) score -= 15;
    const vmpNum = parseFloat(estimatedVmp) || 2.5;
    if (vmpNum > 3.2 && recommendedLands < 25) score -= 10;
    
    const removalQty = editedBlueprint.roles
      .filter(r => (r.name || '').toLowerCase().includes('removal') || (r.purposeDescription || '').toLowerCase().includes('removal'))
      .reduce((sum, r) => sum + r.quantity, 0);
    if (removalQty < 2) score -= 10;
    
    return Math.max(40, Math.min(100, score));
  }, [isCountMatch, estimatedVmp, recommendedLands, editedBlueprint.roles]);

  const handleApplyTop8Preset = () => {
    setEditedBlueprint(prev => {
      const isCommander = format?.toUpperCase() === 'COMMANDER';
      const targetSpells = isCommander ? 63 : 36;
      
      const updatedRoles = prev.roles.map(r => {
        const nameLower = (r.name || '').toLowerCase();
        let newQty = r.quantity;
        
        if (nameLower.includes('land') || nameLower.includes('tierra')) {
          newQty = isCommander ? 37 : 24;
        } else if (nameLower.includes('removal') || nameLower.includes('interaction')) {
          newQty = isCommander ? 10 : 6;
        } else if (nameLower.includes('draw') || nameLower.includes('cantrip')) {
          newQty = isCommander ? 10 : 4;
        }
        return { ...r, quantity: newQty };
      });

      const newSum = updatedRoles.reduce((sum, r) => sum + r.quantity, 0);
      return {
        ...prev,
        roles: updatedRoles,
        totalSpells: newSum
      };
    });
  };

  const handleQuantityChange = (index, delta) => {
    setEditedBlueprint(prev => {
      const newRoles = prev.roles.map((r, i) => {
        if (i === index) {
          return { ...r, quantity: Math.max(0, r.quantity + delta) };
        }
        return r;
      });
      const newTotal = newRoles.reduce((sum, r) => sum + r.quantity, 0);
      return {
        ...prev,
        roles: newRoles,
        totalSpells: newTotal
      };
    });
  };

  const handleQueryChange = (index, val) => {
    setEditedBlueprint(prev => {
      const newRoles = prev.roles.map((r, i) => {
        if (i === index) {
          return { ...r, search_query: val };
        }
        return r;
      });
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const handleRoleNameChange = (index, val) => {
    setEditedBlueprint(prev => {
      const newRoles = prev.roles.map((r, i) => {
        if (i === index) {
          return { ...r, name: val };
        }
        return r;
      });
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const handleRolePurposeChange = (index, val) => {
    setEditedBlueprint(prev => {
      const newRoles = prev.roles.map((r, i) => {
        if (i === index) {
          return { ...r, purposeDescription: val };
        }
        return r;
      });
      return {
        ...prev,
        roles: newRoles
      };
    });
  };

  const handleMetaChange = (field, val) => {
    setEditedBlueprint(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleSubmit = () => {
    const finalBlueprint = {
      ...editedBlueprint,
      selectedCommander: format?.toUpperCase() === 'COMMANDER' ? selectedCommander : undefined
    };
    onAssemble(finalBlueprint);
  };

  // Ayudante para colores de CMC
  const getCmcBadgeStyles = (cmc) => {
    const val = String(cmc).toLowerCase();
    if (val.includes('1')) return 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300';
    if (val.includes('2')) return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    if (val.includes('3')) return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
    if (val.includes('4') || val.includes('5')) return 'bg-orange-500/10 border-orange-500/30 text-orange-300';
    return 'bg-stone-500/10 border-stone-500/30 text-stone-300';
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
      
      {/* Decorative magical aura background */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-magic-gold/5 rounded-full filter blur-[100px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-red-500/5 rounded-full filter blur-[100px] pointer-events-none -z-10" />

      {/* Header Panel */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-b from-[#1c1815] to-[#120f0d] border border-magic-gold/20 p-6 sm:p-8 rounded-3xl relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5),_inset_0_1px_1px_rgba(255,255,255,0.05)] backdrop-blur-xl">
        <div 
          style={{
            backgroundImage: "url('/ASSETS/FrostedGlass.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
          className="absolute inset-0 opacity-5 pointer-events-none"
        />
        
        {/* Glow overlay */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-magic-gold/10 rounded-full filter blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 relative z-10 w-full lg:w-auto">
          <button
            onClick={onBack}
            className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-magic-gold/45 bg-black/40 hover:bg-black/80 text-white/70 hover:text-magic-gold transition-all duration-300 flex items-center gap-2 text-xs font-cinzel font-bold tracking-wider group"
          >
            <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Volver al Grimorio</span>
          </button>
          
          <div className="space-y-1 mt-2 sm:mt-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-magic-gold/15 text-magic-gold text-[9px] font-black uppercase tracking-widest border border-magic-gold/25 animate-pulse">
                Fase 1 Completada
              </span>
              <span className="text-[10px] text-white/45 font-mono uppercase tracking-widest">
                Estructuración RAG
              </span>
            </div>
            <h1 className="font-cinzel text-xl sm:text-2xl lg:text-3xl text-white font-black tracking-wider uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Esqueleto Estructural Generado
            </h1>
          </div>
        </div>

        {/* Counter and Submit Action */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 w-full lg:w-auto relative z-10 pt-4 lg:pt-0 border-t lg:border-t-0 border-white/10">
          <div className="text-left sm:text-right space-y-1">
            <span className="text-[9px] text-white/40 uppercase block font-bold tracking-widest font-sans">
              Total Hechizos Planificados
            </span>
            <div className="flex items-baseline justify-start sm:justify-end gap-1.5">
              <span className={cn(
                "text-3xl font-black font-cinzel tracking-wider transition-colors drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]", 
                isCountMatch ? "text-emerald-400 text-glow-emerald" : "text-amber-400 text-glow-amber animate-pulse"
              )}>
                {currentTotal}
              </span>
              <span className="text-white/20 text-sm">/</span>
              <span className="text-white/60 text-xs font-bold font-mono">{targetTotal} cartas</span>
            </div>
            {/* Visual Mini Progress Bar */}
            <div className="w-full sm:w-36 h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5 relative">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 shadow-inner",
                  isCountMatch 
                    ? "bg-gradient-to-r from-emerald-500 to-teal-400" 
                    : "bg-gradient-to-r from-amber-500 to-orange-400"
                )}
                style={{ width: `${Math.min(100, (currentTotal / targetTotal) * 100)}%` }}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isCountMatch}
            className={cn(
              "px-6 py-4 font-cinzel font-bold text-xs uppercase tracking-widest rounded-xl transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden shadow-lg",
              isCountMatch
                ? "bg-gradient-to-r from-magic-gold to-[#d4af37] text-black hover:brightness-110 hover:shadow-[0_0_25px_rgba(255,202,88,0.35)] active:scale-95 cursor-pointer"
                : "bg-stone-800/40 border border-white/10 text-white/30 cursor-not-allowed opacity-50"
            )}
          >
            {isCountMatch && (
              <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            )}
            <Sparkles size={14} className={cn("shrink-0", isCountMatch ? "animate-pulse" : "opacity-30")} />
            <span>Ensamblar Mazo Físico</span>
          </button>
        </div>
      </div>

      {/* Live Blueprint Health Gauge Widget */}
      <div className="bg-black/60 border border-magic-gold/30 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-lg",
            liveHealthScore >= 85 
              ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-400" 
              : "bg-amber-500/10 border-amber-500/40 text-amber-400"
          )}>
            <span className="text-xs uppercase font-bold text-white/50 tracking-widest text-[9px]">Salud</span>
            <span className="text-xl font-black font-cinzel">{liveHealthScore}</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-magic-gold" />
              <h4 className="font-cinzel text-sm text-white font-bold uppercase tracking-wider">Asistente Karsten en Tiempo Real</h4>
            </div>
            <p className="text-xs text-white/60 font-serif leading-relaxed">
              Curva proyectada: <strong className="text-magic-gold">{estimatedVmp} CMC</strong> • Tierras recomendadas: <strong className="text-emerald-400">{recommendedLands} tierras</strong>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleApplyTop8Preset}
          className="px-4 py-2.5 bg-magic-gold/10 hover:bg-magic-gold/20 border border-magic-gold/40 hover:border-magic-gold text-magic-gold rounded-xl font-cinzel text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shrink-0 shadow-md"
        >
          <Zap size={14} className="animate-pulse" />
          <span>Cargar ADN Top 8 (70/30)</span>
        </button>
      </div>

      {/* Warnings when count does not match */}
      {!isCountMatch && (
        <div className="p-4 bg-amber-950/20 border border-amber-500/35 rounded-2xl flex items-start gap-3 relative z-10 animate-pulse shadow-md">
          <AlertTriangle className="text-amber-400 shrink-0 mt-0.5" size={16} />
          <div className="flex-1 text-xs text-amber-200/90 leading-relaxed font-sans">
            <strong className="text-amber-300 block uppercase tracking-wider mb-0.5">⚠️ Desajuste en el Conteo de Hechizos</strong>
            El esqueleto estructural requiere exactamente <strong className="text-white">{targetTotal}</strong> hechizos planificados, pero actualmente tienes configurados <strong className="text-white">{currentTotal}</strong>. Ajusta las cantidades en los roles a continuación para poder proceder al ensamblado.
          </div>
        </div>
      )}

      {/* Grid General */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Theme details & Commander selection */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Theme Card */}
          <div className="bg-gradient-to-b from-[#161311] to-[#0d0a09] border border-white/10 p-6 rounded-3xl space-y-5 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-magic-gold/2 pointer-events-none" />
            
            <h3 className="font-cinzel text-xs text-[#ffca58] font-bold uppercase tracking-[0.2em] border-b border-white/10 pb-3.5 flex items-center gap-2">
              <Scroll size={14} className="text-magic-gold" />
              <span>Detalles Temáticos del Mazo</span>
            </h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1 block">Nombre Temático</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editedBlueprint.deckName || ''}
                    onChange={(e) => handleMetaChange('deckName', e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white font-cinzel text-xs focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/20 focus:outline-none transition-all placeholder-white/20"
                    placeholder="Escribe el nombre del grimorio..."
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1 block">Lore / Historia</label>
                <div className="relative group">
                  <textarea
                    value={editedBlueprint.lore || ''}
                    onChange={(e) => handleMetaChange('lore', e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white/80 text-xs leading-relaxed focus:border-magic-gold focus:outline-none focus:ring-1 focus:ring-magic-gold/20 resize-none font-sans custom-scrollbar transition-all"
                    placeholder="El trasfondo narrativo de este mazo..."
                  />
                </div>
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1 block">Estrategia de Victoria</label>
                <div className="relative">
                  <textarea
                    value={editedBlueprint.strategy || ''}
                    onChange={(e) => handleMetaChange('strategy', e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white/80 text-xs leading-relaxed focus:border-magic-gold focus:outline-none focus:ring-1 focus:ring-magic-gold/20 resize-none font-sans custom-scrollbar transition-all"
                    placeholder="¿Cómo planea ganar este mazo?"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-bold text-white/40 mb-1 block">Guía de Mulligan</label>
                <div className="relative">
                  <textarea
                    value={editedBlueprint.mulligan || ''}
                    onChange={(e) => handleMetaChange('mulligan', e.target.value)}
                    rows={4}
                    className="w-full px-3.5 py-2.5 bg-black/60 border border-white/15 rounded-xl text-white/80 text-xs leading-relaxed focus:border-magic-gold focus:outline-none focus:ring-1 focus:ring-magic-gold/20 resize-none font-sans custom-scrollbar transition-all"
                    placeholder="Consejos prácticos para la mano inicial..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Commander Selection (COMMANDER format only) */}
          {format?.toUpperCase() === 'COMMANDER' && (
            <div className="bg-gradient-to-b from-[#161311] to-[#0d0a09] border border-white/10 p-6 rounded-3xl space-y-4 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute inset-0 bg-magic-gold/2 pointer-events-none" />
              
              <h3 className="font-cinzel text-xs text-[#ffca58] font-bold uppercase tracking-[0.2em] border-b border-white/10 pb-3.5 flex items-center gap-2">
                <Crown size={14} className="text-magic-gold" />
                <span>Elección de Comandante</span>
              </h3>
              
              <p className="text-[10px] text-[#f4ece0]/50 leading-relaxed font-sans">
                Elige la criatura legendaria que liderará tu mazo. Esto determinará tu identidad de color y será removida de la biblioteca principal para ir a la Zona de Comando.
              </p>

              <div className="space-y-2.5 pt-2">
                {(editedBlueprint.suggestedCommanders || ['Legendary Creature A', 'Legendary Creature B', 'Legendary Creature C']).map((commander) => {
                  const isSelected = selectedCommander === commander;
                  return (
                    <button
                      type="button"
                      key={commander}
                      onClick={() => setSelectedCommander(commander)}
                      className={cn(
                        "w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all duration-300 relative group overflow-hidden",
                        isSelected
                          ? "border-magic-gold bg-gradient-to-r from-magic-gold/15 to-transparent text-white font-bold shadow-[0_0_15px_rgba(255,202,88,0.15)] scale-[1.01]"
                          : "border-white/10 bg-black/40 text-white/60 hover:text-white hover:bg-black/60 hover:border-white/20"
                      )}
                    >
                      <div className="flex items-center gap-2.5 relative z-10">
                        <span className={cn("text-xs transition-transform duration-300", isSelected ? "scale-110 drop-shadow-[0_0_5px_#ffca58]" : "opacity-50")}>👑</span>
                        <span className="text-xs font-sans tracking-wide uppercase truncate max-w-[200px]">{commander}</span>
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-all shrink-0 z-10",
                        isSelected ? "border-magic-gold bg-magic-gold text-black" : "border-white/20 group-hover:border-white/40"
                      )}>
                        {isSelected && <Check size={10} strokeWidth={3.5} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Role Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gradient-to-b from-[#161311] to-[#0d0a09] border border-white/10 p-6 sm:p-8 rounded-3xl space-y-6 shadow-xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-magic-gold/2 pointer-events-none" />
            
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
              <h3 className="font-cinzel text-xs text-[#ffca58] font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                <Layers size={14} className="text-magic-gold" />
                <span>Configuración de Roles del Blueprint</span>
              </h3>
              
              <button
                type="button"
                onClick={() => setShowJson(!showJson)}
                className="px-3 py-1.5 rounded-lg border border-white/10 hover:border-magic-gold/30 bg-black/40 text-[9px] uppercase tracking-widest text-[#ffca58] font-bold transition-all flex items-center gap-1.5"
              >
                {showJson ? <EyeOff size={10} /> : <Eye size={10} />}
                <span>{showJson ? "Ocultar JSON" : "Ver JSON"}</span>
              </button>
            </div>

            {showJson ? (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/90 p-5 font-mono text-[10px] text-magic-gold/90 max-h-[600px] overflow-y-auto custom-scrollbar shadow-inner relative">
                <pre>{JSON.stringify(editedBlueprint, null, 2)}</pre>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {editedBlueprint.roles.map((role, idx) => {
                  const isFinisher = role.finisherQuality === 'finisher';
                  const isLastOdd = idx === editedBlueprint.roles.length - 1 && editedBlueprint.roles.length % 2 !== 0;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 relative group backdrop-blur-md bg-black/40 overflow-hidden shadow-lg",
                        isLastOdd ? "md:col-span-2" : "",
                        isFinisher
                          ? "border-red-500/10 hover:border-red-500/35 bg-gradient-to-br from-black/80 to-red-950/5 hover:shadow-[0_0_20px_rgba(239,68,68,0.08)]"
                          : "border-blue-500/10 hover:border-blue-500/35 bg-gradient-to-br from-black/80 to-blue-950/5 hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]"
                      )}
                    >
                      {/* Decorative colored glow on card hover */}
                      <div className={cn(
                        "absolute -right-16 -top-16 w-32 h-32 rounded-full filter blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none",
                        isFinisher ? "bg-red-500" : "bg-blue-500"
                      )} />

                      <div className="space-y-2">
                        {/* Card Header */}
                        <div className="flex justify-between items-start gap-2.5">
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={role.name}
                              onChange={(e) => handleRoleNameChange(idx, e.target.value)}
                              className="bg-transparent border-0 border-b border-transparent hover:border-white/20 focus:border-magic-gold text-white font-cinzel font-black text-[11px] sm:text-xs uppercase tracking-wider focus:outline-none w-full py-0.5 truncate transition-colors"
                            />
                          </div>
                          
                          <span className={cn(
                            "px-2.5 py-0.5 text-[8.5px] rounded-full uppercase font-bold tracking-widest shrink-0 flex items-center gap-1 border shadow-sm",
                            isFinisher 
                              ? "bg-red-950/40 border-red-500/25 text-red-400" 
                              : "bg-blue-950/40 border-blue-500/25 text-blue-400"
                          )}>
                            {isFinisher ? (
                              <>
                                <Flame size={10} className="text-red-400" />
                                <span>Finisher</span>
                              </>
                            ) : (
                              <>
                                <Wrench size={10} className="text-blue-400" />
                                <span>Soporte</span>
                              </>
                            )}
                          </span>
                        </div>

                        {/* Description field */}
                        <div className="relative group/text">
                          <textarea
                            rows={2}
                            value={role.purposeDescription}
                            onChange={(e) => handleRolePurposeChange(idx, e.target.value)}
                            className="bg-black/20 hover:bg-black/40 focus:bg-black/60 border border-transparent hover:border-white/5 focus:border-white/10 text-[10.5px] text-white/50 focus:text-white/80 leading-relaxed font-sans w-full focus:outline-none rounded-xl p-2 resize-none transition-all custom-scrollbar"
                            placeholder="Describe el propósito o rol táctico..."
                          />
                        </div>
                      </div>

                      {/* Controls and Terminal query */}
                      <div className="pt-3.5 border-t border-white/5 space-y-3 relative z-10">
                        <div className="flex justify-between items-center gap-2">
                          
                          {/* Stepper Control */}
                          <div className="flex items-center gap-1 bg-black/70 rounded-xl p-0.5 border border-white/10 shadow-inner">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, -1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 text-white/50 transition-colors"
                              title="Reducir cantidad"
                            >
                              <MinusCircle size={13} />
                            </button>
                            <span className="w-8 text-center font-mono font-bold text-xs text-white">
                              {role.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(idx, 1)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-green-500/20 hover:text-green-400 text-white/50 transition-colors"
                              title="Incrementar cantidad"
                            >
                              <PlusCircle size={13} />
                            </button>
                          </div>

                          {/* Visual Pips representing quantity */}
                          <div className="hidden sm:flex items-center gap-0.5 flex-1 max-w-[80px] overflow-hidden opacity-60">
                            {Array.from({ length: Math.min(10, role.quantity) }).map((_, pIdx) => (
                              <div 
                                key={pIdx} 
                                className={cn(
                                  "w-1 h-3 rounded-full shadow-inner",
                                  isFinisher ? "bg-red-500" : "bg-blue-500"
                                )} 
                              />
                            ))}
                            {role.quantity > 10 && <span className="text-[7.5px] font-bold text-white/40 ml-0.5">+</span>}
                          </div>

                          {/* CMC Badge */}
                          <div className="flex items-center gap-1.5 shrink-0 select-none">
                            <span className="text-[8px] text-white/30 font-bold uppercase tracking-wider">CMC Obj:</span>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg border font-mono text-[9.5px] font-black uppercase tracking-wider shadow-sm",
                              getCmcBadgeStyles(role.cmcCategory)
                            )}>
                              {role.cmcCategory || 'any'}
                            </span>
                          </div>
                        </div>

                        {/* Scryfall terminal query */}
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase font-bold text-white/30 tracking-wider mb-0.5 block flex items-center gap-1">
                            <Terminal size={8} />
                            <span>Consulta de Filtro RAG (Scryfall)</span>
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3 text-[9px] font-black font-mono text-[#ffca58] select-none">&gt;</span>
                            <input
                              type="text"
                              value={role.search_query}
                              onChange={(e) => handleQueryChange(idx, e.target.value)}
                              className="w-full pl-6 pr-3 py-2 bg-black/85 border border-white/10 rounded-xl text-[10px] text-[#ffdf91] font-mono focus:border-magic-gold focus:ring-1 focus:ring-magic-gold/25 focus:outline-none transition-all shadow-inner"
                              placeholder="c:w type:creature oracle:flying..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
