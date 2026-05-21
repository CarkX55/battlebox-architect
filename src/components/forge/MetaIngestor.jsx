import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import { 
  Globe, Key, RefreshCw, Activity, Calendar, Server, 
  Eye, EyeOff, CheckCircle2, AlertTriangle, TrendingUp, Sparkles, Database, FileText
} from 'lucide-react';
import { 
  fetchMTGTop8Decklists, 
  loadMetaFromDB,
  parseMultipleDecklists,
  computeMetaFromDecklistsList,
  saveMetaToDB
} from '../../services/mtgtop8Service';

export default function MetaIngestor({ selectedFormat, onFormatChange }) {
  const [apifyToken, setApifyToken] = useState(() => localStorage.getItem('apify_api_token') || '');
  const [showKey, setShowKey] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle');
  const [syncError, setSyncError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [ingestMode, setIngestMode] = useState('auto'); // 'auto' | 'manual'
  const [manualText, setManualText] = useState('');
  const [timeWindow, setTimeWindow] = useState(() => {
    return parseInt(localStorage.getItem('mtg_meta_window') || '8', 10);
  });

  const handleTimeWindowChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setTimeWindow(value);
    localStorage.setItem('mtg_meta_window', value.toString());
  };
  
  // Carga inicial y reactiva del metajuego según el formato seleccionado
  const metaProfile = useMemo(() => {
    return loadMetaFromDB(selectedFormat);
  }, [selectedFormat, syncStatus]);

  // Guardar clave API de manera segura en localStorage
  const handleApifyTokenChange = (e) => {
    const value = e.target.value;
    setApifyToken(value);
    localStorage.setItem('apify_api_token', value);
  };

  // Acción de sincronización
  const handleSync = async () => {
    setSyncStatus('syncing');
    setSyncError(null);
    setProgress(10);

    if (ingestMode === 'manual') {
      try {
        setProgress(30);
        if (!manualText.trim()) {
          throw new Error("El cuadro de texto está vacío. Pega al menos un mazo para importar.");
        }
        
        setProgress(50);
        const processedDecks = parseMultipleDecklists(manualText);
        
        setProgress(80);
        if (processedDecks.length === 0) {
          throw new Error("No se encontraron cartas válidas. Asegúrate del formato: '4 Lightning Bolt' (Cantidad Nombre).");
        }
        
        const calculatedMeta = computeMetaFromDecklistsList(processedDecks);
        calculatedMeta.source = `Manual (${processedDecks.length} ${processedDecks.length === 1 ? 'Mazo' : 'Mazos'})`;
        calculatedMeta.lastIngestionDate = Date.now();
        
        setProgress(95);
        saveMetaToDB(selectedFormat, calculatedMeta);
        
        setProgress(100);
        setSyncStatus('success');
        setTimeout(() => {
          setSyncStatus('idle');
          setManualText(''); // Limpiamos para una mejor UX
        }, 3000);
      } catch (err) {
        setSyncStatus('error');
        setSyncError(err.message || 'Error al procesar la lista de mazos.');
      }
      return;
    }

    // Modo automático / Apify MTGTop8 API
    const useMock = !apifyToken.trim();

    if (useMock) {
      // Simulación animada para datos Mock
      console.log(`[MetaIngestor] Apify Token ausente. Sincronizando con Mock de ${selectedFormat}...`);
      let currentProgress = 10;
      const interval = setInterval(() => {
        currentProgress += 15;
        if (currentProgress >= 100) {
          clearInterval(interval);
          setProgress(100);
          setTimeout(() => {
            setSyncStatus('success');
            setTimeout(() => setSyncStatus('idle'), 3000);
          }, 400);
        } else {
          setProgress(currentProgress);
        }
      }, 200);
    } else {
      // Llamada real a la API de Apify MTGTop8
      try {
        setProgress(30);
        await fetchMTGTop8Decklists(apifyToken, selectedFormat, 30, timeWindow);
        setProgress(100);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err) {
        setSyncStatus('error');
        setSyncError(err.message || 'Error al conectar con el scraper de MTGTop8');
      }
    }
  };

  // Obtener los Top 5 staples ordenados por porcentaje de presencia
  const topStaples = useMemo(() => {
    if (!metaProfile?.staples) return [];
    return Object.entries(metaProfile.staples)
      .map(([name, pct]) => ({ name, pct }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [metaProfile]);

  // Formatear fecha de última sincronización
  const formattedSyncDate = useMemo(() => {
    if (!metaProfile?.lastIngestionDate) return 'Nunca';
    const date = new Date(metaProfile.lastIngestionDate);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString();
  }, [metaProfile]);

  // Formatos disponibles
  const formats = [
    { id: 'STANDARD', label: 'Standard' },
    { id: 'PIONEER', label: 'Pioneer' },
    { id: 'MODERN', label: 'Modern' },
    { id: 'LEGACY', label: 'Legacy' }
  ];

  return (
    <div className="flex flex-col p-6 relative">
      {/* Glacial Top Ambient Glow */}
      <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-magic-gold to-transparent blur-[1px]" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-magic-gold/20 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="text-magic-gold animate-pulse" size={20} />
            <div className="absolute inset-0 bg-magic-gold/20 rounded-full blur-md animate-ping" />
          </div>
          <div>
            <h4 className="text-sm font-cinzel text-magic-gold font-bold uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(255,202,88,0.3)]">
              Meta-Ingestor de Torneos
            </h4>
            <p className="text-[9.5px] text-[#f4ece0]/50 tracking-wider">
              Motor de Inteligencia MTGTop8 (Apify)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-amber-950/40 border border-magic-gold/20 px-3 py-1 rounded-full text-[9px] font-bold text-[#f4ece0] uppercase tracking-widest shadow-inner">
          <Database size={10} className="text-magic-gold" />
          <span>
            {metaProfile?.source && metaProfile.source.includes('MTGTop8')
              ? 'MTGTop8 API' 
              : metaProfile?.source 
                ? metaProfile.source 
                : 'Simulado'}
          </span>
        </div>
      </div>

      {/* Selector de Modo de Ingesta */}
      <div className="flex border-b border-magic-gold/20 mb-4 text-xs">
        <button
          type="button"
          onClick={() => setIngestMode('auto')}
          className={cn(
            "flex-1 pb-2 border-b-2 font-bold uppercase tracking-widest text-[9.5px] transition-all duration-300",
            ingestMode === 'auto'
              ? "border-magic-gold text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.25)]"
              : "border-transparent text-magic-gold/40 hover:text-magic-gold"
          )}
        >
          MTGTop8 API
        </button>
        <button
          type="button"
          onClick={() => setIngestMode('manual')}
          className={cn(
            "flex-1 pb-2 border-b-2 font-bold uppercase tracking-widest text-[9.5px] transition-all duration-300",
            ingestMode === 'manual'
              ? "border-magic-gold text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.25)]"
              : "border-transparent text-magic-gold/40 hover:text-magic-gold"
          )}
        >
          Manual (Texto)
        </button>
      </div>

      {/* Inputs condicionales según el modo */}
      {ingestMode === 'auto' ? (
        <div className="space-y-3 mb-4">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-magic-gold uppercase tracking-widest">
              <Key size={12} className="text-magic-gold" />
              Token de API Apify
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apifyToken}
                onChange={handleApifyTokenChange}
                placeholder="Token API (Opcional - Sincroniza con Mocks si está vacío)"
                className="w-full pl-3 pr-10 py-2 bg-black/60 border border-magic-gold/20 rounded-xl text-xs text-[#f4ece0] placeholder-magic-gold/30 font-mono focus:border-magic-gold focus:ring-2 focus:ring-magic-gold/20 focus:shadow-[0_0_15px_rgba(255,202,88,0.2)] focus:outline-none transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-magic-gold/50 hover:text-[#ffca58] transition-colors"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="text-[9px] text-[#f4ece0]/40 leading-tight">
              El token se almacena localmente de forma segura en tu navegador y nunca se envía a servidores de terceros.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-magic-gold uppercase tracking-widest">
              <Calendar size={12} className="text-magic-gold" />
              Ventana de Búsqueda (Historial)
            </label>
            <select
              value={timeWindow}
              onChange={handleTimeWindowChange}
              className="w-full px-3 py-2 bg-black/60 border border-magic-gold/20 rounded-xl text-xs text-[#f4ece0] focus:border-magic-gold focus:outline-none backdrop-blur-md cursor-pointer font-medium"
            >
              <option value="2" className="bg-[#1a1612] text-[#f4ece0]">Últimas 2 semanas (Meta fresco)</option>
              <option value="4" className="bg-[#1a1612] text-[#f4ece0]">Último mes (Equilibrado)</option>
              <option value="8" className="bg-[#1a1612] text-[#f4ece0]">Últimos 2 meses (Por defecto)</option>
              <option value="16" className="bg-[#1a1612] text-[#f4ece0]">Últimos 4 meses (Temporada media)</option>
              <option value="24" className="bg-[#1a1612] text-[#f4ece0]">Últimos 6 meses (Metajuego consolidado)</option>
              <option value="52" className="bg-[#1a1612] text-[#f4ece0]">Último año (Histórico completo)</option>
            </select>
            <p className="text-[9px] text-[#f4ece0]/40 leading-tight">
              Amplía el rango de búsqueda en torneos de MTGTop8 para compilar arquetipos más diversos y temporadas estables.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 mb-4">
          <label className="flex items-center gap-1.5 text-[10.5px] font-bold text-magic-gold uppercase tracking-widest">
            <FileText size={12} className="text-magic-gold" />
            Pegar Mazo(s) en Texto Plano
          </label>
          <div className="relative">
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Pega aquí tu lista. Formato:&#10;4 Brainstorm&#10;4 Ponder&#10;4 Force of Will&#10;...&#10;&#10;Separa múltiples mazos usando '===' o saltos de línea dobles."
              rows={4}
              className="w-full p-3 bg-black/60 border border-magic-gold/20 rounded-xl text-xs text-[#f4ece0] placeholder-magic-gold/30 font-mono focus:border-magic-gold focus:ring-2 focus:ring-magic-gold/20 focus:shadow-[0_0_15px_rgba(255,202,88,0.2)] focus:outline-none transition-all duration-300 resize-none"
            />
          </div>
          <p className="text-[9px] text-[#f4ece0]/40 leading-tight">
            El motor procesará frecuencias, sinergias y staples del metajuego al sincronizar.
          </p>
        </div>
      )}

      {/* Selector de Formatos */}
      <div className="space-y-2 mb-4">
        <span className="block text-[10.5px] font-bold text-magic-gold uppercase tracking-widest">
          Formato Competitivo de Destino
        </span>
        <div className="grid grid-cols-4 gap-2">
          {formats.map((f) => {
            const isSelected = selectedFormat === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onFormatChange(f.id)}
                className={cn(
                  "py-1.5 rounded-lg border text-[10px] uppercase font-bold tracking-wider transition-all duration-300",
                  isSelected
                    ? "bg-magic-gold/10 border-magic-gold text-[#f4ece0] shadow-[0_0_10px_rgba(255,202,88,0.2)]"
                    : "bg-black/40 border-magic-gold/10 text-magic-gold/60 hover:border-magic-gold/25 hover:text-[#ffca58]"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Botón Sincronizar y Barra de Progreso */}
      <div className="space-y-3 mb-5">
        <button
          type="button"
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
          className={cn(
            "w-full py-2.5 rounded-xl border font-cinzel text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2",
            syncStatus === 'syncing'
              ? "bg-[#1a1612] border-magic-gold/30 text-magic-gold cursor-not-allowed"
              : "bg-magic-gold/10 border-magic-gold/30 hover:border-[#ffca58] hover:bg-magic-gold/20 text-[#f4ece0] hover:shadow-[0_0_15px_rgba(255,202,88,0.2)] cursor-pointer"
          )}
        >
          <RefreshCw size={12} className={cn("text-magic-gold", syncStatus === 'syncing' && "animate-spin")} />
          <span>{syncStatus === 'syncing' ? 'Sincronizando...' : 'Sincronizar Metajuego'}</span>
        </button>

        {/* Barra de progreso */}
        <AnimatePresence>
          {syncStatus === 'syncing' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-1.5"
            >
              <div className="w-full h-2.5 bg-[#2a1b0a] border border-[#ffca58]/30 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] relative">
                {/* Fondo sutil */}
                <div className="absolute inset-0 bg-[#ffca58]/5" />
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#ffca58]/50 via-[#ffca58] to-[#fff3d4] shadow-[0_0_15px_rgba(255,202,88,0.8)] relative" 
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeInOut" }}
                >
                  <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/40" />
                </motion.div>
              </div>
              <div className="flex justify-between text-[8.5px] font-mono text-magic-gold/80">
                <span>Absorbiendo Matrices de Coocurrencia...</span>
                <span>{progress}%</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notificaciones de Éxito / Error */}
        <AnimatePresence>
          {syncStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-2.5 rounded-lg bg-green-950/30 border border-green-500/30 text-green-300 text-[10.5px] flex items-center gap-2 shadow-inner"
            >
              <CheckCircle2 size={13} className="text-green-400" />
              <span>Sincronización exitosa. Datos de torneos cargados.</span>
            </motion.div>
          )}

          {syncStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-2.5 rounded-lg bg-red-950/30 border border-red-500/30 text-red-300 text-[10.5px] flex items-start gap-2 shadow-inner"
            >
              <AlertTriangle size={13} className="text-red-400 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold block">Fallo de Conexión:</span>
                <span className="text-red-200/80 text-[9.5px] leading-tight">{syncError}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Consola de Diagnóstico de Salud */}
      <div className="bg-black/60 border border-magic-gold/10 rounded-2xl p-4 space-y-3.5 shadow-inner">
        <div className="flex justify-between items-center text-[10.5px] font-bold text-magic-gold border-b border-magic-gold/10 pb-1.5">
          <span className="flex items-center gap-1.5">
            <Server size={12} className="text-magic-gold" />
            Consola de Diagnóstico
          </span>
          <span className="text-[9.5px] text-[#ffca58] font-mono">Salud: OK</span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-[10px]">
          <div className="space-y-0.5">
            <span className="block text-[#f4ece0]/40 uppercase text-[8.5px] tracking-wider">Último Análisis</span>
            <span className="font-mono text-[#f4ece0] flex items-center gap-1">
              <Calendar size={10} className="text-magic-gold/60" />
              {formattedSyncDate}
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="block text-[#f4ece0]/40 uppercase text-[8.5px] tracking-wider">Decks Muestreados</span>
            <span className="font-mono text-[#f4ece0] flex items-center gap-1">
              <Globe size={10} className="text-magic-gold/60" />
              {metaProfile?.totalDecks || 0} Mazos Reales
            </span>
          </div>
        </div>

        {/* Staples del Metajuego */}
        <div className="space-y-2 pt-1.5 border-t border-magic-gold/10">
          <span className="flex items-center gap-1.5 text-[9.5px] font-bold text-magic-gold uppercase tracking-widest">
            <TrendingUp size={11} className="text-magic-gold" />
            Staples Top de {selectedFormat}
          </span>

          <div className="space-y-1.5">
            {topStaples.length > 0 ? (
              topStaples.map((s) => (
                <div key={s.name} className="space-y-0.5">
                  <div className="flex justify-between text-[9px] font-medium text-[#f4ece0]">
                    <span className="capitalize">{s.name}</span>
                    <span className="font-mono text-magic-gold">{s.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#2a1b0a] border border-[#ffca58]/30 rounded-full overflow-hidden shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] relative">
                    <div 
                      className="h-full bg-gradient-to-r from-[#ffca58]/40 to-[#ffca58] rounded-full shadow-[0_0_8px_rgba(255,202,88,0.6)] relative"
                      style={{ width: `${s.pct}%` }}
                    >
                      <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <span className="text-[9px] text-magic-gold/40 italic block text-center py-2">
                Ninguno registrado. Sincroniza para inicializar.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
