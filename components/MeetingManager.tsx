
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
  pt: { sessao: 'SESSÃO EXECUTIVA', caption: 'TOQUE PARA INICIAR CAPTURA', finalizar: 'FINALIZAR E GERAR MEMÓRIA', ouvindo: 'CAPTURANDO TRATATIVAS...', redigindo: 'ESTRUTURANDO MEMÓRIA...', sintetizando: 'PRESERVANDO LINGUAJAR ORIGINAL...', erro: 'ERRO NA CAPTURA', tentar: 'TENTAR NOVAMENTE', sintese: 'SÍNTESE DE TRATATIVAS', fidelidade: 'FIDELIDADE ORIGINAL', silenciando: 'GRAVAÇÃO ATIVA', regravar: 'REGRAVAR' },
  en: { sessao: 'EXECUTIVE SESSION', caption: 'TAP TO START CAPTURE', finalizar: 'FINISH AND GENERATE MEMORY', ouvindo: 'CAPTURING DISCUSSIONS...', redigindo: 'DRAFTING MEMORY...', sintetizando: 'PRESERVING ORIGINAL LANGUAGE...', erro: 'CAPTURE ERROR', tentar: 'TRY AGAIN', sintese: 'DISCUSSION SYNTHESIS', fidelidade: 'ORIGINAL FIDELITY', silenciando: 'ACTIVE RECORDING', regravar: 'RE-RECORD' },
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
    return () => {
      stopAudioTracks();
    };
  }, []);

  const stopAudioTracks = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
  };

  const handleRegravar = () => {
    stopAudioTracks();
    setTranscriptBuffer('');
    transcriptRef.current = '';
    setTimer(0);
    setStatus(VoiceState.IDLE);
    isStoppingRef.current = false;
  };

  const stopRecordingAndProcess = async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    const finalTranscript = transcriptRef.current.trim();
    stopAudioTracks();
    
    if (!finalTranscript) {
      setStatus(VoiceState.IDLE);
      isStoppingRef.current = false;
      return;
    }

    setStatus(VoiceState.PROCESSING);
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Atue como um redator executivo sênior. Recebi uma transcrição bruta de um evento. 
        Sua tarefa é produzir uma 'Memória do Evento' de altíssima qualidade no idioma ${selectedLanguage.name}.
        
        DIRETRIZES CRÍTICAS:
        1. Para o campo 'summary' (Essência do Evento): Mantenha a redação o mais próximo possível do linguajar e vocabulário ORIGINAL utilizado pelo orador. Corrija apenas erros gramaticais e de pontuação. USE LETRAS MAIÚSCULAS E MINÚSCULAS conforme as regras gramaticais locais (não use tudo em maiúsculas aqui).
        2. Para os demais campos ('decisions', 'actionItems'): Utilize LETRAS MAIÚSCULAS para garantir impacto e clareza executiva.
        
        A saída deve conter:
        1. 'summary': Uma síntese fluida da essência do evento (Mixed Case).
        2. 'fullTranscript': O texto literal com correções mínimas (Mixed Case).
        3. 'actionItems': Lista de tarefas e encaminhamentos (UPPERCASE).
        4. 'decisions': Lista de decisões tomadas (UPPERCASE).
        
        Transcrição bruta: "${finalTranscript}"`,
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
        summary: result.summary, // Mantido como retornado (Mixed Case conforme prompt)
        decisions: result.decisions.map((d: string) => d.toUpperCase()),
        actionItems: result.actionItems.map((a: string) => a.toUpperCase()),
        fullTranscript: result.fullTranscript
      });
      
      setStatus(VoiceState.IDLE);
      setTimer(0);
      setTranscriptBuffer('');
      transcriptRef.current = '';
      isStoppingRef.current = false;
    } catch (error) { 
      console.error("Erro ao processar memória:", error);
      setStatus(VoiceState.ERROR);
      isStoppingRef.current = false;
    }
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
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(session => {
                if (session) session.sendRealtimeInput({ media: pcmBlob });
              });
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
          onerror: (e) => {
            console.error("Live API Error:", e);
            setStatus(VoiceState.ERROR);
          },
          onclose: () => {
            console.log("Live API Closed");
          }
        },
        config: { 
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          systemInstruction: "TRANSREVA EXATAMENTE O QUE FOR DITO. FOCO EM PRECISÃO TOTAL PARA ATA DE REUNIÃO." 
        }
      });
      
      sessionRef.current = await sessionPromise;
      intervalRef.current = setInterval(() => setTimer(prev => prev + 1), 1000);
    } catch (err) { 
      console.error("Erro ao iniciar microfone:", err);
      setStatus(VoiceState.ERROR); 
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isRecordingMode = status === VoiceState.RECORDING || status === VoiceState.LISTENING;

  if (!activeAppointment) return null;

  return (
    <div className="bg-slate-900/60 rounded-[3rem] p-8 sm:p-10 text-white shadow-2xl border border-white/20 overflow-hidden relative backdrop-blur-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] bg-emerald-500/20 border border-emerald-500/30 px-4 py-1.5 rounded-full mb-2 inline-block shadow-lg">{t.sessao}</span>
          <h3 className="text-xl font-black tracking-tight text-white truncate max-w-[200px] sm:max-w-none uppercase">{activeAppointment.title.toUpperCase()}</h3>
        </div>
        {isRecordingMode && (
          <div className="flex items-center gap-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-2xl border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-black font-mono">{formatTime(timer)}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-white/20 rounded-[2.5rem] bg-white/5 mb-8 px-6 relative overflow-hidden shadow-inner">
        {status === VoiceState.IDLE && (
          <>
            <button onClick={startRecording} className="w-20 h-20 bg-gold-gradient rounded-3xl shadow-[0_15px_40px_-10px_rgba(255,215,0,0.6)] flex items-center justify-center text-slate-900 mb-4 hover:scale-105 active:scale-95 transition-all border-2 border-white/40">
              <Mic size={32} />
            </button>
            <p className="text-[10px] text-white/50 font-black uppercase text-center tracking-[0.2em]">{t.caption}</p>
          </>
        )}
        {isRecordingMode && (
          <div className="w-full flex flex-col items-center">
            <div className="flex items-center gap-6 mb-8">
              <button onClick={handleRegravar} className="flex flex-col items-center group">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white/70 mb-3 group-active:scale-90 transition-all border border-white/10 hover:bg-white/20">
                  <RefreshCcw size={24} />
                </div>
                <p className="text-[10px] text-white/40 font-black uppercase tracking-widest">{t.regravar}</p>
              </button>

              <button onClick={stopRecordingAndProcess} className="flex flex-col items-center group">
                <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-white mb-3 shadow-[0_15px_40px_-10px_rgba(220,38,38,0.5)] active:scale-90 transition-all border-2 border-white/20">
                  <Square size={28} fill="currentColor" />
                </div>
                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">{t.finalizar}</p>
              </button>
            </div>

            <div className="w-full bg-black/30 p-5 rounded-2xl border border-white/10 max-h-40 overflow-y-auto custom-scrollbar shadow-inner">
               <div className="flex items-center gap-2 mb-3">
                 <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div>
                 <span className="text-[9px] font-black uppercase text-emerald-400 tracking-widest">{t.silenciando}</span>
               </div>
               <p className="text-[13px] text-white/90 italic font-medium leading-relaxed">{transcriptBuffer || "..."}</p>
            </div>
          </div>
        )}
        {status === VoiceState.PROCESSING && (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-yellow-400/20 blur-xl rounded-full"></div>
              <Loader2 size={40} className="text-yellow-400 animate-spin relative z-10" />
            </div>
            <p className="text-[12px] font-black uppercase text-yellow-400 tracking-[0.3em]">{t.redigindo}</p>
            <p className="text-[10px] text-white/40 mt-2 uppercase px-6 tracking-widest">{t.sintetizando}</p>
          </div>
        )}
        {status === VoiceState.ERROR && (
          <div className="flex flex-col items-center text-center">
             <XCircle size={40} className="text-red-500 mb-4" />
             <p className="text-[12px] font-black text-red-500 uppercase mb-2">{t.erro}</p>
             <button onClick={() => setStatus(VoiceState.IDLE)} className="text-[10px] text-white/40 underline uppercase font-black tracking-widest hover:text-white">{t.tentar}</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
          <Sparkles size={16} className="text-yellow-400" />
          <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest">{t.sintese}</h4>
        </div>
        <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-3">
          <CheckCircle size={16} className="text-emerald-400" />
          <h4 className="text-[9px] font-black uppercase text-white/40 tracking-widest">{t.fidelidade}</h4>
        </div>
      </div>
    </div>
  );
};

export default MeetingManager;
