import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Database, Cpu, Globe, Trash2, CheckCircle2, 
  AlertTriangle, HardDrive
} from 'lucide-react';
import { getCardCount, clearScryfallData } from '../services/dbIngestor';
import DataIngestor from '../components/molecules/DataIngestor';
import AiConfigPanel from '../components/forge/AiConfigPanel';
import MetaIngestor from '../components/forge/MetaIngestor';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'meta' | 'database'
  const [cardCount, setCardCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(true);
  const [showConfirmWipe, setShowConfirmWipe] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [wipeSuccess, setWipeSuccess] = useState(false);
  
  const [selectedFormat, setSelectedFormat] = useState('MODERN');

  const updateCardCount = async () => {
    setLoadingCount(true);
    try {
      const count = await getCardCount();
      setCardCount(count);
    } catch (e) {
      console.error("Error al obtener recuento de cartas:", e);
    } finally {
      setLoadingCount(false);
    }
  };

  useEffect(() => {
    updateCardCount();
  }, []);

  const handleWipeDatabase = async () => {
    setWiping(true);
    try {
      await clearScryfallData();
      setCardCount(0);
      setWipeSuccess(true);
      setShowConfirmWipe(false);
      setTimeout(() => setWipeSuccess(false), 3000);
    } catch (err) {
      alert("Error al vaciar el grimorio: " + err.message);
    } finally {
      setWiping(false);
    }
  };

  const handleIngestComplete = () => {
    updateCardCount();
  };

  const tabs = [
    { id: 'ai', name: 'Motores IA', icon: Cpu, desc: 'Configuración' },
    { id: 'meta', name: 'Metajuego', icon: Globe, desc: 'Live Data' },
    { id: 'database', name: 'Grimorio', icon: Database, desc: 'Scryfall DB' },
  ];

  return (
    <div className="min-h-screen py-12 px-4 md:px-8 bg-[url('/ASSETS/Obsidiana.webp')] bg-cover bg-fixed text-[#f4ece0]/95">
      <div className="max-w-6xl mx-auto space-y-10">
        
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-8 gap-6 border-b border-magic-gold/20">
          <div className="flex items-center gap-6">
            <img 
              src="/ASSETS/Engranaje.webp" 
              alt="Admin" 
              className="w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.6)] animate-[spin_30s_linear_infinite]" 
            />
            <div>
              <h1 className="text-4xl md:text-5xl font-cinzel font-black tracking-[0.2em] text-magic-gold uppercase">
                Panel de Admin
              </h1>
              <p className="text-magic-gold/60 font-serif italic text-sm md:text-base mt-2 tracking-wide">
                Ajustes arcanos del sistema, motores cognitivos y base de datos relacional.
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-4 bg-black/60 backdrop-blur-md border border-magic-gold/30 rounded-2xl p-4 shadow-[0_0_15px_rgba(0,0,0,0.8)] self-start md:self-center">
            <div className="p-3 bg-amber-500/10 rounded-xl border border-magic-gold/20">
              <HardDrive className="w-6 h-6 text-[#ffca58]" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-cinzel tracking-widest text-magic-gold/60">Índice Local</p>
              <p className="text-xl font-mono font-bold text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.4)]">
                {loadingCount ? 'Escaneando...' : `${cardCount.toLocaleString()} cartas`}
              </p>
            </div>
          </div>
        </div>

        {/* Tab Buttons (Nuevos Botones Letra) */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 pb-4">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`btn-letra transition-all duration-300 ${
                  !isActive 
                    ? 'opacity-60 grayscale-[50%] scale-90 hover:scale-95 hover:opacity-100 hover:grayscale-0' 
                    : 'scale-100 drop-shadow-[0_0_20px_rgba(255,202,88,0.6)] filter brightness-110'
                }`}
              >
                <div className="flex items-center justify-center gap-3 w-full px-2">
                  <tab.icon className="w-5 h-5" />
                  <span className="font-cinzel tracking-[0.15em] whitespace-nowrap">{tab.name}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Content Frame (Leather Panel) */}
        <div className="leather-panel p-8 md:p-12 min-h-[500px] relative mt-4 z-10">
          <AnimatePresence mode="wait">
            {activeTab === 'ai' && (
              <motion.div
                key="ai-config"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-magic-gold/20 pb-4">
                  <Cpu className="w-8 h-8 text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" />
                  <h2 className="font-cinzel font-bold text-2xl tracking-[0.15em] text-magic-gold uppercase">
                    Configuración de Motores
                  </h2>
                </div>
                
                <p className="text-[#f4ece0]/70 font-serif italic text-sm leading-relaxed max-w-3xl">
                  Define la clave API y el modelo que impulsará la forja inteligente de BattleBox. Los cambios se guardarán localmente de forma segura en tu grimorio local.
                </p>

                <div className="frosted-panel p-6 rounded-2xl border border-magic-gold/30 bg-gradient-to-br from-amber-950/15 via-black/85 to-stone-950/90 shadow-[0_0_30px_rgba(255,202,88,0.12)] backdrop-blur-sm overflow-hidden relative">
                  <AiConfigPanel 
                    storageKey="mtg_ai_config_forge"
                    onConfigReady={(cfg) => {
                      console.log("Configuración de IA actualizada desde Admin:", cfg);
                    }}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'meta' && (
              <motion.div
                key="meta-sync"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-6 border-b border-magic-gold/20 pb-4">
                  <Globe className="w-8 h-8 text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" />
                  <h2 className="font-cinzel font-bold text-2xl tracking-[0.15em] text-magic-gold uppercase">
                    Sincronización del Metajuego
                  </h2>
                </div>
                
                <p className="text-[#f4ece0]/70 font-serif italic text-sm leading-relaxed max-w-3xl">
                  Sincroniza y descarga las listas de mazos competitivos que han ganado torneos recientemente en MTGTop8 a través de la integración automatizada.
                </p>

                <div className="frosted-panel p-6 rounded-2xl border border-magic-gold/30 bg-gradient-to-br from-amber-950/15 via-black/85 to-stone-950/90 shadow-[0_0_30px_rgba(255,202,88,0.12)] backdrop-blur-sm overflow-hidden relative">
                  <div className="flex flex-wrap gap-3 mb-6">
                    {['STANDARD', 'PIONEER', 'MODERN', 'LEGACY'].map((f) => (
                      <button
                        key={f}
                        onClick={() => setSelectedFormat(f)}
                        className={`btn-magic-glass ${
                          selectedFormat === f 
                            ? 'btn-glass-gold !border-magic-gold scale-105' 
                            : 'btn-glass-silver opacity-60'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <MetaIngestor 
                    selectedFormat={selectedFormat}
                    onFormatChange={setSelectedFormat}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === 'database' && (
              <motion.div
                key="database-mgmt"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-magic-gold/20 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    <Database className="w-8 h-8 text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" />
                    <h2 className="font-cinzel font-bold text-2xl tracking-[0.15em] text-magic-gold uppercase">
                      Gestión del Grimorio
                    </h2>
                  </div>

                  <button
                    onClick={() => setShowConfirmWipe(true)}
                    disabled={cardCount === 0 || wiping}
                    className="btn-magic-glass border-red-500/50 text-red-400 hover:bg-red-500/20 hover:border-red-500 hover:text-red-300 disabled:opacity-30"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Purgar Base de Datos
                  </button>
                </div>

                <p className="text-[#f4ece0]/70 font-serif italic text-sm leading-relaxed max-w-3xl">
                  Este panel permite cargar y sincronizar la base de datos principal de Magic: The Gathering (Scryfall) guardada en tu navegador (IndexedDB). Esto permite autocompletar cartas y verificar su legalidad de forma ultra rápida.
                </p>

                <AnimatePresence>
                  {showConfirmWipe && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 bg-red-950/40 border-2 border-red-500/50 rounded-2xl shadow-[0_0_30px_rgba(220,38,38,0.2)]"
                    >
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-red-500 shrink-0 mt-1 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                        <div>
                          <h4 className="font-cinzel font-bold text-lg tracking-wider text-red-400 uppercase">Advertencia de Purga</h4>
                          <p className="text-sm text-red-200/70 font-serif italic mt-2 leading-relaxed">
                            Esta acción borrará de manera inmediata e irreversible las {cardCount.toLocaleString()} cartas indexadas localmente. La autocompletación de cartas y la verificación de reglas dejarán de funcionar hasta que subas un nuevo archivo de datos Scryfall.
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-4 mt-6">
                        <button
                          onClick={() => setShowConfirmWipe(false)}
                          className="btn-magic-glass btn-glass-silver"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleWipeDatabase}
                          disabled={wiping}
                          className="px-6 py-2.5 rounded-xl text-xs font-cinzel font-bold bg-red-600 hover:bg-red-500 text-white uppercase tracking-[0.15em] transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)]"
                        >
                          {wiping ? 'Purgando...' : 'Ejecutar Purga'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {wipeSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-green-900/40 border border-green-500/50 rounded-xl flex items-center gap-3 shadow-[0_0_15px_rgba(34,197,94,0.2)]"
                  >
                    <CheckCircle2 className="w-6 h-6 text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                    <p className="text-sm text-green-300 font-serif italic">
                      El grimorio ha sido completamente purgado y vaciado con éxito.
                    </p>
                  </motion.div>
                )}

                <div className="frosted-panel p-6 rounded-2xl border border-magic-gold/30 bg-gradient-to-br from-amber-950/15 via-black/85 to-stone-950/90 shadow-[0_0_30px_rgba(255,202,88,0.12)] backdrop-blur-sm overflow-hidden relative">
                  <DataIngestor onComplete={handleIngestComplete} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

