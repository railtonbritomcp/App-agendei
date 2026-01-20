
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

const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ onAddAppointment, currentSelectedDate, selectedLanguage }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [transcription, setTranscription] = useState<string>('');
  const [lastActionStatus, setLastActionStatus] = useState<'success' | 'error' | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

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
            if (message.serverContent?.inputTranscription) setTranscription(message.serverContent.inputTranscription.text);
          },
          onerror: () => setVoiceState(VoiceState.ERROR),
          onclose: () => stopAssistant()
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `Crie agendamentos executivos para o dia ${format(currentSelectedDate, 'yyyy-MM-dd')}. Seja breve, polido e profissional.`,
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
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[400] flex flex-col items-center gap-5 w-full max-w-xs px-6">
      
      {lastActionStatus === 'success' && (
        <div className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white shadow-2xl flex items-center gap-3 border border-white/20 animate-in slide-in-from-bottom-3">
          <CheckCircle2 size={16} />
          <span className="text-[10px] font-black uppercase tracking-widest">Sucesso</span>
        </div>
      )}

      {voiceState !== VoiceState.IDLE && (
        <div className="glass-card bg-white/95 border-emerald-100 p-5 rounded-3xl w-full animate-in zoom-in duration-300 shadow-2xl">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-1.5 h-1.5 bg-amber-600 rounded-full animate-pulse"></div>
            <span className="text-[8px] font-black text-amber-700 uppercase tracking-[0.2em]">IA Estratégica Ativa</span>
          </div>
          <p className="text-emerald-950 text-[11px] font-bold italic opacity-80 leading-snug truncate">{transcription || "Aguardando áudio..."}</p>
        </div>
      )}

      <button 
        onClick={voiceState === VoiceState.IDLE ? startAssistant : stopAssistant} 
        className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 shadow-2xl border border-white/40 btn-press
        ${voiceState === VoiceState.IDLE ? 'bg-amazon-premium text-white' : 'bg-red-600 text-white'}`}>
        {voiceState === VoiceState.CONNECTING ? <Loader2 size={24} className="animate-spin" /> : 
         voiceState === VoiceState.IDLE ? <Mic size={24} strokeWidth={2.5} /> : <MicOff size={24} strokeWidth={2.5} />}
      </button>
    </div>
  );
};

export default VoiceAssistant;
