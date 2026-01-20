
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, LiveServerMessage, Modality } from '@google/genai';
import { VoiceState, MeetingReport, Appointment } from '../types';
import { Mic, Square, CheckCircle, Loader2, Sparkles, RefreshCcw, XCircle } from 'lucide-react';
import { createBlob } from '../utils/audio-helpers';

interface MeetingManagerProps {
  activeAppointment: Appointment | null;
  onReportGenerated: (report: MeetingReport) => void;
  selectedLanguage: { id: string; label: string; name: string; locale: any };
}

const TRANSLATIONS: Record<string, any> = {
  pt: { sessao: 'CAPTURA ATIVA', caption: 'INICIAR GRAVAÇÃO', finalizar: 'GERAR ATA', ouvindo: 'TRANSCREVENDO...', redigindo: 'REDIGINDO ATA...', sintetizando: 'PROCESSANDO...', erro: 'ERRO DE CONEXÃO', tentar: 'REINICIAR', sintese: 'ANÁLISE IA', fidelidade: 'PRECISÃO', silenciando: 'CANAL DE ÁUDIO ATIVO', regravar: 'DESCARTAR' },
  en: { sessao: 'ACTIVE CAPTURE', caption: 'START RECORDING', finalizar: 'GENERATE REPORT', ouvindo: 'TRANSCRIBING...', redigindo: 'DRAFTING...', sintetizando: 'PROCESSING...', erro: 'CONNECTION ERROR', tentar: 'RETRY', sintese: 'AI ANALYSIS', fidelidade: 'PRECISION', silenciando: 'ACTIVE CHANNEL', regravar: 'DISCARD' },
};

