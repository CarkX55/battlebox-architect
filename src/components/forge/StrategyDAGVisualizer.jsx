import { useState } from 'react';
import { Target, CheckCircle2, ShieldCheck, Zap, ArrowRight, Layers, Sparkles } from 'lucide-react';

export default function StrategyDAGVisualizer({ strategy = '', deckName = '', roles = [], blueprint = {}, dagNodes: propDagNodes = null }) {
  const [selectedNode, setSelectedNode] = useState('node_t1');

  // Single Source of Truth: Consume dagNodes directly from CanonicalBlueprintModel / prop if provided
  let dagNodes = Array.isArray(propDagNodes) && propDagNodes.length > 0 ? propDagNodes : (Array.isArray(blueprint?.dagNodes) && blueprint.dagNodes.length > 0 ? blueprint.dagNodes : []);

  if (dagNodes.length === 0) {
    const text = `${deckName} ${strategy} ${blueprint?.prompt || ''} ${blueprint?.archetype || ''} ${blueprint?.tribe || ''}`.toLowerCase();
    const isGiants = text.includes('giant') || text.includes('stomp');
    const isHumans = text.includes('human');
    const isControl = text.includes('control');

    const extractCardsForRole = (roleKeywords, fallbackCards) => {
      if (!Array.isArray(roles) || roles.length === 0) return fallbackCards;
      const matchingRoles = roles.filter(r => {
        const name = (r.name || r.role || '').toLowerCase();
        const desc = (r.purposeDescription || r.description || '').toLowerCase();
        return roleKeywords.some(kw => name.includes(kw) || desc.includes(kw));
      });
      const foundCards = [];
      for (const r of matchingRoles) {
        if (r.cardName && r.cardName !== 'Forest') foundCards.push(r.cardName);
        if (Array.isArray(r.cards)) {
          for (const c of r.cards) {
            if (c && c.name && c.name !== 'Forest') foundCards.push(c.name);
          }
        }
      }
      return foundCards.length > 0 ? Array.from(new Set(foundCards)).slice(0, 4) : fallbackCards;
    };

    if (isGiants) {
      dagNodes = [
        {
          id: 'node_t1',
          turn: 'T1-T2',
          title: 'Giant Mana Ramp & Stomp Opener',
          capability: 'cap.mana.acceleration',
          status: 'SATISFIED',
          cardsCount: 12,
          produces: ['+ Early Mana Ramp', '+ Stomp Removal', '+ Board Setup'],
          dependsOn: [],
          cardBindings: extractCardsForRole(['ramp', 'mana', 'acceleration', 'turn1'], ['Giant Ramp Spell', 'Stomp Removal', 'Early Acceleration'])
        },
        {
          id: 'node_t2',
          turn: 'T2-T3',
          title: 'Stomp Interaction & Midgame Beats',
          capability: 'cap.stomp.interaction',
          status: 'SATISFIED',
          cardsCount: 10,
          produces: ['+ Targeted Damage', '+ Midgame Giant Presence'],
          dependsOn: ['node_t1'],
          cardBindings: extractCardsForRole(['removal', 'stomp', 'cheap'], ['Giantfall', "Anzrag's Rampage", 'Stomp Damage'])
        },
        {
          id: 'node_t3',
          turn: 'T3-T4',
          title: 'Giant Creature Mass & Threat Engine',
          capability: 'cap.threat.density',
          status: 'SATISFIED',
          cardsCount: 12,
          produces: ['+ High-P/T Giant Bodies', '+ Combat Dominance'],
          dependsOn: ['node_t2'],
          cardBindings: extractCardsForRole(['tribal', 'presence', 'threat', 'board'], ['Giant Cindermaw', 'Brambleback Brute', 'Dalkovan Packbeasts'])
        },
        {
          id: 'node_t4',
          turn: 'T4-T5',
          title: 'Lethal Giant Overwhelm Finisher',
          capability: 'cap.threat.lethal',
          status: 'SATISFIED',
          cardsCount: 6,
          produces: ['+ Trample Lethal Damage', '+ Game Closing'],
          dependsOn: ['node_t3'],
          cardBindings: extractCardsForRole(['finisher', 'lethal', 'overwhelm'], ['Giant Overwhelm', 'High Curve Giant', 'Combat Lethal'])
        }
      ];
    } else {
      dagNodes = [
        {
          id: 'node_t1',
          turn: 'T1-T2',
          title: `${blueprint?.tribe || 'Strategy'} Opener & Setup`,
          capability: 'cap.mana.acceleration',
          status: 'SATISFIED',
          cardsCount: 12,
          produces: ['+ Early Mana Setup', '+ Board Development'],
          dependsOn: [],
          cardBindings: extractCardsForRole(['mana', 'pressure'], ['Early Play', 'Mana Acceleration', 'Land Search'])
        },
        {
          id: 'node_t2',
          turn: 'T2-T3',
          title: 'Midgame Synergy & Interaction Engine',
          capability: 'cap.synergy',
          status: 'SATISFIED',
          cardsCount: 10,
          produces: ['+ Board Control', '+ Synergistic Value'],
          dependsOn: ['node_t1'],
          cardBindings: extractCardsForRole(['removal', 'density'], ['Cheap Removal', 'Midgame Synergy'])
        },
        {
          id: 'node_t3',
          turn: 'T3-T4',
          title: 'Core Strategy Threat Engine',
          capability: 'cap.threat.density',
          status: 'SATISFIED',
          cardsCount: 10,
          produces: ['+ High Threat Density', '+ Board Dominance'],
          dependsOn: ['node_t2'],
          cardBindings: extractCardsForRole(['threat', 'presence'], ['Core Threat', 'Archetype Finisher'])
        },
        {
          id: 'node_t4',
          turn: 'T4-T5',
          title: 'Lethal Win Condition',
          capability: 'cap.threat.lethal',
          status: 'SATISFIED',
          cardsCount: 4,
          produces: ['+ Lethal Game Close'],
          dependsOn: ['node_t3'],
          cardBindings: extractCardsForRole(['finisher', 'lethal'], ['Lethal Finisher', 'Overwhelm'])
        }
      ];
    }
  }

  const activeNode = dagNodes.find(n => n.id === selectedNode) || dagNodes[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-purple-300 flex items-center gap-1.5 font-cinzel">
          <Layers size={14} className="text-purple-400" />
          <span>Grafo Interactivo de Compilación Estratégica (Executable Strategy DAG)</span>
        </h4>
        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 px-2.5 py-0.5 rounded border border-purple-500/30">
          DAG Dependencias Causales
        </span>
      </div>

      {/* DAG Level Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {dagNodes.map((node) => {
          const isSelected = selectedNode === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative group ${
                isSelected
                  ? 'border-purple-400 bg-gradient-to-b from-purple-950/60 to-black text-white shadow-[0_0_20px_rgba(168,85,247,0.25)] scale-[1.02]'
                  : 'border-white/10 bg-black/40 text-white/70 hover:bg-black/60 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-mono font-bold mb-1.5">
                <span className="text-purple-300 font-cinzel">{node.turn}</span>
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 text-[9px]">
                  {node.status}
                </span>
              </div>

              <h5 className="font-cinzel text-xs font-bold text-white mb-1.5 leading-tight">{node.title}</h5>
              <span className="text-[9px] font-mono text-purple-300/70 block mb-2">{node.capability}</span>

              <div className="text-[10px] font-mono text-white/50 border-t border-white/10 pt-1.5">
                <span>{node.cardsCount} cartas</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Node Detail Inspector */}
      {activeNode && (
        <div className="p-4 bg-black/90 border border-purple-500/40 rounded-2xl space-y-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <h5 className="font-cinzel text-xs font-bold text-purple-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles size={14} className="text-purple-400" />
              <span>Detalle de Nodo DAG: {activeNode.title}</span>
            </h5>
            <span className="text-[10px] font-mono text-gray-400">{activeNode.capability}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <span className="text-[10px] text-white/40 block mb-1 uppercase font-bold tracking-wider">Efectos & Capacidades Producidas</span>
              <div className="flex flex-wrap gap-1.5">
                {(activeNode.produces || []).map((p, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-purple-950/80 border border-purple-500/30 text-purple-200 rounded text-[10px]">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/40 block mb-1 uppercase font-bold tracking-wider">Cartas que Satisfacen este Nodo</span>
              <div className="flex flex-wrap gap-1.5">
                {(activeNode.cardBindings || []).map((card, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 rounded text-[10px] flex items-center gap-1">
                    <CheckCircle2 size={10} />
                    <span>{card}</span>
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
