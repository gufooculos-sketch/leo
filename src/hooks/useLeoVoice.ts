import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioSystemState, LeoEmotion, MouthShape } from '../types/leo';
import { lipSyncEngine } from '../services/lipSyncEngine';

interface UseLeoVoiceProps {
  voicePitch?: number;
  voiceRate?: number;
  soundEffects?: boolean;
  onTranscriptReady?: (transcript: string) => void;
  onError?: (errorMessage: string, errorType: string) => void;
}

// Development logger helper
function devLog(step: string, data?: any) {
  if (process.env.NODE_ENV !== 'production' || typeof window !== 'undefined') {
    if (data !== undefined) {
      console.log(`[LÉO_VOICE_DEBUG] ${step}:`, data);
    } else {
      console.log(`[LÉO_VOICE_DEBUG] ${step}`);
    }
  }
}

export function useLeoVoice({
  voicePitch = 1.28,
  voiceRate = 1.08,
  onTranscriptReady,
  onError,
}: UseLeoVoiceProps) {
  const [audioState, setAudioState] = useState<AudioSystemState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>('SMILE');
  const [vocalIntensity, setVocalIntensity] = useState<number>(0);
  const [recognizedText, setRecognizedText] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const hasResultRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Check if speech recognition is supported in browser
  const isSpeechRecognitionSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Subscribe to real-time lip sync engine updates
  useEffect(() => {
    lipSyncEngine.subscribe((shape, intensity) => {
      setCurrentMouthShape(shape);
      setVocalIntensity(intensity);
    });
    lipSyncEngine.setRestingShape('SMILE');

    return () => {
      lipSyncEngine.stop();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  /**
   * Request microphone permission explicitly via getUserMedia,
   * then release the track immediately so SpeechRecognition has exclusive hardware access.
   */
  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    devLog('MIC_PERMISSION', 'Verificando permissão de microfone...');
    setErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const msg = 'Seu navegador não suporta captura de microfone.';
      devLog('MIC_PERMISSION', 'MediaDevices não suportado');
      setErrorMessage(msg);
      setAudioState('ERROR');
      onError?.(msg, 'not-supported');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Crucial: Release tracks immediately to prevent audio device lock
      stream.getTracks().forEach((track) => track.stop());

      devLog('MIC_PERMISSION', 'Permissão CONCEDIDA com sucesso');
      return true;
    } catch (err: any) {
      devLog('MIC_PERMISSION', `Permissão NEGADA ou erro: ${err?.name || err}`);
      let userFriendlyMsg = 'Preciso do microfone para conseguir ouvir você. Vamos ativar?';
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        userFriendlyMsg = 'O acesso ao microfone foi negado. Por favor, permita o microfone no navegador para conversar com o Léo.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        userFriendlyMsg = 'Nenhum microfone foi encontrado no seu dispositivo.';
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        userFriendlyMsg = 'O microfone já está sendo usado por outro aplicativo.';
      }

      setErrorMessage(userFriendlyMsg);
      setAudioState('ERROR');
      onError?.(userFriendlyMsg, err?.name || 'permission-denied');
      return false;
    }
  }, [onError]);

  /**
   * Start listening using Web Speech API:
   * continuous: false
   * interimResults: false
   * Only transitions to 'LISTENING' when recognition.onstart fires!
   */
  const startListeningFlow = useCallback(async () => {
    if (isStartingRef.current || audioState === 'STARTING_MIC' || audioState === 'LISTENING') {
      return;
    }

    isStartingRef.current = true;
    setErrorMessage(null);
    hasResultRef.current = false;
    setRecognizedText('');

    // Step 1: Verify / Request mic permission
    devLog('MIC_INITIALIZING', 'Iniciando fluxo de áudio...');
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      isStartingRef.current = false;
      return;
    }

    // Step 2: Set STARTING_MIC state (LÉO does NOT enter LISTENING yet!)
    setAudioState('STARTING_MIC');
    devLog('MIC_INITIALIZING', 'Estado: STARTING_MIC (Aguardando onstart)');

    if (!isSpeechRecognitionSupported) {
      const msg = 'Reconhecimento de voz não suportado neste navegador. Utilize o Chrome ou Edge.';
      devLog('MIC_INITIALIZING', msg);
      setErrorMessage(msg);
      setAudioState('ERROR');
      isStartingRef.current = false;
      onError?.(msg, 'speech-api-missing');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    // Abort any prior instance safely
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;

      // onstart: ONLY HERE does LÉO enter 'LISTENING' (hardware is actively streaming audio)
      recognition.onstart = () => {
        isStartingRef.current = false;
        console.log('[LÉO_VOICE_DEBUG] onstart disparado: microfone capturando áudio real. Ativando estado LISTENING.');
        devLog('MIC_STARTED', 'Microfone iniciado com sucesso e capturando áudio real');
        devLog('LISTENING', 'Estado LISTENING ativado sem tremedeira');
        setAudioState('LISTENING');
        setErrorMessage(null);
      };

      recognition.onaudiostart = () => {
        devLog('AUDIO_RECEIVED', 'Fluxo de áudio recebido pelo motor de fala');
      };

      recognition.onspeechstart = () => {
        devLog('SPEECH_RECOGNIZED', 'Início da fala da criança detectado');
      };

      recognition.onspeechend = () => {
        devLog('SPEECH_RECOGNIZED', 'Fim da fala da criança detectado (onspeechend)');
        setAudioState('PROCESSING_AUDIO');
      };

      recognition.onresult = (event: any) => {
        if (!event.results || event.results.length === 0) return;

        const transcript = event.results[0][0]?.transcript?.trim();
        if (transcript) {
          hasResultRef.current = true;
          devLog('TEXT_CREATED', transcript);
          setRecognizedText(transcript);
          setAudioState('PROCESSING_AUDIO');

          // Deliver final transcript to callback
          onTranscriptReady?.(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        isStartingRef.current = false;
        devLog('SPEECH_RECOGNITION_ERROR', event.error);

        if (event.error === 'no-speech') {
          setErrorMessage('Hmm... não consegui ouvir você. Vamos tentar de novo?');
          setAudioState('ERROR');
          onError?.('Hmm... não consegui ouvir você. Vamos tentar de novo?', 'no-speech');
        } else if (event.error === 'not-allowed') {
          setErrorMessage('Preciso do microfone para conseguir ouvir você. Vamos ativar?');
          setAudioState('ERROR');
          onError?.('Preciso do microfone para conseguir ouvir você. Vamos ativar?', 'not-allowed');
        } else if (event.error !== 'aborted') {
          setErrorMessage('Não consegui entender direitinho. Pode falar de novo?');
          setAudioState('ERROR');
          onError?.('Erro ao capturar fala', event.error);
        }
      };

      recognition.onend = () => {
        isStartingRef.current = false;
        devLog('LISTENING', 'Sessão de captura encerrada (onend)');
        recognitionRef.current = null;

        // If recognition ended without finding any speech and not in error, trigger friendly prompt
        if (!hasResultRef.current) {
          setAudioState((prev) => {
            if (prev === 'LISTENING' || prev === 'STARTING_MIC') {
              setErrorMessage('Hmm... não consegui ouvir você. Vamos tentar de novo?');
              return 'ERROR';
            }
            return prev;
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      isStartingRef.current = false;
      devLog('MIC_INITIALIZING', `Exceção ao instanciar recognition: ${err}`);
      setErrorMessage('Não foi possível iniciar o microfone. Tente novamente.');
      setAudioState('ERROR');
      onError?.('Falha ao iniciar microfone', err?.message || 'init-failed');
    }
  }, [audioState, isSpeechRecognitionSupported, onError, onTranscriptReady, requestMicPermission]);

  /**
   * Stop listening manually
   */
  const stopListening = useCallback(() => {
    isStartingRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setAudioState('IDLE');
  }, []);

  /**
   * Speak response with Web Audio API AnalyserNode real-time amplitude lip sync
   */
  const speakText = useCallback(
    (text: string, emotion: LeoEmotion = 'FELIZ', _audioBase64?: string): Promise<void> => {
      return new Promise(async (resolve) => {
        devLog('TTS_STARTED', text);
        setAudioState('ANSWERING');

        // Set resting shape based on emotion
        const restingShape: MouthShape =
          emotion === 'FELIZ' || emotion === 'COMEMORANDO' ? 'SMILE' :
          emotion === 'SURPRESO' ? 'SURPRISED' :
          emotion === 'CURIOSO' ? 'TALKING' :
          emotion === 'PENSANDO' ? 'THINKING' :
          emotion === 'CONFUSO' ? 'SAD' : 'SMILE';

        lipSyncEngine.setRestingShape(restingShape);

        // 1. Primary Path: Web Audio API (AnalyserNode real-time volume analysis)
        try {
          if (!audioContextRef.current) {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new AudioCtx();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }

          // Fetch audio buffer from /api/tts
          const encoded = encodeURIComponent(text);
          const ttsRes = await fetch(`/api/tts?text=${encoded}`);

          if (ttsRes.ok) {
            const arrayBuffer = await ttsRes.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            // Create AudioBufferSourceNode
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            // Playback rate: 1.15 lively, cheerful tempo
            source.playbackRate.value = voiceRate || 1.12;

            // Create AnalyserNode (Web Audio API)
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.35;

            // Audio Graph: Source -> Analyser -> Speakers
            source.connect(analyser);
            analyser.connect(ctx.destination);

            // Connect AnalyserNode directly to LipSyncEngine
            lipSyncEngine.startAudioAnalysis(analyser, ctx);

            source.onended = () => {
              devLog('TTS_FINISHED', 'Web Audio TTS concluído');
              lipSyncEngine.stop();
              setAudioState('IDLE');
              resolve();
            };

            source.start(0);
            return;
          }
        } catch (webAudioErr) {
          console.warn('[LÉO_VOICE] Web Audio API streaming fallback:', webAudioErr);
        }

        // 2. Secondary Path: Fallback SpeechSynthesis with active lip sync
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          devLog('TTS_FINISHED', 'SpeechSynthesis não disponível');
          lipSyncEngine.stop();
          setAudioState('IDLE');
          resolve();
          return;
        }

        window.speechSynthesis.cancel();

        // Start Lip Sync phoneme tracking
        lipSyncEngine.startPhonemeTracking(text);

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';

        // Select the sweetest, most natural, humanized cute child/female voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoices = voices.filter((v) => v.lang === 'pt-BR' || v.lang.startsWith('pt'));

        // Look for sweet child/female voices
        const ptVoice =
          ptVoices.find((v) => /google português|google portuguese/i.test(v.name)) ||
          ptVoices.find((v) => /francisca|luciana|leticia|letícia|vitória|vitoria|maria|brenda|camila|heloisa/i.test(v.name)) ||
          ptVoices.find((v) => /natural|online|neural/i.test(v.name)) ||
          ptVoices.find((v) => !/daniel|ricardo|felipe|jorge|antonio/i.test(v.name)) ||
          ptVoices[0] ||
          voices[0];

        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        // If voice is naturally deeper, elevate pitch for child tone
        const isMaleOrDeep = ptVoice && /daniel|ricardo|felipe|jorge/i.test(ptVoice.name);
        utterance.pitch = isMaleOrDeep ? 1.38 : (voicePitch || 1.28);
        utterance.rate = voiceRate || 1.08;

        // Real-time phoneme boundary events
        utterance.onboundary = (e: SpeechSynthesisEvent) => {
          lipSyncEngine.onWordBoundary(e.charIndex, (e as any).charLength || 5);
        };

        const finish = () => {
          devLog('TTS_FINISHED', 'Fala concluída com sucesso');
          lipSyncEngine.stop();
          setAudioState('IDLE');
          resolve();
        };

        utterance.onend = finish;
        utterance.onerror = (e) => {
          console.warn('TTS error:', e);
          finish();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [voicePitch, voiceRate]
  );

  return {
    audioState,
    setAudioState,
    errorMessage,
    recognizedText,
    currentMouthShape,
    setCurrentMouthShape,
    vocalIntensity,
    startListeningFlow,
    stopListening,
    speakText,
    isSpeechRecognitionSupported,
  };
}
