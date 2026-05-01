import { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import VisualGrid from '../components/battlebox/VisualGrid';
import { cn } from '../utils/cn';
import { rebalanceDecks, generateDeckTactics } from '../services/aiFactory';
import { getArchivedDecks, updateArchivedDeck } from '../services/archiveService';
import { hydrateCard } from '../services/cardHydrator';
import { motion, AnimatePresence } from 'framer-motion';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import RadarChart from '../components/forge/RadarChart';
import HandSimulator from '../components/forge/HandSimulator';
import CardSearch from '../components/forge/CardSearch';
import ManaCurve from '../components/forge/ManaCurve';

const AI_STORAGE_KEY = 'mtg_ai_config_forge';

const MANA_COLORS = { W: '#f9faf4', U: '#0e68ab', B: '#150b00', R: '#d3202a', G: '#00733e' };

function ManaOrb({ color }) {
  const bg = MANA_COLORS[color] || '#888';
  return <div className="w-5 h-5 rounded-full border-2 border-amber-400/40 shadow-lg shadow-amber-900/30" style={{ background: `radial-gradient(circle at 35% 35%, ${bg}dd, ${bg}88)` }} />;
}

// Se eliminó la función interna ManaCurve para usar el componente profesional importado

function PocketGuideCard({ deck }) {
  const totalCards = deck.cards?.reduce((s, c) => s + (c.quantity || 1), 0) || 60;
  const { activeDeck, setActiveDeck } = useAppStore();
  const [generating, setGenerating] = useState(false);

  const handleInfuseInGuide = async () => {
    setGenerating(true);
    try {
      const config = JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '{}');
      const tactics = await generateDeckTactics(deck, config);
      updateArchivedDeck(deck.id, tactics);
      if (activeDeck?.id === deck.id) {
        setActiveDeck({ ...activeDeck, ...tactics });
      }
    } catch (e) {
      alert("Error Oráculo: " + e.message);
    } finally {
      setGenerating(false);
    }
  };

  // Color principal para el borde dinámico
  const mainColor = MANA_COLORS[deck.colors?.[0]] || '#c19b45';

  return (
    <div 
      className="w-[340px] min-h-[520px] bg-[#080b1a] border border-[#c19b45]/30 rounded-xl p-0 flex flex-col shadow-2xl relative overflow-hidden group"
      style={{ boxShadow: `inset 0 0 40px rgba(0,0,0,0.8), 0 0 30px ${mainColor}15` }}
    >
      {/* Acento lateral de color */}
      <div className="absolute top-0 left-0 w-1 h-full opacity-60" style={{ backgroundColor: mainColor }} />
      
      {/* Header Premium V3 */}
      <div className="p-5 pb-3 border-b border-[#c19b45]/10 bg-gradient-to-b from-white/5 to-transparent relative">
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-0.5">{deck.colors?.map(c => <ManaOrb key={c} color={c} />)}</div>
          <div className="flex items-center gap-3">
            <span className="text-[9px] font-cinzel text-[#c19b45]/60 tracking-[0.2em]">{deck.archetype}</span>
            {deck.strategy && !generating && (
              <button 
                onClick={handleInfuseInGuide}
                className="p-1.5 bg-white/5 hover:bg-grimorio-gold/20 rounded border border-white/10 text-[10px] text-grimorio-gold transition-all"
                title="Reinfundir Sabiduría"
              >
                🔄
              </button>
            )}
          </div>
        </div>
        <h3 className="text-xl font-cinzel text-[#c19b45] font-bold tracking-wider leading-tight drop-shadow-lg">{deck.name}</h3>
      </div>

      {!deck.strategy && !generating ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 bg-[#c19b45]/5 rounded-full flex items-center justify-center mb-4 border border-[#c19b45]/20">
            <span className="text-2xl">🔮</span>
          </div>
          <p className="text-[#c19b45]/60 text-sm italic mb-8 px-4">Esta guía táctica aún no ha sido redactada por el Oráculo.</p>
          <button 
            onClick={handleInfuseInGuide}
            className="w-full py-4 bg-gradient-to-r from-[#c19b45]/10 to-[#c19b45]/20 border border-[#c19b45]/40 text-[#c19b45] rounded-lg hover:from-[#c19b45] hover:text-[#0b1026] transition-all font-bold uppercase tracking-[0.2em] text-[10px]"
          >
            Infundir Sabiduría
          </button>
        </div>
      ) : generating ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-10 h-10 border-2 border-[#c19b45]/20 border-t-[#c19b45] rounded-full animate-spin mb-4" />
          <p className="text-[#c19b45] text-[10px] font-cinzel tracking-widest animate-pulse">TRANSCRIBIENDO TÁCTICAS...</p>
        </div>
      ) : (
        <div className="flex-1 p-5 pt-4 space-y-5 overflow-y-auto custom-scrollbar">
          <Section icon="⚔️" title="PLAN DE ATAQUE">
            <p className="text-white/80 text-[12px] leading-relaxed font-serif">{deck.strategy}</p>
          </Section>
          
          <div className="grid grid-cols-2 gap-4">
            <Section icon="🏆" title="VICTORIA">
              <p className="text-white/70 text-[11px] leading-tight italic">{deck.condicion_victoria}</p>
            </Section>
            <Section icon="🃏" title="MULLIGAN">
              <p className="text-sky-300/70 text-[11px] leading-tight italic">{deck.mulligan || 'Curva ideal.'}</p>
            </Section>
          </div>

          {/* Turnos Dinámicos - Sin Scroll */}
          {(deck.turn_by_turn || deck.early_game) && (
            <Section icon="⏳" title="MANUAL DE APERTURA">
              <div className="space-y-1 bg-white/5 p-2 rounded-lg border border-white/5">
                {deck.turn_by_turn ? (
                  deck.turn_by_turn.map((step, idx) => (
                    <div key={idx} className="flex gap-2 text-[10px] leading-tight">
                      <span className="text-[#c19b45] font-bold min-w-[25px] shrink-0">T-{step.t}:</span>
                      <span className="text-white/80">{step.desc}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex gap-2 text-[10px]"><span className="text-[#c19b45] font-bold min-w-[25px]">T-1:</span><span className="text-white/80">{deck.early_game.t1}</span></div>
                    <div className="flex gap-2 text-[10px]"><span className="text-[#c19b45] font-bold min-w-[25px]">T-2:</span><span className="text-white/80">{deck.early_game.t2}</span></div>
                    <div className="flex gap-2 text-[10px]"><span className="text-[#c19b45] font-bold min-w-[25px]">T-3:</span><span className="text-white/80">{deck.early_game.t3}</span></div>
                  </>
                )}
              </div>
            </Section>
          )}

          <Section icon="💡" title="SINERGIAS CLAVE">
            <p className="text-white/70 text-[10px] leading-tight border-l-2 border-[#c19b45]/20 pl-3 italic line-clamp-3">{deck.sinergias_clave}</p>
          </Section>
        </div>
      )}

      {/* Footer Técnico con Mini-Curva */}
      <div className="p-4 bg-black/40 border-t border-[#c19b45]/10 mt-auto">
        <div className="flex justify-between items-center mb-3 text-[9px] font-cinzel text-[#c19b45]/40 tracking-widest">
          <span>CURVA DE MANÁ</span>
          <span>{totalCards} CARTAS</span>
        </div>
        <div className="bg-black/40 rounded-lg border border-white/5">
          <ManaCurve deck={deck.cards} compact={true} />
        </div>
        <div className="mt-3 flex justify-center opacity-10">
          <span className="text-2xl text-[#c19b45] font-serif">Ω</span>
        </div>
      </div>
    </div>
  );
}



function Section({ icon, title, children }) {
  return (
    <div className="relative z-10">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm">{icon}</span>
        <span className="text-[11px] text-[#c19b45] uppercase font-cinzel tracking-[0.15em] font-bold">{title}</span>
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GUIDE OVERLAY — muestra las guías en pantalla
   ══════════════════════════════════════════════ */
function GuideOverlay({ decks, onClose }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md overflow-y-auto">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-[#c19b45]/20 px-8 py-4 flex justify-between items-center print:hidden">
        <h2 className="font-cinzel text-[#c19b45] text-xl">📜 Guías de Bolsillo</h2>
        <div className="flex gap-3">
          <button onClick={() => window.print()} className="px-5 py-2 bg-[#c19b45] text-[#0b1026] font-bold rounded-lg text-sm hover:bg-[#d4af5a] transition-colors">🖨️ Imprimir Todas</button>
          <button onClick={onClose} className="px-4 py-2 bg-white/10 text-white rounded-lg text-sm hover:bg-white/20 transition-colors">✕ Cerrar</button>
        </div>
      </div>
      {/* Vista en pantalla */}
      <div className="print:hidden flex flex-wrap justify-center gap-8 p-10">
        {decks.map(d => <PocketGuideCard key={d.id} deck={d} />)}
      </div>
      {/* Vista de impresión: tamaño funda 63×88mm, optimizada para 1 página A4 */}
      <div className="hidden print:block bg-white min-h-screen">
        <style>{`
          @media print {
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              background: white !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-container {
              display: grid;
              grid-template-cols: repeat(2, 63mm);
              gap: 4mm 10mm;
              justify-content: center;
              padding: 0 !important;
              margin: 0 !important;
            }
            .guide-card-print {
              width: 63mm;
              height: auto;
              min-height: 88mm;
              background-color: #fcfaf2 !important;
              color: #1a1a1a !important;
              border: 0.8mm solid #c19b45 !important;
              border-radius: 2mm;
              padding: 5mm;
              display: flex;
              flex-direction: column;
              position: relative;
              overflow: hidden;
              box-sizing: border-box;
              page-break-inside: avoid;
              margin-bottom: 5mm;
              box-shadow: none !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        
        <div className="print-container">
          {decks.map(d => (
            <div key={d.id} className="guide-card-print">
              {/* Header Imprimible */}
              <div className="flex justify-between items-center border-b border-[#c19b45]/60 pb-[1mm] mb-[2mm]">
                <div className="font-cinzel text-[#92732c] font-bold text-[9px] uppercase truncate max-w-[45mm]">{d.name}</div>
                <div className="text-[#92732c]/80 text-[6px] font-cinzel font-bold">{d.archetype}</div>
              </div>

              {/* Contenido Imprimible */}
              <div className="flex-1 space-y-[2.5mm]">
                {/* 1. Apertura (Siempre visible si existe) */}
                {(d.turn_by_turn || d.early_game) && (
                  <div className="bg-black/5 p-[1.5mm] rounded border border-black/5">
                    <span className="text-[#92732c] font-cinzel font-bold uppercase text-[6px] block mb-[1mm]">⏳ Manual de Apertura</span>
                    <div className="space-y-[0.8mm] text-black/90 text-[6.5px]">
                      {d.turn_by_turn ? (
                        d.turn_by_turn.map((step, idx) => (
                          <div key={idx} className="flex gap-[1mm] leading-tight">
                            <span className="text-[#92732c] font-bold shrink-0">T-{step.t}:</span> 
                            <span className="font-medium">{step.desc}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex gap-[1mm] leading-tight"><span className="text-[#92732c] font-bold shrink-0">T-1:</span> <span className="font-medium">{d.early_game.t1}</span></div>
                          <div className="flex gap-[1mm] leading-tight"><span className="text-[#92732c] font-bold shrink-0">T-2:</span> <span className="font-medium">{d.early_game.t2}</span></div>
                          <div className="flex gap-[1mm] leading-tight"><span className="text-[#92732c] font-bold shrink-0">T-3:</span> <span className="font-medium">{d.early_game.t3}</span></div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. Plan de Ataque */}
                {d.strategy && (
                  <div className="space-y-[0.5mm]">
                    <span className="text-[#92732c] font-cinzel font-bold uppercase text-[6px] block">⚔️ Plan de Ataque</span>
                    <p className="text-black/80 text-[7px] leading-tight font-serif">{d.strategy}</p>
                  </div>
                )}

                {/* 3. Victoria & Mulligan (Grid 2 col) */}
                <div className="grid grid-cols-2 gap-[3mm]">
                  {d.condicion_victoria && (
                    <div className="space-y-[0.5mm]">
                      <span className="text-[#92732c] font-cinzel font-bold uppercase text-[5.5px] block">🏆 Victoria</span>
                      <p className="text-black/80 text-[6.5px] leading-tight italic">{d.condicion_victoria}</p>
                    </div>
                  )}
                  {(d.mulligan || true) && (
                    <div className="space-y-[0.5mm]">
                      <span className="text-[#92732c] font-cinzel font-bold uppercase text-[5.5px] block">🃏 Mulligan</span>
                      <p className="text-[#3b82f6]/80 text-[6.5px] leading-tight italic">{d.mulligan || 'Curva ideal.'}</p>
                    </div>
                  )}
                </div>

                {/* 4. Sinergias */}
                {d.sinergias_clave && (
                  <div className="space-y-[0.5mm]">
                    <span className="text-[#92732c] font-cinzel font-bold uppercase text-[6px] block">💡 Sinergias Clave</span>
                    <p className="text-black/80 text-[6.5px] leading-tight italic border-l border-[#c19b45]/30 pl-[1.5mm]">{d.sinergias_clave}</p>
                  </div>
                )}
              </div>

              {/* Footer Imprimible */}
              <div className="mt-auto pt-[2mm] border-t border-[#c19b45]/30">
                <div className="flex justify-between items-center mb-[2mm]">
                  <span className="text-[5.5px] font-cinzel text-[#92732c]/60 tracking-widest">ESTADÍSTICAS DEL MAZO</span>
                  <div className="flex gap-1">
                    {d.colors?.map(c => (
                      <div key={c} className="w-[2mm] h-[2mm] rounded-full border-[0.1mm] border-black/10" style={{ backgroundColor: MANA_COLORS[c] }} />
                    ))}
                  </div>
                </div>
                <div className="bg-black/5 rounded-[0.5mm] py-[1mm]">
                  <ManaCurve deck={d.cards} compact={true} isPrint={true} />
                </div>
                <div className="text-center mt-[1mm] opacity-20 text-[5px] font-cinzel tracking-[0.5em]">
                  ARCANE ARCHITECT
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════
   COMPONENTE PRINCIPAL — BattleBox
   ══════════════════════════════════ */
export default function BattleBox() {
  const { activeDeck, selectedDecks, clearSelection, setActiveDeck } = useAppStore();
  const [balancing, setBalancing] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [applying, setApplying] = useState(false);
  const [generatingTactics, setGeneratingTactics] = useState(false);
  const [showAIConfig, setShowAIConfig] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showHandSim, setShowHandSim] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);


  const archivedDecks = getArchivedDecks();
  const decksToPrint = selectedDecks.length >= 2
    ? archivedDecks.filter(d => selectedDecks.includes(d.id))
    : activeDeck ? [activeDeck] : [];

  useEffect(() => {
    const fixDeckData = async () => {
      if (activeDeck && activeDeck.cards?.length > 0) {
        // Buscamos si falta información CRÍTICA (imágenes o costes en hechizos)
        const needsHydration = activeDeck.cards.some(c => 
          (c.mana_value === undefined || !c.image_uris?.normal) && 
          !c.type_line?.toLowerCase().includes('land')
        );
        
        if (needsHydration) {
          console.log(`🛠️ Reparando datos técnicos para: ${activeDeck.name}`);
          const hydratedCards = await hydrateDeckCards(activeDeck.cards);
          
          // Solo actualizamos si realmente han cambiado las cartas (evitar bucles)
          const updatedDeck = { ...activeDeck, cards: hydratedCards };
          updateArchivedDeck(activeDeck.id, { cards: hydratedCards });
          setActiveDeck(updatedDeck);
        }
      }
    };
    fixDeckData();
  }, [activeDeck?.id]);

  const handleGenerateTactics = async () => {

    if (!activeDeck) return;
    setGeneratingTactics(true);
    try {
      const config = JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '{}');
      const tactics = await generateDeckTactics(activeDeck, config);
      const updatedDeck = { ...activeDeck, ...tactics };
      updateArchivedDeck(activeDeck.id, tactics);
      setActiveDeck(updatedDeck);
    } catch (error) {
      alert('Error al generar táctica: ' + error.message);
    } finally {
      setGeneratingTactics(false);
    }
  };

  const handleAddCard = async (scryfallCard) => {
    if (!activeDeck) return;
    const newCard = await hydrateCard({ name: scryfallCard.name, quantity: 1 });
    
    const updatedCards = [...activeDeck.cards];
    const existingIdx = updatedCards.findIndex(c => c.name === newCard.name);
    if (existingIdx !== -1) {
      updatedCards[existingIdx].quantity += 1;
    } else {
      updatedCards.push(newCard);
    }

    const updatedDeck = { ...activeDeck, cards: updatedCards };
    updateArchivedDeck(activeDeck.id, { cards: updatedCards });
    setActiveDeck(updatedDeck);
  };

  const handleRemoveCard = (cardName) => {
    if (!activeDeck) return;
    const updatedCards = activeDeck.cards
      .map(c => c.name === cardName ? { ...c, quantity: c.quantity - 1 } : c)
      .filter(c => c.quantity > 0);

    const updatedDeck = { ...activeDeck, cards: updatedCards };
    updateArchivedDeck(activeDeck.id, { cards: updatedCards });
    setActiveDeck(updatedDeck);
  };

  const sanitizeJSON = (raw) => {
    let s = raw;
    // 1. Quitar comentarios de bloque /* ... */
    s = s.replace(/\/\*[\s\S]*?\*\//g, '');
    // 2. Quitar comentarios de línea // ... (pero NO dentro de strings)
    //    Estrategia: reemplazar // solo si no está dentro de comillas
    s = s.replace(/^([^"]*?)\/\/.*$/gm, '$1');
    // 3. También limpiar // que vienen después de un valor JSON  
    s = s.replace(/,\s*\/\/[^\n]*/g, ',');
    s = s.replace(/(["\d\]}\w])\s*\/\/[^\n]*/g, '$1');
    // 4. Quitar trailing commas antes de } o ]
    s = s.replace(/,\s*([}\]])/g, '$1');
    // 5. Quitar caracteres de control y BOM
    s = s.replace(/[\x00-\x09\x0B\x0C\x0E-\x1F]/g, '');
    return s;
  };

  const tryParseJSON = (raw) => {
    // Primero intentar tal cual
    try { return JSON.parse(raw); } catch {}
    // Luego limpiar y reintentar
    const clean = sanitizeJSON(raw);
    try { return JSON.parse(clean); } catch {}
    return null;
  };

  const parseBalancerResponse = (text) => {
    console.log('📋 Respuesta cruda del balanceador (primeros 500 chars):', text.substring(0, 500));
    
    // Intento 1: JSON dentro de bloque ```json
    const jsonBlock = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
    if (jsonBlock) {
      const parsed = tryParseJSON(jsonBlock[1]);
      if (parsed) {
        console.log('✅ Parseado desde bloque JSON');
        return { analysis: parsed.analysis || '', adjustments: parsed.adjustments || [] };
      }
    }
    
    // Intento 2: Buscar el objeto JSON más externo en el texto
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const candidate = text.substring(firstBrace, lastBrace + 1);
      const parsed = tryParseJSON(candidate);
      if (parsed) {
        console.log('✅ Parseado desde JSON directo (limpio)');
        return { analysis: parsed.analysis || '', adjustments: parsed.adjustments || [] };
      }
    }
    
    // Intento 3: Buscar el campo "adjustments" manualmente con regex
    const adjMatch = text.match(/"adjustments"\s*:\s*\[([\s\S]*?)\]\s*}/);
    if (adjMatch) {
      try {
        const fakeJSON = `{"adjustments":[${sanitizeJSON(adjMatch[1])}]}`;
        const parsed = JSON.parse(fakeJSON);
        // Extraer el analysis del texto antes del adjustments
        const analysisEnd = text.indexOf('"adjustments"');
        let analysis = '';
        const analMatch = text.match(/"analysis"\s*:\s*"([\s\S]*?)"\s*,?\s*"adjustments"/);
        if (analMatch) analysis = analMatch[1].replace(/\\n/g, '\n');
        console.log('✅ Parseado parcial (adjustments extraídos)');
        return { analysis, adjustments: parsed.adjustments || [] };
      } catch (e) { console.warn('⚠️ Extracción parcial falló:', e.message); }
    }
    
    // Fallback: devolver el texto completo como análisis
    console.warn('❌ No se pudo parsear JSON, usando texto plano');
    return { analysis: text, adjustments: [] };
  };

  // ── MODO EQUILIBRADO ──
  if (selectedDecks.length >= 2) {
    const decksToBalance = archivedDecks.filter(d => selectedDecks.includes(d.id));

    const handleExportMegaprompt = () => {
      let prompt = "OBJECTIVE: CALIBRATE AND BALANCE THE FOLLOWING MTG LEGACY DECKS\n\n";
      prompt += "CONTEXT: These decks belong to a Battle Box project designed for high-fidelity Legacy play. The goal is to ensure a balanced meta where each deck has clear win conditions and technical complexity while maintaining a cohesive power level.\n\n";
      
      decksToBalance.forEach((deck, idx) => {
        prompt += `--- DECK ${idx + 1}: ${deck.name} ---\n`;
        prompt += `ARCHETYPE: ${deck.archetype}\n`;
        prompt += `COLORS: ${deck.colors?.join(', ')}\n`;
        prompt += `STRATEGY: ${deck.strategy || 'N/A'}\n`;
        prompt += `WIN CONDITION: ${deck.condicion_victoria || 'N/A'}\n`;
        prompt += `SYNERGIES: ${deck.sinergias_clave || 'N/A'}\n`;
        prompt += `CARD LIST:\n`;
        deck.cards.forEach(c => {
          prompt += `${c.quantity}x ${c.name}\n`;
        });
        prompt += `\n`;
      });
      
      prompt += "INSTRUCTIONS FOR AI:\n";
      prompt += "1. Analyze the power balance between these decks.\n";
      prompt += "2. Identify any deck that might be too oppressive or too weak in this specific group.\n";
      prompt += "3. Suggest exact card swaps (REMOVE/ADD) to improve internal balance while preserving archetype identity.\n";
      prompt += "4. Format your response strictly as a JSON object with this structure:\n";
      prompt += "{\n  \"analysis\": \"Your text analysis here\",\n  \"adjustments\": [\n    {\n      \"deckName\": \"Deck Name\",\n      \"reason\": \"Brief reason\",\n      \"swaps\": [{ \"remove\": \"Card Name\", \"add\": \"Card Name\", \"quantity\": 1, \"justification\": \"Why?\" }]\n    }\n  ]\n}\n";
      
      navigator.clipboard.writeText(prompt);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleRunBalance = async () => {

      setBalancing(true);
      try {
        const config = JSON.parse(localStorage.getItem(AI_STORAGE_KEY) || '{}');
        const result = await rebalanceDecks(decksToBalance, config);
        setBalanceData(parseBalancerResponse(result));
      } catch (error) { alert('Error al equilibrar: ' + error.message); }
      finally { setBalancing(false); }
    };

    const handleApplyAdjustments = async () => {
      setApplying(true);
      const results = { applied: [], skipped: [], errors: [] };
      
      try {
        // Función de normalización: solo letras y números, sin puntuación ni guiones raros
        const normalize = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        
        for (const adj of balanceData.adjustments) {
          const aiName = adj.deckName || '';
          const aiNorm = normalize(aiName);
          
          // Búsqueda en 4 fases, de más precisa a más flexible
          let deck = 
            // 1. Exacta
            decksToBalance.find(d => d.name.toLowerCase() === aiName.toLowerCase()) ||
            // 2. Includes bidireccional
            decksToBalance.find(d => 
              d.name.toLowerCase().includes(aiName.toLowerCase()) ||
              aiName.toLowerCase().includes(d.name.toLowerCase())
            ) ||
            // 3. Normalizada (sin puntuación, guiones, espacios)
            decksToBalance.find(d => normalize(d.name) === aiNorm) ||
            // 4. Overlap de palabras (si comparten >50% de las palabras)
            decksToBalance.find(d => {
              const deckWords = d.name.toLowerCase().split(/\s+/);
              const aiWords = aiName.toLowerCase().split(/\s+/);
              const common = deckWords.filter(w => aiWords.some(aw => aw.includes(w) || w.includes(aw)));
              return common.length >= Math.min(deckWords.length, aiWords.length) * 0.5;
            });
          
          if (!deck) {
            console.warn(`⚠️ Mazo no encontrado: "${aiName}" (norm: "${aiNorm}"). Disponibles:`, decksToBalance.map(d => `"${d.name}" (norm: "${normalize(d.name)}")`));
            results.skipped.push(`"${aiName}" — no se encontró en tu colección`);
            continue;
          }
          
          console.log(`🔗 Match: "${aiName}" → "${deck.name}"`)
          
          // Deep clone para no mutar los datos originales
          let updatedCards = deck.cards.map(c => ({ ...c }));
          let swapsApplied = 0;
          
          for (const swap of adj.swaps) {
            try {
              const qty = swap.quantity || 1;
              
              // QUITAR: buscar la carta a eliminar (case-insensitive)
              const removeIdx = updatedCards.findIndex(c => c.name.toLowerCase() === swap.remove.toLowerCase());
              if (removeIdx !== -1) {
                if (updatedCards[removeIdx].quantity > qty) {
                  updatedCards[removeIdx].quantity -= qty;
                } else {
                  updatedCards.splice(removeIdx, 1);
                }
              } else {
                console.warn(`⚠️ Carta "${swap.remove}" no encontrada en ${deck.name}, se añadirá "${swap.add}" de todas formas`);
              }
              
              // AÑADIR: hidratar la nueva carta desde Scryfall
              const newCard = await hydrateCard({ name: swap.add, quantity: qty });
              const existingIdx = updatedCards.findIndex(c => c.name.toLowerCase() === newCard.name.toLowerCase());
              if (existingIdx !== -1) {
                updatedCards[existingIdx].quantity += qty;
              } else {
                updatedCards.push(newCard);
              }
              swapsApplied++;
            } catch (swapErr) {
              console.error(`❌ Error en swap ${swap.remove} → ${swap.add}:`, swapErr);
              results.errors.push(`${swap.remove} → ${swap.add} (${swapErr.message})`);
            }
          }
          
          updateArchivedDeck(deck.id, { cards: updatedCards });
          results.applied.push(`✅ ${deck.name}: ${swapsApplied} cambio(s) aplicado(s)`);
          console.log(`✅ ${deck.name} actualizado: ${swapsApplied} swaps`);
        }
        
        // Resumen final
        const summary = [
          ...results.applied,
          ...results.skipped.map(s => `⚠️ Omitido: ${s}`),
          ...results.errors.map(e => `❌ Error: ${e}`)
        ].join('\n');
        
        alert(summary || '¡Mazos equilibrados!');
        setBalanceData(null);
        
      } catch (error) { alert('Error crítico: ' + error.message); }
      finally { setApplying(false); }
    };

    return (
      <div className="min-h-screen bg-grimorio-dark text-grimorio-parchment">
        <div className="print:hidden p-8">
          <div className="text-center mb-10 flex flex-col items-center gap-4">
            <h2 className="text-4xl font-cinzel text-grimorio-gold">⚖️ Laboratorio de Equilibrio</h2>
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={() => setShowAIConfig(!showAIConfig)} className={cn("px-4 py-2 border rounded-lg text-xs transition-all", showAIConfig ? "bg-grimorio-gold text-grimorio-dark border-grimorio-gold" : "bg-white/5 border-white/20 text-white")}>⚙️ Configurar Oráculo</button>
              <button onClick={() => setShowGuides(true)} className="px-5 py-2 bg-amber-900/30 border border-[#c19b45]/50 rounded-lg text-[#c19b45] text-xs hover:bg-amber-900/50 transition-all">📜 Guía de Bolsillo</button>
              <button 
                onClick={handleExportMegaprompt} 
                className={cn(
                  "px-5 py-2 border rounded-lg text-xs transition-all flex items-center gap-2",
                  copySuccess ? "bg-green-500/20 border-green-500 text-green-400" : "bg-blue-900/30 border-blue-500/50 text-blue-400 hover:bg-blue-900/50"
                )}
              >
                {copySuccess ? '✅ Prompt Copiado' : '📤 Exportar Megaprompt'}
              </button>
            </div>
          </div>
          {showAIConfig && <div className="mb-10 max-w-4xl mx-auto"><AiConfigPanel storageKey={AI_STORAGE_KEY} /></div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {decksToBalance.map(deck => (
              <div key={deck.id} className="p-4 bg-grimorio-gold/5 border border-grimorio-gold/20 rounded-xl">
                <div className="flex justify-between items-center">
                  <h4 className="text-grimorio-gold font-cinzel">{deck.name}</h4>
                  <div className="flex gap-0.5">{deck.colors?.map(c => <div key={c} className={cn("w-2.5 h-2.5 rounded-full", c==='W'?"bg-white":c==='U'?"bg-blue-500":c==='B'?"bg-gray-800 border border-white/20":c==='R'?"bg-red-500":"bg-green-600")} />)}</div>
                </div>
                <p className="text-[10px] text-grimorio-parchment/40 uppercase mt-1">{deck.archetype}</p>
              </div>
            ))}
          </div>
          {!balanceData && !balancing && <div className="flex justify-center"><button onClick={handleRunBalance} className="px-12 py-5 bg-grimorio-gold text-grimorio-dark font-bold rounded-2xl hover:scale-105 transition-transform shadow-2xl shadow-grimorio-gold/20">⚡ ANALIZAR Y EQUILIBRAR</button></div>}
          {balancing && <div className="py-20 text-center"><div className="inline-block w-16 h-16 border-4 border-grimorio-gold/20 border-t-grimorio-gold rounded-full animate-spin mb-4" /><p className="font-cinzel text-grimorio-gold animate-pulse text-xl">Recalculando meta...</p></div>}
          {balanceData && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              {/* Análisis Narrativo */}
              <div className="p-8 bg-black/60 border-2 border-grimorio-gold/30 rounded-3xl backdrop-blur-xl">
                <h3 className="text-2xl text-grimorio-gold font-cinzel mb-6 flex items-center gap-3">📋 Dictamen del Oráculo</h3>
                <div className="text-grimorio-parchment/90 whitespace-pre-wrap leading-relaxed text-[15px] font-serif">{balanceData.analysis}</div>
              </div>

              {/* Ajustes por Mazo */}
              <div className="p-8 bg-black/60 border-2 border-red-900/30 rounded-3xl backdrop-blur-xl">
                <h3 className="text-2xl text-grimorio-gold font-cinzel mb-6 flex items-center gap-3">🔧 Recalibración de Cartas</h3>
                {(!balanceData.adjustments || balanceData.adjustments.length === 0) ? (
                  <p className="text-green-400 text-center py-4 font-cinzel">✅ Todos los mazos están equilibrados. No se requieren ajustes.</p>
                ) : (
                  <div className="space-y-6">
                    {balanceData.adjustments.map((adj, i) => (
                      <div key={i} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                        <div className="px-5 py-3 bg-grimorio-gold/10 border-b border-grimorio-gold/20">
                          <p className="font-cinzel text-grimorio-gold font-bold">{adj.deckName}</p>
                          {adj.reason && <p className="text-grimorio-parchment/60 text-xs mt-1 italic">{adj.reason}</p>}
                        </div>
                        <div className="p-4 space-y-3">
                          {adj.swaps.map((s, j) => (
                            <div key={j} className="flex items-start gap-3 text-sm">
                              <div className="flex items-center gap-2 min-w-[200px]">
                                <span className="text-red-400 font-mono">-{s.quantity}</span>
                                <span className="text-red-400/80 line-through">{s.remove}</span>
                              </div>
                              <span className="text-grimorio-gold">→</span>
                              <div className="flex items-center gap-2 min-w-[200px]">
                                <span className="text-green-400 font-mono">+{s.quantity}</span>
                                <span className="text-green-400">{s.add}</span>
                              </div>
                              {s.justification && <span className="text-grimorio-parchment/40 text-xs italic ml-2">({s.justification})</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {balanceData.adjustments?.length > 0 && (
                  <div className="flex gap-4 mt-6">
                    <button onClick={handleApplyAdjustments} disabled={applying} className="flex-1 py-4 bg-grimorio-gold text-grimorio-dark font-bold rounded-xl disabled:opacity-50 hover:bg-white transition-colors text-lg">
                      {applying ? <span className="flex items-center justify-center gap-2"><span className="inline-block w-5 h-5 border-2 border-grimorio-dark/30 border-t-grimorio-dark rounded-full animate-spin" /> Aplicando...</span> : '⚡ APLICAR CAMBIOS DE RAÍZ'}
                    </button>
                  </div>
                )}
              </div>

              {/* Botón Nuevo Análisis — SIEMPRE visible */}
              <div className="flex justify-center">
                <button onClick={() => setBalanceData(null)} className="px-10 py-4 bg-white/10 border border-white/20 text-white font-bold rounded-xl hover:bg-white/20 transition-colors text-lg">🔄 Nuevo Análisis</button>
              </div>
            </motion.div>
          )}
          <div className="mt-12 text-center"><button onClick={clearSelection} className="text-grimorio-parchment/20 hover:text-grimorio-parchment/60 text-sm">← Cancelar</button></div>
        </div>
        <AnimatePresence>{showGuides && <GuideOverlay decks={decksToPrint} onClose={() => setShowGuides(false)} />}</AnimatePresence>
      </div>
    );
  }

  // ── MODO VACÍO ──
  if (!activeDeck) {
    return (
      <div className="max-w-4xl mx-auto py-20 text-center">
        <div className="text-6xl mb-6">🗃️</div>
        <h2 className="text-3xl font-cinzel text-grimorio-gold mb-4">Mazo no seleccionado</h2>
        <p className="text-grimorio-parchment/60 mb-8">Selecciona un mazo desde el Archivo.</p>
        <button onClick={() => window.location.hash = 'DeckArchive'} className="px-6 py-3 bg-grimorio-gold/10 border border-grimorio-gold/50 text-grimorio-gold rounded-lg hover:bg-grimorio-gold/20 transition-colors">Ir al Archivo</button>
      </div>
    );
  }

  // ── MODO DETALLE ──
  return (
    <div className="min-h-screen bg-grimorio-dark text-grimorio-parchment">
      <div className="print:hidden p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h2 className="text-5xl font-cinzel text-grimorio-gold">{activeDeck.name}</h2>
              {activeDeck.lore && <p className="text-xl italic text-grimorio-parchment/80 mt-4 max-w-2xl">{activeDeck.lore}</p>}
              <div className="flex gap-3 mt-6 flex-wrap">
                <button onClick={() => setShowGuides(true)} className="px-5 py-2 bg-amber-900/30 border border-[#c19b45]/50 rounded-lg text-[#c19b45] text-sm hover:bg-amber-900/50 transition-all flex items-center gap-2">📜 Guía de Bolsillo</button>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  className={cn(
                    "px-4 py-2 border rounded-lg text-sm transition-all",
                    isEditing ? "bg-red-500/20 border-red-500 text-red-400" : "bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/40"
                  )}
                >
                  {isEditing ? '💾 Guardar Cambios' : '✍️ Editar Mazo'}
                </button>
                <button 
                  onClick={() => setShowHandSim(true)} 
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-lg text-sm hover:bg-purple-500/40 transition-all"
                >
                  🃏 Probar Mano
                </button>
              </div>
            </div>
            <div className="flex gap-1">{activeDeck.colors?.map(c => <ManaOrb key={c} color={c} />)}</div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {isEditing && <CardSearch onAddCard={handleAddCard} />}
              <VisualGrid 
                cards={activeDeck.cards} 
                isEditing={isEditing} 
                onRemoveCard={handleRemoveCard} 
              />
            </div>

            <div className="space-y-6">
              <RadarChart data={(() => {
                if (!activeDeck || !activeDeck.cards) return { Velocidad: 5, Control: 5, Poder: 5, Complejidad: 5, Resiliencia: 5 };
                
                const nonLands = activeDeck.cards.filter(c => !c.type_line?.toLowerCase().includes('land'));
                const totalNonLands = nonLands.reduce((s, c) => s + (c.quantity || 1), 0) || 1;
                const avgCMC = nonLands.reduce((s, c) => s + (c.mana_value || 0) * (c.quantity || 1), 0) / totalNonLands;
                
                const creatures = nonLands.filter(c => c.type_line?.toLowerCase().includes('creature')).reduce((s, c) => s + (c.quantity || 1), 0);
                const spells = nonLands.filter(c => c.type_line?.toLowerCase().includes('instant') || c.type_line?.toLowerCase().includes('sorcery')).reduce((s, c) => s + (c.quantity || 1), 0);
                const permanents = nonLands.filter(c => c.type_line?.toLowerCase().includes('enchantment') || c.type_line?.toLowerCase().includes('artifact')).reduce((s, c) => s + (c.quantity || 1), 0);

                return {
                  Velocidad: Math.max(1, Math.min(10, Math.round(11 - avgCMC * 2))),
                  Control: Math.max(1, Math.min(10, Math.round((spells / totalNonLands) * 15))),
                  Poder: Math.max(1, Math.min(10, Math.round((creatures / totalNonLands) * 10 + (avgCMC > 3 ? 2 : 0)))),
                  Complejidad: Math.max(1, Math.min(10, Math.round((activeDeck.cards.length / 15) * 10))),
                  Resiliencia: Math.max(1, Math.min(10, Math.round((permanents / totalNonLands) * 20 + 3)))
                };
              })()} />
              
              <div className="p-6 bg-black/40 border border-grimorio-gold/20 rounded-xl relative overflow-hidden">
                <h4 className="font-cinzel text-grimorio-gold text-sm mb-6 uppercase tracking-widest">
                  📊 Curva de Maná
                </h4>
                <ManaCurve deck={activeDeck.cards} />
              </div>
            </div>
          </div>

          <HandSimulator 
            deck={activeDeck.cards} 
            isOpen={showHandSim} 
            onClose={() => setShowHandSim(false)} 
          />
        </div>
      </div>
      <AnimatePresence>{showGuides && <GuideOverlay decks={decksToPrint} onClose={() => setShowGuides(false)} />}</AnimatePresence>
    </div>
  );
}