
import React, { useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type } from '@google/genai';
import { VoiceState, Appointment } from '../types';
import { createBlob } from '../utils/audio-helpers';
import { Mic, MicOff, Loader2, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

interface VoiceAssistantProps {
  onAddAppointment: (app: Omit<Appointment, 'id'>) => void;
  appointments: Appointment[];
  currentSelectedDate: Date;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
}

const TRANSLATIONS: Record<string, any> = {
  pt: { status: 'Ouvindo Comando', placeholder: 'Diga horário e pautas...', agendadoPara: 'Sucesso: Evento Agendado' },
  en: { status: 'Listening Command', placeholder: 'Speak time and topics...', agendadoPara: 'Success: Event Scheduled' },
};

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddAppointment, currentSelectedDate, selectedLanguage }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [lastActionStatus, setLastActionStatus] = useState<'success' | 'error' | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const t = TRANSLATIONS[selectedLanguage.id] || TRANSLATIONS.pt;

  const stopAssistant = useCallback(() => {
    if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current = null; }
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
    setVoiceState(VoiceState.IDLE); setTranscription('');
  }, []);

  const startAssistant = async () => {
    try {
      setLastActionStatus(null);
      setVoiceState(VoiceState.CONNECTING);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setVoiceState(VoiceState.LISTENING);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(scriptProcessor); scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                if (fc.name === 'create_appointment') {
                  onAddAppointment(fc.args as any); setLastActionStatus('success');
                  setTimeout(() => { setLastActionStatus(null); stopAssistant(); }, 2500);
                  sessionPromise.then(session => session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "Success" } } }));
                }
              }
            }
            if (message.serverContent?.inputTranscription) setTranscription(prev => prev + message.serverContent!.inputTranscription!.text);
          },
          onerror: () => setVoiceState(VoiceState.ERROR),
          onclose: () => stopAssistant()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `Crie agendamentos em ${format(currentSelectedDate, 'yyyy-MM-dd')}.`,
          tools: [{ 
            functionDeclarations: [{ 
              name: 'create_appointment', 
              parameters: { 
                type: Type.OBJECT, 
                properties: { 
                  title: { type: Type.STRING }, 
                  date: { type: Type.STRING }, 
                  time: { type: Type.STRING }, 
                  duration: { type: Type.NUMBER },
                  description: { type: Type.STRING }
                }, 
                required: ['title', 'date', 'time'] 
              } 
            }] 
          }],
          inputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setVoiceState(VoiceState.ERROR); }
  };

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] flex flex-col items-center gap-4 w-full max-w-sm px-4">
      {lastActionStatus === 'success' && (
        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-emerald-500 text-slate-900 shadow-2xl animate-in slide-in-from-bottom-4 duration-500 border-2 border-white/40">
          <CheckCircle2 size={20} strokeWidth={3} />
          <span className="text-[11px] font-black uppercase tracking-widest">{t.agendadoPara}</span>
        </div>
      )}
      {voiceState !== VoiceState.IDLE && (
        <div className="glass-card bg-slate-900/90 border-yellow-400/40 p-6 rounded-[2rem] shadow-2xl w-full animate-in fade-in zoom-in duration-300">
          <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_10px_#FFD700]" />
             <span className="text-[9px] font-black text-yellow-400 uppercase tracking-[0.3em]">{t.status}</span>
          </div>
          <p className="text-white font-bold italic text-sm truncate opacity-90 leading-relaxed">{transcription || t.placeholder}</p>
        </div>
      )}
      <button onClick={voiceState === VoiceState.IDLE ? startAssistant : stopAssistant} 
        className={`p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 transform active:scale-90 border-2 border-white/30 
        ${voiceState === VoiceState.IDLE ? 'bg-gold-gradient text-slate-900' : 'bg-red-600 text-white'}`}>
        {voiceState === VoiceState.CONNECTING ? <Loader2 size={32} className="animate-spin" /> : 
         voiceState === VoiceState.IDLE ? <Mic size={32} strokeWidth={3} /> : <MicOff size={32} strokeWidth={3} />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
