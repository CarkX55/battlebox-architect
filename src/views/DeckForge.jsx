import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { BATTLEBOX_VETOS, COLORS, BATTLEBOX_RULES } from '../constants/legacyBattleBox';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import ForgeForm from '../components/forge/ForgeForm';
import MetaIngestor from '../components/forge/MetaIngestor';
import ManaOrb from '../components/atoms/ManaOrb';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import VisualGrid from '../components/battlebox/VisualGrid';
import { hydrateDeckCards } from '../services/cardHydrator';
import { callAI, suggestCards, forgeSideboard } from '../services/aiFactory';
import { forgeMazoPerfecto } from '../services/deckArchitectService';
import { archiveDeck, archiveDeckOnline } from '../services/archiveService';
import { getAllCards } from '../services/dbIngestor';
import CardSearch from '../components/forge/CardSearch';
import HandSimulator from '../components/forge/HandSimulator';
import { PowerLevelMeter } from '../components/forge/PowerLevelMeter';
import RadarChart from '../components/forge/RadarChart';
import ManaCurve from '../components/forge/ManaCurve';
import { AlertTriangle, Shield, Lightbulb, Target, Scroll, PenTool, CheckCircle2, XCircle, Info, Zap, Sparkles, Copy, PlusCircle, MinusCircle, GitFork, Share2, Download, Droplet, Activity } from 'lucide-react';
import { calculateKarstenProbability, calculateLandDropProbability, calculateManaCoverage, calculateTurnoDeOro, generateManaBase, calculatePerfectLandCount, calculateVMP, calculateManaSources } from '../services/deckCalculator';
import { generateSideboard } from '../services/sideboardService';
import SynergyGraphVisualizer from '../components/forge/SynergyGraphVisualizer';
import DeckVisualExporter from '../components/forge/DeckVisualExporter';
import { optimizarMazo, applyAuditChangesProgrammatically } from '../services/deckOptimizerService';
import { auditDeckWithAI } from '../services/auditService';

