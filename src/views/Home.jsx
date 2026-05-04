import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchBar from '../components/atoms/SearchBar';
import DataIngestor from '../components/molecules/DataIngestor';
import { getCardCount } from '../services/dbIngestor';

export default function Home() {
  const [cardCount, setCardCount] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isScrollOpen, setIsScrollOpen] = useState(false);

  useEffect(() => {
    getCardCount().then((count) => {
      setCardCount(count);
      setIsLoaded(true);
    }).catch((err) => {
      console.error('Error:', err);
      setIsLoaded(true);
    });
  }, []);

  const handleOpenScroll = () => {
    setIsScrollOpen(true);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-12 px-4">
      {/* Contenedor Grid para evitar saltos de Layout */}
      <div className="relative w-full max-w-6xl grid grid-cols-1 grid-rows-1 items-start justify-items-center">
        <AnimatePresence>
          {!isScrollOpen && (
            <motion.div
              key="closed-scroll"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ 
                opacity: 0, 
                scale: 0.95,
                transition: { duration: 0.4 } 
              }}
              className="col-start-1 row-start-1 relative cursor-pointer z-20 w-full"
              onClick={handleOpenScroll}
            >
              {/* Pergamino Enrollado (Ancho unificado) */}
              <img 
                src="/ASSETS/pergamino.png" 
                alt="Pergamino Cerrado" 
                className="w-full h-auto drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
              />
              
              {/* Sello Rojo Estático (Reset forzado de animaciones) */}
              <motion.div
                className="absolute top-[52%] left-1/2"
                style={{ x: "-50%", y: "-50%" }}
                initial={{ filter: "brightness(1)", scale: 1 }}
                animate={{ filter: "brightness(1)", scale: 1 }}
                whileHover={{ filter: "brightness(2)", scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <img 
                  src="/ASSETS/SelloRojo.png" 
                  alt="Sello Real" 
                  className="w-32 h-32 drop-shadow-[0_0_20px_rgba(255,0,0,0.5)]"
                />
                <div className="absolute inset-0 bg-red-600/10 blur-2xl rounded-full -z-10" />
              </motion.div>

              {/* Hint text - Intensidad aumentada para fondo obsidiana */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-grimorio-gold font-cinzel text-sm tracking-widest whitespace-nowrap uppercase drop-shadow-[0_2px_10px_rgba(212,175,55,0.3)] drop-shadow-[0_4px_4px_rgba(0,0,0,1)]"
              >
                Pulsa el sello para desenrollar
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {isScrollOpen && (
          <motion.div
            key="open-scroll"
            initial={{ opacity: 0, height: 0, transformOrigin: "top" }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ 
              duration: 1.5,
              ease: [0.16, 1, 0.3, 1] // Curva suave y cinemática
            }}
            className="col-start-1 row-start-1 relative w-full z-10 overflow-hidden rounded-b-3xl shadow-2xl"
          >
            {/* Imagen del Pergamino Abierto (Base) */}
            <img 
              src="/ASSETS/PergAbierto.png" 
              alt="Pergamino Abierto" 
              className="w-full h-auto block drop-shadow-[0_40px_80px_rgba(0,0,0,0.9)]"
            />

            {/* Contenido superpuesto - Ajustado para estar centrado visualmente */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 z-10 pl-20 pr-10 pt-80 pb-24 flex flex-col items-center overflow-y-auto custom-scrollbar"
            >
              {/* Bloque de Título y Buscador Unificado */}
              <div className="w-full max-w-2xl flex flex-col items-center text-center space-y-12">
                
                {/* Título (PergaQuemado) */}
                <div className="w-full flex justify-center">
                  <img 
                    src="/ASSETS/PergaQuemado.png" 
                    alt="Título Quemado" 
                    className="w-full h-auto drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                  />
                </div>

                {/* Subtítulo y Separador */}
                <div className="w-full">
                  <div className="h-px w-64 bg-black/20 mx-auto" />
                  <p className="text-black/80 font-serif italic text-2xl mt-4">
                    Arquitecto de mazos equilibrados
                  </p>
                </div>

                {/* Buscador (Ahora mide exactamente lo mismo que el título) */}
                {!isLoaded ? (
                  <div className="flex justify-center py-12">
                    <div className="w-16 h-16 border-4 border-black/10 border-t-black/80 rounded-full animate-spin" />
                  </div>
                ) : cardCount === 0 ? (
                  <div className="w-full">
                    <DataIngestor />
                  </div>
                ) : (
                  <div className="w-full space-y-20">
                    <div className="w-full transform hover:scale-[1.01] transition-transform">
                      <SearchBar />
                    </div>
                    
                    {/* Estadísticas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
                      {[
                        { label: "Cartas indexadas", value: cardCount.toLocaleString() },
                        { label: "Motor Karsten", value: "Fase 1" },
                        { label: "Estado del sistema", value: "Listo" }
                      ].map((stat, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.8 + (i * 0.1) }}
                          className="text-center group flex flex-col items-center"
                        >
                          <p className="text-5xl text-black font-cinzel font-black tracking-tight drop-shadow-sm group-hover:scale-105 transition-transform duration-500">{stat.value}</p>
                          <p className="text-black/50 text-[10px] font-bold uppercase tracking-[0.3em] mt-4 border-t border-black/10 pt-3 w-full max-w-[120px]">{stat.label}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setIsScrollOpen(false)}
                className="mt-auto mb-4 px-8 py-2.5 relative overflow-hidden group
                           bg-black/50 backdrop-blur-md border border-white/10 rounded-full
                           text-white/40 font-cinzel text-[11px] font-bold uppercase tracking-[0.4em]
                           hover:text-[#dc2626] hover:bg-black/70 hover:border-[#dc2626]/50
                           transition-all duration-500 shadow-[0_0_20px_rgba(0,0,0,0.5)]
                           hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]"
                style={{
                  backgroundImage: "url('/ASSETS/FrostedGlass.jpg')",
                  backgroundSize: 'cover',
                  backgroundBlendMode: 'overlay',
                  filter: 'brightness(1.3)'
                }}
              >
                <div className="absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] 
                              bg-gradient-to-r from-transparent via-white/15 to-transparent 
                              transition-transform duration-1000 ease-out" />
                <span className="relative drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Volver a Enrollar</span>
              </button>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
}