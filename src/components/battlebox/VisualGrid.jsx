import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MagicCard from '../atoms/MagicCard';
import { cn } from '../../utils/cn';
import { Layers, Swords, Zap, Gem, Mountain, Coins, Scroll, Sparkles, User, Flame, Activity, XCircle, AlertTriangle, CheckCircle2, Check, ShieldAlert } from 'lucide-react';
import { checkCardManaRequirement } from '../../services/deckCalculator';
import { useIsTouchDevice } from '../../hooks/useIsMobile';
import MobileCardPreview from '../atoms/MobileCardPreview';

const ScryfallHoverCard = ({ cardName, children }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const spanRef = useRef(null);
  const isTouch = useIsTouchDevice();

  useEffect(() => {
    let active = true;
    if ((isHovered || showMobilePreview) && !imgUrl) {
      let cleanName = cardName.replace(/^\d+x\s+/, '').trim();
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
          
          if (cardData && cardData.image_uris && cardData.image_uris.normal) {
            setImgUrl(cardData.image_uris.normal);
          } else if (cardData && cardData.card_faces && cardData.card_faces[0].image_uris) {
            setImgUrl(cardData.card_faces[0].image_uris.normal);
          }
        })
        .catch(() => {});
    }
    return () => { active = false; };
  }, [isHovered, showMobilePreview, cardName, imgUrl]);

  const handleMouseEnter = () => {
    if (isTouch) return;
    if (spanRef.current) {
      const rect = spanRef.current.getBoundingClientRect();
      setCoords({ 
        x: rect.left + rect.width / 2, 
        y: rect.top,
        bottom: rect.bottom
      });
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (isTouch) return;
    setIsHovered(false);
  };

  const handleClick = (e) => {
    if (isTouch) {
      e.preventDefault();
      e.stopPropagation();
      setShowMobilePreview(true);
    }
  };

  const cardWidth = 220;
  const cardHeight = 308;
  const margin = 8;
  
  const spaceAbove = coords.y - margin;
  const spaceBelow = typeof window !== 'undefined' ? window.innerHeight - coords.bottom - margin : 400;
  
  // Prefer showing above if it fits
  let showBelow = false;
  if (spaceAbove >= cardHeight + 10) {
    showBelow = false;
  } else if (spaceBelow >= cardHeight + 10) {
    showBelow = true;
  } else {
    showBelow = spaceBelow > spaceAbove;
  }
  
  let leftPos = coords.x - cardWidth / 2;
  if (typeof window !== 'undefined') {
    leftPos = Math.max(10, Math.min(window.innerWidth - cardWidth - 10, leftPos));
  }
  
  let topPos;
  if (showBelow) {
    topPos = (coords.bottom || coords.y) + margin;
  } else {
    topPos = coords.y - margin - cardHeight;
  }

  // Enforce viewport clamp to guarantee the card remains fully on screen
  if (typeof window !== 'undefined') {
    topPos = Math.max(10, Math.min(window.innerHeight - cardHeight - 10, topPos));
  }

  return (
    <>
      <span 
        ref={spanRef}
        className="text-purple-300 font-bold border-b border-dashed border-purple-400/50 hover:text-purple-200 transition-colors cursor-help inline-block relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        {children}
        {typeof document !== 'undefined' && !isTouch && createPortal(
          <AnimatePresence>
            {isHovered && imgUrl && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                style={{ 
                  position: 'fixed', 
                  left: `${leftPos}px`, 
                  top: `${topPos}px`, 
                  zIndex: 99999, 
                  width: `${cardWidth}px` 
                }}
                className="pointer-events-none"
              >
                <img src={imgUrl} alt={cardName} className="w-full h-auto rounded-xl shadow-[0_20px_40px_rgba(0,0,0,0.8)] border border-purple-500/30" />
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </span>

      {isTouch && showMobilePreview && (
        <MobileCardPreview
          card={{ name: cardName, image_uris: { normal: imgUrl } }}
          isOpen={showMobilePreview}
          onClose={() => setShowMobilePreview(false)}
        />
      )}
    </>
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

function CategorySection({ title, icon: Icon, cards, onRemove, onAdd, isEditing, isMainDeck, manaSources, deckSize }) {
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
      
      <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8">
        {cards.map((card, idx) => (
          <MagicCard 
            key={`${card.name}-${idx}`} 
            card={card} 
            isEditing={isEditing}
            onRemove={onRemove}
            onAdd={onAdd}
            deficitInfo={isMainDeck && manaSources ? checkCardManaRequirement(card, manaSources, deckSize) : null}
          />
        ))}
      </div>
    </div>
  );
}

export default function VisualGrid({ cards, onRemoveCard, onAddCard, isEditing, isMainDeck, onAudit, isAuditing, auditResult, onCloseAudit, onOptimize, manaSources, deckSize }) {
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [selectedDropdownOptions, setSelectedDropdownOptions] = useState({});
  const [showKarstenDrawer, setShowKarstenDrawer] = useState(false);

  useEffect(() => {
    if (auditResult && auditResult.suggestions) {
      setSelectedSuggestions(new Set(
        auditResult.suggestions
          .map((sug, i) => (sug && sug._invalid) ? -1 : i)
          .filter(idx => idx !== -1)
      ));
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
            isMainDeck={isMainDeck}
            manaSources={manaSources}
            deckSize={deckSize}
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
              className="bg-[#0f0a14] border border-purple-500/30 md:rounded-3xl rounded-xl w-full max-w-full md:max-w-3xl overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.15)] flex flex-col h-full md:h-auto max-h-[100vh] md:max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 md:p-6 border-b border-purple-500/20 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-purple-900/50 border border-purple-400/30 flex items-center justify-center shadow-inner shrink-0">
                    <Activity className="text-purple-300 w-5 h-5 md:w-6 md:h-6 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-cinzel text-lg text-purple-300 tracking-wider">Veredicto del Juez</h3>
                    <p className="text-[10px] md:text-xs text-purple-200/50 font-mono">Auditoría Competitiva de IA</p>
                  </div>
                </div>
                
                <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t border-white/5 sm:border-0 pt-2 sm:pt-0">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-purple-400 sm:hidden">Score:</span>
                  <div className="text-3xl md:text-4xl font-black text-white drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                    {auditResult.score}<span className="text-base md:text-lg text-purple-400/50">/10</span>
                  </div>
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-widest text-purple-400 hidden sm:inline">Score de Viabilidad</span>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-sm text-gray-300 italic font-serif leading-relaxed border-l-4 border-l-purple-500">
                  <RichTextWithHover text={`"${auditResult.verdict || auditResult.summary || auditResult.overview || 'Auditoría determinista de viabilidad procesada con éxito.'}"`} deckCards={safeCards} />
                </div>


                {/* Panel de Pilares Funcionales */}
                {auditResult._pillarAnalysis && (() => {
                  const { pillars, pillarStatus } = auditResult._pillarAnalysis;
                  const pillarConfig = [
                    { key: 'ramp',       label: 'Ramp',        icon: '⚡', color: { ok: 'text-amber-400', low: 'text-amber-300', critical: 'text-red-400' }, bar: 'bg-amber-500' },
                    { key: 'draw',       label: 'Draw',        icon: '📖', color: { ok: 'text-blue-400',  low: 'text-blue-300',  critical: 'text-red-400' }, bar: 'bg-blue-500' },
                    { key: 'removal',    label: 'Remoción',    icon: '🗡️', color: { ok: 'text-red-400',  low: 'text-orange-300', critical: 'text-red-400' }, bar: 'bg-red-500' },
                    { key: 'threats',    label: 'Amenazas',    icon: '⚔️', color: { ok: 'text-emerald-400', low: 'text-emerald-300', critical: 'text-red-400' }, bar: 'bg-emerald-500' },
                    { key: 'protection', label: 'Protección',  icon: '🛡️', color: { ok: 'text-cyan-400', low: 'text-cyan-300', critical: 'text-red-400' }, bar: 'bg-cyan-500' },
                  ];
                  return (
                    <div className="bg-black/50 border border-purple-500/20 rounded-2xl p-4">
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-purple-400 mb-3 flex items-center gap-2">
                        <Activity size={12} /> Análisis de Pilares Funcionales
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {pillarConfig.map(({ key, label, icon, color, bar }) => {
                          const status = pillarStatus[key] || 'ok';
                          const p = pillars[key];
                          const pct = Math.min(100, Math.round((p.count / Math.max(p.threshold, 1)) * 100));
                          return (
                            <div key={key} className="flex flex-col gap-1.5 bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{icon} {label}</span>
                                <span className={`text-[10px] font-black ${color[status]}`}>
                                  {status === 'ok' ? '✓' : status === 'low' ? '⚠' : '🚨'}
                                </span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${status === 'critical' ? 'bg-red-500' : status === 'low' ? 'bg-amber-500' : bar}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-gray-500">{p.count} copias</span>
                                <span className="text-[9px] text-gray-600">/ {p.threshold} rec.</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Desplegable Karsten Mana Analysis */}
                {auditResult._karstenAnalysis && auditResult._karstenAnalysis.devotions && auditResult._karstenAnalysis.devotions.length > 0 && (
                  <div className="bg-black/50 border border-purple-500/20 rounded-2xl p-4">
                    <button
                      onClick={() => setShowKarstenDrawer(!showKarstenDrawer)}
                      className="w-full flex items-center justify-between text-left text-[10px] uppercase font-bold tracking-widest text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        📊 Análisis de Fuentes de Maná (Fórmula Karsten)
                      </span>
                      <span className="text-xs">{showKarstenDrawer ? '▲ Ocultar' : '▼ Mostrar Desglose'}</span>
                    </button>
                    {showKarstenDrawer && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 border-t border-white/5 pt-3">
                        {auditResult._karstenAnalysis.devotions.map((dev, idx) => (
                          <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-purple-300">Color {dev.color} (Devoción máx: {dev.maxDevotion})</span>
                              <span className={dev.status === 'ok' ? 'text-emerald-400' : dev.status === 'warning' ? 'text-amber-400' : 'text-red-400'}>
                                {dev.status === 'ok' ? '✓ OK' : dev.status === 'warning' ? '⚠️ Ajustado' : '🚨 Escaso'}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-400 flex justify-between">
                              <span>Fuentes reales: {dev.availableSources}</span>
                              <span>Karsten rec: {dev.requiredSources}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

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
                          className="flex gap-3 text-sm items-start group"
                        >
                          <div 
                            className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                              sug._invalid
                                ? 'border-red-500/50 bg-red-900/20 cursor-not-allowed opacity-50'
                                : `cursor-pointer ${selectedSuggestions.has(i) ? 'bg-emerald-500 border-emerald-500' : 'border-emerald-500/50 bg-transparent'}`
                            }`}
                            onClick={() => !sug._invalid && toggleSuggestion(i)}
                          >
                             {!sug._invalid && selectedSuggestions.has(i) && <Check size={12} className="text-black stroke-[3]" />}
                             {sug._invalid && <XCircle size={10} className="text-red-400" />}
                          </div>
                          <div className="flex-1">
                            {/* Badge de Categoría de Cambio */}
                            {sug.changeType && !sug._invalid && (
                              <div className="mb-1">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-900/40 border border-purple-500/30 text-purple-300 inline-block">
                                  {sug.changeType === 'Strict Upgrade' ? '⚡ Strict Upgrade'
                                    : sug.changeType === 'Synergy Upgrade' ? '🔗 Synergy Upgrade'
                                    : sug.changeType === 'Curve Fix' ? '📉 Curve Fix'
                                    : sug.changeType === 'Protection Fix' ? '🛡️ Protection Fix'
                                    : sug.changeType}
                                </span>
                              </div>
                            )}

                            {/* Badge de validación fallida */}
                            {sug._invalid && (
                              <div className="mb-1.5 flex flex-col gap-1">
                                <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-red-400">
                                  <ShieldAlert size={10} />
                                  <span>Sugerencia no aplicable — validación fallida</span>
                                </div>
                                {sug._invalidReasons?.map((r, ri) => (
                                  <p key={ri} className="text-[9px] text-red-300/70 pl-3 leading-tight">{r}</p>
                                ))}
                              </div>
                            )}
                            <span className={`transition-colors block leading-relaxed ${
                              sug._invalid
                                ? 'text-red-200/40 line-through'
                                : selectedSuggestions.has(i) ? 'text-emerald-200/90' : 'text-emerald-200/50 line-through'
                            }`}>
                              <RichTextWithHover text={sug.text || sug} deckCards={safeCards} />
                            </span>
                            
                            {/* Explicit Removes display */}
                            {sug.removes && sug.removes.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-2 items-center">
                                <span className="text-red-400 font-bold uppercase text-[10px]">Se eliminará:</span>
                                {sug.removes.filter(r => r.quantity > 0).map((r, idx) => (
                                  <span key={idx} className="bg-red-950/40 border border-red-500/30 text-red-200 px-2 py-0.5 rounded text-xs shadow-sm">
                                    <RichTextWithHover text={`-${r.quantity}x [[${r.name}]]`} deckCards={safeCards} />
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Explicit Adds display (only if there are no alternatives) */}
                            {(!sug.addOptions || sug.addOptions.length === 0) && sug.adds && sug.adds.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-2 items-center">
                                <span className="text-emerald-400 font-bold uppercase text-[10px]">Se añadirá:</span>
                                {sug.adds.filter(a => a.quantity > 0).map((a, idx) => (
                                  <span key={idx} className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded text-xs shadow-sm">
                                    <RichTextWithHover text={`+${a.quantity}x [[${a.name}]]`} deckCards={safeCards} />
                                  </span>
                                ))}
                              </div>
                            )}
                            {sug.addOptions && sug.addOptions.length > 0 && (
                              <div className="mt-2 pl-2 border-l border-emerald-500/30">
                                <span className="text-[10px] uppercase text-emerald-400 font-bold block mb-2">Elegir Alternativa:</span>
                                <div className="flex flex-col gap-2">
                                  {sug.addOptions.map((optGroup, optIdx) => {
                                    const isSelected = (selectedDropdownOptions[i] || 0) === optIdx;
                                    const isDisabled = !selectedSuggestions.has(i);
                                    const validOptions = optGroup.filter(c => c.quantity > 0);
                                    if (validOptions.length === 0) return null;
                                    const optionText = validOptions.map(c => `${c.quantity}x [[${c.name}]]`).join(' + ');
                                    return (
                                      <div
                                        key={optIdx}
                                        onClick={() => { if(!isDisabled) setSelectedDropdownOptions(prev => ({...prev, [i]: optIdx})) }}
                                        className={`text-left px-3 py-2 rounded-lg text-xs transition-all border flex items-center gap-3 cursor-pointer ${isSelected ? "bg-emerald-900/40 border-emerald-500/50 shadow-inner" : "bg-black/40 border-white/10 hover:border-emerald-500/30 hover:bg-emerald-950/20"} ${isDisabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}`}
                                      >
                                        <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? "border-emerald-400" : "border-gray-500"}`}>
                                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                                        </div>
                                        <span className={isSelected ? "text-emerald-100" : "text-gray-400"}>
                                          <RichTextWithHover text={optionText} deckCards={safeCards} />
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
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
                        suggestions: auditResult.suggestions.filter((_, i) => selectedSuggestions.has(i)).map(sug => {
                          const originalIndex = auditResult.suggestions.indexOf(sug);
                          if (sug.addOptions && sug.addOptions.length > 0) {
                            const chosenIndex = selectedDropdownOptions[originalIndex] || 0;
                            return {
                              ...sug,
                              adds: sug.addOptions[chosenIndex]
                            };
                          }
                          return sug;
                        }),
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