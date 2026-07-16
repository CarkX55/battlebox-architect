import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, Scroll, ShieldAlert, Swords, Box, Gem, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';

const PHASES = [
  { id: 'blueprint', label: 'Consultando el Oráculo', desc: 'Canalizando el Blueprint con IA y RAG...', icon: <Scroll className="w-5 h-5" /> },
  { id: 'assembler', label: 'Ensamblando el Grimorio', desc: 'Asignando cartas y calculando base de maná...', icon: <Settings className="w-5 h-5" /> },
  { id: 'hydrate', label: 'Invocando Ilustraciones', desc: 'Cargando imágenes de Scryfall...', icon: <Gem className="w-5 h-5" /> },
  { id: 'strategist', label: 'Forjando el Banquillo', desc: 'Calculando respuestas del sideboard...', icon: <Swords className="w-5 h-5" /> },
  { id: 'audit', label: 'Juicio del Juez Supremo', desc: 'Analizando consistencia e hipergeométrica...', icon: <ShieldAlert className="w-5 h-5" /> }
];

export default function ForgeLoadingScreen({ forgePhase }) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activePhase = forgePhase?.phase || 'blueprint';
  const activeMessage = forgePhase?.message || 'Invocando la sabiduría de Gemini...';

  // Obtener el índice de la fase activa para calcular el porcentaje
  const activeIndex = PHASES.findIndex(p => p.id === activePhase);
  const resolvedIndex = activeIndex === -1 ? 0 : activeIndex;
  const progressPercent = Math.min(100, Math.round(((resolvedIndex + 0.5) / PHASES.length) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover opacity-5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl frosted-panel border-2 border-magic-gold p-8 bg-gradient-to-b from-[#18120c] via-[#0b0805] to-black shadow-[0_0_50px_rgba(255,202,88,0.25)] text-center space-y-6 relative overflow-hidden"
      >
        {/* Glow Effects */}
        <div className="absolute -top-32 -left-32 w-64 h-64 bg-magic-gold/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-64 h-64 bg-magic-gold/5 rounded-full blur-3xl pointer-events-none" />

        {/* Header Icon */}
        <div className="relative flex justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
            className="w-20 h-20 rounded-full border border-magic-gold/30 flex items-center justify-center bg-black/40 shadow-[0_0_20px_rgba(255,202,88,0.15)]"
          >
            <motion.img 
              src="/ASSETS/Engranaje.webp" 
              alt="Cargando" 
              className="w-12 h-12 object-contain drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]"
            />
          </motion.div>
          <Sparkles className="absolute -top-1 right-[40%] text-magic-gold animate-pulse w-5 h-5" />
        </div>

        {/* Title and Timer */}
        <div className="space-y-1">
          <h3 className="font-cinzel text-xl font-black uppercase tracking-[0.2em] text-[#ffca58] drop-shadow-md">
            Forja de Ecosistema Activa
          </h3>
          <p className="text-xs text-white/40 font-mono">
            Tiempo transcurrido: <span className="text-[#ffca58] font-bold">{elapsedTime}s</span>
          </p>
        </div>

        {/* Message Banner */}
        <div className="p-3 bg-black/60 border border-white/5 rounded-xl font-serif text-[13px] text-white/90 shadow-inner italic">
          {activeMessage}
        </div>

        {/* Custom Progress Bar */}
        <div className="space-y-1.5 text-left">
          <div className="flex justify-between text-[10px] font-bold text-[#ffca58] uppercase tracking-wider">
            <span>Progreso de Conjuración</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/5 border border-white/10 h-2.5 rounded-full overflow-hidden relative shadow-inner">
            <motion.div 
              initial={{ width: '0%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full bg-gradient-to-r from-magic-gold to-[#ffca58] shadow-[0_0_10px_#ffca58] rounded-full"
            />
          </div>
        </div>

        {/* Phases list */}
        <div className="border-t border-white/10 pt-5 space-y-3.5 text-left">
          {PHASES.map((phase, idx) => {
            const isCompleted = resolvedIndex > idx;
            const isActive = activePhase === phase.id;
            
            return (
              <div 
                key={phase.id}
                className={`flex items-center gap-3.5 transition-all duration-300 ${
                  isActive ? 'opacity-100 scale-[1.01]' : isCompleted ? 'opacity-65' : 'opacity-25'
                }`}
              >
                <div className={`w-8 h-8 rounded-full border flex items-center justify-center shadow-md ${
                  isActive ? 'border-[#ffca58] bg-[#ffca58]/10 text-[#ffca58]' : 
                  isCompleted ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-white/10 bg-black/40 text-white/30'
                }`}>
                  {isCompleted ? (
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="font-bold text-xs">✓</motion.span>
                  ) : isActive ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    phase.icon
                  )}
                </div>
                <div>
                  <h4 className={`text-xs font-cinzel font-black uppercase tracking-wider ${
                    isActive ? 'text-[#ffca58] drop-shadow-[0_0_5px_rgba(255,202,88,0.2)]' :
                    isCompleted ? 'text-emerald-400' : 'text-white/60'
                  }`}>
                    {phase.label}
                  </h4>
                  <p className="text-[10px] text-white/45 font-sans leading-none mt-0.5">{phase.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
