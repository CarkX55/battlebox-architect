import { useAppStore } from './store/useAppStore';
import { MotionConfig, motion } from 'framer-motion';
import { cn } from './utils/cn';
import Home from './views/Home';
import BattleBox from './views/BattleBox';
import Community from './views/Community';
import DeckForge from './views/DeckForge';
import DeckArchive from './views/DeckArchive';

const views = {
  Home,
  DeckForge,
  DeckArchive,
  BattleBox,
  Community,
};

function Navigation() {
  const { currentView, setCurrentView } = useAppStore();
  const navItems = ['Home', 'DeckForge', 'DeckArchive', 'BattleBox', 'Community'];
  
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
  const setCurrentView = useAppStore((state) => state.setCurrentView);
  const CurrentView = views[currentView];
  
  return (
    <MotionConfig>
      <div className="min-h-screen text-[#f4ece0]">
        <header className="p-8 bg-black/40 backdrop-blur-md border-b border-magic-gold/20 flex justify-center items-center">
          <img 
            src="/ASSETS/MAGIC.png" 
            alt="Magic The Gathering" 
            className="h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,202,88,0.2)] hover:scale-105 transition-transform duration-500"
          />
        </header>
        <Navigation />
        <main className="p-4">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentView />
          </motion.div>
        </main>
      </div>
    </MotionConfig>
  );
}

export default App;