import React, { useState, useEffect, useRef } from 'react';
import { Lock, Star, Sparkles, AlertCircle, Plus, X, ShieldCheck, RefreshCw, Search, Check, Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { searchCards } from '../../services/dbIngestor';

/**
 * Autocomplete Input con búsqueda en tiempo real sobre la Base de Datos Local de Magic
 */
function CardAutocompleteInput({
  placeholder = "Buscar carta en la base de datos...",
  onSelectCard,
  allCards = [],
  selectedFormat = 'MODERN',
  accentColor = 'amber'
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);

  // Búsqueda reactiva en tiempo real
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        let results = [];
        // 1. Si allCards está en memoria, filtrar inmediatamente
        if (Array.isArray(allCards) && allCards.length > 0) {
          const lower = trimmed.toLowerCase();
          results = allCards
            .filter(c => c && c.name && c.name.toLowerCase().includes(lower))
            .slice(0, 8);
        } else {
          // 2. Si no, consultar IndexedDB a través de searchCards
          results = await searchCards(trimmed, 8, selectedFormat || 'MODERN');
        }

        if (isMounted) {
          setSuggestions(results);
          setIsOpen(results.length > 0);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.warn("Error en autocomplete de cartas:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [query, allCards, selectedFormat]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (cardName) => {
    if (!cardName) return;
    onSelectCard?.(cardName);
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) {
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        handleSelect(suggestions[selectedIndex].name);
      } else if (query.trim()) {
        // Si hay una coincidencia exacta o primera sugerencia, usarla
        if (suggestions.length > 0) {
          handleSelect(suggestions[0].name);
        } else {
          handleSelect(query.trim());
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isRose = accentColor === 'rose';

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "w-full text-xs px-3 py-2 pl-8 rounded-xl bg-stone-950/80 border text-stone-200 placeholder-stone-500 focus:outline-none transition-all shadow-inner",
              isRose
                ? "border-rose-500/40 focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30"
                : "border-amber-500/40 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30"
            )}
          />
          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (suggestions.length > 0) {
              handleSelect(suggestions[0].name);
            } else if (query.trim()) {
              handleSelect(query.trim());
            }
          }}
          disabled={!query.trim()}
          className={cn(
            "p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center shrink-0 border disabled:opacity-40 disabled:cursor-not-allowed",
            isRose
              ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border-rose-500/40"
              : "bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/40"
          )}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl bg-stone-950/95 border border-stone-700/80 shadow-2xl backdrop-blur-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-stone-800/60">
          {suggestions.map((card, idx) => {
            const isHighlighted = idx === selectedIndex;
            return (
              <div
                key={card.id || card.name}
                onClick={() => handleSelect(card.name)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={cn(
                  "p-2.5 cursor-pointer transition-colors flex items-center justify-between gap-2 text-xs",
                  isHighlighted
                    ? (isRose ? "bg-rose-500/20 text-rose-100" : "bg-amber-500/20 text-amber-100")
                    : "hover:bg-stone-900 text-stone-300"
                )}
              >
                <div className="flex flex-col min-w-0">
                  <div className="font-bold flex items-center gap-1.5 truncate">
                    <span>{card.name}</span>
                    {card.mana_cost && (
                      <span className="text-[10px] font-mono opacity-80 shrink-0 text-amber-300">
                        {card.mana_cost}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-stone-500 truncate">
                    {card.type_line || 'Carta de Magic'}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0 font-mono text-[9px]">
                  {card.rarity && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-400 uppercase">
                      {card.rarity.slice(0, 1)}
                    </span>
                  )}
                  {card.set && (
                    <span className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-500 uppercase">
                      {card.set}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function TripartiteConstraintsManager({
  tripartiteConstraints = { hard: [], preferred: [], open: true },
  softPreferences = { likedCards: [], avoidedCards: [] },
  strategicFreedom = { discoverSynergies: true, allowSubArchetypePivot: true, reformulateIfRefuted: true, allowOffTribe: false },
  thesisRefutationPolicy = 'REFORMULATE_IF_BETTER',
  allCards = [],
  selectedFormat = 'MODERN',
  onTripartiteChange,
  onSoftPreferencesChange,
  onStrategicFreedomChange,
  onRefutationPolicyChange,
  className
}) {
  const handleAddLikedCard = (cardName) => {
    if (!cardName) return;
    const current = softPreferences.likedCards || [];
    if (!current.includes(cardName)) {
      onSoftPreferencesChange?.({
        ...softPreferences,
        likedCards: [...current, cardName]
      });
    }
  };

  const handleRemoveLikedCard = (cardName) => {
    const current = softPreferences.likedCards || [];
    onSoftPreferencesChange?.({
      ...softPreferences,
      likedCards: current.filter(c => c !== cardName)
    });
  };

  const handleAddAvoidedCard = (cardName) => {
    if (!cardName) return;
    const current = softPreferences.avoidedCards || [];
    if (!current.includes(cardName)) {
      onSoftPreferencesChange?.({
        ...softPreferences,
        avoidedCards: [...current, cardName]
      });
    }
  };

  const handleRemoveAvoidedCard = (cardName) => {
    const current = softPreferences.avoidedCards || [];
    onSoftPreferencesChange?.({
      ...softPreferences,
      avoidedCards: current.filter(c => c !== cardName)
    });
  };

  const handleToggleFreedom = (field) => {
    onStrategicFreedomChange?.({
      ...strategicFreedom,
      [field]: !strategicFreedom[field]
    });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* ── 1. ESQUEMA TRIPARTITO: HARD / PREFERRED / DISCOVERY ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BLOQUE HARD */}
        <div className="p-4 md:p-5 rounded-2xl bg-stone-900/90 border border-red-500/30 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-red-500/20 pb-2">
              <Lock className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-red-300">
                🔒 HARD — Inviolables
              </h4>
            </div>
            <p className="text-[11px] text-stone-400 leading-tight">
              Restricciones innegociables. El compilador jamás violará estas reglas:
            </p>
            <ul className="text-[11px] space-y-2 font-mono text-stone-300">
              <li className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Identidad de Colores
              </li>
              <li className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Tamaño Exacto de Mazo
              </li>
              <li className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Legalidad en Formato
              </li>
              <li className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" /> Máximo 4 Copias (o 1x)
              </li>
            </ul>
          </div>
        </div>

        {/* BLOQUE PREFERRED (SOFT) CON BUSCADOR INTELIGENTE */}
        <div className="p-4 md:p-5 rounded-2xl bg-stone-900/90 border border-amber-500/40 shadow-xl space-y-4 md:col-span-1">
          <div className="flex items-center gap-2 border-b border-amber-500/20 pb-2">
            <Star className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
              ⭐ PREFERRED — Señales Blandas
            </h4>
          </div>
          <p className="text-[11px] text-stone-400 leading-tight">
            Cartas y estilos preferidos. El motor intentará incluirlos salvo que degraden el WinPath:
          </p>
          
          {/* Sección 1: Me gustaría ver (Liked Cards) con Autocomplete */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                ME GUSTARÍA VER:
              </span>
              <span className="text-[9.5px] font-mono text-stone-500">
                {(softPreferences.likedCards || []).length} seleccionadas
              </span>
            </div>

            <CardAutocompleteInput
              placeholder="Buscar carta para incluir (ej. Lightning Bolt)..."
              onSelectCard={handleAddLikedCard}
              allCards={allCards}
              selectedFormat={selectedFormat}
              accentColor="amber"
            />

            {/* Chips de Cartas Gustadas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(softPreferences.likedCards || []).map((card) => (
                <span
                  key={card}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200 shadow-sm"
                >
                  <span className="font-semibold">{card}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLikedCard(card)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Sección 2: Preferiría evitar (Avoided Cards) con Autocomplete */}
          <div className="space-y-2 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                PREFERIRÍA EVITAR:
              </span>
              <span className="text-[9.5px] font-mono text-stone-500">
                {(softPreferences.avoidedCards || []).length} descartadas
              </span>
            </div>

            <CardAutocompleteInput
              placeholder="Buscar carta a evitar (ej. Blood Moon)..."
              onSelectCard={handleAddAvoidedCard}
              allCards={allCards}
              selectedFormat={selectedFormat}
              accentColor="rose"
            />

            {/* Chips de Cartas Evitadas */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(softPreferences.avoidedCards || []).map((card) => (
                <span
                  key={card}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-500/40 text-xs text-rose-200 shadow-sm"
                >
                  <span className="font-semibold">{card}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAvoidedCard(card)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* BLOQUE DISCOVERY / LIBERTAD */}
        <div className="p-4 md:p-5 rounded-2xl bg-stone-900/90 border border-cyan-500/30 shadow-xl space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300">
                🧠 DISCOVERY — Libertad del Motor
              </h4>
            </div>
            <p className="text-[11px] text-stone-400 leading-tight">
              Autonomía para descubrir y optimizar:
            </p>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer p-2 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={strategicFreedom.discoverSynergies ?? true}
                  onChange={() => handleToggleFreedom('discoverSynergies')}
                  className="w-4 h-4 rounded bg-stone-800 text-cyan-500 focus:ring-0 accent-cyan-500"
                />
                <span>Descubrir nuevas sinergias</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer p-2 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={strategicFreedom.allowSubArchetypePivot ?? true}
                  onChange={() => handleToggleFreedom('allowSubArchetypePivot')}
                  className="w-4 h-4 rounded bg-stone-800 text-cyan-500 focus:ring-0 accent-cyan-500"
                />
                <span>Pivotar sub-arquetipo si hay evidencia</span>
              </label>
              <label className="flex items-center gap-2.5 text-xs text-stone-300 cursor-pointer p-2 rounded-xl bg-stone-950/60 border border-stone-800 hover:border-cyan-500/40 transition-colors">
                <input
                  type="checkbox"
                  checked={strategicFreedom.allowOffTribe ?? false}
                  onChange={() => handleToggleFreedom('allowOffTribe')}
                  className="w-4 h-4 rounded bg-stone-800 text-cyan-500 focus:ring-0 accent-cyan-500"
                />
                <span>Permitir bombas fuera de tribu</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. PREGUNTA CRÍTICA: GESTIÓN DE REFUTACIÓN DE TESIS ── */}
      <div className="p-4 md:p-5 rounded-2xl bg-stone-900/90 border border-stone-700/60 shadow-xl space-y-3">
        <div className="flex items-center gap-2 text-stone-200">
          <RefreshCw className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-amber-200">
            ¿Qué debe hacer el motor si la evidencia refuta tu idea inicial?
          </h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onRefutationPolicyChange?.('MAINTAIN_SUBOPTIMAL')}
            className={cn(
              "p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between",
              thesisRefutationPolicy === 'MAINTAIN_SUBOPTIMAL'
                ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/40"
                : "bg-stone-800/60 border-stone-700/60 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            )}
          >
            <span className="font-bold">○ Respetar mi estrategia</span>
            <span className="text-[10px] text-stone-500 mt-1">Mantener la tesis aunque el pool demuestre que es subóptima.</span>
          </button>

          <button
            type="button"
            onClick={() => onRefutationPolicyChange?.('WARN_USER')}
            className={cn(
              "p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between",
              thesisRefutationPolicy === 'WARN_USER'
                ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/40"
                : "bg-stone-800/60 border-stone-700/60 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            )}
          >
            <span className="font-bold">○ Avisarme y proponer</span>
            <span className="text-[10px] text-stone-500 mt-1">Notificar en el paso de contrato y ofrecer alternativas.</span>
          </button>

          <button
            type="button"
            onClick={() => onRefutationPolicyChange?.('REFORMULATE_IF_BETTER')}
            className={cn(
              "p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between",
              thesisRefutationPolicy === 'REFORMULATE_IF_BETTER'
                ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/40"
                : "bg-stone-800/60 border-stone-700/60 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            )}
          >
            <span className="font-bold">● Reformular automáticamente</span>
            <span className="text-[10px] text-stone-500 mt-1">Adoptar la línea superior si la evidencia mejora el resultado.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
