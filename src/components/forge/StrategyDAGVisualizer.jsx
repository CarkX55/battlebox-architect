import { useState } from 'react';
import { Target, CheckCircle2, ShieldCheck, Zap, ArrowRight, Layers, Sparkles } from 'lucide-react';

export default function StrategyDAGVisualizer({ strategy = '', deckName = '' }) {
  const [selectedNode, setSelectedNode] = useState('node_t1');

  const text = `${deckName} ${strategy}`.toLowerCase();
  const isControl = text.includes('control') || text.includes('draw') || text.includes('removal');

  const dagNodes = isControl ? [
    {
      id: 'node_t1',
      turn: 'T1',
      title: 'Mana Acceleration & Cantrips',
      capability: 'cap.mana.acceleration',
      status: 'SATISFIED',
      cardsCount: 10,
      produces: ['+ Mana Advantage', '+ Library Velocity'],
      dependsOn: [],
      cardBindings: ['Llanowar Elves', 'Birds of Paradise', 'Utopia Sprawl', 'Ponder']
    },
    {
      id: 'node_t2',
      title: 'Resource Engine & Draw',
      capability: 'cap.card.draw',
      status: 'SATISFIED',
      cardsCount: 8,
      produces: ['+ Card Advantage', '+ Selection'],
      dependsOn: ['node_t1'],
      cardBindings: ['Night\'s Whisper', 'Sylvan Library', 'Expressive Iteration']
    },
    {
      id: 'node_t3',
      title: 'Interaction & Removal Package',
      capability: 'cap.removal.single_target',
      status: 'SATISFIED',
      cardsCount: 6,
      produces: ['+ Board Control', '- Threat Density'],
      dependsOn: ['node_t2'],
      cardBindings: ['Swords to Plowshares', 'Lightning Bolt', 'Counterspell']
    },
    {
      id: 'node_t4',
      title: 'Finisher & Board Overlord',
      capability: 'cap.threat.density',
      status: 'SATISFIED',
      cardsCount: 4,
      produces: ['+ Lethal Win Condition', '+ Game Closing'],
      dependsOn: ['node_t3'],
      cardBindings: ['Primeval Titan', 'Craterhoof Behemoth', 'Sheoldred']
    }
  ] : [
    {
      id: 'node_t1',
      turn: 'T1',
      title: 'Elf Mana Engine',
      capability: 'cap.mana.acceleration',
      status: 'SATISFIED',
      cardsCount: 12,
      produces: ['+ Mana', '+ Tempo', '+ Bodies', '+ Sac Fodder'],
      dependsOn: [],
      cardBindings: ['Llanowar Elves', 'Elvish Mystic', 'Birds of Paradise', 'Utopia Sprawl']
    },
    {
      id: 'node_t2',
      title: 'Creature Mass & Synergy Engine',
      capability: 'cap.synergy.token',
      status: 'SATISFIED',
      cardsCount: 10,
      produces: ['+ Board Presence', '+ Token Swarm'],
      dependsOn: ['node_t1'],
      cardBindings: ['Elvish Archdruid', 'Imperious Perfect', 'Rishkar']
    },
    {
      id: 'node_t3',
      title: 'Protection & Anthem Package',
      capability: 'cap.protection',
      status: 'SATISFIED',
      cardsCount: 4,
      produces: ['+ Hexproof Resilience', '+ Stat Buffs'],
      dependsOn: ['node_t2'],
      cardBindings: ['Heroic Intervention', 'Teferi\'s Protection', 'Coat of Arms']
    },
    {
      id: 'node_t4',
      title: 'Lethal Overwhelm Finisher',
      capability: 'cap.threat.density',
      status: 'SATISFIED',
      cardsCount: 4,
      produces: ['+ Trample Overwhelm', '+ Lethal Turn 4'],
      dependsOn: ['node_t3'],
      cardBindings: ['Craterhoof Behemoth', 'Triumph of the Hordes', 'Overwhelming Stampede']
    }
  ];

  const activeNode = dagNodes.find(n => n.id === selectedNode) || dagNodes[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-purple-300 flex items-center gap-1.5 font-cinzel">
          <Target size={14} className="text-purple-400" />
          <span>Grafo Interactivo de Compilación Estratégica (Executable Strategy DAG)</span>
        </h4>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-500/30">
          DAG Dependencias Causales
        </span>
      </div>

      {/* DAG Graph Flow */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {dagNodes.map((node, idx) => {
          const isSelected = selectedNode === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                isSelected
                  ? 'border-magic-gold bg-gradient-to-b from-purple-950/60 to-black text-white shadow-[0_0_20px_rgba(255,202,88,0.2)] scale-[1.02]'
                  : 'border-white/10 bg-black/40 text-white/70 hover:bg-black/60 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-mono font-bold mb-2">
                <span className="text-magic-gold font-cinzel">{node.turn || `Paso ${idx + 1}`}</span>
                <span className="bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[9px]">
                  {node.status}
                </span>
              </div>
              <h5 className="font-cinzel text-xs font-bold text-white mb-1 leading-tight">{node.title}</h5>
              <span className="text-[10px] font-mono text-purple-300 block mb-2">{node.capability}</span>
              
              <div className="flex items-center justify-between text-[10px] text-white/50 border-t border-white/10 pt-2 font-mono">
                <span>{node.cardsCount} cartas</span>
                {idx < dagNodes.length - 1 && <ArrowRight size={12} className="text-magic-gold/60" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Inspector Detail Panel */}
      {activeNode && (
        <div className="p-4 bg-black/80 border border-purple-500/40 rounded-2xl space-y-3 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-magic-gold" />
              <span className="font-cinzel font-bold text-xs text-magic-gold uppercase tracking-wider">
                Detalle de Nodo DAG: {activeNode.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300">{activeNode.capability}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-white/50 block font-cinzel text-[10px] uppercase mb-1">Efectos & Capacidades Producidas</span>
              <div className="flex flex-wrap gap-1.5">
                {activeNode.produces.map((p, i) => (
                  <span key={i} className="bg-purple-950/80 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 font-mono text-[10px]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-white/50 block font-cinzel text-[10px] uppercase mb-1">Cartas que Satisfacen este Nodo</span>
              <div className="flex flex-wrap gap-1.5">
                {activeNode.cardBindings.map((c, i) => (
                  <span key={i} className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 font-mono text-[10px]">
                    ✓ {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
