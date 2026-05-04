import { useState } from 'react';
import { ingestScryfallData, getCardCount } from '../../services/dbIngestor';

export default function DataIngestor({ onComplete }) {
  const [status, setStatus] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [cardCount, setCardCount] = useState(0);
  const [error, setError] = useState(null);

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

    setStatus('loading');
    setError(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (!Array.isArray(data)) {
        throw new Error('Invalid JSON format');
      }

      await ingestScryfallData(data, (p) => {
        setProgress(p.percentage);
      });

      const total = await getCardCount();
      setCardCount(total);
      setStatus('complete');
      
      if (onComplete) onComplete();
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  if (status === 'complete') {
    return (
      <div className="p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
        <p className="text-green-400 font-medium">
          ✓ Base de datos cargada: {cardCount.toLocaleString()} cartas
        </p>
      </div>
    );
  }

  return (
    <div className="p-12 text-center max-w-xl mx-auto space-y-8">
      <h2 className="text-2xl text-black/80 font-cinzel font-bold italic tracking-[0.2em] opacity-70">
        Invocación de Registros
      </h2>
      
      {cardCount > 0 && (
        <p className="text-black/50 font-serif italic text-sm border-t border-black/5 pt-4">
          ~ {cardCount.toLocaleString()} pergaminos ya indexados en la biblioteca ~
        </p>
      )}

      <div className="space-y-6">
        <label className="relative cursor-pointer group block">
          <span className="sr-only">Seleccionar archivo JSON</span>
          <div className="flex flex-col items-center gap-3">
            <div className="px-8 py-2.5 relative overflow-hidden group
                          bg-black/50 backdrop-blur-md border border-white/10 rounded-full
                          text-white/40 font-cinzel text-[11px] font-bold uppercase tracking-[0.4em]
                          hover:text-[#06b6d4] hover:bg-black/70 hover:border-[#06b6d4]/40
                          transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                          hover:shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                 style={{
                   backgroundImage: "url('/ASSETS/FrostedGlass.jpg')",
                   backgroundSize: 'cover',
                   backgroundBlendMode: 'overlay',
                   filter: 'brightness(1.3)'
                 }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent 
                            translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
              <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Seleccionar Manuscrito (.json)</span>
            </div>
          </div>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={status === 'loading'}
            className="hidden"
          />
        </label>

        {status === 'loading' && (
          <div className="space-y-3 pt-4">
            <div className="flex justify-between text-[10px] text-black/40 uppercase tracking-[0.3em] font-bold">
              <span>Traduciendo...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-[2px] bg-black/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-black/30"
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-900/60 text-xs italic font-serif">Error en la transcripción: {error}</p>
        )}
      </div>
    </div>
  );
}