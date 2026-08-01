import React, { useState, useMemo } from 'react';
import { 
  Leader, 
  Supporter, 
  UF, 
  Municipality, 
  Neighborhood, 
  FilterState 
} from '../types';
import { 
  Users, 
  UserCheck, 
  Target, 
  TrendingUp, 
  MapPin, 
  Filter, 
  Award, 
  PieChart as PieIcon, 
  BarChart2, 
  CheckCircle2, 
  Clock, 
  AlertCircle 
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';

interface DashboardViewProps {
  ufs: UF[];
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  leaders: Leader[];
  supporters: Supporter[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  ufs,
  municipalities,
  neighborhoods,
  leaders,
  supporters
}) => {
  const [filters, setFilters] = useState<FilterState>({
    uf: 'ALL',
    municipalityId: 'ALL',
    neighborhoodId: 'ALL',
    leaderId: 'ALL',
    status: 'ALL',
    search: ''
  });

  // Cascading lists based on filters
  const filteredMunicipalities = useMemo(() => {
    if (filters.uf === 'ALL') return municipalities;
    return municipalities.filter(m => m.ufId === filters.uf.toLowerCase() || m.ufId === filters.uf);
  }, [municipalities, filters.uf]);

  const filteredNeighborhoods = useMemo(() => {
    if (filters.municipalityId === 'ALL') return neighborhoods;
    return neighborhoods.filter(n => n.municipalityId === filters.municipalityId);
  }, [neighborhoods, filters.municipalityId]);

  const filteredLeaders = useMemo(() => {
    return leaders.filter(l => {
      if (filters.uf !== 'ALL' && l.uf !== filters.uf) return false;
      if (filters.municipalityId !== 'ALL' && l.municipalityId !== filters.municipalityId) return false;
      if (filters.neighborhoodId !== 'ALL' && l.neighborhoodId !== filters.neighborhoodId) return false;
      return true;
    });
  }, [leaders, filters]);

  // Filtered supporters
  const filteredSupporters = useMemo(() => {
    return supporters.filter(s => {
      if (filters.uf !== 'ALL' && s.uf !== filters.uf) return false;
      if (filters.municipalityId !== 'ALL' && s.municipalityId !== filters.municipalityId) return false;
      if (filters.neighborhoodId !== 'ALL' && s.neighborhoodId !== filters.neighborhoodId) return false;
      if (filters.leaderId !== 'ALL' && s.leaderId !== filters.leaderId) return false;
      if (filters.status !== 'ALL' && s.status !== filters.status) return false;
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase();
        return s.name.toLowerCase().includes(q) || s.phone.includes(q);
      }
      return true;
    });
  }, [supporters, filters]);

  // Calculations for Macro vs Micro
  const totalMacroGoal = useMemo(() => {
    return filteredLeaders.reduce((acc, l) => acc + l.macroGoal, 0);
  }, [filteredLeaders]);

  const totalMicroGoal = useMemo(() => {
    return filteredSupporters.reduce((acc, s) => acc + s.microGoal, 0);
  }, [filteredSupporters]);

  const conversionRate = totalMacroGoal > 0 ? ((totalMicroGoal / totalMacroGoal) * 100).toFixed(1) : '0';

  const statusCounts = useMemo(() => {
    const counts = { Confirmado: 0, Pendente: 0, Indeciso: 0, Convertido: 0 };
    filteredSupporters.forEach(s => {
      if (counts[s.status] !== undefined) {
        counts[s.status] += s.microGoal;
      }
    });
    return [
      { name: 'Confirmado', value: counts.Confirmado, color: '#10b981' },
      { name: 'Convertido', value: counts.Convertido, color: '#6366f1' },
      { name: 'Pendente', value: counts.Pendente, color: '#f59e0b' },
      { name: 'Indeciso', value: counts.Indeciso, color: '#ef4444' }
    ];
  }, [filteredSupporters]);

  // Leader Performance Data for Bar Chart
  const leaderPerformanceData = useMemo(() => {
    return filteredLeaders.map(lead => {
      const leadSupporters = filteredSupporters.filter(s => s.leaderId === lead.id);
      const sumMicro = leadSupporters.reduce((acc, s) => acc + s.microGoal, 0);
      return {
        name: lead.name.split(' ')[0],
        Macro: lead.macroGoal,
        Micro: sumMicro
      };
    });
  }, [filteredLeaders, filteredSupporters]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
                Dashboard Executivo
              </span>
              <span className="text-slate-400 text-xs">• Cruzamento Macro x Micro</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Inteligência Territorial de Campanha
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Monitore o compromisso de votos (Meta Micro dos Apoiadores) em relação às diretrizes estratégicas das Lideranças (Meta Macro) com isolamento completo por filtros em cascata.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar (UF ➔ Município ➔ Bairro ➔ Liderança) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-wider text-indigo-400">
          <Filter size={16} />
          Filtros em Cascata de Território
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* UF */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estado (UF)</label>
            <select
              value={filters.uf}
              onChange={(e) => setFilters(prev => ({ ...prev, uf: e.target.value, municipalityId: 'ALL', neighborhoodId: 'ALL', leaderId: 'ALL' }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">Todas as UFs</option>
              {ufs.map(uf => (
                <option key={uf.id} value={uf.code}>{uf.name} ({uf.code})</option>
              ))}
            </select>
          </div>

          {/* Município */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Município</label>
            <select
              value={filters.municipalityId}
              onChange={(e) => setFilters(prev => ({ ...prev, municipalityId: e.target.value, neighborhoodId: 'ALL', leaderId: 'ALL' }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">Todos os Municípios</option>
              {filteredMunicipalities.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Bairro */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bairro</label>
            <select
              value={filters.neighborhoodId}
              onChange={(e) => setFilters(prev => ({ ...prev, neighborhoodId: e.target.value, leaderId: 'ALL' }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">Todos os Bairros</option>
              {filteredNeighborhoods.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          {/* Liderança */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Liderança</label>
            <select
              value={filters.leaderId}
              onChange={(e) => setFilters(prev => ({ ...prev, leaderId: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">Todas as Lideranças</option>
              {filteredLeaders.map(l => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Status Apoiador */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status Voto</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="ALL">Todos os Status</option>
              <option value="Confirmado">Confirmado</option>
              <option value="Convertido">Convertido</option>
              <option value="Pendente">Pendente</option>
              <option value="Indeciso">Indeciso</option>
            </select>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Macro Total</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
              <Target size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{totalMacroGoal.toLocaleString()} <span className="text-xs font-medium text-slate-400">votos</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Soma das metas atribuídas às lideranças</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Meta Micro (Apoiadores)</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <UserCheck size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{totalMicroGoal.toLocaleString()} <span className="text-xs font-medium text-slate-400">compromissos</span></p>
          <p className="text-[11px] text-slate-500 mt-1">Soma dos compromissos dos apoiadores</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Índice de Atingimento</span>
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{conversionRate}%</p>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(Number(conversionRate), 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Ativa</span>
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-3xl font-black text-white">{filteredSupporters.length} <span className="text-xs font-medium text-slate-400">cadastros</span></p>
          <p className="text-[11px] text-slate-500 mt-1">{filteredLeaders.length} lideranças articulando</p>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart: Meta Macro vs Meta Micro por Liderança */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-base text-white">Comparativo: Meta Macro vs Meta Micro</h3>
              <p className="text-xs text-slate-400">Desempenho por Liderança no território selecionado</p>
            </div>
            <BarChart2 size={20} className="text-indigo-400" />
          </div>

          <div className="h-72 w-full">
            {leaderPerformanceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={leaderPerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Macro" name="Meta Macro (Liderança)" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Micro" name="Meta Micro (Apoiadores)" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                Nenhum dado encontrado com os filtros atuais.
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart: Status dos Apoiadores */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-white">Status do Eleitorado</h3>
              <PieIcon size={20} className="text-emerald-400" />
            </div>
            <p className="text-xs text-slate-400 mb-4">Volume de votos por status de compromisso</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusCounts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '1rem', color: '#fff' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-800">
            {statusCounts.map(st => (
              <div key={st.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: st.color }}></span>
                <span className="text-xs text-slate-300 font-medium">{st.name}: <strong className="text-white">{st.value}</strong></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
