import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ingestScryfallData, ingestOracleTagsData, getCardCount } from '../../services/dbIngestor';
import { useAppStore } from '../../store/useAppStore';

export default function DataIngestor({ onComplete }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [error, setError] = useState(null);
  
  const setDbLoading = useAppStore(state => state.setDbLoading);
  const setLoadingProgress = useAppStore(state => state.setLoadingProgress);

  const [isTagsUploaded, setIsTagsUploaded] = useState(false);
  const [tagCount, setTagCount] = useState(0);

  const handleFileUpload = (type) => async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    setDbLoading(true);
    setLoadingProgress(0);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const text = await file.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.log(`ℹ️ Formato JSONL detectado. Parseando línea por línea...`);
        const lines = text.split('\n');
        data = [];
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine) {
            try {
              data.push(JSON.parse(trimmedLine));
            } catch (lErr) {}
          }
        }
      }
      
      if (!Array.isArray(data) && typeof data !== 'object') {
        throw new Error('El archivo no es un JSON o JSONL válido.');
      }

      setStatus('loading');

      if (type === 'tags') {
        const result = await ingestOracleTagsData(data, (p) => {
          setProgress(p.percentage);
          setLoadingProgress(p.percentage);
        });
        setIsTagsUploaded(true);
        setTagCount(result.saved || 0);
      } else {
        await ingestScryfallData(data, (p) => {
          setProgress(p.percentage);
          setLoadingProgress(p.percentage);
        });
        const total = await getCardCount();
        setCardCount(total);
        setIsTagsUploaded(false);
      }

      setStatus('complete');
      setDbLoading(false);
      
      if (onComplete) onComplete();
    } catch (err) {
      console.error('Error durante la ingesta:', err);
      setError(err.message);
      setStatus('error');
      setDbLoading(false);
    }
  };

  if (status === 'complete') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 bg-black/40 backdrop-blur-xl border border-grimorio-gold/30 rounded-2xl text-center space-y-4 shadow-2xl"
      >
        <div className="w-16 h-16 bg-grimorio-gold/10 rounded-full flex items-center justify-center mx-auto border border-grimorio-gold/20">
          <span className="text-3xl">{isTagsUploaded ? '🏷️' : '📜'}</span>
        </div>
        <h3 className="text-grimorio-gold font-cinzel text-xl font-bold tracking-widest uppercase">
          {isTagsUploaded ? 'Oracle Tags Vinculadas' : 'Grimorio Indexado'}
        </h3>
        <p className="text-white/60 font-serif italic text-sm">
          {isTagsUploaded 
            ? `Se han asociado ${tagCount.toLocaleString()} etiquetas comunitarias de Scryfall para potenciar el KnowledgeGraph.`
            : `La biblioteca ha sido actualizada con ${cardCount.toLocaleString()} pergaminos ancestrales.`
          }
        </p>
      </motion.div>
    );
  }

  return (
    <div className="p-8 text-center max-w-2xl mx-auto relative">
      <AnimatePresence mode="wait">
        {(status === 'loading' || status === 'parsing') ? (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center space-y-12 py-12"
          >
            <div className="relative w-48 h-48">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-grimorio-gold/30 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  src="/ASSETS/TomoHome.webp"
                  alt="Cargando..."
                  animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-grimorio-gold font-cinzel text-lg tracking-[0.3em] font-bold uppercase animate-pulse">
                {status === 'parsing' ? 'Analizando Tomo...' : 'Transcribiendo Archivo...'}
              </h3>
              <div className="flex items-center gap-4 justify-center">
                <span className="text-2xl font-cinzel text-magic-gold font-black">
                  {status === 'parsing' ? '...' : `${progress}%`}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <h2 className="text-3xl text-magic-gold font-cinzel font-black tracking-[0.2em] uppercase drop-shadow-[0_0_12px_rgba(255,202,88,0.4)]">
              Invocación de Archivos
            </h2>
            
            <p className="text-[#f4ece0]/70 font-serif italic text-sm leading-relaxed">
              Selecciona el tipo de archivo de Scryfall que deseas cargar en la base de datos:
            </p>

            {/* GRID DE DOS BOTONES DIFERENCIADOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              
              {/* BOTÓN 1: ORACLE CARDS */}
              <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-magic-gold/40 hover:border-magic-gold rounded-2xl cursor-pointer bg-black/30 hover:bg-black/60 transition-all duration-300 group shadow-lg">
                <div className="w-14 h-14 bg-magic-gold/10 border border-magic-gold/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                  <span className="text-2xl">📜</span>
                </div>
                <h4 className="text-magic-gold font-cinzel font-bold text-sm tracking-wider uppercase">
                  1. Cargar Cartas
                </h4>
                <p className="text-xs text-[#f4ece0]/60 font-serif italic mt-1">
                  Oracle Cards (.json / .jsonl)
                </p>
                <input
                  type="file"
                  accept=".json,.jsonl"
                  onChange={handleFileUpload('cards')}
                  className="hidden"
                />
              </label>

              {/* BOTÓN 2: ORACLE TAGS */}
              <label className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-500/40 hover:border-purple-400 rounded-2xl cursor-pointer bg-black/30 hover:bg-black/60 transition-all duration-300 group shadow-lg">
                <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/30 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                  <span className="text-2xl">🏷️</span>
                </div>
                <h4 className="text-purple-300 font-cinzel font-bold text-sm tracking-wider uppercase">
                  2. Cargar Etiquetas (Tags)
                </h4>
                <p className="text-xs text-[#f4ece0]/60 font-serif italic mt-1">
                  Oracle Tags (.json / .jsonl)
                </p>
                <input
                  type="file"
                  accept=".json,.jsonl"
                  onChange={handleFileUpload('tags')}
                  className="hidden"
                />
              </label>

            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
              >
                <p className="text-red-900/60 text-xs italic font-serif">
                  Error en la transcripción: {error}
                </p>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
ence>
    </div>
  );
}