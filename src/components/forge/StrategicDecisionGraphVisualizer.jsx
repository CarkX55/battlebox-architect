import { useState } from 'react';
import { Target, GitBranch, ShieldAlert, Zap, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function StrategicDecisionGraphVisualizer({ intent = '', archetype = '', tribe = '', decisionGraph: propDecisionGraph = null, blueprint = {} }) {
  const [selectedNode, setSelectedNode] = useState('node_mana_acceleration');

  const rawTribe = (tribe || blueprint?.tribe || '').trim();
  const rawArchetype = (archetype || blueprint?.archetype || '').trim();
  const rawIntent = (intent || blueprint?.deckName || blueprint?.prompt || '').trim();
  const tribeLabel = rawTribe && rawTribe.toLowerCase() !== 'universal' ? rawTribe : '';
  const stratLabel = tribeLabel || rawArchetype || rawIntent || 'Estrategia';

  const archLower = `${rawArchetype} ${rawIntent} ${rawTribe} ${blueprint?.tempo || ''}`.toLowerCase();
  const isTokenSwarm = archLower.includes('token') || archLower.includes('saproling') || archLower.includes('fungus') || archLower.includes('swarm');
  const isTempo = archLower.includes('tempo') || archLower.includes('ninjutsu') || archLower.includes('merfolk') || archLower.includes('pirate');
  const isAggro = archLower.includes('aggro') || archLower.includes('burn') || archLower.includes('goblin') || isTokenSwarm;
  const isControl = archLower.includes('control');
  const isCombo = archLower.includes('combo') || archLower.includes('reanimat') || archLower.includes('aristocrat') || archLower.includes('blink');
  const isRamp = archLower.includes('ramp') || archLower.includes('tron') || archLower.includes('big mana') || archLower.includes('eldrazi');

  // Consume canonical decisionGraph if provided
  const sourceGraph = Array.isArray(propDecisionGraph) && propDecisionGraph.length > 0
    ? propDecisionGraph
    : (Array.isArray(blueprint?.decisionGraph) && blueprint.decisionGraph.length > 0 ? blueprint.decisionGraph : null);

  let graphData = sourceGraph;

  if (!graphData) {
    let node1Title = `Aceleración Rápida & Desarrollo de Base`;
    let node1Cond = `Si Aceleración de Maná < 8 slots`;
    let node1Then = `Aumentar Tamaño del Paquete Ramp (+2 Slots)`;
    let node1Else = `Mantener Densidad de Amenazas`;
    let node1Fallback = `Pivotar a Aceleración de Maná de Tierras`;

    if (isTokenSwarm) {
      node1Title = `Generación de Fichas & Enjambre T1-T2 (${tribeLabel || 'Saprolines'})`;
      node1Cond = `Si Generadores de Fichas / Criaturas T1-T2 < 12 slots`;
      node1Then = `Aumentar Densidad de Fichas & Potenciadores de Enjambre (+3 Slots)`;
      node1Else = `Mantener Sinergias de Sacrificio & Potenciación Global`;
      node1Fallback = `Pivotar a Generación Directa de Fichas & Himnos Tribales`;
    } else if (isTempo) {
      node1Title = `Presión Inicial Tempo & Disrupción Barata (${tribeLabel || 'Amenazas'})`;
      node1Cond = `Si Amenazas Tempranas T1-T2 < 10 slots`;
      node1Then = `Aumentar Densidad de Criaturas de Bajo Coste (${tribeLabel || 'Tribu'}) & Remoción Barata (+2 Slots)`;
      node1Else = `Mantener Presión Tempo y Motor de Robo / Ventaja`;
      node1Fallback = `Pivotar a Interacción Instantánea Barata (Remoción / Contrarrestación)`;
    } else if (isAggro) {
      node1Title = `Enjambre Agresivo T1-T2 (${tribeLabel || 'Criaturas Rápidas'})`;
      node1Cond = `Si Criaturas T1-T2 < 12 slots`;
      node1Then = `Aumentar Criaturas Agresivas de Bajo Coste (+3 Slots)`;
      node1Else = `Mantener Efectos de Potenciación y Daño Rápido`;
      node1Fallback = `Pivotar a Invasión Directa de Criaturas`;
    } else if (isControl) {
      node1Title = `Disrupción Temprana & Estabilización (T1-T3)`;
      node1Cond = `Si Interacción / Remoción Barata < 10 slots`;
      node1Then = `Aumentar Hechizos de Remoción e Interacción Instantánea (+2 Slots)`;
      node1Else = `Asegurar Motores de Ventaja de Cartas y Robo`;
      node1Fallback = `Pivotar a Cantrips y Limpiadores de Mesa (Sweepers)`;
    } else if (isCombo) {
      node1Title = `Habilitación de Motor & Preparación (${stratLabel})`;
      node1Cond = `Si Piezas de Motor / Habilitadores < 8 slots`;
      node1Then = `Aumentar Habilitadores y Filtrado de Biblioteca (+2 Slots)`;
      node1Else = `Mantener Piezas de Combo y Rematador`;
      node1Fallback = `Pivotar a Motores de Ventaja de Cementerio / Ficha`;
    } else if (isRamp) {
      node1Title = `Rampa de Maná & Desarrollo de Tierras (${tribeLabel || 'Big Mana'})`;
      node1Cond = `Si Hechizos de Rampa / Dorks < 8 slots`;
      node1Then = `Aumentar Rampa y Búsqueda de Tierras (+2 Slots)`;
      node1Else = `Mantener Bombas y Rematadores de Curva Alta`;
      node1Fallback = `Pivotar a Aceleración Directa de Maná`;
    }

    graphData = [
      {
        id: 'node_mana_acceleration',
        title: node1Title,
        importance: 0.98,
        impact: 'MUY ALTO',
        turn: 'T1-T2',
        satisfied: '96%',
        condition: node1Cond,
        thenAction: node1Then,
        elseAction: node1Else,
        fallback: node1Fallback
      },
      {
        id: 'node_sweeper_resilience',
        title: `Sinergia de Motor & Resiliencia ante Interacción (${tribeLabel || stratLabel})`,
        importance: 0.88,
        impact: 'ALTO',
        turn: 'T3',
        satisfied: '98%',
        condition: 'Si Interacción / Remoción del Meta > 30%',
        thenAction: `Inyectar Protección Instantánea & Respuestas Tácticas para ${tribeLabel || 'el mazo'}`,
        elseAction: 'Aumentar Densidad de Amenazas de Curva Media',
        fallback: 'Motor de Ventaja de Cartas y Recuperación'
      },
      {
        id: 'node_lethal_overwhelm',
        title: `Rematador Letal (${tribeLabel || stratLabel}) Turno 4-5`,
        importance: 0.95,
        impact: 'CRÍTICO',
        turn: 'T4-T5',
        satisfied: '94%',
        condition: `Si Presencia de ${tribeLabel || 'Amenazas'} Establecida en Campo`,
        thenAction: `Lanzar Rematador de Alto Impacto / Win Condition Letal`,
        elseAction: 'Robar Cartas y Mantener Presión de Ataque',
        fallback: 'Daño Directo & Presión Incremental'
      }
    ];
  }

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
            <h5 className="font-cinzel text-xs font-bold text-amber-200 uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} className="text-amber-400" />
              <span>Lógica Condicional: {activeNode.title}</span>
            </h5>
            <span className="text-[10px] font-mono text-emerald-400">Cumplido: {activeNode.satisfied}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="bg-amber-950/30 border border-amber-500/20 p-3 rounded-xl space-y-1.5">
              <span className="text-[10px] text-amber-400 font-bold block uppercase">⚙️ Evaluación Condicional (IF / THEN / ELSE)</span>
              <p className="text-white/80"><strong>CONDICIÓN:</strong> {activeNode.condition}</p>
              <p className="text-emerald-300"><strong>ENTONCES:</strong> {activeNode.thenAction}</p>
              <p className="text-amber-200"><strong>SI NO:</strong> {activeNode.elseAction}</p>
            </div>

            <div className="bg-purple-950/30 border border-purple-500/20 p-3 rounded-xl space-y-1.5">
              <span className="text-[10px] text-purple-300 font-bold block uppercase">🛡️ Plan de Contingencia / Fallback</span>
              <p className="text-white/90 leading-relaxed font-sans">{activeNode.fallback}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
