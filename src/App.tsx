import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, AlertCircle, RefreshCw, MessageSquare, Power } from 'lucide-react';
import { LeoCharacter } from './components/LeoCharacter';
import { ThreeDotsMenu } from './components/ThreeDotsMenu';
import { useLeoVoice } from './hooks/useLeoVoice';
import { leoAudio } from './audio/leoAudio';
import { askLeo } from './services/leoChatService';
import {
  LeoLifeState,
  LeoEmotion,
  LeoSettings,
  ChatMessage,
  AudioSystemState,
} from './types/leo';

export default function App() {
  // LÉO Core State
  const [lifeState, setLifeState] = useState<LeoLifeState>('ACTIVE');
  const [emotion, setEmotion] = useState<LeoEmotion>('FELIZ');
  const [thinkingPhase, setThinkingPhase] = useState<'dots_1' | 'dots_2' | 'dots_3' | 'idea'>('dots_2');
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const [hasStartedFirstConversation, setHasStartedFirstConversation] = useState<boolean>(false);

  // Discreet test text modal (for testing without voice if needed)
  const [showQuickInput, setShowQuickInput] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');

  // Settings
  const [settings, setSettings] = useState<LeoSettings>({
    lightTone: 'pure-white',
    lightIntensity: 1.0,
    voicePitch: 1.28, // Voz fofinha e alegre de amiguinho
    voiceRate: 1.08,  // Cadência ágil e cheia de vida
    soundEffects: true,
    continuousConversationMode: true, // Default ON: hands-free turn taking
    screenTimeLimitMinutes: 0,
    parentalPin: '1234',
    childProfile: {
      name: '',
      age: '5',
      favoriteAnimal: 'Panda',
      favoriteColor: 'Azul',
      notes: '',
    },
  });

  const isTransitioningRef = useRef<boolean>(false);
  const [isContinuousSessionActive, setIsContinuousSessionActive] = useState<boolean>(false);
  const isContinuousSessionActiveRef = useRef<boolean>(false);
  isContinuousSessionActiveRef.current = isContinuousSessionActive;

  const consecutiveNoSpeechRef = useRef<number>(0);
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lifeStateRef = useRef<LeoLifeState>('ACTIVE');
  lifeStateRef.current = lifeState;

  // Voice system hook with explicit audio pipeline and real-time lip sync
  const {
    audioState,
    setAudioState,
    errorMessage,
    currentMouthShape,
    setCurrentMouthShape,
    vocalIntensity,
    startListeningFlow,
    stopListening,
    speakText,
    isSpeechRecognitionSupported,
  } = useLeoVoice({
    voicePitch: settings.voicePitch,
    voiceRate: settings.voiceRate,
    soundEffects: settings.soundEffects,
    onTranscriptReady: (transcript: string) => {
      consecutiveNoSpeechRef.current = 0;
      handleChildSpoke(transcript);
    },
    onError: (msg, type) => {
      console.warn(`[LÉO_VOICE_ERROR] ${type}: ${msg}`);
      if (type === 'no-speech') {
        if (isContinuousSessionActiveRef.current && settings.continuousConversationMode) {
          consecutiveNoSpeechRef.current++;
          if (consecutiveNoSpeechRef.current < 2) {
            // Soft retry in continuous mode
            setAudioState('IDLE');
            setTimeout(() => {
              if (
                isContinuousSessionActiveRef.current &&
                lifeStateRef.current !== 'OFF' &&
                lifeStateRef.current !== 'SLEEPING'
              ) {
                startListeningFlow();
              }
            }, 600);
            return;
          } else {
            // Child went silent after multiple cycles, pause continuous mode
            setIsContinuousSessionActive(false);
            setEmotion('FELIZ');
          }
        } else {
          setEmotion('CONFUSO');
        }
      } else {
        setIsContinuousSessionActive(false);
      }
    },
  });

  // Strictly synchronize visual lifeState with audioState
  useEffect(() => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING' || lifeState === 'WAKING') return;

    if (audioState === 'LISTENING') {
      // ONLY enter LISTENING when audioState confirms onstart fired!
      setLifeState('LISTENING');
    } else if (audioState === 'STARTING_MIC' || audioState === 'REQUESTING_MIC_PERMISSION') {
      // During starting or requesting permission, remain in ACTIVE (not LISTENING!)
      setLifeState('ACTIVE');
    } else if (audioState === 'PROCESSING_AUDIO' || audioState === 'THINKING') {
      setLifeState('THINKING');
    } else if (audioState === 'ANSWERING') {
      setLifeState('SPEAKING');
    } else if (audioState === 'IDLE' || audioState === 'ERROR') {
      if (lifeState === 'LISTENING') {
        setLifeState('ACTIVE');
      }
    }
  }, [audioState, lifeState]);

  // Track session duration
  useEffect(() => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') return;
    const interval = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [lifeState]);

  // Handle sleep sequence: ON -> DIM -> CLOSE -> OFF
  const triggerSleepSequence = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setIsContinuousSessionActive(false);
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);

    stopListening();
    setLifeState('SLEEPING');

    if (settings.soundEffects) {
      leoAudio.playSleepHum();
    }

    setTimeout(() => {
      setLifeState('OFF');
      isTransitioningRef.current = false;
    }, 1600);
  }, [settings.soundEffects, stopListening]);

  // Handle wake sequence: OFF -> faint glow -> eyes appear -> eyes open -> mouth illuminates -> "bip..." -> "Oii! Você voltou!"
  const triggerWakeSequence = useCallback(
    (customGreeting?: string) => {
      if (isTransitioningRef.current) return;
      isTransitioningRef.current = true;

      setLifeState('WAKING');
      setEmotion('FELIZ');
      setCurrentMouthShape('LINE');

      if (settings.soundEffects) {
        leoAudio.playWakeBip();
      }

      setTimeout(async () => {
        setLifeState('SPEAKING');
        isTransitioningRef.current = false;

        const greeting =
          customGreeting ||
          (hasStartedFirstConversation
            ? 'Oii amiguinho! Que bom que você voltou!'
            : 'Oii! Eu sou o LÉO! Vamos brincar e conversar?');

        setHasStartedFirstConversation(true);

        await speakText(greeting, 'FELIZ');
        setLifeState('ACTIVE');
        setEmotion('FELIZ');
      }, 1200);
    },
    [hasStartedFirstConversation, settings.soundEffects, speakText, setCurrentMouthShape]
  );

  // Toggle power (Sleep / Wake)
  const handleTogglePower = useCallback(() => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') {
      triggerWakeSequence();
    } else {
      triggerSleepSequence();
    }
  }, [lifeState, triggerSleepSequence, triggerWakeSequence]);

  // Handle child message (from speech recognition or text fallback)
  const handleChildSpoke = useCallback(
    async (text: string, specialMode?: 'stories' | 'studies' | 'games' | 'languages') => {
      if (!text.trim() || isTransitioningRef.current) return;

      const userMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'user',
        text: text.trim(),
        timestamp: Date.now(),
      };
      setHistory((prev) => [...prev, userMsg]);

      // Check if child asked to sleep/say goodnight
      const lower = text.toLowerCase();
      if (
        lower.includes('dormir') ||
        lower.includes('boa noite') ||
        lower.includes('tchau léo') ||
        lower.includes('tchau leo') ||
        lower.includes('vai dormir') ||
        lower.includes('desligar')
      ) {
        setLifeState('SPEAKING');
        setEmotion('FELIZ');
        await speakText('Boa noite amiguinho... Vou fechar meus olhinhos agora. Sonhe com as estrelas!', 'FELIZ');
        triggerSleepSequence();
        return;
      }

      // 1. Enter THINKING state
      setAudioState('THINKING');
      setLifeState('THINKING');
      setEmotion('PENSANDO');
      setCurrentMouthShape('LINE');

      if (settings.soundEffects) {
        leoAudio.playThoughtTick(1);
      }

      // 1. Enter brief thoughtful state while Gemini responds
      setThinkingPhase('dots_2');

      // Fetch Gemini 3.8 Flash response immediately
      const response = await askLeo(text, history, settings, specialMode);

      // Instant transition: quick 80ms sparkle cue and immediately speak!
      setThinkingPhase('idea');
      if (settings.soundEffects) {
        leoAudio.playIdeaPing();
      }
      await new Promise((r) => setTimeout(r, 80));

      setLifeState('SPEAKING');
      setEmotion(response.emotion);

      const modelMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: 'model',
        text: response.reply,
        emotion: response.emotion,
        timestamp: Date.now(),
      };
      setHistory((prev) => [...prev, modelMsg]);

      if (response.emotion === 'COMEMORANDO' && settings.soundEffects) {
        leoAudio.playCelebrateChime();
      }

      await speakText(response.reply, response.emotion);

      setLifeState('ACTIVE');
      setEmotion('FELIZ');

      // Modo Conversa Contínua com detecção automática de fala (VAD / Turn-taking)
      if (
        isContinuousSessionActiveRef.current &&
        settings.continuousConversationMode !== false &&
        lifeStateRef.current !== 'OFF' &&
        lifeStateRef.current !== 'SLEEPING'
      ) {
        // Pausa natural e ágil de 400ms para respiração da criança
        if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
        turnTimerRef.current = setTimeout(() => {
          if (
            isContinuousSessionActiveRef.current &&
            lifeStateRef.current !== 'OFF' &&
            lifeStateRef.current !== 'SLEEPING'
          ) {
            startListeningFlow();
          }
        }, 400);
      }
    },
    [history, setAudioState, settings, speakText, triggerSleepSequence, setCurrentMouthShape, startListeningFlow]
  );

  // Manual trigger of modes from menu
  const handleTriggerStoryMode = () => {
    handleChildSpoke('Conta uma história mágica e divertida para mim!', 'stories');
  };

  const handleTriggerStudyMode = () => {
    handleChildSpoke('Me conta uma curiosidade incrível sobre a natureza ou o espaço!', 'studies');
  };

  const handleTriggerGameMode = () => {
    handleChildSpoke('Vamos brincar de O Que É, O Que É?', 'games');
  };

  const handleTriggerLanguageMode = () => {
    handleChildSpoke('Me ensina uma palavrinha nova em outro idioma!', 'languages');
  };

  // Test an emotion directly from the menu
  const handleTestEmotion = (newEmotion: LeoEmotion) => {
    setEmotion(newEmotion);
    if (newEmotion === 'FELIZ' || newEmotion === 'COMEMORANDO') {
      setCurrentMouthShape('SMILE');
      if (settings.soundEffects) leoAudio.playCelebrateChime();
    } else if (newEmotion === 'SURPRESO') {
      setCurrentMouthShape('O_BIG');
      if (settings.soundEffects) leoAudio.playIdeaPing();
    } else if (newEmotion === 'CURIOSO') {
      setCurrentMouthShape('O_SMALL');
      if (settings.soundEffects) leoAudio.playCuriousTone();
    } else if (newEmotion === 'PENSANDO') {
      setLifeState('THINKING');
      setThinkingPhase('idea');
      setTimeout(() => setLifeState('ACTIVE'), 2000);
    } else if (newEmotion === 'CONFUSO') {
      setCurrentMouthShape('LINE');
      if (settings.soundEffects) leoAudio.playCuriousTone();
    }
  };

  // Tap on LÉO
  const handleLeoTap = () => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') {
      triggerWakeSequence();
    } else if (lifeState === 'ACTIVE') {
      // Friendly giggle / cheer reaction
      setEmotion('COMEMORANDO');
      setCurrentMouthShape('SMILE');
      if (settings.soundEffects) {
        leoAudio.playCelebrateChime();
      }
      setTimeout(() => {
        setEmotion('FELIZ');
      }, 1400);
    }
  };

  // Main button action: "Modo Conversa Contínua (Hands-free com VAD)"
  const handleTalkButtonClick = () => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') {
      triggerWakeSequence();
      return;
    }

    if (isContinuousSessionActive || audioState === 'LISTENING' || audioState === 'STARTING_MIC') {
      // Pause active listening & continuous session
      setIsContinuousSessionActive(false);
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
      stopListening();
    } else {
      // Start continuous conversation mode
      setIsContinuousSessionActive(true);
      consecutiveNoSpeechRef.current = 0;
      startListeningFlow();
    }
  };

  return (
    <main
      className="relative w-screen h-screen bg-black overflow-hidden flex flex-col items-center justify-center select-none"
      style={{
        backgroundColor: '#030406',
        backgroundImage: 'radial-gradient(ellipse at center, #0a0e14 0%, #000000 85%)',
      }}
    >
      {/* Hidden Three-Dots Menu (discreet ⋮ in top-right) */}
      <ThreeDotsMenu
        lifeState={lifeState}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
        onTogglePower={handleTogglePower}
        onTriggerStoryMode={handleTriggerStoryMode}
        onTriggerStudyMode={handleTriggerStudyMode}
        onTriggerGameMode={handleTriggerGameMode}
        onTriggerLanguageMode={handleTriggerLanguageMode}
        onTestEmotion={handleTestEmotion}
        sessionDurationSeconds={sessionSeconds}
      />

      {/* CENTERPIECE: LÉO prominent in the dark occupying 55% to 70% of available screen */}
      <div className="relative z-10 flex-1 w-full max-w-3xl flex flex-col items-center justify-center px-4 pt-2 pb-24">
        <LeoCharacter
          lifeState={lifeState}
          audioState={audioState}
          emotion={emotion}
          mouthShape={currentMouthShape}
          vocalIntensity={vocalIntensity}
          lightTone={settings.lightTone}
          lightIntensity={settings.lightIntensity}
          thinkingPhase={thinkingPhase}
          onTap={handleLeoTap}
        />

        {/* Wake-up invitation when OFF */}
        <AnimatePresence>
          {lifeState === 'OFF' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              onClick={handleTogglePower}
              className="mt-6 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm text-xs tracking-widest uppercase text-white/50 hover:text-white/80 hover:bg-white/10 cursor-pointer transition-all"
            >
              Toque para acordar o LÉO ✨
            </motion.div>
          )}
        </AnimatePresence>

        {/* Friendly Error / Try Again Banner when microphone or speech fails */}
        <AnimatePresence>
          {audioState === 'ERROR' && errorMessage && lifeState !== 'OFF' && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="mt-6 flex flex-col items-center gap-3 p-4 rounded-2xl bg-zinc-900/90 border border-white/15 backdrop-blur-xl shadow-2xl max-w-sm text-center"
            >
              <div className="flex items-center gap-2 text-amber-300 text-sm font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => {
                  setAudioState('IDLE');
                  startListeningFlow();
                }}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow-lg active:scale-95"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Primary Interaction Button: "Modo Conversa Contínua (Hands-free com VAD)" */}
      {lifeState !== 'OFF' && lifeState !== 'SLEEPING' && (
        <div className="fixed bottom-7 z-30 flex flex-col items-center gap-2.5">
          {/* Hands-free mode indicator badge */}
          {settings.continuousConversationMode !== false && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 px-3.5 py-1 rounded-full text-[11px] font-medium transition-all backdrop-blur-md border ${
                isContinuousSessionActive
                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(52,211,153,0.2)]'
                  : 'bg-white/5 border-white/10 text-white/40'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isContinuousSessionActive ? 'bg-emerald-400 animate-ping' : 'bg-white/30'
                }`}
              />
              <span>
                {isContinuousSessionActive
                  ? 'Conversa Contínua Ativa (Mãos Livres • VAD)'
                  : 'Modo Conversa Contínua (Hands-free)'}
              </span>
              {isContinuousSessionActive && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsContinuousSessionActive(false);
                    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
                    stopListening();
                  }}
                  className="ml-1 text-[10px] text-white/60 hover:text-white underline cursor-pointer"
                >
                  Pausar
                </button>
              )}
            </motion.div>
          )}

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={handleTalkButtonClick}
              disabled={audioState === 'THINKING' || audioState === 'ANSWERING'}
              className={`flex items-center gap-3 px-6 py-3.5 rounded-full text-sm font-semibold tracking-wide transition-all shadow-xl backdrop-blur-xl border ${
                audioState === 'LISTENING'
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-200 shadow-[0_0_25px_rgba(52,211,153,0.3)] ring-2 ring-emerald-400/30'
                  : audioState === 'REQUESTING_MIC_PERMISSION' || audioState === 'STARTING_MIC'
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                  : audioState === 'THINKING' || audioState === 'ANSWERING'
                  ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                  : isContinuousSessionActive
                  ? 'bg-emerald-950/40 border-emerald-400/30 text-emerald-200 shadow-[0_0_20px_rgba(52,211,153,0.2)]'
                  : 'bg-white/10 hover:bg-white/20 border-white/15 text-white/90 hover:text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]'
              }`}
            >
              {audioState === 'LISTENING' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                  <span>Ouvindo você... (fale à vontade)</span>
                </>
              ) : audioState === 'REQUESTING_MIC_PERMISSION' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
                  <span>Pedindo permissão...</span>
                </>
              ) : audioState === 'STARTING_MIC' ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-sky-300" />
                  <span>Iniciando microfone...</span>
                </>
              ) : audioState === 'THINKING' ? (
                <>
                  <span className="text-base">💭</span>
                  <span>Léo está pensando...</span>
                </>
              ) : audioState === 'ANSWERING' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                  <span>Léo respondendo...</span>
                </>
              ) : isContinuousSessionActive ? (
                <>
                  <Mic className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span>Conversando... (Toque para pausar)</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-emerald-400" />
                  <span>
                    {settings.continuousConversationMode !== false
                      ? 'Iniciar Conversa Contínua'
                      : 'Toque para falar'}
                  </span>
                </>
              )}
            </motion.button>

            {/* Subtle fallback keyboard trigger */}
            <button
              onClick={() => setShowQuickInput(!showQuickInput)}
              title="Digitar para o LÉO"
              className="p-3 rounded-full text-white/30 hover:text-white/80 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Discreet text input modal (only when user explicitly taps keyboard icon) */}
      <AnimatePresence>
        {showQuickInput && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-24 z-40 w-11/12 max-w-md p-2 rounded-2xl bg-zinc-900/95 backdrop-blur-xl border border-white/15 shadow-2xl flex items-center gap-2"
          >
            <input
              type="text"
              autoFocus
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textInput.trim()) {
                  handleChildSpoke(textInput);
                  setTextInput('');
                  setShowQuickInput(false);
                }
              }}
              placeholder="Digite o que deseja falar para o LÉO..."
              className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none"
            />
            <button
              onClick={() => {
                if (textInput.trim()) {
                  handleChildSpoke(textInput);
                  setTextInput('');
                  setShowQuickInput(false);
                }
              }}
              className="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold text-white transition-colors"
            >
              Enviar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
