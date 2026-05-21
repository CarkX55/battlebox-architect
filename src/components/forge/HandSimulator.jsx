import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';
import { AlertTriangle, CheckCircle2, Sparkles, HelpCircle, Activity } from 'lucide-react';
import { evaluateMulligan } from '../../services/aiFactory';
import { cn } from '../../utils/cn';

// Auditoría Matemática Local (Instantánea)
const analyzeHandLocally = (hand) => {
  const lands = hand.filter(c => (c.category || '').toLowerCase() === 'land' || ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(c.name.toLowerCase()));
  const landsCount = lands.length;
  
  let landAdvice = '';
  let status = 'neutral';
  
  if (landsCount === 0) {
    landAdvice = '❌ MANO INVIABLE: 0 Tierras. Un Mulligan es obligatorio.';
    status = 'bad';
  } else if (landsCount === 1) {
    landAdvice = '⚠️ ALTO RIESGO: Solo 1 Tierra. A menos que tengas cantrips de coste 1 o elfos de maná, deberías hacer Mulligan.';
    status = 'warning';
  } else if (landsCount >= 2 && landsCount <= 4) {
    landAdvice = `✅ EXCELENTE EQUILIBRIO: ${landsCount} Tierras. Esta mano tiene una base de maná ideal para curvar.`;
    status = 'good';
  } else if (landsCount === 5 || landsCount === 6) {
    landAdvice = `⚠️ RIESGO DE FLOOD: ${landsCount} Tierras. Tienes demasiadas fuentes y podrías quedarte sin gas rápido.`;
    status = 'warning';
  } else if (landsCount === 7) {
    landAdvice = '❌ MANO INVIABLE: 7 Tierras. Mulligan obligatorio.';
    status = 'bad';
  }

  // Comprobación rápida de Doble-Pip específico
  const doublePipWarnings = [];
  const blueLands = lands.filter(l => /island|isla|pool|vents|fountain|grave|delta|strand|shore|canal|coast/i.test(l.name));
  const blackLands = lands.filter(l => /swamp|pantano|grave|crypt|catacomb|marsh|delta|tar|summit/i.test(l.name));
  const redLands = lands.filter(l => /mountain|montaña|vents|crypt|tomb|foothills|mesa|cliff|ridge/i.test(l.name));
  const whiteLands = lands.filter(l => /plains|llanura|fountain|shrine|garden|strand|mesa|heath|chapel/i.test(l.name));
  const greenLands = lands.filter(l => /forest|bosque|pool|garden|tomb|foothills|heath|cemetery/i.test(l.name));

  hand.forEach(c => {
    const cost = (c.mana_cost || c.cost || '').toUpperCase();
    if (cost.includes('UU') && blueLands.length < 2) {
      doublePipWarnings.push(`Requiere {U}{U} (${c.name}) pero solo tienes ${blueLands.length} fuentes azules.`);
    }
    if (cost.includes('BB') && blackLands.length < 2) {
      doublePipWarnings.push(`Requiere {B}{B} (${c.name}) pero solo tienes ${blackLands.length} fuentes negras.`);
    }
    if (cost.includes('RR') && redLands.length < 2) {
      doublePipWarnings.push(`Requiere {R}{R} (${c.name}) pero solo tienes ${redLands.length} fuentes rojas.`);
    }
    if (cost.includes('WW') && whiteLands.length < 2) {
      doublePipWarnings.push(`Requiere {W}{W} (${c.name}) pero solo tienes ${whiteLands.length} fuentes blancas.`);
    }
    if (cost.includes('GG') && greenLands.length < 2) {
      doublePipWarnings.push(`Requiere {G}{G} (${c.name}) pero solo tienes ${greenLands.length} fuentes verdes.`);
    }
  });

  return {
    landsCount,
    spellsCount: 7 - landsCount,
    landAdvice,
    status,
    doublePipWarnings
  };
};

