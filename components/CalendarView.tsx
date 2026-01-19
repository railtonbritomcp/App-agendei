
import React from 'react';
import { Appointment } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, isToday as isDateToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  appointments: Appointment[];
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onDelete: (id: string) => void;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
}

const TRANSLATIONS: Record<string, any> = {
  pt: { today: 'Hoje', dom: 'DOM', seg: 'SEG', ter: 'TER', qua: 'QUA', qui: 'QUI', sex: 'SEX', sab: 'SAB' },
  en: { today: 'Today', dom: 'SUN', seg: 'MON', ter: 'TUE', qua: 'WED', qui: 'THU', sex: 'FRI', sab: 'SAT' },
};

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, selectedDate, onDateSelect, selectedLanguage }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const locale = selectedLanguage.locale;
  const t = TRANSLATIONS[selectedLanguage.id] || TRANSLATIONS.pt;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale });
  const calendarEnd = endOfWeek(monthEnd, { locale });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDayLabels = [t.dom, t.seg, t.ter, t.qua, t.qui, t.sex, t.sab];

  const checkDayHasAppointments = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    return appointments.filter(app => app.date === dayStr);
  };

  return (
    <div className="glass-card rounded-[3rem] overflow-hidden w-full mx-auto border-white/20 shadow-2xl">
      {/* HEADER CALENDÁRIO - ESMERALDA/BLUE */}
      <div className="bg-emerald-gradient p-8 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(255,215,0,0.15),transparent)]"></div>
        <div className="flex items-center justify-between mb-6 relative z-10">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"><ChevronLeft size={20} /></button>
          <div className="text-center">
            <h2 className="text-2xl font-black capitalize tracking-tighter leading-none">{format(currentMonth, 'MMMM', { locale })}</h2>
            <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.4em] block mt-1">{format(currentMonth, 'yyyy')}</span>
          </div>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-colors"><ChevronRight size={20} /></button>
        </div>
        <button onClick={() => { const now = new Date(); setCurrentMonth(now); onDateSelect(now); }} className="mx-auto flex items-center gap-3 px-8 py-3 bg-white rounded-2xl text-[10px] font-black uppercase text-emerald-900 shadow-xl active:scale-95 transition-all relative z-10">
          <CalendarIcon size={14} strokeWidth={3} /> {t.today}
        </button>
      </div>

      <div className="p-6 pb-10 bg-slate-900/40">
        <div className="grid grid-cols-7 mb-8 mt-4">
          {weekDayLabels.map((day, i) => (
            <div key={i} className="text-center text-[10px] font-black text-white/30 uppercase tracking-[0.2em] zoom-in">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-5">
          {days.map((day, idx) => {
            const isSelectedMonth = isSameDay(startOfMonth(day), monthStart);
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isDateToday(day);
            const dayAppointments = checkDayHasAppointments(day);
            const hasApps = dayAppointments.length > 0;

            return (
              <div key={idx} onClick={() => isSelectedMonth && onDateSelect(day)} 
                className={`flex flex-col items-center justify-center aspect-square relative ${!isSelectedMonth ? 'opacity-5 pointer-events-none' : 'cursor-pointer'}`}>
                <div className={`w-12 h-12 flex items-center justify-center text-sm font-black rounded-2xl transition-all duration-300
                  ${isSelected ? 'bg-gold-gradient text-slate-900 shadow-[0_8px_20px_rgba(255,215,0,0.4)] scale-110 z-10 border-2 border-white/40' : 
                    isToday ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40' : 'text-white/60 hover:text-white'}`}>
                  {format(day, 'd')}
                  {hasApps && !isSelected && isSelectedMonth && (
                    <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-yellow-400 rounded-full border-2 border-[#0f172a] shadow-md"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
