import React, { useState, useEffect } from 'react';
import { 
  CandidateConfig, 
  UF, 
  Municipality, 
  Neighborhood, 
  Leader, 
  Supporter 
} from './types';
import { 
  INITIAL_UFS, 
  INITIAL_MUNICIPALITIES, 
  INITIAL_NEIGHBORHOODS, 
  INITIAL_LEADERS, 
  INITIAL_SUPPORTERS 
} from './data/mockData';
import { Sidebar } from './components/Sidebar';
import { ActivationModal } from './components/ActivationModal';
import { DashboardView } from './components/DashboardView';
import { LeadersView } from './components/LeadersView';
import { SupportersView } from './components/SupportersView';
import { TerritoriesView } from './components/TerritoriesView';
import { ReportsView } from './components/ReportsView';
import { Menu, Shield, User, MapPin } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [isActivationOpen, setIsActivationOpen] = useState<boolean>(false);

  // Candidate Config State
  const [candidateConfig, setCandidateConfig] = useState<CandidateConfig>(() => {
    try {
      const saved = localStorage.getItem('geoscan_candidate_config');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      candidateName: 'DR. CARLOS SILVA',
      ballotNumber: '45123',
      activationCode: 'GEO-2026-SP',
      activated: true,
      office: 'Deputado Estadual'
    };
  });

  // Leaders State
  const [leaders, setLeaders] = useState<Leader[]>(() => {
    try {
      const saved = localStorage.getItem('geoscan_leaders');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_LEADERS;
  });

  // Supporters State
  const [supporters, setSupporters] = useState<Supporter[]>(() => {
    try {
      const saved = localStorage.getItem('geoscan_supporters');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return INITIAL_SUPPORTERS;
  });

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('geoscan_candidate_config', JSON.stringify(candidateConfig));
  }, [candidateConfig]);

  useEffect(() => {
    localStorage.setItem('geoscan_leaders', JSON.stringify(leaders));
  }, [leaders]);

  useEffect(() => {
    localStorage.setItem('geoscan_supporters', JSON.stringify(supporters));
  }, [supporters]);

  // Handlers for Leaders
  const handleAddLeader = (newLead: Omit<Leader, 'id' | 'createdAt'>) => {
    const item: Leader = {
      ...newLead,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setLeaders(prev => [item, ...prev]);
  };

  const handleUpdateLeader = (id: string, updated: Partial<Leader>) => {
    setLeaders(prev => prev.map(l => l.id === id ? { ...l, ...updated } : l));
  };

  const handleDeleteLeader = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta liderança? Os apoiadores vinculados ficarão sem liderança associada.')) {
      setLeaders(prev => prev.filter(l => l.id !== id));
    }
  };

  // Handlers for Supporters
  const handleAddSupporter = (newSup: Omit<Supporter, 'id' | 'createdAt'>) => {
    const item: Supporter = {
      ...newSup,
      id: Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setSupporters(prev => [item, ...prev]);
  };

  const handleUpdateSupporter = (id: string, updated: Partial<Supporter>) => {
    setSupporters(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
  };

  const handleDeleteSupporter = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este apoiador?')) {
      setSupporters(prev => prev.filter(s => s.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans selection:bg-indigo-500 selection:text-white">
      {/* Sidebar Desktop & Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        candidateConfig={candidateConfig}
        onOpenActivation={() => setIsActivationOpen(true)}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-72 min-w-0">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
            >
              <Menu size={20} />
            </button>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                GEO SCAN <span className="text-indigo-400 font-normal">| Inteligência Territorial</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-xs">
              <User size={14} className="text-indigo-400" />
              <span className="font-bold text-white">{candidateConfig.candidateName}</span>
              <span className="text-slate-400">#{candidateConfig.ballotNumber}</span>
            </div>
            <button
              onClick={() => setIsActivationOpen(true)}
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
            >
              <Shield size={14} />
              Ativação
            </button>
          </div>
        </header>

        {/* Content View Container */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              ufs={INITIAL_UFS}
              municipalities={INITIAL_MUNICIPALITIES}
              neighborhoods={INITIAL_NEIGHBORHOODS}
              leaders={leaders}
              supporters={supporters}
            />
          )}

          {activeTab === 'leaders' && (
            <LeadersView
              leaders={leaders}
              onAddLeader={handleAddLeader}
              onUpdateLeader={handleUpdateLeader}
              onDeleteLeader={handleDeleteLeader}
              municipalities={INITIAL_MUNICIPALITIES}
              neighborhoods={INITIAL_NEIGHBORHOODS}
              ufs={INITIAL_UFS}
              supporters={supporters}
            />
          )}

          {activeTab === 'supporters' && (
            <SupportersView
              supporters={supporters}
              leaders={leaders}
              onAddSupporter={handleAddSupporter}
              onUpdateSupporter={handleUpdateSupporter}
              onDeleteSupporter={handleDeleteSupporter}
              municipalities={INITIAL_MUNICIPALITIES}
              neighborhoods={INITIAL_NEIGHBORHOODS}
              ufs={INITIAL_UFS}
            />
          )}

          {activeTab === 'territories' && (
            <TerritoriesView
              ufs={INITIAL_UFS}
              municipalities={INITIAL_MUNICIPALITIES}
              neighborhoods={INITIAL_NEIGHBORHOODS}
              leaders={leaders}
              supporters={supporters}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              candidateConfig={candidateConfig}
              leaders={leaders}
              supporters={supporters}
            />
          )}
        </main>
      </div>

      {/* Activation Modal */}
      <ActivationModal
        isOpen={isActivationOpen}
        onClose={() => setIsActivationOpen(false)}
        config={candidateConfig}
        onSave={(newCfg) => setCandidateConfig(newCfg)}
      />
    </div>
  );
}
export default App;
