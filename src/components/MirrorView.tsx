import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { 
  NotebookPen, Sparkles, Clock, Calendar as CalendarIcon, 
  ChevronLeft, ChevronRight, Info, RefreshCw, LayoutGrid, List, FileText,
  Home, Settings, Share2
} from 'lucide-react';

const RarbCodingLogo = () => (
  <div className="flex flex-col items-center opacity-40 hover:opacity-100 transition-opacity pt-24 pb-24 w-full mt-auto">
    <div className="flex items-center space-x-3 group transform scale-75 origin-top">
      <svg className="w-12 h-12 transition-transform duration-300 group-hover:scale-105" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 12 L10 88 L52 88 C72 88 84 74 84 50 C84 26 72 12 52 12 Z" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinejoin="round" />
        <path d="M17 42 C12 42 12 49 8 50 C12 51 12 58 17 58" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
        <path d="M30 64 L30 36 L54 36 C64 36 68 42 68 49 C68 56 61 60 52 60 L30 60" fill="none" stroke="#00F2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M48 58 L72 90 L108 34" fill="none" stroke="#00F2FE" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <polygon points="108,24 94,40 116,44" fill="#FFFFFF" />
      </svg>
      <div className="flex flex-col text-left">
        <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.3em] mb-0.5">Desenvolvido por</span>
        <span className="text-xl font-extrabold tracking-wider font-mono text-[var(--text-main)] leading-none">
          Rar<span className="text-[#00F2FE]">b</span><span className="relative inline-block border-b-2 border-[#00F2FE] pb-0.5">_CODING</span>
        </span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-[var(--text-muted)] font-mono font-semibold mt-1">Software Development</span>
      </div>
    </div>
  </div>
);

