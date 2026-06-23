import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../utils/cn';
import { 
  Trash2, Plus, Minus, Save, Download, Upload, Share2, 
  RotateCcw, RotateCw, Printer, Search, Check, AlertTriangle, 
  Info, Sparkles, AlertCircle, Copy, FileText, CheckCircle2, 
  ChevronDown, ArrowRightLeft, BookOpen, Layers, DollarSign,
  ChevronRight, RefreshCw, X, HelpCircle
} from 'lucide-react';
import { vibrateTouch } from '../utils/haptic';
import { useIsMobile } from '../hooks/useIsMobile';
import CardSearch from '../components/forge/CardSearch';
import ManaCurve from '../components/forge/ManaCurve';
import ManaOrb from '../components/atoms/ManaOrb';
import { RenderManaCost } from '../components/forge/ForgeForm';
import { 
  BATTLEBOX_ARCHETYPES, BATTLEBOX_VETOS, BANLIST_SUBSTITUTIONS, COLORS
} from '../constants/legacyBattleBox';
import { BLUEPRINTS, getFormatAdjustedBlueprint } from '../constants/blueprintTemplates';
import { 
  archiveDeck, updateArchivedDeck, getArchivedDecks, archiveDeckOnline 
} from '../services/archiveService';
import { 
  hydrateDeckCards, buscarCartasEnBibliotecaTool 
} from '../services/cardHydrator';

// Objetos estáticos para tierras básicas para evitar peticiones constantes a Scryfall
const BASIC_LANDS = {
  Plains: {
    name: "Plains",
    type_line: "Basic Land — Plains",
    rarity: "common",
    oracle_text: "({T}: Add {W}.)",
    mana_value: 0,
    mana_cost: "",
    color_identity: ["W"],
    produced_mana: ["W"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/a/e/aeb1f486-13a5-4bf7-bf98-251c6c5a5ad2.jpg",
      normal: "https://cards.scryfall.io/normal/front/a/e/aeb1f486-13a5-4bf7-bf98-251c6c5a5ad2.jpg"
    }
  },
  Island: {
    name: "Island",
    type_line: "Basic Land — Island",
    rarity: "common",
    oracle_text: "({T}: Add {U}.)",
    mana_value: 0,
    mana_cost: "",
    color_identity: ["U"],
    produced_mana: ["U"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg",
      normal: "https://cards.scryfall.io/normal/front/1/2/12f2c1ff-b8dc-4c49-be72-132d78dfbc49.jpg"
    }
  },
  Swamp: {
    name: "Swamp",
    type_line: "Basic Land — Swamp",
    rarity: "common",
    oracle_text: "({T}: Add {B}.)",
    mana_value: 0,
    mana_cost: "",
    color_identity: ["B"],
    produced_mana: ["B"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/d/c/dc97f262-3ee3-49df-8e7c-cecb018ebdf5.jpg",
      normal: "https://cards.scryfall.io/normal/front/d/c/dc97f262-3ee3-49df-8e7c-cecb018ebdf5.jpg"
    }
  },
  Mountain: {
    name: "Mountain",
    type_line: "Basic Land — Mountain",
    rarity: "common",
    oracle_text: "({T}: Add {R}.)",
    mana_value: 0,
    mana_cost: "",
    color_identity: ["R"],
    produced_mana: ["R"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/2/a/2ae15a3b-252a-43eb-8e50-705bf12467d1.jpg",
      normal: "https://cards.scryfall.io/normal/front/2/a/2ae15a3b-252a-43eb-8e50-705bf12467d1.jpg"
    }
  },
  Forest: {
    name: "Forest",
    type_line: "Basic Land — Forest",
    rarity: "common",
    oracle_text: "({T}: Add {G}.)",
    mana_value: 0,
    mana_cost: "",
    color_identity: ["G"],
    produced_mana: ["G"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/8/b/8b2d7e98-333e-4fb6-91f0-085e6b1f24d3.jpg",
      normal: "https://cards.scryfall.io/normal/front/8/b/8b2d7e98-333e-4fb6-91f0-085e6b1f24d3.jpg"
    }
  },
  Wastes: {
    name: "Wastes",
    type_line: "Basic Land",
    rarity: "common",
    oracle_text: "{T}: Add {C}.",
    mana_value: 0,
    mana_cost: "",
    color_identity: [],
    produced_mana: ["C"],
    category: "Land",
    legalities: { standard: "legal", pioneer: "legal", modern: "legal", legacy: "legal" },
    prices: { usd: "0.05" },
    image_uris: {
      small: "https://cards.scryfall.io/small/front/d/e/de80f2d4-3453-4876-88ab-d21c322b7941.jpg",
      normal: "https://cards.scryfall.io/normal/front/d/e/de80f2d4-3453-4876-88ab-d21c322b7941.jpg"
    }
  }
};

const ROLES = [
  { id: 'generic', label: '📖 Genérico' },
  { id: 'removal', label: '🗡️ Remoción' },
  { id: 'payoff', label: '🎯 Payoff' },
  { id: 'engine', label: '⚙️ Motor' },
  { id: 'tutor', label: '📚 Tutor' },
  { id: 'protection', label: '🛡️ Protección' },
  { id: 'ramp', label: '⚡ Acelerador' },
  { id: 'cantrip', label: '🔁 Cantrip' },
];

