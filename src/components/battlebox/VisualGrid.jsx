import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';
import { cn } from '../../utils/cn';
import { Layers, Swords, Zap, Gem, Mountain, Coins, Scroll, Sparkles, User, Flame, Activity, XCircle, AlertTriangle, CheckCircle2, Check } from 'lucide-react';

const ScryfallHoverCard = ({ cardName, children }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const spanRef = useRef(null);

  useEffect(() => {
    let active = true;
    if (isHovered && !imgUrl) {
      fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!active) return;
          if (data && data.image_uris && data.image_uris.normal) {
            setImgUrl(data.image_uris.normal);
          } else if (data && data.card_faces && data.card_faces[0].image_uris) {
            setImgUrl(data.card_faces[0].image_uris.normal);
          }
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [isHovered, cardName, imgUrl]);

  const handleMouseEnter = () => {
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setCoords({ x: rect.left + rect.width / 2, y: rect.top });
    }
    setIsHovered(true);
  };

  return (
    <span 
      ref={spanRef}
      className="text-purple-300 font-bold border-b border-dashed border-purple-400/50 hover:text-purple-200 transition-colors cursor-help inline-block relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
      <AnimatePresence>
        {isHovered && imgUrl && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ position: 'fixed', left: coords.x, top: coords.y, transform: 'translate(-50%, -100%)', marginTop: '-8px', zIndex: 99999, width: '220px' }}
            className="pointer-events-none"
          >
            <img src={imgUrl} alt={cardName} className="w-full h-auto rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-purple-500/30" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};

const RichTextWithHover = ({ text, deckCards }) => {
  const parts = useMemo(() => {
    if (!text || typeof text !== 'string') return [{ type: 'text', content: text }];
    
    const knownNames = Array.from(new Set(deckCards.map(c => c?.name))).filter(Boolean);
    knownNames.sort((a, b) => b.length - a.length);
    
    let regexStr = `\\[\\[([^\\]]+)\\]\\]|'([^']+)'|\\b\\d+x\\s+([A-Z][a-zA-Z\\',-]+(?:\\s+[a-zA-Z\\',-]+)*)`;
    if (knownNames.length > 0) {
      const escapedNames = knownNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      regexStr += `|(${escapedNames.join('|')})`;
    }
    
    const pattern = new RegExp(regexStr, 'g');
    const result = [];
    let lastIndex = 0;
    let match;
    
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', content: text.substring(lastIndex, match.index) });
      }
      
      let cardName = match[1] || match[2] || match[3] || match[4];
      if (cardName) {
        cardName = cardName.trim();
        if (cardName.endsWith('.') || cardName.endsWith(',')) {
          cardName = cardName.substring(0, cardName.length - 1).trim();
        }
        
        // Si el match completo incluye los dobles corchetes, los quitamos del texto visible
        let displayContent = match[0];
        if (match[1]) {
          displayContent = match[1]; 
        }
        
        result.push({ type: 'card', content: displayContent, cardName: cardName });
      } else {
        result.push({ type: 'text', content: match[0] });
      }
      lastIndex = pattern.lastIndex;
    }
    
    if (lastIndex < text.length) {
      result.push({ type: 'text', content: text.substring(lastIndex) });
    }
    
    return result;
  }, [text, deckCards]);

  return (
    <span>
      {parts.map((p, i) => 
        p.type === 'card' ? (
          <ScryfallHoverCard key={i} cardName={p.cardName}>
            {p.content}
          </ScryfallHoverCard>
        ) : (
          <span key={i}>{p.content}</span>
        )
      )}
    </span>
  );
};

const CATEGORIES = {
  Creature: { label: 'Criaturas', icon: Swords },
  Instant: { label: 'Instantáneos', icon: Zap },
  Sorcery: { label: 'Conjuros', icon: Scroll },
  Artifact: { label: 'Artefactos', icon: Gem },
  Enchantment: { label: 'Encantamientos', icon: Sparkles },
  Planeswalker: { label: 'Planeswalkers', icon: User },
  Land: { label: 'Tierras', icon: Mountain },
};

