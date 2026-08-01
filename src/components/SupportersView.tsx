import React, { useState } from 'react';
import { Supporter, Leader, Municipality, Neighborhood, UF } from '../types';
import { UserCheck, Plus, Phone, MapPin, Target, Edit2, Trash2, Search, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface SupportersViewProps {
  supporters: Supporter[];
  leaders: Leader[];
  onAddSupporter: (supporter: Omit<Supporter, 'id' | 'createdAt'>) => void;
  onUpdateSupporter: (id: string, supporter: Partial<Supporter>) => void;
  onDeleteSupporter: (id: string) => void;
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  ufs: UF[];
}

export const SupportersView: React.FC<SupportersViewProps> = ({
  supporters,
  leaders,
  onAddSupporter,
  onUpdateSupporter,
  onDeleteSupporter,
  municipalities,
  neighborhoods,
  ufs
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [uf, setUf] = useState('SP');
  const [municipalityId, setMunicipalityId] = useState(municipalities[0]?.id || '');
  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoods[0]?.id || '');
  const [leaderId, setLeaderId] = useState(leaders[0]?.id || '');
  const [microGoal, setMicroGoal] = useState<number>(5);
  const [status, setStatus] = useState<'Confirmado' | 'Pendente' | 'Indeciso' | 'Convertido'>('Confirmado');
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setUf('SP');
    setMunicipalityId(municipalities[0]?.id || '');
    setNeighborhoodId(neighborhoods[0]?.id || '');
    setLeaderId(leaders[0]?.id || '');
    setMicroGoal(5);
    setStatus('Confirmado');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sup: Supporter) => {
    setEditingId(sup.id);
    setName(sup.name);
    setPhone(sup.phone);
    setUf(sup.uf);
    setMunicipalityId(sup.municipalityId);
    setNeighborhoodId(sup.neighborhoodId);
    setLeaderId(sup.leaderId);
    setMicroGoal(sup.microGoal);
    setStatus(sup.status);
    setNotes(sup.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateSupporter(editingId, {
        name,
        phone,
        uf,
        municipalityId,
        neighborhoodId,
        leaderId,
        microGoal: Number(microGoal),
        status,
        notes
      });
    } else {
      onAddSupporter({
        name,
        phone,
        uf,
        municipalityId,
        neighborhoodId,
        leaderId,
        microGoal: Number(microGoal),
        status,
        notes
      });
    }
    setIsModalOpen(false);
  };

  const filteredSupporters = supporters.filter(s => {
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || s.phone.includes(q);
    }
    return true;
  });

  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'Confirmado':
        return <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase">Confirmado</span>;
      case 'Convertido':
        return <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold uppercase">Convertido</span>;
      case 'Pendente':
        return <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold uppercase">Pendente</span>;
      case 'Indeciso':
        return <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold uppercase">Indeciso</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Nível Operacional
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Gestão de Apoiadores (Meta Micro)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Controle de compromissos individuais de votos articulados por apoiadores vinculados às lideranças.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Novo Apoiador
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <div className="sm:col-span-2 flex items-center gap-2 bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome ou telefone do apoiador..."
            className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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

      {/* Supporters Table / Cards */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-950/50">
                <th className="p-4">Apoiador</th>
                <th className="p-4">Liderança Responsável</th>
                <th className="p-4">Território</th>
                <th className="p-4 text-center">Meta Micro</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {filteredSupporters.map(sup => {
                const lead = leaders.find(l => l.id === sup.leaderId)?.name || 'Sem liderança';
                const mun = municipalities.find(m => m.id === sup.municipalityId)?.name || '';
                const nei = neighborhoods.find(n => n.id === sup.neighborhoodId)?.name || '';

                return (
                  <tr key={sup.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-white text-sm">{sup.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{sup.phone}</p>
                    </td>
                    <td className="p-4">
                      <span className="font-semibold text-indigo-300">{lead}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <MapPin size={13} className="text-indigo-400 shrink-0" />
                        <span className="truncate max-w-[200px]">{mun} / {nei} ({sup.uf})</span>
                      </div>
                    </td>
                    <td className="p-4 text-center font-black text-emerald-400 text-sm">
                      {sup.microGoal} <span className="text-[10px] font-normal text-slate-400">votos</span>
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(sup.status)}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(sup)}
                          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => onDeleteSupporter(sup.id)}
                          className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredSupporters.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-xs">
              Nenhum apoiador encontrado.
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">
              {editingId ? 'Editar Apoiador' : 'Novo Apoiador (Meta Micro)'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome do Apoiador</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Ana Paula"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 97777-6666"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meta Micro (Votos Compromisso)</label>
                  <input
                    type="number"
                    required
                    value={microGoal}
                    onChange={(e) => setMicroGoal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Liderança Responsável</label>
                  <select
                    value={leaderId}
                    onChange={(e) => setLeaderId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {leaders.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status do Compromisso</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="Confirmado">Confirmado</option>
                    <option value="Convertido">Convertido</option>
                    <option value="Pendente">Pendente</option>
                    <option value="Indeciso">Indeciso</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">UF</label>
                  <select
                    value={uf}
                    onChange={(e) => setUf(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {ufs.map(u => (
                      <option key={u.id} value={u.code}>{u.code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Município</label>
                  <select
                    value={municipalityId}
                    onChange={(e) => setMunicipalityId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {municipalities.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bairro</label>
                  <select
                    value={neighborhoodId}
                    onChange={(e) => setNeighborhoodId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {neighborhoods.map(n => (
                      <option key={n.id} value={n.id}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas sobre o eleitor..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                ></textarea>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/30"
                >
                  Salvar Apoiador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