const MeetingManager: React.FC<MeetingManagerProps> = ({ activeAppointment, onReportGenerated, selectedLanguage }) => {
  const [status, setStatus] = useState<VoiceState>(VoiceState.IDLE);
  const [timer, setTimer] = useState(0);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  
  const intervalRef = useRef<any>(null);
  const sessionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const transcriptRef = useRef('');
  const isStoppingRef = useRef(false);

  const t = TRANSLATIONS[selectedLanguage.id] || TRANSLATIONS.pt;

  useEffect(() => {
    return () => { stopAudioTracks(); };
  }, []);

  const stopAudioTracks = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (scriptProcessorRef.current) { scriptProcessorRef.current.disconnect(); scriptProcessorRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    if (sessionRef.current) { sessionRef.current.close(); sessionRef.current = null; }
  };

  const startRecording = async () => {
    try {
      isStoppingRef.current = false;
      setStatus(VoiceState.RECORDING);
      setTranscriptBuffer('');
      transcriptRef.current = '';
      setTimer(0);
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(session => { if (session) session.sendRealtimeInput({ media: pcmBlob }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
              const newText = message.serverContent.inputTranscription.text;
              transcriptRef.current += newText + ' ';
              setTranscriptBuffer(transcriptRef.current);
            }
          },
          onerror: () => setStatus(VoiceState.ERROR),
          onclose: () => {}
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          systemInstruction: "Transcrição fiel de reunião corporativa." 
        }
      });
      
      sessionRef.current = await sessionPromise;
      intervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    } catch (err) { setStatus(VoiceState.ERROR); }
  };

  const stopRecordingAndProcess = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;
    const finalTranscript = transcriptRef.current.trim();
    stopAudioTracks();
    if (!finalTranscript) { setStatus(VoiceState.IDLE); isStoppingRef.current = false; return; }
    setStatus(VoiceState.PROCESSING);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Processar transcrição para idioma ${selectedLanguage.name}: "${finalTranscript}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              fullTranscript: { type: Type.STRING },
              decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
              actionItems: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["summary", "fullTranscript", "decisions", "actionItems"]
          }
        }
      });
      const result = JSON.parse(response.text || '{}');
      onReportGenerated({
        id: Math.random().toString(36).substr(2, 9),
        appointmentId: activeAppointment?.id || '',
        timestamp: new Date().toISOString(),
        summary: result.summary,
        decisions: result.decisions.map((d: string) => d.toUpperCase()),
        actionItems: result.actionItems.map((a: string) => a.toUpperCase()),
        fullTranscript: result.fullTranscript
      });
      setStatus(VoiceState.IDLE);
    } catch (error) { setStatus(VoiceState.ERROR); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
  const isRecordingMode = status === VoiceState.RECORDING || status === VoiceState.LISTENING;

  if (!activeAppointment) return null;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 text-emerald-950 shadow-2xl border border-emerald-50 relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-[9px] font-black text-amber-700 uppercase tracking-[0.3em] bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg mb-3 inline-block">{t.sessao}</span>
          <h3 className="text-2xl font-black tracking-tight text-emerald-950 uppercase leading-none">{activeAppointment.title.toUpperCase()}</h3>
        </div>
        {isRecordingMode && (
          <div className="flex items-center gap-3 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">
            <div className="w-2.5 h-2.5 bg-red-600 rounded-full animate-pulse"></div>
            <span className="text-[14px] font-black font-mono">{formatTime(timer)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-10 border border-emerald-50 rounded-[2.5rem] bg-emerald-50/20 mb-8 px-8 relative shadow-inner">
        {status === VoiceState.IDLE && (
          <>
            <button onClick={startRecording} className="w-18 h-18 bg-amazon-premium rounded-3xl shadow-2xl flex items-center justify-center text-white mb-6 hover:brightness-110 active:scale-95 transition-all btn-press">
              <Mic size={32} strokeWidth={2} />
            </button>
            <p className="text-[10px] text-amber-700 font-black uppercase text-center tracking-[0.3em]">{t.caption}</p>
          </>
        )}
        {isRecordingMode && (
          <div className="w-full">
            <div className="flex items-center justify-center gap-8 mb-10">
              <button onClick={() => setStatus(VoiceState.IDLE)} className="flex flex-col items-center">
                <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-emerald-200 mb-3 border border-emerald-100 hover:text-emerald-900 transition-all btn-press">
                  <RefreshCcw size={22} />
                </div>
                <p className="text-[9px] text-emerald-300 font-black uppercase tracking-widest">{t.regravar}</p>
              </button>
              <button onClick={stopRecordingAndProcess} className="flex flex-col items-center">
                <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white mb-3 shadow-2xl hover:bg-red-500 transition-all btn-press">
                  <Square size={28} fill="currentColor" />
                </div>
                <p className="text-[10px] text-red-600 font-black uppercase tracking-widest">{t.finalizar}</p>
              </button>
            </div>
            <div className="w-full bg-white p-6 rounded-2xl border border-emerald-100 max-h-40 overflow-y-auto custom-scrollbar shadow-sm">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                 <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">{t.silenciando}</span>
               </div>
               <p className="text-[13px] text-emerald-950 font-bold italic leading-relaxed">{transcriptBuffer || "Ouvindo..."}</p>
            </div>
          </div>
        )}
        {status === VoiceState.PROCESSING && (
          <div className="flex flex-col items-center py-10">
            <Loader2 size={40} className="text-amber-600 animate-spin mb-6" />
            <p className="text-[11px] font-black uppercase text-amber-700 tracking-[0.4em]">{t.redigindo}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3">
          <Sparkles size={18} className="text-amber-600" />
          <h4 className="text-[9px] font-black uppercase text-emerald-900/40 tracking-widest leading-none">{t.sintese}</h4>
        </div>
        <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center gap-3">
          <CheckCircle size={18} className="text-emerald-600" />
          <h4 className="text-[9px] font-black uppercase text-emerald-900/40 tracking-widest leading-none">{t.fidelidade}</h4>
        </div>
      </div>
    </div>
  );
};

export default MeetingManager;