const FORGE_STORAGE_KEY = 'mtg_ai_config_forge';

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
      // Ignorar colores no seleccionados para el mazo
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
const getMatchupGuide = (mainDeck, sideboard, archetype = 'midrange') => {
  const arch = (archetype || 'midrange').toLowerCase();
  
  const matchups = [
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
  const [mode, setMode] = useState('form');
  const [selectedFormat, setSelectedFormat] = useState(() => localStorage.getItem('mtgtop8_selected_format') || 'MODERN');

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
  const [sideboardStrategy, setSideboardStrategy] = useState('');
  const [archived, setArchived] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHandSim, setShowHandSim] = useState(false);
  const [pocketGuide, setPocketGuide] = useState(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [cloudArchived, setCloudArchived] = useState(false);
  const [cardSuggestions, setCardSuggestions] = useState(null);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });
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
    setHoveredCard(name);
    setHoverPos({ x: e.clientX, y: e.clientY });
  };
  const handleCardLeave = () => setHoveredCard(null);

  // --- LÓGICA DE VALIDACIÓN DE REGLAS ---
  const stats = useMemo(() => {
    const safeDeck = Array.isArray(renderDeck) ? renderDeck.filter(Boolean) : [];
    const safeSideboard = Array.isArray(renderSideboard) ? renderSideboard.filter(Boolean) : [];
    
    const mainCount = safeDeck.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const sideCount = safeSideboard.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const bannedInDeck = [...safeDeck, ...safeSideboard].filter(c => c.name && BATTLEBOX_VETOS.includes(c.name));
    const overLimit = [...safeDeck, ...safeSideboard].filter(c => c.name && !isBasicLand(c.name) && (c.quantity || 0) > BATTLEBOX_RULES.maxCopies);
    
    return {
      mainCount,
      sideCount,
      isMainValid: mainCount >= BATTLEBOX_RULES.minMain,
      isSideValid: sideCount === BATTLEBOX_RULES.targetSideboard,
      banned: bannedInDeck,
      overLimit,
      isValid: mainCount >= BATTLEBOX_RULES.minMain && bannedInDeck.length === 0 && overLimit.length === 0
    };
  }, [renderDeck, renderSideboard]);

  const matchupsList = useMemo(() => {
    return getMatchupGuide(renderDeck, renderSideboard, lastFormData?.archetype || 'midrange');
  }, [renderDeck, renderSideboard, lastFormData]);

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
    
    const deckName = aiMetadata?.deckName || 'Mazo_Forjado';
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
      content += `  <deckname>${deckName}</deckname>\n`;
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
      content += `name: "${deckName}"\n`;
      content += `archetype: "${aiMetadata?.archetype || lastFormData?.archetype || 'Midrange'}"\n`;
      content += `format: "${selectedFormat.toUpperCase()} Battle Box"\n`;
      content += `colors: ${colorsStr}\n`;
      content += `created: ${today}\n`;
      content += "type: decklist\n";
      content += "---\n\n";
      
      content += `# 🎴 Ficha del Mazo: ${deckName}\n\n`;
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
    link.download = `${deckName.replace(/\s+/g, '_')}.${fileExtension}`;
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
      name: aiMetadata?.deckName || 'Mazo Sin Nombre',
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
      name: aiMetadata?.deckName || 'Mazo Sin Nombre',
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
    const metrics = {
      vmp: calculateVMP(renderDeck).vmp,
      sources: calculateManaSources(renderDeck)
    };
    const auditData = { ...lastFormData, metrics };

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

    // Sincronizar el rarityMode y allowCustomCards seleccionados en el localStorage para que futuros accesos lo reconozcan
    try {
      const saved = localStorage.getItem(FORGE_STORAGE_KEY);
      if (saved) {
        const configObj = JSON.parse(saved);
        configObj.rarityMode = formData.rarityMode;
        configObj.allowCustomCards = !!formData.allowCustomCards;
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
      console.log('🔥 Forjando mazo Modern Battle Box...');
      
      const onProgress = (phase, message) => {
        setForgePhase({ phase, message });
      };
      
      const aiResult = await forgeMazoPerfecto(combinedFormData, aiConfig, onProgress);
      
      setAiMetadata(aiResult);
      if (aiResult.generationLogs) {
        setLastGenerationLogs(aiResult.generationLogs);
      }
      
      setForgePhase({ phase: 'hydrate', message: '🎴 Cargando imágenes de las cartas...' });
      const hydratedDeck = await hydrateDeckCards(aiResult.cards, combinedFormData.rarityMode);
      const hydratedSideboard = aiResult.sideboard ? await hydrateDeckCards(aiResult.sideboard, combinedFormData.rarityMode) : [];
      
      // Auto-Corrección Matemática Final
      let finalDeck = [...hydratedDeck];
      let currentCount = finalDeck.reduce((sum, c) => sum + c.quantity, 0);
      
      if (currentCount !== 60) {
        if (currentCount > 60) {
          let excess = currentCount - 60;
          let landsDesc = finalDeck.map((c, i) => ({...c, originalIndex: i})).filter(isLandCard).sort((a, b) => b.quantity - a.quantity);
          for (let land of landsDesc) {
            if (excess > 0 && land.quantity > 1) {
              const toRemove = Math.min(land.quantity - 1, excess);
              finalDeck[land.originalIndex].quantity -= toRemove;
              excess -= toRemove;
            }
          }
        } else if (currentCount < 60) {
          const missing = 60 - currentCount;
          const lands = finalDeck.filter(isLandCard).sort((a, b) => b.quantity - a.quantity);
          if (lands.length > 0) {
            const index = finalDeck.findIndex(c => c.name === lands[0].name);
            finalDeck[index].quantity += missing;
          }
        }
      }
      
      setRenderDeck(finalDeck);
      setRenderSideboard(hydratedSideboard); 
      setSideboardStrategy(aiResult.sideboard_strategy || '');
      
      // Mostrar warning si el Juez corrigió cartas de la banlist
      if (aiResult.banlistSwaps && aiResult.banlistSwaps.length > 0) {
        const swapText = aiResult.banlistSwaps.map(s => `${s.original} → ${s.replacement}`).join(', ');
        setWarning(`⚖️ El Juez corrigió ${aiResult.banlistSwaps.length} carta(s) prohibida(s): ${swapText}`);
      }
      
      setMode('deck');
    } catch (err) {
      console.error('❌ Error forjando:', err);
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

    setState(prev => {
      const exists = prev.find(c => c.name === cardName);
      if (exists) {
        // Bloqueo de Copias (Regla de 4) - Solo para Main si queremos ser estrictos, pero Legacy permite 4 total entre ambos.
        // Aquí lo aplicamos a ambos por simplicidad.
        if (!isBasicLand(cardName) && exists.quantity + qtyToAdd > BATTLEBOX_RULES.maxCopies) {
          warningToSet = `⚠️ Límite de copias alcanzado: Máximo ${BATTLEBOX_RULES.maxCopies} de "${cardName}".`;
          return prev.map(c => c.name === cardName ? { ...c, quantity: BATTLEBOX_RULES.maxCopies } : c);
        }
        return prev.map(c => c.name === cardName ? { ...c, quantity: c.quantity + qtyToAdd } : c);
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
        produced_mana: scryfallCard.produced_mana || []
      }];
    });
    
    setWarning(warningToSet);
  };

  const handleRemoveCard = (cardName, qtyToRemove = 1) => {
    setRenderDeck(prev => {
      const card = prev.find(c => c.name === cardName);
      if (card && card.quantity > qtyToRemove) {
        return prev.map(c => c.name === cardName ? { ...c, quantity: c.quantity - qtyToRemove } : c);
      }
      return prev.filter(c => c.name !== cardName);
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
      // 1. Fetch la carta nueva desde Scryfall para obtener imagen y type_line
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(sug.name)}`);
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
    setRenderDeck(prev => {
      let nextDeck = [...prev];
      // 1. Eliminar baneadas
      nextDeck = nextDeck.filter(c => !BATTLEBOX_VETOS.includes(c.name));
      // 2. Ajustar límite a 4
      nextDeck = nextDeck.map(c => (!isBasicLand(c.name) && c.quantity > BATTLEBOX_RULES.maxCopies) ? { ...c, quantity: BATTLEBOX_RULES.maxCopies } : c);
      
      let count = nextDeck.reduce((sum, c) => sum + (c.quantity || 0), 0);
      
      if (count < 60) {
        // 3. Rellenar con tierras básicas
        const missing = 60 - count;
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
      } else if (count > 60) {
        // 4. Recortar
        let excess = count - 60;
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
    setWarning("⚖️ El Juez ha aplicado heurísticas locales de urgencia: Banlist eliminada y forzado a 60 cartas.");
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
      
      // 2. Determinar si hay un Yorion para ajustar el total de cartas
      const hasYorion = spells.some(s => s.name.toLowerCase().includes("yorion, sky nomad")) || 
                       (lastFormData?.companero && lastFormData.companero.toLowerCase().includes("yorion"));
      const deckSize = hasYorion ? 80 : 60;
      
      // 3. Calcular la cantidad de tierras perfecta
      const targetLandCount = calculatePerfectLandCount(spells, lastFormData, hasYorion);
      const targetSpellsCount = deckSize - targetLandCount;
      
      // Determinar la cantidad de tierras para cuadrar el mazo exacto de deckSize sin alterar hechizos
      let currentSpellsCount = spells.reduce((acc, c) => acc + (c.quantity || 1), 0);
      let finalLandCount = targetLandCount;
      
      const neededLands = deckSize - currentSpellsCount;
      if (neededLands >= 12 && neededLands <= 38) {
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/95 backdrop-blur-3xl"
          >
            <motion.div
              animate={{ scale: [0.98, 1.02, 0.98] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="relative flex flex-col items-center"
            >
              <img src="/ASSETS/invocando.webp" alt="Forjando" className="w-80 h-80 object-contain drop-shadow-[0_0_50px_rgba(255,202,88,0.3)]" />
              <h2 className="text-4xl font-cinzel text-magic-gold tracking-[0.4em] mt-8 animate-pulse">FORJANDO</h2>
              
              {/* Temporizador en vivo */}
              <p className="text-white/40 text-xs font-mono mt-3 tracking-widest">
                ⏱ {Math.floor(elapsedTime / 60).toString().padStart(2, '0')}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </p>

              {forgePhase && (
                <div className="mt-4 flex flex-col items-center gap-3 max-w-md px-4">
                  <p className="text-magic-gold/80 text-sm tracking-wider animate-pulse font-medium text-center">
                    {forgePhase.message}
                  </p>
                  <div className="flex gap-3 mt-2">
                    {['strategist', 'assembler', 'judge', 'hydrate'].map((step, i) => {
                      const phases = ['strategist', 'assembler', 'judge', 'hydrate'];
                      const currentIdx = phases.indexOf(forgePhase.phase);
                      const isDone = forgePhase.phase === 'done' || currentIdx > i;
                      const isActive = forgePhase.phase === step;
                      return (
                        <div key={step} className={`w-3 h-3 rounded-full transition-all duration-500 ${
                          isActive ? 'bg-magic-gold scale-125 shadow-[0_0_12px_rgba(255,202,88,0.6)]' :
                          isDone ? 'bg-green-500/60' :
                          'bg-white/20'
                        }`} />
                      );
                    })}
                  </div>
                  <div className="flex gap-5 text-[9px] uppercase tracking-[0.12em] text-white/30 font-bold mt-1">
                    <span className={forgePhase.phase === 'strategist' ? 'text-magic-gold' : ''}>RAG</span>
                    <span className={forgePhase.phase === 'assembler' ? 'text-magic-gold' : ''}>Gemini</span>
                    <span className={forgePhase.phase === 'judge' ? 'text-magic-gold' : ''}>Juez</span>
                    <span className={forgePhase.phase === 'hydrate' ? 'text-magic-gold' : ''}>Imágenes</span>
                  </div>
                </div>
              )}

              {/* Hint de tiempo estimado */}
              {elapsedTime > 15 && (
                <p className="text-white/25 text-[10px] mt-4 font-sans">
                  💡 Gemini Free puede tardar 30-60s por llamada
                </p>
              )}
            </motion.div>
          </motion.div>
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
                    <h2 className="text-3xl sm:text-4xl font-cinzel text-magic-gold tracking-wide leading-tight">
                      {aiMetadata?.deckName || 'Mazo Forjado'}
                    </h2>
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
                  <span className="text-magic-gold/60 text-[10px] uppercase tracking-[0.2em] font-bold">
                    {lastFormData?.archetype} • {stats.mainCount} CARTAS
                  </span>
                  {stats.isValid ? (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                      <CheckCircle2 size={12} /> Legal en Modern Casual
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
                  <p className="text-sm font-bold">{stats.mainCount} / 60 requeridas</p>
                </div>
                {!stats.isMainValid && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-[#1a1612] border border-red-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] text-[11px] backdrop-blur-2xl pointer-events-none">
                    <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <AlertTriangle size={12} /> Diferencia detectada:
                    </p>
                    <p className="text-white/80 leading-relaxed">El mazo tiene {stats.mainCount} cartas. Debe tener exactamente 60 para ser legal en Modern Battle Box.</p>
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
                  <p className="text-sm font-bold">{stats.overLimit.length === 0 ? 'Correcto (máx 4)' : 'Exceso detectado'}</p>
                </div>
                {stats.overLimit.length > 0 && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-4 bg-[#1a1612] border border-red-500/40 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[999] text-[11px] backdrop-blur-2xl pointer-events-none">
                    <p className="text-red-400 font-bold mb-2 flex items-center gap-2">
                      <Info size={12} /> Exceso de copias (&gt;4):
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
                  <div className="mb-6 space-y-4">
                    <CardSearch onAddCard={handleAddCard} />
                    
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
                                      onMouseMove={(e) => handleCardHover(e, sug.name)}
                                      onMouseLeave={handleCardLeave}
                                    >
                                      <Sparkles size={12}/> +{sug.quantity || 1} {sug.name}
                                    </span>
                                    {sug.cut && (
                                      <span 
                                        className="font-bold text-red-400/80 text-sm flex items-center gap-1 cursor-pointer hover:underline"
                                        onMouseMove={(e) => handleCardHover(e, sug.cut)}
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
                />
                
                {/* Matriz de Probabilidades de Frank Karsten */}
                <KarstenMatrix deck={renderDeck} validationEngine={aiMetadata?.validationEngine} validationData={aiMetadata?.validationData} chosenColors={lastFormData?.colores || []} />
                
                {/* Simulación del Turno de Oro */}
                <TurnoDeOroSim deck={renderDeck} />
                
                {/* Sideboard Section */}
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
                        {stats.sideCount} / 15 cartas
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

                {/* Guía Táctica Interactiva de Banquillo */}
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            {/* Cards IN */}
                            <div className="bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm">
                              <h5 className="font-cinzel text-sm text-green-400 font-bold mb-4 flex items-center gap-2 drop-shadow-md">
                                <PlusCircle size={16} className="animate-pulse" /> ENTRAN (IN)
                              </h5>
                              {activeMatchup.cardsIn.length === 0 ? (
                                <p className="text-xs text-gray-400 italic bg-black/30 p-2 rounded">No se requieren cambios específicos.</p>
                              ) : (
                                <div className="space-y-3">
                                  {activeMatchup.cardsIn.map((c, i) => (
                                    <div 
                                      key={i}
                                      onMouseEnter={(e) => handleCardHover(e, c.name)}
                                      onMouseLeave={handleCardLeave}
                                      className="group flex items-center justify-between text-sm bg-black/60 px-4 py-3 rounded-lg border border-green-500/20 hover:border-green-400 hover:bg-green-500/10 transition-all cursor-help shadow-md"
                                    >
                                      <span className="text-gray-100 font-semibold group-hover:text-green-300 transition-colors">{c.name}</span>
                                      <span className="text-green-400 font-bold bg-green-500/20 px-3 py-1 rounded-md border border-green-500/40 shadow-inner">
                                        +{c.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Cards OUT */}
                            <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/30 rounded-xl p-5 shadow-lg backdrop-blur-sm">
                              <h5 className="font-cinzel text-sm text-red-400 font-bold mb-4 flex items-center gap-2 drop-shadow-md">
                                <MinusCircle size={16} /> SALEN (OUT)
                              </h5>
                              {activeMatchup.cardsOut.length === 0 ? (
                                <p className="text-xs text-gray-400 italic bg-black/30 p-2 rounded">No se requieren cambios específicos.</p>
                              ) : (
                                <div className="space-y-3">
                                  {activeMatchup.cardsOut.map((c, i) => (
                                    <div 
                                      key={i}
                                      onMouseEnter={(e) => handleCardHover(e, c.name)}
                                      onMouseLeave={handleCardLeave}
                                      className="group flex items-center justify-between text-sm bg-black/60 px-4 py-3 rounded-lg border border-red-500/20 hover:border-red-400 hover:bg-red-500/10 transition-all cursor-help shadow-md"
                                    >
                                      <span className="text-gray-400 font-semibold line-through group-hover:text-red-300 transition-colors">{c.name}</span>
                                      <span className="text-red-400 font-bold bg-red-500/20 px-3 py-1 rounded-md border border-red-500/40 shadow-inner">
                                        -{c.quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="space-y-6 font-sans">
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
                  <RadarChart data={{
                    Velocidad: 8, Control: 7, Poder: 8, Complejidad: 7, Resiliencia: 6
                  }} />
                </div>
                <ManaCurve deck={renderDeck} archetype={aiMetadata?.archetype} />

                {(aiMetadata || pocketGuide) && (
                  <div className="parchment-scroll p-8 shadow-2xl">
                    <h4 className="font-cinzel text-[#4a3318] text-lg mb-4 flex items-center gap-2 border-b border-[#4a3318]/20 pb-2">
                      <Scroll size={24} /> Guía del Maestro
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-1">Estrategia</p>
                        <p className="text-sm text-[#4a3318] leading-relaxed italic">
                          "{pocketGuide?.plan || aiMetadata?.strategy}"
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-1">Mulligan</p>
                        <p className="text-sm text-[#4a3318] leading-relaxed">
                          {pocketGuide?.mulligan || aiMetadata?.mulligan}
                        </p>
                      </div>

                      {sideboardStrategy && (
                        <div className="pt-4 border-t border-[#4a3318]/10">
                          <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-1 flex items-center gap-1">
                            <Shield size={10} /> Estrategia de Banquillo
                          </p>
                          <p className="text-xs text-[#4a3318] leading-relaxed italic">
                            "{sideboardStrategy}"
                          </p>
                        </div>
                      )}

                      {aiMetadata?.recommendations && aiMetadata.recommendations.length > 0 && (
                        <div className="pt-4 border-t border-[#4a3318]/10">
                          <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-3 flex items-center gap-1">
                            <Sparkles size={10} /> Recomendaciones de Expertos
                          </p>
                          <div className="space-y-3">
                            {aiMetadata.recommendations.map((rec, i) => (
                              <div key={i} className="group">
                                <p className="text-xs font-bold text-[#4a3318] flex items-center gap-2 mb-0.5">
                                  <span className="w-4 h-4 rounded-full bg-[#4a3318]/10 flex items-center justify-center text-[9px] group-hover:bg-[#4a3318]/20 transition-colors">
                                    {i + 1}
                                  </span>
                                  {rec.title}
                                </p>
                                <p className="text-[11px] text-[#4a3318]/80 leading-relaxed pl-6 italic">
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
                    className="w-full btn-magic-glass btn-glass-gold py-4 flex items-center justify-center gap-2"
                  >
                    {isGeneratingGuide ? <Zap className="animate-spin" size={16} /> : <PenTool size={16} />}
                    {isGeneratingGuide ? 'Descifrando...' : 'Generar Guía Estratégica'}
                  </button>
                )}
              </div>
            </div>

            <HandSimulator deck={renderDeck} isOpen={showHandSim} onClose={() => setShowHandSim(false)} aiConfig={aiConfig} />
            <SynergyGraphVisualizer deck={renderDeck} isOpen={showRagGraph} onClose={() => setShowRagGraph(false)} archetype={aiMetadata?.archetype || lastFormData?.archetype} colors={lastFormData?.colores} />
            <DeckVisualExporter deck={renderDeck} sideboard={renderSideboard} isOpen={showVisualGrid} onClose={() => setShowVisualGrid(false)} deckName={aiMetadata?.deckName || 'Mazo Forjado'} archetype={aiMetadata?.archetype || lastFormData?.archetype} colors={lastFormData?.colores} formData={lastFormData} onOptimize={handleOptimizeDeck} />
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
        {hoveredCard && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed z-[999] pointer-events-none rounded-xl overflow-hidden shadow-2xl border border-[#D4AF37]/40 bg-black/80 backdrop-blur-md"
            style={{ 
              left: hoverPos.x + 20, 
              top: Math.min(hoverPos.y - 150, window.innerHeight - 360) 
            }}
          >
            <img 
              src={`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(hoveredCard)}&format=image`}
              alt={hoveredCard}
              className="w-[240px] h-auto rounded-xl shadow-2xl"
              onError={(e) => e.target.style.display = 'none'}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}