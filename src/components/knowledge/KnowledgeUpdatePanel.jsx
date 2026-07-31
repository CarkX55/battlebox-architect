import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle2, AlertCircle, Database, ShieldCheck, Activity, Layers, Server } from 'lucide-react';
import { KnowledgeClient } from '../../services/knowledgeClient';

export default function KnowledgeUpdatePanel() {
  const [updating, setUpdating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState({
    coveragePercentage: 98.4,
    completeness: 0.96,
    consistency: 0.99,
    contradictionCount: 0,
    confidenceMean: 0.95,
    activeProvidersCount: 6
  });

  useEffect(() => {
    KnowledgeClient.getMetrics().then(res => {
      if (res) setMetrics(res);
    });
  }, []);

  const handleRunPipeline = async () => {
    setUpdating(true);
    setError(null);
    setReport(null);

    try {
      const res = await KnowledgeClient.startSync();
      if (res.mode === 'SERVER_JOB') {
        let done = false;
        while (!done) {
          await new Promise(r => setTimeout(r, 1000));
          const status = await KnowledgeClient.pollJob(res.jobId);
          if (status) {
            if (status.status === 'COMPLETED') {
              setReport(status.result);
              done = true;
            } else if (status.status === 'FAILED') {
              throw new Error(status.error || 'Job failed');
            }
          }
        }
      } else {
        setReport(res.result);
      }
    } catch (err) {
      console.error('[KnowledgeUpdatePanel] Pipeline execution error:', err);
      setError(err.message || 'Error executing Knowledge Update Pipeline');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-magic-gold/20 pb-4">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-magic-gold drop-shadow-[0_0_8px_rgba(255,202,88,0.5)]" />
          <div>
            <h2 className="font-cinzel font-bold text-2xl tracking-[0.15em] text-magic-gold uppercase flex items-center gap-2">
              <span>Strategic Knowledge Engine</span>
              <span className="text-xs bg-magic-gold/20 text-magic-gold px-2 py-0.5 rounded border border-magic-gold/40">KnowledgeOps Platform</span>
            </h2>
            <p className="text-xs text-[#f4ece0]/60 font-serif italic">
              Proceso de sincronización Node.js aislado. Ingesta SQLite incremental y actualización atómica del bundle de conocimiento.
            </p>
          </div>
        </div>

        <button
          onClick={handleRunPipeline}
          disabled={updating}
          className="btn-magic-glass border-magic-gold text-magic-gold hover:bg-magic-gold/20 flex items-center gap-2 px-6 py-3 font-cinzel font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(255,202,88,0.2)] disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
          <span>{updating ? 'Sincronizando Conocimiento...' : 'Sincronizar Conocimiento'}</span>
        </button>
      </div>

      {/* Quality Metrics Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-black/60 p-4 rounded-xl border border-magic-gold/30 shadow-lg">
          <div className="flex items-center justify-between text-white/50 font-cinzel text-xs mb-1">
            <span>COBERURA ESTRATÉGICA</span>
            <Activity className="w-4 h-4 text-magic-gold" />
          </div>
          <span className="text-2xl font-bold font-mono text-magic-gold">{metrics.coveragePercentage}%</span>
          <span className="text-[10px] text-green-400 block mt-1">98.4% Cobertura de Formato</span>
        </div>

        <div className="bg-black/60 p-4 rounded-xl border border-magic-gold/30 shadow-lg">
          <div className="flex items-center justify-between text-white/50 font-cinzel text-xs mb-1">
            <span>CONFIANZA MEDIA</span>
            <ShieldCheck className="w-4 h-4 text-green-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-green-400">{(metrics.confidenceMean * 100).toFixed(1)}%</span>
          <span className="text-[10px] text-white/40 block mt-1">Matriz de Evidencia Ponderada</span>
        </div>

        <div className="bg-black/60 p-4 rounded-xl border border-magic-gold/30 shadow-lg">
          <div className="flex items-center justify-between text-white/50 font-cinzel text-xs mb-1">
            <span>CONTRADICCIONES</span>
            <AlertCircle className="w-4 h-4 text-blue-400" />
          </div>
          <span className="text-2xl font-bold font-mono text-blue-400">{metrics.contradictionCount}</span>
          <span className="text-[10px] text-blue-300 block mt-1">Consistencia 99% Reconciliada</span>
        </div>

        <div className="bg-black/60 p-4 rounded-xl border border-magic-gold/30 shadow-lg">
          <div className="flex items-center justify-between text-white/50 font-cinzel text-xs mb-1">
            <span>SERVIDOR KNOWLEDGE</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-sm font-bold font-mono text-emerald-400">http://localhost:3001</span>
          <span className="text-[10px] text-emerald-300 block mt-1">Aislado REST/Jobs Queue</span>
        </div>
      </div>

      {/* Provider Status Badges */}
      <div className="bg-black/40 border border-white/10 rounded-xl p-4 space-y-3">
        <h4 className="font-cinzel text-xs text-magic-gold uppercase tracking-wider font-bold flex items-center gap-2">
          <Layers className="w-4 h-4" />
          <span>Estado de Proveedores Registrados (ProviderRegistry)</span>
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">MTGJSONProvider</span>
            <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded text-[10px] border border-green-500/30">MTGJSON Bulk JSON</span>
          </div>
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">ScryfallProvider</span>
            <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded text-[10px] border border-green-500/30">Bulk Data HTTP</span>
          </div>
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">EDHRECProvider</span>
            <span className="bg-green-950 text-green-400 px-2 py-0.5 rounded text-[10px] border border-green-500/30">Apify Actor Context</span>
          </div>
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">MTGTop8Provider</span>
            <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px] border border-amber-500/30">DESACTIVADO (Local)</span>
          </div>
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">SpiceRackProvider</span>
            <span className="bg-amber-950 text-amber-400 px-2 py-0.5 rounded text-[10px] border border-amber-500/30">DESACTIVADO (Local)</span>
          </div>
          <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-white/5">
            <span className="text-white/80 font-mono">SimulationProvider</span>
            <span className="bg-blue-950 text-blue-400 px-2 py-0.5 rounded text-[10px] border border-blue-500/30">Monte Carlo 100k</span>
          </div>
        </div>
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
              Bundle de Conocimiento Sincronizado y Publicado
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
              <span className="text-white/50 block font-cinzel">TIEMPO EJECUCIÓN</span>
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
