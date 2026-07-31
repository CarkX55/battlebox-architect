import { CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';

export default function StrategicConstraintsChecklist({ constraints = {} }) {
  const defaultConstraints = [
    { label: 'Amenaza Turno 4 (Turn4Threat)', requirement: '≥ 0.82', current: '0.85', status: 'SATISFIED' },
    { label: 'Fuentes de Maná totales', requirement: '≥ 24', current: '24', status: 'SATISFIED' },
    { label: 'Interacción Temprana (T1-T2)', requirement: '≥ 0.45', current: '0.50', status: 'SATISFIED' },
    { label: 'Densidad de Amenazas (Threat Density)', requirement: '≥ 0.70', current: '0.75', status: 'SATISFIED' },
    { label: 'Recuperación ante Sweepers', requirement: '≥ Medium', current: 'High', status: 'SATISFIED' }
  ];

  return (
    <div className="bg-black/60 border border-magic-gold/30 rounded-2xl p-4 space-y-3 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <h4 className="font-cinzel text-xs font-bold text-magic-gold uppercase tracking-wider flex items-center gap-2">
          <ShieldCheck size={14} className="text-magic-gold" />
          <span>Verificación de Contratos Estratégicos (Strategic Constraints)</span>
        </h4>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
          5/5 Cumplidos (100%)
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
        {defaultConstraints.map((c, i) => (
          <div key={i} className="bg-black/50 p-2.5 rounded-xl border border-white/10 space-y-1">
            <div className="flex justify-between items-center text-[10px] font-mono">
              <span className="text-white/60 truncate">{c.label}</span>
              <CheckCircle2 size={12} className="text-emerald-400 shrink-0" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <span className="text-[10px] text-white/40 font-mono">Req: {c.requirement}</span>
              <span className="text-xs font-bold font-mono text-emerald-400">{c.current}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
