import { useState } from 'react';
import { BATTLEBOX_BANLIST } from '../constants/legacyBattleBox';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../utils/cn';
import ForgeForm from '../components/forge/ForgeForm';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import VisualGrid from '../components/battlebox/VisualGrid';
import { getKarstenLandCount, generateManaBase } from '../services/deckCalculator';
import { forgeMazo } from '../services/aiFactory';
import { hydrateDeckCards, isLegalInLegacy } from '../services/cardHydrator';
import { archiveDeck } from '../services/archiveService';
import CardSearch from '../components/forge/CardSearch';
import HandSimulator from '../components/forge/HandSimulator';
import RadarChart from '../components/forge/RadarChart';
import ManaCurve from '../components/forge/ManaCurve';

const FORGE_STORAGE_KEY = 'mtg_ai_config_forge';

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

  const handleArchive = () => {
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

    const success = archiveDeck(deckToArchive);
    if (success) {
      setArchived(true);
      setTimeout(() => setArchived(false), 3000);
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
      
      // Hidratar cartas (traer imágenes y metadatos de Scryfall/Cache)
      const hydratedDeck = await hydrateDeckCards(aiResult.cards);
      const hydratedSideboard = aiResult.sideboard ? await hydrateDeckCards(aiResult.sideboard) : [];
      
      // Validación de Banlist Custom
      const illegalCards = [...hydratedDeck, ...hydratedSideboard].filter(c => BATTLEBOX_BANLIST.includes(c.name));
      if (illegalCards.length > 0) {
        setWarning(`⚠️ Banlist: Se han detectado cartas no permitidas: ${illegalCards.map(c => c.name).join(', ')}. La IA ha fallado en la restricción.`);
      }
      
      // Cálculo Inteligente y Estricto de 60 Cartas
      const rawNonLands = [...hydratedDeck];
      const recommendedLandsCount = getKarstenLandCount(rawNonLands);
      const safeMinimumLands = (lastFormData?.archetype?.includes('aggro') || lastFormData?.archetype === 'tempo') ? 20 : 23;
      
      const finalLandsCount = Math.max(safeMinimumLands, recommendedLandsCount);
      const maxSpellsAllowed = 60 - finalLandsCount;
      
      let finalSpells = [];
      let currentSpellCount = 0;

      // Poda estricta para el Main Deck (lo que no quepa se descarta para no ensuciar el Sideboard estratégico)
      rawNonLands.forEach(card => {
        if (currentSpellCount + card.quantity <= maxSpellsAllowed) {
          finalSpells.push(card);
          currentSpellCount += card.quantity;
        } else if (currentSpellCount < maxSpellsAllowed) {
          const spaceLeft = maxSpellsAllowed - currentSpellCount;
          finalSpells.push({ ...card, quantity: spaceLeft });
          currentSpellCount += spaceLeft;
        }
      });

      if (rawNonLands.reduce((s,c)=>s+c.quantity,0) > maxSpellsAllowed) {
        setWarning(`📏 Poda de Precisión: He ajustado el Main Deck a exactamente 60 cartas para maximizar la consistencia con ${finalLandsCount} tierras.`);
      }

      const manaBase = await generateManaBase(
        aiResult.pipBalance,
        finalLandsCount,
        formData.colores,
        'Legacy'
      );
      
      const finalDeck = [...finalSpells, ...manaBase];
      
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
    const newCard = {
      name: scryfallCard.name,
      type_line: scryfallCard.type_line,
      quantity: 1,
      category: scryfallCard.type_line.split('—')[0].trim(),
      image_uris: scryfallCard.image_uris || scryfallCard.card_faces?.[0]?.image_uris
    };
    
    setRenderDeck(prev => {
      const exists = prev.find(c => c.name === newCard.name);
      if (exists) {
        return prev.map(c => c.name === newCard.name ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, newCard];
    });
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
      const prompt = `Actúa como un Gran Maestro de Magic: The Gathering.
      Has diseñado este mazo de "Legacy Battle Box" llamado "${aiMetadata?.deckName}" (${aiMetadata?.archetype}):
      
      MAIN DECK:
      ${renderDeck.map(c => `${c.quantity}x ${c.name}`).join('\n')}
      
      SIDEBOARD ESTRATÉGICO:
      ${renderSideboard.map(c => `${c.quantity}x ${c.name}`).join('\n')}
      
      ESTRATEGIA GENERAL: ${aiMetadata?.strategy}
      
      INFUNDE SABIDURÍA: Genera una Guía de Bolsillo de NIVEL PROFESIONAL en español:
      1. PLAN DE ATAQUE: Explica en una frase el "Win Condition" principal y cómo llegar a él.
      2. GUÍA DE MULLIGAN: Describe exactamente qué tipo de mano es un "Snap Keep" y qué manos son veneno para este mazo.
      3. TRUCOS TÉCNICOS: Proporciona 3 interacciones o sinergias ocultas entre las cartas que un jugador novato podría pasar por alto.
      
      Responde EXCLUSIVAMENTE con un JSON puro: 
      { "plan": "...", "mulligan": "...", "tips": "..." }`;

      const response = await callAI(prompt, aiConfig);
      const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(cleaned);
      setPocketGuide(json);
    } catch (err) {
      console.error('Error infundiendo sabiduría:', err);
      setPocketGuide({
        plan: "Error al sintonizar con el Arquitecto. Inténtalo de nuevo.",
        mulligan: "Mantén manos con tierras y hechizos de coste bajo.",
        tips: "• Consulta las reglas del formato.\n• Analiza el mazo de tus oponentes.\n• Sé agresivo pero guarda respuestas."
      });
    } finally {
      setIsGeneratingGuide(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {mode === 'form' ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="max-w-2xl mx-auto mb-8">
              <AiConfigPanel 
                onConfigReady={(newConfig) => {
                  setAiConfig(newConfig);
                  localStorage.setItem(FORGE_STORAGE_KEY, JSON.stringify(newConfig));
                }}
                storageKey={FORGE_STORAGE_KEY}
              />
            </div>

            <ForgeForm 
              onSubmit={handleSubmit} 
              isLoading={loading} 
              error={error} 
              aiConfig={aiConfig}
              disabled={!aiConfig?.selectedModel || !aiConfig?.apiKey}
            />
          </motion.div>
        ) : (
          <motion.div
            key="deck"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-8"
          >
            <div className="flex flex-col mb-8 gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-cinzel text-grimorio-gold">
                    📜 {aiMetadata?.deckName || 'Mazo Forjado'}
                  </h2>
                  <p className="text-grimorio-parchment/60 text-sm mt-1 uppercase tracking-widest">
                    Legacy Battle Box (Casual) • {lastFormData?.archetype}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className={cn(
                      "px-4 py-2 border rounded-lg transition-all flex items-center gap-2",
                      isEditing 
                        ? "bg-red-500/20 border-red-500 text-red-400" 
                        : "bg-blue-500/20 border-blue-500/40 text-blue-400 hover:bg-blue-500/30"
                    )}
                  >
                    {isEditing ? '💾 Guardar Cambios' : '✍️ Modo Edición'}
                  </button>
                  <button
                    onClick={() => setShowHandSim(true)}
                    className="px-4 py-2 bg-purple-500/20 border border-purple-500/40 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all"
                  >
                    🃏 Probar Mano
                  </button>
                  <button
                    onClick={handleArchive}
                    disabled={archived}
                    className={cn(
                      "px-4 py-2 border rounded-lg transition-all flex items-center gap-2",
                      archived 
                        ? "bg-green-500/20 border-green-500 text-green-400" 
                        : "bg-grimorio-gold/20 border-grimorio-gold/40 text-grimorio-gold hover:bg-grimorio-gold/30"
                    )}
                  >
                    {archived ? '✅ Archivado' : '📦 Archivar Mazo'}
                  </button>
                  <button
                    onClick={() => setMode('form')}
                    className="px-4 py-2 bg-grimorio-gold/20 border border-grimorio-gold/40 
                               text-grimorio-gold rounded-lg hover:bg-grimorio-gold/30 transition-colors"
                  >
                    ← Nuevo Mazo
                  </button>
                </div>
              </div>

              {warning && (
                <div className="p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm">
                  ⚠️ {warning}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
              <div className="lg:col-span-2">
                {isEditing && <CardSearch onAddCard={handleAddCard} />}
                <VisualGrid 
                  cards={renderDeck} 
                  isEditing={isEditing} 
                  onRemoveCard={handleRemoveCard} 
                />

                {renderSideboard.length > 0 && (
                  <div className="mt-12">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                        <span className="text-xl">🛡️</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Sideboard Estratégico</h2>
                    </div>

                    {sideboardStrategy && (
                      <div className="mb-6 p-6 bg-purple-900/10 border border-purple-500/20 rounded-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <span className="text-4xl">💡</span>
                        </div>
                        <h3 className="text-purple-400 font-bold mb-2 flex items-center gap-2">
                          Guía Táctica:
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed italic">
                          {sideboardStrategy}
                        </p>
                      </div>
                    )}

                    <VisualGrid 
                      cards={renderSideboard} 
                      isEditing={isEditing} 
                      onRemoveCard={(c) => setRenderSideboard(prev => prev.filter(p => p.name !== c.name))}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <RadarChart data={{
                  Velocidad: aiMetadata?.pipBalance?.R > 25 ? 9 : (aiMetadata?.pipBalance?.W > 25 ? 8 : 6),
                  Control: aiMetadata?.pipBalance?.U > 25 ? 9 : (aiMetadata?.pipBalance?.B > 25 ? 7 : 5),
                  Poder: 8,
                  Complejidad: 7,
                  Resiliencia: 6
                }} />

                <ManaCurve deck={renderDeck} />

                <div className="p-6 bg-gradient-to-b from-[#2a2318] to-[#1a1612] border border-grimorio-gold/30 rounded-xl shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-grimorio-gold/5 rotate-45 translate-x-12 -translate-y-12 border border-grimorio-gold/10" />
                  
                  <h4 className="font-cinzel text-grimorio-gold text-lg mb-6 flex items-center gap-2 relative z-10">
                    📖 Guía de Bolsillo
                    {!pocketGuide && !isGeneratingGuide && (
                      <button 
                        onClick={generateGuide}
                        className="ml-auto text-[10px] px-3 py-1 bg-grimorio-gold/10 hover:bg-grimorio-gold/20 border border-grimorio-gold/30 rounded-full transition-all uppercase tracking-widest font-bold text-grimorio-gold shadow-[0_0_10px_rgba(212,175,55,0.1)]"
                      >
                        ✨ Infundir Sabiduría
                      </button>
                    )}
                  </h4>
                  
                  {isGeneratingGuide ? (
                    <div className="space-y-4 animate-pulse">
                      <div className="h-4 bg-grimorio-gold/10 rounded w-3/4" />
                      <div className="h-4 bg-grimorio-gold/10 rounded w-full" />
                      <div className="h-4 bg-grimorio-gold/10 rounded w-5/6" />
                    </div>
                  ) : pocketGuide ? (
                    <div className="space-y-6 relative z-10">
                      <div>
                        <p className="text-[10px] font-bold text-grimorio-gold/60 uppercase tracking-widest mb-1 flex items-center gap-2">
                          ⚔️ Plan de Ataque
                        </p>
                        <p className="text-sm text-grimorio-parchment/90 leading-relaxed italic">
                          "{pocketGuide.plan}"
                        </p>
                      </div>
                      
                      {pocketGuide.mulligan && (
                        <div>
                          <p className="text-[10px] font-bold text-grimorio-gold/60 uppercase tracking-widest mb-1 flex items-center gap-2">
                            🃏 Estrategia Mulligan
                          </p>
                          <p className="text-sm text-grimorio-parchment/80 leading-relaxed">
                            {pocketGuide.mulligan}
                          </p>
                        </div>
                      )}

                      {pocketGuide.tips && (
                        <div>
                          <p className="text-[10px] font-bold text-grimorio-gold/60 uppercase tracking-widest mb-1 flex items-center gap-2">
                            💡 Trucos Técnicos
                          </p>
                          <div className="text-sm text-grimorio-parchment/70 leading-relaxed whitespace-pre-line border-l-2 border-grimorio-gold/20 pl-4 py-1">
                            {pocketGuide.tips}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-grimorio-parchment/40 text-xs italic mb-4">
                        "El conocimiento es la mejor carta en tu mano."
                      </p>
                      <button 
                        onClick={generateGuide}
                        className="text-xs px-4 py-2 bg-grimorio-gold/5 hover:bg-grimorio-gold/10 border border-grimorio-gold/20 rounded-lg transition-all text-grimorio-gold"
                      >
                        Descifrar Estrategia
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <HandSimulator 
              deck={renderDeck} 
              isOpen={showHandSim} 
              onClose={() => setShowHandSim(false)} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}