import { useState, useMemo } from 'react';
import { BATTLEBOX_BANLIST, COLORS, BATTLEBOX_RULES } from '../constants/legacyBattleBox';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import ForgeForm from '../components/forge/ForgeForm';
import ManaOrb from '../components/atoms/ManaOrb';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import VisualGrid from '../components/battlebox/VisualGrid';
import { hydrateDeckCards } from '../services/cardHydrator';
import { forgeMazo, callAI } from '../services/aiFactory';
import { archiveDeck, archiveDeckOnline } from '../services/archiveService';
import CardSearch from '../components/forge/CardSearch';
import HandSimulator from '../components/forge/HandSimulator';
import RadarChart from '../components/forge/RadarChart';
import ManaCurve from '../components/forge/ManaCurve';
import { AlertTriangle, Shield, Lightbulb, Target, Scroll, PenTool, CheckCircle2, XCircle, Info, Zap } from 'lucide-react';

const FORGE_STORAGE_KEY = 'mtg_ai_config_forge';

// Helper para detectar tierras básicas
const isBasicLand = (name) => ['Plains', 'Island', 'Swamp', 'Mountain', 'Forest', 'Wastes'].includes(name) || name.startsWith('Snow-Covered');

export default function DeckForge() {
  const [mode, setMode] = useState('form');
  const [loading, setLoading] = useState(false);
  const [lastFormData, setLastFormData] = useState(null);
  const [aiConfig, setAiConfig] = useState(() => {
    const saved = localStorage.getItem(FORGE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
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

  // --- LÓGICA DE VALIDACIÓN DE REGLAS ---
  const stats = useMemo(() => {
    const mainCount = renderDeck.reduce((sum, c) => sum + c.quantity, 0);
    const sideCount = renderSideboard.reduce((sum, c) => sum + c.quantity, 0);
    const bannedInDeck = [...renderDeck, ...renderSideboard].filter(c => BATTLEBOX_BANLIST.includes(c.name));
    const overLimit = [...renderDeck, ...renderSideboard].filter(c => !isBasicLand(c.name) && c.quantity > BATTLEBOX_RULES.maxCopies);
    
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

  const handleArchive = async () => {
    if (!renderDeck.length) return;
    
    const deckToArchive = {
      id: Date.now().toString(),
      name: aiMetadata?.deckName || 'Mazo Sin Nombre',
      archetype: aiMetadata?.archetype || lastFormData?.archetype,
      colors: lastFormData?.colores,
      format: 'Legacy Battle Box (Casual)',
      lore: aiMetadata?.lore,
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
    
    const deckToArchive = {
      id: Date.now().toString(),
      name: aiMetadata?.deckName || 'Mazo Sin Nombre',
      archetype: aiMetadata?.archetype || lastFormData?.archetype,
      colors: lastFormData?.colores,
      format: 'Legacy Battle Box (Casual)',
      lore: aiMetadata?.lore,
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

  const handleSubmit = async (formData) => {
    if (!aiConfig?.selectedModel) {
      setError('Selecciona un modelo de IA primero');
      return;
    }

    setLastFormData(formData);
    setLoading(true);
    setError(null);
    setWarning(null);
    
    try {
      console.log('🔥 Forjando mazo Legacy Battle Box...');
      
      const aiResult = await forgeMazo(formData, aiConfig);
      
      if (!aiResult.cards || aiResult.cards.length === 0) {
        throw new Error('La IA no devolvió cartas válidas. Intenta de nuevo.');
      }
      
      setAiMetadata(aiResult);
      
      const hydratedDeck = await hydrateDeckCards(aiResult.cards);
      const hydratedSideboard = aiResult.sideboard ? await hydrateDeckCards(aiResult.sideboard) : [];
      
      // Auto-Corrección Matemática Final
      let finalDeck = [...hydratedDeck];
      let currentCount = finalDeck.reduce((sum, c) => sum + c.quantity, 0);
      
      if (currentCount !== 60) {
        if (currentCount > 60) {
          let excess = currentCount - 60;
          let landsDesc = finalDeck.map((c, i) => ({...c, originalIndex: i})).filter(c => c.category === 'Land').sort((a, b) => b.quantity - a.quantity);
          for (let land of landsDesc) {
            if (excess > 0 && land.quantity > 1) {
              const toRemove = Math.min(land.quantity - 1, excess);
              finalDeck[land.originalIndex].quantity -= toRemove;
              excess -= toRemove;
            }
          }
        } else if (currentCount < 60) {
          const missing = 60 - currentCount;
          const lands = finalDeck.filter(c => c.category === 'Land').sort((a, b) => b.quantity - a.quantity);
          if (lands.length > 0) {
            const index = finalDeck.findIndex(c => c.name === lands[0].name);
            finalDeck[index].quantity += missing;
          }
        }
      }
      
      setRenderDeck(finalDeck);
      setRenderSideboard(hydratedSideboard); 
      setSideboardStrategy(aiResult.sideboard_strategy || '');
      setMode('deck');
    } catch (err) {
      console.error('❌ Error forjando:', err);
      setError(err.message || 'Error en la conexión con el Oráculo');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (scryfallCard) => {
    const cardName = scryfallCard.name;
    
    // Bloqueo de Banlist
    if (BATTLEBOX_BANLIST.includes(cardName)) {
      setWarning(`⚠️ La carta "${cardName}" está PROHIBIDA en Legacy Casual.`);
      return;
    }

    setRenderDeck(prev => {
      const exists = prev.find(c => c.name === cardName);
      if (exists) {
        // Bloqueo de Copias (Regla de 4)
        if (!isBasicLand(cardName) && exists.quantity >= BATTLEBOX_RULES.maxCopies) {
          setWarning(`⚠️ Límite de copias alcanzado: Máximo ${BATTLEBOX_RULES.maxCopies} de "${cardName}".`);
          return prev;
        }
        return prev.map(c => c.name === cardName ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        name: scryfallCard.name,
        type_line: scryfallCard.type_line,
        quantity: 1,
        category: scryfallCard.type_line.split('—')[0].trim(),
        image_uris: scryfallCard.image_uris || scryfallCard.card_faces?.[0]?.image_uris
      }];
    });
    setWarning(null);
  };

  const handleRemoveCard = (cardName) => {
    setRenderDeck(prev => {
      const card = prev.find(c => c.name === cardName);
      if (card && card.quantity > 1) {
        return prev.map(c => c.name === cardName ? { ...c, quantity: c.quantity - 1 } : c);
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {mode === 'form' ? (
          <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="max-w-2xl mx-auto mb-8 p-6 frosted-panel shadow-2xl">
              <AiConfigPanel 
                onConfigReady={setAiConfig}
                storageKey={FORGE_STORAGE_KEY}
              />
            </div>
            <ForgeForm onSubmit={handleSubmit} isLoading={loading} error={error} aiConfig={aiConfig} />
          </motion.div>
        ) : (
          <motion.div key="deck" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8">
            {/* Header del Mazo */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-6 p-8 leather-panel border-magic-gold/10 shadow-2xl">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-4 mb-2">
                  <h2 className="text-3xl font-cinzel text-magic-gold tracking-wide flex items-center gap-3">
                    <img src="/ASSETS/iconoDeck.webp" alt="Deck" className="w-16 h-16 object-contain drop-shadow-[0_0_15px_rgba(255,202,88,0.3)]" />
                    {aiMetadata?.deckName || 'Mazo Forjado'}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-magic-gold/60 text-[10px] uppercase tracking-[0.2em] font-bold">
                    {lastFormData?.archetype} • {stats.mainCount} CARTAS
                  </span>
                  {stats.isValid ? (
                    <span className="flex items-center gap-1 text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20 uppercase tracking-tighter">
                      <CheckCircle2 size={12} /> Legal en Legacy Casual
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full border border-red-500/20 uppercase tracking-tighter">
                      <XCircle size={12} /> No cumple las reglas
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
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
                <button onClick={() => setMode('form')} className="btn-magic-glass btn-glass-silver">← Nuevo</button>
              </div>
            </div>

            {/* Alertas de Reglas */}
            {!stats.isValid && (
              <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={cn("p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all", stats.isMainValid ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                  {stats.isMainValid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60">Cartas Main</p>
                    <p className="text-sm font-bold">{stats.mainCount} / 60 requeridas</p>
                  </div>
                </div>
                <div className={cn("p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all", stats.banned.length === 0 ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                  {stats.banned.length === 0 ? <CheckCircle2 size={20} /> : <Shield size={20} />}
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60">Cartas Prohibidas</p>
                    <p className="text-sm font-bold">{stats.banned.length === 0 ? 'Limpio' : `${stats.banned.length} ilegales`}</p>
                  </div>
                </div>
                <div className={cn("p-4 rounded-xl border flex items-center gap-3 shadow-lg backdrop-blur-md transition-all", stats.overLimit.length === 0 ? "bg-green-500/5 border-green-500/20 text-green-400" : "bg-red-500/5 border-red-500/20 text-red-400")}>
                  {stats.overLimit.length === 0 ? <CheckCircle2 size={20} /> : <Info size={20} />}
                  <div>
                    <p className="text-[10px] uppercase font-bold opacity-60">Límite de Copias</p>
                    <p className="text-sm font-bold">{stats.overLimit.length === 0 ? 'Correcto (máx 4)' : 'Exceso detectado'}</p>
                  </div>
                </div>
              </div>
            )}

            {warning && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 bg-red-950/20 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-center gap-3 shadow-2xl">
                <AlertTriangle size={16} /> {warning}
                <button onClick={() => setWarning(null)} className="ml-auto text-red-400/50 hover:text-red-400"><XCircle size={14} /></button>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2">
                {isEditing && <CardSearch onAddCard={handleAddCard} />}
                <VisualGrid cards={renderDeck} isEditing={isEditing} onRemoveCard={handleRemoveCard} />
              </div>

              <div className="space-y-6">
                <div className="leather-panel p-6 shadow-2xl">
                  <h4 className="font-cinzel text-magic-gold text-lg mb-6 flex items-center gap-2">
                    <Target className="w-5 h-5" /> Potencial Bélico
                  </h4>
                  <RadarChart data={{
                    Velocidad: 8, Control: 7, Poder: 8, Complejidad: 7, Resiliencia: 6
                  }} />
                </div>
                <ManaCurve deck={renderDeck} />

                {pocketGuide && (
                  <div className="parchment-scroll p-8 shadow-2xl">
                    <h4 className="font-cinzel text-[#4a3318] text-lg mb-4 flex items-center gap-2 border-b border-[#4a3318]/20 pb-2">
                      <Scroll size={24} /> Guía del Maestro
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-1">Estrategia</p>
                        <p className="text-sm text-[#4a3318] leading-relaxed italic">"{pocketGuide.plan}"</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase text-[#4a3318]/60 mb-1">Mulligan</p>
                        <p className="text-sm text-[#4a3318] leading-relaxed">{pocketGuide.mulligan}</p>
                      </div>
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

            <HandSimulator deck={renderDeck} isOpen={showHandSim} onClose={() => setShowHandSim(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}