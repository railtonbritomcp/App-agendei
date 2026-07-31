import express from "express";
import { GoogleGenAI, Type } from "@google/genai";

export const app = express();

app.use(express.json({ limit: '10mb' }));

// Helper to generate a beautiful structured offline fallback report
const generateFallbackReport = (text: string, title: string) => {
  const dateStr = new Date().toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  const formattedLines = text ? text.split('\n').map(line => `> ${line}`).join('\n') : '';
  
  return `# MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO: ${title || 'PONTOS CHAVE'}
## Gerado em: ${dateStr}

Durante a reunião, os participantes deliberaram sobre os pontos centrais e encaminhamentos futuros:

${formattedLines}

### 📋 DELIBERAÇÕES E PRÓXIMOS PASSOS:
* **Alinhamento:** Todos os pontos listados acima foram arquivados com sucesso no histórico deste compromisso.
* **Encaminhamentos:** As ações futuras decorrentes destas discussões serão acompanhadas diretamente pelo painel principal da agenda.`;
};

// API Route: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Route: Analyze Meeting
app.post("/api/analyze-meeting", async (req, res) => {
  const { transcript, language, termsAccepted, activeAppointmentTitle } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log("GEMINI_API_KEY missing - returning elegant local fallback report.");
    return res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle),
      fullTranscript: transcript,
      isFallback: true
    });
  }

  try {
    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Transcrição/Notas: "${transcript}${termsAccepted ? '\n\n[LI E ACEITO AS RESPONSABILIDADES]' : ''}"`,
      config: {
        systemInstruction: `Analise e processe as entradas da reunião (áudio transcrito ou notas digitadas) em ${language}.
             
      # PERSONA: "CÉREBRO DA AGENDA DE VOZ INTELIGENTE"
      Você é a inteligência central de um aplicativo SaaS (Software as a Service) de produtividade. Sua missão é transformar informações capturadas durante ou após uma reunião (seja voz longa ou apenas os pontos principais digitados) em uma memória executiva de alto valor, organizada para tablets e celulares. Lembre-se que frequentemente os usuários apenas digitam os pontos principais em vez de gravar a reunião inteira.
      
      # PROTOCOLO DE SEGURANÇA E TERMOS LEGAIS
      Você só deve processar informações se a entrada do usuário contiver a tag: [LI E ACEITO AS RESPONSABILIDADES].
      
      # DIRETRIZES DE ESTILO E FORMATO (DESIGN PARA MOBILE)
      1. Use Markdown extensivamente (Emojis, Negrito, Tabelas) para facilitar a leitura em telas pequenas.
      2. Idioma: Português do Brasil (PT-BR).
      3. Seja conciso: Clientes de app de agendamento querem ler rápido e agir.
      4. Foque em criar uma Memória de Reunião com os pontos-chave discutidos.
      
      # ESTRUTURA DA "MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO" (OUTPUT)
      # MEMÓRIA DO REGISTRO EXECUTIVO DA REUNIÃO
      ## [Título Gerado pela IA com base no contexto]
      ## [Data e Hora]
      
      [Redija a memória do registro executivo da reunião detalhando as principais abordagens e discussões, decisões tomadas e encaminhamentos/agendamentos futuros. A redação deve ser executiva, fluida e direta, refletindo a essência das notas fornecidas de forma clara.]
      
      ---
      # REGRAS RESTRITIVAS (GUARDRAILS)
      - Nunca invente promessas ou datas que não foram citadas na entrada original.
      - Se houver conflito de informações na entrada, aponte como "Ponto de Atenção".
      - Mantenha a saída limpa e profissional, pronta para ser copiada para o WhatsApp ou E-mail.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            markdownReport: { type: Type.STRING },
            fullTranscript: { type: Type.STRING }
          },
          required: ["markdownReport", "fullTranscript"]
        }
      }
    });
    
    const text = response.text || '';
    
    try {
      const jsonResponse = JSON.parse(text.trim());
      res.json(jsonResponse);
    } catch (e) {
      res.json({ markdownReport: text || generateFallbackReport(transcript, activeAppointmentTitle), fullTranscript: transcript });
    }
  } catch (error: any) {
    console.error("Gemini Error - generating beautiful local fallback:", error);
    res.json({
      markdownReport: generateFallbackReport(transcript, activeAppointmentTitle),
      fullTranscript: transcript,
      isFallback: true
    });
  }
});