function CategorySection({ title, icon: Icon, cards, onRemove, onAdd, isEditing }) {
  if (cards.length === 0) return null;

  return (
    <div className="mb-12">
      <div className="flex items-center gap-4 mb-6 pb-2 border-b border-magic-gold/10 relative">
        <div className="w-10 h-10 rounded-lg bg-magic-gold/5 border border-magic-gold/20 flex items-center justify-center shadow-inner text-magic-gold">
          <Icon className="w-5 h-5" />
        </div>
        <h3 className="text-2xl font-cinzel text-magic-gold tracking-widest uppercase">{title}</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-magic-gold/20 mr-2" />
          <span className="text-[10px] px-3 py-1 rounded-full bg-magic-gold/10 border border-magic-gold/30 font-bold uppercase tracking-[0.2em] text-magic-gold/80">
            {cards.reduce((sum, c) => sum + (c.quantity || 1), 0)} Registros
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
        {cards.map((card, idx) => (
          <MagicCard 
            key={`${card.name}-${idx}`} 
            card={card} 
            isEditing={isEditing}
            onRemove={onRemove}
            onAdd={onAdd}
          />
        ))}
      </div>
    </div>
  );
}

export default function VisualGrid({ cards, onRemoveCard, onAddCard, isEditing, isMainDeck, onAudit, isAuditing, auditResult, onCloseAudit, onOptimize }) {
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());

  useEffect(() => {
    if (auditResult && auditResult.suggestions) {
      setSelectedSuggestions(new Set(auditResult.suggestions.map((_, i) => i)));
    }
  }, [auditResult]);

  const toggleSuggestion = (index) => {
    const newSet = new Set(selectedSuggestions);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedSuggestions(newSet);
  };

  const safeCards = Array.isArray(cards) ? cards.filter(Boolean) : [];

  const getPrimaryCategory = (card) => {
    if (!card) return 'Other';
    const type = card.type_line || card.type || '';
    if (type.includes('Creature')) return 'Creature';
    if (type.includes('Planeswalker')) return 'Planeswalker';
    if (type.includes('Enchantment')) return 'Enchantment';
    if (type.includes('Artifact')) return 'Artifact';
    if (type.includes('Sorcery')) return 'Sorcery';
    if (type.includes('Instant')) return 'Instant';
    if (type.includes('Land')) return 'Land';
    return 'Other';
  };

  const cardsByCategory = safeCards.reduce((acc, card) => {
    if (!card) return acc;
    const cat = getPrimaryCategory(card);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(card);
    return acc;
  }, {});

  const totalCards = safeCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
  const creatures = cardsByCategory.Creature?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;
  const spells = (cardsByCategory.Instant?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0) +
                 (cardsByCategory.Sorcery?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0) +
                 (cardsByCategory.Enchantment?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0);
  const artifacts = (cardsByCategory.Artifact?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0);
  const lands = cardsByCategory.Land?.reduce((sum, c) => sum + (c.quantity || 1), 0) || 0;

  const totalPrice = cards.reduce((sum, c) => {
    const price = parseFloat(c.prices?.usd || c.prices?.usd_foil || c.prices?.eur || 0);
    return sum + (price * (c.quantity || 1));
  }, 0);

  return (
    <>
      <div className="space-y-12">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total', value: totalCards, color: 'text-magic-gold', icon: Layers },
          { label: 'Criaturas', value: creatures, color: 'text-red-400', icon: Swords },
          { label: 'Hechizos', value: spells, color: 'text-blue-400', icon: Zap },
          { label: 'Artefactos', value: artifacts, color: 'text-gray-300', icon: Gem },
          { label: 'Tierras', value: lands, color: 'text-green-400', icon: Mountain },
          { label: 'Valor', value: `$${totalPrice.toFixed(0)}`, color: 'text-amber-400', icon: Coins }
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-black/60 border border-magic-gold/20 rounded-2xl p-5 flex flex-col items-center justify-center group hover:border-magic-gold/50 hover:bg-black/80 transition-all duration-500 shadow-xl relative overflow-hidden">
               <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
               <Icon className={cn("w-5 h-5 mb-2 opacity-50 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110", stat.color)} />
               <p className={cn("text-3xl font-cinzel leading-none drop-shadow-md relative z-10", stat.color)}>{stat.value}</p>
               <p className="text-[10px] text-white/50 uppercase tracking-[0.25em] mt-3 font-bold relative z-10">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {isMainDeck && onAudit && (
        <div className="flex justify-center mt-6">
          <button 
            onClick={onAudit} 
            disabled={isAuditing}
            className="group relative flex items-center gap-3 px-8 py-4 bg-black/60 border border-purple-500/30 hover:border-purple-400 rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-fuchsia-600/10 to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            {isAuditing ? (
              <Activity className="w-5 h-5 text-purple-400 animate-spin" />
            ) : (
              <Activity className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
            )}
            <span className="font-cinzel font-bold tracking-widest text-purple-100 uppercase text-sm">
              {isAuditing ? 'El Juez está Auditando...' : 'Solicitar Auditoría del Juez Supremo'}
            </span>
          </button>
        </div>
      )}

      <div className="space-y-2">
        {Object.entries(CATEGORIES).map(([key, { label, icon }]) => (
          <CategorySection 
            key={key} 
            title={label} 
            icon={icon} 
            cards={cardsByCategory[key] || []} 
            onRemove={onRemoveCard}
            onAdd={onAddCard}
            isEditing={isEditing}
          />
        ))}
      </div>
    </div>

      {/* Modal de Auditoría */}
      <AnimatePresence>
        {auditResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[#0f0a14] border border-purple-500/30 rounded-3xl w-full max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-purple-500/20 bg-purple-950/20 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-900/50 border border-purple-400/30 flex items-center justify-center shadow-inner">
                    <Activity className="text-purple-300 w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-xl text-purple-300 tracking-wider">Veredicto del Juez</h3>
                    <p className="text-xs text-purple-200/50 font-mono">Auditoría Competitiva de IA</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end">
                  <div className="text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                    {auditResult.score}<span className="text-lg text-purple-400/50">/10</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400">Score de Viabilidad</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-sm text-gray-300 italic font-serif leading-relaxed border-l-4 border-l-purple-500">
                  "{auditResult.verdict}"
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Alertas Críticas */}
                  {auditResult.criticalAlerts && auditResult.criticalAlerts.length > 0 && (
                    <div className="bg-red-950/20 border border-red-500/20 rounded-2xl p-5">
                      <h4 className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs mb-4">
                        <AlertTriangle size={16} /> Alertas Críticas
                      </h4>
                      <ul className="space-y-3">
                        {auditResult.criticalAlerts.map((alert, i) => (
                          <li key={i} className="flex gap-3 text-sm text-red-200/80 items-start leading-relaxed">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <span>
                              {typeof alert === 'object' ? (
                                <RichTextWithHover text={alert.text || JSON.stringify(alert)} deckCards={safeCards} />
                              ) : (
                                <RichTextWithHover text={alert} deckCards={safeCards} />
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Advertencias */}
                  {auditResult.warnings && auditResult.warnings.length > 0 && (
                    <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5">
                      <h4 className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-xs mb-4">
                        <AlertTriangle size={16} /> Advertencias Menores
                      </h4>
                      <ul className="space-y-3">
                        {auditResult.warnings.map((warn, i) => (
                          <li key={i} className="flex gap-3 text-sm text-amber-200/80 items-start leading-relaxed">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            <span>
                              {typeof warn === 'object' ? (
                                <RichTextWithHover text={warn.text || JSON.stringify(warn)} deckCards={safeCards} />
                              ) : (
                                <RichTextWithHover text={warn} deckCards={safeCards} />
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Sugerencias */}
                {auditResult.suggestions && auditResult.suggestions.length > 0 && (
                  <div className="bg-emerald-950/10 border border-emerald-500/20 rounded-2xl p-5">
                    <h4 className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs mb-4">
                      <CheckCircle2 size={16} /> Opciones de Mejora
                    </h4>
                    <ul className="space-y-3">
                      {auditResult.suggestions.map((sug, i) => (
                        <li 
                          key={i} 
                          className="flex gap-3 text-sm items-start cursor-pointer group"
                          onClick={() => toggleSuggestion(i)}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedSuggestions.has(i) ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/50 bg-transparent'}`}>
                             {selectedSuggestions.has(i) && <Check size={12} className="text-black stroke-[3]" />}
                          </div>
                          <span className={`transition-colors flex-1 leading-relaxed ${selectedSuggestions.has(i) ? 'text-emerald-200/90' : 'text-emerald-200/50 line-through'}`}>
                            <RichTextWithHover text={sug.text || sug} deckCards={safeCards} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 flex justify-end shrink-0 bg-black/20 gap-3">
                {onOptimize && auditResult && auditResult.score < 10 && (
                  <button
                    onClick={() => {
                      const filteredAuditResult = {
                        ...auditResult,
                        suggestions: auditResult.suggestions.filter((_, i) => selectedSuggestions.has(i)),
                        applyProgrammatically: true
                      };
                      onOptimize(filteredAuditResult);
                      onCloseAudit();
                    }}
                    className="px-6 py-2 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/50 text-purple-200 rounded-lg text-sm font-bold uppercase transition-colors"
                  >
                    Aplicar Cambios
                  </button>
                )}
                <button
                  onClick={onCloseAudit}
                  className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-bold uppercase transition-colors"
                >
                  Entendido
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}