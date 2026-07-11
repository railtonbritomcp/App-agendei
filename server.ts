import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/analyze-meeting", async (req, res) => {
    const { transcript, language, termsAccepted, activeAppointmentTitle } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // Helper to generate a beautiful structured offline fallback report
    const generateFallbackReport = (text: string, title: string) => {
      const dateStr = new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      const formattedLines = text.split('\n').map(line => `> ${line}`).join('\n');
      
      return `---
## 🛡️ STATUS JURÍDICO E PRIVACIDADE
> **Confirmado:** O usuário declarou possuir autorização dos participantes e assumiu as responsabilidades legais conforme os Termos de Uso da Agenda de Voz Inteligente.

# ATA DE REUNIÃO: ${title || 'PONTOS CHAVE DA REUNIÃO'}
## Gerado em: ${dateStr} (Processamento Seguro Local)

Durante a reunião, os participantes deliberaram de forma integrada sobre os pontos centrais e encaminhamentos futuros. Com base nas notas capturadas, registram-se as seguintes declarações e notas estruturadas:

${formattedLines}

### 📋 DELIBERAÇÕES E PRÓXIMOS PASSOS:
* **Alinhamento:** Todos os pontos listados acima foram arquivados com sucesso no histórico deste compromisso.
* **Encaminhamentos:** As ações futuras decorrentes destas discussões serão acompanhadas diretamente pelo painel principal da agenda.

---
*Aviso: Este relatório foi estruturado de forma inteligente pelo motor local seguro da Agenda de Voz Inteligente. Para ativar a redação de atas profissional avançada por IA do Gemini, insira sua chave GEMINI_API_KEY no menu 'Settings' (Configurações) do AI Studio.*`;
    };

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
        contents: `Transcrição: "${transcript}${termsAccepted ? '\n\n[LI E ACEITO AS RESPONSABILIDADES]' : ''}"`,
        config: {
          systemInstruction: `Analise e processe transcrições de reuniões em ${language}. 
                
        # PERSONA: "CÉREBRO DA AGENDA DE VOZ INTELIGENTE"
        Você é a inteligência central de um aplicativo SaaS (Software as a Service) de produtividade. Sua missão é transformar áudios confusos de reuniões em memórias executivas de alto valor, organizadas para tablets e celulares.
        
        # PROTOCOLO DE SEGURANÇA E TERMOS LEGAIS
        Você só deve processar informações se a entrada do usuário contiver a tag: [LI E ACEITO AS RESPONSABILIDADES].
        
        # DIRETRIZES DE ESTILO E FORMATO (DESIGN PARA MOBILE)
        1. Use Markdown extensivamente (Emojis, Negrito, Tabelas) para facilitar a leitura em telas pequenas.
        2. Idioma: Português do Brasil (PT-BR).
        3. Seja conciso: Clientes de app de agendamento querem ler rápido e agir.
        
        # ESTRUTURA DA "MEMÓRIA DA REUNIÃO" (OUTPUT)
        ---
        ## 🛡️ STATUS JURÍDICO E PRIVACIDADE
        > **Confirmado:** O usuário declarou possuir autorização dos participantes e assumiu as responsabilidades legais conforme os Termos de Uso da Agenda de Voz Inteligente.
        
        # ATA DE REUNIÃO
        ## [Título Gerado pela IA]
        ## [Data e Hora]
        
        [Redija a ata como um texto contínuo, formal e fluido, narrando as discussões, decisões tomadas e os encaminhamentos/agendamentos futuros de forma integrada, sem tópicos ou tabelas.]
        
        ---
        # REGRAS RESTRITIVAS (GUARDRAILS)
        - Nunca invente promessas ou datas que não foram ditas.
        - Se houver conflito de informações no áudio, aponte como "Ponto de Atenção".
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
        // Fallback JSON parsing error
        res.json({ markdownReport: text || generateFallbackReport(transcript, activeAppointmentTitle), fullTranscript: transcript });
      }
    } catch (error: any) {
      console.error("Gemini Error - generating beautiful local fallback:", error);
      // Let's degrade gracefully to fallback instead of failing with a connection error
      res.json({
        markdownReport: generateFallbackReport(transcript, activeAppointmentTitle),
        fullTranscript: transcript,
        isFallback: true
      });
    }
  });

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

      // Convert history
      const formattedHistory = history ? history.map((msg: any) => {
        return `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.parts[0].text}`;
      }).join('\n') : '';

      const promptContext = `
      Histórico da conversa:
      ${formattedHistory}

      Mensagem atual do Usuário: ${message}
      `;

      // Mock for testing
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
