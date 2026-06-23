import { lazy, Suspense, Component, useState } from 'react';
import { useAppStore } from './store/useAppStore';
import { MotionConfig, motion, AnimatePresence } from 'framer-motion';
import { cn } from './utils/cn';
import { useIsMobile } from './hooks/useIsMobile';
import { vibrateTouch } from './utils/haptic';
import BottomSheet from './components/atoms/BottomSheet';
import { Home as HomeIcon, Hammer, Archive, Boxes, Users, Settings, MoreHorizontal, BookPlus } from 'lucide-react';

// ErrorBoundary class component to capture any runtime crashes gracefully and display the stack trace
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("💥 [React Crash] Error capturado en ErrorBoundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-4xl mx-auto border-2 border-red-500/40 bg-red-950/20 text-red-200 rounded-2xl shadow-2xl space-y-5 my-8 backdrop-blur-md">
          <h2 className="text-2xl font-cinzel text-red-400 font-bold uppercase tracking-wider flex items-center gap-2">
            ⚠️ El Grimorio ha Colapsado
          </h2>
          <p className="font-serif text-sm">
            Se ha producido un error crítico al canalizar este ecosistema. Por favor, compártele esta traza al Juez Supremo para su depuración:
          </p>
          <div className="p-5 bg-black/90 rounded-xl border border-red-500/25 overflow-x-auto text-xs font-mono text-red-400 leading-relaxed shadow-inner">
            {this.state.error && this.state.error.toString()}
            {this.state.error?.stack && (
              <pre className="mt-3 text-red-500/70 whitespace-pre-wrap font-sans text-[11px]">
                {this.state.error.stack}
              </pre>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-3 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/45 rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all"
            >
              🧹 Limpiar Caché y Reiniciar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-cinzel text-xs font-black uppercase tracking-widest transition-all shadow-lg"
            >
              Re-invocar Aplicación ➔
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Helper premium ultra-robusto para reintentar la descarga de vistas dinámicas (Lazy Chunks) de Vite
// en caso de fallo de red, cambios de hash tras compilación o caché corrompida.
const lazyWithRetry = (componentImport) => 
  lazy(() => 
    componentImport().catch((error) => {
      console.warn("🔮 [Vite Oracle] Fallo de importación dinámica detectado. Forzando recarga de página para traer los nuevos hashes...", error);
      window.location.reload();
      return { default: () => <div className="min-h-screen bg-[#0a0a0a]" /> };
    })
  );

const Home = lazyWithRetry(() => import('./views/Home'));
const BattleBox = lazyWithRetry(() => import('./views/BattleBox'));
const Community = lazyWithRetry(() => import('./views/Community'));
const DeckForge = lazyWithRetry(() => import('./views/DeckForge'));
const DeckArchive = lazyWithRetry(() => import('./views/DeckArchive'));
const Admin = lazyWithRetry(() => import('./views/AdminPanel'));
const DeckBuilder = lazyWithRetry(() => import('./views/DeckBuilder'));

const views = {
  Home,
  DeckForge,
  DeckBuilder,
  DeckArchive,
  BattleBox,
  Community,
  Admin,
};

const viewLabels = {
  Home: 'Inicio',
  DeckForge: 'Forjador',
  DeckBuilder: 'Creador',
  DeckArchive: 'Archivo',
  BattleBox: 'BattleBox',
  Community: 'Comunidad',
  Admin: 'Admin'
};

function Navigation() {
  const isMobile = useIsMobile();
  const { currentView, setCurrentView } = useAppStore();
  const navItems = ['Home', 'DeckForge', 'DeckBuilder', 'DeckArchive', 'BattleBox', 'Community', 'Admin'];
  
  if (isMobile) return null;

  return (
    <nav className="flex justify-center flex-wrap gap-4 p-4 bg-black/60 backdrop-blur-xl border-b border-magic-gold/10 sticky top-0 z-40">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => {
            vibrateTouch();
            setCurrentView(item);
          }}
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-cinzel uppercase tracking-widest transition-all duration-300",
            currentView === item
              ? "bg-magic-gold/20 text-magic-gold border border-magic-gold/40 shadow-[0_0_20px_rgba(255,223,145,0.2)] scale-105"
              : "text-[#f4ece0]/40 hover:text-magic-gold hover:bg-magic-gold/5"
          )}
        >
          {viewLabels[item] || item}
        </button>
      ))}
    </nav>
  );
}

