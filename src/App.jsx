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
    <nav className="flex gap-4 p-4 bg-grimorio-dark border-b border-grimorio-gold/30">
      {navItems.map((item) => (
        <button
          key={item}
          onClick={() => setCurrentView(item)}
          className={cn(
            "px-4 py-2 rounded font-cinzel transition-all duration-200",
            currentView === item 
              ? "bg-grimorio-gold text-grimorio-dark" 
              : "text-grimorio-parchment hover:text-grimorio-gold"
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
      <div className="min-h-screen bg-grimorio-dark text-grimorio-parchment">
        <header className="p-4 border-b border-grimorio-gold/20">
          <h1 className="text-2xl text-grimorio-gold font-cinzel">La Fábrica de Ecosistemas MTG</h1>
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