export default function DeckBuilder() {
  const isMobile = useIsMobile();
  const { activeDeck, setActiveDeck } = useAppStore();

  // Estados de construcción del mazo
  const [mainboard, setMainboard] = useState([]);
  const [sideboard, setSideboard] = useState([]);
  const [maybeboard, setMaybeboard] = useState([]);
  const [deckMeta, setDeckMeta] = useState({
    id: '',
    name: '',
    archetype: 'midrange',
    format: 'MODERN',
    colors: [],
    lore: '',
    tribal: ''
  });

  // Configuración de interfaz
  const [addTarget, setAddTarget] = useState('main'); // 'main' | 'side' | 'maybe'
  const [activeTab, setActiveTab] = useState('main'); // 'main' | 'side' | 'maybe'
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'search' | 'stats'
  const [inDeckFilter, setInDeckFilter] = useState('');
  const [priceModeFoil, setPriceModeFoil] = useState(false);
  const [activeMobileOverlay, setActiveMobileOverlay] = useState(null);
  const [previewCard, setPreviewCard] = useState(null);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [expandedCols, setExpandedCols] = useState({
    '0': false,
    '1': false,
    '2': false,
    '3': false,
    '4': false,
    '5+': false,
    'Tierras': true
  });

  const toggleCol = (key) => {
    setExpandedCols(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleFlipCard = (cardName) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardName)) next.delete(cardName);
      else next.add(cardName);
      return next;
    });
  };

  // Modales y procesos
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('arena');
  const [saveStatus, setSaveStatus] = useState({ show: false, success: false, message: '' });
  const [showTribeSuggestion, setShowTribeSuggestion] = useState(null); // tribe name

  // Asistente IA (Oráculo)
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleSuggestions, setOracleSuggestions] = useState([]);
  const [selectedOracleCmc, setSelectedOracleCmc] = useState(null);

  // Historial (Undo / Redo)
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Carga rápida
  const [archivedList, setArchivedList] = useState([]);

  // Carga de mazos locales para el selector de carga rápida
  const refreshArchivedList = () => {
    setArchivedList(getArchivedDecks());
  };

  useEffect(() => {
    refreshArchivedList();
  }, []);

  // Cargar mazo de useAppStore (cuando venimos de DeckArchive con "Editar")
  useEffect(() => {
    if (activeDeck) {
      const deckCopy = JSON.parse(JSON.stringify(activeDeck));
      setMainboard(deckCopy.cards || []);
      setSideboard(deckCopy.sideboard || []);
      setMaybeboard(deckCopy.maybeboard || []);
      setDeckMeta({
        id: deckCopy.id || '',
        name: deckCopy.name || '',
        archetype: deckCopy.archetype || 'midrange',
        format: deckCopy.format || 'MODERN',
        colors: deckCopy.colors || [],
        lore: deckCopy.lore || '',
        tribal: deckCopy.tribal || ''
      });
      // Inicializar historial con este estado inicial
      const snapshot = {
        mainboard: deckCopy.cards || [],
        sideboard: deckCopy.sideboard || [],
        maybeboard: deckCopy.maybeboard || []
      };
      setHistory([snapshot]);
      setHistoryIndex(0);
      setActiveDeck(null); // Consumir el estado global
    } else if (history.length === 0) {
      // Iniciar historial vacío
      const initial = { mainboard: [], sideboard: [], maybeboard: [] };
      setHistory([initial]);
      setHistoryIndex(0);
    }
  }, [activeDeck, setActiveDeck, history.length]);

  // Función auxiliar para registrar instantáneas en el historial
  const saveHistory = useCallback((newMain, newSide, newMaybe) => {
    const nextHistory = history.slice(0, historyIndex + 1);
    const snapshot = {
      mainboard: JSON.parse(JSON.stringify(newMain)),
      sideboard: JSON.parse(JSON.stringify(newSide)),
      maybeboard: JSON.parse(JSON.stringify(newMaybe))
    };
    const updated = [...nextHistory, snapshot].slice(-20); // Mantener 20 pasos máx.
    setHistory(updated);
    setHistoryIndex(updated.length - 1);
  }, [history, historyIndex]);

  // Deshacer / Rehacer
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      vibrateTouch();
      const prevIndex = historyIndex - 1;
      const state = history[prevIndex];
      setMainboard(state.mainboard);
      setSideboard(state.sideboard);
      setMaybeboard(state.maybeboard);
      setHistoryIndex(prevIndex);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      vibrateTouch();
      const nextIndex = historyIndex + 1;
      const state = history[nextIndex];
      setMainboard(state.mainboard);
      setSideboard(state.sideboard);
      setMaybeboard(state.maybeboard);
      setHistoryIndex(nextIndex);
    }
  }, [history, historyIndex]);

  // Teclado Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Contar copias en todo el mazo para validar límites de MTG
  const countCopiesInDeck = useCallback((cardName) => {
    const mainCount = mainboard.filter(c => c.name === cardName).reduce((a, b) => a + b.quantity, 0);
    const sideCount = sideboard.filter(c => c.name === cardName).reduce((a, b) => a + b.quantity, 0);
    return mainCount + sideCount;
  }, [mainboard, sideboard]);

  // Comprobar excepciones de 4 copias
  const hasNoCopyLimit = useCallback((card) => {
    if (!card) return false;
    const nameLower = card.name.toLowerCase();
    
    // Básicas ilimitadas
    if (['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(nameLower) ||
        card.type_line?.toLowerCase().includes("basic land")) {
      return true;
    }

    const text = (card.oracle_text || "").toLowerCase();
    return text.includes("a deck can have any number of cards named") ||
           text.includes("a deck can have up to seven cards named"); // Seven Dwarves
  }, []);

  // Agregar carta al mazo
  const handleAddCard = useCallback((card) => {
    vibrateTouch();
    
    // Si la carta ya está en veto extremo de BattleBox, mostramos advertencia informativa pero permitimos agregar
    const banned = BATTLEBOX_VETOS.includes(card.name);

    // Identificar tablero objetivo
    let list, setList;
    if (addTarget === 'main') {
      list = mainboard;
      setList = setMainboard;
    } else if (addTarget === 'side') {
      list = sideboard;
      setList = setSideboard;
    } else {
      list = maybeboard;
      setList = setMaybeboard;
    }

    // Validar límite de 4 copias si no es en maybeboard (el maybeboard es libre)
    if (addTarget !== 'maybe') {
      const copies = countCopiesInDeck(card.name);
      const limit = card.name.toLowerCase() === 'seven dwarves' ? 7 : 4;
      if (copies >= limit && !hasNoCopyLimit(card)) {
        alert(`Límite MTG: No puedes añadir más de ${limit} copias de "${card.name}" en tu baraja (excluyendo Maybeboard).`);
        return;
      }
    }

    // Comprobar si ya existe en la lista correspondiente para sumar cantidad
    const index = list.findIndex(c => c.name === card.name);
    let updated;
    if (index !== -1) {
      updated = [...list];
      updated[index].quantity += 1;
    } else {
      updated = [...list, { ...card, quantity: 1, role: card.role || 'generic' }];
    }

    // Guardar cambios y actualizar
    if (addTarget === 'main') {
      setList(updated);
      saveHistory(updated, sideboard, maybeboard);
    } else if (addTarget === 'side') {
      setList(updated);
      saveHistory(mainboard, updated, maybeboard);
    } else {
      setList(updated);
      saveHistory(mainboard, sideboard, updated);
    }
  }, [addTarget, mainboard, sideboard, maybeboard, countCopiesInDeck, hasNoCopyLimit, saveHistory]);

  // Remover o decrementar cantidad de cartas
  const handleRemoveCard = useCallback((cardName, zone) => {
    vibrateTouch();
    let list, setList;
    if (zone === 'main') {
      list = mainboard;
      setList = setMainboard;
    } else if (zone === 'side') {
      list = sideboard;
      setList = setSideboard;
    } else {
      list = maybeboard;
      setList = setMaybeboard;
    }

    const updated = list.map(c => {
      if (c.name === cardName) {
        return { ...c, quantity: c.quantity - 1 };
      }
      return c;
    }).filter(c => c.quantity > 0);

    setList(updated);

    if (zone === 'main') {
      saveHistory(updated, sideboard, maybeboard);
    } else if (zone === 'side') {
      saveHistory(mainboard, updated, maybeboard);
    } else {
      saveHistory(mainboard, sideboard, updated);
    }
  }, [mainboard, sideboard, maybeboard, saveHistory]);

  // Ajustar cantidad directa (+ / -)
  const handleAdjustQuantity = useCallback((cardName, zone, delta) => {
    vibrateTouch();
    let list, setList;
    if (zone === 'main') {
      list = mainboard;
      setList = setMainboard;
    } else if (zone === 'side') {
      list = sideboard;
      setList = setSideboard;
    } else {
      list = maybeboard;
      setList = setMaybeboard;
    }

    const card = list.find(c => c.name === cardName);
    if (!card) return;

    const currentQty = card.quantity;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      handleRemoveCard(cardName, zone);
      return;
    }

    // Si aumentamos cantidad (+1), validar reglas
    if (delta > 0 && zone !== 'maybe') {
      const copies = countCopiesInDeck(cardName);
      const limit = cardName.toLowerCase() === 'seven dwarves' ? 7 : 4;
      if (copies >= limit && !hasNoCopyLimit(card)) {
        alert(`Límite MTG: No puedes añadir más de ${limit} copias de "${cardName}".`);
        return;
      }
    }

    const updated = list.map(c => {
      if (c.name === cardName) {
        return { ...c, quantity: newQty };
      }
      return c;
    });

    setList(updated);

    if (zone === 'main') {
      saveHistory(updated, sideboard, maybeboard);
    } else if (zone === 'side') {
      saveHistory(mainboard, updated, maybeboard);
    } else {
      saveHistory(mainboard, sideboard, updated);
    }
  }, [mainboard, sideboard, maybeboard, countCopiesInDeck, hasNoCopyLimit, handleRemoveCard, saveHistory]);

  // Cambiar rol de una carta
  const handleChangeRole = useCallback((cardName, newRole) => {
    vibrateTouch();
    const updated = mainboard.map(c => {
      if (c.name === cardName) {
        return { ...c, role: newRole };
      }
      return c;
    });
    setMainboard(updated);
    saveHistory(updated, sideboard, maybeboard);
  }, [mainboard, sideboard, maybeboard, saveHistory]);

  // Mover carta entre zonas
  const handleMoveCard = useCallback((card, fromZone, toZone) => {
    vibrateTouch();
    // 1. Eliminar de la zona de origen
    let srcList;
    if (fromZone === 'main') srcList = mainboard;
    else if (fromZone === 'side') srcList = sideboard;
    else srcList = maybeboard;

    const cleanSrc = srcList.map(c => {
      if (c.name === card.name) return { ...c, quantity: c.quantity - 1 };
      return c;
    }).filter(c => c.quantity > 0);

    // 2. Añadir a la zona de destino
    let dstList;
    if (toZone === 'main') dstList = mainboard;
    else if (toZone === 'side') dstList = sideboard;
    else dstList = maybeboard;

    // Si la zona destino tiene límite (main o side), verificar
    if (toZone !== 'maybe') {
      const copies = countCopiesInDeck(card.name);
      // Al mover de una zona a otra, no estamos cambiando el total neto si el origen
      // también es parte de main/side. Pero por seguridad validamos contra el límite
      const limit = card.name.toLowerCase() === 'seven dwarves' ? 7 : 4;
      
      // Si la baraja de origen era maybeboard, sí incrementamos el total. Validamos:
      if (fromZone === 'maybe' && copies >= limit && !hasNoCopyLimit(card)) {
        alert(`Límite MTG: No puedes añadir más de ${limit} copias de "${card.name}" en tu baraja.`);
        return;
      }
    }

    const index = dstList.findIndex(c => c.name === card.name);
    let cleanDst = [...dstList];
    if (index !== -1) {
      cleanDst[index].quantity += 1;
    } else {
      cleanDst.push({ ...card, quantity: 1 });
    }

    // 3. Guardar en los estados correspondientes
    let nextMain = mainboard;
    let nextSide = sideboard;
    let nextMaybe = maybeboard;

    if (fromZone === 'main') nextMain = cleanSrc;
    else if (fromZone === 'side') nextSide = cleanSrc;
    else nextMaybe = cleanSrc;

    if (toZone === 'main') nextMain = cleanDst;
    else if (toZone === 'side') nextSide = cleanDst;
    else nextMaybe = cleanDst;

    setMainboard(nextMain);
    setSideboard(nextSide);
    setMaybeboard(nextMaybe);

    saveHistory(nextMain, nextSide, nextMaybe);
  }, [mainboard, sideboard, maybeboard, countCopiesInDeck, hasNoCopyLimit, saveHistory]);

  // Vaciar mazo completo
  const handleClearAll = () => {
    if (confirm('¿Seguro que quieres vaciar todo tu mazo y empezar de cero?')) {
      vibrateTouch();
      setMainboard([]);
      setSideboard([]);
      setMaybeboard([]);
      setDeckMeta({
        id: '',
        name: '',
        archetype: 'midrange',
        format: 'MODERN',
        colors: [],
        lore: '',
        tribal: ''
      });
      saveHistory([], [], []);
    }
  };

  // Duplicar mazo
  const handleDuplicate = () => {
    vibrateTouch();
    const newName = prompt('Introduce el nombre de la copia:', `Copia de ${deckMeta.name || 'Sin Nombre'}`);
    if (!newName) return;

    const data = {
      name: newName,
      archetype: deckMeta.archetype,
      format: deckMeta.format,
      colors: deckMeta.colors,
      lore: deckMeta.lore,
      tribal: deckMeta.tribal,
      cards: mainboard,
      sideboard: sideboard,
      maybeboard: maybeboard,
      source: 'manual'
    };

    const success = archiveDeck(data);
    if (success) {
      alert('¡Mazo duplicado con éxito en tu Archivo local!');
      refreshArchivedList();
    } else {
      alert('Error al duplicar el mazo.');
    }
  };

  // Compartir en Comunidad
  const handleShareCommunity = async () => {
    vibrateTouch();
    if (!deckMeta.name) {
      alert('Se requiere un nombre para publicar el mazo en Comunidad.');
      return;
    }
    const totalMain = mainboard.reduce((sum, c) => sum + c.quantity, 0);
    if (totalMain < 60) {
      if (!confirm(`El mazo tiene ${totalMain} cartas (mínimo de 60 requerido). ¿Seguro que quieres publicarlo incompleto?`)) {
        return;
      }
    }

    const data = {
      name: deckMeta.name,
      archetype: deckMeta.archetype,
      format: deckMeta.format,
      colors: deckMeta.colors,
      lore: deckMeta.lore,
      tribal: deckMeta.tribal,
      cards: mainboard,
      sideboard: sideboard,
      maybeboard: maybeboard,
      source: 'manual'
    };

    setIsImporting(true); // Usamos loader visual
    const success = await archiveDeckOnline(data);
    setIsImporting(false);

    if (success) {
      alert('🔮 ¡Tu mazo ha sido canalizado a la Comunidad con éxito!');
    } else {
      alert('Error al subir el mazo. Revisa que Firebase esté configurado o tu conexión.');
    }
  };

  // Guardar mazo en LocalStorage
  const handleSaveDeck = () => {
    vibrateTouch();
    if (!deckMeta.name.trim()) {
      setSaveStatus({ show: true, success: false, message: 'El mazo requiere un nombre antes de archivar.' });
      setTimeout(() => setSaveStatus({ show: false, success: false, message: '' }), 4000);
      return;
    }

    const data = {
      name: deckMeta.name,
      archetype: deckMeta.archetype,
      format: deckMeta.format,
      colors: deckMeta.colors,
      lore: deckMeta.lore,
      tribal: deckMeta.tribal,
      cards: mainboard,
      sideboard: sideboard,
      maybeboard: maybeboard,
      source: 'manual'
    };

    let success = false;
    if (deckMeta.id) {
      success = updateArchivedDeck(deckMeta.id, data);
    } else {
      success = archiveDeck(data);
    }

    if (success) {
      setSaveStatus({ show: true, success: true, message: `Mazo "${deckMeta.name}" guardado exitosamente en el Archivo.` });
      refreshArchivedList();
      // Si era un mazo nuevo, obtener su ID guardado del archivo
      if (!deckMeta.id) {
        const archived = getArchivedDecks();
        const saved = archived.find(d => d.name === deckMeta.name);
        if (saved) {
          setDeckMeta(prev => ({ ...prev, id: saved.id }));
        }
      }
    } else {
      setSaveStatus({ show: true, success: false, message: 'Error de almacenamiento al guardar el mazo.' });
    }
    setTimeout(() => setSaveStatus({ show: false, success: false, message: '' }), 4000);
  };

  // Cargar mazo directamente desde el selector interno de DeckBuilder
  const handleQuickLoad = (id) => {
    if (!id) return;
    vibrateTouch();
    const archived = getArchivedDecks();
    const deck = archived.find(d => d.id === id);
    if (deck) {
      const deckCopy = JSON.parse(JSON.stringify(deck));
      setMainboard(deckCopy.cards || []);
      setSideboard(deckCopy.sideboard || []);
      setMaybeboard(deckCopy.maybeboard || []);
      setDeckMeta({
        id: deckCopy.id || '',
        name: deckCopy.name || '',
        archetype: deckCopy.archetype || 'midrange',
        format: deckCopy.format || 'MODERN',
        colors: deckCopy.colors || [],
        lore: deckCopy.lore || '',
        tribal: deckCopy.tribal || ''
      });
      // Inicializar historial con este estado
      const snapshot = {
        mainboard: deckCopy.cards || [],
        sideboard: deckCopy.sideboard || [],
        maybeboard: deckCopy.maybeboard || []
      };
      setHistory([snapshot]);
      setHistoryIndex(0);
    }
  };

  // Inyectar Tierras Básicas rápidamente
  const handleAddBasicLand = (landName, count) => {
    vibrateTouch();
    const landTemplate = BASIC_LANDS[landName];
    if (!landTemplate) return;

    let list, setList;
    if (addTarget === 'main') {
      list = mainboard;
      setList = setMainboard;
    } else if (addTarget === 'side') {
      list = sideboard;
      setList = setSideboard;
    } else {
      list = maybeboard;
      setList = setMaybeboard;
    }

    const index = list.findIndex(c => c.name === landName);
    let updated = [...list];
    if (index !== -1) {
      updated[index].quantity += count;
    } else {
      updated.push({ ...landTemplate, quantity: count });
    }

    setList(updated);

    if (addTarget === 'main') {
      saveHistory(updated, sideboard, maybeboard);
    } else if (addTarget === 'side') {
      saveHistory(mainboard, updated, maybeboard);
    } else {
      saveHistory(mainboard, sideboard, updated);
    }
  };

  // Importación desde lista de texto
  const handleImportText = async (text) => {
    setIsImporting(true);
    setImportProgress(0);
    
    // Parseo de líneas de texto de MTG
    const lines = text.split('\n');
    const mainList = [];
    const sideList = [];
    let isSideSection = false;

    // Regla de parseo: "4 Lightning Bolt" o "4x Lightning Bolt" o "Lightning Bolt x4"
    const countRegex = /^\s*(\d+)x?\s+(.+)$/;
    const countRegexReverse = /^\s*(.+?)\s+x\s*(\d+)\s*$/;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const lineLower = line.toLowerCase();
      // Separador de Sideboard / Banquillo
      if (['sideboard', 'sb:', 'banquillo', 'deck side'].includes(lineLower)) {
        isSideSection = true;
        continue;
      }

      // Limpiar set code como "(M11) 146"
      let cleanLine = line.replace(/\([^)]+\)\s*\d*/g, '').trim();

      let qty = 1;
      let cardName = cleanLine;

      let match = cleanLine.match(countRegex);
      if (match) {
        qty = parseInt(match[1], 10);
        cardName = match[2].trim();
      } else {
        match = cleanLine.match(countRegexReverse);
        if (match) {
          cardName = match[1].trim();
          qty = parseInt(match[2], 10);
        }
      }

      // Si es una tierra básica genérica, la mapeamos al template estático directamente
      const baseNameTitle = cardName.charAt(0).toUpperCase() + cardName.slice(1).toLowerCase();
      if (BASIC_LANDS[baseNameTitle]) {
        const land = { ...BASIC_LANDS[baseNameTitle], quantity: qty };
        if (isSideSection) sideList.push(land);
        else mainList.push(land);
        continue;
      }

      const item = { name: cardName, quantity: qty };
      if (isSideSection) {
        sideList.push(item);
      } else {
        mainList.push(item);
      }
    }

    try {
      const combined = [
        ...mainList.map(c => ({ ...c, zone: 'main' })),
        ...sideList.map(c => ({ ...c, zone: 'side' }))
      ];

      const hydrated = await hydrateDeckCards(combined, (current, total) => {
        setImportProgress(Math.round((current / total) * 100));
      });

      const newMain = hydrated.filter(c => c.zone === 'main').map(({ zone, ...rest }) => rest);
      const newSide = hydrated.filter(c => c.zone === 'side').map(({ zone, ...rest }) => rest);

      setMainboard(newMain);
      setSideboard(newSide);
      setMaybeboard([]);
      saveHistory(newMain, newSide, []);
      setImportModalOpen(false);
      setImportText('');
    } catch (err) {
      console.error(err);
      alert('Error en el proceso de hidratación. Revisa la conexión y el formato.');
    } finally {
      setIsImporting(false);
    }
  };

  // Exportar mazo como texto
  const generateExportText = () => {
    let mainLines = mainboard.map(c => `${c.quantity} ${c.name}`);
    let sideLines = sideboard.map(c => `${c.quantity} ${c.name}`);

    if (exportFormat === 'forge') {
      return [
        `[metadata]`,
        `Name=${deckMeta.name || 'Grimorio Manual'}`,
        `Archetype=${deckMeta.archetype}`,
        `[main]`,
        ...mainboard.map(c => `${c.quantity} ${c.name}`),
        sideboard.length ? '[sideboard]' : '',
        ...sideboard.map(c => `${c.quantity} ${c.name}`)
      ].filter(Boolean).join('\n');
    }

    if (exportFormat === 'arena') {
      return [
        ...mainLines,
        sideboard.length ? '\nSideboard' : '',
        ...sideLines
      ].filter(Boolean).join('\n');
    }

    // Default txt simple
    return [
      `Mazo Principal:`,
      ...mainLines,
      sideboard.length ? `\nSideboard:` : '',
      ...sideLines
    ].filter(Boolean).join('\n');
  };

  const handleCopyClipboard = () => {
    vibrateTouch();
    navigator.clipboard.writeText(generateExportText());
    alert('¡Copiado al portapapeles!');
  };

  const handleDownloadFile = () => {
    vibrateTouch();
    const element = document.createElement("a");
    const file = new Blob([generateExportText()], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `${deckMeta.name || 'grimorio_manual'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Impresión de lista limpia
  const handlePrintList = () => {
    const printWindow = window.open('', '_blank');
    const grouped = groupByCategory(mainboard);
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Mazo - ${deckMeta.name || 'Sin Nombre'}</title>
          <style>
            body { font-family: 'Cinzel', Georgia, serif; color: #111; padding: 40px; background-color: #faf8f5; }
            h1 { border-bottom: 3px double #c19b45; padding-bottom: 10px; margin-bottom: 5px; color: #8a6a24; }
            .meta { margin-bottom: 30px; font-size: 13px; color: #666; font-style: italic; }
            .section { margin-bottom: 25px; page-break-inside: avoid; }
            .section-title { font-size: 18px; font-weight: bold; border-bottom: 1px solid #c19b45; padding-bottom: 4px; margin-bottom: 12px; color: #8a6a24; }
            .card-row { display: flex; justify-content: space-between; font-size: 14px; margin-bottom: 6px; font-family: sans-serif; }
            .qty { font-weight: bold; width: 40px; color: #111; }
            .name { flex-grow: 1; color: #222; }
            .price { color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${deckMeta.name || 'Grimorio sin Nombre'}</h1>
          <div class="meta">
            Arquetipo: ${deckMeta.archetype.toUpperCase()} | Formato: ${deckMeta.format} | Colores: ${deckMeta.colors.join(', ')}
            ${deckMeta.lore ? `<br/>"${deckMeta.lore}"` : ''}
          </div>
          
          <div class="section">
            <div class="section-title">Mazo Principal (${mainboard.reduce((a,b)=>a+b.quantity, 0)} cartas)</div>
            ${Object.entries(grouped).map(([category, cards]) => `
              <div style="margin-bottom: 15px;">
                <strong style="font-size: 11px; text-transform: uppercase; color: #777; display: block; border-bottom: 1px dashed #ddd; margin-bottom: 5px;">${category} (${cards.reduce((sum,c)=>sum+c.quantity,0)})</strong>
                ${cards.map(c => `
                  <div class="card-row">
                    <span class="qty">${c.quantity}x</span>
                    <span class="name">${c.name}</span>
                    <span class="price">${c.prices?.usd ? `$${(Number(c.prices.usd) * c.quantity).toFixed(2)}` : ''}</span>
                  </div>
                `).join('')}
              </div>
            `).join('')}
          </div>

          ${sideboard.length ? `
          <div class="section">
            <div class="section-title">Sideboard (${sideboard.reduce((a,b)=>a+b.quantity, 0)} cartas)</div>
            ${sideboard.map(c => `
              <div class="card-row">
                <span class="qty">${c.quantity}x</span>
                <span class="name">${c.name}</span>
                <span class="price">${c.prices?.usd ? `$${(Number(c.prices.usd) * c.quantity).toFixed(2)}` : ''}</span>
              </div>
            `).join('')}
          </div>
          ` : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Impresión de Proxies (3x3 en A4, tamaño real MTG: 63mm x 88mm)
  const handlePrintProxies = () => {
    vibrateTouch();
    const images = [];
    mainboard.forEach(c => {
      const imgUrl = c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal;
      if (imgUrl) {
        for (let i = 0; i < c.quantity; i++) {
          images.push(imgUrl);
        }
      }
    });
    sideboard.forEach(c => {
      const imgUrl = c.image_uris?.normal || c.card_faces?.[0]?.image_uris?.normal;
      if (imgUrl) {
        for (let i = 0; i < c.quantity; i++) {
          images.push(imgUrl);
        }
      }
    });

    if (images.length === 0) {
      alert('No hay imágenes de cartas disponibles para imprimir proxies.');
      return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Proxies - ${deckMeta.name || 'Sin Nombre'}</title>
          <style>
            @page { size: A4; margin: 10mm; }
            body { margin: 0; background: #fff; display: flex; flex-wrap: wrap; justify-content: center; }
            .proxy-card { 
              width: 63mm; 
              height: 88mm; 
              margin: 1.5mm; 
              box-sizing: border-box; 
              border: 1px dashed #bbb;
              page-break-inside: avoid;
              background-color: #000;
              border-radius: 4.7%;
              overflow: hidden;
            }
            .proxy-card img { width: 100%; height: 100%; object-fit: fill; }
          </style>
        </head>
        <body>
          ${images.map(img => `<div class="proxy-card"><img src="${img}" /></div>`).join('')}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  // Agrupar cartas por tipo de carta
  const groupByCategory = (list) => {
    const groups = {};
    list.forEach(c => {
      const cat = c.category || 'Creature';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    });
    return groups;
  };

  // Filtrado local en base al input de filtro local
  const filterList = (list) => {
    if (!inDeckFilter.trim()) return list;
    const filter = inDeckFilter.toLowerCase();
    return list.filter(c => 
      c.name.toLowerCase().includes(filter) ||
      (c.type_line && c.type_line.toLowerCase().includes(filter)) ||
      (c.oracle_text && c.oracle_text.toLowerCase().includes(filter))
    );
  };

  // Estadísticas del mazo
  const totalMainCards = useMemo(() => mainboard.reduce((sum, c) => sum + c.quantity, 0), [mainboard]);
  const totalSideCards = useMemo(() => sideboard.reduce((sum, c) => sum + c.quantity, 0), [sideboard]);
  const totalMaybeCards = useMemo(() => maybeboard.reduce((sum, c) => sum + c.quantity, 0), [maybeboard]);

  // Estimador de precio (usd / usd_foil)
  const deckPriceEstimate = useMemo(() => {
    let total = 0;
    let untrackedCount = 0;

    const calculatePriceList = (list) => {
      list.forEach(c => {
        const field = priceModeFoil ? 'usd_foil' : 'usd';
        let price = c.prices?.[field];
        
        // Si no hay precio, fallback tierras básicas o $?
        if (price === undefined || price === null) {
          const isBasic = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(c.name.toLowerCase());
          if (isBasic) {
            price = 0.05;
          } else {
            price = 0;
            untrackedCount += c.quantity;
          }
        }
        total += Number(price) * c.quantity;
      });
    };

    calculatePriceList(mainboard);
    calculatePriceList(sideboard);

    return { total, untrackedCount };
  }, [mainboard, sideboard, priceModeFoil]);

  // Detección automática de tribus
  useEffect(() => {
    const creatures = mainboard.filter(c => c.category === 'Creature');
    const totalCreatures = creatures.reduce((sum, c) => sum + c.quantity, 0);

    if (totalCreatures < 6) {
      setShowTribeSuggestion(null);
      return;
    }

    const counts = {};
    creatures.forEach(c => {
      if (!c.type_line) return;
      const subtypePart = c.type_line.split(/[—–-]/)[1];
      if (!subtypePart) return;

      const subtypes = subtypePart.split(/\s+/).map(s => s.trim().replace(/[^a-zA-Z]/g, '')).filter(s => s.length > 2);
      subtypes.forEach(s => {
        const norm = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        // Filtrar clases comunes si queremos tribus de raza, o dejar libre
        counts[norm] = (counts[norm] || 0) + c.quantity;
      });
    });

    let dominant = null;
    let maxPct = 0;
    for (const [tribe, count] of Object.entries(counts)) {
      const pct = count / totalCreatures;
      if (pct >= 0.35 && pct > maxPct) {
        dominant = tribe;
        maxPct = pct;
      }
    }

    if (dominant && deckMeta.tribal !== dominant) {
      setShowTribeSuggestion(dominant);
    } else {
      setShowTribeSuggestion(null);
    }
  }, [mainboard, deckMeta.tribal]);

  const acceptTribeSuggestion = () => {
    vibrateTouch();
    setDeckMeta(prev => ({ ...prev, tribal: showTribeSuggestion }));
    setShowTribeSuggestion(null);
  };

  // Clasificar las cartas del mazo principal por Coste de Maná Convertido (CMC)
  const columnsByCmc = useMemo(() => {
    const cols = {
      '0': [],
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5+': [],
      'Tierras': []
    };

    const isLandCard = (c) => {
      if (!c) return false;
      const category = (c.category || '').toLowerCase();
      const typeLine = (c.type_line || '').toLowerCase();
      const name = (c.name || '').toLowerCase();
      return (
        category.includes('land') || 
        typeLine.includes('land') || 
        ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(name)
      );
    };

    mainboard.forEach(c => {
      if (isLandCard(c)) {
        cols['Tierras'].push(c);
      } else {
        const rawCmc = c.mana_value !== undefined ? c.mana_value : (c.cmc !== undefined ? c.cmc : 0);
        const cmc = Number(rawCmc || 0);
        if (cmc === 0) cols['0'].push(c);
        else if (cmc === 1) cols['1'].push(c);
        else if (cmc === 2) cols['2'].push(c);
        else if (cmc === 3) cols['3'].push(c);
        else if (cmc === 4) cols['4'].push(c);
        else cols['5+'].push(c);
      }
    });

    Object.keys(cols).forEach(key => {
      cols[key].sort((a, b) => a.name.localeCompare(b.name));
    });

    return cols;
  }, [mainboard]);

  // Comparador de Blueprint e IA Assistant
  const blueprint = useMemo(() => {
    return getFormatAdjustedBlueprint(deckMeta.archetype, deckMeta.format);
  }, [deckMeta.archetype, deckMeta.format]);

  const actualTypes = useMemo(() => {
    const types = { Creature: 0, Instant: 0, Sorcery: 0, Enchantment: 0, Artifact: 0, Planeswalker: 0, Land: 0 };
    mainboard.forEach(c => {
      const cat = c.category || 'Creature';
      types[cat] = (types[cat] || 0) + c.quantity;
    });
    return types;
  }, [mainboard]);

  const curveDeficits = useMemo(() => {
    if (!blueprint || !blueprint.spells || !blueprint.spells.curve) return [];

    const stats = { mv1: 0, mv2: 0, mv3: 0, mv4_plus: 0 };
    mainboard.forEach(card => {
      const type = (card.type_line || '').toLowerCase();
      if (type.includes('land')) return;

      const cmc = Number(card.mana_value || 0);
      const qty = Number(card.quantity || 1);

      if (cmc === 1) stats.mv1 += qty;
      else if (cmc === 2) stats.mv2 += qty;
      else if (cmc === 3) stats.mv3 += qty;
      else if (cmc >= 4) stats.mv4_plus += qty;
    });

    const deficits = [];
    const target = blueprint.spells.curve;

    if (stats.mv1 < target.mv1.min) deficits.push({ cmc: 1, label: 'MV1', missing: target.mv1.min - stats.mv1 });
    if (stats.mv2 < target.mv2.min) deficits.push({ cmc: 2, label: 'MV2', missing: target.mv2.min - stats.mv2 });
    if (stats.mv3 < target.mv3.min) deficits.push({ cmc: 3, label: 'MV3', missing: target.mv3.min - stats.mv3 });
    if (stats.mv4_plus < target.mv4_plus.min) deficits.push({ cmc: 4, label: 'MV4+', missing: target.mv4_plus.min - stats.mv4_plus });

    return deficits;
  }, [mainboard, blueprint]);

  const getOracleSuggestions = async (cmc) => {
    vibrateTouch();
    setSelectedOracleCmc(cmc);
    setOracleLoading(true);
    try {
      // Filtrar colores del mazo e invocar la herramienta local RAG
      const colorsFilter = deckMeta.colors.length ? deckMeta.colors.filter(c => c !== 'C') : ['W','U','B','R','G'];
      const res = await buscarCartasEnBibliotecaTool({
        colors: colorsFilter,
        max_cmc: cmc === 4 ? 6 : cmc,
        format: deckMeta.format,
        type_line: cmc === 1 ? '' : 'creature'
      });
      // Hidratar las cartas obtenidas para cargarlas con su arte/categoría
      const rawResults = res.results || [];
      const hydrated = await hydrateDeckCards(rawResults.map(c => ({ name: c.name, quantity: 1 })));
      setOracleSuggestions(hydrated);
    } catch (err) {
      console.error(err);
      setOracleSuggestions([]);
    } finally {
      setOracleLoading(false);
    }
  };

  // Fila de Carta individual
  const renderCardRow = (c, zone) => {
    const legality = getCardLegalityInfo(c, deckMeta.format);
    const hasFlip = c.card_faces && c.card_faces[0]?.image_uris;
    const isBasic = ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(c.name.toLowerCase());

    return (
      <div 
        key={`${c.name}-${zone}`} 
        className={cn(
          "flex items-center gap-3 p-3 bg-black/40 border border-white/5 hover:border-magic-gold/30 rounded-xl transition-all",
          legality.status === 'illegal' && "border-red-500/25 bg-red-950/5",
          legality.status === 'vetoed' && "border-amber-500/25 bg-amber-950/5"
        )}
      >
        {/* Imagen miniatura */}
        <div className="w-[36px] h-[50px] bg-gray-900 rounded border border-white/10 overflow-hidden flex-shrink-0">
          <img 
            src={c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small} 
            alt={c.name}
            className="w-full h-full object-fill"
          />
        </div>

        {/* Info texto */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-cinzel text-xs font-bold text-[#f4ece0] truncate max-w-[150px] md:max-w-none" title={c.name}>
              {c.name}
            </span>
            <RenderManaCost manaCost={c.mana_cost} className="scale-75 origin-left" />
            
            {/* Badges de error */}
            {legality.status === 'vetoed' && (
              <span 
                className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded cursor-help"
                title={`Recomendación: Reemplazar por "${legality.suggestion}"`}
              >
                ⚔️ Vetada
              </span>
            )}
            {legality.status === 'illegal' && (
              <span className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/30 px-1.5 py-0.5 rounded">
                🚫 Ilegal {deckMeta.format}
              </span>
            )}
          </div>
          <div className="text-[10px] text-white/40 truncate font-serif">{c.type_line}</div>
        </div>

        {/* Selector de Rol Funcional (Solo mainboard) */}
        {zone === 'main' && (
          <div className="hidden sm:block">
            <select
              value={c.role || 'generic'}
              onChange={(e) => handleChangeRole(c.name, e.target.value)}
              className="bg-black/80 border border-magic-gold/20 rounded px-1.5 py-1 text-[10px] text-[#ffca58] focus:outline-none focus:border-magic-gold/50 cursor-pointer"
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id} className="bg-black text-[#f4ece0]">
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Acciones de movimiento rápido */}
        <div className="flex items-center gap-1.5">
          {zone === 'main' && (
            <>
              <button 
                onClick={() => handleMoveCard(c, 'main', 'side')} 
                className="p-1.5 bg-white/5 hover:bg-magic-gold/10 text-magic-gold/60 hover:text-magic-gold rounded-lg border border-white/5 transition-all"
                title="Mover al Banquillo"
              >
                <ArrowRightLeft size={12} />
              </button>
            </>
          )}
          {zone === 'side' && (
            <>
              <button 
                onClick={() => handleMoveCard(c, 'side', 'main')} 
                className="p-1.5 bg-white/5 hover:bg-magic-gold/10 text-magic-gold/60 hover:text-magic-gold rounded-lg border border-white/5 transition-all"
                title="Mover al Mazo Principal"
              >
                <ArrowRightLeft size={12} className="rotate-180" />
              </button>
            </>
          )}
          {zone === 'maybe' && (
            <>
              <button 
                onClick={() => handleMoveCard(c, 'maybe', 'main')} 
                className="px-2 py-1 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-lg border border-green-500/20 text-[9px] uppercase font-bold transition-all"
              >
                + Main
              </button>
              <button 
                onClick={() => handleMoveCard(c, 'maybe', 'side')} 
                className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg border border-blue-500/20 text-[9px] uppercase font-bold transition-all"
              >
                + Side
              </button>
            </>
          )}

          {/* Cantidades +/- */}
          <div className="flex items-center bg-black/60 rounded-xl border border-white/10 px-1">
            <button 
              onClick={() => handleAdjustQuantity(c.name, zone, -1)}
              className="p-1.5 text-white/50 hover:text-white transition-colors"
            >
              <Minus size={12} />
            </button>
            <span className="w-5 text-center text-xs font-bold text-magic-gold font-sans">{c.quantity}</span>
            <button 
              onClick={() => handleAdjustQuantity(c.name, zone, 1)}
              disabled={legality.status === 'overlimit' || (c.quantity >= 4 && !hasNoCopyLimit(c) && zone !== 'maybe')}
              className={cn(
                "p-1.5 text-white/50 hover:text-white transition-colors",
                (c.quantity >= 4 && !hasNoCopyLimit(c) && zone !== 'maybe') && "opacity-25 cursor-not-allowed"
              )}
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Eliminar completamente */}
          <button 
            onClick={() => handleRemoveCard(c.name, zone)}
            className="p-2 text-red-500/40 hover:text-red-400 transition-colors"
            title="Quitar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  // Renderizador visual de carta premium (estilo grid apilado con overlays superior e inferior)
  const renderVisualCard = (c, zone) => {
    const isFlipped = flippedCards.has(c.name);
    const imageUrl = isFlipped
      ? (c.card_faces?.[1]?.image_uris?.normal || c.card_faces?.[1]?.image_uris?.small || c.image_uris?.normal)
      : (c.image_uris?.normal || c.image_uris?.small || c.card_faces?.[0]?.image_uris?.normal || c.card_faces?.[0]?.image_uris?.small);
    const isFoil = c.rarity === 'mythic' || c.rarity === 'rare';
    const overlayKey = `${c.name}-${zone}`;

    const overlayVisibleClass = activeMobileOverlay === overlayKey
      ? "opacity-100 pointer-events-auto"
      : "opacity-0 lg:group-hover:opacity-100 pointer-events-none lg:group-hover:pointer-events-auto transition-all duration-200";

    const legality = getCardLegalityInfo(c, deckMeta.format);

    return (
      <div
        key={overlayKey}
        onClick={(e) => {
          if (isMobile) {
            e.stopPropagation();
            setActiveMobileOverlay(activeMobileOverlay === overlayKey ? null : overlayKey);
          }
        }}
        className={cn(
          "group relative w-full aspect-[63/88] rounded-xl overflow-hidden shadow-lg border transition-all duration-300 hover:z-20 cursor-pointer select-none",
          legality.status === 'illegal' ? "border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.2)]" :
          legality.status === 'vetoed' ? "border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]" :
          "border-white/5 hover:border-magic-gold/50"
        )}
      >
        {isFoil && (
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-cyan-500/10 mix-blend-color-dodge opacity-60 pointer-events-none" />
        )}

        <img
          src={imageUrl}
          alt={c.name}
          className="w-full h-full object-fill rounded-xl transition-transform duration-300 lg:group-hover:scale-105"
          loading="lazy"
        />

        {/* Badges flotantes de error/legalidad sobre la carta */}
        {legality.status === 'illegal' && (
          <div className="absolute top-2 left-2 bg-red-600/90 border border-red-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md group-hover:opacity-0 transition-opacity">
            🚫 Ilegal
          </div>
        )}
        {legality.status === 'vetoed' && (
          <div className="absolute top-2 left-2 bg-amber-600/90 border border-amber-400 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-md group-hover:opacity-0 transition-opacity" title={`Vetada: Reemplazar por "${legality.suggestion}"`}>
            ⚔️ Vetada
          </div>
        )}

        {/* Insignia de Cantidad por Defecto (se oculta al hacer hover) */}
        <div className="absolute top-2 right-2 bg-black/85 border border-magic-gold/30 px-2 py-0.5 rounded flex items-center justify-center font-sans font-bold text-xs text-white shadow-md transition-opacity lg:group-hover:opacity-0">
          x{c.quantity}
        </div>

        {/* Superposición Superior (Glassmorphic) */}
        <div className={cn(
          "absolute top-0 left-0 right-0 bg-black/85 backdrop-blur-sm border-b border-white/10 p-1 flex items-center justify-between z-10 transition-all",
          overlayVisibleClass
        )}>
          {/* Botón Lupa/Detalle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setPreviewCard(c);
            }}
            className="p-1 text-white/70 hover:text-magic-gold hover:bg-white/5 rounded transition-all"
            title="Ver detalles"
          >
            <Search size={13} />
          </button>

          {/* Botón Flip si es MDFC */}
          {c.card_faces && c.card_faces.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFlipCard(c.name);
              }}
              className="p-1 text-white/70 hover:text-magic-gold hover:bg-white/5 rounded transition-all"
              title="Voltear"
            >
              <RefreshCw size={13} />
            </button>
          )}

          {/* Transferir entre zonas */}
          <div className="flex gap-0.5">
            {zone !== 'main' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveCard(c, zone, 'main');
                }}
                className="px-1 py-0.5 bg-white/5 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[9px] font-bold transition-all"
                title="Mover a Principal"
              >
                Main
              </button>
            )}
            {zone !== 'side' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveCard(c, zone, 'side');
                }}
                className="px-1 py-0.5 bg-white/5 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-[9px] font-bold transition-all"
                title="Mover a Banquillo"
              >
                Side
              </button>
            )}
            {zone !== 'maybe' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveCard(c, zone, 'maybe');
                }}
                className="px-1 py-0.5 bg-white/5 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded text-[9px] font-bold transition-all"
                title="Mover a Maybeboard"
              >
                Maybe
              </button>
            )}
          </div>

          {/* Eliminar de zona */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveCard(c.name, zone);
            }}
            className="p-1 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Superposición Inferior (Glassmorphic) */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 bg-black/85 backdrop-blur-sm border-t border-white/10 p-1 flex flex-col gap-1 z-10 transition-all",
          overlayVisibleClass
        )}>
          {zone === 'main' ? (
            <select
              value={c.role || 'generic'}
              onChange={(e) => {
                e.stopPropagation();
                handleChangeRole(c.name, e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full bg-black/95 border border-magic-gold/20 rounded px-1 py-0.5 text-[9px] text-[#ffca58] focus:outline-none focus:border-magic-gold/50 cursor-pointer font-sans"
            >
              {ROLES.map(r => (
                <option key={r.id} value={r.id} className="bg-black text-[#f4ece0] text-[9px]">
                  {r.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[8px] text-white/50 truncate font-serif text-center uppercase tracking-wide py-0.5">
              {c.category || 'Carta'}
            </div>
          )}

          <div className="flex items-center justify-between bg-black/60 rounded-lg border border-white/10 px-1 py-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdjustQuantity(c.name, zone, -1);
              }}
              className="p-1 text-white/50 hover:text-white transition-colors"
            >
              <Minus size={11} />
            </button>
            <span className="text-[11px] font-bold text-magic-gold font-sans">
              {c.quantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAdjustQuantity(c.name, zone, 1);
              }}
              disabled={c.quantity >= 4 && !hasNoCopyLimit(c) && zone !== 'maybe'}
              className={cn(
                "p-1 text-white/50 hover:text-white transition-colors",
                (c.quantity >= 4 && !hasNoCopyLimit(c) && zone !== 'maybe') && "opacity-25 cursor-not-allowed"
              )}
            >
              <Plus size={11} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Obtener info legalidad
  const getCardLegalityInfo = (card, format) => {
    if (!card) return { status: 'legal' };
    
    const nameLower = card.name.toLowerCase();
    if (['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes'].includes(nameLower)) {
      return { status: 'legal' };
    }
    
    const totalCopies = countCopiesInDeck(card.name);
    const unlimited = hasNoCopyLimit(card);
    const overLimit = !unlimited && (
      (card.name.toLowerCase() === 'seven dwarves' && totalCopies > 7) ||
      (card.name.toLowerCase() !== 'seven dwarves' && totalCopies > 4)
    );
    
    if (overLimit) {
      return { 
        status: 'overlimit', 
        message: `Supera el límite de copias (${totalCopies}/4)` 
      };
    }

    const isVetoed = BATTLEBOX_VETOS.includes(card.name);
    if (isVetoed) {
      return {
        status: 'vetoed',
        message: `Vetada en Battle Box`,
        suggestion: BANLIST_SUBSTITUTIONS[card.name] || 'N/A'
      };
    }

    if (format !== 'CUSTOM') {
      const formatKey = format.toLowerCase();
      const isLegal = card.legalities?.[formatKey] === 'legal';
      if (!isLegal) {
        return {
          status: 'illegal',
          message: `Ilegal en ${format}`
        };
      }
    }

    return { status: 'legal' };
  };

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 py-6 max-w-7xl mx-auto px-4 md:px-6">
      {/* Cabecera del Mazo */}
      <div className="frosted-panel border-[#ffca58]/30 p-5 md:p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="flex-1 w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <input
                type="text"
                value={deckMeta.name}
                onChange={(e) => setDeckMeta(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nombre de tu Grimorio..."
                className="bg-black/40 border border-magic-gold/20 focus:border-magic-gold/50 rounded-xl px-4 py-2.5 text-lg font-cinzel text-magic-gold placeholder:text-magic-gold/30 focus:outline-none w-full sm:max-w-xs shadow-inner"
              />
              <div className="flex gap-2">
                <select
                  value={deckMeta.format}
                  onChange={(e) => setDeckMeta(prev => ({ ...prev, format: e.target.value }))}
                  className="bg-black/60 border border-magic-gold/20 rounded-xl px-3 py-2 text-xs font-bold text-[#ffca58] focus:outline-none cursor-pointer"
                >
                  <option value="MODERN">MODERN</option>
                  <option value="PIONEER">PIONEER</option>
                  <option value="STANDARD">STANDARD</option>
                  <option value="LEGACY">LEGACY</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
                <select
                  value={deckMeta.archetype}
                  onChange={(e) => setDeckMeta(prev => ({ ...prev, archetype: e.target.value }))}
                  className="bg-black/60 border border-magic-gold/20 rounded-xl px-3 py-2 text-xs font-bold text-[#ffca58] focus:outline-none cursor-pointer"
                >
                  {BATTLEBOX_ARCHETYPES.map(a => (
                    <option key={a.id} value={a.id}>{a.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <input
              type="text"
              value={deckMeta.lore}
              onChange={(e) => setDeckMeta(prev => ({ ...prev, lore: e.target.value }))}
              placeholder="Frase de lore del grimorio (opcional)..."
              className="bg-transparent border-b border-white/10 hover:border-white/20 focus:border-magic-gold/40 text-xs italic text-white/60 focus:outline-none w-full pb-1 font-serif"
            />
          </div>

          {/* Selector de Identidad de Color */}
          <div className="flex flex-col items-center gap-2 bg-black/35 border border-white/5 p-3 rounded-2xl w-full lg:w-auto">
            <span className="text-[10px] uppercase font-bold tracking-widest text-magic-gold/50">Identidad de Color</span>
            <div className="flex gap-2 justify-center flex-wrap">
              {COLORS.map(color => {
                const active = deckMeta.colors.includes(color.id);
                return (
                  <button
                    key={color.id}
                    onClick={() => {
                      vibrateTouch();
                      setDeckMeta(prev => {
                        const colors = prev.colors.includes(color.id)
                          ? prev.colors.filter(c => c !== color.id)
                          : [...prev.colors, color.id];
                        return { ...prev, colors };
                      });
                    }}
                    className={cn(
                      "p-0.5 rounded-full border-2 transition-all duration-300 relative",
                      active 
                        ? "border-[#ffca58] scale-110 shadow-[0_0_15px_rgba(255,202,88,0.4)]" 
                        : "border-transparent opacity-40 hover:opacity-80"
                    )}
                  >
                    <ManaOrb color={color.id} size="w-8 h-8" />
                  </button>
                );
              })}
            </div>
            {deckMeta.tribal && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full mt-1 uppercase font-bold tracking-wide">
                🧬 Tribu: {deckMeta.tribal}
              </span>
            )}
          </div>
        </div>

        {/* Barra de progreso de tamaño de mazo */}
        <div className="mt-6 pt-5 border-t border-white/5 flex flex-col md:flex-row gap-5 items-center">
          <div className="flex-1 w-full">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-[#ffca58] font-cinzel tracking-widest uppercase">Mazo Principal</span>
              <span className={cn(
                totalMainCards === 60 ? "text-green-400" :
                totalMainCards > 60 ? "text-amber-400" : "text-white/40"
              )}>
                {totalMainCards === 60 ? "✅ Tamaño legal: 60" :
                 totalMainCards > 60 ? `⚠️ Superado por ${totalMainCards - 60}` :
                 `Le faltan ${60 - totalMainCards} cartas para 60`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/60 border border-white/10 rounded-full overflow-hidden shadow-inner">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,202,88,0.2)]",
                  totalMainCards === 60 ? "bg-green-500" :
                  totalMainCards > 60 ? "bg-amber-500" : "bg-[#ffca58]"
                )}
                style={{ width: `${Math.min((totalMainCards / 60) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="w-full md:w-48">
            <div className="flex justify-between items-center text-xs font-bold mb-2">
              <span className="text-[#ffca58] font-cinzel tracking-widest uppercase">Banquillo</span>
              <span className={totalSideCards > 15 ? "text-red-400 font-bold" : "text-white/40"}>
                {totalSideCards} / 15
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/60 border border-white/10 rounded-full overflow-hidden shadow-inner">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  totalSideCards > 15 ? "bg-red-500 shadow-[0_0_8px_#ef4444]" : "bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.2)]"
                )}
                style={{ width: `${Math.min((totalSideCards / 15) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sugerencia de Tribu Autodetectada */}
      {showTribeSuggestion && (
        <div className="bg-blue-950/20 border border-blue-500/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <div>
              <p className="text-blue-200 text-sm font-semibold">Tribu Dominante Detectada: {showTribeSuggestion}s</p>
              <p className="text-blue-300/60 text-xs">Representan un alto porcentaje de las criaturas en tu baraja.</p>
            </div>
          </div>
          <button 
            onClick={acceptTribeSuggestion}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold uppercase transition-all shadow-lg shrink-0"
          >
            Etiquetar Mazo
          </button>
        </div>
      )}

      {/* Controles de Vista Móvil */}
      {isMobile && (
        <div className="flex bg-black/60 border border-white/10 p-1 rounded-xl mb-4">
          <button 
            onClick={() => setMobileView('list')}
            className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", mobileView === 'list' ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/20" : "text-white/40")}
          >
            Cartas ({totalMainCards + totalSideCards})
          </button>
          <button 
            onClick={() => setMobileView('search')}
            className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", mobileView === 'search' ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/20" : "text-white/40")}
          >
            Buscar
          </button>
          <button 
            onClick={() => setMobileView('stats')}
            className={cn("flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", mobileView === 'stats' ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/20" : "text-white/40")}
          >
            Estadísticas
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0 overflow-y-auto lg:overflow-visible">
        {/* Columna Izquierda: Búsqueda, Tierras y Estadísticas (lg:col-span-4) */}
        {(!isMobile || mobileView === 'search' || mobileView === 'stats') && (
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Sección de Búsqueda y Tierras (Visible en Desktop, o en Móvil cuando se selecciona 'search') */}
            {(!isMobile || mobileView === 'search') && (
              <>
                {/* Control Destino de Añadido */}
                <div className="frosted-panel border-white/5 p-4">
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#ffca58] block mb-3 text-center">Destino al Añadir Cartas</span>
                  <div className="flex bg-black/60 border border-white/10 p-1 rounded-xl">
                    <button
                      onClick={() => setAddTarget('main')}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        addTarget === 'main' ? "bg-[#ffca58] text-black shadow-lg" : "text-[#f4ece0]/40 hover:text-white"
                      )}
                    >
                      Principal
                    </button>
                    <button
                      onClick={() => setAddTarget('side')}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        addTarget === 'side' ? "bg-blue-500 text-white shadow-lg" : "text-[#f4ece0]/40 hover:text-white"
                      )}
                    >
                      Banquillo
                    </button>
                    <button
                      onClick={() => setAddTarget('maybe')}
                      className={cn(
                        "flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all",
                        addTarget === 'maybe' ? "bg-purple-600 text-white shadow-lg" : "text-[#f4ece0]/40 hover:text-white"
                      )}
                    >
                      Maybeboard
                    </button>
                  </div>
                </div>

                {/* Buscador de Cartas */}
                <div className="frosted-panel border-white/5 p-5 flex flex-col">
                  <h3 className="font-cinzel text-magic-gold text-sm tracking-wider uppercase mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                    <Search size={16} /> Canalizar Base de Datos Scryfall
                  </h3>
                  <CardSearch onAddCard={handleAddCard} />
                </div>

                {/* Panel de Tierras Básicas Rápido */}
                <div className="frosted-panel border-white/5 p-5">
                  <h3 className="font-cinzel text-magic-gold text-sm tracking-wider uppercase mb-4 flex items-center gap-2 border-b border-white/5 pb-2">
                    💧 Portal de Tierras Básicas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.keys(BASIC_LANDS).map((landName) => {
                      const land = BASIC_LANDS[landName];
                      const symbolMap = { Plains: 'W', Island: 'U', Swamp: 'B', Mountain: 'R', Forest: 'G', Wastes: 'C' };
                      return (
                        <div key={landName} className="bg-black/40 border border-white/5 rounded-xl p-2.5 flex items-center justify-between gap-2 hover:border-magic-gold/20 transition-all">
                          <div className="flex items-center gap-2 min-w-0">
                            <ManaOrb color={symbolMap[landName]} size="w-7 h-7" />
                            <span className="text-xs font-bold truncate">{landName}</span>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleAddBasicLand(landName, 1)}
                              className="px-2 py-1 bg-white/5 hover:bg-magic-gold/15 text-[#ffca58] border border-white/10 rounded-lg text-[10px] font-bold transition-all"
                            >
                              +1
                            </button>
                            <button 
                              onClick={() => handleAddBasicLand(landName, 5)}
                              className="px-2 py-1 bg-white/5 hover:bg-magic-gold/25 text-[#ffca58] border border-white/10 rounded-lg text-[10px] font-bold transition-all"
                            >
                              +5
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Sección de Estadísticas (Visible en Desktop, o en Móvil cuando se selecciona 'stats') */}
            {(!isMobile || mobileView === 'stats') && (
              <>
                {/* Estimación de Precio */}
                <div className="frosted-panel border-white/5 p-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-1 text-sm font-cinzel text-magic-gold">
                      <DollarSign size={16} /> Valor Estimado
                    </div>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] text-white/40 hover:text-white transition-colors">
                      <input
                        type="checkbox"
                        checked={priceModeFoil}
                        onChange={(e) => setPriceModeFoil(e.target.checked)}
                        className="rounded border-white/20 bg-black/60 text-magic-gold focus:ring-0 focus:ring-offset-0"
                      />
                      Foil
                    </label>
                  </div>
                  <div className="text-2xl font-bold font-mono mt-2 text-white">
                    ${deckPriceEstimate.total.toFixed(2)}
                  </div>
                  {deckPriceEstimate.untrackedCount > 0 && (
                    <div className="text-[9px] text-amber-500/70 mt-1">
                      * Precio desconocido para {deckPriceEstimate.untrackedCount} cartas
                    </div>
                  )}
                </div>

                {/* Curva de Maná y Distribución */}
                <ManaCurve deck={mainboard} archetype={deckMeta.archetype} />

                {/* Guía de Blueprint Comparativa */}
                <div className="frosted-panel border-white/5 p-5">
                  <h4 className="font-cinzel text-magic-gold text-xs tracking-wider uppercase mb-4 border-b border-white/5 pb-2 flex items-center gap-1.5">
                    <CheckCircle2 size={14} /> Guía del Blueprint: {deckMeta.archetype}
                  </h4>
                  <div className="space-y-3.5 text-xs">
                    {/* Comparar Tierras */}
                    <div>
                      <div className="flex justify-between text-white/70 mb-1">
                        <span>Tierras en el Mazo:</span>
                        <span className="font-mono font-bold">
                          {actualTypes.Land} / {blueprint.lands?.total}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-white/40">Ideal para {deckMeta.archetype}</span>
                        {actualTypes.Land === blueprint.lands?.total ? (
                          <span className="text-green-400 font-bold">✅ Cumplido</span>
                        ) : (
                          <span className="text-amber-400">⚠️ Desviado</span>
                        )}
                      </div>
                    </div>

                    {/* Comparar Criaturas */}
                    {blueprint.spells?.distribution?.creatures && (
                      <div>
                        <div className="flex justify-between text-white/70 mb-1">
                          <span>Criaturas en el Mazo:</span>
                          <span className="font-mono font-bold">
                            {actualTypes.Creature} / {blueprint.spells.distribution.creatures.min}-{blueprint.spells.distribution.creatures.max}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-white/40">Rango sugerido</span>
                          {actualTypes.Creature >= blueprint.spells.distribution.creatures.min &&
                          actualTypes.Creature <= blueprint.spells.distribution.creatures.max ? (
                            <span className="text-green-400 font-bold">✅ En rango</span>
                          ) : (
                            <span className="text-amber-400">⚠️ Fuera de rango</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Distribución por Roles Funcionales */}
                <div className="frosted-panel border-white/5 p-5">
                  <h4 className="font-cinzel text-magic-gold text-xs tracking-wider uppercase mb-4 border-b border-white/5 pb-2">
                    🛡️ Distribución de Roles Funcionales
                  </h4>
                  <div className="space-y-3">
                    {ROLES.map(role => {
                      const qty = mainboard.filter(c => (c.role || 'generic') === role.id).reduce((sum, c) => sum + c.quantity, 0);
                      const totalSpells = mainboard.filter(c => c.category !== 'Land').reduce((sum, c) => sum + c.quantity, 0);
                      const pct = totalSpells > 0 ? (qty / totalSpells) * 100 : 0;
                      return (
                        <div key={role.id} className="text-xs">
                          <div className="flex justify-between text-white/60 mb-1">
                            <span>{role.label}</span>
                            <span className="font-mono font-bold">{qty}</span>
                          </div>
                          <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-magic-gold/70"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Asistente de Curva IA (Oráculo) */}
                <div className="frosted-panel border-[#ffca58]/20 p-5 bg-[#ffdf91]/5">
                  <h4 className="font-cinzel text-magic-gold text-xs tracking-wider uppercase mb-3 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-magic-gold" /> Asistente de Curva IA
                  </h4>
                  {curveDeficits.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[10px] text-white/50 leading-normal">
                        Se detectan huecos en la curva de maná de tu baraja respecto al arquetipo:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {curveDeficits.map(def => (
                          <button
                            key={def.cmc}
                            onClick={() => getOracleSuggestions(def.cmc)}
                            className="px-2.5 py-1 bg-magic-gold/10 hover:bg-magic-gold/20 text-magic-gold rounded-lg border border-magic-gold/30 text-[10px] font-bold uppercase transition-all flex items-center gap-1"
                          >
                            🪄 Sugerir {def.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-green-400 font-bold">
                      ✨ ¡Curva de maná equilibrada según el arquetipo! No se detectan déficits.
                    </p>
                  )}

                  {/* Sugerencias sugeridas por la IA */}
                  {selectedOracleCmc !== null && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] uppercase font-bold text-magic-gold/60">🔮 Sugerencias del Oráculo (MV{selectedOracleCmc})</span>
                        <button 
                          onClick={() => setSelectedOracleCmc(null)}
                          className="text-red-400/50 hover:text-red-400"
                        >
                          <X size={12} />
                        </button>
                      </div>

                      {oracleLoading ? (
                        <div className="py-6 flex flex-col items-center justify-center gap-2">
                          <RefreshCw size={18} className="text-magic-gold animate-spin" />
                          <span className="text-[9px] uppercase tracking-wider text-magic-gold/50">Canalizando la Biblioteca...</span>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {oracleSuggestions.map(card => (
                            <div 
                              key={card.name} 
                              className="flex items-center justify-between p-2 bg-black/45 rounded-lg border border-white/5 hover:border-magic-gold/20 transition-all text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-bold truncate text-[#ffca58]">{card.name}</div>
                                <div className="text-[9px] text-white/40 truncate">{card.type_line}</div>
                              </div>
                              <button
                                onClick={() => handleAddCard(card)}
                                className="p-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg font-bold"
                              >
                                +
                              </button>
                            </div>
                          ))}
                          {oracleSuggestions.length === 0 && (
                            <div className="text-[10px] text-white/30 italic text-center py-4">No se encontraron sugerencias.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Columna Derecha: Listado de cartas en columnas (Mazo) / Grids (Banquillo y Maybe) */}
        {(!isMobile || mobileView === 'list') && (
          <div className="lg:col-span-8 flex flex-col gap-6">
            <div className="frosted-panel border-white/5 p-5 flex flex-col flex-1 min-h-[500px]">
              {/* Selector de Tabs de Listado */}
              <div className="flex border-b border-white/10 pb-3 mb-4 flex-wrap gap-2">
                <button
                  onClick={() => { vibrateTouch(); setActiveTab('main'); }}
                  className={cn(
                    "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                    activeTab === 'main' ? "bg-magic-gold/10 text-magic-gold border border-magic-gold/30 shadow-md" : "text-white/40 hover:text-white"
                  )}
                >
                  <Layers size={14} /> Mazo Principal ({totalMainCards})
                </button>
                <button
                  onClick={() => { vibrateTouch(); setActiveTab('side'); }}
                  className={cn(
                    "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                    activeTab === 'side' ? "bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-md" : "text-white/40 hover:text-white"
                  )}
                >
                  <BookOpen size={14} /> Banquillo ({totalSideCards})
                </button>
                <button
                  onClick={() => { vibrateTouch(); setActiveTab('maybe'); }}
                  className={cn(
                    "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2",
                    activeTab === 'maybe' ? "bg-purple-500/10 text-purple-400 border border-purple-500/30 shadow-md" : "text-white/40 hover:text-white"
                  )}
                >
                  <HelpCircle size={14} /> Maybeboard ({totalMaybeCards})
                </button>
              </div>

              {/* Filtro local dentro del mazo */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={inDeckFilter}
                  onChange={(e) => setInDeckFilter(e.target.value)}
                  placeholder={`Buscar en ${activeTab === 'main' ? 'Mazo Principal' : activeTab === 'side' ? 'Banquillo' : 'Maybeboard'}...`}
                  className="w-full bg-black/60 border border-white/10 focus:border-magic-gold/40 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none"
                />
              </div>

              {/* Render de las listas (7 columnas en Mainboard, grids en Sideboard y Maybeboard) */}
              <div className="flex-1 overflow-y-auto space-y-5 scrollbar-thin scrollbar-thumb-magic-gold/10">
                {activeTab === 'main' && (
                  <>
                    {mainboard.length === 0 ? (
                      <div className="h-full flex items-center justify-center py-20 text-white/20 italic text-sm">
                        El mazo principal está vacío. Añade cartas usando el explorador de la izquierda.
                      </div>
                    ) : isMobile ? (
                      /* Mobile View: Accordion style grouped by CMC/Lands */
                      <div className="flex flex-col gap-2 w-full">
                        {Object.keys(columnsByCmc).map((cmcKey) => {
                          const colCards = filterList(columnsByCmc[cmcKey]);
                          const colQuantity = colCards.reduce((sum, c) => sum + (c.quantity || 1), 0);
                          const isExpanded = expandedCols[cmcKey];

                          return (
                            <div key={cmcKey} className="border border-white/10 rounded-xl overflow-hidden bg-black/35">
                              <button
                                onClick={() => toggleCol(cmcKey)}
                                className="w-full flex justify-between items-center px-4 py-3 bg-white/5 hover:bg-white/10 transition-colors"
                              >
                                <span className="font-cinzel text-xs text-magic-gold uppercase tracking-widest font-bold">
                                  {cmcKey === 'Tierras' ? 'Tierras' : `Coste ${cmcKey}`}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-gray-400 font-mono">
                                    x{colQuantity} {colQuantity === 1 ? 'carta' : 'cartas'}
                                  </span>
                                  <span className="text-magic-gold text-xs transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    ▼
                                  </span>
                                </div>
                              </button>

                              <AnimatePresence initial={false}>
                                {isExpanded && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-3 bg-black/20">
                                      {colCards.length === 0 ? (
                                        <div className="py-4 text-center text-xs text-gray-500 italic">
                                          Vacío o sin coincidencias de filtro
                                        </div>
                                      ) : (
                                        <div className="grid grid-cols-3 gap-3">
                                          {colCards.map((c) => renderVisualCard(c, 'main'))}
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Desktop View: 7 Column Stacks Cascadadas */
                      <div className="grid grid-cols-7 gap-4 min-h-[500px]">
                        {Object.keys(columnsByCmc).map((cmcKey) => {
                          const colCards = filterList(columnsByCmc[cmcKey]);
                          const colQuantity = colCards.reduce((sum, c) => sum + (c.quantity || 1), 0);

                          return (
                            <div key={cmcKey} className="flex flex-col gap-3 min-h-0">
                              {/* Cabecera de Columna */}
                              <div className="flex justify-between items-center border-b border-white/10 pb-1.5 shrink-0">
                                <span className="font-cinzel text-[10px] text-magic-gold uppercase tracking-widest font-bold">
                                  {cmcKey === 'Tierras' ? 'Tierras' : `Coste ${cmcKey}`}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono font-bold">
                                  x{colQuantity}
                                </span>
                              </div>

                              {/* Cartas Apiladas (Cascada) */}
                              <div className="flex-1 flex flex-col relative min-h-0 pb-16">
                                {colCards.length === 0 ? (
                                  <div className="h-24 border border-dashed border-white/5 rounded-xl flex items-center justify-center text-[9px] text-white/20 font-serif italic text-center p-2">
                                    Vacío
                                  </div>
                                ) : (
                                  <div className="space-y-[-115%] hover:space-y-[-85%] transition-all duration-300 animate-fade-in">
                                    {colCards.map((c) => renderVisualCard(c, 'main'))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'side' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <BookOpen size={14} className="text-magic-gold" />
                      <span className="text-xs font-cinzel text-magic-gold uppercase tracking-wider">Cartas de Banquillo</span>
                    </div>
                    {sideboard.length === 0 ? (
                      <div className="py-20 text-center text-white/20 italic text-sm">
                        El banquillo está vacío.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filterList(sideboard).map(c => renderVisualCard(c, 'side'))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'maybe' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                      <HelpCircle size={14} className="text-magic-gold" />
                      <span className="text-xs font-cinzel text-magic-gold uppercase tracking-wider">Zona de Consideración</span>
                    </div>
                    {maybeboard.length === 0 ? (
                      <div className="py-20 text-center text-white/20 italic text-sm">
                        No hay cartas en consideración.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filterList(maybeboard).map(c => renderVisualCard(c, 'maybe'))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Barra de Acciones Inferior */}
      <div className="frosted-panel border-white/10 p-4 mt-6 flex flex-col sm:flex-row gap-4 items-center justify-between bg-black/60">
        {/* Undo/Redo & Limpiar */}
        <div className="flex gap-2">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white disabled:opacity-20 transition-all flex items-center gap-1.5"
            title="Deshacer (Ctrl+Z)"
          >
            <RotateCcw size={15} /> <span className="text-xs font-bold hidden md:inline">Deshacer</span>
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/50 hover:text-white disabled:opacity-20 transition-all flex items-center gap-1.5"
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <RotateCw size={15} /> <span className="text-xs font-bold hidden md:inline">Rehacer</span>
          </button>
          <button
            onClick={handleClearAll}
            className="p-2.5 bg-red-950/10 border border-red-500/20 hover:border-red-500/50 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Trash2 size={15} /> <span className="hidden md:inline">Vaciar</span>
          </button>
        </div>

        {/* Archivar e Import/Export */}
        <div className="flex gap-2.5 flex-wrap justify-center">
          {/* Carga Rápida Dropdown */}
          <div className="relative group">
            <select
              onChange={(e) => handleQuickLoad(e.target.value)}
              value=""
              className="bg-black/80 border border-magic-gold/30 rounded-xl px-3 py-2.5 text-xs font-bold text-magic-gold focus:outline-none cursor-pointer"
            >
              <option value="" disabled>📂 Cargar Archivo...</option>
              {archivedList.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.cards?.reduce((a,b)=>a+b.quantity,0)} cartas)
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { vibrateTouch(); setImportModalOpen(true); }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <Upload size={14} /> Importar
          </button>
          
          <button
            onClick={() => { vibrateTouch(); setExportModalOpen(true); }}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <Download size={14} /> Exportar
          </button>

          <button
            onClick={handleDuplicate}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            ⧉ Duplicar
          </button>

          <button
            onClick={handleShareCommunity}
            disabled={totalMainCards < 1}
            className="px-4 py-2.5 bg-white/5 hover:bg-magic-gold/10 border border-[#ffca58]/30 rounded-xl text-[#ffca58] disabled:opacity-20 text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
          >
            <Share2 size={14} /> Compartir
          </button>

          {/* Impresión */}
          <div className="relative group">
            <button
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-1.5"
            >
              <Printer size={14} /> Imprimir <ChevronDown size={12} />
            </button>
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-black border border-white/10 rounded-xl p-1.5 shadow-2xl z-[120] min-w-[150px]">
              <button 
                onClick={handlePrintList}
                className="w-full text-left px-3 py-2 text-xs text-[#f4ece0] hover:bg-white/5 hover:text-white rounded-lg"
              >
                🖨️ Imprimir Lista
              </button>
              <button 
                onClick={handlePrintProxies}
                className="w-full text-left px-3 py-2 text-xs text-[#f4ece0] hover:bg-white/5 hover:text-white rounded-lg"
              >
                🃏 Vista de Proxies
              </button>
            </div>
          </div>

          <button
            onClick={handleSaveDeck}
            className="px-6 py-2.5 bg-magic-gold hover:bg-[#e0b74f] text-black font-cinzel font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,202,88,0.3)] hover:scale-105 flex items-center gap-1.5"
          >
            <Save size={14} /> Guardar
          </button>
        </div>
      </div>

      {/* Alerta flotante de guardado */}
      {saveStatus.show && (
        <div className={cn(
          "fixed bottom-24 right-6 z-[130] px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border animate-slide-in",
          saveStatus.success ? "bg-green-950/90 border-green-500/40 text-green-200" : "bg-red-950/90 border-red-500/40 text-red-200"
        )}>
          {saveStatus.success ? <CheckCircle2 size={18} className="text-green-400" /> : <AlertCircle size={18} className="text-red-400" />}
          <span className="text-xs font-semibold">{saveStatus.message}</span>
        </div>
      )}

      {/* Modal de Importar */}
      {importModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="frosted-panel border-white/10 max-w-lg w-full p-6 space-y-4 relative shadow-2xl">
            <button 
              onClick={() => { vibrateTouch(); setImportModalOpen(false); }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="font-cinzel text-magic-gold text-lg tracking-widest uppercase">Importar Grimorio en Texto</h3>
            <p className="text-xs text-white/50 leading-relaxed">
              Introduce tu lista en formato Arena, Forge o MTGO. Separa tu baraja principal del sideboard escribiendo una línea llamada <strong className="text-white">Sideboard</strong>:
            </p>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Ejemplo:&#10;4 Lightning Bolt&#10;4 Counterspell&#10;16 Island&#10;Sideboard&#10;4 Tormod's Crypt"
              disabled={isImporting}
              rows={10}
              className="w-full bg-black/70 border border-white/10 focus:border-magic-gold/40 rounded-xl p-4 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setImportModalOpen(false)}
                disabled={isImporting}
                className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white disabled:opacity-20"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleImportText(importText)}
                disabled={isImporting || !importText.trim()}
                className="px-6 py-2 bg-magic-gold text-black rounded-xl text-xs font-bold uppercase disabled:opacity-20 flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Hidratando ({importProgress}%)
                  </>
                ) : 'Comenzar Hidratación'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exportar */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="frosted-panel border-white/10 max-w-lg w-full p-6 space-y-5 relative shadow-2xl">
            <button 
              onClick={() => { vibrateTouch(); setExportModalOpen(false); }}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X size={20} />
            </button>
            <h3 className="font-cinzel text-magic-gold text-lg tracking-widest uppercase">Exportar Grimorio</h3>
            <div className="flex bg-black border border-white/10 p-1 rounded-xl">
              {['arena', 'forge', 'simple'].map(f => (
                <button
                  key={f}
                  onClick={() => setExportFormat(f)}
                  className={cn(
                    "flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg transition-all",
                    exportFormat === f ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/20" : "text-white/40"
                  )}
                >
                  {f === 'arena' ? 'Arena / MTGO' : f === 'forge' ? 'Forge' : 'Texto Simple'}
                </button>
              ))}
            </div>
            <pre className="w-full bg-black/80 border border-white/10 rounded-xl p-4 text-[10px] font-mono text-white/80 overflow-y-auto max-h-60">
              {generateExportText()}
            </pre>
            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleDownloadFile}
                className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <FileText size={14} /> Descargar .txt
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-4 py-2 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white"
                >
                  Cerrar
                </button>
                <button
                  onClick={handleCopyClipboard}
                  className="px-6 py-2 bg-magic-gold text-black rounded-xl text-xs font-bold uppercase flex items-center gap-1.5"
                >
                  <Copy size={14} /> Copiar Lista
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Detalle/Previsualización de Carta */}
      <AnimatePresence>
        {previewCard && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="frosted-panel border-magic-gold/30 max-w-2xl w-full p-6 relative shadow-2xl flex flex-col md:flex-row gap-6 bg-[#0c0a09]/95 text-white overflow-y-auto max-h-[90vh]"
            >
              <button
                onClick={() => setPreviewCard(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-all z-10"
              >
                <X size={20} />
              </button>

              {/* Lado Izquierdo: Imagen de Carta */}
              <div className="w-full md:w-72 shrink-0 flex flex-col items-center gap-3">
                <div className="relative w-64 aspect-[63/88] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  <img
                    src={(() => {
                      const isFlipped = flippedCards.has(previewCard.name);
                      return isFlipped
                        ? (previewCard.card_faces?.[1]?.image_uris?.normal || previewCard.image_uris?.normal)
                        : (previewCard.image_uris?.normal || previewCard.card_faces?.[0]?.image_uris?.normal);
                    })()}
                    alt={previewCard.name}
                    className="w-full h-full object-fill"
                  />
                </div>
                {previewCard.card_faces && previewCard.card_faces.length > 1 && (
                  <button
                    onClick={() => toggleFlipCard(previewCard.name)}
                    className="px-4 py-2 bg-white/5 hover:bg-magic-gold/15 text-magic-gold border border-white/10 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all"
                  >
                    <RefreshCw size={14} /> Voltear Carta
                  </button>
                )}
              </div>

              {/* Lado Derecho: Detalles */}
              <div className="flex-1 space-y-4">
                <div>
                  <div className="flex justify-between items-start flex-wrap gap-2">
                    <h3 className="font-cinzel text-xl text-magic-gold font-bold">{previewCard.name}</h3>
                    <RenderManaCost manaCost={previewCard.mana_cost} className="scale-100" />
                  </div>
                  <p className="text-xs text-white/40 font-serif italic mt-1">{previewCard.type_line}</p>
                </div>

                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-magic-gold/60 block">Texto de Oráculo</span>
                  <p className="text-xs text-white/80 leading-relaxed font-serif whitespace-pre-line bg-black/30 p-3 rounded-lg border border-white/5">
                    {previewCard.oracle_text || (previewCard.card_faces && previewCard.card_faces.map((f, i) => `[Cara ${i+1}] ${f.name}\n${f.oracle_text}`).join('\n\n')) || "Sin texto de oráculo."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-magic-gold/60 block mb-1">Precios (USD)</span>
                    <div className="space-y-1 font-mono">
                      <div>Normal: <span className="text-white font-bold">${previewCard.prices?.usd || '?'}</span></div>
                      <div>Foil: <span className="text-white font-bold">${previewCard.prices?.usd_foil || '?'}</span></div>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-magic-gold/60 block mb-1">Legalidad en Formatos</span>
                    <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
                      {['standard', 'pioneer', 'modern', 'legacy'].map(fmt => {
                        const status = previewCard.legalities?.[fmt];
                        return (
                          <div key={fmt} className="flex justify-between pr-2">
                            <span className="uppercase text-white/50">{fmt}:</span>
                            <span className={status === 'legal' ? "text-green-400" : "text-red-400"}>
                              {status === 'legal' ? 'LEGAL' : 'ILG'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Rol Funcional actual */}
                <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-magic-gold/60 block">Rol Funcional</span>
                    <span className="text-white font-serif">{ROLES.find(r => r.id === (previewCard.role || 'generic'))?.label || 'Genérico'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-magic-gold/60 block text-right">Cantidad en Mazo</span>
                    <span className="text-white font-bold block text-right">{previewCard.quantity}x</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