const MirrorView: React.FC = () => {
  const { mirrorId } = useParams<{ mirrorId: string }>();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('home');

  useEffect(() => {
    console.log("MirrorView: Tentando conectar ao mirrorId:", mirrorId);
    if (!mirrorId) {
      setError("ID de espelhamento não fornecido.");
      setLoading(false);
      return;
    }

    try {
      const q = query(
        collection(db, 'appointments'),
        where('mirrorId', '==', mirrorId.trim())
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log(`MirrorView: ${snapshot.size} compromissos recebidos.`);
        const apps = snapshot.docs.map(doc => {
          const data = doc.data();
          let start: Date;
          if (data.data_inicio?.toDate) {
            start = data.data_inicio.toDate();
          } else if (data.data_inicio instanceof Date) {
            start = data.data_inicio;
          } else if (typeof data.data_inicio === 'string') {
            start = new Date(data.data_inicio);
          } else if (data.data_inicio?.seconds) {
            start = new Date(data.data_inicio.seconds * 1000);
          } else {
            start = new Date();
          }

          return {
            id: doc.id,
            title: data.titulo || 'Sem Título',
            date: data.date_string || format(start, 'yyyy-MM-dd'),
            time: data.time_string || format(start, 'HH:mm'),
            duration: data.duration || 60,
            description: data.descricao,
            location: data.local,
            category: data.categoria,
            status: data.status,
            hasReport: data.hasReport || false,
            markdownReport: data.markdownReport,
            callAlert: data.callAlert || false,
            potentialConflict: data.potentialConflict || false,
            data_inicio_raw: start
          };
        });

        const sortedApps = apps.sort((a, b) => a.data_inicio_raw.getTime() - b.data_inicio_raw.getTime());
        console.log("MirrorView: Compromissos processados e ordenados.");
        setAppointments(sortedApps);
        setLoading(false);
        setError(null);
      }, (err) => {
        console.error("MirrorView: Erro de assinatura:", err);
        setError(`Erro de conexão: ${err.message}`);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (e: any) {
      console.error("MirrorView: Erro de configuração:", e);
      setError(`Erro de configuração: ${e.message}`);
      setLoading(false);
    }
  }, [mirrorId]);

  const filteredAppointments = useMemo(() => {
    const todayStr = format(selectedDate, 'yyyy-MM-dd');
    const now = new Date();

    if (activeTab === 'home') {
      return appointments.filter(app => app.date === todayStr);
    } else if (activeTab === 'agenda') {
      return appointments.filter(app => {
        const appDate = new Date(app.date + 'T' + app.time);
        return appDate >= now && !app.hasReport;
      });
    } else if (activeTab === 'reports') {
      return appointments.filter(app => app.hasReport);
    }
    return [];
  }, [appointments, selectedDate, activeTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-8">
        <RefreshCw size={48} className="text-[var(--brand)] animate-spin mb-4" />
        <p className="text-[var(--text-main)] font-bold uppercase tracking-widest animate-pulse">Sincronizando Agenda Executiva...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A1931] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border-2 border-red-500/50">
          <Info size={40} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-red-500 uppercase mb-2">Acesso Restrito</h2>
        <p className="text-[var(--text-muted)] uppercase text-xs tracking-widest">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A1931] flex flex-col text-[var(--text-main)] selection:bg-[var(--brand)] selection:text-black">
      <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 md:px-8 pb-24">
        {/* Header Oficial */}
        <header className="pt-8 pb-4 flex flex-col items-center relative w-full">
          <div className="mb-3 relative">
            <div className="w-[72px] h-[72px] bg-[var(--bg-card)] border-2 border-[var(--brand)] rounded-full flex items-center justify-center text-[var(--text-main)] shadow-[0_0_20px_rgba(253,216,53,0.4)]">
              <NotebookPen size={36} strokeWidth={2.5} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[var(--brand)] rounded-full flex items-center justify-center border-2 border-[#112240]">
              <Sparkles size={14} className="text-black" />
            </div>
          </div>
          
          <h1 className="text-[46px] sm:text-[58px] font-semibold logo-executive leading-none tracking-tighter text-center mt-2 text-[var(--brand)]">AGENDEI</h1>
          <p className="text-[10.5px] sm:text-[11.5px] font-semibold text-[var(--text-main)] uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 text-center">Visualização Executiva</p>
          
          <div className="mt-6 flex items-center gap-2 px-3 py-1 bg-[var(--brand)]/10 border border-[var(--brand)]/20 rounded-full">
            <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-[var(--brand)]">Espelhamento em Tempo Real</span>
          </div>
        </header>

        {/* Tabs Principais */}
        <div className="flex bg-[var(--bg-card)] p-1.5 rounded-2xl border border-[var(--border-subtle)] mb-8 shadow-inner relative z-10 mt-4">
          <button 
            onClick={() => setActiveTab('home')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-bold text-[10px] tracking-[0.2em] uppercase ${activeTab === 'home' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
            <Home size={14} strokeWidth={2.5} />
            HOJE
          </button>
          <button 
            onClick={() => setActiveTab('agenda')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-bold text-[10px] tracking-[0.2em] uppercase ${activeTab === 'agenda' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
            <List size={14} strokeWidth={2.5} />
            PRÓXIMOS
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all duration-300 font-bold text-[10px] tracking-[0.2em] uppercase ${activeTab === 'reports' ? 'bg-[var(--brand)] text-black shadow-lg scale-[1.02]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5'}`}>
            <FileText size={14} strokeWidth={2.5} />
            RELATÓRIOS
          </button>
        </div>

        {/* Navegação de Data */}
        {activeTab === 'home' && (
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--brand)]/30 rounded-2xl flex items-center justify-center text-[var(--brand)] shadow-lg">
                <CalendarIcon size={20} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold uppercase text-[var(--text-main)] tracking-tighter leading-tight">Compromissos</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand)] opacity-80">
                  {format(selectedDate, "eeee, dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(prev => subDays(prev, 1))} className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-all">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-3 h-10 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center text-[var(--text-main)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--bg-card-alt)] transition-all">
                Hoje
              </button>
              <button onClick={() => setSelectedDate(prev => addDays(prev, 1))} className="w-10 h-10 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-card-alt)] transition-all">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Lista de Cards */}
        <main className="space-y-4">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((app) => (
              <div key={app.id} className="group rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all border-l-4 sm:border-l-6 border-l-[#FDD835] relative shadow-sm w-full overflow-hidden bg-[#FEF9C3] border border-yellow-300">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <h4 className="text-[14px] sm:text-[15px] font-bold text-black uppercase tracking-tight leading-tight">
                      · {app.time} - {app.title} ({app.duration} min)
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-2 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/40 uppercase tracking-wider">Status:</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${app.hasReport ? 'text-green-700 bg-green-600/10' : 'text-black/60 bg-black/5'}`}>
                        {app.hasReport ? 'CONCLUÍDO' : 'PENDENTE'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/40 uppercase tracking-wider">Categoria:</span>
                      <span className="text-[9px] font-bold text-black/80 uppercase">{app.category || 'Geral'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-black/40 uppercase tracking-wider">Local:</span>
                      <span className="text-[9px] font-bold text-black/80 uppercase">{app.location || 'Não Definido'}</span>
                    </div>

                    {app.description && (
                      <div className="flex items-start gap-2 sm:col-span-2">
                        <span className="text-[9px] font-semibold text-black/40 uppercase tracking-wider whitespace-nowrap">Pautas:</span>
                        <span className="text-[9px] font-semibold text-black/60 uppercase line-clamp-2">{app.description}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-1 pt-3 border-t border-black/10">
                    <div className="flex items-center gap-2">
                      {app.potentialConflict && (
                        <span className="text-[8px] text-red-600 font-semibold uppercase flex items-center gap-1">
                          <Info size={10} /> Conflito
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="p-2 bg-black/5 border border-black/10 rounded-lg text-black/30"><Share2 size={13}/></div>
                      <div className="p-2 bg-black/5 border border-black/10 rounded-lg text-black/30"><LayoutGrid size={13}/></div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 bg-[#FEF9C3] rounded-[2.5rem] flex flex-col items-center justify-center border-dashed border-2 border-yellow-300 shadow-xl text-center px-6">
              <LayoutGrid size={40} className="mb-4 text-[#FDD835]/40" />
              <h3 className="text-sm font-bold text-black/30 uppercase tracking-[0.4em] mb-2">Nada Agendado</h3>
              <p className="text-[10px] text-black/20 uppercase tracking-widest leading-relaxed max-w-[200px]">Não há registros para exibição neste período.</p>
            </div>
          )}
        </main>

        <RarbCodingLogo />
      </div>
    </div>
  );
};

export default MirrorView;
