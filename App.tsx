
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, MeetingReport } from './types';
import CalendarView from './components/CalendarView';
import VoiceAssistant from './components/VoiceAssistant';
import MeetingManager from './components/MeetingManager';
import { format, parseISO } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { 
  Globe, NotebookPen, Sparkles, Clock, X, Plus, ChevronRight, Target, Check, Edit2, Trash2
} from 'lucide-react';

const LANGUAGES = [
  { id: 'pt', label: 'BR', flag: '🇧🇷', name: 'Portuguese', locale: ptBR },
  { id: 'en', label: 'EN', flag: '🇺🇸', name: 'English', locale: enUS },
];

const App: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('agendavoz_appointments');
    return saved ? JSON.parse(saved) : [];
  });

  const [reports, setReports] = useState<MeetingReport[]>(() => {
    const saved = localStorage.getItem('agendavoz_reports');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [manualForm, setManualForm] = useState({ title: '', time: '09:00', duration: 30, description: '' });

  useEffect(() => {
    localStorage.setItem('agendavoz_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('agendavoz_reports', JSON.stringify(reports));
  }, [reports]);

  const handleAddAppointment = (appData: Omit<Appointment, 'id'>) => {
    const newApp: Appointment = {
      ...appData,
      id: Math.random().toString(36).substr(2, 9),
      hasReport: false,
      title: appData.title.toUpperCase(),
      description: appData.description?.toUpperCase() || ''
    };
    setAppointments(prev => [...prev, newApp]);
  };

  const handleUpdateAppointment = (id: string, appData: Partial<Appointment>) => {
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, ...appData, title: appData.title?.toUpperCase() || app.title } : app
    ));
  };

  const handleDeleteAppointment = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Deseja realmente excluir este compromisso?')) {
      setAppointments(prev => prev.filter(app => app.id !== id));
      setReports(prev => prev.filter(rep => rep.appointmentId !== id));
    }
  };

  const openEditModal = (e: React.MouseEvent, app: Appointment) => {
    e.stopPropagation();
    setEditingAppointment(app);
    setManualForm({
      title: app.title,
      time: app.time,
      duration: app.duration,
      description: app.description || ''
    });
    setIsManualModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setManualForm({ title: '', time: '09:00', duration: 30, description: '' });
    setIsManualModalOpen(true);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    if (editingAppointment) {
      handleUpdateAppointment(editingAppointment.id, {
        title: manualForm.title.toUpperCase(),
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase()
      });
    } else {
      handleAddAppointment({
        title: manualForm.title.toUpperCase(),
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase(),
        date: format(selectedDate, 'yyyy-MM-dd')
      });
    }
    
    setIsManualModalOpen(false);
    setEditingAppointment(null);
    setManualForm({ title: '', time: '09:00', duration: 30, description: '' });
  };

  const handleReportGenerated = (report: MeetingReport) => {
    setReports(prev => [...prev, report]);
    setAppointments(prev => prev.map(app => 
      app.id === report.appointmentId ? { ...app, hasReport: true } : app
    ));
    setSelectedReport(report);
    setActiveAppointmentId(null);
  };

  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(app => app.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const activeAppointment = appointments.find(a => a.id === activeAppointmentId) || null;

  return (
    <div className="min-h-screen flex flex-col pb-44 px-5 sm:px-10 max-w-2xl mx-auto">
      
      <header className="py-20 flex flex-col items-center justify-center mb-6 relative">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-16 h-16 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl flex items-center justify-center text-amber-500 shadow-2xl transition-all hover:scale-110">
            <NotebookPen size={32} strokeWidth={2.5} />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-6xl font-black logo-amazon leading-none tracking-tighter">AGENDEI</h1>
            <span className="text-[10px] font-black text-emerald-500/30 uppercase tracking-[0.6em] mt-4">Amazon Executive Suite</span>
          </div>
        </div>

        <button onClick={() => setIsLangOpen(!isLangOpen)} className="absolute top-6 right-0 flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-black text-amber-500 uppercase tracking-widest hover:bg-white/10 transition-all btn-press">
          {selectedLang.label} <Globe size={12} />
        </button>
      </header>

      <main className="space-y-12">
        <section className="animate-in fade-in slide-in-from-top-4 duration-1000">
          <CalendarView appointments={appointments} selectedDate={selectedDate} onDateSelect={setSelectedDate} onDelete={() => {}} selectedLanguage={selectedLang} />
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="w-1.5 h-6 bg-amber-600 rounded-full shadow-[0_4px_10px_rgba(217,119,6,0.3)]"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-emerald-500/40">Compromissos</h3>
            </div>
            <button onClick={openCreateModal} className="w-12 h-12 bg-emerald-950/40 border border-emerald-800/40 rounded-2xl shadow-lg transition-all duration-300 btn-press flex items-center justify-center text-amber-500 hover:bg-amber-600 hover:text-white hover:border-transparent">
              <Plus size={24} strokeWidth={3} />
            </button>
          </div>

          <div className="grid gap-5">
            {selectedDayAppointments.length === 0 ? (
              <div className="py-20 glass-card rounded-[2.5rem] flex flex-col items-center justify-center bg-white/5 border-dashed border-2 border-white/10 opacity-30">
                <Clock size={32} className="mb-4 text-emerald-900" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-300">Nenhum evento agendado</p>
              </div>
            ) : (
              selectedDayAppointments.map((app) => {
                const isReport = app.hasReport;
                return (
                  <div key={app.id} 
                    onClick={() => isReport ? setSelectedReport(reports.find(r => r.appointmentId === app.id) || null) : setActiveAppointmentId(app.id)}
                    className="group p-6 bg-white/5 rounded-[1.8rem] border border-white/10 transition-all hover:bg-white/10 hover:border-amber-500/30 cursor-pointer relative overflow-hidden">
                    
                    <div className="flex items-center gap-8 relative z-10">
                      <div className="flex flex-col items-center min-w-[55px]">
                        <span className="text-xl font-black text-white leading-none mb-1.5">{app.time}</span>
                        <span className="text-[9px] font-black text-amber-600 uppercase tracking-tighter">{app.duration} MIN</span>
                      </div>
                      <div className="flex-1 border-l border-white/10 pl-8">
                        <h4 className="text-[14px] font-bold text-emerald-50 uppercase tracking-wide mb-1.5 group-hover:text-amber-500 transition-colors">
                          {app.title}
                        </h4>
                        <div className="flex items-center gap-3">
                          {isReport ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-600/10 border border-amber-600/30 rounded-md text-[9px] font-black text-amber-500 uppercase tracking-widest">
                              <Sparkles size={10} /> Documentada
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full"></div> Pendente
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Botões de Ação de Edição/Exclusão */}
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => openEditModal(e, app)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-amber-600/20 border border-white/5 hover:border-amber-500/30 transition-all text-emerald-800 hover:text-amber-500"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteAppointment(e, app.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-red-600/20 border border-white/5 hover:border-red-500/30 transition-all text-emerald-800 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5">
                          <ChevronRight size={18} className="text-emerald-800 group-hover:text-amber-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      <VoiceAssistant onAddAppointment={handleAddAppointment} appointments={appointments} currentSelectedDate={selectedDate} selectedLanguage={selectedLang} />

      {isManualModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#021526]/80 backdrop-blur-md" onClick={() => setIsManualModalOpen(false)}></div>
          <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-sm relative shadow-2xl animate-in zoom-in duration-300">
            <h3 className="text-xl font-black uppercase text-[#021526] mb-8 flex items-center gap-4">
              {editingAppointment ? <Edit2 size={24} className="text-amber-600" /> : <Plus size={24} className="text-amber-600" />}
              {editingAppointment ? 'Editar' : 'Agendar'}
            </h3>
            <form onSubmit={handleManualSave} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Título</label>
                <input autoFocus type="text" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-[#021526] focus:outline-none focus:ring-1 focus:ring-amber-500" placeholder="ASSUNTO" required />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Horário</label>
                  <input type="time" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-[#021526]" />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Duração</label>
                  <input type="number" value={manualForm.duration} onChange={e => setManualForm({...manualForm, duration: parseInt(e.target.value) || 0})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-[#021526]" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#021526] py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] text-white shadow-xl hover:bg-amber-600 transition-all">
                {editingAppointment ? 'Salvar Alterações' : 'Confirmar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {(activeAppointment || selectedReport) && (
        <div className="fixed inset-0 z-[450] flex items-end justify-center px-4 pb-10">
          <div className="absolute inset-0 bg-[#021526]/90 backdrop-blur-xl" onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }}></div>
          <div className="w-full max-w-lg bg-white rounded-[3rem] p-10 max-h-[88vh] overflow-y-auto custom-scrollbar relative animate-in slide-in-from-bottom duration-700 shadow-2xl">
            <button onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }} className="absolute top-8 right-8 p-3 bg-slate-100 rounded-xl text-slate-800 hover:bg-red-50 hover:text-red-600 transition-all border border-slate-200"><X size={20}/></button>
            
            {activeAppointment && !selectedReport && (
              <MeetingManager activeAppointment={activeAppointment} onReportGenerated={handleReportGenerated} selectedLanguage={selectedLang} />
            )}

            {selectedReport && (
              <div className="space-y-12 pt-6 text-slate-900">
                <header>
                  <span className="text-[10px] font-black text-amber-600 tracking-[0.4em] uppercase">Memória Executiva</span>
                  <h2 className="text-3xl font-black tracking-tighter text-[#021526] uppercase mt-3">{appointments.find(a => a.id === selectedReport.appointmentId)?.title}</h2>
                </header>

                <div className="space-y-12">
                  <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-3"><Sparkles size={16}/> Resumo</h4>
                    <p className="text-slate-700 leading-relaxed text-[15px] font-medium italic">"{selectedReport.summary}"</p>
                  </div>

                  <div className="grid gap-10">
                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2">Decisões</h4>
                      {selectedReport.decisions.map((d, i) => (
                        <div key={i} className="flex items-start gap-5 p-5 bg-white rounded-2xl border border-slate-100 shadow-sm">
                          <Target size={18} className="text-amber-500 shrink-0 mt-0.5" />
                          <p className="text-[12px] font-bold text-slate-800 uppercase tracking-tight leading-snug">{d}</p>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-5">
                      <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] ml-2">Ações</h4>
                      {selectedReport.actionItems.map((a, i) => (
                        <div key={i} className="flex items-start gap-5 p-5 bg-amber-50/30 rounded-2xl border border-amber-100 shadow-sm">
                          <Check size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                          <p className="text-[12px] font-bold text-slate-700 uppercase tracking-tight leading-snug">{a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5 pt-6">
                   <button onClick={() => { navigator.clipboard.writeText(selectedReport.summary); }} className="py-4.5 bg-slate-50 rounded-2xl text-[10px] font-black uppercase text-slate-900 border border-slate-200 hover:bg-slate-100 transition-all btn-press">Copiar</button>
                   <button className="py-4.5 bg-amazon-premium rounded-2xl text-[10px] font-black uppercase text-white shadow-lg hover:brightness-110 active:scale-95 transition-all">Enviar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