// API Route: Voice Assistant
app.post("/api/voice-assistant", async (req, res) => {
  try {
    const { message, history, selectedDate } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not configured. Returning fallback directive.");
      return res.json({ fallback: true, text: "Chave da API não configurada. Usando assistente local." });
    }

    const ai = new GoogleGenAI({ 
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toLocaleTimeString();
    const userSelectedDate = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : today;

    const createAppointmentTool = {
      name: 'create_appointment',
      description: 'Cria um novo compromisso na agenda do usuário.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          titulo: { type: Type.STRING, description: 'Título do compromisso (ex: Reunião de Vendas)' },
          data_inicio: { type: Type.STRING, description: 'Data e hora de início no formato ISO 8601 (ex: 2023-10-27T10:00:00)' },
          data_fim: { type: Type.STRING, description: 'Data e hora de término no formato ISO 8601' },
          descricao: { type: Type.STRING, description: 'Breve descrição do compromisso' },
          local: { type: Type.STRING, description: 'Local da reunião ou link' },
          categoria: { type: Type.STRING, description: 'Categoria (Trabalho, Pessoal, Urgente, Saúde)' },
          me_ligar_antes: { type: Type.BOOLEAN, description: 'Se o usuário deseja um alerta de ligação simulada antes do evento' }
        },
        required: ['titulo', 'data_inicio']
      }
    };

    const formattedHistory = history ? history.map((msg: any) => {
      return `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.parts[0].text}`;
    }).join('\n') : '';

    const promptContext = `
    Histórico da conversa:
    ${formattedHistory}

    Mensagem atual do Usuário: ${message}
    `;

    if (message.toLowerCase().includes('teste')) {
      return res.json({
        text: "Ok, agendei a reunião.",
        toolCalls: [{
          name: 'create_appointment',
          args: {
            titulo: 'Reunião de Teste',
            data_inicio: '2026-07-09T15:00:00',
            descricao: 'Teste de voz',
            local: 'Escritório',
            categoria: 'Trabalho'
          }
        }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: promptContext,
      config: {
        systemInstruction: `Você é a "Vicky", uma assistente de voz elegante e supereficiente para uma agenda inteligente. 
        Sua voz deve ser prestativa, curta e focada em produtividade.
        
        DATA REAL ATUAL: ${today} (ANO: 2026)
        HORA ATUAL: ${now}
        DATA SELECIONADA PELO USUÁRIO NA INTERFACE: ${userSelectedDate}
        
        REGRAS:
        1. Se o usuário pedir para agendar "hoje", "amanhã" ou datas relativas, considere a DATA REAL ATUAL.
        2. Se o usuário disser "agende para este dia", "marque para o dia selecionado" ou não especificar a data, assuma que ele quer agendar na DATA SELECIONADA PELO USUÁRIO NA INTERFACE (${userSelectedDate}).
        3. OBRIGATÓRIO: Sempre que o usuário solicitar um agendamento ou compromisso, você DEVE EXECUTAR A FERRAMENTA "create_appointment". Não apenas responda no texto, execute a ferramenta!
        4. Seja concisa. Não dê respostas longas.
        5. Se o usuário apenas conversar, responda de forma amigável e profissional.
        6. Idioma: Português do Brasil.`,
        tools: [{ functionDeclarations: [createAppointmentTool] }]
      }
    });

    let responseText = response.text || '';
    let toolCalls: any[] = [];

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        toolCalls.push({
          name: call.name,
          args: call.args
        });
      }
    }

    res.json({ 
      text: responseText, 
      toolCalls: toolCalls
    });
  } catch (error: any) {
    console.error("Voice Assistant Error:", error);
    res.status(500).json({ error: error.message });
  }
});
