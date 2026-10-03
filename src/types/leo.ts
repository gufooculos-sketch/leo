export type AudioSystemState = 
  | 'IDLE'
  | 'REQUESTING_MIC_PERMISSION'
  | 'STARTING_MIC'
  | 'LISTENING'
  | 'PROCESSING_AUDIO'
  | 'THINKING'
  | 'ANSWERING'
  | 'ERROR';

export type LeoEmotion = 
  | 'NEUTRO' 
  | 'FELIZ' 
  | 'CURIOSO' 
  | 'PENSANDO' 
  | 'CONFUSO' 
  | 'SURPRESO' 
  | 'COMEMORANDO';

export type LeoLifeState = 
  | 'OFF'        // Totalmente apagado no escuro
  | 'WAKING'     // Sequência de despertar: brilho -> olhos -> boca -> cumprimento
  | 'ACTIVE'     // Ativo, flutuando, aguardando
  | 'LISTENING'  // Ouvindo a criança ativamente (após microfone iniciado)
  | 'THINKING'   // Processando a fala (olhar para cima, balão 💭 ... -> 💡)
  | 'SPEAKING'   // Falando e sincronizando a boca luminosa
  | 'SLEEPING';  // Sequência de adormecer: ON -> DIM -> CLOSE -> OFF

export type MouthShape = 
  | 'NEUTRAL'     // Linha suave repouso
  | 'SMILE'       // Sorriso curvo icônico
  | 'OPEN'        // Boca aberta média (sons de A, E)
  | 'WIDE_OPEN'   // Boca bem aberta (ênfase, risada)
  | 'SMALL_O'     // Boca redonda (sons de O, U)
  | 'HAPPY'       // Sorriso largo alegre
  | 'SAD'         // Curva para baixo
  | 'SURPRISED'   // O grande espantado
  | 'THINKING'    // Boca pequena pensativa
  | 'TALKING'     // Movimento de articulação
  // Aliases for compatibility
  | 'LINE'
  | 'O_SMALL'
  | 'O_BIG'
  | 'TALK_1'
  | 'TALK_2'
  | 'TALK_3';

export type LightTone = 'pure-white' | 'warm-white' | 'cyan-lumen' | 'aurora';

export interface LeoSettings {
  lightTone: LightTone;
  lightIntensity: number; // 0.6 to 1.4
  voicePitch: number;     // 0.9 to 1.3 (1.02 = voz natural humanizada)
  voiceRate: number;      // 0.85 to 1.15 (0.98 = cadência humana natural)
  soundEffects: boolean;
  continuousConversationMode: boolean; // Modo Conversa Contínua (Hands-free / Turn-taking)
  screenTimeLimitMinutes: number; // 0 = sem limite
  parentalPin: string;            // Default "1234"
  childProfile: {
    name: string;
    age: string;
    favoriteAnimal: string;
    favoriteColor: string;
    notes: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  emotion?: LeoEmotion;
  timestamp: number;
}
