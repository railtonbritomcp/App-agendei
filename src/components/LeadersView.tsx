import React, { useState } from 'react';
import { Leader, Municipality, Neighborhood, UF, Supporter } from '../types';
import { Users, Plus, Phone, MapPin, Target, Edit2, Trash2, Search, Award } from 'lucide-react';

interface LeadersViewProps {
  leaders: Leader[];
  onAddLeader: (leader: Omit<Leader, 'id' | 'createdAt'>) => void;
  onUpdateLeader: (id: string, leader: Partial<Leader>) => void;
  onDeleteLeader: (id: string) => void;
  municipalities: Municipality[];
  neighborhoods: Neighborhood[];
  ufs: UF[];
  supporters: Supporter[];
}

export const LeadersView: React.FC<LeadersViewProps> = ({
  leaders,
  onAddLeader,
  onUpdateLeader,
  onDeleteLeader,
  municipalities,
  neighborhoods,
  ufs,
  supporters
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [uf, setUf] = useState('SP');
  const [municipalityId, setMunicipalityId] = useState(municipalities[0]?.id || '');
  const [neighborhoodId, setNeighborhoodId] = useState(neighborhoods[0]?.id || '');
  const [macroGoal, setMacroGoal] = useState<number>(100);
  const [notes, setNotes] = useState('');

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setUf('SP');
    setMunicipalityId(municipalities[0]?.id || '');
    setNeighborhoodId(neighborhoods[0]?.id || '');
    setMacroGoal(100);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (leader: Leader) => {
    setEditingId(leader.id);
    setName(leader.name);
    setPhone(leader.phone);
    setUf(leader.uf);
    setMunicipalityId(leader.municipalityId);
    setNeighborhoodId(leader.neighborhoodId);
    setMacroGoal(leader.macroGoal);
    setNotes(leader.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      onUpdateLeader(editingId, {
        name,
        phone,
        uf,
        municipalityId,
        neighborhoodId,
        macroGoal: Number(macroGoal),
        notes
      });
    } else {
      onAddLeader({
        name,
        phone,
        uf,
        municipalityId,
        neighborhoodId,
        macroGoal: Number(macroGoal),
        notes
      });
    }
    setIsModalOpen(false);
  };

  const filteredLeaders = leaders.filter(l => 
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    l.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">
              Nível Estratégico
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Gestão de Lideranças (Meta Macro)</h2>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie os articuladores e cabos eleitorais responsáveis pelas metas de votos nos territórios.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} />
          Nova Liderança
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3 bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
        <Search size={18} className="text-slate-400 ml-2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar liderança por nome ou telefone..."
          className="w-full bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none"
        />
      </div>

      {/* Leaders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeaders.map(lead => {
          const leadSupporters = supporters.filter(s => s.leaderId === lead.id);
          const sumMicro = leadSupporters.reduce((acc, s) => acc + s.microGoal, 0);
          const mun = municipalities.find(m => m.id === lead.municipalityId)?.name || 'Município';
          const nei = neighborhoods.find(n => n.id === lead.neighborhoodId)?.name || 'Bairro';
          const progress = lead.macroGoal > 0 ? Math.min(Math.round((sumMicro / lead.macroGoal) * 100), 100) : 0;

          return (
            <div key={lead.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-indigo-500/50 transition-all group">
              <div>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(lead)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => onDeleteLeader(lead.id)}
                      className="p-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base font-bold text-white mb-1">{lead.name}</h3>
                <p className="text-xs text-indigo-400 font-medium flex items-center gap-1 mb-3">
                  <Phone size={12} />
                  {lead.phone}
                </p>

                <div className="flex items-center gap-2 text-xs text-slate-400 mb-4 bg-slate-950/50 p-2.5 rounded-xl border border-slate-800/80">
                  <MapPin size={14} className="text-indigo-400 shrink-0" />
                  <span className="truncate">{mun} • {nei} ({lead.uf})</span>
                </div>

                {lead.notes && (
                  <p className="text-xs text-slate-400 mb-4 italic line-clamp-2">
                    "{lead.notes}"
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-slate-400">Meta Macro vs Micro:</span>
                  <span className="font-bold text-white">{sumMicro} / {lead.macroGoal} ({progress}%)</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Apoiadores vinculados:</span>
                  <span className="font-bold text-indigo-300">{leadSupporters.length} cadastrados</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <h3 className="text-xl font-black text-white mb-4">
              {editingId ? 'Editar Liderança' : 'Nova Liderança (Meta Macro)'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Silva"
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
                    placeholder="(11) 98888-7777"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Meta Macro (Votos)</label>
                  <input
                    type="number"
                    required
                    value={macroGoal}
                    onChange={(e) => setMacroGoal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-bold text-indigo-400"
                  />
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Observações Estratégicas</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Detalhes sobre a atuação da liderança..."
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
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30"
                >
                  Salvar Liderança
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
