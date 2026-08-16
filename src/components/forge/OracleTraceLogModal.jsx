import { useState } from 'react';
import { OracleTraceLog } from '../../knowledge/serving/OracleTraceLog.js';
import { Scroll, ShieldAlert, CheckCircle2, ChevronRight, Download, Search, Zap, Code, AlertTriangle, Copy, Check } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function OracleTraceLogModal({ isOpen, onClose, traceLog: propTraceLog }) {
  const [activeCategory, setActiveCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPass, setExpandedPass] = useState(null);
  const [showRawLLMModal, setShowRawLLMModal] = useState(false);
  const [copiedTraceJSON, setCopiedTraceJSON] = useState(false);
  const [copiedRawLLM, setCopiedRawLLM] = useState(false);

  if (!isOpen) return null;

  const activeLog = propTraceLog || OracleTraceLog;
  const traceSummary = typeof activeLog.getTraceSummary === 'function' ? activeLog.getTraceSummary() : OracleTraceLog.getTraceSummary();
  const allPasses = activeLog.passes || OracleTraceLog.passes || [];
  const rawLLMData = activeLog.rawGeminiLLMLogs || OracleTraceLog.rawGeminiLLMLogs;

  const filteredPasses = allPasses.filter(pass => {
    const matchesCategory = activeCategory === 'ALL' || pass.category === activeCategory;
    const matchesQuery = searchQuery === '' || 
      pass.passName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pass.component.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(pass.details).toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const categories = [
    'ALL',
    'CAPABILITY_PLANNER',
    'STRATEGY_PLANNER',
    'STRATEGY_IR',
    'PACKAGE_COMPOSER',
    'SLOT_RESERVATION',
    'CANDIDATE_ADMISSION',
    'RANKING_BINDING',
    'IR_REPAIR_LOOP',
    'KARSTEN_MANA_CALCULATOR',
    'EXHAUSTION_CHECK',
    'SLOT_RESOLUTION',
    'DECK_JUDGE',
    'MONTE_CARLO',
    'COMPILATION_PROOF',
    'LLM_LOG'
  ];

  const getPassStatusBadge = (status) => {
    if (status === 'PASS') {
      return 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40';
    }
    if (status === 'WARN') {
      return 'bg-amber-950/80 text-amber-400 border-amber-500/40';
    }
    return 'bg-rose-950/80 text-rose-400 border-rose-500/40 animate-pulse';
  };

  const handleDownload = () => {
    const jsonStr = OracleTraceLog.exportTraceJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Oracle_Compiler_14Pass_Trace_${Date.now()}.json`;
    a.click();
  };

  const copyToClipboard = async (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.warn('Clipboard API error, trying fallback', err);
      }
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    } catch (err) {
      console.error('Fallback copy failed', err);
      return false;
    }
  };

  const handleCopyTraceJSON = async () => {
    const jsonStr = OracleTraceLog.exportTraceJSON();
    const success = await copyToClipboard(jsonStr);
    if (success) {
      setCopiedTraceJSON(true);
      setTimeout(() => setCopiedTraceJSON(false), 2000);
    }
  };

  const handleCopyRawLLM = async () => {
    if (!rawLLMData) return;
    const content = rawLLMData.rawResponse || JSON.stringify(rawLLMData.parsedJSON, null, 2);
    const success = await copyToClipboard(content);
    if (success) {
      setCopiedRawLLM(true);
      setTimeout(() => setCopiedRawLLM(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-6xl h-[90vh] bg-[#0a0807] border-2 border-[#D4AF37]/50 rounded-3xl p-6 text-white flex flex-col gap-4 shadow-[0_0_60px_rgba(212,175,55,0.25)] relative overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shadow-lg">
              <Scroll size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-cinzel text-base font-bold text-amber-300 tracking-wider">
                  Bitácora del Oráculo (14-Pass Observable Compiler Trace Log)
                </h3>
                {traceSummary.buildStatus === 'BUILD_FAILED' ? (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-950 text-rose-400 border border-rose-500/50 animate-pulse">
                    BUILD FAILED
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                    BUILD CERTIFIED (60/60 SLOTS)
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 font-mono">
                Trazabilidad 100% Observable de Compilación de Mazos ({allPasses.length} pasadas registradas)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rawLLMData && (
              <button
                onClick={() => setShowRawLLMModal(true)}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              >
                <Code size={14} />
                <span>Ver JSON Crudo Gemini</span>
              </button>
            )}
            <button
              onClick={handleCopyTraceJSON}
              className={cn(
                "px-3 py-1.5 border rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-sm",
                copiedTraceJSON
                  ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300"
                  : "bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/40 text-emerald-300"
              )}
              title="Copiar toda la bitácora JSON al portapapeles sin descargar"
            >
              {copiedTraceJSON ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copiedTraceJSON ? '¡Bitácora Copiada!' : 'Copiar Bitácora'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
              title="Descargar archivo .json"
            >
              <Download size={14} />
              <span>Descargar JSON</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-gray-300 rounded-xl text-xs font-mono font-bold transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all whitespace-nowrap border",
                  activeCategory === cat ? "bg-amber-500/20 text-amber-300 border-amber-500/50" : "border-white/10 text-gray-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pasada, componente o carta..."
              className="w-full bg-black/60 border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* 14-Pass Observable Execution Pipeline Timeline */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 font-mono text-xs scrollbar-thin scrollbar-thumb-amber-500/20">
          {filteredPasses.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic">
              No hay pasadas registradas en la bitácora para los filtros seleccionados.
            </div>
          ) : (
            filteredPasses.map((pass) => {
              const isExpanded = expandedPass === pass.passIndex;
              return (
                <div
                  key={pass.passIndex}
                  className="p-3.5 rounded-2xl border transition-all bg-black/70 hover:bg-black/90 cursor-pointer border-white/10 hover:border-amber-500/40"
                  onClick={() => setExpandedPass(isExpanded ? null : pass.passIndex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-bold text-xs">{pass.passName}</span>
                      <span className="text-gray-400 text-[11px]">({pass.component})</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={cn("px-2.5 py-0.5 rounded border text-[10px] font-bold uppercase", getPassStatusBadge(pass.status))}>
                        {pass.status}
                      </span>
                      <span className="text-[10px] text-gray-500">{new Date(pass.timestamp).toLocaleTimeString()}</span>
                      <ChevronRight size={14} className={cn("transition-transform duration-200 text-gray-400", isExpanded ? "rotate-90" : "")} />
                    </div>
                  </div>

                  {/* Expanded Pass Structural Inspector */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-3 text-[11px] font-mono text-gray-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-black/80 p-2.5 rounded-xl border border-white/10 space-y-1">
                          <strong className="text-purple-400 block border-b border-white/10 pb-1">ENTRADAS (INPUTS):</strong>
                          <pre className="text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(pass.inputs, null, 2)}
                          </pre>
                        </div>

                        <div className="bg-black/80 p-2.5 rounded-xl border border-white/10 space-y-1">
                          <strong className="text-emerald-400 block border-b border-white/10 pb-1">SALIDAS (OUTPUTS):</strong>
                          <pre className="text-[10px] text-emerald-300 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(pass.outputs, null, 2)}
                          </pre>
                        </div>
                      </div>

                      <div className="bg-black/80 p-2.5 rounded-xl border border-white/10 space-y-1">
                        <strong className="text-amber-300 block border-b border-white/10 pb-1">DETALLES ESTRUCTURALES Y EVIDENCIA:</strong>
                        <pre className="text-[10px] text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {JSON.stringify(pass.details, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Raw Gemini LLM JSON Inspector Modal */}
      {showRawLLMModal && rawLLMData && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/95 p-4">
          <div className="w-full max-w-4xl h-[80vh] bg-[#0e0c0b] border-2 border-purple-500/50 rounded-3xl p-6 text-white flex flex-col gap-3 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h4 className="font-cinzel text-sm text-purple-300 font-bold flex items-center gap-2">
                <Code size={16} />
                <span>Respuesta JSON Cruda de Gemini LLM (Raw Capture)</span>
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyRawLLM}
                  className={cn(
                    "px-3 py-1.5 border rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all",
                    copiedRawLLM
                      ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300"
                      : "bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 text-purple-300"
                  )}
                  title="Copiar el JSON crudo al portapapeles"
                >
                  {copiedRawLLM ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  <span>{copiedRawLLM ? '¡Copiado!' : 'Copiar JSON Crudo'}</span>
                </button>
                <button onClick={() => setShowRawLLMModal(false)} className="text-gray-400 hover:text-white text-xs font-mono px-2 py-1">
                  Cerrar
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-black p-4 rounded-2xl border border-white/10 text-[10.5px] font-mono text-emerald-300 whitespace-pre-wrap">
              {rawLLMData.rawResponse || JSON.stringify(rawLLMData.parsedJSON, null, 2)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

