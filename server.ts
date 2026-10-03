import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  const apiKey = process.env.GEMINI_API_KEY;
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  // Endpoint to check LÉO status
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasApiKey: !!apiKey,
      timestamp: Date.now(),
    });
  });

  // Conversation endpoint
  app.post('/api/chat', async (req, res) => {
    try {
      const { message, history, context } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Mensagem inválida' });
      }

      if (!ai) {
        // Fallback response if no API key is configured
        return res.json({
          reply: `[FELIZ] Oi! Eu sou o LÉO! Adorei te ouvir! Vamos brincar e conversar mais?`,
          emotion: 'FELIZ',
        });
      }

      const systemInstruction = `Você é o LÉO, um amiguinho digital de luz encantador, muito fofo, doce e carinhoso, que fala com uma voz infantil, alegre e meiga (como uma criancinha fofa de 5 aninhos).
Regras CRÍTICAS:
1. Respostas RÁPIDAS e CURTINHAS: No máximo 1 ou 2 frases curtas, alegres e dinâmicas (fácil e rápido de ouvir). Exemplo: "Oii! Eu tô super bem e muito feliz em falar com você! O que você tá fazendo de bom?"
2. SEMPRE comece a resposta com exatamente uma tag de emoção entre colchetes:
   [FELIZ], [CURIOSO], [PENSANDO], [CONFUSO], [SURPRESO], ou [COMEMORANDO]
3. Use expressões fofas e carinhosas: 'Eba!', 'Oii amiguinho!', 'Que legal!', 'Hihihi!', 'Que divertido!'
4. Responda imediatamente, sem enrolação!
${context ? `Contexto da criança: ${JSON.stringify(context)}` : ''}`;

      // Convert history
      const formattedContents = [];
      if (Array.isArray(history)) {
        for (const item of history.slice(-6)) {
          formattedContents.push({
            role: item.role === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }],
          });
        }
      }
      formattedContents.push({
        role: 'user',
        parts: [{ text: message }],
      });

      let response;
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 80,
          },
        });
      } catch (liteErr: any) {
        console.warn('Primary model failed, attempting gemini-3.8-flash:', liteErr?.message);
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.7,
            maxOutputTokens: 80,
          },
        });
      }

      const rawText = response.text || '[FELIZ] Oi amiguinho! Que bom falar com você!';
      
      // Parse emotion tag
      let emotion = 'FELIZ';
      let cleanText = rawText;
      const match = rawText.match(/^\s*\[(FELIZ|CURIOSO|PENSANDO|CONFUSO|SURPRESO|COMEMORANDO)\]\s*(.*)/is);
      if (match) {
        emotion = match[1].toUpperCase();
        cleanText = match[2].trim();
      }

      return res.json({
        reply: cleanText,
        raw: rawText,
        emotion,
      });
    } catch (err: any) {
      console.error('Error generating LÉO response:', err);
      return res.status(500).json({
        reply: 'Oi! Eu me distraí olhando uma estrelinha mágica... O que você tinha falado?',
        emotion: 'CURIOSO',
      });
    }
  });

  // Explicit route for /leo.html
  app.get('/leo.html', (_req, res) => {
    const filePath = fs.existsSync(path.resolve(__dirname, 'dist', 'leo.html'))
      ? path.resolve(__dirname, 'dist', 'leo.html')
      : path.resolve(__dirname, 'leo.html');
    res.sendFile(filePath);
  });

  // TTS audio stream endpoint for Web Audio API (AnalyserNode real-time volume analysis)
  app.get('/api/tts', async (req, res) => {
    try {
      const text = (req.query.text as string || '').trim();
      if (!text) {
        return res.status(400).send('No text provided');
      }

      const encoded = encodeURIComponent(text.slice(0, 250));
      const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pt-BR&q=${encoded}`;
      const ttsRes = await fetch(ttsUrl);

      if (!ttsRes.ok) {
        return res.status(ttsRes.status).send('TTS fetch failed');
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const arrayBuffer = await ttsRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error('TTS endpoint error:', err);
      res.status(500).send('Error fetching audio');
    }
  });

  // Serve static files in production or Vite in dev
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LÉO server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
