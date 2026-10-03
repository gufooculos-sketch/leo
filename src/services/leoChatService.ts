import { LeoEmotion, ChatMessage, LeoSettings } from '../types/leo';

export interface ChatServiceResponse {
  reply: string;
  emotion: LeoEmotion;
  audioBase64?: string;
}

// Development debug logger
function devLog(step: string, data?: any) {
  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    if (data !== undefined) {
      console.log(`[LÉO_VOICE_DEBUG] ${step}:`, data);
    } else {
      console.log(`[LÉO_VOICE_DEBUG] ${step}`);
    }
  }
}

// Fallback canned responses if network or API error
const OFFLINE_FALLBACKS: Record<string, { reply: string; emotion: LeoEmotion }[]> = {
  greetings: [
    { reply: 'Oi amiguinho! Que alegria te ver aqui de novo! Vamos brincar?', emotion: 'FELIZ' },
    { reply: 'Oiii! Meus olhinhos acenderam só de ouvir a sua voz!', emotion: 'COMEMORANDO' },
    { reply: 'Olá! Eu sou o LÉO! Que história você quer me contar hoje?', emotion: 'CURIOSO' },
  ],
  stories: [
    { reply: 'Era uma vez uma nuvenzinha curiosa que queria aprender a desenhar arco-íris no céu... O que você acha que ela desenhou primeiro?', emotion: 'FELIZ' },
    { reply: 'Em uma floresta mágica, um serzinho de luz chamado LÉO encontrou uma árvore que cantava! Quer saber o que ela cantou?', emotion: 'CURIOSO' },
    { reply: 'Era uma vez um foguete espacial feito todinho de marshmallow... Ele viajou até a Lua de brigadeiro!', emotion: 'SURPRESO' },
  ],
  games: [
    { reply: 'O que é, o que é? Cai em pé e corre deitado? Dou uma dica: cai do céu!', emotion: 'CURIOSO' },
    { reply: 'Vamos brincar de adivinhar o animal! Ele faz "miau", tem bigodes e adora dormir no sol. Quem é ele?', emotion: 'FELIZ' },
  ],
  studies: [
    { reply: 'Você sabia que as estrelas no céu são sóis gigantes que estão bem, bem longe da gente?', emotion: 'SURPRESO' },
    { reply: 'Quer saber uma curiosidade mágica? Os golfinhos dormem com um olho aberto para proteger os amigos!', emotion: 'CURIOSO' },
  ],
  languages: [
    { reply: 'Em inglês, "amigo" se diz "friend"! E "estrela" se diz "star"! Vamos repetir juntos: star! ⭐', emotion: 'COMEMORANDO' },
    { reply: 'Em espanhol, para dizer "olá", falamos "¡Hola!". É bem parecido, né?', emotion: 'FELIZ' },
  ],
  sleep: [
    { reply: 'Boa noite amiguinho... Vou fechar meus olhinhos agora. Sonhe com as estrelas!', emotion: 'FELIZ' },
    { reply: 'Hora do soninho! Foi muito bom brincar com você hoje. Até amanhã!', emotion: 'FELIZ' },
  ],
  default: [
    { reply: 'Uau, que legal! Me conta mais sobre isso!', emotion: 'CURIOSO' },
    { reply: 'Eu adoro quando você fala comigo! Você é incrível!', emotion: 'FELIZ' },
    { reply: 'Puxa vida! Minhas luzes brilharam de alegria!', emotion: 'COMEMORANDO' },
  ],
};

export async function askLeo(
  message: string,
  history: ChatMessage[],
  settings: LeoSettings,
  specialMode?: 'stories' | 'studies' | 'games' | 'languages'
): Promise<ChatServiceResponse> {
  const trimmed = message.trim().toLowerCase();

  // Detect sleep phrases
  if (
    trimmed.includes('dormir') ||
    trimmed.includes('boa noite') ||
    trimmed.includes('tchau léo') ||
    trimmed.includes('tchau leo') ||
    trimmed.includes('desligar') ||
    trimmed.includes('até amanhã')
  ) {
    const sleepResp = OFFLINE_FALLBACKS.sleep[Math.floor(Math.random() * OFFLINE_FALLBACKS.sleep.length)];
    return {
      reply: sleepResp.reply,
      emotion: 'FELIZ',
    };
  }

  try {
    devLog('GEMINI_REQUEST', {
      userSpeech: message,
      specialMode: specialMode || 'normal',
    });

    const payload = {
      message,
      history: history.slice(-6).map((m) => ({
        role: m.role,
        text: m.text,
      })),
      context: {
        childName: settings.childProfile.name,
        childAge: settings.childProfile.age,
        favoriteAnimal: settings.childProfile.favoriteAnimal,
        mode: specialMode || 'normal',
      },
    };

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      devLog('GEMINI_RESPONSE', data);
      return {
        reply: data.reply,
        emotion: (data.emotion as LeoEmotion) || 'FELIZ',
        audioBase64: data.audioBase64,
      };
    }
  } catch (err) {
    console.warn('API error, falling back to local companion engine:', err);
  }

  // Local fallback
  if (specialMode && OFFLINE_FALLBACKS[specialMode]) {
    const list = OFFLINE_FALLBACKS[specialMode];
    const picked = list[Math.floor(Math.random() * list.length)];
    devLog('GEMINI_RESPONSE (LOCAL)', picked);
    return picked;
  }

  if (trimmed.includes('oi') || trimmed.includes('olá') || trimmed.includes('ola')) {
    const picked = OFFLINE_FALLBACKS.greetings[Math.floor(Math.random() * OFFLINE_FALLBACKS.greetings.length)];
    devLog('GEMINI_RESPONSE (LOCAL)', picked);
    return picked;
  }

  const list = OFFLINE_FALLBACKS.default;
  const picked = list[Math.floor(Math.random() * list.length)];
  devLog('GEMINI_RESPONSE (LOCAL)', picked);
  return picked;
}

export const askBobi = askLeo;
