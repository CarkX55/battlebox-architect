import { useState } from 'react';
import { OracleTraceLog } from '../../knowledge/serving/OracleTraceLog.js';
import { Scroll, Terminal, ShieldAlert, CheckCircle2, ChevronRight, Activity, Search, Filter, Download, Zap } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function OracleTraceLogModal({ isOpen, onClose }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStep, setExpandedStep] = useState(null);

  if (!isOpen) return null;

  const traceData = OracleTraceLog.getTraceSummary();
  const allSteps = OracleTraceLog.steps || [];

  const filteredSteps = allSteps.filter(step => {
    const matchesCategory = activeCategory === 'ALL' || step.category === activeCategory;
    const matchesQuery = searchQuery === '' || 
      step.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.component.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(step.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const categories = ['ALL', 'INTENT', 'CAPABILITY', 'IR_BUILDER', 'SLOT_RESERVATION', 'CANDIDATE_ADMISSION', 'RANKING_BINDING', 'JUDGE_VERIFICATION', 'MONTE_CARLO', 'PROOF'];

  const getCategoryColor = (cat) => {
    switch (cat) {
      case 'INTENT': return 'text-purple-400 border-purple-500/40 bg-purple-950/40';
      case 'CAPABILITY': return 'text-cyan-400 border-cyan-500/40 bg-cyan-950/40';
      case 'IR_BUILDER': return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      case 'SLOT_RESERVATION': return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'CANDIDATE_ADMISSION': return 'text-emerald-400 border-emerald-500/40 bg-emerald-950/40';
      case 'RANKING_BINDING': return 'text-magic-gold border-amber-400/50 bg-amber-900/40';
      case 'JUDGE_VERIFICATION': return 'text-indigo-400 border-indigo-500/40 bg-indigo-950/40';
      case 'MONTE_CARLO': return 'text-rose-400 border-rose-500/40 bg-rose-950/40';
      case 'PROOF': return 'text-emerald-300 border-emerald-400 bg-emerald-900/50';
      default: return 'text-gray-300 border-white/20 bg-white/5';
    }
  };

  const handleDownload = () => {
    const jsonStr = OracleTraceLog.exportTraceJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oracle_Traceability_Log_${Date.now()}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-5xl h-[85vh] bg-[#0c0a09] border-2 border-[#D4AF37]/40 rounded-3xl p-6 text-white flex flex-col gap-4 shadow-[0_0_50px_rgba(212,175,55,0.2)] relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
              <Scroll size={20} />
            </div>
            <div>
              <h3 className="font-cinzel text-base font-bold text-amber-300 tracking-wider">
                Bitácora de Trazabilidad del Oráculo (Oracle Compiler Trace Log)
              </h3>
              <p className="text-xs text-gray-400 font-mono">
                Auditoría End-to-End de Compilación desde 0 ({traceData.totalSteps} pasos registrados)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
            >
              <Download size={14} />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-mono font-bold transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Category Filter Pills */}
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all whitespace-nowrap border",
                  activeCategory === cat ? getCategoryColor(cat) : "border-white/10 text-gray-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar en la bitácora..."
              className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Step-by-Step Traceability Timeline */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-2.5 font-mono text-xs scrollbar-thin scrollbar-thumb-amber-500/20">
          {filteredSteps.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic">
              No hay eventos registrados en la bitácora para los filtros seleccionados.
            </div>
          ) : (
            filteredSteps.map((step) => {
              const isExpanded = expandedStep === step.stepIndex;
              return (
                <div
                  key={step.stepIndex}
                  className={cn(
                    "p-3 rounded-2xl border transition-all bg-black/60 hover:bg-black/80 cursor-pointer",
                    getCategoryColor(step.category)
                  )}
                  onClick={() => setExpandedStep(isExpanded ? null : step.stepIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] text-gray-400 font-bold">#{step.stepIndex}</span>
                      <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold border", getCategoryColor(step.category))}>
                        {step.category}
                      </span>
                      <span className="font-bold text-white text-xs">{step.component}</span>
                      <span className="text-gray-400">➔</span>
                      <span className="text-amber-300 font-semibold">{step.action}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-gray-500">{new Date(step.timestamp).toLocaleTimeString()}</span>
                      <ChevronRight size={14} className={cn("transition-transform duration-200", isExpanded ? "rotate-90" : "")} />
                    </div>
                  </div>

                  {/* Expanded Step Details & Payload Inspector */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-2 text-[11px] font-mono text-gray-300">
                      <div>
                        <strong className="text-amber-400">Detalles:</strong>
                        <pre className="bg-black/90 p-2.5 rounded-xl border border-white/10 mt-1 overflow-x-auto text-[10px] text-gray-300">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      </div>

                      {step.payload && (
                        <div>
                          <strong className="text-purple-400">Payload / Objeto de Estado:</strong>
                          <pre className="bg-black/90 p-2.5 rounded-xl border border-white/10 mt-1 overflow-x-auto text-[10px] text-emerald-300">
                            {JSON.stringify(step.payload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
