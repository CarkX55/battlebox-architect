/**
 * src/components/forge/StrategicCompilerInspector.jsx
 * 
 * Panel Frontend React del Compilador Estratégico Grandmaster v13.
 * Renderiza:
 * 1. Pruebas de Evidencia de Contratos (Contracts & Evidence Proofs)
 * 2. Atribución Probabilística de Causa de Fallo P(Fail T4)
 * 3. Histograma de Distribución de 10,000 Simulaciones
 * 4. Inspector de Contribución de Carta ("¿Por qué existe esta carta?")
 * 5. Visualizador de Grafo DAG Multirrama Cruzado
 */

import React, { useState } from 'react';
import { CardContributionInspector, ContractEvidenceInspector } from '../../services/compiler/plugins/magic/cardContributionInspector.js';
import { SimulationDistribution } from '../../services/compiler/core/simulationDistribution.js';
import { DAGVisualizerBuilder } from '../../services/compiler/core/dagVisualizerBuilder.js';

export default function StrategicCompilerInspector({ archetype = 'Golgari Elves' }) {
  const [selectedCard, setSelectedCard] = useState('Elvish Mystic');

  const contractProof = ContractEvidenceInspector.getContractProof('cap.mana.acceleration.t1.v1');
  const simDistribution = SimulationDistribution.runDistributionAnalysis([], 10000);
  const cardInspection = CardContributionInspector.inspectCard(selectedCard);
  const dagStructure = DAGVisualizerBuilder.buildMultiBranchDAG(archetype);

  return (
    <div style={{ padding: '24px', background: '#0F172A', color: '#F8FAFC', borderRadius: '12px', fontFamily: 'Inter, sans-serif' }}>
      <header style={{ marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '16px' }}>
        <h2 style={{ color: '#38BDF8', margin: 0 }}>🧠 BattleBox Grandmaster Strategic Compiler</h2>
        <span style={{ fontSize: '12px', color: '#94A3B8' }}>Arquitectura Cognitiva v13.3 — Inspección de Razonamiento y Evidencia Empírica</span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        
        {/* 1. Demostración de Evidencias de Contrato */}
        <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ color: '#4ADE80', marginTop: 0 }}>📋 Evidencia de Contrato Estratégico</h4>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            <strong>Contrato:</strong> Mana Acceleration T1 ({contractProof.capabilityId})
          </div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '12px', background: '#0F172A', padding: '8px', borderRadius: '6px' }}>
            <div>Requeridas: <strong>{contractProof.targetUnitsRequired}</strong></div>
            <div>Encontradas: <strong style={{ color: '#4ADE80' }}>{contractProof.unitsFound}</strong></div>
            <div>P(T1 Accelerator): <strong style={{ color: '#38BDF8' }}>{contractProof.probabilityT1}</strong></div>
          </div>
          <h5 style={{ margin: '8px 0 4px 0', fontSize: '13px', color: '#CBD5E1' }}>Pruebas Empíricas (Cartas Suministradoras):</h5>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {contractProof.proofCards.map((c, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                <span style={{ color: '#F43F5E' }}>✓</span> <strong>{c.cardName}</strong> ({c.copies}x) — <em>{c.role}</em>
              </li>
            ))}
          </ul>
        </div>

        {/* 2. Razonamiento Probabilístico y Causa de Fallo */}
        <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ color: '#F43F5E', marginTop: 0 }}>⚠️ Atribución Probabilística de Fallo</h4>
          <div style={{ fontSize: '14px', marginBottom: '8px' }}>
            Probabilidad de Fallo T4: <strong style={{ color: '#F43F5E' }}>{simDistribution.failureAttribution.probabilityFailT4}</strong>
          </div>
          <h5 style={{ margin: '8px 0 4px 0', fontSize: '13px', color: '#CBD5E1' }}>Causas Principales Identificadas por MCTS:</h5>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px' }}>
            {simDistribution.failureAttribution.causes.map((c, idx) => (
              <li key={idx} style={{ marginBottom: '4px' }}>
                <strong>{c.probability}</strong> — {c.cause}
              </li>
            ))}
          </ul>
        </div>

        {/* 3. Simulación Monte Carlo: Histograma 10,000 Partidas */}
        <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ color: '#38BDF8', marginTop: 0 }}>📊 Histograma Monte Carlo (10,000 Partidas)</h4>
          <div style={{ fontSize: '13px', marginBottom: '12px' }}>
            Turno Letal Medio Estimado: <strong>Turn {simDistribution.estimatedKillTurnMean}</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
            {Object.entries(simDistribution.turnDistribution).map(([turn, pct]) => (
              <div key={turn} style={{ background: '#0F172A', padding: '8px', borderRadius: '6px', border: '1px solid #334155' }}>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>{turn}</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#38BDF8' }}>{pct}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Inspector de Carta: "¿Por qué existe esta carta?" */}
        <div style={{ background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
          <h4 style={{ color: '#F59E0B', marginTop: 0 }}>🔍 Inspector de Contribución de Carta</h4>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '12px', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>Seleccionar Carta a Inspeccionar:</label>
            <select 
              value={selectedCard} 
              onChange={e => setSelectedCard(e.target.value)}
              style={{ width: '100%', padding: '6px', background: '#0F172A', color: '#FFF', border: '1px solid #334155', borderRadius: '4px' }}
            >
              <option value="Elvish Mystic">Elvish Mystic (Dork T1)</option>
              <option value="Collected Company">Collected Company (Value Engine)</option>
            </select>
          </div>
          <div style={{ fontSize: '13px' }}>
            <strong>Razones de Existencia:</strong>
            <ul style={{ margin: '4px 0 8px 0', paddingLeft: '20px' }}>
              {cardInspection.capabilitiesProvided.map((cap, i) => <li key={i}>{cap}</li>)}
            </ul>
            <strong>Desglose de Contribución:</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px', fontSize: '12px' }}>
              {Object.entries(cardInspection.contributionBreakdown).map(([k, v]) => (
                <div key={k} style={{ background: '#0F172A', padding: '4px 8px', borderRadius: '4px' }}>
                  {k}: <strong style={{ color: '#F59E0B' }}>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* 5. Grafo DAG Multirrama Cruzado */}
      <div style={{ marginTop: '20px', background: '#1E293B', padding: '16px', borderRadius: '8px', border: '1px solid #334155' }}>
        <h4 style={{ color: '#A855F7', marginTop: 0 }}>🕸️ Visualizador Grafo DAG Multirrama Cruzado</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0F172A', padding: '16px', borderRadius: '8px', overflowX: 'auto' }}>
          {dagStructure.nodes.map(node => (
            <div key={node.id} style={{ background: '#1E293B', padding: '10px 16px', borderRadius: '6px', border: '1px solid #A855F7', textAlign: 'center', minWidth: '120px' }}>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>Nivel {node.level}</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#A855F7' }}>{node.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
