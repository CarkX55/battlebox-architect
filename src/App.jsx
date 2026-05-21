import { lazy, Suspense } from 'react';
import { useAppStore } from './store/useAppStore';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';

const Home = lazy(() => import('./views/Home'));
const BattleBox = lazy(() => import('./views/BattleBox'));
const Community = lazy(() => import('./views/Community'));
const DeckForge = lazy(() => import('./views/DeckForge'));
const DeckArchive = lazy(() => import('./views/DeckArchive'));
const Admin = lazy(() => import('./views/AdminPanel'));

const views = {
  Home,
  DeckForge,
  DeckArchive,
  BattleBox,
  Community,
  Admin,
};

function Navigation() {
  const { currentView, setCurrentView } = useAppStore();
  const navItems = ['Home', 'DeckForge', 'DeckArchive', 'BattleBox', 'Community', 'Admin'];
  
  return (
    <nav className="flex justify-center flex-wrap gap-4 p-4 bg-black/60 backdrop-blur-xl border-b border-magic-gold/10 sticky top-0 z-40">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => setCurrentView(item)}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-cinzel uppercase tracking-widest transition-all duration-300",
            currentView === item
              ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/40 shadow-[0_0_20px_rgba(255,223,145,0.2)] scale-105"
              : "text-[#f4ece0]/40 hover:text-magic-gold hover:bg-magic-gold/5"
          )}
        >
          {item}
        </button>
      ))}
    </nav>
  );
}

function App() {
  console.log('🏗️ [APP] Renderizando componente...');
  const currentView = useAppStore((state) => state.currentView);
  const isDbLoading = useAppStore((state) => state.isDbLoading);
  const loadingProgress = useAppStore((state) => state.loadingProgress);
  const CurrentView = views[currentView];
  
  return (
    <MotionConfig>
      <div className="min-h-screen text-[#f4ece0]">
        <header className="p-8 bg-black/40 backdrop-blur-md border-b border-magic-gold/20 flex justify-center items-center">
          <img 
            src="/ASSETS/MAGIC.webp" 
            alt="Magic The Gathering" 
            className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.2)] hover:scale-105 transition-transform duration-500"
          />
        </header>
        <Navigation />
        <main className="p-4">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
              <div className="w-16 h-16 border-4 border-magic-gold/20 border-t-magic-gold rounded-full animate-spin mb-4"></div>
              <p className="font-cinzel text-magic-gold/60 tracking-[0.3em] uppercase text-sm">Canalizando el Oráculo...</p>
            </div>
          }>
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <CurrentView />
            </motion.div>
          </Suspense>
        </main>

        {/* Global Loading Overlay for DB Ingestion */}
        <AnimatePresence>
          {isDbLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl"
            >
              <div className="relative w-64 h-64 flex flex-col items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-dashed border-magic-gold/20 rounded-full"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-8 border-2 border-magic-gold/40 rounded-full"
                />
                
                <div className="relative z-10 flex flex-col items-center">
                  <motion.img
                    src="/ASSETS/TomoHome.webp"
                    alt="Cargando..."
                    animate={{ 
                      scale: [1, 1.1, 1],
                      rotate: [0, 2, -2, 0]
                    }}
                    transition={{ 
                      duration: 4, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="w-48 h-48 object-contain mb-4 drop-shadow-[0_0_20px_rgba(255,223,145,0.3)]"
                  />
                  <p className="font-cinzel text-magic-gold text-xl tracking-[0.4em] uppercase font-bold text-center">
                    Invocando Archivos
                  </p>
                  <div className="w-48 h-1 bg-white/10 rounded-full mt-6 overflow-hidden">
                    <motion.div 
                      className="h-full bg-magic-gold shadow-[0_0_10px_#ffdf91]"
                      initial={{ width: 0 }}
                      animate={{ width: `${loadingProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-white/40 font-serif italic text-xs mt-4">
                    {loadingProgress}% completado
                  </p>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-10 left-10 w-32 h-32 border-l border-t border-magic-gold/20" />
              <div className="absolute top-10 right-10 w-32 h-32 border-r border-t border-magic-gold/20" />
              <div className="absolute bottom-10 left-10 w-32 h-32 border-l border-b border-magic-gold/20" />
              <div className="absolute bottom-10 right-10 w-32 h-32 border-r border-b border-magic-gold/20" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}

export default App;