import React, { useState } from 'react';
import { Shield, Sparkles, Zap, Flame, Swords, AlertTriangle, CheckCircle, ArrowRight, RefreshCw, Crown, Lock, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

export default function StrategicContractPreview({
  contract = {},
  onConfirmCompile,
  onBackToEdit,
  isCompiling = false,
  className
}) {
  const alternatives = contract.alternatives || [];
  const defaultThesisId = alternatives.find(a => a.isRecommended)?.id || alternatives[0]?.id || 'THESIS_PRIMARY';
  const [selectedThesis, setSelectedThesis] = useState(defaultThesisId);
  const [userOverrides, setUserOverrides] = useState({});

  const thesis = contract.thesis || {
    title: 'Estrategia Estratégica Causal',
    description: 'Optimizando el plan de juego para el pool seleccionado.',
    confidenceScore: 'HIGH (94%)',
    expectedKillTurn: 4
  };

  const winPath = contract.winPath || [];
  const proofObligations = contract.proofObligations || [];
  const criticalDemands = contract.criticalDemands || [];
  const risksDetected = contract.risksDetected || [];
  const discrepancies = contract.discrepancies || [];
  const intentSummary = contract.intentSummary || {};

  const handleToggleOverride = (cardName, accept) => {
    setUserOverrides(prev => ({
      ...prev,
      [cardName]: accept ? 'ACCEPTED' : 'OVERRIDDEN'
    }));
  };

  return (
    <div className={cn("p-5 md:p-8 rounded-3xl bg-stone-950/95 border border-amber-500/40 shadow-2xl backdrop-blur-xl space-y-6 text-stone-200", className)}>
      {/* ── 1. HEADER DEL CONTRATO ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-stone-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-400" />
            <h2 className="text-xl md:text-2xl font-black uppercase tracking-wider text-amber-300">
              Contrato Estratégico Propuesto
            </h2>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Revisión formal del plan causal antes de sintetizar las 60 cartas definitivas.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
            {intentSummary.format || 'STANDARD'}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 font-bold">
            {intentSummary.colors?.join('/') || 'Incoloro'}
          </span>
          {intentSummary.primaryTribe && (
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold">
              {intentSummary.primaryTribe}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
            Confianza: {thesis.confidenceScore}
          </span>
        </div>
      </div>

      {/* ── 2. TESIS ESTRATÉGICA PROPUESTA ── */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-stone-900/80 to-stone-900 border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold">
            Tesis del Compilador
          </span>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-200">
            Kill Turn Objetivo: T{thesis.expectedKillTurn}
          </span>
        </div>
        <h3 className="text-base md:text-lg font-black text-amber-100">
          {thesis.title}
        </h3>
        <p className="text-xs md:text-sm text-stone-300 leading-relaxed">
          {thesis.description}
        </p>
      </div>

      {/* ── 3. WIN PATH CAUSAL PASO A PASO ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400" />
          Línea de Victoria Causal (Win Path)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {winPath.map((wp, idx) => (
            <div key={idx} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1 relative">
              <div className="flex items-center justify-between text-[10px] font-mono text-amber-400 font-bold">
                <span>{wp.timing}</span>
                <span>Paso {wp.step}</span>
              </div>
              <div className="text-xs font-bold text-stone-200">{wp.label}</div>
              <p className="text-[10.5px] text-stone-400 leading-tight">{wp.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. ¿QUÉ ESTÁ INTENTANDO DEMOSTRAR EL MOTOR? (PROOF OBLIGATIONS) ── */}
      <div className="space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
          <Shield className="w-4 h-4 text-emerald-400" />
          Obligaciones de Demostración Causal (Proof Obligations)
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {proofObligations.map((po) => (
            <div key={po.id} className="p-3 rounded-xl bg-stone-900/80 border border-stone-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-200">{po.name}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {po.status}
                </span>
              </div>
              <div className="text-[11px] font-mono text-amber-400">Objetivo: {po.target}</div>
              <p className="text-[10.5px] text-stone-400 leading-tight">{po.causalReason}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. DEMANDAS CRÍTICAS & RIESGOS ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-2">
          <h5 className="text-xs font-black uppercase text-cyan-300 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Demandas Críticas del Motor
          </h5>
          <ul className="text-xs space-y-1 text-stone-300">
            {criticalDemands.map((d, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-cyan-400">•</span>
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900/80 border border-stone-800 space-y-2">
          <h5 className="text-xs font-black uppercase text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Riesgos Monitoreados
          </h5>
          <ul className="text-xs space-y-1 text-stone-300">
            {risksDetected.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-rose-400">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── 6. ALTERNATIVAS ESTRATÉGICAS CONSIDERADAS ── */}
      {alternatives.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-stone-400">
            Alternativas de Tesis Evaluadas
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {alternatives.map((alt) => {
              const isSelected = selectedThesis === alt.id;
              return (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => setSelectedThesis(alt.id)}
                  className={cn(
                    "p-3 rounded-xl text-left border transition-all text-xs flex flex-col justify-between space-y-1",
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/30 shadow-lg"
                      : "bg-stone-900/60 border-stone-800 text-stone-400 hover:bg-stone-800"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-200">{alt.label}</span>
                    {alt.isRecommended && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-black">
                        RECOMENDADA
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between text-[10.5px] font-mono text-stone-400">
                    <span>Velocidad: {alt.speed}</span>
                    <span>WinRate: {alt.winRateEstimated}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── 7. PANEL DE DISCREPANCIAS / OVERRIDES ── */}
      {discrepancies.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
          <h5 className="text-xs font-black uppercase text-amber-300 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Discrepancias Estratégicas Detectadas
          </h5>
          {discrepancies.map((disc, idx) => {
            const state = userOverrides[disc.card] || 'PENDING';
            return (
              <div key={idx} className="p-3 rounded-xl bg-stone-900/90 border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-stone-200">
                    {disc.card} — Pedías {disc.userRequested}x, el motor recomienda {disc.engineRecommended}x
                  </div>
                  <p className="text-[11px] text-stone-400">{disc.rationale}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleOverride(disc.card, true)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-xs transition-all",
                      state === 'ACCEPTED' || state === 'PENDING'
                        ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                        : "bg-stone-800 text-stone-400 hover:text-stone-200"
                    )}
                  >
                    Aceptar ({disc.engineRecommended}x)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleOverride(disc.card, false)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-xs transition-all",
                      state === 'OVERRIDDEN'
                        ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                        : "bg-stone-800 text-stone-400 hover:text-stone-200"
                    )}
                  >
                    Mantener ({disc.userRequested}x)
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 8. BOTONES DE ACCIÓN ── */}
      <div className="flex flex-col md:flex-row items-center justify-between pt-4 border-t border-stone-800 gap-4">
        <button
          type="button"
          onClick={onBackToEdit}
          disabled={isCompiling}
          className="w-full md:w-auto px-5 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition-all"
        >
          ← Volver a Modificar Parámetros
        </button>

        <button
          type="button"
          onClick={() => onConfirmCompile?.({ selectedThesis, userOverrides })}
          disabled={isCompiling}
          className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 disabled:opacity-50"
        >
          {isCompiling ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Sintetizando 60 Cartas Certificadas...
            </>
          ) : (
            <>
              <span>Compilar Mazo y Sintetizar 60 Cartas</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
