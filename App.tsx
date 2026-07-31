import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Appointment, MeetingReport } from './types';
import CalendarView from './components/CalendarView';
import VoiceAssistant from './components/VoiceAssistant';
import MeetingManager from './components/MeetingManager';
import AdBanner from './components/AdBanner';
import { format, addDays, subDays } from 'date-fns';
import { ptBR, enUS } from 'date-fns/locale';
import { jsPDF } from 'jspdf';
import Markdown from 'react-markdown';
import { db, isFirebaseConfigured } from './src/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Globe, NotebookPen, Sparkles, Clock, X, Plus, ChevronLeft, ChevronRight, Target, Check, Edit2, Trash2, LayoutGrid, Share2, Download, Bell, Home, Calendar as CalendarIcon, Settings, PhoneCall, Monitor, Info, RefreshCw, MoreVertical, Smartphone, FileText
} from 'lucide-react';

const LANGUAGES = [
  { id: 'pt', label: 'BR', flag: '🇧🇷', name: 'Portugues', locale: ptBR },
  { id: 'en', label: 'EN', flag: '🇺🇸', name: 'English', locale: enUS },
];

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
        <span className="text-[12px] text-[var(--text-muted)] uppercase tracking-[0.3em] mb-0.5">Desenvolvido por</span>
        <span className="text-xl font-extrabold tracking-wider font-mono text-[var(--text-main)] leading-none">
          Rar<span className="text-[#00F2FE]">b</span><span className="relative inline-block border-b-2 border-[#00F2FE] pb-0.5">_CODING</span>
        </span>
        <span className="text-[8px] tracking-[0.25em] uppercase text-[var(--text-muted)] font-mono font-semibold mt-1">Software Development</span>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const saved = localStorage.getItem('agendavoz_appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((app: Appointment) => ({
            ...app,
            reminders: app.reminders || [10, 30, 60, 120, 1440],
            callAlert: app.callAlert !== undefined ? app.callAlert : true
          }));
        }
      }
    } catch (e) {
      console.error('Error parsing appointments from localStorage:', e);
    }
    return [];
  });

  const [activeReminder, setActiveReminder] = useState<{title: string, timeStr: string} | null>(null);

  const [reports, setReports] = useState<MeetingReport[]>(() => {
    try {
        const saved = localStorage.getItem('agendavoz_reports');
        if (saved) {
             const parsed = JSON.parse(saved);
             if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('Error parsing reports from localStorage', e);
    }
    return [];
  });

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedReport, setSelectedReport] = useState<MeetingReport | null>(null);
  const [activeAppointmentId, setActiveAppointmentId] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);

  // Get unique sorted dates with appointments
  const uniqueAppointmentDates = useMemo(() => {
    const dates = appointments.map(app => app.date);
    return Array.from(new Set(dates)).sort();
  }, [appointments]);

  const navigateToNextAppointment = () => {
    const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
    const nextDateStr = uniqueAppointmentDates.find(date => date > currentDateStr);
    if (nextDateStr) {
      setSelectedDate(new Date(`${nextDateStr}T12:00:00`)); // Use midday to avoid timezone issues
    }
  };

  const navigateToPrevAppointment = () => {
    const currentDateStr = format(selectedDate, 'yyyy-MM-dd');
    const prevDates = uniqueAppointmentDates.filter(date => date < currentDateStr);
    if (prevDates.length > 0) {
      const prevDateStr = prevDates[prevDates.length - 1];
      setSelectedDate(new Date(`${prevDateStr}T12:00:00`));
    }
  };
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [manualForm, setManualForm] = useState<{title: string, date: string, time: string, duration: number, description: string, reminders: number[], callAlert: boolean, location: string, category: string}>({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '09:00', duration: 30, description: '', reminders: [10, 30, 60, 120, 1440], callAlert: true, location: '', category: 'Geral' });
  const [deleteConfirmation, setDeleteConfirmation] = useState<{type: 'appointment' | 'report' | 'all_data' | 'mirror', id: string} | null>(null);
  const [isPro, setIsPro] = useState(false); // Simulando estado de usuário free/pro
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('agendavoz_theme') || 'original';
  });
  const [recordingTimer, setRecordingTimer] = useState<{id: string, time: number, isRecording: boolean} | null>(null);
  const [activeTab, setActiveTab] = useState('home');
  const [mirrorId, setMirrorId] = useState<string | null>(() => {
    return localStorage.getItem('agendavoz_mirror_id');
  });
  const [isMirrorModalOpen, setIsMirrorModalOpen] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(() => {
    return localStorage.getItem('agendavoz_terms_accepted') === 'true';
  });
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(!termsAccepted);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (isTermsModalOpen && termsAccepted) {
          setIsTermsModalOpen(false);
        } else if (isTermsModalOpen && !termsAccepted) {
          handleAcceptTerms();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTermsModalOpen, termsAccepted]);

  useEffect(() => {
    if (!termsAccepted) {
      setIsTermsModalOpen(true);
    }
  }, [termsAccepted]);

  const handleAcceptTerms = () => {
    localStorage.setItem('agendavoz_terms_accepted', 'true');
    setTermsAccepted(true);
    setIsTermsModalOpen(false);
  };

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Evita o alerta de crash para abortos de compartilhamento
      if (event.reason && event.reason.name === 'AbortError') {
        event.preventDefault();
        return;
      }
      console.warn('Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('agendavoz_theme', theme);
  }, [theme]);

  // Auto-sync appointments to Firestore if mirroring is active
  useEffect(() => {
    if (!mirrorId) return;
    
    console.log("Iniciando auto-sync para mirrorId:", mirrorId);
    
    const sync = async () => {
      if (!isFirebaseConfigured) return;
      console.log(`Sincronizando ${appointments.length} compromissos para mirrorId: ${mirrorId}...`);
      for (const app of appointments) {
        try {
          const start = new Date(`${app.date}T${app.time}`);
          const report = reports.find(r => r.appointmentId === app.id);
          await setDoc(doc(db, 'appointments', app.id), {
            titulo: app.title.toUpperCase(),
            data_inicio: start,
            data_fim: new Date(start.getTime() + app.duration * 60000),
            date_string: app.date, // Guardar a data original para evitar problemas de fuso
            time_string: app.time,
            descricao: app.description || '',
            local: app.location || '',
            categoria: app.category || 'Geral',
            status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
            mirrorId: mirrorId,
            duration: app.duration,
            hasReport: app.hasReport,
            callAlert: app.callAlert || false,
            potentialConflict: app.potentialConflict || false,
            markdownReport: report ? report.markdownReport : null,
            updatedAt: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.error("Auto-sync error for", app.title, e);
        }
      }
      console.log("Sincronização concluída.");
    };

    const timeout = setTimeout(sync, 1000);
    window.addEventListener('online', sync);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('online', sync);
    };
  }, [appointments, mirrorId, reports]);

  const enableMirroring = async () => {
    if (!isFirebaseConfigured) {
      alert("Configuração do banco de dados (Firebase) ausente. O espelhamento não pode ser ativado.");
      return;
    }
    const newId = Math.random().toString(36).substring(2, 10);
    setMirrorId(newId);
    localStorage.setItem('agendavoz_mirror_id', newId);
    console.log("Habilitando espelhamento com ID:", newId);
    
    // Sync existing appointments to Firestore
    for (const app of appointments) {
      try {
        const start = new Date(`${app.date}T${app.time}`);
        const report = reports.find(r => r.appointmentId === app.id);
        await setDoc(doc(db, 'appointments', app.id), {
          titulo: app.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + app.duration * 60000),
          date_string: app.date,
          time_string: app.time,
          descricao: app.description || '',
          local: app.location || '',
          categoria: app.category || 'Geral',
          status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
          mirrorId: newId,
          duration: app.duration,
          hasReport: app.hasReport,
          callAlert: app.callAlert || false,
          potentialConflict: app.potentialConflict || false,
          markdownReport: report ? report.markdownReport : null,
          createdAt: serverTimestamp()
        }, { merge: true });
        console.log("Sincronizado:", app.title);
      } catch (e) {
        console.error("Erro na sincronização inicial:", e);
      }
    }
    alert("Espelhamento ativado e agenda sincronizada!");
  };

  const syncAllToFirestore = async () => {
    if (!isFirebaseConfigured) {
      alert("Configuração do banco de dados (Firebase) ausente. Sincronização indisponível.");
      return;
    }
    if (!mirrorId) {
      alert("Ative o espelhamento primeiro!");
      return;
    }
    console.log("Iniciando sincronização forçada com ID:", mirrorId);
    if (appointments.length === 0) {
      alert("Nenhum compromisso local para sincronizar.");
      return;
    }
    
    let successCount = 0;
    for (const app of appointments) {
      try {
        const start = new Date(`${app.date}T${app.time}`);
        const report = reports.find(r => r.appointmentId === app.id);
        await setDoc(doc(db, 'appointments', app.id), {
          titulo: app.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + app.duration * 60000),
          descricao: app.description || '',
          local: app.location || '',
          categoria: app.category || 'Geral',
          status: app.hasReport ? 'CONCLUÍDO' : 'PENDENTE',
          mirrorId: mirrorId,
          duration: app.duration,
          hasReport: app.hasReport,
          callAlert: app.callAlert || false,
          potentialConflict: app.potentialConflict || false,
          markdownReport: report ? report.markdownReport : null,
          updatedAt: serverTimestamp()
        });
        successCount++;
      } catch (e) {
        console.error("Erro no SyncAll:", e);
      }
    }
    alert(`Sincronização concluída! ${successCount} compromissos enviados.`);
  };
  const [incomingCall, setIncomingCall] = useState<{app: Appointment, timeStr: string} | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        alert("Notificações ativadas com sucesso! Você receberá alertas mesmo com o app minimizado.");
      } else {
        alert("Você bloqueou as notificações. Ative nas configurações do navegador para receber alertas.");
      }
    } else {
      alert("Seu navegador não suporta notificações.");
    }
  };
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasInstalled, setHasInstalled] = useState(() => localStorage.getItem('agendavoz_installed') === 'true');
  const [isInstallHelpModalOpen, setIsInstallHelpModalOpen] = useState(false);
  const isIOSDevice = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);
  const [installHelpTab, setInstallHelpTab] = useState<'ios' | 'android'>(isIOSDevice ? 'ios' : 'android');
  const agendaListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    const installHandler = () => {
      setShowInstallBanner(false);
      setHasInstalled(true);
      localStorage.setItem('agendavoz_install_dismissed', 'true');
      localStorage.setItem('agendavoz_installed', 'true');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installHandler);
    };
  }, []);

  useEffect(() => {
    const standaloneCheck = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(!!standaloneCheck);
    const hasDismissed = localStorage.getItem('agendavoz_install_dismissed') === 'true';

    if (!standaloneCheck && !hasDismissed && !hasInstalled) {
      const timer = setTimeout(() => {
        setShowInstallBanner(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasInstalled]);

  const handleInstallClick = async () => {
    if (installPromptEvent) {
      try {
        await installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        if (outcome === 'accepted') {
          setShowInstallBanner(false);
          setHasInstalled(true);
          localStorage.setItem('agendavoz_install_dismissed', 'true');
          localStorage.setItem('agendavoz_installed', 'true');
        }
      } catch (e) {
        console.error("Erro ao instalar:", e);
        setIsInstallHelpModalOpen(true);
      }
      setInstallPromptEvent(null);
    } else {
      setIsInstallHelpModalOpen(true);
    }
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('agendavoz_install_dismissed', 'true');
  };

  useEffect(() => {
    let interval: any;
    let ctx: AudioContext | null = null;
    
    if (incomingCall) {
      if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('ALERTA: ' + incomingCall.app.title, {
              body: `Começa em ${incomingCall.timeStr}`,
              icon: '/logo.svg',
              badge: '/logo.svg',
              vibrate: [500, 200, 500, 200, 500],
            } as any);
          }).catch(e => console.error("SW ready error:", e));
      }

      try {
        const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtor) {
          ctx = new AudioCtor();
          const playRing = () => {
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            // Standard ringtone frequency
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, ctx!.currentTime);
            osc.frequency.setValueAtTime(480, ctx!.currentTime + 0.05); // slight trill
            
            gain.gain.setValueAtTime(0, ctx!.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, ctx!.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx!.currentTime + 1.5);
            gain.gain.linearRampToValueAtTime(0, ctx!.currentTime + 1.6);
            
            osc.start(ctx!.currentTime);
            osc.stop(ctx!.currentTime + 1.6);
          };
          
          playRing();
          interval = setInterval(playRing, 3000);
        }
      } catch (e) {
        console.error("Audio blocked:", e);
      }
    }
    
    return () => {
      if (interval) clearInterval(interval);
      if (ctx) ctx.close().catch(e => console.error(e));
    };
  }, [incomingCall]);

  useEffect(() => {
    localStorage.setItem('agendavoz_appointments', JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('agendavoz_reports', JSON.stringify(reports));
  }, [reports]);

  // Request notification permission and check for reminders
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        // First beep
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain1.gain.setValueAtTime(0.1, ctx.currentTime);
        osc1.start();
        gain1.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
        osc1.stop(ctx.currentTime + 0.3);
        
        // Second beep
        setTimeout(() => {
          const osc2 = ctx.createOscillator();
          const gain2 = ctx.createGain();
          osc2.connect(gain2);
          gain2.connect(ctx.destination);
          osc2.type = 'sine';
          osc2.frequency.setValueAtTime(1046.50, ctx.currentTime); // C6
          gain2.gain.setValueAtTime(0.1, ctx.currentTime);
          osc2.start();
          gain2.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3);
          osc2.stop(ctx.currentTime + 0.3);
        }, 150);
      } catch (e) {
        console.error("Audio play blocked:", e);
      }
    };

    const checkReminders = () => {
      const now = new Date();
      const notifiedKey = 'agendavoz_notified_reminders';
      let notified: Record<string, boolean> = {};
      try {
        notified = JSON.parse(localStorage.getItem(notifiedKey) || '{}');
      } catch (e) {
        console.error('Error parsing notified from localStorage', e);
      }
      let updated = false;

      appointments.forEach(app => {
        if (!app.reminders) return;
        
        const appDate = new Date(`${app.date}T${app.time}`);
        const diffMinutes = Math.round((appDate.getTime() - now.getTime()) / 60000);
        
        app.reminders.forEach(reminderMinutes => {
          // Include date and time in ID so if the user edits the appointment, the reminder resets
          const reminderId = `${app.id}_${app.date}_${app.time}_${reminderMinutes}`;
          
          // Check if we are within a 15-minute window of the reminder time (to catch up if app was closed)
          if (diffMinutes <= reminderMinutes && diffMinutes > reminderMinutes - 15 && !notified[reminderId]) {
            let timeStr = '';
            if (reminderMinutes === 1440) timeStr = '24 horas';
            else if (reminderMinutes === 120) timeStr = '2 horas';
            else if (reminderMinutes === 60) timeStr = '1 hora';
            else timeStr = `${reminderMinutes} minutos`;
            
            const message = `Lembrete: ${app.title} começa em ${timeStr}!`;
            
            if ('Notification' in window && Notification.permission === 'granted') {
              navigator.serviceWorker.ready.then(registration => {
                registration.showNotification('AGENDEI - Lembrete', {
                  body: message,
                  icon: '/logo.svg',
                  badge: '/logo.svg',
                  vibrate: [200, 100, 200],
                  tag: reminderId,
                  renotify: true,
                  data: {
                    url: window.location.origin
                  }
                } as any);
              }).catch(e => console.error("SW Notification error:", e));
            }
            
            // Trigger in-app modal and sound
            if (app.callAlert) {
              setIncomingCall({ app, timeStr });
              // Start ringtone logic will be handled inside the IncomingCall component
            } else {
              setActiveReminder({ title: app.title, timeStr });
              playNotificationSound();
            }
            
            notified[reminderId] = true;
            updated = true;
          }
        });
      });

      if (updated) {
        localStorage.setItem(notifiedKey, JSON.stringify(notified));
      }
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [appointments]);

  const handleAddAppointment = (appData: Omit<Appointment, 'id'>) => {
    const newApp: Appointment = {
      ...appData,
      id: Math.random().toString(36).substr(2, 9),
      hasReport: false,
      title: appData.title.toUpperCase(),
      description: appData.description?.toUpperCase() || '',
      reminders: appData.reminders || [10, 30, 60, 120, 1440],
      callAlert: appData.callAlert !== undefined ? appData.callAlert : true
    };
    
    setAppointments(prev => [...prev, newApp]);
    
    // Sync to Firestore if mirroring is active
    if (mirrorId && isFirebaseConfigured) {
      const start = new Date(`${newApp.date}T${newApp.time}`);
      setDoc(doc(db, 'appointments', newApp.id), {
        titulo: newApp.title,
        data_inicio: start,
        data_fim: new Date(start.getTime() + newApp.duration * 60000),
        descricao: newApp.description || '',
        local: newApp.location || '',
        categoria: newApp.category || 'Geral',
        status: 'PENDENTE',
        mirrorId: mirrorId,
        duration: newApp.duration,
        hasReport: false,
        callAlert: newApp.callAlert || false,
        potentialConflict: newApp.potentialConflict || false,
        createdAt: serverTimestamp()
      }).catch(e => console.error("Firestore sync error:", e));
    }
    
    // Auto-select the date of the new appointment so the user sees it immediately
    if (appData.date) {
      setSelectedDate(new Date(appData.date + 'T12:00:00')); // Use T12:00:00 to avoid timezone shifts
    }
  };

  const handleUpdateAppointment = (id: string, appData: Partial<Appointment>) => {
    setAppointments(prev => prev.map(app => 
      app.id === id ? { ...app, ...appData, title: appData.title?.toUpperCase() || app.title } : app
    ));

    // Sync to Firestore if mirroring is active
    if (mirrorId && isFirebaseConfigured) {
      const app = appointments.find(a => a.id === id);
      if (app) {
        const updatedApp = { ...app, ...appData };
        const start = new Date(`${updatedApp.date}T${updatedApp.time}`);
        updateDoc(doc(db, 'appointments', id), {
          titulo: updatedApp.title.toUpperCase(),
          data_inicio: start,
          data_fim: new Date(start.getTime() + updatedApp.duration * 60000),
          descricao: updatedApp.description?.toUpperCase() || '',
          local: updatedApp.location || '',
          categoria: updatedApp.category || 'Geral',
          duration: updatedApp.duration,
          hasReport: updatedApp.hasReport,
          callAlert: updatedApp.callAlert || false,
          potentialConflict: updatedApp.potentialConflict || false
        }).catch(e => console.error("Firestore update error:", e));
      }
    }
  };

  const handleDeleteAppointment = (e: React.MouseEvent | null, id: string) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({ type: 'appointment', id });
  };

  const handleDeleteReport = (e: React.MouseEvent | null, appointmentId: string) => {
    if (e) e.stopPropagation();
    setDeleteConfirmation({ type: 'report', id: appointmentId });
  };

  const confirmDeletion = () => {
    if (!deleteConfirmation) return;
    
    if (deleteConfirmation.type === 'appointment') {
      const idToDelete = deleteConfirmation.id;
      setAppointments(prev => prev.filter(app => app.id !== idToDelete));
      setReports(prev => prev.filter(rep => rep.appointmentId !== idToDelete));
      
      // Sync to Firestore if mirroring is active
      if (mirrorId && isFirebaseConfigured) {
        deleteDoc(doc(db, 'appointments', idToDelete)).catch(e => console.error("Firestore delete error:", e));
      }
      
      setIsManualModalOpen(false);
      setEditingAppointment(null);
      setSelectedReport(null);
      setActiveAppointmentId(null);
    } else if (deleteConfirmation.type === 'report') {
      setReports(prev => prev.filter(rep => rep.appointmentId !== deleteConfirmation.id));
      setAppointments(prev => prev.map(app => 
        app.id === deleteConfirmation.id ? { ...app, hasReport: false } : app
      ));
      setSelectedReport(null);
    } else if (deleteConfirmation.type === 'mirror') {
      setMirrorId(null);
      localStorage.removeItem('agendavoz_mirror_id');
      setIsMirrorModalOpen(false);
    } else if (deleteConfirmation.type === 'all_data') {
      localStorage.clear();
      window.location.reload();
      return;
    }
    
    setDeleteConfirmation(null);
  };

  const openEditModal = (e: React.MouseEvent, app: Appointment) => {
    e.stopPropagation();
    setEditingAppointment(app);
    setManualForm({
      title: app.title,
      date: app.date,
      time: app.time,
      duration: app.duration,
      description: app.description || '',
      reminders: app.reminders || [10, 30, 60, 120, 1440],
      callAlert: app.callAlert !== undefined ? app.callAlert : true,
      location: app.location || '',
      category: app.category || 'Geral'
    });
    setIsManualModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingAppointment(null);
    setManualForm({ title: '', date: format(selectedDate, 'yyyy-MM-dd'), time: '09:00', duration: 30, description: '', reminders: [10, 30, 60, 120, 1440], callAlert: true, location: '', category: 'Geral' });
    setIsManualModalOpen(true);
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.title.trim()) return;

    if (editingAppointment) {
      handleUpdateAppointment(editingAppointment.id, {
        title: manualForm.title.toUpperCase(),
        date: manualForm.date,
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase(),
        reminders: manualForm.reminders,
        callAlert: manualForm.callAlert,
        location: manualForm.location.toUpperCase(),
        category: manualForm.category
      });
    } else {
      handleAddAppointment({
        title: manualForm.title.toUpperCase(),
        date: manualForm.date,
        time: manualForm.time,
        duration: manualForm.duration,
        description: manualForm.description.toUpperCase(),
        reminders: manualForm.reminders,
        callAlert: manualForm.callAlert,
        location: manualForm.location.toUpperCase(),
        category: manualForm.category
      });
    }
    
    setIsManualModalOpen(false);
    setEditingAppointment(null);
  };

  const handleReportGenerated = (report: MeetingReport) => {
    setReports(prev => [...prev, report]);
    setAppointments(prev => prev.map(app => 
      app.id === report.appointmentId ? { ...app, hasReport: true } : app
    ));

    // Sync to Firestore if mirroring is active
    if (mirrorId && isFirebaseConfigured) {
      updateDoc(doc(db, 'appointments', report.appointmentId), {
        hasReport: true,
        status: 'CONCLUÍDO',
        markdownReport: report.markdownReport
      }).catch(e => console.error("Firestore report status update error:", e));
    }
    setSelectedReport(report);
    setActiveAppointmentId(null);
  };

  const handleShareReport = async (report: MeetingReport) => {
    const appTitle = appointments.find(a => a.id === report.appointmentId)?.title || 'REUNIÃO';
    const text = `
📌 *MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO: ${appTitle}*
📅 Data: ${format(new Date(report.timestamp), "dd/MM/yyyy 'às' HH:mm")}

${report.markdownReport}

_Enviado via AGENDEI IA_
    `.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Memória: ${appTitle}`,
          text: text
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar", err);
        }
      }
    } else {
      navigator.clipboard.writeText(text).catch(e => console.error("Clipboard error:", e));
      alert('Memória completa copiada para a área de transferência!');
    }
  };

  const handleShareAppointment = async (e: React.MouseEvent, app: Appointment) => {
    e.stopPropagation();
    const dateFormatted = app.date.split('-').reverse().join('/');
    const text = `Agenda: ${app.title}\nData: ${dateFormatted}\nHorário: ${app.time} (Duração: ${app.duration} min)\n${app.description ? `Pautas: ${app.description}` : ''}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `AGENDA: ${app.title}`,
          text: text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar compromisso", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Informações copiadas!');
      } catch (e) {
        console.error("Clipboard error:", e);
      }
    }
  };

  const shareDayAgenda = async () => {
    if (selectedDayAppointments.length === 0) {
      alert("Não há compromissos neste dia.");
      return;
    }
    const formattedDate = format(selectedDate, 'dd/MM/yyyy');
    const text = `Agenda de Compromissos - ${formattedDate}\n\n` + selectedDayAppointments.map(a => {
      let desc = `• ${a.time} - ${a.title} (${a.duration} min)`;
      if (a.description) desc += `\n  PAUTAS: ${a.description}`;
      desc += `\n  STATUS: ${a.hasReport ? 'DOCUMENTADO' : 'PENDENTE'}`;
      if (a.category) desc += `\n  CATEGORIA: ${a.category}`;
      if (a.location) desc += `\n  LOCAL: ${a.location}`;
      return desc;
    }).join('\n\n');
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Agenda do Dia - ${formattedDate}`,
          text: text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar agenda do dia", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Agenda do dia copiada!');
      } catch (e) {
        console.error("Clipboard error:", e);
      }
    }
  };

  const downloadDayAgendaJpeg = async () => {
    if (!agendaListRef.current) return;
    try {
      const { toJpeg } = await import('html-to-image');
      const filter = (node: HTMLElement) => {
        return node.dataset ? !node.dataset.excludeDownload : true;
      };
      const dataUrl = await toJpeg(agendaListRef.current, { quality: 0.95, backgroundColor: '#0A1931', filter });
      const link = document.createElement('a');
      link.download = `Compromissos_${format(selectedDate, 'dd_MM_yyyy')}.jpeg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível gerar a imagem.');
    }
  };

  const shareAllAgenda = async () => {
    const sortedApps = [...appointments].filter(a => !a.hasReport).sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
    if (sortedApps.length === 0) {
      alert("Não há compromissos agendados.");
      return;
    }
    
    let text = `Relação de Compromissos\n\n`;
    
    // Group by date
    const grouped = sortedApps.reduce((acc, curr) => {
      if (!acc[curr.date]) acc[curr.date] = [];
      acc[curr.date].push(curr);
      return acc;
    }, {} as Record<string, Appointment[]>);
    
    for (const [date, apps] of Object.entries(grouped)) {
       text += `\n📅 ${date}:\n` + apps.map(a => `   - ${a.time}: ${a.title}`).join('\n') + `\n`;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Relação de Compromissos`,
          text: text,
        });
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          console.error("Erro ao compartilhar relação", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(text);
        alert('Relação copiada!');
      } catch (e) {
        console.error("Clipboard error:", e);
      }
    }
  };

  const handleDownloadPDF = (report: MeetingReport) => {
    const appointment = appointments.find(a => a.id === report.appointmentId);
    const appTitle = appointment?.title || 'REUNIÃO';
    const appLocation = appointment?.location || 'Não especificado';
    const appDate = appointment 
      ? `${format(new Date(appointment.date + 'T' + (appointment.time || '12:00')), "dd/MM/yyyy")} às ${appointment.time}`
      : format(new Date(report.timestamp), "dd/MM/yyyy 'às' HH:mm");

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    const checkPageBreak = (neededSpace: number) => {
      if (yPos + neededSpace > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
        return true;
      }
      return false;
    };

    // Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(10, 25, 49); // #0A1931
    const titleLines = doc.splitTextToSize(`MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO`, contentWidth);
    doc.text(titleLines, margin, yPos);
    yPos += (titleLines.length * 7) + 2;

    doc.setFontSize(13);
    doc.setTextColor(184, 134, 11); // Gold accent
    const subTitleLines = doc.splitTextToSize(appTitle.toUpperCase(), contentWidth);
    doc.text(subTitleLines, margin, yPos);
    yPos += (subTitleLines.length * 6) + 3;
    
    // Metadata: Data e Local da Reunião
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(80, 80, 80);
    doc.text(`Data: ${appDate}   |   Local: ${appLocation}`, margin, yPos);
    yPos += 8;
    
    // Separator line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 10;
    
    // Content Processing
    const rawMarkdown = report.markdownReport || '';
    const rawLines = rawMarkdown.split('\n');

    rawLines.forEach((line) => {
      let trimmed = line.trim();
      if (!trimmed) {
        yPos += 3;
        return;
      }

      // Replace technical terms & sanitize
      trimmed = trimmed
        .replace(/#\s*ATA DE REUNIÃO/gi, 'MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO')
        .replace(/ATA DE REUNIÃO/gi, 'MEMÓRIA DA REUNIÃO')
        // Strip emojis to prevent broken characters in jsPDF
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{200D}\u{FE0F}\u{1F900}-\u{1F9FF}\u{1F000}-\u{1F02F}]/gu, '')
        // Sanitize non-latin1 characters
        .replace(/[^\x00-\xFF\u00C0-\u00FF]/g, '')
        .trim();

      if (!trimmed) return;

      // Filter out Legal Status and Gemini disclaimer notice per user request
      if (
        /STATUS JUR[ÍI]DICO/i.test(trimmed) ||
        /Confirmado:\s*O usu[áa]rio/i.test(trimmed) ||
        /Aviso:/i.test(trimmed) ||
        /GEMINI_API_KEY/i.test(trimmed) ||
        /Este relat[óo]rio foi estruturado/i.test(trimmed) ||
        /motor local seguro/i.test(trimmed) ||
        /^#\s*MEM[ÓO]RIA (DO REGISTRO EXECUTIVO DA REUNI[ÃA]O|DA REUNI[ÃA]O)/i.test(trimmed)
      ) {
        return;
      }

      // Horizontal divider
      if (trimmed === '---') {
        checkPageBreak(5);
        doc.setDrawColor(220, 220, 220);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
        return;
      }

      // Headings (#, ##, ###)
      if (trimmed.startsWith('#')) {
        const headingText = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!headingText) return;
        checkPageBreak(12);
        yPos += 3;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(10, 25, 49);
        const splitHeading = doc.splitTextToSize(headingText.toUpperCase(), contentWidth);
        doc.text(splitHeading, margin, yPos);
        yPos += (splitHeading.length * 5) + 3;
        return;
      }

      // Blockquotes (> )
      if (trimmed.startsWith('>')) {
        const quoteText = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '').trim();
        if (!quoteText) return;
        checkPageBreak(8);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(70, 70, 70);
        const splitQuote = doc.splitTextToSize(quoteText, contentWidth - 8);
        splitQuote.forEach((qLine: string) => {
          checkPageBreak(6);
          doc.text(qLine, margin + 4, yPos);
          yPos += 5;
        });
        yPos += 2;
        return;
      }

      // Bullet points (* or -)
      if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        const bulletText = trimmed.replace(/^[*|-]\s*/, '').replace(/\*\*/g, '').trim();
        if (!bulletText) return;
        checkPageBreak(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        const splitBullet = doc.splitTextToSize(`• ${bulletText}`, contentWidth - 4);
        splitBullet.forEach((bLine: string, idx: number) => {
          checkPageBreak(6);
          doc.text(bLine, idx === 0 ? margin : margin + 4, yPos);
          yPos += 5;
        });
        return;
      }

      // Paragraphs
      const cleanPara = trimmed.replace(/\*\*/g, '');
      checkPageBreak(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      const splitPara = doc.splitTextToSize(cleanPara, contentWidth);
      splitPara.forEach((pLine: string) => {
        checkPageBreak(6);
        doc.text(pLine, margin, yPos);
        yPos += 5;
      });
      yPos += 2;
    });

    // Footer on all pages
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Memória do Registro Executivo da Reunião - Página ${i} de ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
    }
    
    doc.save(`Memoria_Executiva_${appTitle.replace(/\s+/g, '_')}.pdf`);
  };

  const selectedDayAppointments = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return appointments
      .filter(app => app.date === dateStr)
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [appointments, selectedDate]);

  const activeAppointment = appointments.find(a => a.id === activeAppointmentId) || null;

  const renderAppCard = (app: Appointment) => {
    const isReport = app.hasReport;
    return (
      <div key={app.id} 
        onClick={() => isReport ? setSelectedReport(reports.find(r => r.appointmentId === app.id) || null) : setActiveAppointmentId(app.id)}
        className={`group rounded-xl sm:rounded-2xl p-3 sm:p-4 transition-all hover:translate-x-1 cursor-pointer border-l-4 sm:border-l-6 border-l-[#FDD835] relative shadow-sm w-full overflow-hidden ${
          isReport ? 'bg-[#FEF9C3] border border-yellow-300' : 'bg-[#FEF9C3] hover:bg-yellow-100 border border-yellow-300'
        }`}>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <h4 className="text-[16px] sm:text-[17px] font-bold text-black uppercase tracking-tight group-hover:text-[#FDD835] transition-colors leading-tight">
              · {app.time} - {app.title} ({app.duration} min)
            </h4>
            {app.reminders && app.reminders.length > 0 && (
              <div className="flex items-center gap-1 text-[#FDD835] flex-shrink-0 ml-2" title={`Lembretes ativados!`} >
                <Bell size={12} className="animate-pulse" />
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Status:</span>
              {isReport ? (
                <span className="text-[11px] font-bold text-green-700 uppercase bg-green-600/10 px-1.5 py-0.5 rounded">DOCUMENTADO</span>
              ) : recordingTimer?.id === app.id && recordingTimer.isRecording ? (
                <span className="text-[11px] font-bold text-red-600 uppercase bg-red-600/10 px-1.5 py-0.5 rounded animate-pulse">GRAVANDO</span>
              ) : (
                <span className="text-[11px] font-bold text-black/60 uppercase bg-black/5 px-1.5 py-0.5 rounded">AGENDADO</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Categoria:</span>
              <span className="text-[11px] font-bold text-black/80 uppercase">{app.category || 'Geral'}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-black/40 uppercase tracking-wider">Local:</span>
              <span className="text-[11px] font-bold text-black/80 uppercase">{app.location || 'Não Definido'}</span>
            </div>

            {app.description && (
              <div className="flex items-start gap-2 sm:col-span-2">
                <span className="text-[11px] font-semibold text-[var(--text-main)]/40 uppercase tracking-wider whitespace-nowrap">Assuntos:</span>
                <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase line-clamp-1">{app.description}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-1 pt-3 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              {app.potentialConflict && (
                <span className="text-[8px] text-red-500 font-semibold uppercase flex items-center gap-1">
                  <Info size={10} /> Conflito
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={(e) => handleShareAppointment(e, app)} title="Compartilhar" className="p-2 bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg text-blue-300 hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all shadow-sm"><Share2 size={13}/></button>
              <button onClick={(e) => openEditModal(e, app)} className="p-2 bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all shadow-sm"><Edit2 size={13}/></button>
              <button onClick={(e) => handleDeleteAppointment(e, app.id)} className="p-2 bg-[var(--bg-panel-alt)] border border-[var(--border-color)] rounded-lg text-red-500 hover:bg-red-500/20 transition-all shadow-sm"><Trash2 size={13}/></button>
              <ChevronRight size={14} className="text-[var(--text-main)]/20 group-hover:text-[var(--brand)] ml-1 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {showInstallBanner && (
        <div className="fixed top-0 left-0 right-0 z-[2000] p-4 animate-in slide-in-from-top-full duration-500">
          <div className="bg-[var(--bg-card-alt)] border-2 border-[var(--brand)] rounded-2xl shadow-2xl p-4 flex items-center gap-4 relative lg:max-w-6xl max-w-2xl mx-auto transition-all duration-300">
            <button onClick={dismissInstallBanner} className="absolute -top-2 -right-2 w-8 h-8 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-full flex items-center justify-center text-[var(--text-main)] hover:bg-red-500 hover:text-[var(--text-main)] transition-all shadow-md z-10">
              <X size={16} />
            </button>
            <div className="flex-shrink-0 relative">
              <img src="/icon-192.png" alt="Logo" className="w-[52px] h-[52px] rounded-full border-2 border-[var(--brand)] shadow-[0_0_15px_rgba(253,216,53,0.3)] object-cover bg-[var(--bg-card)]" />
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[var(--brand)] rounded-full flex items-center justify-center border-2 border-[#112240]">
                <Sparkles size={10} className="text-black" />
              </div>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-[var(--text-main)] uppercase tracking-wider">Instalar Agendei</h4>
              <p className="text-[10px] text-[var(--text-main)]/70 uppercase">Tenha acesso rápido direto na sua tela inicial.</p>
            </div>
            <button onClick={handleInstallClick} className="px-4 py-2 bg-[var(--brand)] text-black font-semibold uppercase text-[10px] tracking-wide rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md">
              Instalar
            </button>
          </div>
        </div>
      )}

      {/* Botão de Instalação Flutuante para Celular e Tablet */}
      {!isStandalone && !hasInstalled && (
        <div className="fixed bottom-[110px] right-4 z-[999] md:hidden">
          <button
            onClick={handleInstallClick}
            aria-label="Instalar o aplicativo Agendei"
            title="Instalar Agendei"
            className="relative flex items-center gap-2.5 bg-[var(--bg-card-alt)] hover:bg-[var(--bg-card)] border-2 border-[var(--brand)] p-1.5 pl-2.5 pr-4 rounded-full shadow-[0_8px_30px_rgba(253,216,53,0.4)] active:scale-95 transition-all group overflow-visible"
          >
            {/* Anel de pulso brilhante */}
            <span className="absolute inset-0 rounded-full bg-[var(--brand)]/20 animate-ping pointer-events-none"></span>
            
            {/* Logo oficial do aplicativo */}
            <div className="w-10 h-10 flex-shrink-0">
              <img 
                src="/icon-192.png" 
                alt="Logo oficial do Agendei" 
                className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-105" 
              />
            </div>

            {/* Texto de ação */}
            <div className="text-left flex flex-col justify-center leading-none">
              <span className="text-[12px] font-black uppercase tracking-wider text-[var(--text-main)] mb-0.5">
                Instalar
              </span>
              <span className="text-[7.5px] font-bold uppercase tracking-widest text-[var(--brand)]">
                Aplicativo
              </span>
            </div>
          </button>
        </div>
      )}

      {isInstallHelpModalOpen && (
        <div className="fixed inset-0 z-[3000] flex flex-col justify-end sm:justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsInstallHelpModalOpen(false)}></div>
          <div className="bg-[var(--bg-card-alt)] rounded-[2rem] p-6 w-full max-w-sm mx-auto relative shadow-2xl border-2 border-[var(--brand)]/30 mb-4 sm:mb-0 animate-in slide-in-from-bottom-10">
            <button onClick={() => setIsInstallHelpModalOpen(false)} className="absolute top-4 right-4 text-[var(--text-main)]/50 hover:text-[var(--text-main)] transition-colors">
              <X size={24} />
            </button>
            
            <div className="flex flex-col items-center mb-6">
              <img src="/icon-192.png" alt="Logo oficial do Agendei" className="w-16 h-16 rounded-full shadow-[0_0_15px_rgba(253,216,53,0.3)] object-cover mb-2" />
              <h3 className="text-xl font-black uppercase text-[var(--text-main)] text-center tracking-tight leading-none mt-1">Como Instalar</h3>
              <p className="text-[10px] text-[var(--brand)] font-black uppercase tracking-[0.25em] mt-1.5">Instalação Manual Rápida</p>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl mb-6">
              <button 
                onClick={() => setInstallHelpTab('ios')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${installHelpTab === 'ios' ? 'bg-[var(--brand)] text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Smartphone size={12} /> iPhone/iPad
              </button>
              <button 
                onClick={() => setInstallHelpTab('android')}
                className={`flex-1 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${installHelpTab === 'android' ? 'bg-[var(--brand)] text-black shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <Monitor size={12} /> Android/Outros
              </button>
            </div>

            {installHelpTab === 'ios' ? (
              <div className="space-y-4 text-[13px] font-semibold text-blue-100">
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Abra no navegador <strong className="text-white">Safari</strong> e toque no botão <strong className="text-white">Compartilhar</strong> <Share2 size={14} className="inline mx-1 align-text-bottom text-[var(--brand)]" /> (barra inferior).</span>
                </p>
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Role para baixo e toque em <strong className="text-white">"Adicionar à Tela de Início"</strong> <Plus size={14} className="inline mx-1 align-text-bottom text-[var(--brand)]" />.</span>
                </p>
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Toque em <strong className="text-white">"Adicionar"</strong> no canto superior direito para confirmar.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-[13px] font-semibold text-blue-100">
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Toque nos <strong className="text-white">Três Pontinhos</strong> <MoreVertical size={14} className="inline mx-1 align-text-bottom text-[var(--brand)]" /> no canto superior direito do seu navegador Chrome.</span>
                </p>
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Selecione <strong className="text-white">"Instalar aplicativo"</strong> ou <strong className="text-white">"Adicionar à Tela Inicial"</strong> <Plus size={14} className="inline mx-1 align-text-bottom text-[var(--brand)]" />.</span>
                </p>
                <p className="flex items-start gap-3 bg-white/5 p-4 rounded-xl">
                  <span className="bg-[var(--bg-card)] text-[var(--brand)] w-6 h-6 rounded-full flex items-center justify-center font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Confirme clicando em <strong className="text-white">"Instalar"</strong> ou <strong className="text-white">"Adicionar"</strong> para criar o ícone.</span>
                </p>
              </div>
            )}
            
            <button 
              onClick={() => {
                setIsInstallHelpModalOpen(false);
                setHasInstalled(true);
                setShowInstallBanner(false);
                localStorage.setItem('agendavoz_installed', 'true');
                localStorage.setItem('agendavoz_install_dismissed', 'true');
              }}
              className="w-full mt-6 bg-[var(--brand)] text-black py-4 rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

    <div className="min-h-screen flex flex-col pb-0 px-4 sm:px-6 md:px-8 lg:max-w-6xl max-w-2xl mx-auto w-full transition-all duration-300">
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
        <p className="text-[13px] sm:text-[11.5px] font-semibold text-[var(--text-main)] uppercase tracking-[0.3em] sm:tracking-[0.4em] mt-1.5 text-center">Agendamento Inteligente</p>
        {!isPro && (
          <button 
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="absolute top-4 left-0 sm:left-2 flex items-center gap-1 sm:gap-1.5 px-2 py-1.5 sm:px-3 sm:py-2 bg-[var(--brand)] rounded-full text-[9px] sm:text-[11px] font-semibold text-black uppercase tracking-wide hover:bg-white transition-all shadow-[0_0_15px_rgba(253,216,53,0.5)]"
          >
            <Sparkles size={12} className="sm:w-3.5 sm:h-3.5" /> Assinar
          </button>
        )}

        <div className="absolute top-4 right-0 sm:right-2 flex flex-col items-end gap-2 z-10">
          <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 glass-panel rounded-full text-[12px] sm:text-[10px] font-semibold text-[var(--text-main)] uppercase tracking-wide hover:bg-[var(--brand)] transition-colors">
            <Globe size={13} /> {selectedLang.label}
          </button>
          {notificationPermission !== 'granted' && (
            <button 
              onClick={requestNotificationPermission}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 border border-red-500/50 rounded-full text-[9px] sm:text-[10px] font-bold text-red-400 uppercase tracking-wide hover:bg-red-500 hover:text-white transition-colors"
            >
              <Bell size={12} className="animate-pulse" /> Ativar Alertas
            </button>
          )}
        </div>
      </header>

      {activeTab === 'home' ? (
        <main className="space-y-4 animate-in fade-in duration-500">
          {!isPro && (
            <section className="animate-in fade-in slide-in-from-top-4 duration-700">
              <AdBanner />
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:items-start">
            <div className="w-full lg:col-span-5 flex flex-col gap-4">
              <section className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <CalendarView 
                  appointments={appointments} 
                  selectedDate={selectedDate} 
                  onDateSelect={setSelectedDate} 
                  onDateDoubleClick={(date) => {
                    setSelectedDate(date);
                    setEditingAppointment(null);
                    setManualForm({ title: '', date: format(date, 'yyyy-MM-dd'), time: '09:00', duration: 30, description: '', reminders: [10, 30, 60, 120, 1440], callAlert: true, location: '', category: 'Geral' });
                    setIsManualModalOpen(true);
                  }}
                  onDelete={() => {}} 
                  selectedLanguage={selectedLang} 
                />
              </section>
            </div>

            <div className="w-full lg:col-span-7 flex flex-col gap-4 relative min-h-[400px]">
              <section className="space-y-3 w-full pb-28">
                <div className="flex items-center justify-between px-1 sm:px-2">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-2 h-5 bg-[var(--brand)] rounded-full shadow-[0_0_15px_rgba(253,216,53,0.3)]"></div>
                    <h3 className="text-[11.5px] sm:text-[13px] font-semibold uppercase tracking-[0.15em] sm:tracking-wide text-[var(--text-main)]">Agenda do Dia</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedDayAppointments.length > 0 && (
                      <>
                        <button onClick={syncAllToFirestore} className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-hover)] shadow-sm transition-all" title="Sincronizar com a Base">
                          <RefreshCw size={18} className="sm:w-5 sm:h-5 text-blue-400" />
                        </button>
                        <button onClick={shareDayAgenda} className="w-[38px] h-[38px] sm:w-[46px] sm:h-[46px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--bg-hover)] shadow-sm transition-all" title="Compartilhar Agenda do Dia">
                          <Share2 size={18} className="sm:w-5 sm:h-5 text-blue-300" />
                        </button>
                      </>
                    )}
                    <button onClick={openCreateModal} className="w-[46px] h-[46px] sm:w-[55px] sm:h-[55px] bg-[var(--bg-card)] border-2 border-[var(--brand)] rounded-full btn-press flex items-center justify-center text-[var(--text-main)] hover:bg-[var(--brand)] shadow-md transition-all">
                      <Plus size={23} strokeWidth={3} className="sm:w-7 sm:h-7" />
                    </button>
                  </div>
                </div>

                <div className={selectedDayAppointments.length === 0 ? "w-full" : "grid grid-cols-1 xl:grid-cols-2 gap-3"}>
                  {selectedDayAppointments.length === 0 ? (
                    <div className="py-20 bg-[#FEF9C3] rounded-[2.5rem] flex flex-col items-center justify-center border-dashed border-2 border-yellow-300 shadow-xl w-full">
                      <LayoutGrid size={36} className="mb-4 text-[#FDD835]/40" />
                      <p className="text-[11.5px] font-bold uppercase tracking-[0.4em] text-black/30">Nada agendado</p>
                    </div>
                  ) : (
                    selectedDayAppointments.map(renderAppCard)
                  )}
                </div>
              </section>

              <div className="hidden lg:block absolute bottom-0 left-0 w-full z-10 pt-8 pb-4">
                <VoiceAssistant 
                  onAddAppointment={handleAddAppointment} 
                  appointments={appointments}
                  currentSelectedDate={selectedDate}
                  selectedLanguage={selectedLang}
                  isDesktopStandalone={true}
                />
              </div>
            </div>
          </div>
        </main>
      ) : activeTab === 'agenda' ? (
        <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div ref={agendaListRef} className="bg-[var(--bg-panel)] p-4 sm:p-6 -mx-2 sm:-mx-4 rounded-[2.5rem]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 px-2">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-[var(--brand)]/10 rounded-2xl flex items-center justify-center text-[var(--brand)] shadow-inner">
                      <CalendarIcon size={28} />
                   </div>
                   <div className="flex flex-col">
                     <h2 className="text-xl sm:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight leading-none">
                       Compromissos <br className="sm:hidden" /> Agendados
                     </h2>
                     <div className="flex items-center gap-3 mt-3">
                       <button 
                         onClick={navigateToPrevAppointment}
                         className="w-10 h-10 flex items-center justify-center bg-white/10 border border-yellow-300/30 rounded-xl hover:bg-white/20 text-[#FDD835] transition-all shadow-sm active:scale-95"
                       >
                         <ChevronLeft size={22} strokeWidth={3} />
                       </button>
                       <div className="bg-white/5 px-4 py-1.5 rounded-lg border border-white/5">
                         <span className="text-[13px] font-black text-[#FDD835] uppercase tracking-widest">
                           {format(selectedDate, 'dd/MM/yyyy')}
                         </span>
                       </div>
                       <button 
                         onClick={navigateToNextAppointment}
                         className="w-10 h-10 flex items-center justify-center bg-white/10 border border-yellow-300/30 rounded-xl hover:bg-white/20 text-[#FDD835] transition-all shadow-sm active:scale-95"
                       >
                         <ChevronRight size={22} strokeWidth={3} />
                       </button>
                     </div>
                   </div>
                </div>
                {selectedDayAppointments.length > 0 && (
                  <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap" data-exclude-download="true">
                    <button onClick={() => setIsMirrorModalOpen(true)} className="w-12 h-12 bg-[var(--bg-card)] border border-[var(--brand)]/30 rounded-2xl flex items-center justify-center text-[var(--brand)] hover:bg-[var(--brand)] hover:text-black shadow-lg transition-all transform hover:-translate-y-1" title="Espelhamento Executivo">
                      <Monitor size={20} />
                    </button>
                     <button onClick={syncAllToFirestore} className="w-12 h-12 bg-[var(--bg-card)] border border-blue-400/30 rounded-2xl flex items-center justify-center text-blue-400 hover:bg-blue-400 hover:text-white shadow-lg transition-all transform hover:-translate-y-1" title="Sincronizar com a Base">
                       <RefreshCw size={20} />
                     </button>
                     <button onClick={downloadDayAgendaJpeg} className="w-12 h-12 bg-[var(--bg-card)] border border-green-400/30 rounded-2xl flex items-center justify-center text-green-400 hover:bg-green-400 hover:text-white shadow-lg transition-all transform hover:-translate-y-1" title="Baixar Agenda em Imagem">
                      <Download size={20} />
                    </button>
                    <button onClick={shareDayAgenda} className="w-12 h-12 bg-[var(--bg-card)] border border-purple-400/30 rounded-2xl flex items-center justify-center text-purple-400 hover:bg-purple-400 hover:text-white shadow-lg transition-all transform hover:-translate-y-1" title="Compartilhar Agenda do Dia">
                      <Share2 size={20} />
                    </button>
                  </div>
                )}
              </div>
             
             <div className="w-full bg-[#FEF9C3] rounded-[2rem] border-t-4 border-[#FDD835] shadow-xl overflow-hidden">
               <div className="max-h-[55vh] sm:max-h-[65vh] overflow-y-auto custom-scrollbar">
                             {selectedDayAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                                    <p className="text-black/40 text-[13px] font-bold uppercase text-center tracking-wider">Nenhum compromisso marcado para este dia.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {selectedDayAppointments.map((app, index, arr) => {
                     const isReport = app.hasReport;
                     return (
                     <div key={app.id} 
                         onClick={() => isReport ? setSelectedReport(reports.find(r => r.appointmentId === app.id) || null) : setActiveAppointmentId(app.id)}
                         className={`p-5 sm:p-6 cursor-pointer hover:bg-yellow-100/50 transition-colors ${index !== arr.length - 1 ? 'border-b border-yellow-200' : ''}`}>
                         
                         <div className="space-y-4">
                             <div className="flex items-start justify-between">
                               <h4 className="text-[16px] sm:text-[17px] font-bold text-black uppercase tracking-tight leading-tight">
                                 · {app.time} - {app.title} ({app.duration} min)
                               </h4>
                             </div>
                             
                             <div className="grid grid-cols-1 gap-2.5">
                               <div className="flex items-center gap-3">
                                 <span className="text-[11px] font-bold text-black/50 uppercase tracking-[0.1em] min-w-[70px]">Status:</span>
                                 <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${isReport ? 'bg-green-600/20 text-green-700' : 'bg-black/10 text-black/60'}`}>
                                   {isReport ? 'DOCUMENTADO' : 'AGENDADO'}
                                 </span>
                               </div>
                               
                               <div className="flex items-center gap-3">
                                 <span className="text-[11px] font-bold text-black/50 uppercase tracking-[0.1em] min-w-[70px]">Categoria:</span>
                                 <span className="text-[11px] font-bold text-black/80 uppercase tracking-wide">{app.category || 'Geral'}</span>
                               </div>
                               
                               <div className="flex items-center gap-3">
                                 <span className="text-[11px] font-bold text-black/50 uppercase tracking-[0.1em] min-w-[70px]">Local:</span>
                                 <span className="text-[11px] font-bold text-black/80 uppercase tracking-wide">{app.location || 'Não Definido'}</span>
                               </div>

                               {app.description && (
                                 <div className="flex items-start gap-3 mt-1">
                                   <span className="text-[11px] font-bold text-black/50 uppercase tracking-[0.1em] min-w-[70px] mt-0.5">Assuntos:</span>
                                   <p className="text-[11px] text-black/80 font-bold uppercase leading-relaxed">
                                     {app.description}
                                   </p>
                                 </div>
                               )}
                             </div>
                         </div>
                     </div>
                     );
                  })}
                </div>
              )}
                </div>
           </div>
           </div>
        </main>
      ) : activeTab === 'history' ? (
        <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <Clock size={24} className="text-[var(--brand)]" />
              <h2 className="text-xl font-semibold text-[var(--text-main)] uppercase tracking-wide">Histórico de Memórias</h2>
           </div>
           <div className="space-y-4">
              {appointments.filter(a => a.hasReport).sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()).map(renderAppCard)}
              {appointments.filter(a => a.hasReport).length === 0 && (
                <p className="text-[var(--text-main)]/50 text-[13px] font-semibold uppercase text-center py-10">Nenhuma memória executiva gerada ainda.</p>
              )}
           </div>
        </main>
      ) : activeTab === 'alerts' ? (
        <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <Bell size={24} className="text-[var(--brand)]" />
              <h2 className="text-xl font-semibold text-[var(--text-main)] uppercase tracking-wide">Central de Avisos</h2>
           </div>
           <div className="space-y-4">
              {appointments.filter(a => a.potentialConflict || a.callAlert).length === 0 ? (
                 <p className="text-[var(--text-main)]/50 text-[13px] font-semibold uppercase text-center py-10">Nenhum aviso pendente</p>
              ) : (
                appointments.filter(a => a.potentialConflict || a.callAlert).map(app => (
                   <div key={app.id} className="bg-[var(--bg-card-alt)] border-l-4 border-l-[#EF5350] p-4 rounded-xl flex items-start gap-4">
                      <div className="bg-red-500/20 p-2 rounded-lg">
                        <Bell size={20} className="text-red-500" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-[var(--text-main)] uppercase">{app.title}</h4>
                        <p className="text-[10px] text-[var(--text-main)]/50 uppercase">{app.date} às {app.time}</p>
                        {app.potentialConflict && <p className="text-[11px] text-red-500 font-semibold mt-1">⚠️ Conflito de Horário Potencial</p>}
                        {app.callAlert && <p className="text-[11px] text-[var(--brand)] font-semibold mt-1">📞 Lembrete de Ligação Ativo</p>}
                      </div>
                   </div>
                ))
              )}
           </div>
        </main>
      ) : activeTab === 'settings' ? (
         <main className="flex-1 flex flex-col pt-8 pb-20 px-2 animate-in fade-in duration-500">
           <div className="flex items-center gap-3 mb-6">
              <Settings size={24} className="text-[var(--brand)]" />
              <h2 className="text-xl font-semibold text-[var(--text-main)] uppercase tracking-wide">Ajustes</h2>
           </div>
           
           <div className="space-y-6">
             <div className="glass-panel p-5 rounded-2xl border-2 border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-semibold text-[var(--brand)] uppercase mb-4 tracking-wide">Conta</h3>
                <div className="flex justify-between items-center bg-[var(--bg-card-alt)] p-4 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)] uppercase">Plano Pro</p>
                    <p className="text-[10px] text-[var(--text-main)]/50 uppercase">{isPro ? 'Ativo' : 'Não Assinante'}</p>
                  </div>
                  {!isPro && (
                    <button onClick={() => setIsSubscriptionModalOpen(true)} className="px-4 py-2 bg-[var(--brand)] text-black text-[10px] font-semibold uppercase rounded-lg">Assinar</button>
                  )}
                </div>
             </div>

             <div className="glass-panel p-5 rounded-2xl border-2 border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-semibold text-[var(--brand)] uppercase mb-4 tracking-wide">Preferências</h3>
                
                <div className="flex justify-between items-center bg-[var(--bg-card-alt)] p-4 rounded-xl mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)] uppercase">Idioma Base</p>
                  </div>
                  <select 
                    value={selectedLang.id} 
                    onChange={e => setSelectedLang(LANGUAGES.find(l => l.id === e.target.value) || LANGUAGES[0])}
                    className="bg-[var(--bg-panel-alt)] text-[var(--text-main)] text-[13px] p-2 uppercase font-semibold tracking-wide rounded border border-[var(--border-color)]"
                  >
                    {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
             </div>

             <div className="glass-panel p-5 rounded-2xl border-2 border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-semibold text-[var(--brand)] uppercase mb-4 tracking-wide">Aplicativo</h3>
                <div className="flex justify-between items-center bg-[var(--bg-card-alt)] p-4 rounded-xl mb-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-main)] uppercase">Instalar no Dispositivo</p>
                    <p className="text-[10px] text-[var(--text-muted)] max-w-[180px]">Adicione à tela inicial para acesso offline.</p>
                  </div>
                  <button onClick={handleInstallClick} className="px-4 py-2 bg-[var(--brand)] text-black text-[10px] font-semibold uppercase rounded-lg shadow-sm hover:opacity-90 transition-all">Instalar</button>
                </div>
             </div>
             
             <div className="glass-panel p-5 rounded-2xl border-2 border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-semibold text-[var(--brand)] uppercase mb-4 tracking-wide">Aparência Visual</h3>
                <div className="flex flex-col gap-3">
                  {[
                    { id: 'original', name: 'Original', description: 'Azul Escuro (Padrão)', colors: ['#0A1931', '#1A2B4C', '#FDD835'] },
                    { id: 'obsidian', name: 'Obsidian', description: 'Grafite e Ciano (Tecnológico)', colors: ['#0f172a', '#1e293b', '#0ea5e9'] },
                    { id: 'forest', name: 'Forest', description: 'Esmeralda e Verde (Calmo)', colors: ['#022c22', '#064e3b', '#34d399'] },
                    { id: 'wine', name: 'Wine', description: 'Vinho Escuro e Rosê (Elegante)', colors: ['#2e0310', '#4c0519', '#f43f5e'] },
                    { id: 'light', name: 'Light', description: 'Branco e Slate (Leve)', colors: ['#F8FAFC', '#FFFFFF', '#D97706'] }
                  ].map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => setTheme(t.id)}
                      className={`flex items-center justify-between bg-[var(--bg-card-alt)] p-4 rounded-xl transition-all border-2 ${theme === t.id ? 'border-[var(--brand)]' : 'border-transparent hover:border-[var(--border-subtle)]'}`}
                    >
                      <div className="flex flex-col items-start">
                        <p className="text-sm font-semibold text-[var(--text-main)] uppercase">{t.name}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{t.description}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {t.colors.map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-black/20" style={{ backgroundColor: c }}></div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
             </div>

             <div className="glass-panel p-5 rounded-2xl border-2 border-[var(--border-subtle)]">
                <h3 className="text-[11px] font-semibold text-[var(--brand)] uppercase mb-4 tracking-wide">Privacidade e Termos</h3>
                <div className="flex justify-between items-center bg-[var(--bg-card-alt)] p-4 rounded-xl">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-semibold text-[var(--text-main)] uppercase">Termos de Responsabilidade</p>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-tight">Status: {termsAccepted ? 'Aceito' : 'Pendente'}</p>
                  </div>
                  <button 
                   onClick={() => setIsTermsModalOpen(true)} 
                   className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-semibold uppercase rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                  >
                    Ver Termos
                  </button>
                </div>
             </div>

             <div className="glass-panel p-5 rounded-2xl border-2 border-red-500/20">
                <h3 className="text-[11px] font-semibold text-red-500 uppercase mb-4 tracking-wide">Zona de Perigo</h3>
                <button onClick={() => setDeleteConfirmation({ type: 'all_data', id: 'global' })} className="w-full py-4 bg-red-500/10 text-red-500 border border-red-500/30 rounded-xl text-[13px] font-semibold uppercase tracking-wide hover:bg-red-500 hover:text-[var(--text-main)] transition-all">Apagar Todos os Dados</button>
             </div>
           </div>
        </main>
      ) : null}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-[var(--border-subtle)] pb-6 pt-3 px-8 flex justify-between items-center z-50 lg:max-w-6xl max-w-2xl mx-auto transition-all duration-300">
        <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-[var(--brand)]' : 'text-[#9E9E9E] hover:text-[var(--text-main)]'}`}>
          <Home size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold">Início</span>
        </button>
        <button onClick={() => setActiveTab('agenda')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'agenda' ? 'text-[var(--brand)]' : 'text-[#9E9E9E] hover:text-[var(--text-main)]'}`}>
          <CalendarIcon size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold">Agenda</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-[var(--brand)]' : 'text-[#9E9E9E] hover:text-[var(--text-main)]'}`}>
          <Clock size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold">Histórico</span>
        </button>
        <button onClick={() => setActiveTab('alerts')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'alerts' ? 'text-[var(--brand)]' : 'text-[#9E9E9E] hover:text-[var(--text-main)]'}`}>
          <Bell size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold">Avisos</span>
        </button>
        <button onClick={() => setActiveTab('settings')} className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-[var(--brand)]' : 'text-[#9E9E9E] hover:text-[var(--text-main)]'}`}>
          <Settings size={28} strokeWidth={2.5} />
          <span className="text-[11px] font-semibold">Ajustes</span>
        </button>
      </nav>

      {activeReminder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setActiveReminder(null)}></div>
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#FDD835] text-center">
            <div className="w-20 h-20 bg-[var(--brand)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Bell size={32} className="text-[var(--brand)] animate-bounce" />
            </div>
            <h3 className="text-2xl font-semibold uppercase text-[var(--text-main)] mb-2">Lembrete</h3>
            <p className="text-blue-200 text-sm font-medium mb-6">
              O compromisso <strong className="text-[var(--brand)]">{activeReminder.title}</strong> começa em {activeReminder.timeStr}!
            </p>
            <button 
              onClick={() => setActiveReminder(null)}
              className="w-full bg-[var(--brand)] py-4 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-black shadow-lg hover:bg-white transition-all"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {incomingCall && (
        <div className="fixed inset-0 z-[1500] flex flex-col p-6 animate-in slide-in-from-bottom-full duration-500 bg-[var(--bg-panel)] shadow-2xl">
          <div className="flex-1 flex flex-col items-center justify-center pt-20">
            <div className="w-32 h-32 bg-[var(--brand)]/20 rounded-full flex items-center justify-center mb-8 relative">
              <div className="absolute inset-0 bg-[var(--brand)]/20 rounded-full animate-ping"></div>
              <div className="w-24 h-24 bg-[#D4AF37] rounded-full flex items-center justify-center relative z-10 shadow-[0_0_40px_rgba(212,175,55,0.4)]">
                 <PhoneCall size={40} className="text-[var(--text-inv)] animate-pulse" />
              </div>
            </div>
            <h2 className="text-3xl font-semibold text-[var(--text-main)] text-center mb-2 px-4 shadow-sm">{incomingCall.app.title}</h2>
            <p className="text-xl text-[var(--brand)] font-semibold mb-2">Começa em {incomingCall.timeStr}</p>
            <p className="text-blue-200 text-sm mb-12">Chamada de Alerta - Agendei</p>
          </div>
          
          <div className="pb-16 flex justify-around px-8">
            <button 
              onClick={() => setIncomingCall(null)}
              className="w-20 h-20 bg-red-500 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-red-600 transition-transform active:scale-95 text-[var(--text-main)]"
            >
              <PhoneCall size={28} className="rotate-[135deg] mb-1" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Recusar</span>
            </button>
            <button 
              onClick={() => {
                setIncomingCall(null);
                setActiveTab('reports');
              }}
              className="w-20 h-20 bg-green-500 rounded-full flex flex-col items-center justify-center shadow-lg hover:bg-green-600 transition-transform active:scale-95 animate-bounce text-[var(--text-main)] pt-1"
            >
              <PhoneCall size={28} className="mb-1" />
              <span className="text-[10px] uppercase font-semibold tracking-wider">Aceitar</span>
            </button>
          </div>
        </div>
      )}

      {isManualModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsManualModalOpen(false)}></div>
          <div className="bg-[var(--bg-card)] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#D4AF37] max-h-[90vh] overflow-y-auto custom-scrollbar">
            <h3 className="text-xl sm:text-2xl font-semibold uppercase text-[var(--text-main)] mb-6 sm:mb-8">{editingAppointment ? 'Editar' : 'Novo'} Compromisso</h3>
            
            {!editingAppointment && (
              <div className="mb-8 p-4 bg-[var(--brand)]/5 rounded-2xl border border-[var(--brand)]/20">
                <p className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wide text-center mb-2">Ou agende por voz:</p>
                <p className="text-[12px] text-[var(--text-muted)] text-center mb-4 italic">Dica: Diga o horário e o compromisso (ex: "Reunião às 14h")</p>
                <VoiceAssistant 
                  onAddAppointment={(app) => {
                    handleAddAppointment(app);
                    setIsManualModalOpen(false);
                    return true;
                  }} 
                  onFillForm={(parsedFields) => {
                    setManualForm(prev => ({
                      ...prev,
                      title: parsedFields.title ? parsedFields.title.toUpperCase() : prev.title,
                      date: parsedFields.date || prev.date,
                      time: parsedFields.time || prev.time,
                      duration: parsedFields.duration || prev.duration,
                      description: parsedFields.description ? parsedFields.description.toUpperCase() : prev.description,
                      location: parsedFields.location ? parsedFields.location.toUpperCase() : prev.location,
                      category: parsedFields.category || prev.category,
                      callAlert: parsedFields.callAlert !== undefined ? parsedFields.callAlert : prev.callAlert
                    }));
                  }}
                  appointments={appointments} 
                  currentSelectedDate={selectedDate} 
                  selectedLanguage={selectedLang}
                  isInsideModal={true}
                />
              </div>
            )}

            <form onSubmit={handleManualSave} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">O que será feito?</label>
                <input 
                  autoFocus 
                  type="text" 
                  placeholder="EX: REUNIÃO DE VENDAS" 
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)] focus:border-[var(--brand)] outline-none transition-all" 
                  value={manualForm.title} 
                  onChange={e => setManualForm({...manualForm, title: e.target.value.toUpperCase()})} 
                  required 
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                   <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Data</label>
                   <input type="date" className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)] uppercase" value={manualForm.date} onChange={e => setManualForm({...manualForm, date: e.target.value})} required />
                </div>
                <div className="space-y-2">
                   <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Hora</label>
                   <input type="time" className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)]" value={manualForm.time} onChange={e => setManualForm({...manualForm, time: e.target.value})} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-2">
                   <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Duração</label>
                   <input type="number" placeholder="MIN" className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)]" value={manualForm.duration} onChange={e => setManualForm({...manualForm, duration: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                   <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Categoria</label>
                   <select className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)] appearance-none" value={manualForm.category} onChange={e => setManualForm({...manualForm, category: e.target.value})}>
                     <option value="Geral">GERAL</option>
                     <option value="Saúde">SAÚDE</option>
                     <option value="Trabalho">TRABALHO</option>
                     <option value="Pessoal">PESSOAL</option>
                     <option value="Urgente">URGENTE</option>
                   </select>
                </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Local</label>
                 <input type="text" placeholder="EX: QG, GOOGLE MEET" className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)] uppercase" value={manualForm.location} onChange={e => setManualForm({...manualForm, location: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1">Pautas da Reunião (Opcional)</label>
                <textarea 
                  placeholder="EX: DISCUTIR METAS, APROVAR ORÇAMENTO..." 
                  className="w-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl px-6 py-4 text-[13px] font-semibold text-[var(--text-main)] focus:border-[var(--brand)] outline-none transition-all resize-none h-24" 
                  value={manualForm.description} 
                  onChange={e => setManualForm({...manualForm, description: e.target.value.toUpperCase()})} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1 flex items-center gap-1">
                  <Bell size={10} /> Lembretes
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: 10, label: '10 MIN' },
                    { value: 30, label: '30 MIN' },
                    { value: 60, label: '1 HORA' },
                    { value: 120, label: '2 HORAS' },
                    { value: 1440, label: '1 DIA' }
                  ].map(opt => {
                    const isActive = manualForm.reminders.includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setManualForm(prev => {
                            const curr = prev.reminders || [];
                            return {
                              ...prev,
                              reminders: isActive ? curr.filter(r => r !== opt.value) : [...curr, opt.value].sort((a,b) => b - a)
                            };
                          });
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase transition-all ${
                          isActive 
                            ? 'bg-[var(--brand)] text-black shadow-md' 
                            : 'bg-[var(--bg-card)] text-slate-400 border border-[var(--border-color)] hover:border-[var(--brand)]/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[12px] font-semibold text-blue-200 uppercase tracking-wide ml-1 flex items-center gap-1">
                  <PhoneCall size={10} /> Alerta de Ligação
                </label>
                <button
                  type="button"
                  onClick={() => setManualForm(prev => ({ ...prev, callAlert: !prev.callAlert }))}
                  className={`w-full py-3 rounded-xl border-2 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase transition-all ${
                    manualForm.callAlert 
                      ? 'border-[#EF5350] bg-red-500/10 text-red-500' 
                      : 'border-[var(--border-color)] bg-[var(--bg-card)] text-slate-400 hover:border-[var(--brand)]/50'
                  }`}
                >
                  <PhoneCall size={14} className={manualForm.callAlert ? 'animate-pulse' : ''} />
                  Simular Ligação Antes do Evento
                </button>
              </div>
              
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-[var(--brand)] py-5 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-black shadow-lg hover:bg-[var(--bg-hover)] hover:text-[var(--text-main)] transition-all">Salvar Alterações</button>
                {editingAppointment && (
                  <button type="button" onClick={() => handleDeleteAppointment(null, editingAppointment.id)} className="w-full bg-[var(--bg-card)] border-2 border-red-50 py-4 rounded-2xl text-[12px] font-semibold uppercase tracking-wide text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2">
                    <Trash2 size={14} /> Excluir ou Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {isSubscriptionModalOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSubscriptionModalOpen(false)}></div>
          <div className="bg-[var(--bg-card)] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-[#FDD835] text-center">
            <div className="w-20 h-20 bg-[var(--brand)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles size={32} className="text-[var(--brand)]" />
            </div>
            <h3 className="text-2xl font-semibold uppercase text-[var(--text-main)] mb-2">Plano Pro</h3>
            <p className="text-blue-200 text-sm font-medium mb-6">
              Desbloqueie todos os recursos e remova os anúncios.
            </p>
            
            <div className="bg-[var(--bg-panel)] rounded-2xl p-6 mb-8 border-2 border-[var(--brand)]/30">
              <div className="text-[10px] font-semibold text-[var(--brand)] uppercase tracking-wide mb-1">Assinatura Mensal</div>
              <div className="text-4xl font-semibold text-[var(--text-main)]">R$ 9,90</div>
              <div className="text-[10px] text-[var(--text-main)]/40 font-semibold mt-1">COBRADO MENSALMENTE</div>
              
              <ul className="mt-6 space-y-3 text-left">
                <li className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-main)] uppercase">
                  <Check size={12} className="text-[var(--brand)]" /> Gravações Ilimitadas
                </li>
                <li className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-main)] uppercase">
                  <Check size={12} className="text-[var(--brand)]" /> Sem Anúncios
                </li>
                <li className="flex items-center gap-2 text-[10px] font-semibold text-[var(--text-main)] uppercase">
                  <Check size={12} className="text-[var(--brand)]" /> Suporte Prioritário
                </li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  setIsPro(true);
                  setIsSubscriptionModalOpen(false);
                  alert('Parabéns! Você agora é um usuário PRO.');
                }}
                className="w-full bg-[var(--brand)] py-5 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-black shadow-lg hover:bg-white transition-all"
              >
                Assinar Agora
              </button>
              <button 
                onClick={() => setIsSubscriptionModalOpen(false)}
                className="w-full py-2 text-[12px] font-semibold uppercase tracking-wide text-[var(--text-main)]/40 hover:text-[var(--text-main)] transition-all"
              >
                Talvez mais tarde
              </button>
            </div>
          </div>
        </div>
      )}

      {(activeAppointment || selectedReport) && (
        <div className="fixed inset-0 z-[450] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-0 sm:pb-8 animate-in slide-in-from-bottom duration-500">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }}></div>
          <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-t-[2.5rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] sm:max-h-[85vh] overflow-y-auto custom-scrollbar relative shadow-2xl border-t-8 border-t-[#0F52BA]">
            <div className="absolute top-4 sm:top-8 right-4 sm:right-8 flex items-center gap-2 z-10">
              {activeAppointment && !selectedReport && (
                <button onClick={(e) => handleDeleteAppointment(e, activeAppointment.id)} className="p-3 bg-red-50 rounded-2xl text-red-500 hover:text-red-700 hover:bg-red-100 transition-all" title="Excluir Compromisso"><Trash2 size={20}/></button>
              )}
              <button onClick={() => { setActiveAppointmentId(null); setSelectedReport(null); }} className="p-3 bg-[var(--bg-card)] rounded-2xl text-blue-300 hover:text-red-500 transition-all"><X size={20}/></button>
            </div>
            
            {activeAppointment && !selectedReport && (
              <MeetingManager 
                activeAppointment={activeAppointment} 
                onReportGenerated={handleReportGenerated} 
                selectedLanguage={selectedLang} 
                onTimerUpdate={(time) => setRecordingTimer(prev => prev ? {...prev, time} : null)}
                onRecordingStateChange={(isRecording) => setRecordingTimer(isRecording ? {id: activeAppointment.id, time: 0, isRecording: true} : null)}
              />
            )}

            {selectedReport && (
              <div className="space-y-10 pt-4 text-slate-900">
                <header className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-[var(--brand)] tracking-[0.4em] uppercase bg-[var(--brand)]/5 px-4 py-2 rounded-full inline-block">Resumo da Reunião</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleShareReport(selectedReport)} className="p-3 bg-[var(--bg-card)] rounded-xl text-[var(--text-main)] hover:bg-[var(--brand)] transition-all" title="Compartilhar"><Share2 size={18}/></button>
                      <button onClick={(e) => handleDeleteReport(e, selectedReport.appointmentId)} className="p-3 bg-[var(--bg-card)] rounded-xl text-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-all" title="Excluir apenas a Memória"><Trash2 size={18}/></button>
                      <button onClick={(e) => handleDeleteAppointment(e, selectedReport.appointmentId)} className="p-3 bg-red-50 rounded-xl text-red-500 hover:text-red-700 hover:bg-red-100 transition-all" title="Excluir Compromisso e Memória"><X size={18}/></button>
                    </div>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text-main)] uppercase leading-tight pr-16 sm:pr-0">{appointments.find(a => a.id === selectedReport.appointmentId)?.title}</h2>
                </header>

                <div className="space-y-6 sm:space-y-8">
                  <div id="report-content-word" className="bg-[var(--bg-card)] p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-2 border-[var(--brand)]/20 text-[13px] sm:text-[15px] text-blue-100 leading-relaxed shadow-inner markdown-body">
                    <Markdown>{selectedReport.markdownReport}</Markdown>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-4">
                   <button onClick={() => navigator.clipboard.writeText(selectedReport.markdownReport).catch(e => console.error("Clipboard error:", e))} className="py-4 sm:py-5 bg-[var(--bg-card)] rounded-[1.5rem] text-[10px] font-semibold uppercase text-[var(--text-main)] border-2 border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-all">Copiar Tudo</button>
                   <button onClick={() => handleDownloadPDF(selectedReport)} className="py-4 sm:py-5 bg-[var(--brand)] rounded-[1.5rem] text-[10px] font-semibold uppercase text-black shadow-xl hover:bg-[var(--bg-hover)] transition-all flex items-center justify-center gap-2">
                     <Download size={14} /> Baixar PDF
                   </button>
                   <button onClick={() => {
                     const htmlContent = document.getElementById('report-content-word')?.innerHTML || `<p>${selectedReport.markdownReport.replace(/\n/g, '<br/>')}</p>`;
                     const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Memoria</title><style>body { font-family: Arial, sans-serif; }</style></head><body>`;
                     const footer = "</body></html>";
                     const sourceHTML = header + htmlContent + footer;
                     const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
                     const fileDownload = document.createElement("a");
                     document.body.appendChild(fileDownload);
                     fileDownload.href = source;
                     fileDownload.download = `Memoria_Executiva.doc`;
                     fileDownload.click();
                     document.body.removeChild(fileDownload);
                   }} className="py-4 sm:py-5 bg-blue-600 rounded-[1.5rem] text-[10px] font-semibold uppercase text-white shadow-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                     <FileText size={14} /> Exportar Word
                   </button>
                   <button onClick={() => handleShareReport(selectedReport)} className="py-4 sm:py-5 bg-[var(--bg-panel)] rounded-[1.5rem] text-[10px] font-semibold uppercase text-[var(--text-main)] shadow-xl hover:bg-[var(--brand)] transition-all flex items-center justify-center gap-2">
                     <Share2 size={14} /> Enviar
                   </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {deleteConfirmation && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmation(null)}></div>
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-10 w-full max-w-sm relative shadow-2xl border-t-8 border-t-red-500 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} className="text-red-500" />
            </div>
            <h3 className="text-2xl font-semibold uppercase text-[var(--text-main)] mb-4">Confirmar Exclusão</h3>
            <p className="text-[13px] font-semibold text-slate-500 mb-8">
              {deleteConfirmation.type === 'appointment' 
                ? 'Deseja realmente excluir este compromisso e todos os seus dados?' 
                : deleteConfirmation.type === 'report'
                  ? 'Deseja realmente excluir a memória desta reunião? O compromisso será mantido.'
                  : deleteConfirmation.type === 'all_data'
                    ? 'Deseja realmente APAGAR TODOS OS DADOS da sua agenda? Esta ação não pode ser desfeita.'
                    : 'Deseja realmente desativar o espelhamento? O link atual parará de funcionar.'}
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmDeletion} className="w-full bg-red-500 py-5 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-[var(--text-main)] shadow-lg hover:bg-red-600 transition-all">
                Sim, Excluir
              </button>
              <button onClick={() => setDeleteConfirmation(null)} className="w-full bg-[var(--bg-card)] py-4 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-all">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {isMirrorModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsMirrorModalOpen(false)}></div>
          <div className="bg-[var(--bg-card-alt)] rounded-[2.5rem] p-8 w-full max-w-sm relative shadow-2xl border border-[var(--brand)]/30 text-center overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[var(--brand)]"></div>
            
            <div className="w-20 h-20 bg-[var(--brand)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Monitor size={36} className="text-[var(--brand)]" />
            </div>
            
            <h3 className="text-2xl font-semibold uppercase text-[var(--text-main)] mb-2 tracking-tighter">Espelhamento</h3>
            <p className="text-[11px] font-semibold text-[var(--text-main)]/50 mb-8 uppercase tracking-wide leading-relaxed">
              Compartilhe sua agenda em tempo real com executivos e diretores.
            </p>

            {!mirrorId ? (
              <button 
                onClick={enableMirroring}
                className="w-full bg-[var(--brand)] py-5 rounded-2xl text-[11px] font-semibold uppercase tracking-wide text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Ativar Espelhamento
              </button>
            ) : (
              <div className="space-y-4">
                <div className="bg-[var(--bg-panel)] p-4 rounded-xl border border-[var(--border-subtle)] text-left mb-6">
                  <p className="text-[12px] font-semibold text-[var(--brand)] uppercase mb-1 tracking-wide">Link de Acesso</p>
                  <p className="text-[10px] text-[var(--text-main)]/40 break-all font-mono">{`${window.location.origin}/mirror/${mirrorId}`}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/mirror/${mirrorId}`).catch(e => console.error(e));
                      alert("Link copiado!");
                    }}
                    className="bg-white/5 py-4 rounded-xl text-[12px] font-semibold uppercase tracking-wide text-[var(--text-main)] border border-[var(--border-subtle)] hover:bg-white/10"
                  >
                    Copiar Link
                  </button>
                  <button 
                    onClick={syncAllToFirestore}
                    className="bg-blue-500/20 border border-blue-500/30 py-4 rounded-xl text-[12px] font-semibold uppercase tracking-wide text-blue-400 hover:bg-blue-500/30"
                  >
                    Sincronizar
                  </button>
                </div>
                
                <button 
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: 'Agendei - Espelhamento Executivo',
                        text: 'Acompanhe minha agenda em tempo real.',
                        url: `${window.location.origin}/mirror/${mirrorId}`
                      }).catch(e => console.error("Share error:", e));
                    }
                  }}
                  className="w-full bg-[var(--brand)] py-4 rounded-xl text-[12px] font-semibold uppercase tracking-wide text-black shadow-md hover:scale-105"
                >
                  Enviar Link para WhatsApp
                </button>
                
                <button 
                  onClick={() => setDeleteConfirmation({ type: 'mirror', id: 'mirror' })}
                  className="w-full mt-4 py-3 text-[12px] font-semibold uppercase text-red-500/50 hover:text-red-500 transition-colors"
                >
                  Desativar Serviço
                </button>
              </div>
            )}
            
            <button 
              onClick={() => setIsMirrorModalOpen(false)}
              className="mt-6 text-[10px] font-semibold text-[var(--text-main)]/30 uppercase tracking-wide hover:text-[var(--text-main)]"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {isTermsModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl"></div>
          <div className="bg-[var(--bg-card)] rounded-[2.5rem] p-8 sm:p-10 w-full max-w-lg relative shadow-2xl border-2 border-[var(--brand)]/30 max-h-[85vh] flex flex-col scale-in-center">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-[var(--brand)]/10 rounded-2xl flex items-center justify-center border border-[var(--brand)]/30">
                <Target size={32} className="text-[var(--brand)]" />
              </div>
              <div>
                <h3 className="text-xl font-black uppercase text-[var(--text-main)] tracking-tighter">AGENDEI</h3>
                <p className="text-[10px] text-[var(--brand)] font-black uppercase tracking-[0.3em]">Política de Uso</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6 mb-8 text-[var(--text-main)]/80 text-[13px] leading-relaxed text-justify uppercase font-medium tracking-tight">
              <p>Ao utilizar o sistema <span className="text-[var(--brand)] font-bold">AGENDEI | AGENDAMENTO INTELIGENTE</span>, você compreende e concorda com os seguintes termos:</p>
              
              <div className="space-y-4">
                <div className="p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border-subtle)]">
                  <p className="font-bold text-[var(--brand)] mb-1 tracking-widest">01. AGENDA DE VOZ</p>
                  <p className="text-[10px] leading-normal opacity-70">O SISTEMA PROCESSA SUA VOZ PARA CRIAR AGENDAMENTOS AUTOMÁTICOS. VOCÊ CONCORDA COM O USO DO MICROFONE.</p>
                </div>

                <div className="p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border-subtle)]">
                  <p className="font-bold text-[var(--brand)] mb-1 tracking-widest">02. PRIVACIDADE DE DADOS</p>
                  <p className="text-[10px] leading-normal opacity-70">SEUS COMPROMISSOS E GRAVAÇÕES DE ÁUDIO SÃO PROCESSADOS E MANTIDOS CONFIDENCIAIS, DE ACORDO COM AS BOAS PRÁTICAS DE PRIVACIDADE.</p>
                </div>

                <div className="p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border-subtle)]">
                  <p className="font-bold text-[var(--brand)] mb-1 tracking-widest">03. SINCRONIZAÇÃO</p>
                  <p className="text-[10px] leading-normal opacity-70">A SINCRONIZAÇÃO DE DADOS EM NUVEM É RESPONSABILIDADE DO SISTEMA, MAS RECOMENDA-SE MANTER BACKUPS MANUAIS.</p>
                </div>

                <div className="p-4 bg-[var(--bg-card-alt)] rounded-2xl border border-[var(--border-subtle)]">
                  <p className="font-bold text-[var(--brand)] mb-1 tracking-widest">04. USO PESSOAL</p>
                  <p className="text-[10px] leading-normal opacity-70">ESTE SOFTWARE É PARA SEU USO PESSOAL OU CORPORATIVO NOS TERMOS DA LICENÇA ESCOLHIDA.</p>
                </div>
              </div>

              <p className="text-[12px] italic opacity-50 text-center pt-4">ESTES TERMOS PODEM SER ATUALIZADOS A QUALQUER MOMENTO PARA MELHORIA DA SEGURANÇA E CONFORMIDADE.</p>
            </div>

            <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col gap-4">
              <button 
                onClick={handleAcceptTerms}
                className="w-full py-5 bg-[var(--brand)] text-black rounded-2xl font-black text-[13px] uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(253,216,53,0.3)] flex items-center justify-center gap-3"
              >
                <Check size={18} strokeWidth={3} /> LI E ACEITO OS TERMOS
              </button>
              
              {!termsAccepted && (
                <p className="text-[12px] text-red-500 font-bold uppercase text-center tracking-widest animate-pulse">A aceitação é obrigatória para continuar</p>
              )}
            </div>
          </div>
        </div>
      )}

      <RarbCodingLogo />
    </>
  );
};

export default App;
