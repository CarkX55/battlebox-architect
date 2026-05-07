import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ingestScryfallData, getCardCount } from '../../services/dbIngestor';
import { useAppStore } from '../../store/useAppStore';

export default function DataIngestor({ onComplete }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [error, setError] = useState(null);
  
  const setDbLoading = useAppStore(state => state.setDbLoading);
  const setLoadingProgress = useAppStore(state => state.setLoadingProgress);

  const checkExistingData = async () => {
    try {
      const count = await getCardCount();
      setCardCount(count);
      return count > 0;
    } catch {
      return false;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('parsing');
    setDbLoading(true);
    setLoadingProgress(0);
    setError(null);

    try {
      // Pequeño delay para asegurar que el UI se actualice antes del parse pesado
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('El archivo no es un array de cartas válido');
      }

      setStatus('loading');
      await ingestScryfallData(data, (p) => {
        setProgress(p.percentage);
        setLoadingProgress(p.percentage);
      });

      const total = await getCardCount();
      setCardCount(total);
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
          <span className="text-3xl">📜</span>
        </div>
        <h3 className="text-grimorio-gold font-cinzel text-xl font-bold tracking-widest uppercase">Grimorio Indexado</h3>
        <p className="text-white/60 font-serif italic text-sm">
          La biblioteca ha sido actualizada con {cardCount.toLocaleString()} pergaminos ancestrales.
        </p>
      </motion.div>
    );
  }

  return (
    <div className="p-8 text-center max-w-xl mx-auto relative">
      <AnimatePresence mode="wait">
        {(status === 'loading' || status === 'parsing') ? (
          <motion.div
            key="loading-state"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center justify-center space-y-12 py-12"
          >
            {/* Círculo de Invocación Animado */}
            <div className="relative w-48 h-48">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 border-2 border-dashed border-grimorio-gold/30 rounded-full"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                className="absolute inset-4 border border-grimorio-gold/20 rounded-full"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.img
                  src="/ASSETS/TomoHome.webp"
                  alt="Cargando..."
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.8, 1, 0.8]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-24 h-24 object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                />
              </div>
              
              {/* Progreso Circular */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-black/5"
                />
                <motion.circle
                  cx="96"
                  cy="96"
                  r="90"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray="565"
                  animate={{ strokeDashoffset: status === 'parsing' ? 565 : 565 - (565 * progress) / 100 }}
                  transition={{ duration: 0.5 }}
                  className="text-grimorio-gold"
                />
              </svg>
            </div>

            <div className="space-y-4">
              <h3 className="text-grimorio-gold font-cinzel text-lg tracking-[0.3em] font-bold uppercase animate-pulse">
                {status === 'parsing' ? 'Analizando Tomo...' : 'Transcribiendo...'}
              </h3>
              <div className="flex items-center gap-4 justify-center">
                <div className="h-px w-12 bg-grimorio-gold/20" />
                <span className="text-2xl font-cinzel text-black font-black">
                  {status === 'parsing' ? '...' : `${progress}%`}
                </span>
                <div className="h-px w-12 bg-grimorio-gold/20" />
              </div>
              <p className="text-black/40 font-serif italic text-xs max-w-[200px] mx-auto">
                {status === 'parsing' 
                  ? 'Desencriptando lenguajes antiguos y preparando la tinta arcana...'
                  : 'Organizando las energías arcanas de los archivos Scryfall...'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle-state"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <h2 className="text-3xl text-black font-cinzel font-black tracking-[0.2em] uppercase drop-shadow-sm">
              Invocación de Archivos
            </h2>
            
            <p className="text-black/60 font-serif italic text-lg leading-relaxed">
              La biblioteca está vacía. Para comenzar la arquitectura, debemos alimentar el grimorio con los registros de Scryfall.
            </p>

            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-grimorio-gold/0 via-grimorio-gold/30 to-grimorio-gold/0 blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              
              <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-black/10 rounded-3xl cursor-pointer hover:bg-black/5 transition-all duration-500 overflow-hidden group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 space-y-4">
                  <div className="w-12 h-12 bg-black/5 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                    <svg className="w-6 h-6 text-black/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-black font-cinzel font-bold tracking-widest uppercase">Entregar Manuscrito</p>
                    <p className="text-[10px] text-black/40 font-serif italic mt-1">Formato Scryfall Default Cards (.json)</p>
                  </div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
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