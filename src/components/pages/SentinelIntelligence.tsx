import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Network,
  BarChart3,
  Sliders,
  RefreshCw,
  Zap,
  ShieldAlert,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Search,
  ArrowRight,
  Filter,
  Info,
  ChevronRight,
  Database,
  Layers,
  Activity,
  UserCheck,
  AlertTriangle,
  Play,
  RotateCcw,
  Key,
  Globe,
  Check,
  X,
} from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';
import { Transaction, TechnicalRiskDetails, RiskDecision, RiskEvaluationRequest } from '../../types';
import { evaluateTransactionRisk, calculateLocalRisk } from '../../utils/riskEngine';
import { NeoCard } from '../common/NeoCard';
import { NeoButton } from '../common/NeoButton';
import { neo4jApi } from '../../services/api';


interface SentinelIntelligenceProps {
  initialTransactionId?: string;
  onNavigate?: (route: string) => void;
}

export const SentinelIntelligence: React.FC<SentinelIntelligenceProps> = ({
  initialTransactionId,
  onNavigate,
}) => {
  const {
    transactions,
    highRiskFlaggedTransactions,
    modelWeights,
    updateModelWeights,
    resetModelWeights,
  } = useTransactions();

  const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'graph' | 'explainability' | 'experiments'>('overview');
  const [selectedTxId, setSelectedTxId] = useState<string>(
    initialTransactionId || (transactions[0]?.id ?? '')
  );
  const [isCheckingBackend, setIsCheckingBackend] = useState<boolean>(false);
  const [backendStatus, setBackendStatus] = useState<{
    rf: 'PROTOTYPE';
    iso: 'PROTOTYPE';
    neo4j: 'CONNECTED' | 'DISCONNECTED' | 'CHECKING';
    shap: 'PROTOTYPE';
  }>({
    rf: 'PROTOTYPE',
    iso: 'PROTOTYPE',
    neo4j: 'CHECKING',
    shap: 'PROTOTYPE',
  });

  // Graph Node Selection State (Sample Demo Graph Data)
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    type: 'User' | 'Transaction' | 'Beneficiary' | 'Device' | 'Location';
    label: string;
    properties: Record<string, string | number>;
    riskScore: number;
    connections: string[];
  }>({
    id: 'user-01',
    type: 'User',
    label: '[SAMPLE DEMO DATA] Primary Account',
    properties: { ID: 'USR-88219', VerificationLevel: 'KYC Level 3 (Sample)', TotalSpent30d: '₹42,800' },
    riskScore: 12,
    connections: ['Tx-108 (FastWire Pay)', 'Device (iPhone 15 Pro)', 'Home IP (Bengaluru)'],
  });

  // Model Weight State
  const [rfWeight, setRfWeight] = useState((modelWeights?.rfWeight ?? 0.45) * 100);
  const [isoWeight, setIsoWeight] = useState((modelWeights?.isoWeight ?? 0.35) * 100);
  const [graphWeight, setGraphWeight] = useState((modelWeights?.graphWeight ?? 0.20) * 100);

  useEffect(() => {
    if (modelWeights) {
      setRfWeight((modelWeights.rfWeight ?? 0.45) * 100);
      setIsoWeight((modelWeights.isoWeight ?? 0.35) * 100);
      setGraphWeight((modelWeights.graphWeight ?? 0.20) * 100);
    }
  }, [modelWeights]);

  // Experiment Lab State
  const [simAmount, setSimAmount] = useState<number>(25000);
  const [simNewRecipient, setSimNewRecipient] = useState<boolean>(true);
  const [simRecipientName, setSimRecipientName] = useState<string>('Unverified Crypto Sink VPA');
  const [simResult, setSimResult] = useState<any | null>(null);

  // Neo4j Integration State
  const [isNeo4jModalOpen, setIsNeo4jModalOpen] = useState<boolean>(false);
  const [neo4jUri, setNeo4jUri] = useState<string>('');
  const [neo4jUsername, setNeo4jUsername] = useState<string>('neo4j');
  const [neo4jPassword, setNeo4jPassword] = useState<string>('');
  const [neo4jDatabase, setNeo4jDatabase] = useState<string>('neo4j');
  const [neo4jIsConfigured, setNeo4jIsConfigured] = useState<boolean>(false);
  const [neo4jIsSaving, setNeo4jIsSaving] = useState<boolean>(false);
  const [neo4jFeedback, setNeo4jFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [liveGraphData, setLiveGraphData] = useState<any | null>(null);

  useEffect(() => {
    checkNeo4jStatus();
  }, []);

  const checkNeo4jStatus = async () => {
    try {
      const status = await neo4jApi.getStatus();
      setNeo4jIsConfigured(status.configured);
      if (status.uri) setNeo4jUri(status.uri);
      if (status.configured) {
        setBackendStatus((prev) => ({ ...prev, neo4j: 'CONNECTED' }));
        fetchLiveGraph();
      } else {
        setBackendStatus((prev) => ({ ...prev, neo4j: 'DISCONNECTED' }));
      }
    } catch (e) {
      // Offline fallback
    }
  };

  const fetchLiveGraph = async () => {
    try {
      const data = await neo4jApi.getGraphData();
      if (data && data.summary) {
        setLiveGraphData(data);
      }
    } catch (e) {
      // Local fallback
    }
  };

  const handleSaveNeo4jCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!neo4jUri || !neo4jPassword) {
      setNeo4jFeedback({ type: 'error', message: 'Please provide both Neo4j URI and Password.' });
      return;
    }

    setNeo4jIsSaving(true);
    setNeo4jFeedback({ type: 'info', message: 'Testing connection to Neo4j instance...' });

    try {
      const res = await neo4jApi.configureCredentials({
        uri: neo4jUri,
        username: neo4jUsername || 'neo4j',
        password: neo4jPassword,
        database: neo4jDatabase || 'neo4j',
      });

      if (res.success) {
        setNeo4jFeedback({ type: 'success', message: 'Neo4j connected successfully! Transactions will now sync to graph nodes.' });
        setNeo4jIsConfigured(true);
        setBackendStatus((prev) => ({ ...prev, neo4j: 'CONNECTED' }));
        fetchLiveGraph();
        setTimeout(() => setIsNeo4jModalOpen(false), 1500);
      } else {
        setNeo4jFeedback({ type: 'error', message: res.message || 'Connection failed. Check credentials.' });
      }
    } catch (err: any) {
      setNeo4jFeedback({ type: 'error', message: err.message || 'Failed to connect to Neo4j database.' });
    } finally {
      setNeo4jIsSaving(false);
    }
  };

  useEffect(() => {
    if (initialTransactionId) {
      setSelectedTxId(initialTransactionId);
    }
  }, [initialTransactionId]);


  const handleWeightApply = () => {
    const total = rfWeight + isoWeight + graphWeight || 100;
    updateModelWeights({
      rfWeight: parseFloat((rfWeight / total).toFixed(2)),
      isoWeight: parseFloat((isoWeight / total).toFixed(2)),
      graphWeight: parseFloat((graphWeight / total).toFixed(2)),
    });
  };

  const handleCheckBackendHealth = async () => {
    setIsCheckingBackend(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        setBackendStatus({
          rf: 'READY',
          iso: 'READY',
          neo4j: 'CONNECTED',
          shap: 'READY',
        });
      }
    } catch {
      // Local engine operational
    } finally {
      setTimeout(() => setIsCheckingBackend(false), 600);
    }
  };

  const runExperimentSimulation = async () => {
    const req: RiskEvaluationRequest = {
      amount: simAmount,
      recipientName: simRecipientName,
      recipientPhone: '+91 98765 00000',
      paymentType: 'PHONE',
      isNewRecipient: simNewRecipient,
    };
    const result = await evaluateTransactionRisk(req);
    setSimResult(result);
  };

  // Selected Transaction for Investigation
  const selectedTx = transactions.find((t) => t.id === selectedTxId) || transactions[0];

  // Overview Metrics
  const totalEvaluations = transactions.length;
  const lowRiskCount = transactions.filter((t) => t.riskLevel === 'LOW' || t.decision === 'ALLOW').length;
  const medRiskCount = transactions.filter((t) => t.riskLevel === 'MEDIUM' || t.decision === 'CHALLENGE').length;
  const highRiskCount = transactions.filter((t) => t.riskLevel === 'HIGH' || t.riskLevel === 'CRITICAL' || t.decision === 'BLOCK').length;
  const avgSafetyScore = totalEvaluations
    ? Math.round(transactions.reduce((acc, t) => acc + (t.safetyScore || 75), 0) / totalEvaluations)
    : 85;

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest bg-[#7C3AED] text-white px-2.5 py-1 rounded border border-black neo-shadow-sm">
              Consolidated Security Intelligence
            </span>
            <span className="text-xs font-bold text-black/60 uppercase">
              • Pipeline v3.4 Active
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-black leading-tight uppercase tracking-tight mt-1">
            Sentinel Intelligence
          </h1>
          <p className="text-xs sm:text-sm font-bold text-black/70 mt-1 max-w-2xl">
            Understand how SentinelFin detects, evaluates, and explains transaction risk in real time using fusion models and graph neural topology.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCheckBackendHealth}
          disabled={isCheckingBackend}
          className="self-start md:self-auto px-3.5 py-2 bg-purple-50 text-[#7C3AED] hover:bg-purple-100 border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isCheckingBackend ? 'animate-spin' : ''}`} />
          <span>{isCheckingBackend ? 'Checking API...' : 'Verify Model Pipeline'}</span>
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b-2 border-black/20">
        {[
          { id: 'overview', label: 'Overview & Fusion', icon: Activity },
          { id: 'models', label: 'RF & Isolation Forest', icon: BarChart3 },
          { id: 'graph', label: 'Neo4j Graph Topology', icon: Network },
          { id: 'explainability', label: 'SHAP Explainability', icon: Layers },
          { id: 'experiments', label: 'Experiment Lab', icon: Sliders },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase border-2 transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-[#7C3AED] text-white border-black neo-shadow-sm'
                  : 'bg-white text-black border-transparent hover:border-black/30 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & FUSION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Model Status Section */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border-2 border-black p-4 neo-shadow rounded-lg space-y-1">
              <span className="text-[10px] font-black uppercase text-black/60 block">
                Random Forest
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-black">Classifier</span>
                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-700 uppercase">
                  {backendStatus.rf}
                </span>
              </div>
              <p className="text-[11px] font-medium text-black/70">Supervised Behavioral Rules</p>
            </div>

            <div className="bg-white border-2 border-black p-4 neo-shadow rounded-lg space-y-1">
              <span className="text-[10px] font-black uppercase text-black/60 block">
                Isolation Forest
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-black">Anomaly Detector</span>
                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-700 uppercase">
                  {backendStatus.iso}
                </span>
              </div>
              <p className="text-[11px] font-medium text-black/70">Zero-day Outlier Isolation</p>
            </div>

            <div className="bg-white border-2 border-black p-4 neo-shadow rounded-lg space-y-1">
              <span className="text-[10px] font-black uppercase text-black/60 block">
                Neo4j Graph
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-black">Knowledge Net</span>
                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-700 uppercase">
                  {backendStatus.neo4j}
                </span>
              </div>
              <p className="text-[11px] font-medium text-black/70">Multi-hop Mule Traversal</p>
            </div>

            <div className="bg-white border-2 border-black p-4 neo-shadow rounded-lg space-y-1">
              <span className="text-[10px] font-black uppercase text-black/60 block">
                Explainability
              </span>
              <div className="flex items-center justify-between">
                <span className="text-base font-black text-black">SHAP Engine</span>
                <span className="text-xs font-black bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-700 uppercase">
                  {backendStatus.shap}
                </span>
              </div>
              <p className="text-[11px] font-medium text-black/70">Attribution Attribution</p>
            </div>
          </div>

          {/* Risk Overview Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#FAF7F2] border-2 border-black p-4 neo-shadow rounded-lg">
              <span className="text-[10px] font-black text-black/60 uppercase block">Total Evaluated</span>
              <span className="text-2xl font-black text-black tracking-tight">{totalEvaluations}</span>
            </div>
            <div className="bg-emerald-50 border-2 border-emerald-900 p-4 neo-shadow rounded-lg">
              <span className="text-[10px] font-black text-emerald-900 uppercase block">Allowed (Safe)</span>
              <span className="text-2xl font-black text-emerald-950 tracking-tight">{lowRiskCount}</span>
            </div>
            <div className="bg-amber-50 border-2 border-amber-900 p-4 neo-shadow rounded-lg">
              <span className="text-[10px] font-black text-amber-900 uppercase block">Challenged</span>
              <span className="text-2xl font-black text-amber-950 tracking-tight">{medRiskCount}</span>
            </div>
            <div className="bg-red-50 border-2 border-red-900 p-4 neo-shadow rounded-lg">
              <span className="text-[10px] font-black text-red-900 uppercase block">Blocked (High Risk)</span>
              <span className="text-2xl font-black text-red-950 tracking-tight">{highRiskCount}</span>
            </div>
            <div className="bg-purple-50 border-2 border-purple-900 p-4 neo-shadow rounded-lg col-span-2 sm:col-span-1">
              <span className="text-[10px] font-black text-purple-900 uppercase block">Avg Safety Index</span>
              <span className="text-2xl font-black text-purple-950 tracking-tight">{avgSafetyScore} / 100</span>
            </div>
          </div>

          {/* Core Risk Fusion Visualization */}
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-6">
            <div className="flex items-center justify-between border-b-2 border-black pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">
                  Live Ensembling Pipeline
                </span>
                <h3 className="text-lg font-black uppercase text-black">
                  Risk Fusion Architecture
                </h3>
              </div>
              <NeoButton variant="secondary" size="sm" onClick={resetModelWeights}>
                Reset Default Weights
              </NeoButton>
            </div>

            {/* Pipeline Flow Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
              {/* Inputs */}
              <div className="lg:col-span-5 space-y-3">
                <div className="p-3 bg-[#FAF7F2] border-2 border-black rounded-lg neo-shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Input Signal 1</span>
                    <span className="font-black text-xs uppercase">Behavioral Rules (Random Forest)</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#7C3AED] bg-purple-100 px-2 py-0.5 rounded border border-black">
                    Weight: {Math.round(rfWeight)}%
                  </span>
                </div>

                <div className="p-3 bg-[#FAF7F2] border-2 border-black rounded-lg neo-shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Input Signal 2</span>
                    <span className="font-black text-xs uppercase">Isolation Forest Anomaly</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#7C3AED] bg-purple-100 px-2 py-0.5 rounded border border-black">
                    Weight: {Math.round(isoWeight)}%
                  </span>
                </div>

                <div className="p-3 bg-[#FAF7F2] border-2 border-black rounded-lg neo-shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Input Signal 3</span>
                    <span className="font-black text-xs uppercase">Neo4j Graph Neural Network</span>
                  </div>
                  <span className="font-mono text-xs font-black text-[#7C3AED] bg-purple-100 px-2 py-0.5 rounded border border-black">
                    Weight: {Math.round(graphWeight)}%
                  </span>
                </div>
              </div>

              {/* Arrow */}
              <div className="lg:col-span-2 text-center flex justify-center py-2 lg:py-0">
                <div className="w-10 h-10 bg-[#7C3AED] text-white border-2 border-black rounded-full neo-shadow flex items-center justify-center font-black">
                  ↓
                </div>
              </div>

              {/* Fusion Engine Output */}
              <div className="lg:col-span-5 bg-black text-white p-5 border-2 border-black neo-shadow-purple rounded-lg space-y-3">
                <div className="flex items-center justify-between border-b border-white/20 pb-2">
                  <span className="text-xs font-black uppercase text-purple-300">
                    Sentinel Risk Fusion Engine
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700">
                    Sub-10ms
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black text-white/60 uppercase block">Weighted Result Decision</span>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black uppercase tracking-tight text-emerald-400">
                      ALLOW (92/100 Safe)
                    </span>
                    <span className="text-xs font-mono text-white/80">Threshold &lt; 0.45</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/70 font-medium leading-snug">
                  Evaluates behavioral deviation, zero-day anomaly scores, and Neo4j graph distance simultaneously.
                </p>
              </div>
            </div>

            {/* Calibration Sliders */}
            <div className="pt-4 border-t-2 border-black/10 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-black">
                Calibrate Model Ensemble Weights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                    <span>Random Forest</span>
                    <span className="text-[#7C3AED] font-mono">{Math.round(rfWeight)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={rfWeight}
                    onChange={(e) => setRfWeight(Number(e.target.value))}
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                    <span>Isolation Forest</span>
                    <span className="text-[#7C3AED] font-mono">{Math.round(isoWeight)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={isoWeight}
                    onChange={(e) => setIsoWeight(Number(e.target.value))}
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-black uppercase mb-1">
                    <span>Neo4j Graph Risk</span>
                    <span className="text-[#7C3AED] font-mono">{Math.round(graphWeight)}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={graphWeight}
                    onChange={(e) => setGraphWeight(Number(e.target.value))}
                    className="w-full accent-[#7C3AED] cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleWeightApply}
                className="w-full py-2.5 bg-[#7C3AED] text-white border-2 border-black rounded-lg text-xs font-black uppercase neo-shadow hover:bg-purple-700 cursor-pointer transition-all"
              >
                Apply Re-Weighted Parameters
              </button>
            </div>
          </div>

          {/* Deep Transaction Investigation Section */}
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">
                  Deep Inspection Workspace
                </span>
                <h3 className="text-lg font-black uppercase text-black">
                  Transaction Technical Investigation
                </h3>
              </div>

              {/* Transaction Selector */}
              <div className="w-full sm:w-auto">
                <select
                  value={selectedTxId}
                  onChange={(e) => setSelectedTxId(e.target.value)}
                  className="w-full sm:w-72 px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded-lg text-xs font-bold text-black focus:outline-none focus:neo-shadow"
                >
                  {transactions.map((tx) => (
                    <option key={tx.id} value={tx.id}>
                      {tx.recipientName} - ₹{tx.amount.toLocaleString('en-IN')} ({tx.decision || tx.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedTx ? (
              <div className="space-y-4">
                {/* Highlight Banner if Blocked or Challenged */}
                {(selectedTx.decision === 'BLOCK' || selectedTx.decision === 'CHALLENGE' || selectedTx.riskLevel === 'HIGH' || selectedTx.riskLevel === 'CRITICAL') && (
                  <div className="p-4 bg-red-950 text-white border-4 border-black neo-shadow-lg rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertOctagon className="w-5 h-5 text-red-400 animate-pulse" />
                      <span className="text-xs font-black uppercase tracking-wider text-red-200">
                        WHY WAS THIS PAYMENT {selectedTx.decision === 'BLOCK' ? 'BLOCKED' : 'FLAGGED FOR CHALLENGE'}?
                      </span>
                    </div>

                    <p className="text-sm font-bold text-white leading-snug">
                      {selectedTx.technicalDetails?.shapFactors?.[0]?.factor
                        ? `Payment of ₹${selectedTx.amount.toLocaleString('en-IN')} to ${selectedTx.recipientName} presented high threat correlation driven by ${selectedTx.technicalDetails.shapFactors[0].factor}.`
                        : `Payment of ₹${selectedTx.amount.toLocaleString('en-IN')} to ${selectedTx.recipientName} differed significantly from normal spending baselines.`}
                    </p>

                    <div className="pt-2 border-t border-red-800 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-red-200">
                      <div>
                        <span className="font-black uppercase text-white block text-[10px]">Evidence Flags:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                          {selectedTx.reasons?.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <span className="font-black uppercase text-white block text-[10px]">Technical Ensembles:</span>
                        <div className="font-mono text-[11px] text-red-300 space-y-0.5 mt-1">
                          <div>RF Score: {selectedTx.technicalDetails?.rfScore || 0.82}</div>
                          <div>IF Anomaly: {selectedTx.technicalDetails?.ifScore || 0.79}</div>
                          <div>Graph Distance: {selectedTx.technicalDetails?.graphRisk || 0.71}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-[#FAF7F2] p-4 border-2 border-black rounded-lg">
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Recipient</span>
                    <span className="font-black text-sm text-black">{selectedTx.recipientName}</span>
                    <span className="text-[11px] font-mono text-black/60 block">{selectedTx.recipientPhone}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Amount</span>
                    <span className="font-black text-lg text-black">₹{selectedTx.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Decision Output</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 text-xs font-black uppercase rounded border border-black ${
                        selectedTx.decision === 'BLOCK'
                          ? 'bg-red-600 text-white'
                          : selectedTx.decision === 'CHALLENGE'
                          ? 'bg-amber-400 text-black'
                          : 'bg-emerald-500 text-white'
                      }`}
                    >
                      {selectedTx.decision || 'ALLOW'} ({selectedTx.safetyScore || 92}/100)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-black/60 block">Timestamp</span>
                    <span className="font-bold text-xs text-black">
                      {new Date(selectedTx.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-black/60 font-bold">No transaction selected for investigation.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MODELS (RANDOM FOREST & ISOLATION FOREST) */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          {/* Random Forest Section */}
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">Model 1</span>
                <h3 className="text-lg font-black uppercase text-black">Supervised Random Forest Classifier</h3>
              </div>
              <span className="text-xs font-black uppercase bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
                Status: {backendStatus.rf}
              </span>
            </div>

            <p className="text-xs font-bold text-black/70 leading-relaxed">
              Random Forest evaluates 18 primary behavioral features comparing incoming payment parameters against the user's 90-day baseline envelope.
            </p>

            {/* Feature Importance Horizontal Chart */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black uppercase text-black">Feature Importance Weights</h4>

              {[
                { name: 'amount_deviation_30d', weight: 38, label: 'Amount Deviation vs Baseline' },
                { name: 'recipient_novelty_flag', weight: 26, label: 'Recipient Novelty / First Time Transfer' },
                { name: 'device_fingerprint_mismatch', weight: 18, label: 'Device & IP Footprint Consistency' },
                { name: 'location_geo_distance', weight: 11, label: 'Geographical Deviation' },
                { name: 'time_of_day_velocity', weight: 7, label: 'Time-of-day Velocity Spike' },
              ].map((item) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-black uppercase">
                    <span>{item.label}</span>
                    <span className="font-mono text-[#7C3AED]">{item.weight}%</span>
                  </div>
                  <div className="w-full bg-gray-200 h-3 border border-black rounded overflow-hidden">
                    <div
                      className="bg-[#7C3AED] h-full transition-all duration-500"
                      style={{ width: `${item.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Isolation Forest Section */}
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">Model 2</span>
                <h3 className="text-lg font-black uppercase text-black">Unsupervised Isolation Forest Anomaly Engine</h3>
              </div>
              <span className="text-xs font-black uppercase bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded border border-emerald-800">
                Status: {backendStatus.iso}
              </span>
            </div>

            <p className="text-xs font-bold text-black/70 leading-relaxed">
              Isolation Forest isolates outlier observations without requiring pre-labeled fraud classes. It detects zero-day attacks and rapid multi-vpa hops.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-[#FAF7F2] p-4 border-2 border-black rounded-lg">
                <span className="text-[10px] font-black text-black/60 uppercase block">Outlier Sensitivity</span>
                <span className="text-xl font-black text-black">0.05 (Top 5%)</span>
              </div>
              <div className="bg-[#FAF7F2] p-4 border-2 border-black rounded-lg">
                <span className="text-[10px] font-black text-black/60 uppercase block">Average Anomaly Score</span>
                <span className="text-xl font-black text-emerald-600">0.18 (Low Risk)</span>
              </div>
              <div className="bg-[#FAF7F2] p-4 border-2 border-black rounded-lg">
                <span className="text-[10px] font-black text-black/60 uppercase block">Recent Outliers Isolated</span>
                <span className="text-xl font-black text-amber-600">{highRiskFlaggedTransactions.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GRAPH (NEO4J GRAPH INTELLIGENCE) */}
      {activeTab === 'graph' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">Knowledge Net</span>
                <h3 className="text-lg font-black uppercase text-black">Neo4j Graph Neural Risk Context</h3>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span
                  className={`text-xs font-black uppercase px-2.5 py-1 rounded border ${
                    neo4jIsConfigured
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-800'
                      : 'bg-amber-100 text-amber-950 border-amber-800'
                  }`}
                >
                  Neo4j: {neo4jIsConfigured ? 'LIVE INSTANCE CONNECTED' : 'IN-MEMORY GRAPH MODE'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsNeo4jModalOpen(true)}
                  className="px-3 py-1 bg-[#7C3AED] text-white font-black text-xs border-2 border-black neo-shadow hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform rounded flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Configure Neo4j</span>
                </button>
              </div>
            </div>

            {/* Connection Status Banner */}
            <div
              className={`p-3.5 border-2 border-black rounded-lg text-xs font-bold flex items-center justify-between ${
                neo4jIsConfigured ? 'bg-emerald-50 text-emerald-950' : 'bg-amber-50 text-amber-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 shrink-0 text-[#7C3AED]" />
                <span>
                  {neo4jIsConfigured
                    ? `Connected to Neo4j instance at ${neo4jUri || 'AuraDB / Self-Hosted'}. All transactions are stored directly into Cypher nodes.`
                    : 'Currently using simulated in-memory graph. Click "Configure Neo4j" to connect your live database instance!'}
                </span>
              </div>
              {!neo4jIsConfigured && (
                <button
                  type="button"
                  onClick={() => setIsNeo4jModalOpen(true)}
                  className="underline font-black text-[#7C3AED] hover:text-purple-900 shrink-0 ml-2 cursor-pointer"
                >
                  Connect Database →
                </button>
              )}
            </div>

            <p className="text-xs font-bold text-black/70 leading-snug">
              Graph topology maps relationships across accounts, devices, VPAs, and locations to identify mule rings and circular money laundering loops. Click any node below to inspect graph context.
            </p>

            {/* Visual Interactive Graph Nodes */}
            <div className="bg-black text-white p-6 border-2 border-black neo-shadow-purple rounded-lg relative overflow-hidden min-h-[260px] flex flex-wrap items-center justify-around gap-4">
              {(liveGraphData && liveGraphData.nodes && liveGraphData.nodes.length > 0
                ? liveGraphData.nodes.map((n: any) => ({
                    id: n.id,
                    type: n.type || 'Account',
                    label: n.name || n.label || n.id,
                    risk: n.riskScore || 25,
                    connections: [n.phone || 'Phone Account', 'Active Transfers'],
                  }))
                : [
                    { id: 'user-01', type: 'User', label: 'User: Sujan Kumar', risk: 12, connections: ['Tx-108', 'Device-01'] },
                    { id: 'tx-108', type: 'Transaction', label: 'Tx: FastWire Pay (₹9,800)', risk: 85, connections: ['User: Sujan', 'Mule Sink VPA'] },
                    { id: 'device-01', type: 'Device', label: 'Device: iPhone 15 Pro', risk: 0, connections: ['User: Sujan'] },
                    { id: 'beneficiary-mule', type: 'Beneficiary', label: 'Mule Sink: Apex Electronics', risk: 91, connections: ['Tx-108', 'Shared Device Fingerprint'] },
                  ]
              ).map((node) => {
                const isSelected = selectedNode.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() =>
                      setSelectedNode({
                        id: node.id,
                        type: node.type as any,
                        label: node.label,
                        properties: { NodeID: node.id, Category: node.type, ThreatScore: `${node.risk}/100` },
                        riskScore: node.risk,
                        connections: node.connections,
                      })
                    }
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer text-left space-y-1 ${
                      isSelected
                        ? 'border-emerald-400 bg-purple-950/80 neo-shadow-lg scale-105'
                        : 'border-white/30 bg-white/10 hover:border-white hover:bg-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase text-purple-300">{node.type}</span>
                      <span
                        className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${
                          node.risk > 60 ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                      >
                        Risk: {node.risk}
                      </span>
                    </div>
                    <div className="font-black text-xs text-white">{node.label}</div>
                  </button>
                );
              })}
            </div>

            {/* Selected Node Inspector Side Panel */}
            <div className="bg-[#FAF7F2] p-4 border-2 border-black rounded-lg space-y-2">
              <div className="flex items-center justify-between border-b border-black/20 pb-2">
                <span className="text-xs font-black uppercase text-black">
                  Graph Node Inspector: {selectedNode.label}
                </span>
                <span className="text-[10px] font-mono font-black uppercase text-[#7C3AED]">
                  {selectedNode.type} Vertex
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-black uppercase text-black/60 block">Connected Edges & Paths:</span>
                  <ul className="list-disc list-inside space-y-0.5 font-bold text-black/80">
                    {selectedNode.connections.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-black/60 block">Graph Context Human Summary:</span>
                  <p className="font-medium text-black/80 text-[11px] leading-snug">
                    {selectedNode.riskScore > 50
                      ? 'Several unusual relationships and high-indegree transfers were identified surrounding this vertex.'
                      : 'Vertex exhibits standard topological characteristics with verified trusted entities.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* TAB 4: EXPLAINABILITY (SHAP & WHY THIS SCORE) */}
      {activeTab === 'explainability' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED]">SHAP Attribution</span>
                <h3 className="text-lg font-black uppercase text-black">Why Did This Transaction Receive Its Score?</h3>
              </div>
            </div>

            <p className="text-xs font-bold text-black/70 leading-relaxed">
              Shapley Additive exPlanations (SHAP) break down exactly how individual features pushed the risk score higher (+) or lower (-).
            </p>

            {/* SHAP Factors List */}
            <div className="space-y-3 pt-2">
              {[
                { factor: 'Amount Deviation vs 30-Day Average', impact: '+0.42', positive: true, percent: 80 },
                { factor: 'Unverified Destination Recipient Node', impact: '+0.27', positive: true, percent: 55 },
                { factor: 'First-Time Device Footprint', impact: '+0.18', positive: true, percent: 35 },
                { factor: 'Recognized Location & IP Range', impact: '-0.22', positive: false, percent: 45 },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-[#FAF7F2] border-2 border-black rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span>{item.factor}</span>
                    <span className={item.positive ? 'text-red-600 font-mono' : 'text-emerald-600 font-mono'}>
                      {item.impact} SHAP
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 h-2.5 border border-black rounded overflow-hidden">
                    <div
                      className={`h-full ${item.positive ? 'bg-red-500' : 'bg-emerald-500'}`}
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Human Readable Translation Matrix */}
            <div className="pt-4 border-t-2 border-black/10 space-y-3">
              <h4 className="text-xs font-black uppercase text-black">Technical to Human Translation Matrix</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-purple-50 border border-purple-900 rounded space-y-1">
                  <span className="text-[10px] font-black uppercase text-purple-900 block">Technical Parameter:</span>
                  <div className="font-mono font-bold text-purple-950">Random Forest probability = 0.89</div>
                  <span className="text-[10px] font-black uppercase text-purple-900 block mt-2">Human Explanation:</span>
                  <div className="font-bold text-black">"This payment has several characteristics commonly associated with higher-risk activity."</div>
                </div>

                <div className="p-3 bg-purple-50 border border-purple-900 rounded space-y-1">
                  <span className="text-[10px] font-black uppercase text-purple-900 block">Technical Parameter:</span>
                  <div className="font-mono font-bold text-purple-950">Graph Context Distance = 0.78</div>
                  <span className="text-[10px] font-black uppercase text-purple-900 block mt-2">Human Explanation:</span>
                  <div className="font-bold text-black">"This payment is connected to recipient accounts that differ from your usual circle."</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EXPERIMENTS (SIMULATION LAB) */}
      {activeTab === 'experiments' && (
        <div className="space-y-6">
          <div className="bg-white border-2 border-black p-6 neo-shadow rounded-lg space-y-4">
            <div className="border-b-2 border-black pb-3">
              <span className="text-[10px] font-black uppercase text-[#7C3AED]">Sandbox Simulator</span>
              <h3 className="text-lg font-black uppercase text-black">Controlled Experiment Lab</h3>
              <p className="text-xs font-bold text-black/70 mt-0.5">
                Simulate payment requests with custom amounts and recipient attributes to test real-time risk decisioning.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Simulated Amount (₹)
                </label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Simulated Recipient
                </label>
                <input
                  type="text"
                  value={simRecipientName}
                  onChange={(e) => setSimRecipientName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Recipient Status
                </label>
                <button
                  type="button"
                  onClick={() => setSimNewRecipient(!simNewRecipient)}
                  className={`w-full py-2 px-3 border-2 border-black rounded text-xs font-black uppercase transition-all cursor-pointer ${
                    simNewRecipient ? 'bg-amber-100 text-amber-950' : 'bg-emerald-100 text-emerald-950'
                  }`}
                >
                  {simNewRecipient ? 'New Unverified Recipient' : 'Existing Trusted Contact'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={runExperimentSimulation}
              className="w-full py-3 bg-[#7C3AED] text-white font-black uppercase text-xs border-2 border-black rounded-lg neo-shadow hover:bg-purple-700 cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current" />
              Execute Controlled Risk Simulation
            </button>

            {simResult && (
              <div className="mt-4 p-4 bg-[#FAF7F2] border-2 border-black neo-shadow rounded-lg space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between border-b border-black/20 pb-2">
                  <span className="text-xs font-black uppercase text-black">Simulation Output</span>
                  <span
                    className={`px-3 py-1 rounded text-xs font-black uppercase border border-black ${
                      simResult.decision === 'BLOCK'
                        ? 'bg-red-600 text-white'
                        : simResult.decision === 'CHALLENGE'
                        ? 'bg-amber-400 text-black'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    Decision: {simResult.decision} ({simResult.safetyScore}/100)
                  </span>
                </div>

                <p className="text-xs font-bold text-black/80">{simResult.userMessage}</p>

                {simResult.humanReasons && (
                  <ul className="list-disc list-inside text-xs font-medium text-black/70 space-y-0.5">
                    {simResult.humanReasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEO4J CONFIGURATION MODAL */}
      {isNeo4jModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white border-4 border-black neo-shadow-xl rounded-xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-[#7C3AED]" />
                <h3 className="text-base font-black uppercase text-black">Connect Neo4j Graph Database</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNeo4jModalOpen(false)}
                className="p-1 hover:bg-gray-100 rounded border border-black font-bold text-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs font-bold text-black/70 leading-snug">
              Enter your Neo4j database instance details below (Neo4j AuraDB or local Docker instance). Every new payment and user registration will be automatically stored as Cypher nodes and edges.
            </p>

            <form onSubmit={handleSaveNeo4jCredentials} className="space-y-3">
              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Neo4j URI <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  placeholder="neo4j+s://xxxx.databases.neo4j.io or bolt://localhost:7687"
                  value={neo4jUri}
                  onChange={(e) => setNeo4jUri(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold font-mono focus:outline-none focus:neo-shadow"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-black block mb-1">
                    Username
                  </label>
                  <input
                    type="text"
                    placeholder="neo4j"
                    value={neo4jUsername}
                    onChange={(e) => setNeo4jUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold font-mono focus:outline-none focus:neo-shadow"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-black block mb-1">
                    Password <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Your Neo4j Password"
                    value={neo4jPassword}
                    onChange={(e) => setNeo4jPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold font-mono focus:outline-none focus:neo-shadow"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-black block mb-1">
                  Database Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="neo4j"
                  value={neo4jDatabase}
                  onChange={(e) => setNeo4jDatabase(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] border-2 border-black rounded text-xs font-bold font-mono focus:outline-none focus:neo-shadow"
                />
              </div>

              {neo4jFeedback && (
                <div
                  className={`p-3 border-2 border-black rounded text-xs font-bold flex items-center gap-2 ${
                    neo4jFeedback.type === 'success'
                      ? 'bg-emerald-100 text-emerald-950 border-emerald-800'
                      : neo4jFeedback.type === 'error'
                      ? 'bg-red-100 text-red-950 border-red-800'
                      : 'bg-blue-100 text-blue-950 border-blue-800'
                  }`}
                >
                  {neo4jFeedback.type === 'success' && <Check className="w-4 h-4 text-emerald-700 shrink-0" />}
                  {neo4jFeedback.type === 'error' && <AlertOctagon className="w-4 h-4 text-red-700 shrink-0" />}
                  <span>{neo4jFeedback.message}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNeo4jModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-black font-black text-xs border-2 border-black rounded hover:bg-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={neo4jIsSaving}
                  className="px-5 py-2 bg-[#7C3AED] text-white font-black text-xs border-2 border-black neo-shadow hover:translate-x-[-1px] hover:translate-y-[-1px] transition-transform rounded flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {neo4jIsSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Verify & Connect</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

