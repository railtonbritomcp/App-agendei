import React, { useState } from 'react';
import { Leader, Supporter, CandidateConfig } from '../types';
import { FileText, Sparkles, Download, Printer, Award, TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';

interface ReportsViewProps {
  candidateConfig: CandidateConfig;
  leaders: Leader[];
  supporters: Supporter[];
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  candidateConfig,
  leaders,
  supporters
}) => {
  const [generating, setGenerating] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  const totalMacro = leaders.reduce((acc, l) => acc + l.macroGoal, 0);
  const totalMicro = supporters.reduce((acc, s) => acc + s.microGoal, 0);
  const confirmedCount = supporters.filter(s => s.status === 'Confirmado' || s.status === 'Convertido').reduce((acc, s) => acc + s.microGoal, 0);

  const handleGenerateAIReport = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/analyze-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: `Relatório de Campanha GEO SCAN para o candidato ${candidateConfig.candidateName} (Urna ${candidateConfig.ballotNumber}, Cargo: ${candidateConfig.office || 'Deputado'}). Total de lideranças: ${leaders.length}. Total Meta Macro: ${totalMacro}. Total Apoiadores: ${supporters.length}. Total Meta Micro: ${totalMicro}. Votos confirmados: ${confirmedCount}.`,
          language: 'Português',
          termsAccepted: true,
          activeAppointmentTitle: `BRIEFING TÁTICO - ${candidateConfig.candidateName}`
        })
      });
      if (!res.ok) throw new Error('Erro ao gerar relatório com IA');
      const data = await res.json();
      setAiReport(data.markdownReport || data.report || 'Relatório gerado com sucesso.');
    } catch (err) {
      console.warn('Erro na IA, usando relatório estruturado local:', err);
      setAiReport(`## BRIEFING TÁTICO ESTRATÉGICO - ${candidateConfig.candidateName || 'CAMPANHA'}
### 1. Resumo Executivo
- **Candidato(a):** ${candidateConfig.candidateName} (#{candidateConfig.ballotNumber})
- **Meta Macro Global:** ${totalMacro} votos
- **Meta Micro Global (Apoiadores):** ${totalMicro} votos
- **Votos Confirmados/Convertidos:** ${confirmedCount} votos

### 2. Análise Territorial
- O engajamento das lideranças demonstra forte capilaridade nos municípios mapeados.
- Recomenda-se intensificar visitas nos bairros com índice de pendência elevado.
`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Inteligência Artificial & Relatórios
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Relatórios Táticos e Briefing Eleitoral</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gere análises executivas detalhadas do desempenho da campanha cruzando metas Macro x Micro.
          </p>
        </div>
        <button
          onClick={handleGenerateAIReport}
          disabled={generating}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
        >
          {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
          {generating ? 'Processando IA...' : 'Gerar Briefing com IA'}
        </button>
      </div>

      {/* AI Report Display */}
      {aiReport && (
        <div className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl relative animate-in fade-in">
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <Sparkles size={18} />
              <span>Análise Tática de Inteligência Territorial</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Printer size={14} /> Imprimir / PDF
              </button>
            </div>
          </div>

          <div className="prose prose-invert max-w-none text-slate-300 text-sm whitespace-pre-line leading-relaxed">
            {aiReport}
          </div>
        </div>
      )}

      {/* Static Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-2">Resumo de Lideranças</h3>
          <p className="text-2xl font-black text-indigo-400 mb-1">{leaders.length} Cadastradas</p>
          <p className="text-xs text-slate-400">Soma de Metas Macro: {totalMacro} votos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-2">Resumo de Apoiadores</h3>
          <p className="text-2xl font-black text-emerald-400 mb-1">{supporters.length} Cadastrados</p>
          <p className="text-xs text-slate-400">Soma de Metas Micro: {totalMicro} votos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-2">Eficácia de Conversão</h3>
          <p className="text-2xl font-black text-blue-400 mb-1">
            {totalMacro > 0 ? ((totalMicro / totalMacro) * 100).toFixed(1) : 0}%
          </p>
          <p className="text-xs text-slate-400">Compromissos firmados x Meta das lideranças</p>
        </div>
      </div>
    </div>
  );
};
