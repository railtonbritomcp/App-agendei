import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  MapPin, 
  FileText, 
  Settings, 
  ShieldAlert, 
  Menu, 
  X,
  LogOut,
  BarChart3
} from 'lucide-react';
import { CandidateConfig } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  candidateConfig: CandidateConfig;
  onOpenActivation: () => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  candidateConfig,
  onOpenActivation,
  mobileOpen,
  setMobileOpen
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel Territorial', icon: LayoutDashboard },
    { id: 'leaders', label: 'Lideranças (Macro)', icon: Users },
    { id: 'supporters', label: 'Apoiadores (Micro)', icon: UserCheck },
    { id: 'territories', label: 'Territórios & Cascata', icon: MapPin },
    { id: 'reports', label: 'Relatórios & Inteligência', icon: BarChart3 }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 font-black text-white text-lg tracking-wider">
              GS
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-wider bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                GEO SCAN
              </h1>
              <p className="text-[10px] uppercase font-semibold text-indigo-400 tracking-widest">
                Inteligência Territorial
              </p>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Candidate Profile Widget */}
        <div className="p-4 m-4 bg-slate-800/60 border border-slate-700/60 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sistema Ativo
            </span>
            <button 
              onClick={onOpenActivation}
              className="text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-700 px-2 py-1 rounded-md transition-all"
            >
              Configurar
            </button>
          </div>
          <div className="space-y-1">
            <p className="font-bold text-sm text-white truncate">
              {candidateConfig.candidateName || 'Candidato(a) não definido'}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Urna: <strong className="text-indigo-300">#{candidateConfig.ballotNumber || '00000'}</strong></span>
              <span className="truncate max-w-[100px] text-slate-400">{candidateConfig.office || 'Campanha'}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">
            Módulos Operacionais
          </p>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }
                `}
              >
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>v2.6 Enterprise</span>
          <span className="text-emerald-400 font-mono">Secure SSL</span>
        </div>
      </aside>
    </>
  );
};
