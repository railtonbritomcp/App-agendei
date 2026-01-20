
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

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, selectedDate, onDateSelect, selectedLanguage }) => {
  const [currentMonth, setCurrentMonth] = React.useState(new Date());
  const locale = selectedLanguage.locale;

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { locale });
  const calendarEnd = endOfWeek(monthEnd, { locale });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl w-full text-slate-800 animate-in fade-in duration-700">
      {/* Header do Calendário */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-sm border border-slate-100">
             <CalendarIcon size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#021526] uppercase tracking-tight">
              {format(currentMonth, 'MMMM', { locale })}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 -mt-1 tracking-widest">{format(currentMonth, 'yyyy')}</p>
          </div>
        </div>
        
        <div className="flex gap-2.5">
          <button 
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-[#021526] border border-slate-100 btn-press"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl hover:bg-slate-100 transition-all text-[#021526] border border-slate-100 btn-press"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Dias da Semana */}
      <div className="grid grid-cols-7 mb-4">
        {weekDayLabels.map((day, i) => (
          <div key={i} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-tighter">{day}</div>
        ))}
      </div>

      {/* Grade de Dias */}
      <div className="grid grid-cols-7 gap-2">
        {days.map((day, idx) => {
          const isSelectedMonth = isSameDay(startOfMonth(day), monthStart);
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isDateToday(day);
          const hasApps = appointments.some(app => app.date === format(day, 'yyyy-MM-dd'));

          return (
            <div 
              key={idx} 
              onClick={() => isSelectedMonth && onDateSelect(day)} 
              className={`
                aspect-square relative flex flex-col items-center justify-center rounded-xl transition-all duration-300
                ${!isSelectedMonth ? 'opacity-0 pointer-events-none' : 'cursor-pointer'}
                ${isSelected 
                  ? 'bg-[#021526] text-white shadow-lg scale-105 z-10 border border-amber-500/30' 
                  : isToday 
                    ? 'bg-slate-50 text-[#021526] border-2 border-[#021526]' 
                    : 'bg-white border border-slate-50 hover:bg-slate-50 hover:border-slate-200'}
              `}
            >
              <span className={`text-sm font-black ${isSelected ? 'text-white' : 'text-slate-800'}`}>
                {format(day, 'd')}
              </span>

              {/* Indicador de Compromisso - Ponto simples abaixo do número */}
              {hasApps && (
                <div className={`mt-0.5 w-1 h-1 rounded-full ${isSelected ? 'bg-amber-400' : 'bg-amber-500'}`}></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CalendarView;
