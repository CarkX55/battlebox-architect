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
    <div className="p-6 bg-grimorio-dark border-2 border-grimorio-gold/30 rounded-lg">
      <h2 className="text-xl text-grimorio-gold mb-4">Cargar Base de Datos</h2>
      
      {cardCount > 0 && (
        <p className="text-grimorio-parchment mb-4">
          Ya tienes {cardCount.toLocaleString()} cartas cargadas.
        </p>
      )}

      <div className="space-y-4">
        <label className="block">
          <span className="sr-only">Seleccionar archivo JSON</span>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={status === 'loading'}
            className="block w-full text-sm text-grimorio-parchment
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-lg file:border-0
                       file:text-sm file:font-semibold
                       file:bg-grimorio-gold file:text-grimorio-dark
                       hover:file:bg-grimorio-gold/80
                       file:cursor-pointer file:transition-colors"
          />
        </label>

        {status === 'loading' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-grimorio-parchment">
              <span>Cargando...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-grimorio-gold/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-grimorio-gold transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <p className="text-red-400 text-sm">Error: {error}</p>
        )}
      </div>
    </div>
  );
}