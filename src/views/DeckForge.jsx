import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BATTLEBOX_VETOS, COLORS, BATTLEBOX_RULES } from '../constants/legacyBattleBox';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import { useIsMobile, useIsTouchDevice } from '../hooks/useIsMobile';
import { vibrateTouch } from '../utils/haptic';
import BottomSheet from '../components/atoms/BottomSheet';
import ForgeForm from '../components/forge/ForgeForm';
import MetaIngestor from '../components/forge/MetaIngestor';
import ManaOrb from '../components/atoms/ManaOrb';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import VisualGrid from '../components/battlebox/VisualGrid';
import { hydrateDeckCards, getCardFromDB } from '../services/cardHydrator';
import { callAI, suggestCards, forgeSideboard } from '../services/aiFactory';
import { forgeMazoPerfecto, generateBlueprintFromAI, assembleDeckFromBlueprint } from '../services/deckArchitectService';
import { archiveDeck, archiveDeckOnline, submitDeckFeedback } from '../services/archiveService';
import { getAllCards } from '../services/dbIngestor';
import CardSearch from '../components/forge/CardSearch';
import BlueprintEditor from '../components/forge/BlueprintEditor';
import HandSimulator from '../components/forge/HandSimulator';
import { PowerLevelMeter } from '../components/forge/PowerLevelMeter';
import RadarChart from '../components/forge/RadarChart';
import ManaCurve from '../components/forge/ManaCurve';
import { AlertTriangle, Shield, Lightbulb, Target, Scroll, PenTool, CheckCircle2, XCircle, Info, Zap, Sparkles, Copy, PlusCircle, MinusCircle, GitFork, Share2, Download, Droplet, Activity } from 'lucide-react';
import { calculateKarstenProbability, calculateLandDropProbability, calculateManaCoverage, calculateTurnoDeOro, generateManaBase, calculatePerfectLandCount, calculateVMP, calculateManaSources, checkCardManaRequirement } from '../services/deckCalculator';
import { generateSideboard } from '../services/sideboardService';
import SynergyGraphVisualizer from '../components/forge/SynergyGraphVisualizer';
import DeckVisualExporter from '../components/forge/DeckVisualExporter';
import { optimizarMazo, applyAuditChangesProgrammatically } from '../services/deckOptimizerService';
import { auditDeckWithAI } from '../services/auditService';
import ForgeLoadingScreen from '../components/forge/ForgeLoadingScreen';

const FORGE_STORAGE_KEY = 'mtg_ai_config_forge';

const cleanCardNameForMatching = (name) => {
  if (!name) return "";
  let n = name.toLowerCase().trim();
  if (n.includes('//')) {
    n = n.split('//')[0].trim();
  }
  if (n.includes('/')) {
    n = n.split('/')[0].trim();
  }
  return n;
};

