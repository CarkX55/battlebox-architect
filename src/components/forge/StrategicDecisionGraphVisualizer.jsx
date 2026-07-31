import { useState } from 'react';
import { Target, GitBranch, ShieldAlert, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StrategicDecisionGraphVisualizer({ intent = 'SELESNYA_RAMP' }) {
  const [selectedNode, setSelectedNode] = useState('node_mana_acceleration');

  const graphData = [
    {
      id: 'node_mana_acceleration',
      title: 'Aceleración Rápida (6 Maná en T4)',
      importance: 0.98,
      impact: 'MUY ALTO',
      turn: 'T1-T2',
      satisfied: '96%',
      condition: 'Si Aceleración < 8 slots',
      thenAction: 'Aumentar Tamaño del Paquete Ramp (+2 Slots)',
      elseAction: 'Mantener Densidad de Amenazas',
      fallback: 'Pivotar a Land Ramp Resiliente (Topiary Stomper / Land Search)'
    },
    {
      id: 'node_sweeper_resilience',
      title: 'Resiliencia ante Removal & Sweepers',
      importance: 0.88,
      impact: 'ALTO',
      turn: 'T3',
      satisfied: '90%',
      condition: 'Si Interacción del Meta > 35%',
      thenAction: 'Inyectar Paquete de Protección (Heroic Intervention)',
      elseAction: 'Aumentar Densidad de Rematadores',
      fallback: 'Motor de Robo y Recuperación de Cementerio'
    },
    {
      id: 'node_lethal_overwhelm',
      title: 'Rematador Letal Turno 4-5',
      importance: 0.95,
      impact: 'CRÍTICO',
      turn: 'T4-T5',
      satisfied: '94%',
      condition: 'Si Presencia en Mesa Establecida',
      thenAction: 'Lanzar Craterhoof / Himno Masivo',
      elseAction: 'Lanzar Motor de Ventaja de Cartas',
      fallback: 'Presión Midrange Incremental'
    }
  ];

  const activeNode = graphData.find(n => n.id === selectedNode) || graphData[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-widest text-amber-300 flex items-center gap-1.5 font-cinzel">
          <GitBranch size={14} className="text-amber-400" />
          <span>Árbol de Razonamiento Estratégico Condicional (Strategic Decision Graph)</span>
        </h4>
        <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded border border-amber-500/30">
          Decisiones Condicionales & Fallbacks
        </span>
      </div>

      {/* Decision Graph Flow Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {graphData.map((node) => {
          const isSelected = selectedNode === node.id;
          return (
            <div
              key={node.id}
              onClick={() => setSelectedNode(node.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer relative group ${
                isSelected
                  ? 'border-amber-400 bg-gradient-to-b from-amber-950/60 to-black text-white shadow-[0_0_20px_rgba(255,202,88,0.25)] scale-[1.02]'
                  : 'border-white/10 bg-black/40 text-white/70 hover:bg-black/60 hover:border-white/20'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-mono font-bold mb-2">
                <span className="text-amber-300 font-cinzel">{node.turn}</span>
                <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30 text-[9px]">
                  Impor: {node.importance}
                </span>
              </div>

              <h5 className="font-cinzel text-xs font-bold text-white mb-2 leading-tight">{node.title}</h5>

              <div className="space-y-1 text-[10px] font-mono border-t border-white/10 pt-2 text-white/60">
                <div className="flex justify-between">
                  <span>Impacto de Fallo:</span>
                  <span className="text-rose-300 font-bold">{node.impact}</span>
                </div>
                <div className="flex justify-between">
                  <span>Satisfacción:</span>
                  <span className="text-emerald-400 font-bold">{node.satisfied}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Node Inspector Detail Panel */}
      {activeNode && (
        <div className="p-4 bg-black/90 border border-amber-500/40 rounded-2xl space-y-3 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span className="font-cinzel font-bold text-xs text-amber-300 uppercase tracking-wider">
                Lógica Condicional: {activeNode.title}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              Cumplido: {activeNode.satisfied}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
            <div className="space-y-2 bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-amber-300 font-mono text-[10px] uppercase font-bold block flex items-center gap-1">
                <GitBranch size={10} />
                <span>Evaluación Condicional (IF / THEN / ELSE)</span>
              </span>
              <p className="text-white/80 text-[11px] font-mono">
                <strong className="text-amber-400">CONDICIÓN:</strong> {activeNode.condition}
              </p>
              <p className="text-emerald-300 text-[11px] font-mono">
                <strong className="text-emerald-400">ENTONCES:</strong> {activeNode.thenAction}
              </p>
              <p className="text-cyan-300 text-[11px] font-mono">
                <strong className="text-cyan-400">SI NO:</strong> {activeNode.elseAction}
              </p>
            </div>

            <div className="space-y-2 bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-rose-300 font-mono text-[10px] uppercase font-bold block flex items-center gap-1">
                <ShieldAlert size={10} />
                <span>Plan de Contingencia / Fallback</span>
              </span>
              <p className="text-gray-300 text-[11px] leading-relaxed">
                {activeNode.fallback}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