export default function HandSimulator({ deck, isOpen, onClose, aiConfig }) {
  const [hand, setHand] = useState([]);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [currentDeck, setCurrentDeck] = useState([]);
  
  // States del Mulligan Coach
  const [localAnalysis, setLocalAnalysis] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const shuffleDeck = (cards) => {
    const flat = cards.flatMap(card => Array(card.quantity || 1).fill(card));
    const shuffled = [...flat];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const restartSimulation = () => {
    if (!deck || deck.length === 0) return;
    const shuffled = shuffleDeck(deck);
    setHand(shuffled.slice(0, 7));
    setCurrentDeck(shuffled.slice(7));
    setMulliganCount(prev => prev + 1);
    setAiAnalysis(null);
  };

  const drawOne = () => {
    if (currentDeck.length === 0) return;
    const [next, ...rest] = currentDeck;
    setHand(prev => [...prev, next]);
    setCurrentDeck(rest);
  };

  useEffect(() => {
    if (isOpen) restartSimulation();
  }, [isOpen]);

  useEffect(() => {
    if (hand.length > 0) {
      setLocalAnalysis(analyzeHandLocally(hand));
    }
  }, [hand]);

  const handleConsultAI = async () => {
    if (!hand.length || !deck.length) return;
    setIsAiLoading(true);
    try {
      const res = await evaluateMulligan(hand, deck, aiConfig);
      setAiAnalysis(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f0d0c] border-2 border-grimorio-gold/30 rounded-3xl w-full max-w-6xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden relative flex flex-col min-h-[600px] max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 shrink-0 border-b border-grimorio-gold/10 pb-4 animate-glow">
          <div className="text-center md:text-left flex items-center gap-4">
            <img src="/ASSETS/ManoDragon.webp" alt="Mano Dragon" className="w-16 h-16 object-contain drop-shadow-[0_0_35px_rgba(255,202,88,0.6)] hidden sm:block" />
            <div>
              <h2 className="text-2xl font-cinzel text-grimorio-gold">
                El Destino del Duelista
              </h2>
              <p className="text-grimorio-gold/40 font-serif text-xs mt-1 tracking-wide italic">"Siente el peso de las cartas antes del primer conjuro."</p>
            </div>
          </div>
          
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={drawOne}
              disabled={currentDeck.length === 0}
              className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold rounded-lg hover:bg-blue-500/20 transition-all disabled:opacity-20 flex items-center gap-2 text-xs"
            >
              <span>📥</span> Robar ({currentDeck.length})
            </button>
            <button
              onClick={restartSimulation}
              className="px-6 py-2 bg-grimorio-gold text-black font-black rounded-lg hover:bg-white transition-all shadow-[0_0_20px_rgba(193,155,69,0.3)] active:scale-95 uppercase text-[10px] tracking-widest"
            >
              🔄 Nuevo Mulligan
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-white/10 text-white/40 rounded-lg hover:text-white hover:bg-white/5 transition-all font-bold text-[10px] uppercase"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Main Work Area */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 mt-4 overflow-hidden min-h-0">
          
          {/* Left Column: Visual Hand Fan */}
          <div className="flex-1 flex items-center justify-center relative py-6 min-h-[300px] lg:min-h-0">
            <div className="relative w-full h-full flex justify-center items-center">
              <AnimatePresence mode="popLayout">
              {hand.map((card, idx) => {
                const total = hand.length;
                const mid = (total - 1) / 2;
                
                const spread = total > 10 ? 45 : 75; 
                const rotFactor = total > 10 ? 1.0 : 1.8; 
                
                const rotation = (idx - mid) * rotFactor;
                const yOffset = Math.pow(Math.abs(idx - mid), 1.5) * (total > 10 ? 3 : 6);
                const xOffset = (idx - mid) * spread;

                return (
                  <motion.div
                    key={`${mulliganCount}-${card.name}-${idx}`}
                    variants={{
                      hidden: { opacity: 0, y: 300, x: -50, rotate: -20 },
                      visible: (i) => ({
                        opacity: 1,
                        y: yOffset,
                        x: `calc(-50% + ${xOffset}px)`,
                        rotate: rotation,
                        zIndex: i,
                        transition: {
                          type: "spring",
                          stiffness: 300,
                          damping: 25,
                          mass: 0.8,
                          delay: i * 0.05
                        }
                      }),
                      hover: {
                        y: yOffset - 60,
                        scale: 1.15,
                        rotate: 0,
                        zIndex: 100,
                        transition: { type: "spring", stiffness: 400, damping: 28 }
                      }
                    }}
                    initial="hidden"
                    animate="visible"
                    whileHover="hover"
                    custom={idx}
                    exit={{ opacity: 0, scale: 0.5, y: -200, transition: { duration: 0.2 } }}
                    className="absolute left-1/2 w-[160px] sm:w-[180px]"
                    style={{ transformOrigin: "bottom center" }}
                  >
                    <MagicCard 
                      card={card} 
                      showQuantity={false} 
                      isInteractive={false}
                      className="shadow-2xl"
                    />
                  </motion.div>
                );
              })}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Mulligan Coach Panel */}
          <div className="w-full lg:w-96 bg-black/50 border border-[#D4AF37]/20 rounded-2xl p-5 flex flex-col justify-between max-h-full overflow-y-auto glassmorphic-panel">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="font-cinzel text-xs text-magic-gold flex items-center gap-2">
                  <Activity size={14} className="text-[#D4AF37]" /> Asesoría del Mulligan
                </h3>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">PRO COACH</span>
              </div>

              {/* Local Math Auditor */}
              {localAnalysis && (
                <div className="bg-black/30 border border-white/5 rounded-xl p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400">Distribución</span>
                    <span className="text-[11px] text-white font-bold font-sans">
                      {localAnalysis.landsCount} Tierras / {localAnalysis.spellsCount} Hechizos
                    </span>
                  </div>

                  <div className={cn(
                    "text-xs p-2.5 rounded border leading-relaxed",
                    localAnalysis.status === 'good' ? "bg-green-500/5 border-green-500/20 text-green-400" :
                    localAnalysis.status === 'warning' ? "bg-yellow-500/5 border-yellow-500/20 text-yellow-400" :
                    "bg-red-500/5 border-red-500/20 text-red-400"
                  )}>
                    {localAnalysis.landAdvice}
                  </div>

                  {localAnalysis.doublePipWarnings.map((w, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-red-400 bg-red-500/5 border border-red-500/10 p-2 rounded">
                      <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI Oracle Panel */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-cinzel text-magic-gold">Dictamen de la IA</span>
                  <button
                    onClick={handleConsultAI}
                    disabled={isAiLoading}
                    className="px-3 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] hover:text-white rounded text-[10px] font-cinzel flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                  >
                    <Sparkles size={10} className="animate-pulse" />
                    {isAiLoading ? 'Consultando...' : 'Consultar Oráculo'}
                  </button>
                </div>

                {isAiLoading && (
                  <div className="py-8 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px] text-gray-500 font-cinzel">Invocando el saber Pro Tour...</span>
                  </div>
                )}

                {aiAnalysis && !isAiLoading && (
                  <div className="bg-black/40 border border-[#D4AF37]/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-400">Recomendación:</span>
                        <span className={cn(
                          "px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-sans",
                          aiAnalysis.recommendation === 'KEEP' 
                            ? "bg-green-500/20 text-green-400 border border-green-500/30" 
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>
                          {aiAnalysis.recommendation === 'KEEP' ? 'KEEP' : 'MULLIGAN'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-gray-500">Confianza:</span>
                        <span className="text-xs text-white font-bold font-sans">{aiAnalysis.confidence}%</span>
                      </div>
                    </div>

                    <p className="text-xs text-gray-300 leading-relaxed italic border-l-2 border-[#D4AF37]/30 pl-2 py-0.5">
                      "{aiAnalysis.tactical_analysis}"
                    </p>

                    {aiAnalysis.early_plays && aiAnalysis.early_plays.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-white/5">
                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block">Jugadas Tempranas Óptimas:</span>
                        <div className="flex flex-wrap gap-1">
                          {aiAnalysis.early_plays.map((p, idx) => (
                            <span key={idx} className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-200">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <p className="text-grimorio-gold/40 font-cinzel text-[10px] tracking-widest uppercase">
                "Un buen general conoce su mano antes de la batalla."
              </p>
            </div>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}
