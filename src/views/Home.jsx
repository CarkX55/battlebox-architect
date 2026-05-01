import { useState, useEffect } from 'react';
import SearchBar from '../components/atoms/SearchBar';
import DataIngestor from '../components/molecules/DataIngestor';
import { getCardCount } from '../services/dbIngestor';

export default function Home() {
  const [cardCount, setCardCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getCardCount().then((count) => {
      setCardCount(count);
      setIsLoaded(true);
    }).catch((err) => {
      console.error('Error:', err);
      setIsLoaded(true);
    });
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl text-grimorio-gold font-cinzel">Ecosistema Legacy Battle Box</h2>
        <p className="text-grimorio-parchment/70">Arquitecto de mazos equilibrados para diversión entre amigos</p>
      </div>

      {!isLoaded ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-2 border-grimorio-gold/30 border-t-grimorio-gold rounded-full animate-spin" />
        </div>
      ) : cardCount === 0 ? (
        <DataIngestor />
      ) : (
        <div className="space-y-6">
          <div className="flex justify-center">
            <SearchBar />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-grimorio-dark border border-grimorio-gold/30 rounded-lg text-center">
              <p className="text-3xl text-grimorio-gold font-cinzel">{cardCount.toLocaleString()}</p>
              <p className="text-grimorio-parchment/70 text-sm">Cartas indexadas</p>
            </div>
            <div className="p-4 bg-grimorio-dark border border-grimorio-gold/30 rounded-lg text-center">
              <p className="text-3xl text-grimorio-gold font-cinzel">Fase 1</p>
              <p className="text-grimorio-parchment/70 text-sm">Motor Karsten</p>
            </div>
            <div className="p-4 bg-grimorio-dark border border-grimorio-gold/30 rounded-lg text-center">
              <p className="text-3xl text-grimorio-gold font-cinzel">Listo</p>
              <p className="text-grimorio-parchment/70 text-sm">Estado del sistema</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}