// Función auxiliar ultra-robusta para detectar tierras de cualquier tipo (básicas y especiales)
const isLandCard = (c) => {
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

// Componente Visual de la Matriz de Probabilidades de Frank Karsten
const KarstenMatrix = ({ deck, validationEngine = 'local', validationData = null, chosenColors = [] }) => {
  const isMobile = useIsMobile();
  const [expandedColor, setExpandedColor] = useState(null);
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'details' | 'recs'
  const sources = useMemo(() => calculateManaSources(deck), [deck]);
  const deckSize = useMemo(() => deck.reduce((sum, c) => sum + (c.quantity || 1), 0), [deck]);
  
  const totalLands = useMemo(() => {
    return deck.filter(isLandCard).reduce((sum, c) => sum + (c.quantity || 1), 0);
  }, [deck]);

  const rows = [
    { color: 'W', label: 'Blanco', symbol: 'W' },
    { color: 'U', label: 'Azul', symbol: 'U' },
    { color: 'B', label: 'Negro', symbol: 'B' },
    { color: 'R', label: 'Rojo', symbol: 'R' },
    { color: 'G', label: 'Verde', symbol: 'G' },
    { color: 'C', label: 'Incoloro', symbol: 'C' }
  ];

  const getProbColor = (p) => {
    if (p >= 90) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (p >= 80) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const getBarColor = (p) => {
    if (p >= 90) return 'bg-emerald-500';
    if (p >= 80) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const localRecs = useMemo(() => {
    const recs = [];
    if (totalLands < 22 && totalLands > 0) {
      recs.push({
        title: 'Bajo recuento de tierras',
        description: `Tu mazo posee solo ${totalLands} tierras. Con un recuento inferior a 22, tu probabilidad de jugar cartas de coste 3 o más en la curva óptima desciende fuertemente.`
      });
    }
    if (totalLands > 26) {
      recs.push({
        title: 'Alto recuento de tierras',
        description: `Tu mazo posee ${totalLands} tierras. Un recuento superior a 26 tierras puede provocar inundaciones de maná (Mana Flood) en estrategias que no tengan costos de maná muy elevados.`
      });
    }
    
    rows.forEach(r => {
      if (r.color === 'C' && !chosenColors.includes('C')) return;
      if (r.color !== 'C' && chosenColors.length > 0 && !chosenColors.includes(r.color)) return;

      const srcCount = sources[r.color] || 0;
      if (srcCount > 0 && srcCount < 9) {
        recs.push({
          title: `Fuentes insuficientes para ${r.label}`,
          description: `Frank Karsten recomienda al menos 10 fuentes de maná de color ${r.label} para poder lanzar hechizos de coste 1-2 consistentemente en el turno adecuado.`
        });
      }
    });

    if (recs.length === 0) {
      recs.push({
        title: 'Base de Maná Equilibrada',
        description: '✅ ¡Tu base de maná cumple perfectamente con las proporciones áureas de Frank Karsten!'
      });
    }
    return recs;
  }, [totalLands, sources]);

  const hasAnySources = Object.values(sources).some(c => c > 0);
  if (!hasAnySources) return null;

  return (
    <div className="bg-black/60 border border-[#D4AF37]/20 rounded-2xl p-5 space-y-4 glassmorphic-panel mt-6 relative overflow-hidden backdrop-blur-md">
      {/* Decorative subtle visual top bar */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent" />
      
      {/* Engine Status Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-3 gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[#D4AF37] animate-pulse" />
            <h3 className="font-cinzel text-sm text-[#D4AF37] tracking-wider">Métrica Hipergeométrica</h3>
          </div>
          {validationEngine === 'hypergeometric' ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.15)]">
              <Zap size={11} className="text-emerald-400 animate-bounce" /> Spicerack API
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-sans font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.15)]">
              <Shield size={11} className="text-amber-400" /> Heurística Local
            </span>
          )}
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-[11px] self-start sm:self-auto">
          <button 
            onClick={() => setActiveTab('matrix')}
            className={cn("px-2.5 py-1 rounded-md transition-all font-medium", activeTab === 'matrix' ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-400 hover:text-gray-200")}
          >
            Frank Karsten
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={cn("px-2.5 py-1 rounded-md transition-all font-medium", activeTab === 'details' ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-400 hover:text-gray-200")}
          >
            Prob. Tierras
          </button>
          <button 
            onClick={() => setActiveTab('recs')}
            className={cn("px-2.5 py-1 rounded-md transition-all font-medium relative", activeTab === 'recs' ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "text-gray-400 hover:text-gray-200")}
          >
            Sugerencias
            {((validationData?.recommendations && validationData.recommendations.length > 0) || localRecs.length > 0) && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'matrix' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 font-serif leading-relaxed">
            Esta matriz calcula la probabilidad hipergeométrica exacta de tener fuentes de maná suficientes para jugar hechizos en la curva ideal en un mazo de {deckSize} cartas. Se recomienda apuntar al menos al <span className="text-emerald-400 font-bold">90%</span> para asegurar estabilidad competitiva.
          </p>

          {isMobile ? (
            <div className="space-y-3">
              {rows.map((row) => {
                if (row.color === 'C' && !chosenColors.includes('C')) return null;
                if (row.color !== 'C' && chosenColors.length > 0 && !chosenColors.includes(row.color)) return null;
                
                const srcCount = sources[row.color] || 0;
                if (srcCount === 0) return null;

                const t1_1 = validationData?.karstenMatrix?.[row.color]?.t1_1 ?? calculateKarstenProbability(srcCount, 1, 1, deckSize);
                const t2_1 = validationData?.karstenMatrix?.[row.color]?.t2_1 ?? calculateKarstenProbability(srcCount, 2, 1, deckSize);
                const t2_2 = validationData?.karstenMatrix?.[row.color]?.t2_2 ?? calculateKarstenProbability(srcCount, 2, 2, deckSize);
                const t3_2 = validationData?.karstenMatrix?.[row.color]?.t3_2 ?? calculateKarstenProbability(srcCount, 3, 2, deckSize);
                const t4_2 = validationData?.karstenMatrix?.[row.color]?.t4_2 ?? calculateKarstenProbability(srcCount, 4, 2, deckSize);

                const avgProb = (t1_1 + t2_1 + t2_2 + t3_2 + t4_2) / 5;
                const isExpanded = expandedColor === row.color;

                return (
                  <div 
                    key={row.color} 
                    className="border border-white/10 rounded-xl overflow-hidden bg-black/30"
                  >
                    <button
                      onClick={() => {
                        vibrateTouch();
                        setExpandedColor(isExpanded ? null : row.color);
                      }}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 active:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-3.5 h-3.5 rounded-full bg-${row.color === 'W' ? 'yellow-100' : row.color === 'U' ? 'blue-500' : row.color === 'B' ? 'gray-700' : row.color === 'R' ? 'red-500' : row.color === 'C' ? 'gray-400' : 'green-500'} border border-white/20`} />
                        <div>
                          <p className="font-cinzel font-bold text-white leading-tight">{row.label}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">{srcCount} fuentes</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                          avgProb >= 90 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" :
                          avgProb >= 80 ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" :
                          "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                        )}>
                          {avgProb >= 90 ? 'Excelente' : avgProb >= 80 ? 'Estable' : 'Deficiente'}
                        </span>
                        <span className="text-gray-400 text-sm transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                          ▼
                        </span>
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-white/5 bg-black/40 px-4 py-3 space-y-2 text-xs"
                        >
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-serif">T1 (1 Pip)</span>
                            <span className={`px-2 py-0.5 rounded border font-mono font-bold ${getProbColor(t1_1)}`}>{t1_1}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-serif">T2 (1 Pip)</span>
                            <span className={`px-2 py-0.5 rounded border font-mono font-bold ${getProbColor(t2_1)}`}>{t2_1}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-serif">T2 (2 Pips)</span>
                            <span className={`px-2 py-0.5 rounded border font-mono font-bold ${getProbColor(t2_2)}`}>{t2_2}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-serif">T3 (2 Pips)</span>
                            <span className={`px-2 py-0.5 rounded border font-mono font-bold ${getProbColor(t3_2)}`}>{t3_2}%</span>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-gray-400 font-serif">T4 (2 Pips)</span>
                            <span className={`px-2 py-0.5 rounded border font-mono font-bold ${getProbColor(t4_2)}`}>{t4_2}%</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-gray-500">
                    <th className="py-2">Color</th>
                    <th className="py-2">Fuentes</th>
                    <th className="py-2 text-center">T1 (1 Pip)</th>
                    <th className="py-2 text-center">T2 (1 Pip)</th>
                    <th className="py-2 text-center">T2 (2 Pips)</th>
                    <th className="py-2 text-center">T3 (2 Pips)</th>
                    <th className="py-2 text-center">T4 (2 Pips)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    if (row.color === 'C' && !chosenColors.includes('C')) return null;
                    if (row.color !== 'C' && chosenColors.length > 0 && !chosenColors.includes(row.color)) return null;
                    
                    const srcCount = sources[row.color] || 0;
                    if (srcCount === 0) return null;

                    const t1_1 = validationData?.karstenMatrix?.[row.color]?.t1_1 ?? calculateKarstenProbability(srcCount, 1, 1, deckSize);
                    const t2_1 = validationData?.karstenMatrix?.[row.color]?.t2_1 ?? calculateKarstenProbability(srcCount, 2, 1, deckSize);
                    const t2_2 = validationData?.karstenMatrix?.[row.color]?.t2_2 ?? calculateKarstenProbability(srcCount, 2, 2, deckSize);
                    const t3_2 = validationData?.karstenMatrix?.[row.color]?.t3_2 ?? calculateKarstenProbability(srcCount, 3, 2, deckSize);
                    const t4_2 = validationData?.karstenMatrix?.[row.color]?.t4_2 ?? calculateKarstenProbability(srcCount, 4, 2, deckSize);

                    return (
                      <tr key={row.color} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-cinzel font-bold text-gray-200 flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full bg-${row.color === 'W' ? 'yellow-100' : row.color === 'U' ? 'blue-500' : row.color === 'B' ? 'gray-700' : row.color === 'R' ? 'red-500' : row.color === 'C' ? 'gray-400' : 'green-500'} inline-block border border-white/10`} />
                          {row.label}
                        </td>
                        <td className="py-3 text-gray-400 font-sans font-bold">{srcCount} fuentes</td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-sans font-bold ${getProbColor(t1_1)}`}>
                            {t1_1}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-sans font-bold ${getProbColor(t2_1)}`}>
                            {t2_1}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-sans font-bold ${getProbColor(t2_2)}`}>
                            {t2_2}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-sans font-bold ${getProbColor(t3_2)}`}>
                            {t3_2}%
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`px-2 py-0.5 rounded border text-[11px] font-sans font-bold ${getProbColor(t4_2)}`}>
                            {t4_2}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400 font-serif leading-relaxed">
            Muestra la probabilidad estadística acumulada de robar al menos la cantidad de tierras deseadas según tu total actual de tierras (<span className="text-[#D4AF37] font-bold">{totalLands}</span>).
          </p>

          <div className="space-y-3">
            {[
              { target: 1, turn: 1, label: 'Al menos 1 tierra' },
              { target: 2, turn: 2, label: 'Al menos 2 tierras' },
              { target: 3, turn: 3, label: 'Al menos 3 tierras' },
              { target: 4, turn: 4, label: 'Al menos 4 tierras' },
              { target: 5, turn: 5, label: 'Al menos 5 tierras' }
            ].map((ld) => {
              const prob = validationData?.landDropProbabilities?.[`t${ld.turn}`] ?? calculateLandDropProbability(totalLands, ld.target, ld.turn, deckSize);
              
              return (
                <div key={ld.turn} className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-300 font-medium">
                    <span>{ld.label} (Curva de Turno {ld.turn})</span>
                    <span className="font-bold text-[#D4AF37]">{prob}%</span>
                  </div>
                  <div className="w-full bg-white/5 border border-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(prob)}`}
                      style={{ width: `${prob}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'recs' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 font-serif leading-relaxed">
            Recomendaciones sugeridas para optimizar el equilibrio y consistencia de tu base de maná.
          </p>

          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {(validationData?.recommendations && validationData.recommendations.length > 0
              ? validationData.recommendations.map((r, i) => ({
                  title: typeof r === 'string' ? 'Optimización del Motor' : r.title || 'Optimización del Motor',
                  description: typeof r === 'string' ? r : r.description || ''
                }))
              : localRecs
            ).map((rec, idx) => (
              <div key={idx} className="bg-white/5 border border-white/10 rounded-xl p-3 flex gap-2.5 items-start">
                <Lightbulb size={15} className="text-[#D4AF37] shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-[11px] font-bold text-gray-200 uppercase tracking-wider">{rec.title}</h4>
                  <p className="text-xs text-gray-400 leading-normal font-serif">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Visual para Simulación de Turno de Oro
const TurnoDeOroSim = ({ deck }) => {
  const result = useMemo(() => calculateTurnoDeOro(deck), [deck]);
  if (!result || result.avgTurn === 0) return null;
  
  return (
    <div className="bg-black/60 border border-[#D4AF37]/20 rounded-2xl p-5 space-y-4 glassmorphic-panel mt-6 relative overflow-hidden backdrop-blur-md group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl group-hover:bg-[#D4AF37]/10 transition-colors" />
      <div className="flex items-center gap-3 mb-2 relative z-10">
        <Sparkles className="text-[#D4AF37] animate-pulse" size={20} />
        <h3 className="font-cinzel text-lg text-[#D4AF37] tracking-wider">Simulación "Turno de Oro" (Montecarlo)</h3>
      </div>
      <p className="text-xs text-gray-400 font-serif mb-4 relative z-10">
        Basado en 1,000 partidas solitarias generadas algorítmicamente, este es el rendimiento esperado para alcanzar el "Turno de Oro" (lanzar la mayor amenaza del mazo de forma óptima).
      </p>
      <div className="grid grid-cols-3 gap-4 relative z-10">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 text-center">Turno Clave<br/>Promedio</span>
          <span className="text-3xl font-cinzel text-emerald-400 font-bold drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">{result.avgTurn}</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 text-center">Win Rate<br/>(En Curva)</span>
          <span className="text-3xl font-cinzel text-[#D4AF37] font-bold drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">{result.winRate}%</span>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center shadow-lg">
          <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-1 text-center">Índice de<br/>Consistencia</span>
          <span className="text-3xl font-cinzel text-blue-400 font-bold drop-shadow-[0_0_10px_rgba(96,165,250,0.3)]">{result.consistency}%</span>
        </div>
      </div>
    </div>
  );
};

// Helper para detectar tierras básicas
const isBasicLand = (name) => name && (['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'].includes(name) || (typeof name === 'string' && name.startsWith('Snow-Covered')));

// Generador de Guía Táctica Interactiva de Banquillo
const getMatchupGuide = (mainDeck, sideboard, archetype = 'midrange', format = 'MODERN') => {
  const arch = (archetype || 'midrange').toLowerCase();
  const fmt = (format || 'MODERN').toUpperCase();
  
  let matchups = [];
  
  if (fmt === 'PIONEER') {
    matchups = [
      {
        id: 'pioneer_rakdos',
        name: '👺 vs Rakdos Midrange',
        difficulty: arch === 'control' || arch === 'combo' ? 'Favorable' : 'Equilibrado',
        difficultyColor: arch === 'control' || arch === 'combo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        tip: 'Rakdos es el rey de la eficiencia en Pioneer. Cuidado con Sheoldred, the Apocalypse y el descarte inicial. Banquea eliminación robusta y motores de ventaja de cartas.',
        inKeywords: ['push', 'decay', 'trophy', 'path', 'fateful', 'dreadbore', 'sheoldred', 'draw', 'extraction', 'hearse'],
        outKeywords: ['thoughtseize', 'duress', 'pain', 'burn', 'bolt']
      },
      {
        id: 'pioneer_phoenix',
        name: '🐦 vs Izzet Phoenix',
        difficulty: arch === 'control' || arch === 'tempo' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'control' || arch === 'tempo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Phoenix abusa del cementerio y de conjuros baratos. Exiliar sus cartas clave del cementerio es vital. Banquea odio contra el cementerio y contrahechizos de bajo coste.',
        inKeywords: ['rest', 'peace', 'hearse', 'leylines', 'dispute', 'veto', 'pierce', 'graveyard', 'lantern'],
        outKeywords: ['push', 'removal', 'fury', 'verdict', 'wipe']
      },
      {
        id: 'pioneer_devotion',
        name: '🌳 vs Mono-Green Devotion',
        difficulty: arch === 'aggro' || arch === 'tempo' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'aggro' || arch === 'tempo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Mono-Green genera cantidades insanas de maná con Nykthos. Destruye sus elfos aceleradores de inmediato y exilia sus amenazas grandes de Karn.',
        inKeywords: ['damping', 'sphere', 'needle', 'trophy', 'push', 'disdainful', 'exile', 'removal'],
        outKeywords: ['thoughtseize', 'pain', 'horizon', 'draw']
      },
      {
        id: 'pioneer_control',
        name: '🔮 vs Azorius Control',
        difficulty: arch === 'aggro' || arch === 'tempo' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'aggro' || arch === 'tempo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Azorius limpia la mesa en turno 4 con Supreme Verdict y maneja contrahechizos. Evita sobre-extenderte y juega al final de su turno.',
        inKeywords: ['dispute', 'pierce', 'veto', 'negate', 'thoughtseize', 'thalia', 'sentinel'],
        outKeywords: ['push', 'decay', 'bolt', 'removal', 'fatal']
      }
    ];
  } else if (fmt === 'LEGACY') {
    matchups = [
      {
        id: 'legacy_delver',
        name: '🐉 vs Dimir / Izzet Delver',
        difficulty: arch === 'control' || arch === 'midrange' ? 'Favorable' : 'Equilibrado',
        difficultyColor: arch === 'control' || arch === 'midrange' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        tip: 'Delver es el mazo de tempo por excelencia de Legacy. Cuídate de Daze y Wasteland jugando alrededor de ellos. Conserva tus vidas y mantén tus tierras básicas.',
        inKeywords: ['push', 'swords', 'plowshares', 'bolt', 'dispute', 'veil', 'pyroblast', 'red', 'blast'],
        outKeywords: ['force', 'will', 'thoughtseize', 'pain', 'reanimate', 'heavy']
      },
      {
        id: 'legacy_reanimator',
        name: '💀 vs Reanimator',
        difficulty: arch === 'tempo' || arch === 'control' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'tempo' || arch === 'control' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Puede combar en Turno 1 o 2 con Griselbrand o Atraxa. Mantén interrupción de coste 0 (Force of Will, Surgical Extraction) y odio al cementerio listo.',
        inKeywords: ['surgical', 'extraction', 'leyline', 'void', 'macabre', 'rest', 'peace', 'cage', 'deafening'],
        outKeywords: ['push', 'verdict', 'wipe', 'removal', 'heavy', 'slow']
      },
      {
        id: 'legacy_lands',
        name: '🪐 vs Lands Control',
        difficulty: arch === 'combo' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'combo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Usa Wasteland recursivo y genera un 20/20 Marit Lage indestructible. Banquea Blood Moon, agujas para The Tabernacle, o respuestas rápidas al token.',
        inKeywords: ['blood', 'moon', 'needle', 'karakas', 'swords', 'plowshares', 'exile', 'subtlety', 'force'],
        outKeywords: ['thoughtseize', 'duress', 'discard', 'push', 'bolt']
      }
    ];
  } else if (fmt === 'STANDARD') {
    matchups = [
      {
        id: 'std_aggro',
        name: '⚔️ vs Mono-Red Aggro',
        difficulty: arch === 'control' || arch === 'midrange' ? 'Favorable' : 'Equilibrado',
        difficultyColor: arch === 'control' || arch === 'midrange' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        tip: 'Mono-Red es hiper-rápido en Estándar. Prioriza eliminar a Slickshot Show-off de inmediato y mete cartas que ganen vida o bloqueadores eficientes.',
        inKeywords: ['cut', 'down', 'go', 'throat', 'knock', 'life', 'gain', 'sheoldred', 'path', 'removal'],
        outKeywords: ['draw', 'pain', 'slow', 'heavy', 'planeswalker']
      },
      {
        id: 'std_midrange',
        name: '👺 vs Golgari Midrange',
        difficulty: 'Equilibrado',
        difficultyColor: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        tip: 'Golgari desgasta con removal y planeswalkers de valor. Banquea cartas de ventaja acumulable, respuestas contra encantamientos y amenazas difíciles de remover.',
        inKeywords: ['throat', 'exile', 'draw', 'counterspell', 'negate', 'duress', 'breach'],
        outKeywords: ['cut', 'down', 'shock', 'play', 'small']
      },
      {
        id: 'std_ramp',
        name: '🪐 vs Domain Ramp',
        difficulty: arch === 'tempo' || arch === 'aggro' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'tempo' || arch === 'aggro' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Domain busca resolver Atraxa o barredores como Sunfall. Establece un reloj de daño rápido y mantén contrahechizos listos para neutralizar sus hechizos clave.',
        inKeywords: ['negate', 'pierce', 'duress', 'disdainful', 'stroke', 'tidebinder', 'counterspell'],
        outKeywords: ['cut', 'down', 'removal', 'small', 'spot']
      }
    ];
  } else {
    // MODERN (Default / Fallback)
    matchups = [
      {
        id: 'aggro',
        name: '⚔️ vs Aggro / Burn',
        difficulty: arch === 'control' || arch === 'midrange' ? 'Favorable' : arch === 'aggro' ? 'Equilibrado' : 'Desfavorable',
        difficultyColor: arch === 'control' || arch === 'midrange' ? 'text-green-400 bg-green-500/10 border-green-500/30' : arch === 'aggro' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Prioriza sobrevivir los primeros 3 turnos. Conserva tu total de vidas y no seas codicioso con tus tierras no básicas. Banquea removal de bajo costo y cartas con ganancia de vidas.',
        inKeywords: ['push', 'brutality', 'path', 'exile', 'recall', 'silence', 'peace', 'swords', 'bolt', 'fateful', 'ending', 'appirition', 'swiftspear', 'ragavan', 'fatal', 'removal'],
        outKeywords: ['thoughtseize', 'draw', 'pain', 'horizon', 'reanimate', 'teferi', 'wandering', 'slow']
      },
      {
        id: 'control',
        name: '🔮 vs Azorius / Dimir Control',
        difficulty: arch === 'aggro' || arch === 'tempo' ? 'Favorable' : arch === 'control' ? 'Equilibrado' : 'Desfavorable',
        difficultyColor: arch === 'aggro' || arch === 'tempo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : arch === 'control' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Juega en el turno del oponente. No sobre-extiendas tu mesa contra barredores (Supreme Verdict). Usa contrahechizos y descarte para proteger tus amenazas clave.',
        inKeywords: ['veil', 'summer', 'dispute', 'pierce', 'negation', 'will', 'thoughtseize', 'vortex', 'kozilek', 'spell', 'counterspell', 'thalia', 'sentinel'],
        outKeywords: ['push', 'downfall', 'bolt', 'fury', 'solitude', 'verdict', 'wipe', 'wrath', 'remoción', 'fatal', 'path']
      },
      {
        id: 'graveyard',
        name: '💀 vs Reanimator / Combo',
        difficulty: arch === 'prison' || arch === 'tempo' || arch === 'control' ? 'Favorable' : 'Equilibrado',
        difficultyColor: arch === 'prison' || arch === 'tempo' || arch === 'control' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
        tip: 'Mantén maná abierto para contrahechizos o efectos de exilio en respuesta a sus hechizos de reanimación. Ataca su mano antes de que puedan combar.',
        inKeywords: ['peace', 'void', 'silence', 'pierce', 'negation', 'dispute', 'thoughtseize', 'trap', 'stony', 'chalice', 'aether', 'vial', 'exile', 'rest'],
        outKeywords: ['wipe', 'verdict', 'artifact', 'slow', 'adeline', 'heroic', 'scute', 'craterhoof']
      },
      {
        id: 'bigmana',
        name: '🪐 vs Tron / Amulet Titan',
        difficulty: arch === 'aggro' || arch === 'tempo' ? 'Favorable' : 'Desfavorable',
        difficultyColor: arch === 'aggro' || arch === 'tempo' ? 'text-green-400 bg-green-500/10 border-green-500/30' : 'text-red-400 bg-red-500/10 border-red-500/30',
        tip: 'Destruye o anula sus tierras clave (Urza\'s Tower) de inmediato. Debes establecer un reloj de daño rápido antes de que bajen sus amenazas de coste 6+.',
        inKeywords: ['moon', 'alpine', 'vigor', 'ouphe', 'stony', 'thoughtseize', 'pierce', 'blood', 'collector'],
        outKeywords: ['push', 'bolt', 'remoción', 'creature', 'small', 'fatal']
      }
    ];
  }

  const safeMainDeck = Array.isArray(mainDeck) ? mainDeck.filter(Boolean) : [];
  const safeSideboard = Array.isArray(sideboard) ? sideboard.filter(Boolean) : [];

  return matchups.map(m => {
    let cardsIn = safeSideboard.filter(c => 
      c && typeof c.name === 'string' && m.inKeywords.some(kw => c.name.toLowerCase().includes(kw))
    ).map(c => ({ name: c.name, quantity: c.quantity || 1 }));

    let cardsOut = safeMainDeck.filter(c => 
      c && typeof c.name === 'string' && m.outKeywords.some(kw => c.name.toLowerCase().includes(kw)) && c.category !== 'Land'
    ).map(c => ({ name: c.name, quantity: c.quantity || 1 }));

    if (cardsIn.length === 0 && safeSideboard.length > 0) {
      if (safeSideboard[0]) cardsIn.push({ name: safeSideboard[0].name || '', quantity: safeSideboard[0].quantity || 1 });
      if (safeSideboard[1]) cardsIn.push({ name: safeSideboard[1].name || '', quantity: safeSideboard[1].quantity || 1 });
    }
    if (cardsOut.length === 0 && safeMainDeck.length > 0) {
      const nonLandCards = safeMainDeck.filter(c => c && c.category !== 'Land').sort((a, b) => (b?.mana_value || 0) - (a?.mana_value || 0));
      if (nonLandCards.length > 0 && nonLandCards[0]) {
        cardsOut.push({ name: nonLandCards[0].name || '', quantity: 2 });
      }
    }

    // Igualación matemática (1:1) estricta
    let inTotal = cardsIn.reduce((sum, c) => sum + (c?.quantity || 0), 0);
    let outTotal = cardsOut.reduce((sum, c) => sum + (c?.quantity || 0), 0);
    const minTotal = Math.min(inTotal, outTotal, 4); // Tope de 4 cartas por matchup

    const trimCards = (cards, target) => {
      let current = 0;
      return cards.map(c => {
        if (!c) return null;
        if (current >= target) return null;
        let take = Math.min(c.quantity || 1, target - current);
        current += take;
        return { name: c.name || '', quantity: take };
      }).filter(Boolean);
    };

    cardsIn = trimCards(cardsIn, minTotal);
    cardsOut = trimCards(cardsOut, minTotal);

    return {
      ...m,
      cardsIn,
      cardsOut
    };
  });
};

export default function DeckForge() {
  const isMobile = useIsMobile();
  const isTouch = useIsTouchDevice();
  const [mode, setMode] = useState('form');
  const [selectedFormat, setSelectedFormat] = useState(() => localStorage.getItem('mtgtop8_selected_format') || 'MODERN');

  const activeDeck = useAppStore(state => state.activeDeck);
  const setActiveDeck = useAppStore(state => state.setActiveDeck);
  const [initialSeedCards, setInitialSeedCards] = useState({});
  const [initialFormData, setInitialFormData] = useState(null);

  useEffect(() => {
    if (activeDeck) {
      console.log("🔮 Importando mazo como semillas en el Forge:", activeDeck);
      const seeds = {};
      (activeDeck.cards || []).forEach(c => {
        if (!isLandCard(c)) {
          seeds[c.name] = Math.min(4, c.quantity || 1);
        }
      });
      
      setInitialSeedCards(seeds);
      
      setInitialFormData({
        archetype: activeDeck.archetype?.toLowerCase() || '',
        colores: activeDeck.colors || [],
        format: activeDeck.format || 'MODERN',
      });
      
      setActiveDeck(null);
    }
  }, [activeDeck, setActiveDeck]);

  useEffect(() => {
    localStorage.setItem('mtgtop8_selected_format', selectedFormat);
  }, [selectedFormat]);
  const [loading, setLoading] = useState(false);
  const [lastFormData, setLastFormData] = useState(null);
  const [aiConfig, setAiConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(FORGE_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.warn("⚠️ No se pudo parsear aiConfig de localStorage:", e);
      return null;
    }
  });
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [renderDeck, setRenderDeck] = useState([]);
  const [renderSideboard, setRenderSideboard] = useState([]);
  const [aiMetadata, setAiMetadata] = useState(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempDeckName, setTempDeckName] = useState('');
  const [sideboardStrategy, setSideboardStrategy] = useState('');
   const [archived, setArchived] = useState(false);
   const [isEditing, setIsEditing] = useState(false);
   const [showHandSim, setShowHandSim] = useState(false);
   
   // Estados del Sistema de Feedback (Mejora 5)
   const [showFeedbackModal, setShowFeedbackModal] = useState(false);
   const [feedbackRating, setFeedbackRating] = useState(0);
   const [feedbackHoverRating, setFeedbackHoverRating] = useState(0);
   const [feedbackWinRate, setFeedbackWinRate] = useState('');
   const [feedbackFunScore, setFeedbackFunScore] = useState(0);
   const [feedbackFunHoverScore, setFeedbackFunHoverScore] = useState(0);
   const [feedbackNotes, setFeedbackNotes] = useState('');
   const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
   const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

   const handleSubmitFeedback = async () => {
     if (feedbackRating === 0 || feedbackFunScore === 0) {
       alert("Por favor, selecciona una puntuación de valoración y diversión.");
       return;
     }
     
     setIsSubmittingFeedback(true);
     
     const deckName = aiMetadata?.deckName || 'Mazo Forjado';
     const feedbackDeckName = deckName;
     const archetype = aiMetadata?.archetype || lastFormData?.archetype || 'midrange';
     const format = lastFormData?.format || 'MODERN';
     const strategy = lastFormData?.strategy || 'general';
     const tribe = lastFormData?.tribe || 'none';
     const colors = lastFormData?.colores || [];
     
     const cardList = renderDeck.map(c => ({
       name: c.name,
       quantity: c.quantity,
       role: c.role || ''
     }));
     
     const feedbackData = {
       deckName: feedbackDeckName,
       archetype,
       format,
       strategy,
       tribe,
       colors,
       rating: feedbackRating,
       winRate: feedbackWinRate,
       funScore: feedbackFunScore,
       cardList,
       notes: feedbackNotes
     };
     
     const success = await submitDeckFeedback(feedbackData);
     setIsSubmittingFeedback(false);
     
     if (success) {
       setFeedbackSubmitted(true);
       setTimeout(() => {
         setShowFeedbackModal(false);
         // Resetear estados
         setFeedbackRating(0);
         setFeedbackWinRate('');
         setFeedbackFunScore(0);
         setFeedbackNotes('');
         setFeedbackSubmitted(false);
       }, 2000);
     } else {
       alert("Hubo un error al enviar la valoración. Por favor inténtalo de nuevo.");
     }
   };

   const [pocketGuide, setPocketGuide] = useState(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [cloudArchived, setCloudArchived] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoveredCardImgUrl, setHoveredCardImgUrl] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
  const [showMobileMetrics, setShowMobileMetrics] = useState(false);

  useEffect(() => {
    if (!hoveredCard) {
      setHoveredCardImgUrl(null);
      return;
    }
    
    let active = true;
    let cleanName = hoveredCard.replace(/^\d+x\s+/, '').trim();
    
    // 1. Intentar cargar desde IndexedDB primero
    async function loadFromDB() {
      try {
        const cached = await getCardFromDB(cleanName) || await getCardFromDB(hoveredCard);
        if (cached && active) {
          const imgUrl = cached.image_uris?.normal || cached.card_faces?.[0]?.image_uris?.normal;
          if (imgUrl) {
            setHoveredCardImgUrl(imgUrl);
            return true;
          }
        }
      } catch (err) {
        console.warn("Error reading card from DB inside hover:", err);
      }
      return false;
    }

    loadFromDB().then(found => {
      if (found) return;

      // 2. Si no está en la DB, buscar en Scryfall (fallback)
      if (cleanName.includes('//')) {
        cleanName = cleanName.split('//')[0].trim();
      } else if (cleanName.includes('/')) {
        cleanName = cleanName.split('/')[0].trim();
      }
      
      const searchQuery = `!"${cleanName}"`;
      fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(searchQuery)}`)
        .then(res => {
          if (!res.ok) {
            return fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`);
          }
          return res;
        })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!active) return;
          let cardData = data;
          if (data && data.data && data.data.length > 0) {
            const exactMatch = data.data.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
            cardData = exactMatch || data.data[0];
          }
          
          let url = null;
          if (cardData) {
            if (cardData.image_uris && cardData.image_uris.normal) {
              url = cardData.image_uris.normal;
            } else if (cardData.card_faces && cardData.card_faces[0].image_uris) {
              url = cardData.card_faces[0].image_uris.normal;
            }
          }
          
          if (url) {
            setHoveredCardImgUrl(url);
          }
        })
        .catch(() => {});
    });
    
    return () => { active = false; };
  }, [hoveredCard]);

  const [applyingSwap, setApplyingSwap] = useState(null);
  const [forgePhase, setForgePhase] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);
  const [activeMatchupTab, setActiveMatchupTab] = useState('aggro');
  const [showRagGraph, setShowRagGraph] = useState(false);
  const [showVisualGrid, setShowVisualGrid] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);


  // Timer de forja: muestra segundos transcurridos cuando loading === true
  useEffect(() => {
    if (loading) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);
  const [showOracleLog, setShowOracleLog] = useState(false);
  const [oracleActiveTab, setOracleActiveTab] = useState('summary');
  const [lastGenerationLogs, setLastGenerationLogs] = useState(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [currentBlueprint, setCurrentBlueprint] = useState(null);
  const [blueprintPreCalculated, setBlueprintPreCalculated] = useState(null);

  const handleCopyOracleLog = () => {
    if (!lastGenerationLogs) return;
    
    let clipboardText = `==================================================\n`;
    clipboardText += `🔮 REGISTRO DE PENSAMIENTO DEL ORÁCULO DE BATTLE BOX\n`;
    clipboardText += `==================================================\n\n`;
    
    clipboardText += `⚡ [TRAZA DEL PROCESO]\n`;
    if (lastGenerationLogs.logs && lastGenerationLogs.logs.length > 0) {
      lastGenerationLogs.logs.forEach((log, i) => {
        clipboardText += `[${i + 1}] ${log}\n`;
      });
    } else {
      clipboardText += `No disponible\n`;
    }
    
    clipboardText += `\n--------------------------------------------------\n`;
    clipboardText += `📜 [SYSTEM PROMPT (Instrucciones Estrictas)]\n`;
    clipboardText += `--------------------------------------------------\n`;
    clipboardText += `${lastGenerationLogs.systemPrompt || 'No disponible'}\n\n`;
    
    clipboardText += `--------------------------------------------------\n`;
    clipboardText += `👥 [USER CONTEXT PROMPT (Petición de Entrada)]\n`;
    clipboardText += `--------------------------------------------------\n`;
    clipboardText += `${lastGenerationLogs.contextPrompt || 'No disponible'}\n\n`;
    
    clipboardText += `--------------------------------------------------\n`;
    clipboardText += `🤖 [RESPUESTA JSON CRUDA DE GEMINI]\n`;
    clipboardText += `--------------------------------------------------\n`;
    if (lastGenerationLogs.rawResponse) {
      try {
        const parsedResponse = JSON.parse(lastGenerationLogs.rawResponse);
        clipboardText += `${JSON.stringify(parsedResponse, null, 2)}\n\n`;
        
        // Extraer Chain of Thought
        if (parsedResponse.cards && Array.isArray(parsedResponse.cards)) {
          clipboardText += `--------------------------------------------------\n`;
          clipboardText += `🧠 [CHAIN OF THOUGHT - RAZONAMIENTO DEL ARQUITECTO]\n`;
          clipboardText += `--------------------------------------------------\n`;
          parsedResponse.cards.forEach(c => {
            if (c.reasoning) {
              clipboardText += `- ${c.quantity}x ${c.name}:\n  "${c.reasoning}"\n\n`;
            }
          });
        }
      } catch (e) {
        clipboardText += `${lastGenerationLogs.rawResponse}\n\n`;
      }
    } else {
      clipboardText += `No disponible\n\n`;
    }
    
    clipboardText += `--------------------------------------------------\n`;
    clipboardText += `⚖️ [AJUSTES Y CORRECCIONES DEL JUEZ]\n`;
    clipboardText += `--------------------------------------------------\n`;
    if (aiMetadata?.banlistSwaps && aiMetadata.banlistSwaps.length > 0) {
      clipboardText += `Sustituciones de la Banlist:\n`;
      aiMetadata.banlistSwaps.forEach(swap => {
        clipboardText += `- Baneo: ${swap.original} -> Reemplazo: ${swap.replacement}\n`;
      });
    } else {
      clipboardText += `Sin sustituciones de la Banlist (Ecosistema limpio).\n`;
    }
    
    navigator.clipboard.writeText(clipboardText);
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  const handleCardHover = (e, name) => {
    if (isTouch) return;
    setHoveredCard(name);
    setHoverPos({ x: e.clientX, y: e.clientY });
  };
  const handleCardLeave = () => {
    if (isTouch) return;
    setHoveredCard(null);
  };

  const calculateDeckRadarData = (deck) => {
    if (!deck || deck.length === 0) {
      return { Velocidad: 5, Control: 5, Poder: 5, Complejidad: 5, Resiliencia: 5 };
    }

    const spells = deck.filter(c => !isLandCard(c));
    if (spells.length === 0) {
      return { Velocidad: 5, Control: 1, Poder: 3, Complejidad: 3, Resiliencia: 3 };
    }

    const deckSize = deck.reduce((sum, c) => sum + (c.quantity || 1), 0);
    const vmp = calculateVMP(spells);

    // Pillars analysis
    let rampCount = 0;
    let drawCount = 0;
    let removalCount = 0;
    let protectionCount = 0;
    
    spells.forEach(c => {
      const qty = c.quantity || 1;
      const oracle = (c.oracle_text || c.text || '').toLowerCase();
      const type = (c.type_line || '').toLowerCase();
      
      // Simple dorks/rocks
      if (type.includes('creature') && (oracle.includes('add') || oracle.includes('agrega'))) rampCount += qty;
      if (type.includes('artifact') && (oracle.includes('add') || oracle.includes('agrega'))) rampCount += qty;
      
      // Draw
      if (oracle.includes('draw') || oracle.includes('roba')) drawCount += qty;
      
      // Removal
      if (oracle.includes('destroy') || oracle.includes('exile') || oracle.includes('deal') || oracle.includes('destruye') || oracle.includes('exilia') || oracle.includes('hace')) {
        if (type.includes('instant') || type.includes('sorcery') || oracle.includes('damage') || oracle.includes('daño')) {
          removalCount += qty;
        }
      }
      
      // Protection/Interaction
      if (oracle.includes('counter') || oracle.includes('protect') || oracle.includes('hexproof') || oracle.includes('indestructible') || oracle.includes('protección') || oracle.includes('antimaleficio') || oracle.includes('contrarresta')) {
        protectionCount += qty;
      }
    });

    // 1. Velocidad (Speed): low curve = fast, ramp helps
    const speed = Math.max(1, Math.min(10, Math.round(12 - (vmp * 2.5) + (rampCount * 0.15))));

    // 2. Control: interactive spells count relative to format size
    const control = Math.max(1, Math.min(10, Math.round((removalCount + protectionCount) * (60 / Math.max(40, deckSize)) * 0.6)));

    // 3. Poder (Power): rares/mythics presence + curve optimization
    let rareCount = 0;
    let mythicCount = 0;
    deck.forEach(c => {
      const qty = Number(c.quantity || 1);
      if (c.rarity === 'rare') rareCount += qty;
      if (c.rarity === 'mythic') mythicCount += qty;
    });
    const power = Math.max(1, Math.min(10, Math.round(3 + (rareCount * 0.2) + (mythicCount * 0.4))));

    // 4. Complejidad (Complexity): length of text and complex mechanics
    let complexityPoints = 0;
    deck.forEach(c => {
      const oracle = (c.oracle_text || c.text || '').toLowerCase();
      complexityPoints += Math.min(10, oracle.length / 60);
      if (oracle.includes('choose') || oracle.includes('elige')) complexityPoints += 0.5;
      if (oracle.includes('search') || oracle.includes('busca')) complexityPoints += 0.5;
      if (oracle.includes('planeswalker') || (c.type_line && c.type_line.includes('Planeswalker'))) complexityPoints += 1.5;
      if (oracle.includes('saga') || (c.type_line && c.type_line.includes('Saga'))) complexityPoints += 1.0;
    });
    const avgComplexity = deck.length > 0 ? (complexityPoints / deck.length) * 4.5 : 5;
    const complexity = Math.max(1, Math.min(10, Math.round(avgComplexity + 2.5)));

    // 5. Resiliencia (Resilience): protection/recursion
    let resiliencePoints = 0;
    deck.forEach(c => {
      const oracle = (c.oracle_text || c.text || '').toLowerCase();
      if (oracle.includes('return') || oracle.includes('regresa')) resiliencePoints += 0.4;
      if (oracle.includes('graveyard') || oracle.includes('cementerio')) resiliencePoints += 0.3;
      if (oracle.includes('hexproof') || oracle.includes('antimaleficio')) resiliencePoints += 0.5;
      if (oracle.includes('indestructible')) resiliencePoints += 0.6;
      if (oracle.includes('flashback') || oracle.includes('retrospectiva')) resiliencePoints += 0.5;
    });
    const avgResilience = deck.length > 0 ? (resiliencePoints / deck.length) * 5.5 : 5;
    const resilience = Math.max(1, Math.min(10, Math.round(avgResilience + 3.0)));

    return {
      Velocidad: speed,
      Control: control,
      Poder: power,
      Complejidad: complexity,
      Resiliencia: resilience
    };
  };

  const renderSidebarContent = () => {
    return (
      <>
        {auditResult && (
          <div className="bg-black/60 border-2 border-purple-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(168,85,247,0.1)] relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-4 border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="text-purple-300 w-5 h-5 animate-pulse" />
                <h4 className="font-cinzel text-purple-300 font-bold text-sm uppercase tracking-wider">Veredicto del Juez</h4>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white drop-shadow-[0_0_6px_rgba(168,85,247,0.4)]">{auditResult.score}</span>
                <span className="text-xs text-purple-400/50">/10</span>
              </div>
            </div>
            
            <p className="text-xs text-gray-300 italic font-serif leading-relaxed mb-4 bg-black/40 p-3 rounded-xl border border-white/5 shadow-inner">
              "{auditResult.verdict}"
            </p>

            <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-purple-500/20 scrollbar-track-transparent">
              {auditResult.criticalAlerts && auditResult.criticalAlerts.length > 0 && (
                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                    <AlertTriangle size={10} /> Alertas Críticas
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-red-200/80 space-y-0.5">
                    {auditResult.criticalAlerts.map((a, i) => <li key={i}>{typeof a === 'object' ? a.text || JSON.stringify(a) : a}</li>)}
                  </ul>
                </div>
              )}
              
              {auditResult.warnings && auditResult.warnings.length > 0 && (
                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                    <AlertTriangle size={10} /> Advertencias
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-amber-200/80 space-y-0.5">
                    {auditResult.warnings.map((w, i) => <li key={i}>{typeof w === 'object' ? w.text || JSON.stringify(w) : w}</li>)}
                  </ul>
                </div>
              )}
              
              {auditResult.suggestions && auditResult.suggestions.length > 0 && (
                <div className="space-y-1 text-left">
                  <p className="text-[9px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                    <CheckCircle2 size={10} /> Opciones de Mejora
                  </p>
                  <ul className="list-disc pl-4 text-[11px] text-emerald-200/80 space-y-0.5">
                    {auditResult.suggestions.map((s, i) => <li key={i}>{typeof s === 'object' ? s.text || JSON.stringify(s) : s}</li>)}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-4 pt-3 border-t border-purple-500/10">
              <button 
                onClick={() => setShowAuditModal(true)}
                className="flex-1 py-1.5 bg-purple-950/20 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400 text-purple-200 hover:text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all text-center"
              >
                🔍 Ver Completo
              </button>
              <button 
                onClick={() => setAuditResult(null)}
                className="py-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-gray-400 hover:text-white rounded-lg text-[10px] uppercase font-bold tracking-wider transition-all text-center"
                title="Limpiar reporte"
              >
                Limpiar
              </button>
            </div>
          </div>
        )}

        <div className="leather-panel p-6 shadow-2xl">
          <h4 className="font-cinzel text-magic-gold text-lg mb-6 flex items-center gap-2">
            <Target className="w-5 h-5" /> Potencial Bélico
          </h4>
          <RadarChart data={calculateDeckRadarData(renderDeck)} />
        </div>
        <ManaCurve deck={renderDeck} archetype={aiMetadata?.archetype} />

        {(aiMetadata || pocketGuide) && (
          <div className="parchment-scroll shadow-2xl">
            <div className="parchment-content space-y-6">
              <h4 className="font-cinzel text-[#3d1a10] text-xl mb-5 flex items-center gap-2 border-b-2 border-[#4a3318]/25 pb-2">
                <Scroll size={22} className="text-[#3d1a10]" /> Guía del Maestro
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d1a10]/80 flex items-center gap-1">
                    <Activity size={10} /> Estrategia General
                  </p>
                  <p className="text-[12px] text-[#1a0f05] leading-relaxed italic border-l-2 border-[#3d1a10]/30 pl-3 bg-black/5 py-2 pr-2 rounded-r-lg">
                    "{pocketGuide?.plan || aiMetadata?.strategy || 'Estrategia general no descifrada. Utiliza el botón de abajo para expandir.'}"
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d1a10]/80 flex items-center gap-1">
                    <Lightbulb size={10} /> Reglas de Mulligan
                  </p>
                  <p className="text-[12px] text-[#1a0f05] leading-relaxed bg-black/5 p-3 rounded-lg border border-[#4a3318]/10">
                    {pocketGuide?.mulligan || aiMetadata?.mulligan || 'Conserva manos con al menos 2-3 tierras de tus colores y juego activo en los turnos 1 y 2.'}
                  </p>
                </div>
              </div>

              {sideboardStrategy && (
                <div className="pt-5 border-t-2 border-dashed border-[#4a3318]/20 space-y-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d1a10]/90 flex items-center gap-1">
                    <Shield size={12} className="text-[#3d1a10]" /> Plan de Banquilleo
                  </p>
                  
                  {(() => {
                    const sections = [];
                    let currentSection = null;
                    let currentMatchup = null;

                    const lines = sideboardStrategy.split('\n');
                    for (let line of lines) {
                      const trimmed = line.trim();
                      if (!trimmed) continue;

                      if (trimmed.startsWith('===') && trimmed.endsWith('===')) {
                        if (currentSection) {
                          if (currentMatchup) {
                            currentSection.matchups.push(currentMatchup);
                            currentMatchup = null;
                          }
                          sections.push(currentSection);
                        }
                        currentSection = {
                          title: trimmed.replace(/===/g, '').trim(),
                          matchups: []
                        };
                        continue;
                      }

                      if (trimmed.startsWith('Guía Táctica')) {
                        currentSection = {
                          title: 'Guía de Emparejamientos (Matchups)',
                          matchups: []
                        };
                        continue;
                      }

                      if (trimmed.startsWith('- Contra ')) {
                        if (currentMatchup && currentSection) {
                          currentSection.matchups.push(currentMatchup);
                        }
                        currentMatchup = {
                          name: trimmed.substring(9).replace(/:$/, '').trim(),
                          in: '',
                          out: ''
                        };
                        continue;
                      }

                      if (trimmed.startsWith('IN:')) {
                        if (currentMatchup) {
                          currentMatchup.in = trimmed.substring(3).trim();
                        }
                        continue;
                      }

                      if (trimmed.startsWith('OUT:')) {
                        if (currentMatchup) {
                          currentMatchup.out = trimmed.substring(4).trim();
                        }
                        continue;
                      }
                    }

                    if (currentMatchup && currentSection) {
                      currentSection.matchups.push(currentMatchup);
                    }
                    if (currentSection) {
                      sections.push(currentSection);
                    }

                    return (
                      <div className="space-y-6">
                        {sections.map((sec, secIdx) => {
                          const isSwaps = sec.title.toLowerCase().includes('swaps');
                          return (
                            <div key={secIdx} className="space-y-3">
                              <h5 className="font-cinzel text-[11px] font-bold uppercase tracking-wider text-[#3d1a10] border-b border-[#4a3318]/15 pb-1 flex items-center gap-1.5">
                                {isSwaps ? <Target size={11} className="text-[#a04000]" /> : <Shield size={11} className="text-[#4a3318]" />}
                                {sec.title}
                              </h5>
                              <div className="grid grid-cols-1 gap-3">
                                {sec.matchups.map((match, mIdx) => (
                                  <div key={mIdx} className="p-3.5 bg-[#4a3318]/5 rounded-xl border border-[#4a3318]/15 space-y-2.5 transition-all hover:bg-[#4a3318]/10">
                                    <p className="text-[11px] font-bold text-[#2d1e12] flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#3d1a10]" />
                                      Contra {match.name}
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed">
                                      {match.in && (
                                        <div className="p-2 bg-emerald-800/5 border border-emerald-800/15 rounded-lg flex flex-col">
                                          <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider mb-0.5">IN (Poner)</span>
                                          <span className="text-[#1a0f05] font-medium">{match.in}</span>
                                        </div>
                                      )}
                                      {match.out && (
                                        <div className="p-2 bg-red-800/5 border border-red-800/15 rounded-lg flex flex-col">
                                          <span className="text-[9px] font-bold text-red-800 uppercase tracking-wider mb-0.5">OUT (Quitar)</span>
                                          <span className="text-[#3d1a10]">{match.out}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {aiMetadata?.recommendations && aiMetadata.recommendations.length > 0 && (
                <div className="pt-5 border-t-2 border-dashed border-[#4a3318]/20">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#3d1a10]/60 mb-3 flex items-center gap-1">
                    <Sparkles size={12} className="text-[#3d1a10]" /> Recomendaciones de Expertos
                  </p>
                  <div className="space-y-3">
                    {aiMetadata.recommendations.map((rec, i) => (
                      <div key={i} className="group p-3 bg-black/5 rounded-xl border border-[#4a3318]/10">
                        <p className="text-[11px] font-bold text-[#2d1e12] flex items-center gap-2 mb-1">
                          <span className="w-4 h-4 rounded-full bg-[#3d1a10]/10 flex items-center justify-center text-[9px] group-hover:bg-[#3d1a10]/20 transition-colors font-sans">
                            {i + 1}
                          </span>
                          {rec.title}
                        </p>
                        <p className="text-[11px] text-[#4a3318]/85 leading-relaxed pl-6 italic">
                          {rec.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {!pocketGuide && (
          <button 
            onClick={generateGuide} 
            disabled={isGeneratingGuide}
            className="w-full btn-magic-glass btn-glass-gold py-4 flex items-center justify-center gap-2 mt-4"
          >
            {isGeneratingGuide ? <Zap className="animate-spin" size={16} /> : <PenTool size={16} />}
            {isGeneratingGuide ? 'Descifrando...' : 'Generar Guía Estratégica'}
          </button>
        )}
      </>
    );
  };

  // --- LÓGICA DE VALIDACIÓN DE REGLAS ---
  const stats = useMemo(() => {
    const safeDeck = Array.isArray(renderDeck) ? renderDeck.filter(Boolean) : [];
    const safeSideboard = Array.isArray(renderSideboard) ? renderSideboard.filter(Boolean) : [];
    
    const mainCount = safeDeck.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const sideCount = safeSideboard.reduce((sum, c) => sum + (c.quantity || 0), 0);
    
    const hasYorion = safeDeck.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || 
                     (lastFormData?.companero && lastFormData.companero.toLowerCase().includes("yorion"));
                     
    const isCommander = selectedFormat === 'COMMANDER';
    const targetMain = isCommander ? 100 : (hasYorion ? 80 : 60);
    const targetSide = isCommander ? 0 : 15;
    const maxCopiesAllowed = isCommander ? 1 : 4;
    
    const bannedInDeck = [...safeDeck, ...safeSideboard].filter(c => c.name && BATTLEBOX_VETOS.includes(c.name));
    const overLimit = [...safeDeck, ...safeSideboard].filter(c => c.name && !isBasicLand(c.name) && (c.quantity || 0) > maxCopiesAllowed);
    
    const isMainValid = mainCount === targetMain;
    const isSideValid = sideCount === targetSide;
    
    return {
      mainCount,
      sideCount,
      targetMain,
      targetSide,
      maxCopiesAllowed,
      isMainValid,
      isSideValid,
      banned: bannedInDeck,
      overLimit,
      isValid: isMainValid && isSideValid && bannedInDeck.length === 0 && overLimit.length === 0
    };
  }, [renderDeck, renderSideboard, selectedFormat, lastFormData]);

  const matchupsList = useMemo(() => {
    return getMatchupGuide(renderDeck, renderSideboard, lastFormData?.archetype || 'midrange', selectedFormat);
  }, [renderDeck, renderSideboard, lastFormData, selectedFormat]);

  const deckName = useMemo(() => {
    if (aiMetadata?.deckName && aiMetadata.deckName !== 'Mazo Forjado' && aiMetadata.deckName !== 'Mazo Sin Nombre') {
      return aiMetadata.deckName;
    }
    
    const colors = lastFormData?.colores || [];
    const archetype = lastFormData?.archetype || 'Midrange';
    const format = selectedFormat || 'Modern';
    
    const colorNames = {
      'W': 'Blanco', 'U': 'Azul', 'B': 'Negro', 'R': 'Rojo', 'G': 'Verde', 'C': 'Incoloro'
    };
    
    let colorString = '';
    if (colors.length === 0) colorString = 'Incoloro';
    else if (colors.length === 1) colorString = colorNames[colors[0]];
    else if (colors.length === 2) {
      const sorted = [...colors].sort().join('');
      const guilds = {
        'UW': 'Azorius', 'BU': 'Dimir', 'BR': 'Rakdos', 'GR': 'Gruul', 'GW': 'Selesnya',
        'BW': 'Orzhov', 'RU': 'Izzet', 'BG': 'Golgari', 'RW': 'Boros', 'GU': 'Simic'
      };
      colorString = guilds[sorted] || colors.map(c => colorNames[c]).join('-');
    } else if (colors.length === 3) {
      const sorted = [...colors].sort().join('');
      const shards = {
        'BUW': 'Esper', 'BRU': 'Grixis', 'BGR': 'Jund', 'GRW': 'Naya', 'GUW': 'Bant',
        'BRW': 'Mardu', 'GRU': 'Temur', 'BGW': 'Abzan', 'RUW': 'Jeskai', 'BGU': 'Sultai'
      };
      colorString = shards[sorted] || 'Tricolor';
    } else if (colors.length === 4) {
      colorString = 'Tetracolor';
    } else if (colors.length === 5) {
      colorString = 'Pentacolor';
    }
    
    const formattedArchetype = archetype.charAt(0).toUpperCase() + archetype.slice(1).toLowerCase();
    const formattedFormat = format.charAt(0).toUpperCase() + format.slice(1).toLowerCase();
    
    return `${colorString} ${formattedArchetype} — ${formattedFormat}`;
  }, [aiMetadata?.deckName, lastFormData?.colores, lastFormData?.archetype, selectedFormat]);

  const [activeSwaps, setActiveSwaps] = useState({}); // format: { [matchupId]: { in: { "CardName": qty }, out: { "CardName": qty } } }

  const getSwapsForMatchup = useCallback((matchupId) => {
    if (activeSwaps[matchupId]) {
      return activeSwaps[matchupId];
    }
    
    // Find the default matchup recommendations
    const defaultMatchup = matchupsList.find(m => m.id === matchupId);
    const initialIn = {};
    const initialOut = {};
    
    if (defaultMatchup) {
      defaultMatchup.cardsIn.forEach(c => {
        initialIn[c.name] = c.quantity;
      });
      defaultMatchup.cardsOut.forEach(c => {
        if (c && c.name) {
          initialOut[c.name] = c.quantity;
        }
      });
    }
    
    return { in: initialIn, out: initialOut };
  }, [activeSwaps, matchupsList]);

  const currentSwaps = useMemo(() => {
    return getSwapsForMatchup(activeMatchupTab);
  }, [activeMatchupTab, getSwapsForMatchup]);

  const totalIn = useMemo(() => {
    return Object.values(currentSwaps.in).reduce((sum, q) => sum + q, 0);
  }, [currentSwaps]);

  const totalOut = useMemo(() => {
    return Object.values(currentSwaps.out).reduce((sum, q) => sum + q, 0);
  }, [currentSwaps]);

  const updateSwap = (matchupId, type, cardName, newQty) => {
    setActiveSwaps(prev => {
      const saved = prev[matchupId] || (() => {
        const defaultMatchup = matchupsList.find(m => m.id === matchupId);
        const initialIn = {};
        const initialOut = {};
        if (defaultMatchup) {
          defaultMatchup.cardsIn.forEach(c => { initialIn[c.name] = c.quantity; });
          defaultMatchup.cardsOut.forEach(c => { if (c && c.name) { initialOut[c.name] = c.quantity; } });
        }
        return { in: initialIn, out: initialOut };
      })();
      
      const updatedType = { ...saved[type] };
      if (newQty <= 0) {
        delete updatedType[cardName];
      } else {
        updatedType[cardName] = newQty;
      }
      
      return {
        ...prev,
        [matchupId]: {
          ...saved,
          [type]: updatedType
        }
      };
    });
  };

  const mainDeckSources = useMemo(() => calculateManaSources(renderDeck), [renderDeck]);
  const mainDeckSize = useMemo(() => renderDeck.reduce((sum, c) => sum + (c.quantity || 1), 0), [renderDeck]);

  const handleAutoGenerateSideboard = async () => {
    if (!renderDeck.length) return;
    setLoading(true);
    setForgePhase({ phase: 'strategist', message: '✨ Sideboard Architect analizando debilidades del mazo...' });
    
    try {
      const rawSide = await forgeSideboard(renderDeck, lastFormData, aiConfig);
      
      setForgePhase({ phase: 'hydrate', message: '🖼️ Obteniendo imágenes de Scryfall...' });
      const rarityMode = lastFormData?.rarityMode || 'normal';
      
      const hydratedSide = await hydrateDeckCards(rawSide, rarityMode);
      setRenderSideboard(hydratedSide);
      setWarning(null);
    } catch (e) {
      console.error(e);
      setWarning("⚠️ Ocurrió un error al calcular las respuestas del banquillo por la IA.");
    } finally {
      setLoading(false);
      setForgePhase(null);
    }
  };

  const handleExportUniversal = (formatType) => {
    if (!renderDeck.length) return;
    
    const exportDeckName = deckName;
    let content = "";
    let fileExtension = "txt";
    let mimeType = "text/plain;charset=utf-8";

    if (formatType === 'forge') {
      content = "[main]\n";
      renderDeck.forEach(c => {
        content += `${c.quantity} ${c.name}\n`;
      });
      if (renderSideboard && renderSideboard.length > 0) {
        content += "[sideboard]\n";
        renderSideboard.forEach(c => {
          content += `${c.quantity} ${c.name}\n`;
        });
      }
      fileExtension = "dck";
    } 
    else if (formatType === 'arena') {
      content = "Deck\n";
      renderDeck.forEach(c => {
        content += `${c.quantity} ${c.name}\n`;
      });
      if (renderSideboard && renderSideboard.length > 0) {
        content += "\nSideboard\n";
        renderSideboard.forEach(c => {
          content += `${c.quantity} ${c.name}\n`;
        });
      }
      fileExtension = "txt";
    } 
    else if (formatType === 'cockatrice') {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n';
      content += '<cockatrice_deck version="1">\n';
      content += `  <deckname>${exportDeckName}</deckname>\n`;
      content += '  <comments>Generado por Battlebox Architect (RAG Engine)</comments>\n';
      content += '  <zone name="main">\n';
      renderDeck.forEach(c => {
        content += `    <card number="${c.quantity}" name="${c.name}"/>\n`;
      });
      content += '  </zone>\n';
      if (renderSideboard && renderSideboard.length > 0) {
        content += '  <zone name="side">\n';
        renderSideboard.forEach(c => {
          content += `    <card number="${c.quantity}" name="${c.name}"/>\n`;
        });
        content += '  </zone>\n';
      }
      content += '</cockatrice_deck>\n';
      fileExtension = "xml";
      mimeType = "application/xml;charset=utf-8";
    } 
    else if (formatType === 'obsidian') {
      const today = new Date().toISOString().split('T')[0];
      const colorsStr = lastFormData?.colores ? JSON.stringify(lastFormData.colores) : "[]";
      
      content = "---\n";
      content += `name: "${exportDeckName}"\n`;
      content += `archetype: "${aiMetadata?.archetype || lastFormData?.archetype || 'Midrange'}"\n`;
      content += `format: "${selectedFormat.toUpperCase()} Battle Box"\n`;
      content += `colors: ${colorsStr}\n`;
      content += `created: ${today}\n`;
      content += "type: decklist\n";
      content += "---\n\n";
      
      content += `# 🎴 Ficha del Mazo: ${exportDeckName}\n\n`;
      content += `> **Estrategia General:** *"${pocketGuide?.plan || aiMetadata?.strategy || 'No descifrada'}*"\n\n`;
      
      content += "## ⚔️ Mazo Principal (Mainboard)\n";
      renderDeck.forEach(c => {
        content += `- [[${c.name}]] x${c.quantity} (${c.category})\n`;
      });
      
      if (renderSideboard && renderSideboard.length > 0) {
        content += "\n## 🛡️ Banquillo (Sideboard)\n";
        renderSideboard.forEach(c => {
          content += `- [[${c.name}]] x${c.quantity} (${c.subCategory || 'Sideboard'})\n`;
        });
      }
      fileExtension = "md";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportDeckName.replace(/\s+/g, '_')}.${fileExtension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportDropdownOpen(false);
  };

  const handleArchive = async () => {
    if (!renderDeck.length) return;
    
    const formatName = `${selectedFormat.charAt(0) + selectedFormat.slice(1).toLowerCase()} Battle Box`;
    const deckToArchive = {
      id: Date.now().toString(),
      name: deckName,
      archetype: aiMetadata?.archetype || lastFormData?.archetype,
      colors: lastFormData?.colores,
      format: formatName,
      lore: aiMetadata?.lore,
      recommendations: aiMetadata?.recommendations || [],
      cards: renderDeck,
      sideboard: renderSideboard
    };

    const success = await archiveDeck(deckToArchive);
    if (success) {
      setArchived(true);
      setTimeout(() => setArchived(false), 3000);
    }
  };

  const handleArchiveOnline = async () => {
    if (!renderDeck.length) return;
    
    const formatName = `${selectedFormat.charAt(0) + selectedFormat.slice(1).toLowerCase()} Battle Box`;
    const deckToArchive = {
      id: Date.now().toString(),
      name: deckName,
      archetype: aiMetadata?.archetype || lastFormData?.archetype,
      colors: lastFormData?.colores,
      format: formatName,
      lore: aiMetadata?.lore,
      recommendations: aiMetadata?.recommendations || [],
      cards: renderDeck,
      sideboard: renderSideboard
    };

    const success = await archiveDeckOnline(deckToArchive);
    if (success) {
      setCloudArchived(true);
      setTimeout(() => setCloudArchived(false), 3000);
    } else {
      setWarning("⚠️ No se pudo subir a la nube. Comprueba tus credenciales de Firebase en el .env");
    }
  };

  const handleAudit = async () => {
    if (!renderDeck.length) return;
    setIsAuditing(true);
    setForgePhase({ phase: 'audit', message: '🕵️‍♂️ El Juez Supremo está evaluando la competitividad...' });
    setAuditResult(null);
    setShowAuditModal(false);

    // Inyectar métricas matemáticas (VMP y recuento de fuentes)
    const spellsOnly = renderDeck.filter(c => !isLandCard(c));
    const metrics = {
      vmp: calculateVMP(spellsOnly),
      sources: calculateManaSources(renderDeck)
    };
    const auditData = { 
      ...lastFormData, 
      aiMetadata,
      metrics 
    };

    try {
      const result = await auditDeckWithAI(renderDeck, renderSideboard, auditData, aiConfig, (p, m) => {
        setForgePhase({ phase: p, message: m });
      });
      setAuditResult(result);
      setShowAuditModal(true);
    } catch (error) {
      setWarning(error.message || 'Error en la auditoría.');
    } finally {
      setIsAuditing(false);
      setForgePhase(null);
    }
  };

  const handleSubmit = async (formData) => {
    if (!aiConfig?.selectedModel) {
      setError('Selecciona un modelo de IA primero');
      return;
    }

    const combinedFormData = {
      ...formData,
      format: selectedFormat
    };

    // Sincronizar el rarityMode, allowCustomCards y generationPriority seleccionados en el localStorage para que futuros accesos lo reconozcan
    try {
      const saved = localStorage.getItem(FORGE_STORAGE_KEY);
      if (saved) {
        const configObj = JSON.parse(saved);
        configObj.rarityMode = formData.rarityMode;
        configObj.allowCustomCards = !!formData.allowCustomCards;
        configObj.generationPriority = formData.generationPriority || 'hybrid';
        localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify(configObj));
        setAiConfig(configObj);
      }
    } catch (e) {
      console.warn("No se pudo sincronizar configuraciones en localStorage:", e);
    }

    setLastFormData(combinedFormData);
    setLoading(true);
    setError(null);
    setWarning(null);
    setForgePhase(null);
    setLastGenerationLogs(null);
    setAuditResult(null);
    setShowAuditModal(false);
    
    try {
      console.log('🔥 Generando Blueprint estructural con IA...');
      
      const onProgress = (phase, message) => {
        setForgePhase({ phase, message });
      };
      
      const blueprintData = await generateBlueprintFromAI(combinedFormData, aiConfig, onProgress);
      
      setCurrentBlueprint(blueprintData.blueprint);
      setBlueprintPreCalculated(blueprintData);
      
      if (blueprintData.logs) {
        setLastGenerationLogs({
          logs: blueprintData.logs,
          systemPrompt: blueprintData.STRICT_INSTRUCTIONS_PROMPT || '',
          contextPrompt: blueprintData.contextGen_Prompt || '',
          rawResponse: JSON.stringify(blueprintData.blueprint)
        });
      }
      
      setMode('blueprint');
    } catch (err) {
      console.error('❌ Error generando blueprint:', err);
      setError(err.message || 'Error al estructurar el mazo');
    } finally {
      setLoading(false);
      setForgePhase(null);
    }
  };

  const handleAssembleDeck = async (editedBlueprint) => {
    if (!lastFormData) return;
    setLoading(true);
    setError(null);
    setWarning(null);
    setForgePhase({ phase: 'assembler', message: '⚙️ Ensamblando cartas y calculando tierras...' });
    
    try {
      const onProgress = (phase, message) => {
        setForgePhase({ phase, message });
      };
      
      const aiResult = await assembleDeckFromBlueprint(editedBlueprint, lastFormData, aiConfig, onProgress, blueprintPreCalculated);
      
      setAiMetadata(aiResult);
      if (aiResult.generationLogs) {
        setLastGenerationLogs(aiResult.generationLogs);
      }
      
      setForgePhase({ phase: 'hydrate', message: '🎴 Cargando imágenes de las cartas...' });
      const hydratedDeck = await hydrateDeckCards(aiResult.cards, lastFormData.rarityMode);
      const hydratedSideboard = aiResult.sideboard ? await hydrateDeckCards(aiResult.sideboard, lastFormData.rarityMode) : [];
      
      // Auto-Corrección Matemática Final
      let finalDeck = [...hydratedDeck];
      let currentCount = finalDeck.reduce((sum, c) => sum + c.quantity, 0);
      const targetSize = lastFormData.deckSize || 60;
      
      if (currentCount !== targetSize) {
        if (currentCount > targetSize) {
          let excess = currentCount - targetSize;
          let landsDesc = finalDeck.map((c, i) => ({...c, originalIndex: i})).filter(isLandCard).sort((a, b) => b.quantity - a.quantity);
          for (let land of landsDesc) {
            if (excess > 0 && land.quantity > 1) {
              const toRemove = Math.min(land.quantity - 1, excess);
              finalDeck[land.originalIndex].quantity -= toRemove;
              excess -= toRemove;
            }
          }
        } else if (currentCount < targetSize) {
          const missing = targetSize - currentCount;
          const lands = finalDeck.filter(isLandCard).sort((a, b) => b.quantity - a.quantity);
          if (lands.length > 0) {
            const index = finalDeck.findIndex(c => c.name === lands[0].name);
            finalDeck[index].quantity += missing;
          }
        }
      }
      
      // ── AUTO-REFINAMIENTO DE NIVEL GRAN MAESTRO (Self-Healing Loop & Playsets 4x)
      setForgePhase({ phase: 'auto_audit', message: '🔬 Densificando playsets (4x) y evaluando viabilidad...' });
      try {
        const { densifyDeckPlaysets } = await import('../services/deckAuditorService.js');
        finalDeck = densifyDeckPlaysets(finalDeck);

        const spellsOnly = finalDeck.filter(c => !isLandCard(c));
        const metrics = {
          vmp: calculateVMP(spellsOnly),
          sources: calculateManaSources(finalDeck)
        };
        const auditData = { ...lastFormData, aiMetadata, metrics };

        const autoAudit = await auditDeckWithAI(finalDeck, hydratedSideboard, auditData, aiConfig, () => {});
        if (autoAudit && autoAudit.score < 8.5 && autoAudit.suggestions && autoAudit.suggestions.length > 0) {
          setForgePhase({ phase: 'auto_refine', message: '✨ Auto-refinando mazo para alcanzar puntuación de élite (>8.5/10)...' });
          const allCards = await getAllCards();
          const validSuggs = autoAudit.suggestions.filter(s => !s._invalid);
          if (validSuggs.length > 0) {
            const refinedDeck = await applyAuditChangesProgrammatically(finalDeck, validSuggs, allCards, lastFormData);
            finalDeck = refinedDeck;
          }
        }
      } catch (autoErr) {
        console.warn("Auto-refinamiento inicial omitido:", autoErr);
      }
      
      setRenderDeck(finalDeck);
      setRenderSideboard(hydratedSideboard); 
      setSideboardStrategy(aiResult.sideboard_strategy || '');
      
      if (aiResult.banlistSwaps && aiResult.banlistSwaps.length > 0) {
        const swapText = aiResult.banlistSwaps.map(s => `${s.original} → ${s.replacement}`).join(', ');
        setWarning(`⚖️ El Juez corrigió ${aiResult.banlistSwaps.length} carta(s) prohibida(s): ${swapText}`);
      }
      
      setMode('deck');
      setArchived(false);
      setCloudArchived(false);
      setPocketGuide(null);
      setCardSuggestions(null);
    } catch (err) {
      console.error('❌ Error ensamblando mazo:', err);
      setError(err.message || 'Error en la conexión con el Oráculo');
      if (err.generationLogs) {
        setLastGenerationLogs(err.generationLogs);
      } else {
        setLastGenerationLogs({
          logs: [`[ERROR] ${err.message || 'Error inesperado'}`],
          systemPrompt: '',
          contextPrompt: '',
          rawResponse: '',
          error: err.message || 'Error inesperado',
          stack: err.stack || ''
        });
      }
    } finally {
      setLoading(false);
      setForgePhase(null);
    }
  };

  const handleAddCard = async (scryfallCard, qtyToAdd = 1, target = 'main') => {
    const cardName = scryfallCard.name;
    
    // Bloqueo de Banlist
    if (BATTLEBOX_VETOS.includes(cardName)) {
      setWarning(`⚠️ La carta "${cardName}" está VETADA en Battle Box Casual.`);
      return;
    }

    let warningToSet = null;
    const setState = target === 'main' ? setRenderDeck : setRenderSideboard;
    const targetCleanName = cleanCardNameForMatching(cardName);

    setState(prev => {
      const exists = prev.find(c => cleanCardNameForMatching(c.name) === targetCleanName);
      if (exists) {
        // Bloqueo de Copias (Regla de 4) - Solo para Main si queremos ser estrictos, pero Legacy permite 4 total entre ambos.
        // Aquí lo aplicamos a ambos por simplicidad.
        if (!isBasicLand(cardName) && exists.quantity + qtyToAdd > BATTLEBOX_RULES.maxCopies) {
          warningToSet = `⚠️ Límite de copias alcanzado: Máximo ${BATTLEBOX_RULES.maxCopies} de "${cardName}".`;
          return prev.map(c => cleanCardNameForMatching(c.name) === targetCleanName ? { ...c, quantity: BATTLEBOX_RULES.maxCopies } : c);
        }
        return prev.map(c => cleanCardNameForMatching(c.name) === targetCleanName ? { ...c, quantity: c.quantity + qtyToAdd } : c);
      }
      return [...prev, {
        name: scryfallCard.name,
        type_line: scryfallCard.type_line,
        quantity: qtyToAdd,
        rarity: scryfallCard.rarity || 'common',
        category: scryfallCard.type_line ? scryfallCard.type_line.split('—')[0].trim() : 'Other',
        image_uris: scryfallCard.image_uris || scryfallCard.card_faces?.[0]?.image_uris,
        mana_cost: scryfallCard.mana_cost || scryfallCard.card_faces?.[0]?.mana_cost || '',
        mana_value: scryfallCard.cmc || 0,
        color_identity: scryfallCard.color_identity || [],
        produced_mana: scryfallCard.produced_mana || [],
        power: scryfallCard.power ?? '',
        toughness: scryfallCard.toughness ?? '',
        oracle_text: scryfallCard.oracle_text || scryfallCard.card_faces?.[0]?.oracle_text || ''
      }];
    });
    
    setWarning(warningToSet);
  };

  const handleRemoveCard = (cardName, qtyToRemove = 1) => {
    const targetCleanName = cleanCardNameForMatching(cardName);
    setRenderDeck(prev => {
      const card = prev.find(c => cleanCardNameForMatching(c.name) === targetCleanName);
      if (card) {
        if (card.quantity > qtyToRemove) {
          return prev.map(c => cleanCardNameForMatching(c.name) === targetCleanName ? { ...c, quantity: c.quantity - qtyToRemove } : c);
        }
        return prev.filter(c => cleanCardNameForMatching(c.name) !== targetCleanName);
      }
      return prev;
    });
  };

  const generateGuide = async () => {
    if (!renderDeck.length) return;
    setIsGeneratingGuide(true);
    try {
      const prompt = `Guía de Bolsillo para "${aiMetadata?.deckName}" (${aiMetadata?.archetype}):
      MAZO: ${renderDeck.map(c => `${c.quantity} ${c.name}`).join(', ')}
      Genera JSON: { "plan": "...", "mulligan": "...", "tips": "..." }`;

      const messages = [{ role: 'user', content: prompt }];
      const response = await callAI(messages, aiConfig, { forceJSON: true });
      setPocketGuide(JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim()));
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  const handleSuggestCards = async () => {
    if (!aiConfig) {
      setWarning('Activa el Panel de Configuración IA primero para pedir consejo al Oráculo.');
      return;
    }
    setIsSuggesting(true);
    setCardSuggestions(null);
    try {
      const suggestions = await suggestCards(renderDeck, aiConfig, aiMetadata, lastFormData);
      setCardSuggestions(suggestions);
    } catch (e) {
      setWarning('El Oráculo falló al visualizar el futuro.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const executeSwap = async (sug, index) => {
    setApplyingSwap(index);
    try {
      const qty = sug.quantity || 1;
      const cleanName = sug.name.includes('//') ? sug.name.split('//')[0].trim() : sug.name.includes('/') ? sug.name.split('/')[0].trim() : sug.name;
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cleanName)}`);
      if (!res.ok) {
        setWarning(`❌ No se encontró "${sug.name}" en la base de datos de Scryfall. Quizás el Oráculo se equivocó de nombre.`);
        setApplyingSwap(null);
        return;
      }
      const scryfallCard = await res.json();

      // 2. Ejecutar el swap en el estado
      if (sug.cut) {
        handleRemoveCard(sug.cut, qty);
      }
      await handleAddCard(scryfallCard, qty);

      // 3. Limpiar esta sugerencia de la lista
      setCardSuggestions(prev => prev.filter((_, i) => i !== index));
    } catch (e) {
      setWarning(`Error aplicando el cambio: ${e.message}`);
    } finally {
      setApplyingSwap(null);
    }
  };

  const handlePanicButton = () => {
    const isCommander = selectedFormat === 'COMMANDER';
    const hasYorion = renderDeck.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || 
                     (lastFormData?.companero && lastFormData.companero.toLowerCase().includes("yorion"));
    const targetSize = isCommander ? 100 : (hasYorion ? 80 : 60);
    const maxCopies = isCommander ? 1 : 4;

    setRenderDeck(prev => {
      let nextDeck = [...prev];
      // 1. Eliminar baneadas
      nextDeck = nextDeck.filter(c => !BATTLEBOX_VETOS.includes(c.name));
      // 2. Ajustar límite de copias
      nextDeck = nextDeck.map(c => (!isBasicLand(c.name) && c.quantity > maxCopies) ? { ...c, quantity: maxCopies } : c);
      
      let count = nextDeck.reduce((sum, c) => sum + (c.quantity || 0), 0);
      
      if (count < targetSize) {
        // 3. Rellenar con tierras básicas
        const missing = targetSize - count;
        const basic = nextDeck.find(c => isBasicLand(c.name));
        if (basic) {
          basic.quantity += missing;
        } else {
          nextDeck.push({
            name: "Plains",
            quantity: missing,
            category: 'Land',
            type_line: 'Basic Land — Plains',
            color_identity: ["W"]
          });
        }
      } else if (count > targetSize) {
        // 4. Recortar
        let excess = count - targetSize;
        const lands = nextDeck.filter(isLandCard).sort((a,b) => b.quantity - a.quantity);
        for (let land of lands) {
          if (excess > 0 && land.quantity > 1) {
             const toRemove = Math.min(land.quantity - 1, excess);
             const idx = nextDeck.findIndex(c => c.name === land.name);
             nextDeck[idx].quantity -= toRemove;
             excess -= toRemove;
          }
        }
        if (excess > 0) {
          for (let i = nextDeck.length - 1; i >= 0; i--) {
            if (excess > 0 && nextDeck[i].quantity > 0) {
               const toRemove = Math.min(nextDeck[i].quantity, excess);
               nextDeck[i].quantity -= toRemove;
               excess -= toRemove;
            }
          }
        }
        nextDeck = nextDeck.filter(c => c.quantity > 0);
      }
      
      return nextDeck;
    });
    setWarning(`⚖️ El Juez ha aplicado heurísticas locales de urgencia: Banlist eliminada y mazo forzado a ${targetSize} cartas.`);
  };

  const handleOptimizeDeck = async (auditReport = null) => {
    try {
      setLoading(true);

      if (auditReport && auditReport.applyProgrammatically) {
        const allCards = await getAllCards();
        const nextDeck = await applyAuditChangesProgrammatically(renderDeck, auditReport.suggestions, allCards, lastFormData);
        setRenderDeck(nextDeck);
        setWarning("✨ ¡Cambios aplicados de forma instantánea y matemática!");
        setLoading(false);
        return;
      }

      const result = await optimizarMazo(renderDeck, lastFormData, aiConfig, true, auditReport);
      if (result && result.cards) {
        setRenderDeck(result.cards);
        if (result.sideboard && result.sideboard.length > 0) {
          setRenderSideboard(result.sideboard);
        }
        if (result.lore) {
          setAiMetadata(prev => {
            const base = prev || {};
            return {
              ...base,
              lore: result.lore,
              deckName: result.deckName || base.deckName || 'Mazo Optimizado',
              mulligan: result.mulligan || base.mulligan,
              strategy: result.strategy || base.strategy,
              archetype: result.archetype || base.archetype
            };
          });
        }
      } else {
        setRenderDeck(result);
      }
      setWarning("✨ ¡Mazo optimizado exitosamente! Matemáticas ajustadas y consistencia maximizada.");
    } catch (e) {
      setWarning(`❌ Error al optimizar: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateMana = async () => {
    if (!renderDeck || renderDeck.length === 0) return;
    
    setLoading(true);
    setForgePhase({ phase: 'mana', message: '🌐 Recalculando pips y regenerando base de maná perfecta...' });
    
    try {
      // 1. Filtrar las cartas de hechizos (quitar tierras)
      const spells = renderDeck.filter(c => !isLandCard(c));
      
      if (spells.length === 0) {
        setWarning("⚠️ No hay hechizos suficientes para calcular la base de maná.");
        setLoading(false);
        setForgePhase(null);
        return;
      }
      
      // 2. Determinar si hay un Yorion para ajustar el total de cartas o si es Commander
      const isCommander = selectedFormat === 'COMMANDER';
      const hasYorion = !isCommander && (spells.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || 
                       (lastFormData?.companero && lastFormData.companero.toLowerCase().includes("yorion")));
      const deckSize = isCommander ? 100 : (hasYorion ? 80 : 60);
      
      // 3. Calcular la cantidad de tierras perfecta
      const targetLandCount = calculatePerfectLandCount(spells, lastFormData, hasYorion);
      
      // Determinar la cantidad de tierras para cuadrar el mazo exacto de deckSize sin alterar hechizos
      let currentSpellsCount = spells.reduce((acc, c) => acc + (c.quantity || 1), 0);
      let finalLandCount = targetLandCount;
      
      const neededLands = deckSize - currentSpellsCount;
      const minLandsForFormat = isCommander ? 25 : 12;
      const maxLandsForFormat = isCommander ? 50 : 38;
      if (neededLands >= minLandsForFormat && neededLands <= maxLandsForFormat) {
        finalLandCount = neededLands;
      }
      
      // 4. Calcular pips de maná reales de los hechizos
      const recalculatedPips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
      spells.forEach(card => {
        let cost = card.mana_cost || '';
        if (card.card_faces && card.card_faces[0] && typeof card.card_faces[0].mana_cost === 'string') {
          cost = card.card_faces[0].mana_cost;
        }
        const qty = Number(card.quantity || 1);
        
        let hasPips = false;
        if (cost.includes('{W}')) { recalculatedPips.W += (cost.match(/\{W\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{U}')) { recalculatedPips.U += (cost.match(/\{U\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{B}')) { recalculatedPips.B += (cost.match(/\{B\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{R}')) { recalculatedPips.R += (cost.match(/\{R\}/g) || []).length * qty; hasPips = true; }
        if (cost.includes('{G}')) { recalculatedPips.G += (cost.match(/\{G\}/g) || []).length * qty; hasPips = true; }

        if (!hasPips && card.color_identity) {
          card.color_identity.forEach(col => {
            const upperCol = String(col).toUpperCase();
            if (recalculatedPips[upperCol] !== undefined) {
              recalculatedPips[upperCol] += 1 * qty;
            }
          });
        }
      });
      
      // 5. Generar la base de tierras
      const requestedColors = lastFormData?.colores || [];
      const usedColors = Object.keys(recalculatedPips).filter(color => recalculatedPips[color] > 0 || requestedColors.includes(color));
      
      // Extraer nombres de tierras de utilidad que ya tenga el mazo
      const existingUtilityNames = renderDeck
        .filter(c => isLandCard(c) && !['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(c.name.toLowerCase()))
        .map(c => c.name);
      
      const utilityLandsToRecommend = existingUtilityNames.length > 0 ? existingUtilityNames : (aiMetadata?.utility_lands_recommendations || []);
      
      const newLands = await generateManaBase(
        recalculatedPips, 
        finalLandCount, 
        usedColors, 
        lastFormData, 
        spells, 
        utilityLandsToRecommend
      );
      
      // 6. Hidratar las tierras nuevas
      const hydratedLands = await hydrateDeckCards(newLands, lastFormData?.rarityMode || 'high-power');
      
      // 7. Actualizar el mazo
      setRenderDeck([...spells, ...hydratedLands]);
      setWarning("✨ Base de maná regenerada perfectamente según los pips de tus hechizos.");
      
      if (lastGenerationLogs) {
        setLastGenerationLogs(prev => ({
          ...prev,
          logs: [...(prev?.logs || []), `[MANA PERFECTO] Regeneradas ${finalLandCount} tierras basadas en los nuevos pips: ${JSON.stringify(recalculatedPips)}`]
        }));
      }
    } catch (err) {
      console.error(err);
      setWarning(`❌ Error al regenerar maná: ${err.message}`);
    } finally {
      setLoading(false);
      setForgePhase(null);
    }
  };

  return (

    <div className="max-w-7xl mx-auto px-4 py-8">
      <AnimatePresence>
        {loading && (
          <ForgeLoadingScreen forgePhase={forgePhase} />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'form' ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

            {/* Panel de Configuración de IA */}
            <details className="mb-8 group" open={!aiConfig?.selectedModel}>
              <summary className="cursor-pointer flex items-center gap-3 p-5 frosted-panel border border-magic-gold/20 rounded-2xl hover:border-magic-gold/40 transition-all duration-300">
                <img src="/ASSETS/Engranaje.webp" alt="Config" className="w-10 h-10 object-contain drop-shadow-[0_0_10px_rgba(255,202,88,0.4)] group-open:animate-spin" style={{ animationDuration: '8s' }} />
                <div className="flex-1">
                  <h3 className="font-cinzel text-sm text-magic-gold uppercase tracking-[0.15em] font-black">
                    Configuración del Oráculo IA
                  </h3>
                  <p className="text-[10px] text-white/40 tracking-wider">
                    {aiConfig?.selectedModel ? `✅ Modelo activo: ${aiConfig.selectedModel}` : '⚠️ Configura un modelo de IA para poder forjar mazos'}
                  </p>
                </div>
                <span className="text-magic-gold text-xs group-open:rotate-180 transition-transform duration-300">▼</span>
              </summary>
              <div className="mt-3 p-6 frosted-panel border border-magic-gold/10 rounded-2xl">
                <AiConfigPanel
                  storageKey={FORGE_STORAGE_KEY}
                  onConfigReady={(config) => setAiConfig(config)}
                />
              </div>
            </details>

            <ForgeForm 
              onSubmit={handleSubmit} 
              isLoading={loading} 
              error={error} 
              aiConfig={aiConfig} 
              lastGenerationLogs={lastGenerationLogs}
              onOpenOracleLog={() => {
                setOracleActiveTab('prompts');
                setShowOracleLog(true);
              }}
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
              initialSeedCards={initialSeedCards}
              initialFormData={initialFormData}
            />
          </motion.div>
        ) : mode === 'blueprint' ? (
          <motion.div key="blueprint" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <BlueprintEditor
              blueprint={currentBlueprint}
              format={selectedFormat}
              onAssemble={handleAssembleDeck}
              onBack={() => setMode('form')}
            />
          </motion.div>
        ) : (
          <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            {/* Header del Mazo */}
            <div className="flex flex-col 2xl:flex-row justify-between items-start mb-8 gap-6 p-8 leather-panel border-magic-gold/10 shadow-2xl relative z-10">
              <div className="flex flex-col gap-4 w-full 2xl:w-auto flex-1">
                <div className="flex items-start sm:items-center gap-4">
                  <img src="/ASSETS/iconoDeck.webp" alt="Deck" className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-[0_0_15px_rgba(255,202,88,0.3)] shrink-0" />
                  <div className="flex flex-col gap-2">
                    {isEditingName ? (
                      <input
                        type="text"
                        value={tempDeckName}
                        onChange={(e) => setTempDeckName(e.target.value)}
                        onBlur={() => {
                          setIsEditingName(false);
                          if (tempDeckName.trim()) {
                            setAiMetadata(prev => ({ ...prev, deckName: tempDeckName.trim() }));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsEditingName(false);
                            if (tempDeckName.trim()) {
                              setAiMetadata(prev => ({ ...prev, deckName: tempDeckName.trim() }));
                            }
                          }
                        }}
                        className="bg-black/40 border border-magic-gold text-magic-gold rounded px-3 py-1 font-cinzel text-2xl w-full max-w-md focus:outline-none focus:ring-1 focus:ring-magic-gold"
                        autoFocus
                      />
                    ) : (
                      <h2 
                        onClick={() => {
                          setTempDeckName(deckName);
                          setIsEditingName(true);
                        }}
                        className="text-3xl sm:text-4xl font-cinzel text-magic-gold tracking-wide leading-tight cursor-pointer hover:opacity-80 flex items-center gap-2 group"
                        title="Haga clic para renombrar"
                      >
                        {deckName}
                        <span className="opacity-0 group-hover:opacity-100 text-xs text-magic-gold/50 transition-opacity">✏️</span>
                      </h2>
                    )}
                    <div className="flex items-center gap-2">
                      {lastFormData?.colores?.map(c => {
                        const iconPath = {
                          'W': '/ASSETS/manaBlanco.webp',
                          'U': '/ASSETS/manaAzul.webp',
                          'B': '/ASSETS/manaNegro.webp',
                          'R': '/ASSETS/manaRojo.webp',
                          'G': '/ASSETS/manaVerde.webp',
                          'C': '/ASSETS/Manaincoloro.webp'
                        }[c];
                        return iconPath ? <img key={c} src={iconPath} alt={c} className="w-6 h-6 sm:w-8 sm:h-8 object-contain drop-shadow-md" title={c} /> : null;
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="px-2.5 py-0.5 rounded bg-magic-gold/10 text-magic-gold border border-magic-gold/25 text-[10px] font-bold uppercase tracking-wider">
                    {selectedFormat}
                  </span>
                  <span className="text-magic-gold/60 text-[10px] uppercase tracking-[0.2em] font-bold">
                    {lastFormData?.archetype} • {stats.mainCount} CARTAS
                  </span>
                  {stats.isValid ? (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                      <CheckCircle2 size={12} /> Legal en {selectedFormat.charAt(0) + selectedFormat.slice(1).toLowerCase()}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">
                      <XCircle size={12} /> No cumple las reglas
                    </span>
                  )}
                  <PowerLevelMeter deck={renderDeck} />
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-start 2xl:justify-end gap-3 w-full 2xl:w-auto mt-4 2xl:mt-0">
                {lastGenerationLogs && (
                  <button
                    onClick={() => {
                      setOracleActiveTab('summary');
                      setShowOracleLog(true);
                    }}
                    className="btn-magic-glass btn-glass-gold shadow-lg flex items-center gap-2 border-[#D4AF37]/40 text-[#D4AF37]"
                  >
                    🔮 Bitácora del Oráculo
                  </button>
                )}
                <button
                  onClick={() => setShowRagGraph(true)}
                  className="btn-magic-glass btn-glass-gold shadow-lg flex items-center gap-1.5 border-[#D4AF37]/30 text-[#D4AF37]"
                >
                  <GitFork size={14} className="rotate-90" /> Grafo RAG
                </button>
                <button
                  onClick={handlePanicButton}
                  className="btn-magic-glass btn-glass-blue shadow-lg flex items-center gap-1.5 border-blue-500/30 text-blue-400 bg-blue-900/20 hover:bg-blue-800/40"
                  title="Auto-corregir problemas de legalidad y tamaño del mazo"
                >
                  <Shield size={14} /> Juez de Urgencia
                </button>
                <button
                  onClick={handleRegenerateMana}
                  className="btn-magic-glass btn-glass-blue shadow-lg flex items-center gap-1.5 border-cyan-500/30 text-cyan-400 bg-cyan-900/20 hover:bg-cyan-800/40"
                  title="Regenerar base de tierras perfecta basada en los pips del mazo"
                >
                  <Droplet size={14} className="text-cyan-400 fill-cyan-400/20 animate-pulse" /> Maná Perfecto
                </button>
                <button
                  onClick={() => setShowVisualGrid(true)}
                  className="btn-magic-glass btn-glass-silver shadow-lg flex items-center gap-1.5"
                >
                  <Share2 size={14} /> Grid Visual
                </button>
                <button
                  onClick={() => setShowHandSim(true)}
                  className="btn-magic-glass btn-glass-silver shadow-lg"
                >
                  🖐️ Testear Mano
                </button>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={cn("btn-magic-glass", isEditing ? "btn-glass-blue border-blue-500/40" : "btn-glass-silver")}
                >
                  {isEditing ? '💾 Guardar Cambios' : '✍️ Editar Mazo'}
                </button>
                <button
                  onClick={handleArchive}
                  disabled={!stats.isValid}
                  className={cn("btn-magic-glass btn-glass-gold shadow-lg", !stats.isValid && "opacity-50 grayscale")}
                >
                  {archived ? '✅ Archivado' : '📦 Archivar Local'}
                </button>
                <button
                  onClick={handleArchiveOnline}
                  disabled={!stats.isValid}
                  className={cn("btn-magic-glass btn-glass-blue shadow-lg", !stats.isValid && "opacity-50 grayscale")}
                >
                  {cloudArchived ? '☁️ Subido' : '☁️ Subir Nube'}
                </button>
                <button
                  onClick={() => setShowFeedbackModal(true)}
                  disabled={!stats.isValid}
                  className={cn("btn-magic-glass btn-glass-gold shadow-lg flex items-center gap-1 border-[#D4AF37]/30 text-[#D4AF37]", !stats.isValid && "opacity-50 grayscale")}
                >
                  ⭐ Valorar Mazo
                </button>
                <div className="relative">
                  <button
                    onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                    className="btn-magic-glass btn-glass-silver shadow-lg flex items-center gap-2"
                  >
                    <Download size={14} /> Exportar Mazo ▾
                  </button>
                  <AnimatePresence>
                    {exportDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setExportDropdownOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2 w-52 bg-[#120F0D] border-2 border-[#D4AF37]/30 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.9)] overflow-hidden z-50 divide-y divide-white/5 text-xs text-left backdrop-blur-md"
                        >
                          <button onClick={() => handleExportUniversal('forge')} className="w-full px-4 py-2.5 hover:bg-[#D4AF37]/10 text-gray-200 hover:text-white transition-colors flex items-center gap-2">
                            <span>📥</span> Forge (.dck)
                          </button>
                          <button onClick={() => handleExportUniversal('arena')} className="w-full px-4 py-2.5 hover:bg-[#D4AF37]/10 text-gray-200 hover:text-white transition-colors flex items-center gap-2">
                            <span>🎴</span> MTG Arena (.txt)
                          </button>
                          <button onClick={() => handleExportUniversal('cockatrice')} className="w-full px-4 py-2.5 hover:bg-[#D4AF37]/10 text-gray-200 hover:text-white transition-colors flex items-center gap-2">
                            <span>⚔</span> Cockatrice (.xml)
                          </button>
                          <button onClick={() => handleExportUniversal('obsidian')} className="w-full px-4 py-2.5 hover:bg-[#D4AF37]/10 text-gray-200 hover:text-white transition-colors flex items-center gap-2">
                            <span>📝</span> Obsidian Note (.md)
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <button 
                  onClick={() => {
                    setMode('form');
                    setAuditResult(null);
                    setShowAuditModal(false);
                  }} 
                  className="btn-magic-glass btn-glass-silver"
                >
                  ← Nuevo
                </button>
              </div>
            </div>

            {/* Alertas de Reglas */}
            <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-[100]">
              {/* Cartas Main */}
              <div className={cn("group relative hover:z-[100] p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all cursor-help", stats.isMainValid ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                {stats.isMainValid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60">Cartas Main</p>
                  <p className="text-sm font-bold">{stats.mainCount} / {stats.targetMain} requeridas</p>
                </div>
                {!stats.isMainValid && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-[#1a1612] border border-red-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] text-[11px] backdrop-blur-2xl pointer-events-none">
                    <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle size={12} /> Diferencia detectada:
                    </p>
                    <p className="text-white/80 leading-relaxed">El mazo tiene {stats.mainCount} cartas. Debe tener exactamente {stats.targetMain} para ser legal en {selectedFormat.charAt(0) + selectedFormat.slice(1).toLowerCase()}.</p>
                  </div>
                )}
              </div>

              {/* Cartas Prohibidas */}
              <div className={cn("group relative hover:z-[100] p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all cursor-help", stats.banned.length === 0 ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                {stats.banned.length === 0 ? <CheckCircle2 size={20} /> : <Shield size={20} />}
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60">Cartas Prohibidas</p>
                  <p className="text-sm font-bold">{stats.banned.length === 0 ? 'Limpio' : `${stats.banned.length} ilegales`}</p>
                </div>
                {stats.banned.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-[#1a1612] border border-red-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] text-[11px] backdrop-blur-2xl pointer-events-none">
                    <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <Shield size={12} /> Cartas en Banlist:
                    </p>
                    <ul className="list-disc pl-5 text-white/80 space-y-1">
                      {[...new Set(stats.banned.map(c => c.name))].map(name => <li key={name}>{name}</li>)}
                    </ul>
                  </div>
                )}
              </div>

              {/* Límite de Copias */}
              <div className={cn("group relative hover:z-[100] p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all cursor-help", stats.overLimit.length === 0 ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                {stats.overLimit.length === 0 ? <CheckCircle2 size={20} /> : <Info size={20} />}
                <div>
                  <p className="text-[10px] uppercase font-bold opacity-60">Límite de Copias</p>
                  <p className="text-sm font-bold">{stats.overLimit.length === 0 ? `Correcto (máx ${stats.maxCopiesAllowed})` : 'Exceso detectado'}</p>
                </div>
                {stats.overLimit.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-[#1a1612] border border-red-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] text-[11px] backdrop-blur-2xl pointer-events-none">
                    <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <Info size={12} /> Exceso de copias (&gt;{stats.maxCopiesAllowed}):
                    </p>
                    <ul className="list-disc pl-5 text-white/80 space-y-1">
                      {stats.overLimit.map(c => <li key={c.name}>{c.name} ({c.quantity} copias)</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>


            {warning && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-3 shadow-2xl">
                <AlertTriangle size={16} /> {warning}
                <button onClick={() => setWarning(null)} className="ml-auto text-red-400/50 hover:text-red-400"><XCircle size={14} /></button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2">
                {isEditing && (
                  <div className="mb-6 space-y-4 relative z-30">
                    <CardSearch onAddCard={handleAddCard} formData={lastFormData} />
                    
                    {/* El Oráculo de Sinergias */}
                    <div className="p-4 rounded-xl border border-green-500/30 bg-black/50 backdrop-blur-md shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 blur-3xl -z-10 rounded-full" />
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-cinzel text-green-400 flex items-center gap-2">
                          <Sparkles size={18} /> El Oráculo de Sinergias
                        </h4>
                        <button 
                          onClick={handleSuggestCards}
                          disabled={isSuggesting}
                          className="btn-magic-glass py-1 px-3 text-xs bg-green-900/40 border-green-500/50 hover:bg-green-800/60"
                        >
                          {isSuggesting ? 'Consultando...' : 'Pedir Consejo'}
                        </button>
                      </div>
                      
                      <AnimatePresence>
                        {cardSuggestions && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 mt-4"
                          >
                            {cardSuggestions.map((sug, idx) => (
                              <div key={idx} className="p-3 bg-black/40 border border-white/10 rounded-lg flex flex-col gap-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <div className="flex items-center gap-3 flex-1">
                                    <span 
                                      className="font-bold text-green-400 text-sm flex items-center gap-1 cursor-pointer hover:underline"
                                      onMouseEnter={(e) => handleCardHover(e, sug.name)}
                                      onMouseLeave={handleCardLeave}
                                    >
                                      <Sparkles size={12}/> +{sug.quantity || 1} {sug.name}
                                    </span>
                                    {sug.cut && (
                                      <span 
                                        className="font-bold text-red-400/80 text-sm flex items-center gap-1 cursor-pointer hover:underline"
                                        onMouseEnter={(e) => handleCardHover(e, sug.cut)}
                                        onMouseLeave={handleCardLeave}
                                      >
                                        <XCircle size={12}/> -{sug.quantity || 1} {sug.cut}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => executeSwap(sug, idx)}
                                    disabled={applyingSwap === idx}
                                    className="px-3 py-1 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] rounded font-cinzel text-xs flex items-center justify-center min-w-[120px] transition-all"
                                  >
                                    {applyingSwap === idx ? 'Aplicando...' : 'Aplicar Cambio'}
                                  </button>
                                </div>

                                <span className="text-xs text-gray-300 italic border-l-2 border-green-500/30 pl-2">"{sug.reason}"</span>
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
                <VisualGrid 
                  cards={renderDeck} 
                  isEditing={isEditing} 
                  onRemoveCard={handleRemoveCard} 
                  onAddCard={(name) => handleAddCard({ name })} 
                  isMainDeck={true}
                  onAudit={handleAudit}
                  isAuditing={isAuditing}
                  auditResult={showAuditModal ? auditResult : null}
                  onCloseAudit={() => setShowAuditModal(false)}
                  onOptimize={handleOptimizeDeck}
                  manaSources={mainDeckSources}
                  deckSize={mainDeckSize}
                />
                
                {/* Matriz de Probabilidades de Frank Karsten */}
                <KarstenMatrix deck={renderDeck} validationEngine={aiMetadata?.validationEngine} validationData={aiMetadata?.validationData} chosenColors={lastFormData?.colores || []} />
                
                {/* Simulación del Turno de Oro */}
                <TurnoDeOroSim deck={renderDeck} />
                
                {/* Sideboard Section */}
                {selectedFormat !== 'COMMANDER' && (
                  <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                      <div className="flex items-center gap-4">
                        <h3 className="font-cinzel text-xl text-magic-gold flex items-center gap-3">
                          <Shield className="text-[#D4AF37]" /> Banquillo (Sideboard)
                        </h3>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                          stats.isSideValid ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                        )}>
                          {stats.sideCount} / {stats.targetSide} cartas
                        </span>
                      </div>

                      <button
                        onClick={handleAutoGenerateSideboard}
                        className="px-4 py-2 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/40 hover:border-[#D4AF37] text-magic-gold hover:text-white rounded-xl text-xs font-cinzel flex items-center gap-2 transition-all active:scale-95 shadow-md"
                      >
                        <Sparkles size={13} className="text-[#D4AF37] animate-pulse" /> 🔮 Sideboard Architect
                      </button>
                    </div>

                    <VisualGrid 
                      cards={renderSideboard} 
                      isEditing={isEditing} 
                      onRemoveCard={(name) => {
                        setRenderSideboard(prev => {
                          const card = prev.find(c => c.name === name);
                          if (card && card.quantity > 1) return prev.map(c => c.name === name ? { ...c, quantity: c.quantity - 1 } : c);
                          return prev.filter(c => c.name !== name);
                        });
                      }} 
                      onAddCard={(name) => handleAddCard({ name }, 1, 'side')} 
                    />
                  </div>
                )}

                {/* Guía Táctica Interactiva de Banquillo */}
                {selectedFormat !== 'COMMANDER' && (
                  <div className="mt-12 pt-8 border-t border-white/10">
                  <h3 className="font-cinzel text-xl text-[#D4AF37] flex items-center gap-3 mb-2">
                    <Zap className="text-[#D4AF37] animate-pulse" /> Guía Táctica de Banquillo
                  </h3>
                  <p className="text-gray-400 text-xs mb-6">
                    Análisis dinámico Pro Tour adaptado al pool actual de 75 cartas y balance de maná. Pasa el cursor sobre una carta para ver su imagen.
                  </p>

                  {/* Matchup Tabs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {matchupsList.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setActiveMatchupTab(m.id)}
                        className={cn(
                          "px-4 py-3 rounded-lg text-xs font-cinzel transition-all border text-left flex flex-col justify-between h-20 relative overflow-hidden group",
                          activeMatchupTab === m.id
                            ? "border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                            : "border-white/10 text-gray-400 hover:border-white/30 hover:text-white hover:shadow-lg bg-black/40"
                        )}
                      >
                        <div className="absolute inset-0 bg-black/70 group-hover:bg-black/50 transition-colors z-0" />
                        {activeMatchupTab === m.id && (
                          <div className="absolute inset-0 bg-gradient-to-t from-[#D4AF37]/20 to-transparent z-0" />
                        )}
                        <span className="font-bold block truncate z-10 drop-shadow-md">{m.name}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border self-start mt-2 font-sans font-semibold z-10 backdrop-blur-sm",
                          m.difficultyColor
                        )}>
                          {m.difficulty}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Active Matchup Panel */}
                  {(() => {
                    const activeMatchup = matchupsList.find(m => m.id === activeMatchupTab) || matchupsList[0];
                    if (!activeMatchup) return null;
                    return (
                      <div className="relative rounded-xl border border-[#D4AF37]/30 p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden">
                        <div className="absolute inset-0 bg-[url('/ASSETS/FrostedGlass.webp')] bg-cover bg-center opacity-40 mix-blend-overlay z-0 pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-[#1a1612]/90 to-black/80 z-0 pointer-events-none" />
                        
                        <div className="relative z-10">
                          <div className="mb-6">
                            <h4 className="font-cinzel text-base text-[#D4AF37] mb-2 font-bold drop-shadow-md">Directriz del Matchup</h4>
                            <p className="text-sm text-gray-300 leading-relaxed italic bg-black/40 p-3 rounded-lg border border-white/5 shadow-inner">
                              "{activeMatchup.tip}"
                            </p>
                          </div>

                          {/* Swap Balance Bar */}
                          <div className={cn(
                            "mb-6 p-4 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-inner transition-all",
                            totalIn === totalOut
                              ? totalIn > 0
                                ? "bg-green-500/10 border-green-500/30 text-green-400"
                                : "bg-white/5 border-white/10 text-gray-400"
                              : "bg-red-500/10 border-red-500/30 text-red-400 animate-pulse"
                          )}>
                            <div className="flex items-center gap-2">
                              <Activity size={16} />
                              <span>
                                {totalIn === totalOut
                                  ? totalIn > 0
                                    ? `✅ Intercambio equilibrado (${totalIn}/${totalOut})`
                                    : "No hay intercambios activos para este matchup"
                                  : totalIn > totalOut
                                    ? `⚠️ Desequilibrio: Debes retirar ${totalIn - totalOut} carta(s) del mainboard para mantener el mazo en ${stats.mainCount} cartas`
                                    : `⚠️ Desequilibrio: Debes incluir ${totalOut - totalIn} carta(s) del banquillo para mantener el mazo en ${stats.mainCount} cartas`
                                }
                              </span>
                            </div>
                            {totalIn > 0 && (
                              <button
                                onClick={() => {
                                  setActiveSwaps(prev => ({
                                    ...prev,
                                    [activeMatchupTab]: { in: {}, out: {} }
                                  }));
                                }}
                                className="text-[10px] uppercase font-bold text-gray-400 hover:text-white transition-colors underline"
                              >
                                Reiniciar
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Cards IN (Banquillo) */}
                            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col">
                              <h5 className="font-cinzel text-sm text-green-400 font-bold mb-4 flex items-center gap-2 drop-shadow-md">
                                <PlusCircle size={16} /> ENTRAN (IN)
                              </h5>
                              {renderSideboard.length === 0 ? (
                                <p className="text-xs text-gray-400 italic bg-black/30 p-2 rounded">El banquillo está vacío.</p>
                              ) : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-green-500/20 scrollbar-track-transparent">
                                  {[...renderSideboard]
                                    .sort((a, b) => {
                                      const aQty = currentSwaps.in[a.name] || 0;
                                      const bQty = currentSwaps.in[b.name] || 0;
                                      return bQty - aQty; // Active swaps at top
                                    })
                                    .map((c, i) => {
                                      const swapQty = currentSwaps.in[c.name] || 0;
                                      return (
                                        <div 
                                          key={i}
                                          className={cn(
                                            "flex items-center justify-between text-sm bg-black/60 px-3 py-2.5 rounded-lg border transition-all shadow-md",
                                            swapQty > 0 ? "border-green-500/40 bg-green-500/5" : "border-white/5"
                                          )}
                                        >
                                          <span 
                                            onMouseEnter={(e) => handleCardHover(e, c.name)}
                                            onMouseLeave={handleCardLeave}
                                            className={cn(
                                              "text-gray-100 font-medium cursor-help hover:text-green-300 transition-colors truncate max-w-[140px] sm:max-w-xs",
                                              swapQty > 0 ? "text-green-200 font-bold" : "text-gray-400"
                                            )}
                                          >
                                            {c.name}
                                          </span>
                                          
                                          <div className="flex items-center gap-2 shrink-0">
                                            <button
                                              onClick={() => updateSwap(activeMatchupTab, 'in', c.name, swapQty - 1)}
                                              disabled={swapQty === 0}
                                              className={cn(
                                                "w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors",
                                                swapQty > 0 
                                                  ? "bg-green-950/40 text-green-400 border border-green-500/30 hover:bg-green-900/60"
                                                  : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                                              )}
                                            >
                                              -
                                            </button>
                                            <span className={cn(
                                              "text-xs font-mono font-bold w-12 text-center",
                                              swapQty > 0 ? "text-green-400" : "text-gray-500"
                                            )}>
                                              {swapQty} / {c.quantity}
                                            </span>
                                            <button
                                              onClick={() => updateSwap(activeMatchupTab, 'in', c.name, swapQty + 1)}
                                              disabled={swapQty >= c.quantity}
                                              className={cn(
                                                "w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors",
                                                swapQty < c.quantity 
                                                  ? "bg-green-950/40 text-green-400 border border-green-500/30 hover:bg-green-900/60"
                                                  : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                                              )}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                              )}
                            </div>

                            {/* Cards OUT (Mazo Principal) */}
                            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col">
                              <h5 className="font-cinzel text-sm text-red-400 font-bold mb-4 flex items-center gap-2 drop-shadow-md">
                                <MinusCircle size={16} /> SALEN (OUT)
                              </h5>
                              {renderDeck.filter(c => !isLandCard(c)).length === 0 ? (
                                <p className="text-xs text-gray-400 italic bg-black/30 p-2 rounded">No hay hechizos en el mazo principal.</p>
                              ) : (
                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-red-500/20 scrollbar-track-transparent">
                                  {renderDeck
                                    .filter(c => !isLandCard(c))
                                    .sort((a, b) => {
                                      const aQty = currentSwaps.out[a.name] || 0;
                                      const bQty = currentSwaps.out[b.name] || 0;
                                      return bQty - aQty; // Active swaps at top
                                    })
                                    .map((c, i) => {
                                      const swapQty = currentSwaps.out[c.name] || 0;
                                      return (
                                        <div 
                                          key={i}
                                          className={cn(
                                            "flex items-center justify-between text-sm bg-black/60 px-3 py-2.5 rounded-lg border transition-all shadow-md",
                                            swapQty > 0 ? "border-red-500/40 bg-red-500/5" : "border-white/5"
                                          )}
                                        >
                                          <span 
                                            onMouseEnter={(e) => handleCardHover(e, c.name)}
                                            onMouseLeave={handleCardLeave}
                                            className={cn(
                                              "text-gray-100 font-medium cursor-help hover:text-red-300 transition-colors truncate max-w-[140px] sm:max-w-xs",
                                              swapQty > 0 ? "text-red-200 line-through font-bold" : "text-gray-400"
                                            )}
                                          >
                                            {c.name}
                                          </span>
                                          
                                          <div className="flex items-center gap-2 shrink-0">
                                            <button
                                              onClick={() => updateSwap(activeMatchupTab, 'out', c.name, swapQty - 1)}
                                              disabled={swapQty === 0}
                                              className={cn(
                                                "w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors",
                                                swapQty > 0 
                                                  ? "bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/60"
                                                  : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                                              )}
                                            >
                                              -
                                            </button>
                                            <span className={cn(
                                              "text-xs font-mono font-bold w-12 text-center",
                                              swapQty > 0 ? "text-red-400" : "text-gray-500"
                                            )}>
                                              {swapQty} / {c.quantity}
                                            </span>
                                            <button
                                              onClick={() => updateSwap(activeMatchupTab, 'out', c.name, swapQty + 1)}
                                              disabled={swapQty >= c.quantity}
                                              className={cn(
                                                "w-6 h-6 rounded flex items-center justify-center font-bold text-xs transition-colors",
                                                swapQty < c.quantity 
                                                  ? "bg-red-950/40 text-red-400 border border-red-500/30 hover:bg-red-900/60"
                                                  : "bg-white/5 text-gray-600 cursor-not-allowed border border-white/5"
                                              )}
                                            >
                                              +
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Desktop Sidebar Wrapper */}
              <div className="hidden lg:block lg:col-span-1 space-y-6 font-sans">
                {renderSidebarContent()}
              </div>
            </div>

            <HandSimulator deck={renderDeck} isOpen={showHandSim} onClose={() => setShowHandSim(false)} aiConfig={aiConfig} />
            <SynergyGraphVisualizer deck={renderDeck} isOpen={showRagGraph} onClose={() => setShowRagGraph(false)} archetype={aiMetadata?.archetype || lastFormData?.archetype} colors={lastFormData?.colores} />
            <DeckVisualExporter deck={renderDeck} sideboard={renderSideboard} isOpen={showVisualGrid} onClose={() => setShowVisualGrid(false)} deckName={deckName} archetype={aiMetadata?.archetype || lastFormData?.archetype} colors={lastFormData?.colores} formData={lastFormData} onOptimize={handleOptimizeDeck} />

            {/* Mobile Metrics FAB and BottomSheet */}
            {isMobile && mode === 'deck' && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    vibrateTouch();
                    setShowMobileMetrics(true);
                  }}
                  className="fixed bottom-24 right-4 z-40 bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,55,0.4)] border border-[#D4AF37]/50 active:scale-95 cursor-pointer"
                >
                  <Activity size={24} className="text-black" />
                </motion.button>

                <BottomSheet
                  isOpen={showMobileMetrics}
                  onClose={() => setShowMobileMetrics(false)}
                  title="Métricas y Guía del Mazo"
                >
                  <div className="space-y-6 font-sans pb-8">
                    {renderSidebarContent()}
                  </div>
                </BottomSheet>
              </>
            )}

            {/* Modal de Feedback (Mejora 5) */}
            <AnimatePresence>
              {showFeedbackModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
                >
                  <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-[#120F0D]/95 border-2 border-[#D4AF37]/30 shadow-[0_0_50px_rgba(212,175,55,0.15)] rounded-2xl p-6 text-[#f4ece0] backdrop-blur-xl flex flex-col gap-5"
                  >
                    {/* Botón de cierre */}
                    <button
                      onClick={() => setShowFeedbackModal(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-[#D4AF37] transition-colors"
                    >
                      <XCircle size={20} />
                    </button>

                    {feedbackSubmitted ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-10 gap-4 text-center"
                      >
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="text-5xl text-[#D4AF37]"
                        >
                          ✨
                        </motion.div>
                        <h3 className="font-cinzel text-xl text-[#D4AF37]">¡Valoración Recibida!</h3>
                        <p className="text-sm text-gray-400 font-sans">Gracias por ayudarnos a perfeccionar el Oráculo.</p>
                      </motion.div>
                    ) : (
                      <>
                        <div className="text-center">
                          <h3 className="font-cinzel text-xl text-[#D4AF37] tracking-wider">Valorar Mazo Forjado</h3>
                          <p className="text-xs text-gray-400 font-sans mt-1">Comparte tu experiencia para calibrar el algoritmo</p>
                        </div>

                        {/* Valoración General */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-gray-300 font-sans font-semibold tracking-wide">VALORACIÓN GENERAL DEL MAZO</label>
                          <div className="flex gap-2 justify-center py-2 bg-white/5 rounded-xl border border-white/5">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isGold = star <= (feedbackHoverRating || feedbackRating);
                              return (
                                <motion.button
                                  key={star}
                                  onClick={() => setFeedbackRating(star)}
                                  onMouseEnter={() => setFeedbackHoverRating(star)}
                                  onMouseLeave={() => setFeedbackHoverRating(0)}
                                  whileHover={{ scale: 1.25 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="text-2xl transition-all outline-none"
                                  title={`${star} estrellas`}
                                >
                                  <span className={cn(
                                    isGold ? "text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]" : "text-gray-600 grayscale opacity-45",
                                    "transition-all cursor-pointer"
                                  )}>
                                    ★
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Nivel de Diversión */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-gray-300 font-sans font-semibold tracking-wide">¿QUÉ TAN DIVERTIDO FUE JUGARLO?</label>
                          <div className="flex gap-2 justify-center py-2 bg-white/5 rounded-xl border border-white/5">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isGold = star <= (feedbackFunHoverScore || feedbackFunScore);
                              return (
                                <motion.button
                                  key={star}
                                  onClick={() => setFeedbackFunScore(star)}
                                  onMouseEnter={() => setFeedbackFunHoverScore(star)}
                                  onMouseLeave={() => setFeedbackFunHoverScore(0)}
                                  whileHover={{ scale: 1.25 }}
                                  whileTap={{ scale: 0.9 }}
                                  className="text-2xl transition-all outline-none"
                                  title={`${star} estrellas`}
                                >
                                  <span className={cn(
                                    isGold ? "text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.7)]" : "text-gray-600 grayscale opacity-45",
                                    "transition-all cursor-pointer"
                                  )}>
                                    ★
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Resultado de la Partida */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-gray-300 font-sans font-semibold tracking-wide">RESULTADO DE PARTIDA</label>
                          <div className="grid grid-cols-4 gap-2">
                            {["Gané", "Empaté", "Perdí", "No jugué"].map(result => {
                              const active = feedbackWinRate === result;
                              return (
                                <button
                                  key={result}
                                  onClick={() => setFeedbackWinRate(result)}
                                  className={cn(
                                    "py-2 px-1 rounded-lg text-xs font-semibold font-sans border transition-all text-center cursor-pointer",
                                    active 
                                      ? "bg-[#D4AF37]/20 border-[#D4AF37] text-[#D4AF37]" 
                                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                  )}
                                >
                                  {result}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Notas / Comentarios */}
                        <div className="flex flex-col gap-2">
                          <label className="text-xs text-gray-300 font-sans font-semibold tracking-wide font-sans">NOTAS Y OBSERVACIONES</label>
                          <textarea
                            placeholder="Escribe comentarios sobre la curva, cartas muertas o sinergias..."
                            value={feedbackNotes}
                            onChange={(e) => setFeedbackNotes(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-gray-200 focus:outline-none focus:border-[#D4AF37]/50 h-20 resize-none transition-colors font-sans"
                          />
                        </div>

                        {/* Botón de envío */}
                        <button
                          onClick={handleSubmitFeedback}
                          disabled={isSubmittingFeedback || feedbackRating === 0 || feedbackFunScore === 0}
                          className={cn(
                            "w-full py-3 rounded-xl font-cinzel font-bold text-sm tracking-wider transition-all shadow-lg cursor-pointer",
                            (feedbackRating === 0 || feedbackFunScore === 0)
                              ? "bg-gray-700 text-gray-400 cursor-not-allowed opacity-50"
                              : "bg-gradient-to-r from-[#B8860B] to-[#D4AF37] text-[#0d0b09] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] active:scale-95"
                          )}
                        >
                          {isSubmittingFeedback ? (
                            <span className="flex items-center justify-center gap-2">
                              <Zap className="animate-spin animate-pulse" size={14} /> Enviando...
                            </span>
                          ) : (
                            "Enviar Valoración"
                          )}
                        </button>
                      </>
                    )}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal del Registro del Oráculo */}
      <AnimatePresence>
        {showOracleLog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-5xl h-[85vh] bg-[#0d0b09]/98 border-2 border-[#D4AF37]/40 shadow-[0_0_80px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.15)] rounded-2xl flex flex-col overflow-hidden text-[#f4ece0] backdrop-blur-xl"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#D4AF37]/20 flex items-center justify-between bg-black/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Scroll className="text-[#D4AF37] w-8 h-8 drop-shadow-[0_0_8px_rgba(212,175,55,0.5)] animate-pulse" />
                  <div>
                    <h3 className="font-cinzel text-2xl text-magic-gold tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      Registro de Pensamiento del Oráculo
                    </h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-mono">
                      Traza de Invocación, Prompting y Ajustes Matemáticos
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {/* Botón de Copia Hermoso */}
                  <button
                    onClick={handleCopyOracleLog}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border font-mono",
                      copiedLogs
                        ? "bg-green-950/40 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                        : "bg-[#D4AF37]/10 border-[#D4AF37]/30 text-magic-gold hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50 shadow-[0_0_10px_rgba(212,175,55,0.1)]"
                    )}
                  >
                    {copiedLogs ? <CheckCircle2 size={14} className="text-green-400 font-bold" /> : <Copy size={14} />}
                    {copiedLogs ? '¡Copiado!' : 'Copiar Registro'}
                  </button>
                  
                  <button
                    onClick={() => setShowOracleLog(false)}
                    className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <XCircle size={28} />
                  </button>
                </div>
              </div>

              {/* Contenido con Sidebar */}
              <div className="flex-1 flex overflow-hidden">
                {/* Sidebar de Navegación */}
                <div className="w-64 border-r border-[#D4AF37]/20 bg-black/40 p-4 space-y-2 overflow-y-auto">
                  <button
                    onClick={() => setOracleActiveTab('summary')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                      oracleActiveTab === 'summary'
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-magic-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] font-black"
                        : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    ⚡ Traza del Proceso
                  </button>
                  <button
                    onClick={() => setOracleActiveTab('prompts')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                      oracleActiveTab === 'prompts'
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-magic-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] font-black"
                        : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    📜 Prompts de la API
                  </button>
                  <button
                    onClick={() => setOracleActiveTab('raw_json')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                      oracleActiveTab === 'raw_json'
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-magic-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] font-black"
                        : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    🤖 Respuesta JSON Cruda
                  </button>
                  <button
                    onClick={() => setOracleActiveTab('safeguard')}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border",
                      oracleActiveTab === 'safeguard'
                        ? "bg-[#D4AF37]/20 border-[#D4AF37]/50 text-magic-gold shadow-[0_0_15px_rgba(212,175,55,0.2)] font-black"
                        : "bg-transparent border-transparent text-gray-400 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    ⚖️ Correcciones del Juez
                  </button>
                </div>

                {/* Panel Central */}
                <div className="flex-1 p-6 overflow-y-auto bg-black/20 flex flex-col justify-between">
                  <div className="bg-[#120F0D]/90 border border-[#D4AF37]/15 rounded-xl p-6 shadow-inner flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {oracleActiveTab === 'summary' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                          <h4 className="font-cinzel text-lg text-magic-gold font-bold">
                            Traza de Ejecución de la IA
                          </h4>
                          <span className="text-[10px] bg-[#D4AF37]/15 text-[#D4AF37] px-2 py-0.5 rounded border border-[#D4AF37]/30 font-mono">
                            PROCESO ACTIVO
                          </span>
                        </div>
                        {lastGenerationLogs?.error && (
                          <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-200 text-xs shadow-xl flex flex-col gap-2 font-mono">
                            <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs">
                              <span>⚠️</span> DETALLE DEL ERROR DE LA IA / INFRAESTRUCTURA:
                            </div>
                            <p className="text-red-300 font-bold text-sm">{lastGenerationLogs.error}</p>
                            {lastGenerationLogs.stack && (
                              <pre className="mt-2 p-2 bg-black/60 rounded border border-red-500/20 text-[10px] text-red-400/80 overflow-x-auto whitespace-pre-wrap max-h-40 scrollbar-thin scrollbar-thumb-red-500/20 scrollbar-track-transparent font-mono select-text">
                                {lastGenerationLogs.stack}
                              </pre>
                            )}
                          </div>
                        )}
                        <div className="space-y-3 font-mono">
                          {lastGenerationLogs?.logs?.map((log, index) => (
                            <div 
                              key={index} 
                              className="flex gap-3 text-xs leading-relaxed bg-black/40 hover:bg-black/60 p-3 rounded-lg border border-white/5 transition-all pl-4 hover:border-[#D4AF37]/20"
                            >
                              <span className="text-[#D4AF37] font-mono font-bold select-none">[{index + 1}]</span>
                              <span className="text-amber-100/90 whitespace-pre-wrap">{log}</span>
                            </div>
                          )) || (
                            <p className="text-gray-400 italic text-sm">No hay registros de traza disponibles para este mazo.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {oracleActiveTab === 'prompts' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                          <h4 className="font-cinzel text-lg text-magic-gold font-bold">
                            Prompts Estrictos de Gemini (Single Shot)
                          </h4>
                          <span className="text-[10px] bg-blue-950/40 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-mono">
                            SYSTEM & USER
                          </span>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                              <span>⚜️</span> System Instructions Prompt
                            </p>
                            <pre className="p-4 bg-black/60 rounded-xl border border-white/5 text-[11px] text-amber-100/80 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-64 scrollbar-thin scrollbar-thumb-white/10">
                              {lastGenerationLogs?.systemPrompt || 'No disponible'}
                            </pre>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
                              <span>👥</span> User Context Prompt
                            </p>
                            <pre className="p-4 bg-black/60 rounded-xl border border-white/5 text-[11px] text-amber-100/80 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-64 scrollbar-thin scrollbar-thumb-white/10">
                              {lastGenerationLogs?.contextPrompt || 'No disponible'}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    {oracleActiveTab === 'raw_json' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                          <h4 className="font-cinzel text-lg text-magic-gold font-bold">
                            JSON Crudo de Respuesta Estructurada
                          </h4>
                          <span className="text-[10px] bg-green-950/40 text-green-400 px-2 py-0.5 rounded border border-green-500/30 font-mono">
                            SCHEMATIC OUTPUT
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Esta es la respuesta JSON exacta que Gemini Flash generó utilizando la funcionalidad nativa de <code className="text-magic-gold font-mono bg-black/40 px-1.5 py-0.5 rounded">responseSchema</code>.
                        </p>
                        <pre className="p-4 bg-black/60 rounded-xl border border-white/5 text-[11px] text-green-400 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-[500px] scrollbar-thin scrollbar-thumb-white/10 shadow-inner">
                          {lastGenerationLogs?.rawResponse
                            ? JSON.stringify(JSON.parse(lastGenerationLogs.rawResponse), null, 2)
                            : 'No disponible'}
                        </pre>
                      </div>
                    )}

                    {oracleActiveTab === 'safeguard' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-[#D4AF37]/20 pb-3">
                          <h4 className="font-cinzel text-lg text-magic-gold font-bold">
                            Ajustes del Juez de Ecosistema & Salvaguarda Matemática
                          </h4>
                          <span className="text-[10px] bg-purple-950/40 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-mono">
                            JS GUARDIAN
                          </span>
                        </div>
                        <div className="space-y-6">
                          {/* Banlist Swaps */}
                          <div className="p-5 rounded-xl bg-black/40 border border-[#D4AF37]/15">
                            <h5 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Shield size={14} className="text-red-400" /> Filtro Anti-Banlist
                            </h5>
                            {aiMetadata?.banlistSwaps && aiMetadata.banlistSwaps.length > 0 ? (
                              <div className="space-y-2 border-l border-red-500/20 pl-4">
                                {aiMetadata.banlistSwaps.map((swap, index) => (
                                  <div key={index} className="flex items-center gap-2 text-xs text-gray-300 font-mono bg-black/20 p-2 rounded border border-white/5 hover:border-red-500/30 transition-all">
                                    <span className="text-red-400 line-through">{swap.original}</span>
                                    <span className="text-gray-400 font-bold">→</span>
                                    <span className="text-green-400 font-bold">{swap.replacement}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-gray-400 italic font-mono pl-4">
                                ✓ No se detectó ninguna carta de la banlist en la respuesta de la IA. Ecosistema limpio.
                              </p>
                            )}
                          </div>

                          {/* Math SafeGuard */}
                          <div className="p-5 rounded-xl bg-black/40 border border-[#D4AF37]/15">
                            <h5 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-3 flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-green-400" /> Regla de 60 Cartas del Main Deck
                            </h5>
                            <p className="text-xs text-gray-300 leading-relaxed font-mono">
                              El Juez de Ecosistema audita el mazo resultante para garantizar la consistencia matemática.
                              Si la IA responde con un número diferente de copias totales (por ejemplo, al omitir tierras o fallar en el conteo de la curva), el Safeguard local equilibra automáticamente las tierras o hechizos para asegurar exactamente 60 cartas en el Main Deck sin romper las reglas de consistencia de Battle Box.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Card Preview for Oracle */}
      <AnimatePresence>
        {hoveredCard && hoveredCardImgUrl && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[999] pointer-events-none rounded-xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 bg-black/80 backdrop-blur-md"
            style={(() => {
              const tooltipWidth = 240;
              const tooltipHeight = 336;
              const margin = 20;
              
              let left = hoverPos.x + margin;
              if (typeof window !== 'undefined' && left + tooltipWidth > window.innerWidth - 10) {
                left = hoverPos.x - tooltipWidth - margin;
              }
              left = Math.max(10, left);
              
              let top = hoverPos.y - tooltipHeight / 2;
              if (typeof window !== 'undefined') {
                top = Math.max(10, Math.min(top, window.innerHeight - tooltipHeight - 10));
              }
              
              return { 
                left, 
                top, 
                width: `${tooltipWidth}px`
              };
            })()}
          >
            <img 
              src={hoveredCardImgUrl}
              alt={hoveredCard}
              className="w-full h-auto rounded-xl shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}