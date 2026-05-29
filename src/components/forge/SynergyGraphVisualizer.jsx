import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Network, Info, Sparkles, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * SynergyGraphVisualizer: Componente de simulación de física de fuerzas en SVG
 * nativo de React que dibuja las relaciones de sinergias (RAG) de tu mazo
 * interactuando con synergy_graph.json de Obsidian de manera espectacular.
 */
const isLandCard = (c) => {
  if (!c) return false;
  const category = (c.category || '').toLowerCase();
  const typeLine = (c.type_line || c.type || '').toLowerCase();
  const name = (c.name || '').toLowerCase();
  
  return (
    category.includes('land') || 
    category.includes('tierra') || 
    typeLine.includes('land') || 
    typeLine.includes('tierra') ||
    ['plains', 'island', 'swamp', 'mountain', 'forest', 'wastes', 'llanura', 'isla', 'pantano', 'montaña', 'bosque', 'yermo'].includes(name)
  );
};

export default function SynergyGraphVisualizer({ deck, isOpen, onClose, archetype = 'midrange', colors = [] }) {
  const [nodes, setNodes] = useState([]);
  const [links, setLinks] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [graphData, setGraphData] = useState(null);

  const containerRef = useRef(null);
  const dragNodeRef = useRef(null);
  const animationRef = useRef(null);

  // Dimensiones del SVG
  const width = 800;
  const height = 500;

  // Cargar el Grafo Consolidado synergy_graph.json
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    fetch('/data/synergy_graph.json')
      .then(res => {
        if (!res.ok) throw new Error("No consolidado");
        return res.json();
      })
      .then(data => {
        setGraphData(data);
        buildLocalSubGraph(data);
      })
      .catch(err => {
        console.warn("synergy_graph.json no encontrado o inaccesible, usando simulación sintética de mazo", err);
        buildSyntheticSubGraph();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, deck]);

  // Generar un grafo sintético si no hay synergy_graph.json en la red local
  const buildSyntheticSubGraph = () => {
    const list = deck.slice(0, 15); // Limitar a 15 cartas clave para visibilidad
    const newNodes = [
      { id: 'root', name: `Mazo: ${archetype.toUpperCase()}`, type: 'archetype', color: '#D4AF37', x: width / 2, y: height / 2, fx: width / 2, fy: height / 2, size: 25 }
    ];
    const newLinks = [];

    // Añadir cartas y enlaces
    list.forEach((c, idx) => {
      const angle = (idx / list.length) * Math.PI * 2;
      const radius = 180;
      const x = width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 20;
      const y = height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 20;
      
      const nodeColor = isLandCard(c) ? '#6B7280' : '#3B82F6';
      
      newNodes.push({
        id: c.name,
        name: c.name,
        type: 'card',
        category: c.category || 'Spell',
        color: nodeColor,
        x, y,
        size: 15
      });

      newLinks.push({
        source: 'root',
        target: c.name,
        value: 1.5
      });
    });

    // Crear inter-enlaces (sinergias simuladas de maná o mecánicas)
    for (let i = 1; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        if (Math.random() < 0.15 && newLinks.length < 35) {
          newLinks.push({
            source: newNodes[i].id,
            target: newNodes[j].id,
            value: 0.8
          });
        }
      }
    }

    setNodes(newNodes);
    setLinks(newLinks);
  };

  // Construir sub-grafo a partir de synergy_graph.json de Obsidian
  const buildLocalSubGraph = (fullGraph) => {
    const list = deck.slice(0, 18); // Usar top 18 cartas del mazo
    const newNodes = [
      { id: 'root', name: `${archetype.toUpperCase()} Engine`, type: 'archetype', color: '#D4AF37', x: width / 2, y: height / 2, fx: width / 2, fy: height / 2, size: 24 }
    ];
    const newLinks = [];
    const addedNodeIds = new Set(['root']);

    // 1. Agregar las cartas del mazo que existen en el Grafo Semántico RAG
    list.forEach((c, idx) => {
      const angle = (idx / list.length) * Math.PI * 2;
      const radius = 160;
      const x = width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 15;
      const y = height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 15;
      
      const isLand = isLandCard(c);
      const nodeColor = isLand ? '#4B5563' : '#2563EB';

      newNodes.push({
        id: c.name,
        name: c.name,
        type: 'card',
        category: c.category || 'Spell',
        color: nodeColor,
        x, y,
        size: 14
      });
      addedNodeIds.add(c.name);

      newLinks.push({
        source: 'root',
        target: c.name,
        value: 2.0
      });
    });

    // 2. Extraer conexiones reales desde synergy_graph.json para nuestras cartas
    const connections = fullGraph.links || fullGraph.connections || [];
    
    // Buscar también cartas recomendadas de metajuego o tags relacionados
    const synergies = new Set();
    connections.forEach(conn => {
      const src = conn.source || conn.from;
      const tgt = conn.target || conn.to;

      if (addedNodeIds.has(src) && addedNodeIds.has(tgt)) {
        newLinks.push({
          source: src,
          target: tgt,
          value: conn.weight || 1.2
        });
      } else if (addedNodeIds.has(src) && !addedNodeIds.has(tgt) && synergies.size < 6) {
        // Enlace externo (carta sinérgica del RAG no presente en el mazo principal)
        synergies.add(tgt);
        addedNodeIds.add(tgt);
        
        const angle = Math.random() * Math.PI * 2;
        const x = width / 2 + Math.cos(angle) * 260;
        const y = height / 2 + Math.sin(angle) * 260;

        newNodes.push({
          id: tgt,
          name: tgt,
          type: 'synergy',
          category: 'Sinergia RAG',
          color: '#10B981', // Verde neón para recomendadas RAG
          x, y,
          size: 12
        });

        newLinks.push({
          source: src,
          target: tgt,
          value: 1.0
        });
      }
    });

    setNodes(newNodes);
    setLinks(newLinks);
  };

  // --- MOTOR FÍSICO NATIVO REACT EN VERSE ---
  useEffect(() => {
    if (nodes.length === 0) return;

    // Simulación de fuerzas físicas básicas (Fuerza de Coulomb de repulsión + Ley de Hooke de atracción)
    const step = () => {
      setNodes(prevNodes => {
        if (prevNodes.length === 0) return [];
        
        // Copiar nodos para mutar sus fuerzas
        const copy = prevNodes.map(n => ({ ...n, vx: 0, vy: 0 }));

        // 1. Repulsión entre todos los pares de nodos (F = k * q1 * q2 / r^2)
        const kRepulsion = 800;
        for (let i = 0; i < copy.length; i++) {
          for (let j = 0; j < copy.length; j++) {
            if (i === j) continue;
            const dx = copy[i].x - copy[j].x;
            const dy = copy[i].y - copy[j].y;
            const distSq = dx * dx + dy * dy + 100; // Evitar división por cero
            const dist = Math.sqrt(distSq);
            
            if (dist < 220) {
              const force = kRepulsion / distSq;
              copy[i].vx += (dx / dist) * force;
              copy[i].vy += (dy / dist) * force;
            }
          }
        }

        // 2. Atracción por aristas de enlaces (F = kSpring * (distancia - restLength))
        const kSpring = 0.04;
        const restLength = 120;
        links.forEach(l => {
          const s = copy.find(n => n.id === (l.source.id || l.source));
          const t = copy.find(n => n.id === (l.target.id || l.target));
          if (!s || !t) return;

          const dx = t.x - s.x;
          const dy = t.y - s.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = kSpring * (dist - restLength) * (l.value || 1);

          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (s.id !== 'root') { s.vx += fx; s.vy += fy; }
          if (t.id !== 'root') { t.vx -= fx; t.vy -= fy; }
        });

        // 3. Gravedad hacia el centro para evitar fugas flotantes
        const kGravity = 0.015;
        copy.forEach(n => {
          if (n.id === 'root') return;
          const dx = width / 2 - n.x;
          const dy = height / 2 - n.y;
          n.vx += dx * kGravity;
          n.vy += dy * kGravity;
        });

        // 4. Actualizar posiciones aplicando rozamiento aerodinámico (friction)
        const friction = 0.78;
        copy.forEach(n => {
          if (n.id === dragNodeRef.current?.id) {
            // Si se está arrastrando, mantiene posición del ratón
            n.x = dragNodeRef.current.x;
            n.y = dragNodeRef.current.y;
            return;
          }
          if (n.id === 'root') {
            n.x = width / 2;
            n.y = height / 2;
            return;
          }

          n.x += n.vx * friction;
          n.y += n.vy * friction;

          // Límites de pantalla rígidos
          n.x = Math.max(n.size + 10, Math.min(width - n.size - 10, n.x));
          n.y = Math.max(n.size + 10, Math.min(height - n.size - 10, n.y));
        });

        return copy;
      });

      animationRef.current = requestAnimationFrame(step);
    };

    animationRef.current = requestAnimationFrame(step);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [nodes.length, links]);

  // --- CONTROL DE ARRASTRE DE NODOS ---
  const handleMouseDown = (e, node) => {
    if (node.id === 'root') return; // Bloquear centro
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    
    // Determinar posición del ratón relativa al SVG
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    // Escalar al viewport virtual del SVG (800x500)
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    
    dragNodeRef.current = {
      ...node,
      startX: clientX * scaleX,
      startY: clientY * scaleY
    };

    setSelectedNode(node);
  };

  const handleMouseMove = (e) => {
    if (!dragNodeRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    dragNodeRef.current.x = clientX * scaleX;
    dragNodeRef.current.y = clientY * scaleY;
  };

  const handleMouseUp = () => {
    dragNodeRef.current = null;
  };

  // Cerrar arrastre al salir del contenedor
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      dragNodeRef.current = null;
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  const activeLinks = useMemo(() => {
    return links.map(l => {
      const s = nodes.find(n => n.id === (l.source.id || l.source));
      const t = nodes.find(n => n.id === (l.target.id || l.target));
      if (!s || !t) return null;
      return { s, t, value: l.value };
    }).filter(Boolean);
  }, [nodes, links]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#0b0a09]/98 border border-grimorio-gold/30 rounded-3xl w-full max-w-5xl p-6 shadow-[0_0_60px_rgba(212,175,55,0.15)] flex flex-col relative"
      >
        {/* Decorative Top Border */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-grimorio-gold/40 to-transparent" />
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <Network className="text-grimorio-gold w-6 h-6 animate-pulse" />
            <div>
              <h3 className="font-cinzel text-lg text-grimorio-gold tracking-wide">
                Grafo Semántico de Sinergias (RAG)
              </h3>
              <p className="text-[10px] text-gray-500 font-sans tracking-wider uppercase">
                Visualización física interactiva de Obsidian & Scryfall Tagger
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Workspace */}
        <div className="flex flex-col lg:flex-row gap-6 items-stretch flex-1">
          {/* Left Canvas: SVG Sim */}
          <div className="flex-1 bg-black/70 border border-[#D4AF37]/10 rounded-2xl relative overflow-hidden flex items-center justify-center min-h-[350px] lg:min-h-[500px]">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-grimorio-gold border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-cinzel text-grimorio-gold animate-pulse">Compilando neuronas...</span>
              </div>
            ) : (
              <svg
                ref={containerRef}
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full select-none cursor-grab"
                onMouseMove={handleMouseMove}
              >
                {/* Definiciones para sombras neón e imágenes */}
                <defs>
                  <filter id="glow-gold" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-blue" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Dibujar Aristas de Enlace (Links) */}
                {activeLinks.map((link, idx) => {
                  const isHovered = hoveredNode && (link.s.id === hoveredNode.id || link.t.id === hoveredNode.id);
                  const isSelected = selectedNode && (link.s.id === selectedNode.id || link.t.id === selectedNode.id);

                  return (
                    <line
                      key={`link-${idx}`}
                      x1={link.s.x}
                      y1={link.s.y}
                      x2={link.t.x}
                      y2={link.t.y}
                      stroke={isSelected ? '#F59E0B' : isHovered ? '#3B82F6' : 'rgba(255, 255, 255, 0.08)'}
                      strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 1}
                      strokeDasharray={link.t.type === 'synergy' ? "4 4" : undefined}
                      className="transition-all"
                    />
                  );
                })}

                {/* Dibujar Nodos (Partículas) */}
                {nodes.map((node) => {
                  const isHovered = hoveredNode && node.id === hoveredNode.id;
                  const isSelected = selectedNode && node.id === selectedNode.id;
                  
                  // Asignar filtro de resplandor neón según categoría
                  let glowFilter = undefined;
                  if (node.id === 'root') glowFilter = "url(#glow-gold)";
                  else if (node.type === 'synergy') glowFilter = "url(#glow-green)";
                  else if (isHovered || isSelected) glowFilter = "url(#glow-blue)";

                  return (
                    <g
                      key={`node-${node.id}`}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseDown={(e) => handleMouseDown(e, node)}
                      onMouseEnter={() => setHoveredNode(node)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      {/* Sombra / Halo externo interactivo */}
                      <circle
                        r={node.size + (isHovered ? 4 : 0)}
                        fill="transparent"
                        stroke={isSelected ? '#F59E0B' : isHovered ? node.color : 'transparent'}
                        strokeWidth={2}
                        className="transition-all duration-300"
                      />

                      {/* Núcleo del nodo */}
                      <circle
                        r={node.size}
                        fill={node.color}
                        filter={glowFilter}
                        className="transition-all duration-300"
                        style={{ fill: node.color }}
                      />

                      {/* Texto de etiqueta flotante */}
                      <text
                        y={node.size + 15}
                        textAnchor="middle"
                        fill={isSelected ? '#F59E0B' : isHovered ? '#ffffff' : '#D1D5DB'}
                        className={cn(
                          "text-[10px] select-none pointer-events-none drop-shadow-md font-sans tracking-wide",
                          node.id === 'root' ? "font-cinzel text-xs text-[#D4AF37] font-bold" : "",
                          isSelected || isHovered ? "font-bold scale-105" : "opacity-80"
                        )}
                      >
                        {node.name.length > 18 ? `${node.name.slice(0, 16)}..` : node.name}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Instrucción visual flotante */}
            <div className="absolute bottom-3 left-3 bg-black/80 border border-white/10 px-3 py-1.5 rounded-lg text-[9px] text-gray-400 font-mono flex items-center gap-1.5">
              <Info size={11} className="text-grimorio-gold" />
              <span>Arrastra cualquier nodo para reorganizar y modular el campo físico</span>
            </div>
          </div>

          {/* Right Information Panel */}
          <div className="w-full lg:w-80 bg-black/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between glassmorphic-panel">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Sparkles size={14} className="text-[#D4AF37]" />
                <h4 className="font-cinzel text-xs text-grimorio-gold uppercase tracking-wider">Detalle de la Sinapsis</h4>
              </div>

              {selectedNode ? (
                <div className="space-y-4 animate-glow">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase tracking-widest font-mono text-gray-500 block">Elemento Seleccionado</span>
                    <h5 className="font-cinzel text-base text-white font-bold leading-tight">{selectedNode.name}</h5>
                    <span className={cn(
                      "inline-block px-2 py-0.5 rounded text-[9px] font-sans font-bold uppercase border mt-1",
                      selectedNode.type === 'archetype' ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                      selectedNode.type === 'synergy' ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                      "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    )}>
                      {selectedNode.category}
                    </span>
                  </div>

                  <div className="p-3 bg-black/60 rounded-xl border border-white/5 text-xs text-gray-300 leading-relaxed leading-normal">
                    {selectedNode.type === 'archetype' ? (
                      `Este es el nodo central de tu mazo de tipo ${archetype}. Actúa como un imán gravitacional alineando todas las cartas con el arquetipo.`
                    ) : selectedNode.type === 'synergy' ? (
                      `Esta carta no está en tu mazo principal, pero posee un alto peso de sinergia en Obsidian. ¡Es una recomendación ideal para tu Sideboard o futuras modificaciones!`
                    ) : (
                      `Carta del mazo. Está perfectamente enlazada con la base central del ecosistema y genera múltiples vectores de sinergia de maná y mecánicas.`
                    )}
                  </div>
                  
                  {selectedNode.type === 'card' && (
                    <div className="mt-4">
                      <img 
                        src={`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(selectedNode.name)}&format=image`}
                        alt={selectedNode.name}
                        className="w-full h-auto rounded-xl border border-white/10 shadow-2xl"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                  <Network className="text-gray-600 animate-pulse w-10 h-10" />
                  <p className="text-xs text-gray-500 font-serif leading-relaxed italic px-4">
                    Haz clic en cualquier nodo del grafo para auditar sus conexiones y ver la ilustración de Scryfall.
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/5 text-[9px] text-gray-500 font-mono flex items-center justify-between">
              <span>Nodos: {nodes.length}</span>
              <span>Enlaces: {links.length}</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
