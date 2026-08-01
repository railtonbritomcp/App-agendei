import React, { useState } from 'react';
import { CandidateConfig } from '../types';
import { Shield, CheckCircle, Lock, User, Hash, Key } from 'lucide-react';

interface ActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CandidateConfig;
  onSave: (config: CandidateConfig) => void;
  isFirstRun?: boolean;
}

export const ActivationModal: React.FC<ActivationModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
  isFirstRun = false
}) => {
  const [candidateName, setCandidateName] = useState(config.candidateName || '');
  const [ballotNumber, setBallotNumber] = useState(config.ballotNumber || '');
  const [activationCode, setActivationCode] = useState(config.activationCode || '');
  const [office, setOffice] = useState(config.office || 'Deputado Estadual');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setError('Por favor, informe o Nome do Candidato.');
      return;
    }
    if (!ballotNumber.trim()) {
      setError('Por favor, informe o Número da Urna.');
      return;
    }
    if (!activationCode.trim()) {
      setError('Por favor, informe o Código de Ativação.');
      return;
    }

    onSave({
      candidateName: candidateName.toUpperCase().trim(),
      ballotNumber: ballotNumber.trim(),
      activationCode: activationCode.trim(),
      activated: true,
      office: office.trim()
    });
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">GEO SCAN</h2>
            <p className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Ativação Comercial de Campanha</p>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Para iniciar o monitoramento territorial e cruzamento de metas Macro x Micro, informe abaixo as credenciais oficiais da campanha.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-indigo-400" />
              Nome do Candidato
            </label>
            <input
              type="text"
              required
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Ex: DR. CARLOS SILVA"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <Hash size={14} className="text-indigo-400" />
                Número da Urna
              </label>
              <input
                type="text"
                required
                value={ballotNumber}
                onChange={(e) => setBallotNumber(e.target.value)}
                placeholder="Ex: 45123"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-semibold font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Cargo / Cargo Alvo
              </label>
              <input
                type="text"
                value={office}
                onChange={(e) => setOffice(e.target.value)}
                placeholder="Ex: Deputado Estadual"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Key size={14} className="text-indigo-400" />
              Código de Ativação
            </label>
            <input
              type="password"
              required
              value={activationCode}
              onChange={(e) => setActivationCode(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-mono"
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3">
            {!isFirstRun && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-all"
              >
                Cancelar
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Ativar Sistema
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
