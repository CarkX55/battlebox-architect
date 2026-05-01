import { motion } from 'framer-motion';

export default function RadarChart({ data, size = 300 }) {
  // Data structure: { Speed: 8, Control: 5, Complexity: 7, Resilience: 6, Power: 9 }
  const keys = Object.keys(data);
  const totalPoints = keys.length;
  const center = size / 2;
  const radius = (size / 2) * 0.8;

  // Calculate points for the polygon
  const getPoint = (index, value) => {
    const angle = (Math.PI * 2 * index) / totalPoints - Math.PI / 2;
    const valRadius = (value / 10) * radius;
    return {
      x: center + valRadius * Math.cos(angle),
      y: center + valRadius * Math.sin(angle)
    };
  };

  const points = keys.map((key, i) => getPoint(i, data[key]));
  const polygonPoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Background circles (levels)
  const levels = [2, 4, 6, 8, 10];

  return (
    <div className="flex flex-col items-center p-4 bg-[#1a1612] border border-grimorio-gold/20 rounded-2xl shadow-xl">
      <h4 className="font-cinzel text-grimorio-gold text-lg mb-4">📊 Perfil del Mazo</h4>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background Grids */}
        {levels.map(level => {
          const levelPoints = keys.map((_, i) => {
            const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
            const r = (level / 10) * radius;
            return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon
              key={level}
              points={levelPoints}
              fill="none"
              stroke="rgba(193, 155, 69, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* Axis Lines */}
        {keys.map((_, i) => {
          const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="rgba(193, 155, 69, 0.2)"
              strokeWidth="1"
            />
          );
        })}

        {/* Labels */}
        {keys.map((key, i) => {
          const angle = (Math.PI * 2 * i) / totalPoints - Math.PI / 2;
          const x = center + (radius + 25) * Math.cos(angle);
          const y = center + (radius + 20) * Math.sin(angle);
          return (
            <text
              key={key}
              x={x}
              y={y}
              textAnchor="middle"
              className="fill-grimorio-parchment/70 text-[10px] font-medium uppercase tracking-tighter"
            >
              {key}
            </text>
          );
        })}

        {/* Data Polygon */}
        <motion.polygon
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          points={polygonPoints}
          fill="rgba(193, 155, 69, 0.3)"
          stroke="#c19b45"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        
        {/* Data Points */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#c19b45" />
        ))}
      </svg>
    </div>
  );
}
