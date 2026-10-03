import { useEffect, useRef, useState, useCallback } from 'react';
import { BobiEmotion, MouthShape } from '../types/bobi';
import { bobiAudio } from '../audio/bobiAudio';

interface UseBobiVoiceProps {
  onChildSpeechStart?: () => void;
  onChildSpeechFinal?: (text: string) => void;
  onSpeechEnd?: () => void;
  voicePitch?: number;
  voiceRate?: number;
  soundEffects?: boolean;
}

export function useBobiVoice({
  onChildSpeechStart,
  onChildSpeechFinal,
  onSpeechEnd,
  voicePitch = 1.15,
  voiceRate = 1.0,
  soundEffects = true,
}: UseBobiVoiceProps) {
  const [isMicAvailable, setIsMicAvailable] = useState<boolean>(true);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [currentMouthShape, setCurrentMouthShape] = useState<MouthShape>('LINE');
  const [audioLevel, setAudioLevel] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const interimTranscriptRef = useRef<string>('');
  const speechAnimationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('SpeechRecognition API not available in this browser');
      setIsMicAvailable(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        if (isSpeakingRef.current) return; // Don't listen to himself

        let finalTranscript = '';
        let interim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interim += item[0].transcript;
          }
        }

        const combined = (finalTranscript || interim).trim();
        if (combined.length > 0) {
          interimTranscriptRef.current = combined;
          onChildSpeechStart?.();

          // Reset silence timer on every speech event
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }

          // Automatic pause detection (800ms silence after child stops speaking)
          silenceTimerRef.current = setTimeout(() => {
            const spokenText = interimTranscriptRef.current.trim();
            if (spokenText.length > 1) {
              interimTranscriptRef.current = '';
              onChildSpeechFinal?.(spokenText);
            }
          }, 850);
        }
      };

      recognition.onerror = (event: any) => {
        // If aborted or no speech, ignore silently and keep ready
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('SpeechRecognition error:', event.error);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        // Automatically restart if not currently speaking
        if (!isSpeakingRef.current && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            // Already active or denied
          }
        }
      };

      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Failed to configure speech recognition:', err);
      setIsMicAvailable(false);
    }

    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, [onChildSpeechFinal, onChildSpeechStart]);

  // Audio level meter using MediaStream (if permission granted)
  const startAudioMeter = useCallback(async () => {
    if (audioContextRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const buffer = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          sum += buffer[i];
        }
        const avg = sum / buffer.length;
        setAudioLevel(Math.min(1, avg / 80));
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch {
      // User didn't allow mic stream or denied
    }
  }, []);

  const stopAudioMeter = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  }, []);

  // Start continuous listening
  const startListening = useCallback(async () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        // Recognition might already be running
      }
    }
    startAudioMeter().catch(() => {});
  }, [startAudioMeter]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    stopAudioMeter();
  }, [stopAudioMeter]);

  // Mouth animation during speech
  const startMouthTalkAnimation = useCallback(() => {
    const talkShapes: MouthShape[] = ['TALK_1', 'TALK_2', 'TALK_3', 'O_SMALL', 'SMILE'];
    let step = 0;

    if (speechAnimationIntervalRef.current) {
      clearInterval(speechAnimationIntervalRef.current);
    }

    speechAnimationIntervalRef.current = setInterval(() => {
      step = (step + 1) % talkShapes.length;
      setCurrentMouthShape(talkShapes[step]);
    }, 120);
  }, []);

  const stopMouthTalkAnimation = useCallback((restingEmotion: BobiEmotion = 'NEUTRO') => {
    if (speechAnimationIntervalRef.current) {
      clearInterval(speechAnimationIntervalRef.current);
      speechAnimationIntervalRef.current = null;
    }
    if (restingEmotion === 'FELIZ' || restingEmotion === 'COMEMORANDO') {
      setCurrentMouthShape('SMILE');
    } else if (restingEmotion === 'SURPRESO') {
      setCurrentMouthShape('O_BIG');
    } else if (restingEmotion === 'CURIOSO') {
      setCurrentMouthShape('O_SMALL');
    } else {
      setCurrentMouthShape('LINE');
    }
  }, []);

  // Speak text with synchronized luminous mouth
  const speakText = useCallback(
    (text: string, emotion: BobiEmotion = 'FELIZ'): Promise<void> => {
      return new Promise((resolve) => {
        if (!('speechSynthesis' in window)) {
          console.warn('SpeechSynthesis not supported');
          resolve();
          return;
        }

        // Cancel any pending speech
        window.speechSynthesis.cancel();

        isSpeakingRef.current = true;
        setIsSpeaking(true);
        startMouthTalkAnimation();

        // Temporarily pause recognition to not pick up own voice
        if (recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {}
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = voiceRate;
        utterance.pitch = voicePitch;

        // Choose best available Portuguese voice
        const voices = window.speechSynthesis.getVoices();
        const ptVoice =
          voices.find(
            (v) =>
              v.lang.startsWith('pt') &&
              (v.name.includes('Google') ||
                v.name.includes('Luciana') ||
                v.name.includes('Francisca') ||
                v.name.includes('Felipe') ||
                v.name.includes('Natural'))
          ) || voices.find((v) => v.lang.startsWith('pt')) || voices[0];

        if (ptVoice) {
          utterance.voice = ptVoice;
        }

        utterance.onboundary = () => {
          // Dynamic jitter with speech rhythm
          const shapes: MouthShape[] = ['TALK_1', 'TALK_2', 'TALK_3', 'O_SMALL'];
          const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
          setCurrentMouthShape(randomShape);
        };

        const cleanupAndFinish = () => {
          isSpeakingRef.current = false;
          setIsSpeaking(false);
          stopMouthTalkAnimation(emotion);
          onSpeechEnd?.();

          // Resume listening
          if (recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch {}
          }
          resolve();
        };

        utterance.onend = cleanupAndFinish;
        utterance.onerror = (e) => {
          console.warn('SpeechSynthesis error:', e);
          cleanupAndFinish();
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [onSpeechEnd, startMouthTalkAnimation, stopMouthTalkAnimation, voicePitch, voiceRate]
  );

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setIsSpeaking(false);
    stopMouthTalkAnimation('NEUTRO');
  }, [stopMouthTalkAnimation]);

  return {
    isMicAvailable,
    isListening,
    isSpeaking,
    currentMouthShape,
    audioLevel,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
    setCurrentMouthShape,
  };
}