function App() {
  console.log('🏗️ [APP] Renderizando componente...');
  const isMobile = useIsMobile();
  const { currentView, setCurrentView } = useAppStore();
  const isDbLoading = useAppStore((state) => state.isDbLoading);
  const loadingProgress = useAppStore((state) => state.loadingProgress);
  const CurrentView = views[currentView];
  
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState('left');

  const mainTabs = [
    { id: 'Home', label: 'Inicio', icon: HomeIcon },
    { id: 'DeckForge', label: 'Forja', icon: Hammer },
    { id: 'DeckArchive', label: 'Archivo', icon: Archive },
    { id: 'BattleBox', label: 'BattleBox', icon: Boxes }
  ];
  
  const moreTabs = [
    { id: 'DeckBuilder', label: 'Creador', icon: BookPlus },
    { id: 'Community', label: 'Comunidad', icon: Users },
    { id: 'Admin', label: 'Admin', icon: Settings }
  ];

  const changeView = (newView) => {
    const allViews = ['Home', 'DeckForge', 'DeckBuilder', 'DeckArchive', 'BattleBox', 'Community', 'Admin'];
    const currentIndex = allViews.indexOf(currentView);
    const newIndex = allViews.indexOf(newView);
    if (currentIndex !== -1 && newIndex !== -1) {
      setSwipeDirection(newIndex > currentIndex ? 'left' : 'right');
    }
    setCurrentView(newView);
  };

  const swipeViews = ['Home', 'DeckArchive', 'BattleBox'];
  const canSwipe = swipeViews.includes(currentView);

  const handleSwipeTransition = (direction) => {
    if (!isMobile || !canSwipe) return;
    
    const currentIndex = mainTabs.findIndex(t => t.id === currentView);
    if (currentIndex === -1) return;

    if (direction === 'left' && currentIndex < mainTabs.length - 1) {
      const nextView = mainTabs[currentIndex + 1].id;
      vibrateTouch();
      changeView(nextView);
    } else if (direction === 'right' && currentIndex > 0) {
      const prevView = mainTabs[currentIndex - 1].id;
      vibrateTouch();
      changeView(prevView);
    }
  };

  // Ocultar cabecera en móvil en cualquier vista que no sea Home para ahorrar espacio
  const showHeader = !isMobile || currentView === 'Home';

  return (
    <MotionConfig>
      <div className={cn("min-h-screen text-[#f4ece0] flex flex-col", isMobile ? "pb-24" : "")}>
        {showHeader && (
          <header className={cn(
            "bg-black/40 backdrop-blur-md border-b border-magic-gold/20 flex justify-center items-center shrink-0 transition-all duration-300",
            isMobile ? "p-4" : "p-8"
          )}>
            <img 
              src="/ASSETS/MAGIC.webp" 
              alt="Magic The Gathering" 
              className={cn(
                "w-auto object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.2)] hover:scale-105 transition-transform duration-500",
                isMobile ? "h-12" : "h-20"
              )}
            />
          </header>
        )}
        <Navigation />
        <main className="p-4 flex-1 flex flex-col min-h-0">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-pulse">
              <div className="w-16 h-16 border-4 border-magic-gold/20 border-t-magic-gold rounded-full animate-spin mb-4"></div>
              <p className="font-cinzel text-magic-gold/60 tracking-[0.3em] uppercase text-sm">Canalizando el Oráculo...</p>
            </div>
          }>
            <ErrorBoundary>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, x: swipeDirection === 'left' ? 60 : -60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: swipeDirection === 'left' ? -60 : 60 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  drag={isMobile && canSwipe ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.3}
                  onDragEnd={(e, info) => {
                    const threshold = 100;
                    if (info.offset.x < -threshold) {
                      handleSwipeTransition('left');
                    } else if (info.offset.x > threshold) {
                      handleSwipeTransition('right');
                    }
                  }}
                  className="w-full flex-1 flex flex-col min-h-0"
                >
                  <CurrentView />
                </motion.div>
              </AnimatePresence>
            </ErrorBoundary>
          </Suspense>
        </main>

        {/* Bottom Tab Bar for Mobile */}
        {isMobile && (
          <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d0a08]/95 backdrop-blur-2xl border-t border-magic-gold/20 flex justify-around items-center py-2 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.9)]">
            {mainTabs.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    vibrateTouch();
                    changeView(item.id);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 py-1 transition-all relative",
                    isActive ? "text-magic-gold" : "text-[#f4ece0]/40"
                  )}
                >
                  <motion.div
                    animate={isActive ? { scale: 1.15, y: -2 } : { scale: 1, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Icon size={20} className={cn("transition-colors", isActive ? "drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" : "")} />
                  </motion.div>
                  <span className="text-[9px] font-cinzel tracking-wider uppercase mt-1">
                    {item.label}
                  </span>
                  
                  {isActive && (
                    <motion.div
                      layoutId="activeTabDot"
                      className="absolute -bottom-1 w-1 h-1 bg-magic-gold rounded-full shadow-[0_0_6px_#ffdf91]"
                    />
                  )}
                </button>
              );
            })}
            
            {/* More (Más) Option */}
            <button
              onClick={() => {
                vibrateTouch();
                setIsMoreOpen(true);
              }}
              className={cn(
                "flex flex-col items-center justify-center flex-1 py-1 transition-all relative",
                moreTabs.some(t => t.id === currentView) ? "text-magic-gold" : "text-[#f4ece0]/40"
              )}
            >
              <MoreHorizontal size={20} />
              <span className="text-[9px] font-cinzel tracking-wider uppercase mt-1">Más</span>
            </button>
          </nav>
        )}

        {/* Bottom Sheet for More Options */}
        <BottomSheet 
          isOpen={isMoreOpen} 
          onClose={() => setIsMoreOpen(false)}
          title="Opciones del Oráculo"
        >
          <div className="flex flex-col gap-4 py-2">
            {moreTabs.map((item) => {
              const isActive = currentView === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    vibrateTouch();
                    changeView(item.id);
                    setIsMoreOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left",
                    isActive 
                      ? "bg-magic-gold/10 border-magic-gold/40 text-magic-gold shadow-[0_0_15px_rgba(255,223,145,0.15)]" 
                      : "bg-black/45 border-white/5 text-[#f4ece0]/70 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <div className={cn("p-2 rounded-lg border", isActive ? "border-magic-gold/30 bg-magic-gold/5" : "border-white/5 bg-white/5")}>
                    <Icon size={20} />
                  </div>
                  <span className="font-cinzel text-sm uppercase tracking-widest font-bold">
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </BottomSheet>

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