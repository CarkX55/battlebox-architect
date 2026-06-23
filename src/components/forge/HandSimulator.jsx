import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';
import { AlertTriangle, CheckCircle2, Sparkles, HelpCircle, Activity, BarChart2, Info, BookOpen } from 'lucide-react';
import { evaluateMulligan } from '../../services/aiFactory';
import { cn } from '../../utils/cn';
import { useIsMobile } from '../../hooks/useIsMobile';
import { vibrateTouch } from '../../utils/haptic';

// --- CÁLCULO ESTADÍSTICO HIPERGEOMÉTRICO NATIVO ---

// Coeficiente Binomial estable C(n, k)
function binomialCoefficient(n, k) {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  if (k === 1 || k === n - 1) return n;
  let res = 1;
  const limit = Math.min(k, n - k);
  for (let i = 1; i <= limit; i++) {
    res = res * (n - i + 1) / i;
  }
  return Math.round(res);
}

/**
 * Calcula la probabilidad acumulada hipergeométrica de obtener "al menos k" éxitos
 * @param {number} k - Éxitos deseados (al menos)
 * @param {number} n - Tamaño de la muestra (cartas robadas)
 * @param {number} K - Éxitos totales en la población (cartas del tipo en el mazo)
 * @param {number} N - Tamaño de la población (tamaño del mazo)
 * @returns {number} - Porcentaje con 1 decimal (ej: 87.4)
 */
export function calculateHypergeometric(k, n, K, N) {
  if (N <= 0 || n <= 0 || K < 0 || k < 0 || k > n || K > N) return 0;
  let totalProb = 0;
  const maxSuccesses = Math.min(n, K);
  
  for (let i = k; i <= maxSuccesses; i++) {
    const successesComb = binomialCoefficient(K, i);
    const failuresComb = binomialCoefficient(N - K, n - i);
    const totalComb = binomialCoefficient(N, n);
    
    if (totalComb > 0) {
      totalProb += (successesComb * failuresComb) / totalComb;
    }
  }
  return Math.min(100, Math.max(0, Math.round(totalProb * 1000) / 10));
}

// Función auxiliar ultra-robusta para detectar tierras de cualquier tipo (básicas y especiales)
export const isLandCard = (c) => {
  if (!c) return false;
  const category = (c.category || '').toLowerCase();
  const typeLine = (c.type_line || c.type || '').toLowerCase();
  const name = (c.name || '').toLowerCase();
  
  return (
    category.includes('land') || 
    category.includes('tierra') || 
    typeLine.includes('land') || 
    typeLine.includes('tierra') ||
    ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(name) ||
    /tundra|underground sea|badlands|taiga|savannah|scrubland|volcanic island|bayou|plateau|tropical island/i.test(name) ||
    /hallowed fountain|watery grave|blood crypt|stomping ground|temple garden|godless shrine|steam vents|overgrown tomb|sacred foundry|breeding pool/i.test(name) ||
    /strand|delta|mire|foothills|heath|flats|tarn|catacomb|mesa|rainforest/i.test(name) ||
    /lounge|triome|headquarters|spa|garden/i.test(name)
  );
};

// Auditoría Matemática Local (Mano Inicial)
const analyzeHandLocally = (hand) => {
  const lands = hand.filter(isLandCard);
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
    spellsCount: hand.length - landsCount,
    landAdvice,
    status,
    doublePipWarnings
  };
};

