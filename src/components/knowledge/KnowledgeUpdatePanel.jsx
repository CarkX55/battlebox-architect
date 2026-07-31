import { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Database, Sparkles, Layers } from 'lucide-react';
import { KnowledgeUpdatePipeline } from '../../knowledge/ingestion/KnowledgeUpdatePipeline';

export default function KnowledgeUpdatePanel() {
  const [updating, setUpdating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const handleRunPipeline = async () => {
    setUpdating(true);
    setError(null);
    setReport(null);

    try {
      const pipeline = new KnowledgeUpdatePipeline();
      const res = await pipeline.run();
      setReport(res);
    } catch (err) {
      console.error('[KnowledgeUpdatePanel] Pipeline execution error:', err);
      setError(err.message || 'Error executing Knowledge Update Pipeline');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-magic-gold/20 pb-4">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" />
          <div>
            <h2 className="font-cinzel font-bold text-2xl tracking-[0.15em] text-magic-gold uppercase">
              Strategic Knowledge Engine (SKE v8.0)
            </h2>
            <p className="text-xs text-[#f4ece0]/60 font-serif italic">
              Actualizador automático de la base de datos relacional de conocimiento SQLite (`knowledge.db`).
            </p>
          </div>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={updating}
          className="btn-magic-glass border-magic-gold text-magic-gold hover:bg-magic-gold/20 flex items-center gap-2 px-6 py-3 font-cinzel font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,202,88,0.2)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          <span>{updating ? 'Actualizando Conocimiento...' : 'Actualizar Conocimiento'}</span>
        </button>
      </div>

      {report && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-gradient-to-br from-green-950/40 via-black/80 to-amber-950/40 border border-green-500/50 rounded-2xl space-y-4 shadow-xl"
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h3 className="font-cinzel font-bold text-lg text-green-300">
              Conocimiento Actualizado Correctamente
            </h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-white/50 block font-cinzel">NUEVOS OBJETOS</span>
              <span className="text-lg font-bold font-mono text-magic-gold">{report.newCount}</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-white/50 block font-cinzel">MODIFICADOS</span>
              <span className="text-lg font-bold font-mono text-magic-gold">{report.modifiedCount}</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-white/50 block font-cinzel">FUSIONADOS</span>
              <span className="text-lg font-bold font-mono text-magic-gold">{report.totalFusedCount}</span>
            </div>
            <div className="bg-black/60 p-3 rounded-xl border border-white/10">
              <span className="text-white/50 block font-cinzel">TIEMPO</span>
              <span className="text-lg font-bold font-mono text-magic-gold">{report.durationMs} ms</span>
            </div>
          </div>

          {report.changes && report.changes.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-cinzel text-magic-gold/80">Fuentes Sincronizadas:</span>
              <ul className="text-xs text-white/70 space-y-0.5 list-disc pl-4 font-mono">
                {report.changes.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-300 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
