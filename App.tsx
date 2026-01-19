
import React, { useState, useEffect, useMemo } from 'react';
import { Appointment, MeetingReport } from './types';
import CalendarView from './components/CalendarView';
import VoiceAssistant from './components/VoiceAssistant';
import MeetingManager from './components/MeetingManager';
import { format } from 'date-fns';
import { ptBR, enUS, fr, es } from 'date-fns/locale';
import { 
  Globe, NotebookPen, Sparkles, Clock, Trash2, 
  Share2, LayoutList, X, Plus, Edit3, Save, ListTodo, Copy, Check, Target
} from 'lucide-react';

const LANGUAGES = [
  { id: 'pt', label: 'Português', flag: '🇧🇷', name: 'Portuguese', locale: ptBR },
  { id: 'en', label: 'English', flag: '🇺🇸', name: 'English', locale: enUS },
  { id: 'fr', label: 'Français', flag: '🇫🇷', name: 'French', locale: fr },
  { id: 'es', label: 'Español', flag: '🇪🇸', name: 'Spanish', locale: es },
];

const TRANSLATIONS: Record<string, any> = {
  pt: {
    appTitle: 'AGENDEI',
    appSubtitle: 'Executive Voice Suite',
    agendaDay: 'Agenda Executiva',
    noAppointments: 'Nenhuma tratativa agendada.',
    useVoice: 'Voz Ativa',
    redacaoTitulo: 'Memória do Evento',
    essencia: 'Essência do Evento',
    encaminhamentos: 'Principais Encaminhamentos',
    decisoes: 'Principais Decisões',
    copiarRelatorio: 'Copiar Memória',
    copiado: 'Copiado',
    min: 'min',
    novoAgendamento: 'NOVO EVENTO',
    editarAgendamento: 'EDITAR EVENTO',
    titulo: 'Descrição do Título',
    horario: 'Hora',
    duracao: 'Duração',
    pautas: 'Pautas Principais / Objetivos',
    salvar: 'Confirmar Agendamento',
    cancelar: 'Voltar',
    salvarEdicao: 'Salvar Alterações',
    compartilhar: 'Compartilhar'
  },
  en: {
    appTitle: 'AGENDEI',
    appSubtitle: 'Executive Voice Suite',
    agendaDay: 'Executive Agenda',
    noAppointments: 'No appointments scheduled.',
    useVoice: 'Voice Active',
    redacaoTitulo: 'Event Memory',
    essencia: 'Event Essence',
    encaminhamentos: 'Key Guidelines',
    decisoes: 'Key Decisions',
    copiarRelatorio: 'Copy Memory',
    copiado: 'Copied',
    min: 'min',
    novoAgendamento: 'NEW EVENT',
    editarAgendamento: 'EDIT EVENT',
    titulo: 'Title Description',
    horario: 'Time',
    duracao: 'Duration',
    pautas: 'Key Topics / Agenda',
    salvar: 'Confirm Appointment',
    cancelar: 'Back',
    salvarEdicao: 'Save Changes',
    compartilhar: 'Share'
  }
};

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
  const [isEditing, setIsEditing] = useState(false);
  const [editedReport, setEditedReport] = useState<MeetingReport | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [listKey, setListKey] = useState(0);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editingAppointmentId, setEditingAppointmentId] = useState<string | null>(null);
  
  const [manualForm, setManualForm] = useState({ title: '', time: '09:00', duration: 30, description: '' });

  const t = TRANSLATIONS[selectedLang.id] || TRANSLATIONS.pt;

  // Sincronização localStorage
  useEffect(() => {
    localStorage.setItem('agendavoz_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('agendavoz_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    setActiveAppointmentId(null);
    setSelectedReport(null);
    setIsEditing(false);
    setListKey(prev => prev + 1);
  }, [selectedDate]);

  const handleOpenEditModal = (app: Appointment) => {
    setEditingAppointmentId(app.id);
    setManualForm({
      title: app.title,
      time: app.time,
      duration: app.duration,
      description: app.description || ''
    });
    setIsManualModalOpen(true);
  };

  // Add handleAddAppointment to fix "Cannot find name 'handleAddAppointment'" error
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

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    const updatedData = {
      title: manualForm.title.toUpperCase(),
      time: manualForm.time,
      duration: manualForm.duration,
      description: manualForm.description.toUpperCase(),
      date: format(selectedDate, 'yyyy-MM-dd')
    };

    if (editingAppointmentId) {
      setAppointments(prev => prev.map(app => 
        app.id === editingAppointmentId ? { ...app, ...updatedData } : app
      ));
    } else {
      const newApp: Appointment = {
        ...updatedData,
        id: Math.random().toString(36).substr(2, 9),
        hasReport: false
      };
      setAppointments(prev => [...prev, newApp]);
    }
    
    setManualForm({ title: '', time: '09:00', duration: 30, description: '' });
    setEditingAppointmentId(null);
    setIsManualModalOpen(false);
  };

  const handleDeleteAppointment = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setAppointments(prev => prev.filter(app => app.id !== id));
    setReports(prev => prev.filter(rep => rep.appointmentId !== id));
    if (activeAppointmentId === id) setActiveAppointmentId(null);
    if (selectedReport?.appointmentId === id) setSelectedReport(null);
  };

  const handleReportGenerated = (report: MeetingReport) => {
    setReports(prev => {
      const filtered = prev.filter(r => r.appointmentId !== report.appointmentId);
      return [report, ...filtered];
    });
    
    setAppointments(prev => prev.map(app => 
      app.id === report.appointmentId ? { ...app, hasReport: true } : app
    ));
    
    setSelectedReport(report);
    setActiveAppointmentId(null);
  };

  const handleStartEditing = () => {
    if (selectedReport) {
      setEditedReport({ ...selectedReport });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    if (editedReport) {
      const updatedReport: MeetingReport = {
        ...editedReport,
        actionItems: editedReport.actionItems.map(a => a.trim().toUpperCase()).filter(a => a !== ''),
        decisions: editedReport.decisions.map(d => d.trim().toUpperCase()).filter(d => d !== '')
      };
      
      setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
      setSelectedReport(updatedReport);
      setIsEditing(false);
      setEditedReport(null);
    }
  };

  const handleShareReport = async () => {
    if (!selectedReport) return;
    const app = appointments.find(a => a.id === selectedReport.appointmentId);
    const title = app?.title || 'EVENTO';
    
    const text = `*MEMÓRIA DO EVENTO: ${title}*\n\n` +
                 `*ESSÊNCIA:*\n${selectedReport.summary}\n\n` +
                 `*ENCAMINHAMENTOS:*\n${selectedReport.actionItems.map((item, i) => `${i + 1}. ${item.toUpperCase()}`).join('\n')}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: `Agendei: ${title}`, text });
      } catch (err) { console.log("Share failed", err); }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(app => app.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const activeAppointment = appointments.find(a => a.id === activeAppointmentId) || null;

  return (
    <div className="min-h-screen flex flex-col pb-40 px-4 sm:px-6 max-w-xl mx-auto">
      {/* MODAL NOVO/EDITAR */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center px-0 sm:px-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => { setIsManualModalOpen(false); setEditingAppointmentId(null); }}></div>
          <div className="glass-card rounded-t-[2.5rem] sm:rounded-[3rem] w-full max-w-md p-6 sm:p-10 relative animate-in slide-in-from-bottom duration-500 max-h-[90vh] overflow-y-auto bg-slate-900/90 border-t-4 border-t-yellow-400">
            <button onClick={() => { setIsManualModalOpen(false); setEditingAppointmentId(null); }} className="absolute top-6 right-6 p-2 text-white/50 bg-white/5 rounded-full z-10">
              <X size={20} />
            </button>
            <h3 className="text-xl font-black tracking-tighter uppercase mb-8 flex items-center gap-4 text-yellow-400">
              <div className="p-2 bg-yellow-400/10 rounded-xl shrink-0">
                {editingAppointmentId ? <Edit3 size={24} /> : <Plus size={24} />}
              </div>
              <span className="block leading-none">{editingAppointmentId ? t.editarAgendamento : t.novoAgendamento}</span>
            </h3>
            <form onSubmit={handleManualSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-1">{t.titulo}</label>
                <input autoFocus type="text" value={manualForm.title} onChange={e => setManualForm({...manualForm, title: e.target.value.toUpperCase()})} className="w-full glass-inset bg-white/5 rounded-2xl px-5 py-4 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 transition-all uppercase" required />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-1">{t.horario}</label>
                  <input type="time" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} className="w-full glass-inset bg-white/5 rounded-2xl px-5 py-4 text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-1">{t.duracao}</label>
                  <input type="number" value={manualForm.duration} onChange={e => setManualForm({...manualForm, duration: parseInt(e.target.value) || 0})} className="w-full glass-inset bg-white/5 rounded-2xl px-5 py-4 text-base font-bold text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em] ml-1">{t.pautas}</label>
                <textarea 
                  value={manualForm.description} 
                  onChange={e => setManualForm({...manualForm, description: e.target.value.toUpperCase()})} 
                  className="w-full glass-inset bg-white/5 rounded-2xl px-5 py-4 text-sm font-medium text-white focus:outline-none min-h-[120px] leading-relaxed uppercase"
                  placeholder="..."
                />
              </div>
              <div className="pt-6 flex flex-col gap-3">
                <button type="submit" className="w-full bg-gold-gradient text-slate-900 py-5 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-[0_10px_30px_-10px_rgba(255,215,0,0.5)] active:scale-95 transition-transform">
                  {t.salvar}
                </button>
                <button type="button" onClick={() => { setIsManualModalOpen(false); setEditingAppointmentId(null); }} className="w-full text-white/40 py-3 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors">{t.cancelar}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="pt-10 pb-12 flex flex-col items-center">
        <div className="flex items-center justify-between w-full mb-10">
           <div className="relative">
             <div onClick={() => setIsLangOpen(!isLangOpen)} className="flex items-center gap-3 glass-card bg-white/10 rounded-xl px-4 py-2.5 cursor-pointer transition-all border-white/20">
               <Globe size={14} className="text-yellow-400" />
               <span className="text-[10px] font-black text-white uppercase tracking-widest">{selectedLang.label}</span>
             </div>
             {isLangOpen && (
               <div className="absolute top-full left-0 mt-2 w-48 glass-card rounded-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                 {LANGUAGES.map((lang) => (
                   <button key={lang.id} onClick={() => { setSelectedLang(lang); setIsLangOpen(false); }} className={`w-full flex items-center justify-between px-5 py-4 text-[10px] font-black uppercase ${selectedLang.id === lang.id ? 'text-yellow-400 bg-white/5' : 'text-white/60'}`}>
                     <span>{lang.flag} {lang.label}</span>
                   </button>
                 ))}
               </div>
             )}
           </div>
           <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]"></div>
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{t.useVoice}</span>
           </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <div className="w-20 h-20 bg-gold-gradient rounded-3xl flex items-center justify-center text-slate-900 shadow-[0_15px_40px_-10px_rgba(255,215,0,0.6)] relative border-2 border-white/40">
            <NotebookPen strokeWidth={2.5} size={40} />
          </div>
          <div className="text-center">
            <h1 className="text-5xl font-black tracking-tighter text-gradient leading-none">{t.appTitle}</h1>
            <span className="text-[10px] font-black text-white/40 tracking-[0.5em] uppercase mt-2 block">{t.appSubtitle}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-12">
        <section className="px-1">
          <CalendarView appointments={appointments} selectedDate={selectedDate} onDateSelect={setSelectedDate} onDelete={() => {}} selectedLanguage={selectedLang} />
        </section>

        <section key={listKey} className="space-y-8">
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-4">
              <LayoutList size={22} className="text-yellow-400" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight">{t.agendaDay}</h3>
            </div>
            <button onClick={() => { setManualForm({ title: '', time: '09:00', duration: 30, description: '' }); setEditingAppointmentId(null); setIsManualModalOpen(true); }} className="w-12 h-12 flex items-center justify-center glass-card bg-yellow-400/10 text-yellow-400 rounded-2xl active:scale-90 border-yellow-400/30 shadow-[0_0_20px_rgba(255,215,0,0.1)]">
              <Plus size={24} />
            </button>
          </div>

          <div className="space-y-5 px-1">
            {selectedDayAppointments.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center glass-card rounded-[3rem] border-dashed border-white/20 opacity-50">
                <Clock size={32} className="text-white/20 mb-4" />
                <p className="text-[12px] font-bold text-white/40 uppercase tracking-[0.2em]">{t.noAppointments}</p>
              </div>
            ) : (
              selectedDayAppointments.map((app) => {
                const isActive = activeAppointmentId === app.id;
                const isReportVisible = selectedReport?.appointmentId === app.id;
                
                return (
                  <div key={app.id} onClick={() => app.hasReport ? (setSelectedReport(reports.find(r => r.appointmentId === app.id) || null), setIsEditing(false)) : setActiveAppointmentId(isActive ? null : app.id)} 
                    className={`p-6 glass-card rounded-3xl flex flex-col transition-all active:scale-[0.98] ${isActive || isReportVisible ? 'border-yellow-400/50 bg-white/10 ring-2 ring-yellow-400/20' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex items-start gap-5 w-full">
                      <div className={`w-16 h-16 rounded-2xl border flex flex-col items-center justify-center shrink-0 shadow-lg ${isActive ? 'bg-gold-gradient text-slate-900 border-white/40' : 'glass-card text-yellow-400 border-white/20'}`}>
                        <span className="text-lg font-black">{app.time}</span>
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h4 className={`font-black text-lg leading-tight uppercase mb-2 break-words ${isActive || isReportVisible ? 'text-white' : 'text-white/90'}`}>
                          {app.title.toUpperCase()}
                        </h4>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">{app.duration} {t.min}</span>
                          {app.hasReport && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/20 rounded-md border border-emerald-500/30">
                              <Sparkles size={10} className="text-emerald-400" />
                              <span className="text-[8px] font-black text-emerald-400 uppercase">REPORT</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(app); }} className="p-3 text-white/40 hover:text-yellow-400 transition-colors">
                          <Edit3 size={18} />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteAppointment(e, app.id); }} className="p-3 text-white/40 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {app.description && (
                      <div className="mt-5 pt-5 border-t border-white/5">
                        <div className="flex items-start gap-4 bg-black/20 p-4 rounded-2xl border border-white/5">
                          <ListTodo size={14} className="text-yellow-400 mt-0.5 shrink-0" />
                          <p className="text-[12px] text-white/60 font-medium leading-relaxed italic uppercase">
                            {app.description.toUpperCase()}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* REPORT OVERLAY */}
        {(activeAppointment || selectedReport) && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none p-4">
             <div className="absolute inset-0 bg-blue-950/50 backdrop-blur-md pointer-events-auto" onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); setIsEditing(false); }}></div>
             <div className="w-full max-w-lg glass-card rounded-[3rem] p-8 pb-14 pointer-events-auto shadow-[0_-10px_100px_rgba(0,0,0,0.6)] border-yellow-400/20 animate-in slide-in-from-bottom duration-500 max-h-[88vh] overflow-y-auto custom-scrollbar bg-slate-900/95">
                {activeAppointment && !selectedReport && (
                  <MeetingManager activeAppointment={activeAppointment} onReportGenerated={handleReportGenerated} selectedLanguage={selectedLang} />
                )}
                {selectedReport && (
                  <div className="space-y-8">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-black uppercase text-yellow-400 tracking-[0.3em]">{t.redacaoTitulo}</h4>
                      <div className="flex items-center gap-4">
                        {!isEditing && (
                          <button onClick={handleStartEditing} className="p-3 bg-white/5 rounded-xl text-yellow-400 border border-white/10">
                            <Edit3 size={20} />
                          </button>
                        )}
                        <button onClick={() => { setSelectedReport(null); setIsEditing(false); }} className="p-2 text-white/40"><X size={24} /></button>
                      </div>
                    </div>

                    {isEditing && editedReport ? (
                      <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="space-y-3">
                           <label className="text-[11px] font-black uppercase text-white/40 ml-1 tracking-widest">{t.essencia}</label>
                           <textarea 
                             className="w-full glass-inset bg-white/5 rounded-2xl p-6 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[140px] leading-relaxed shadow-inner"
                             value={editedReport.summary}
                             onChange={e => setEditedReport({...editedReport, summary: e.target.value})}
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black uppercase text-white/40 ml-1 tracking-widest">{t.decisoes}</label>
                           <textarea 
                             className="w-full glass-inset bg-white/5 rounded-2xl p-6 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px] leading-relaxed uppercase"
                             value={editedReport.decisions.join('\n')}
                             onChange={e => setEditedReport({...editedReport, decisions: e.target.value.split('\n')})}
                             placeholder="..."
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[11px] font-black uppercase text-white/40 ml-1 tracking-widest">{t.encaminhamentos}</label>
                           <textarea 
                             className="w-full glass-inset bg-white/5 rounded-2xl p-6 text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 min-h-[80px] leading-relaxed uppercase"
                             value={editedReport.actionItems.join('\n')}
                             onChange={e => setEditedReport({...editedReport, actionItems: e.target.value.split('\n')})}
                             placeholder="..."
                           />
                        </div>
                        <button 
                          onClick={handleSaveEdit}
                          className="w-full flex items-center justify-center gap-3 py-5 bg-gold-gradient text-slate-900 rounded-2xl text-[12px] font-black uppercase tracking-widest shadow-xl transform active:scale-95 transition-transform"
                        >
                          <Save size={18} /> {t.salvarEdicao}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        <div className="bg-white/5 p-7 rounded-[2.5rem] border border-white/10 shadow-xl">
                           <h5 className="text-[10px] font-black uppercase text-yellow-400 mb-4 tracking-widest flex items-center gap-2">
                             <Sparkles size={14} /> {t.essencia}
                           </h5>
                           <p className="text-[14px] text-white/90 leading-relaxed font-medium whitespace-pre-wrap">{selectedReport.summary}</p>
                        </div>

                        {selectedReport.decisions.length > 0 && (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-yellow-400 ml-1 tracking-widest flex items-center gap-2">
                              <Target size={14} /> {t.decisoes}
                            </h5>
                            <div className="grid gap-2">
                              {selectedReport.decisions.map((item, i) => (
                                <div key={i} className="bg-white/5 p-4 rounded-xl flex items-start gap-4 border border-white/5">
                                  <span className="text-[13px] text-white/80 uppercase">{item.toUpperCase()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedReport.actionItems.length > 0 && (
                          <div className="space-y-4">
                            <h5 className="text-[10px] font-black uppercase text-emerald-400 ml-1 tracking-widest">{t.encaminhamentos}</h5>
                            <div className="grid gap-3">
                              {selectedReport.actionItems.map((item, i) => (
                                <div key={i} className="bg-white/5 p-4 rounded-2xl flex items-start gap-4 border border-white/5 group hover:bg-white/10 transition-colors">
                                  <div className="w-6 h-6 bg-emerald-500 text-slate-900 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0 shadow-lg">{i + 1}</div>
                                  <span className="text-[13px] text-white/80 leading-normal uppercase">{item.toUpperCase()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-4">
                           <button onClick={() => { navigator.clipboard.writeText(selectedReport.summary); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="flex items-center justify-center gap-3 py-5 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/10 transition-all">
                             {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t.copiado : t.copiarRelatorio}
                           </button>
                           <button onClick={handleShareReport} className="flex items-center justify-center gap-3 py-5 bg-white/5 rounded-2xl text-[10px] font-black uppercase text-white/70 border border-white/10 hover:bg-white/10 transition-all active:scale-95"><Share2 size={16} /> {t.compartilhar}</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </div>
          </div>
        )}
      </main>

      <VoiceAssistant onAddAppointment={handleAddAppointment} appointments={appointments} currentSelectedDate={selectedDate} selectedLanguage={selectedLang} />
    </div>
  );
};

export default App;