export default function HandSimulator({ deck, isOpen, onClose, aiConfig }) {
  const isMobile = useIsMobile();
  const [hand, setHand] = useState([]);
  const [mulliganCount, setMulliganCount] = useState(0);
  const [currentDeck, setCurrentDeck] = useState([]);
  const [activeIndex, setActiveIndex] = useState(3); // Central card active by default
  
  // Pestañas del Panel de Asesoría: 'coach' | 'stats'
  const [activePanelTab, setActivePanelTab] = useState('coach');
  const [selectedCardForStats, setSelectedCardForStats] = useState(null);

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
    const initialHand = shuffled.slice(0, 7);
    setHand(initialHand);
    setCurrentDeck(shuffled.slice(7));
    setMulliganCount(prev => prev + 1);
    setAiAnalysis(null);
    setSelectedCardForStats(shuffled[7]?.name || null);
    setActiveIndex(Math.floor(initialHand.length / 2));
  };

  const drawOne = () => {
    if (currentDeck.length === 0) return;
    const [next, ...rest] = currentDeck;
    setHand(prev => {
      const updated = [...prev, next];
      setActiveIndex(updated.length - 1);
      return updated;
    });
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

  // --- CÁLCULO ESTADÍSTICO PARA PANEL EN TIEMPO REAL ---
  const statsSummary = useMemo(() => {
    if (!deck || !hand.length) return null;

    const totalDeckSize = deck.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const currentDeckSize = totalDeckSize - hand.length;

    // Calcular cuántas tierras quedan en el mazo
    const totalLandsInMazo = deck.filter(isLandCard).reduce((sum, c) => sum + (c.quantity || 1), 0);
    const landsInHand = hand.filter(isLandCard).length;
    const remainingLandsInMazo = Math.max(0, totalLandsInMazo - landsInHand);

    // Calcular probabilidad de conseguir tierras adicionales
    const landDrawProbabilities = [
      { turn: 1, label: 'Curva Turno 1 (Robar al menos 1 tierra)', prob: calculateHypergeometric(1, 1, remainingLandsInMazo, currentDeckSize) },
      { turn: 2, label: 'Curva Turno 2 (Robar al menos 2 tierras)', prob: calculateHypergeometric(2, 2, remainingLandsInMazo, currentDeckSize) },
      { turn: 3, label: 'Curva Turno 3 (Robar al menos 3 tierras)', prob: calculateHypergeometric(3, 3, remainingLandsInMazo, currentDeckSize) }
    ];

    // Probabilidades para una carta específica seleccionada
    let targetCardProb = null;
    if (selectedCardForStats) {
      const cardObj = deck.find(c => c.name === selectedCardForStats);
      const totalQty = cardObj ? (cardObj.quantity || 1) : 4;
      const inHand = hand.filter(c => c.name === selectedCardForStats).length;
      const remainingInMazo = Math.max(0, totalQty - inHand);

      targetCardProb = {
        name: selectedCardForStats,
        remaining: remainingInMazo,
        probT1: calculateHypergeometric(1, 1, remainingInMazo, currentDeckSize),
        probT3: calculateHypergeometric(1, 3, remainingInMazo, currentDeckSize),
        probT5: calculateHypergeometric(1, 5, remainingInMazo, currentDeckSize)
      };
    }

    return {
      currentDeckSize,
      remainingLands: remainingLandsInMazo,
      landDrawProbabilities,
      targetCardProb
    };
  }, [deck, hand, selectedCardForStats]);

  const uniqueSpellsInMazo = useMemo(() => {
    return Array.from(new Set(deck.filter(c => !isLandCard(c)).map(c => c.name)));
  }, [deck]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0f0d0c] border-2 border-grimorio-gold/30 rounded-3xl w-full max-w-6xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-y-auto md:overflow-hidden relative flex flex-col h-[95vh] md:h-auto max-h-[95vh]"
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
          {/* Left Column: Visual Hand Fan or 3D Coverflow on Mobile */}
          {isMobile ? (
            <div className="h-64 py-2 shrink-0 flex items-center justify-center relative overflow-hidden select-none touch-none" style={{ perspective: 1000 }}>
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={(e, info) => {
                  const threshold = 40;
                  if (info.offset.x < -threshold && activeIndex < hand.length - 1) {
                    vibrateTouch();
                    setActiveIndex(prev => prev + 1);
                  } else if (info.offset.x > threshold && activeIndex > 0) {
                    vibrateTouch();
                    setActiveIndex(prev => prev - 1);
                  }
                }}
                className="relative w-full h-full flex justify-center items-center overflow-visible"
              >
                <AnimatePresence mode="popLayout">
                  {hand.map((card, idx) => {
                    const offset = idx - activeIndex;
                    const isActive = idx === activeIndex;
                    
                    return (
                      <motion.div
                        key={`${mulliganCount}-${card.name}-${idx}`}
                        animate={{
                          x: offset * 60,
                          scale: isActive ? 1.1 : 0.8,
                          rotateY: offset * -20,
                          z: -Math.abs(offset) * 80,
                          opacity: Math.abs(offset) > 2 ? 0.3 : 1
                        }}
                        style={{
                          zIndex: 10 - Math.abs(offset),
                          position: 'absolute',
                          transformStyle: 'preserve-3d'
                        }}
                        className="w-[125px] aspect-[63/88]"
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
              </motion.div>
              {/* Carrusel Indicator Dots */}
              <div className="absolute bottom-2 flex gap-1 z-20">
                {hand.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      vibrateTouch();
                      setActiveIndex(idx);
                    }}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all duration-300",
                      idx === activeIndex ? "bg-[#ffca58] w-4" : "bg-white/20"
                    )}
                  />
                ))}
              </div>
            </div>
          ) : (
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
                        className="shadow-2xl animate-card-fan"
                      />
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </div>
            </div>
          )}
 
          {/* Right Column: Advanced Mulligan & Hipergeometric Coach Panel */}
          <div className="w-full lg:w-96 bg-black/50 border border-[#D4AF37]/20 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shrink-0 lg:max-h-full overflow-y-auto glassmorphic-panel">
            <div className="space-y-4">
              
              {/* Selector de Pestañas */}
              <div className="flex bg-white/5 border border-white/10 rounded-xl p-0.5 text-[11px]">
                <button 
                  onClick={() => setActivePanelTab('coach')}
                  className={cn("flex-1 py-2 rounded-lg transition-all font-bold flex items-center justify-center gap-1.5", activePanelTab === 'coach' ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-400 hover:text-gray-200")}
                >
                  <BookOpen size={13} /> Asesoría Mulligan
                </button>
                <button 
                  onClick={() => setActivePanelTab('stats')}
                  className={cn("flex-1 py-2 rounded-lg transition-all font-bold flex items-center justify-center gap-1.5", activePanelTab === 'stats' ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-400 hover:text-gray-200")}
                >
                  <BarChart2 size={13} /> Estadísticas RAG
                </button>
              </div>

              {activePanelTab === 'coach' ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="font-cinzel text-xs text-magic-gold flex items-center gap-2">
                      <Activity size={14} className="text-[#D4AF37]" /> Asesoría del Mulligan
                    </h3>
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">PRO COACH</span>
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
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // --- PESTAÑA MATEMÁTICA HIPERGEOMÉTRICA EN TIEMPO REAL ---
                <div className="space-y-4 animate-glow">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <h3 className="font-cinzel text-xs text-magic-gold flex items-center gap-2">
                      <BarChart2 size={14} className="text-[#D4AF37]" /> Calculadora Hipergeométrica
                    </h3>
                    <div className="flex gap-1.5 items-center">
                      {deck.length > 65 && (
                        <span className="text-[9px] text-blue-400 bg-blue-500/10 border border-blue-500/30 px-1.5 py-0.5 rounded font-mono font-bold" title="Matemáticas escaladas a 80 cartas (Companion)">
                          BASE: 80 CARTAS
                        </span>
                      )}
                      <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-1.5 py-0.5 rounded font-mono font-bold animate-pulse">PRO DATA</span>
                    </div>
                  </div>

                  {statsSummary && (
                    <div className="space-y-4">
                      {/* Estado de Biblioteca Restante */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-black/30 border border-white/5 p-3 rounded-xl">
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 font-mono">Mazo Restante</span>
                          <p className="font-bold text-white font-sans text-sm mt-0.5">{statsSummary.currentDeckSize} cartas</p>
                        </div>
                        <div>
                          <span className="text-[9px] uppercase text-gray-500 font-mono">Tierras Restantes</span>
                          <p className="font-bold text-white font-sans text-sm mt-0.5">{statsSummary.remainingLands} cartas</p>
                        </div>
                      </div>

                      {/* Probabilidades de Robar Tierras */}
                      <div className="space-y-3 bg-black/40 border border-[#D4AF37]/10 p-4 rounded-xl">
                        <span className="text-[10px] font-cinzel text-magic-gold flex items-center gap-1.5">
                          <Info size={11} className="text-[#D4AF37]" /> Curvado del Maná
                        </span>

                        <div className="space-y-3">
                          {statsSummary.landDrawProbabilities.map((item, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs text-gray-300 font-medium">
                                <span>{item.label}</span>
                                <span className="font-bold text-magic-gold">{item.prob}%</span>
                              </div>
                              <div className="w-full bg-white/5 border border-white/10 rounded-full h-1.5 overflow-hidden">
                                <div 
                                  className={cn("h-full rounded-full transition-all duration-700", item.prob >= 80 ? "bg-emerald-500" : item.prob >= 50 ? "bg-amber-500" : "bg-rose-500")}
                                  style={{ width: `${item.prob}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Simulador para Carta Preferida */}
                      <div className="space-y-3 bg-black/40 border border-white/5 p-4 rounded-xl">
                        <span className="text-[10px] font-cinzel text-magic-gold flex items-center gap-1.5">
                          <Sparkles size={11} className="text-[#D4AF37]" /> Buscar Hechizo en la Biblioteca
                        </span>
                        
                        <div className="space-y-2">
                          <label className="text-[9px] uppercase text-gray-500 font-mono block">Seleccionar Carta Clave</label>
                          <select 
                            value={selectedCardForStats || ''} 
                            onChange={(e) => setSelectedCardForStats(e.target.value)}
                            className="w-full bg-[#1c1815] border border-white/10 rounded-lg p-2 text-xs text-gray-300 outline-none focus:border-[#D4AF37]/50"
                          >
                            {uniqueSpellsInMazo.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>

                        {statsSummary.targetCardProb && (
                          <div className="pt-2 divide-y divide-white/5 text-xs font-mono text-gray-300">
                            <div className="flex justify-between py-1.5">
                              <span>Copias restantes en mazo:</span>
                              <span className="text-white font-bold">{statsSummary.targetCardProb.remaining} copias</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span>Probabilidad Turno 1 (1 robo):</span>
                              <span className="text-magic-gold font-bold">{statsSummary.targetCardProb.probT1}%</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span>Probabilidad Turno 3 (3 robos):</span>
                              <span className="text-magic-gold font-bold">{statsSummary.targetCardProb.probT3}%</span>
                            </div>
                            <div className="flex justify-between py-1.5">
                              <span>Probabilidad Turno 5 (5 robos):</span>
                              <span className="text-magic-gold font-bold">{statsSummary.targetCardProb.probT5}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              )}

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
