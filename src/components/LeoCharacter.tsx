import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LeoEmotion, LeoLifeState, MouthShape, LightTone, AudioSystemState } from '../types/leo';

interface LeoCharacterProps {
  lifeState: LeoLifeState;
  audioState: AudioSystemState;
  emotion: LeoEmotion;
  mouthShape: MouthShape;
  vocalIntensity?: number; // 0.0 to 1.0 from real-time lip sync
  lightTone?: LightTone;
  lightIntensity?: number;
  thinkingPhase?: 'dots_1' | 'dots_2' | 'dots_3' | 'idea';
  onTap?: () => void;
}

export const LeoCharacter: React.FC<LeoCharacterProps> = ({
  lifeState,
  audioState,
  emotion,
  mouthShape,
  vocalIntensity = 0,
  lightTone = 'pure-white',
  lightIntensity = 1,
  thinkingPhase = 'dots_2',
  onTap,
}) => {
  // Gentle ambient gaze tracking
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (lifeState === 'OFF' || lifeState === 'SLEEPING') return;
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2;
      const normY = (e.clientY / innerHeight - 0.5) * 2;

      setGaze({
        x: Math.max(-6, Math.min(6, normX * 6)),
        y: Math.max(-5, Math.min(5, normY * 5)),
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [lifeState]);

  // Periodic natural blinking (quick, organic blink)
  useEffect(() => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') return;

    let timeoutId: NodeJS.Timeout;
    const scheduleBlink = () => {
      const nextTime = Math.random() * 3400 + 2400;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // Occasional double blink
          if (Math.random() < 0.2) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 90);
            }, 130);
          }
        }, 110);
        scheduleBlink();
      }, nextTime);
    };

    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, [lifeState]);

  // Luminous white tone palette with soft bloom
  const toneColors = useMemo(() => {
    switch (lightTone) {
      case 'warm-white':
        return {
          core: '#ffffff',
          glow1: 'rgba(255, 248, 230, 0.98)',
          glow2: 'rgba(255, 230, 180, 0.75)',
          glow3: 'rgba(255, 205, 130, 0.35)',
          halo: 'rgba(255, 220, 160, 0.16)',
        };
      case 'cyan-lumen':
        return {
          core: '#ffffff',
          glow1: 'rgba(224, 251, 255, 0.98)',
          glow2: 'rgba(103, 232, 249, 0.75)',
          glow3: 'rgba(6, 182, 212, 0.32)',
          halo: 'rgba(6, 182, 212, 0.14)',
        };
      case 'aurora':
        return {
          core: '#ffffff',
          glow1: 'rgba(245, 243, 255, 0.98)',
          glow2: 'rgba(196, 181, 253, 0.75)',
          glow3: 'rgba(147, 197, 253, 0.32)',
          halo: 'rgba(167, 139, 250, 0.14)',
        };
      case 'pure-white':
      default:
        return {
          core: '#ffffff',
          glow1: 'rgba(255, 255, 255, 1)',
          glow2: 'rgba(255, 255, 255, 0.72)',
          glow3: 'rgba(220, 235, 255, 0.4)',
          halo: 'rgba(255, 255, 255, 0.18)',
        };
    }
  }, [lightTone]);

  const emotionMultiplier = useMemo(() => {
    switch (emotion) {
      case 'COMEMORANDO':
        return 1.35;
      case 'FELIZ':
        return 1.2;
      case 'SURPRESO':
        return 1.25;
      case 'CURIOSO':
        return 1.1;
      case 'PENSANDO':
        return 0.95;
      case 'CONFUSO':
        return 0.95;
      default:
        return 1.0;
    }
  }, [emotion]);

  const totalBrightness = lifeState === 'OFF' ? 0 : lightIntensity * emotionMultiplier;

  // Luminous bloom filter with vocal energy modulation
  const lightGlowFilter = useMemo(() => {
    if (lifeState === 'OFF') return 'none';
    const b = totalBrightness * (1 + vocalIntensity * 0.15);
    return `
      drop-shadow(0 0 ${4 * b}px ${toneColors.core})
      drop-shadow(0 0 ${14 * b}px ${toneColors.glow1})
      drop-shadow(0 0 ${32 * b}px ${toneColors.glow2})
      drop-shadow(0 0 ${64 * b}px ${toneColors.glow3})
    `;
  }, [lifeState, totalBrightness, toneColors, vocalIntensity]);

  // Subtle emotional head tilt
  const headTilt = useMemo(() => {
    if (emotion === 'CURIOSO') return 5;
    if (emotion === 'CONFUSO') return -6;
    return 0;
  }, [emotion]);

  const effectiveGaze = useMemo(() => {
    if (lifeState === 'THINKING' || emotion === 'PENSANDO') {
      return { x: 1, y: -14 }; // Look up thoughtfully
    }
    if (audioState === 'LISTENING') {
      return { x: 0, y: 0 }; // Look directly and warmly at the child
    }
    return gaze;
  }, [lifeState, emotion, audioState, gaze]);

  const isSleeping = lifeState === 'SLEEPING';
  const isWaking = lifeState === 'WAKING';
  const isOff = lifeState === 'OFF';
  const isActuallyListening = audioState === 'LISTENING';
  const isSpeaking = lifeState === 'SPEAKING' || audioState === 'ANSWERING';

  // Comprehensive, expressive mouth shapes
  const mouthSvgContent = useMemo(() => {
    if (isSleeping) {
      // Sleeping shut mouth line
      return (
        <motion.line
          x1="82"
          y1="126"
          x2="118"
          y2="126"
          stroke={toneColors.core}
          strokeWidth="6"
          strokeLinecap="round"
          animate={{ scaleX: [1, 0.6, 0], opacity: [1, 0.5, 0] }}
          transition={{ duration: 1.2 }}
        />
      );
    }

    switch (mouthShape) {
      case 'NEUTRAL':
      case 'LINE':
        // Soft calm resting line
        return (
          <motion.path
            d="M 80 126 L 120 126"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="9"
            strokeLinecap="round"
            transition={{ duration: 0.12 }}
          />
        );

      case 'HAPPY':
        // Wide joyous smile
        return (
          <motion.path
            d="M 64 116 A 38 38 0 0 0 136 116"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="13.5"
            strokeLinecap="round"
            transition={{ duration: 0.12 }}
          />
        );

      case 'OPEN':
      case 'TALK_1':
        // Medium open mouth (vowels A, E)
        return (
          <motion.path
            d="M 72 120 Q 100 148 128 120"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            transition={{ duration: 0.1 }}
          />
        );

      case 'WIDE_OPEN':
      case 'TALK_2':
        // Wide open mouth (loud vowels, emphasis)
        return (
          <motion.path
            d="M 70 118 Q 100 158 130 118"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            transition={{ duration: 0.1 }}
          />
        );

      case 'SMALL_O':
      case 'O_SMALL':
        // Rounded small "O" (vowels O, U)
        return (
          <motion.ellipse
            cx="100"
            cy="126"
            rx="11"
            ry="13"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="10"
            strokeLinecap="round"
            transition={{ duration: 0.1 }}
          />
        );

      case 'SURPRISED':
      case 'O_BIG':
        // Big round surprised "O"
        return (
          <motion.circle
            cx="100"
            cy="126"
            r="16.5"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="11"
            strokeLinecap="round"
            transition={{ duration: 0.12 }}
          />
        );

      case 'THINKING':
        // Small focused mouth
        return (
          <motion.line
            x1="88"
            y1="126"
            x2="112"
            y2="126"
            stroke={toneColors.core}
            strokeWidth="8"
            strokeLinecap="round"
            transition={{ duration: 0.12 }}
          />
        );

      case 'SAD':
        // Downturned gentle curve
        return (
          <motion.path
            d="M 74 136 Q 100 120 126 136"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="10"
            strokeLinecap="round"
            transition={{ duration: 0.15 }}
          />
        );

      case 'TALKING':
      case 'TALK_3':
        // Articulation smile arc
        return (
          <motion.path
            d="M 68 118 A 34 34 0 0 0 132 118"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="11.5"
            strokeLinecap="round"
            transition={{ duration: 0.1 }}
          />
        );

      case 'SMILE':
      default:
        // Iconic curved smile arc from reference image!
        return (
          <motion.path
            d="M 66 116 A 37 37 0 0 0 134 116"
            fill="none"
            stroke={toneColors.core}
            strokeWidth="13.5"
            strokeLinecap="round"
            transition={{ duration: 0.15 }}
          />
        );
    }
  }, [isSleeping, mouthShape, toneColors]);

  return (
    <div
      onClick={onTap}
      className="relative flex flex-col items-center justify-center select-none cursor-pointer w-full max-w-[620px] aspect-square transition-all"
      style={{
        // Takes 55% to 70% of viewport height on mobile, scales smoothly on desktop
        height: 'min(64vh, 620px)',
      }}
      role="button"
      tabIndex={0}
      aria-label="LÉO - Amiguinho Digital Luminoso"
    >
      {/* Soft center ambient bloom directly behind the face */}
      <motion.div
        animate={{
          opacity:
            isOff ? 0 :
            isSleeping ? [0.3, 0.1, 0] :
            isWaking ? [0, 0.4, 0.7] :
            isActuallyListening ? [0.65, 0.8, 0.65] :
            isSpeaking ? [0.6, 0.75, 0.6] :
            [0.5, 0.65, 0.5],
          scale:
            isOff ? 0.7 :
            isActuallyListening ? 1.05 :
            isSpeaking ? 1.03 :
            [0.97, 1.03, 0.97],
        }}
        transition={{
          duration: isSleeping ? 1.6 : 3.4,
          repeat: isOff || isSleeping || isWaking ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-full h-full max-w-[560px] max-h-[560px] rounded-full pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle, ${toneColors.halo} 0%, rgba(255,255,255,0.06) 45%, rgba(0,0,0,0) 72%)`,
        }}
      />

      {/* Floating thought bubble (when THINKING) */}
      <AnimatePresence>
        {(lifeState === 'THINKING' || emotion === 'PENSANDO') && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.7 }}
            animate={{ opacity: 1, y: -130, scale: 1 }}
            exit={{ opacity: 0, y: -150, scale: 0.6 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute z-20 flex items-center justify-center pointer-events-none"
            style={{ filter: lightGlowFilter }}
          >
            <div className="relative px-5 py-2.5 rounded-2xl bg-black/85 border border-white/40 shadow-2xl backdrop-blur-md flex items-center gap-2">
              {thinkingPhase === 'idea' ? (
                <motion.div
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: [1, 1.2, 1.1], rotate: [0, 8, 0] }}
                  className="flex items-center gap-1.5 text-yellow-200 text-xl font-bold"
                >
                  <span className="text-2xl drop-shadow-[0_0_8px_rgba(255,230,100,0.9)]">💡</span>
                  <span className="text-xs uppercase tracking-widest text-white/90 font-mono">Ideia!</span>
                </motion.div>
              ) : (
                <div className="flex items-center gap-2 text-white">
                  <span className="text-xl">💭</span>
                  <div className="flex items-center gap-1.5 h-4">
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
                      className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.25 }}
                      className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
                      className="w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                  </div>
                </div>
              )}

              <div className="absolute -bottom-2 left-6 w-2 h-2 rounded-full bg-white/70 border border-black" />
              <div className="absolute -bottom-4 left-5 w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reactive Question Mark ❓ or Cheer Stars ⭐ */}
      <AnimatePresence>
        {(emotion === 'CONFUSO' || audioState === 'ERROR') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1.1, rotate: 10, y: -110, x: 80 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3 }}
            className="absolute z-20 text-3xl font-bold text-sky-200 pointer-events-none"
            style={{ filter: lightGlowFilter }}
          >
            ❓
          </motion.div>
        )}

        {emotion === 'COMEMORANDO' && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.8], y: [-40, -110], scale: [0.6, 1.2, 1] }}
            exit={{ opacity: 0, y: -120, scale: 0.5 }}
            transition={{ duration: 1.4, repeat: Infinity }}
            className="absolute -top-14 z-20 pointer-events-none flex items-center gap-3 text-2xl text-yellow-300"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,230,100,0.8))' }}
          >
            <span>⭐</span>
            <span className="text-sm tracking-wider uppercase font-semibold text-white/90">Eba!</span>
            <span>✨</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Listening indicator badge */}
      <AnimatePresence>
        {isActuallyListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            className="absolute -top-12 z-20 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-semibold backdrop-blur-md pointer-events-none"
            style={{ filter: 'drop-shadow(0 0 8px rgba(52,211,153,0.6))' }}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Ouvindo você...</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating body container (smooth organic breath - ZERO tremedeira!) */}
      <motion.div
        animate={{
          y:
            isOff ? 10 :
            isSleeping ? 18 :
            emotion === 'COMEMORANDO' ? [0, -12, 0, -8, 0] :
            [0, -8, 0],
          rotate: headTilt,
          scale:
            isOff ? 0.9 :
            isSleeping ? 0.92 :
            isWaking ? [0.85, 1.05, 1.0] :
            emotion === 'SURPRESO' ? 1.05 :
            1.0,
        }}
        transition={{
          y: {
            duration: isSleeping ? 4 : emotion === 'COMEMORANDO' ? 1.6 : 3.6,
            repeat: isOff || isSleeping ? 0 : Infinity,
            ease: 'easeInOut',
          },
          rotate: { duration: 0.5, ease: 'easeOut' },
          scale: { duration: 0.5 },
        }}
        className="relative w-full h-full flex items-center justify-center"
      >
        {/* Luminous Face SVG Canvas - ViewBox 0 0 200 200, scales dynamically with container */}
        <motion.svg
          viewBox="0 0 200 200"
          className="w-full h-full max-w-full max-h-full overflow-visible"
          animate={{
            opacity:
              isOff ? 0 :
              isSleeping ? [1, 0.4, 0] :
              isWaking ? [0, 0.4, 1] :
              1,
          }}
          transition={{
            duration: isSleeping ? 1.6 : isWaking ? 1.2 : 0.3,
            times: isSleeping ? [0, 0.6, 1] : [0, 0.4, 1],
          }}
          style={{
            filter: lightGlowFilter,
          }}
        >
          {/* LEFT EYE (Large, round, luminous LED disc) */}
          <g
            transform={`translate(${78 + effectiveGaze.x * 0.4}, ${78 + effectiveGaze.y * 0.4})`}
          >
            {isSleeping ? (
              // Sleeping closed line
              <motion.line
                x1="-16"
                y1="0"
                x2="16"
                y2="0"
                stroke={toneColors.core}
                strokeWidth="5"
                strokeLinecap="round"
                animate={{ opacity: [1, 0.4, 0] }}
                transition={{ duration: 1.2 }}
              />
            ) : (
              // Big round luminous LED light disc
              <motion.circle
                cx="0"
                cy="0"
                r={emotion === 'SURPRESO' ? 19.5 : 17.5}
                fill={toneColors.core}
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.15 : 1,
                }}
                transition={{ duration: 0.09 }}
              />
            )}
          </g>

          {/* RIGHT EYE (Large, round, luminous LED disc) */}
          <g
            transform={`translate(${122 + effectiveGaze.x * 0.4}, ${78 + effectiveGaze.y * 0.4})`}
          >
            {isSleeping ? (
              // Sleeping closed line
              <motion.line
                x1="-16"
                y1="0"
                x2="16"
                y2="0"
                stroke={toneColors.core}
                strokeWidth="5"
                strokeLinecap="round"
                animate={{ opacity: [1, 0.4, 0] }}
                transition={{ duration: 1.2 }}
              />
            ) : (
              // Big round luminous LED light disc
              <motion.circle
                cx="0"
                cy="0"
                r={emotion === 'SURPRESO' ? 19.5 : 17.5}
                fill={toneColors.core}
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.15 : 1,
                }}
                transition={{ duration: 0.09 }}
              />
            )}
          </g>

          {/* LUMINOUS MOUTH (Expressive digital light ribbon with real Lip Sync driven by Web Audio AnalyserNode) */}
          <motion.g
            transform={`translate(${effectiveGaze.x * 0.15}, ${effectiveGaze.y * 0.15})`}
            style={{ transformOrigin: '100px 126px' }}
            animate={{
              scaleY: isSpeaking ? 1 + vocalIntensity * 0.95 : 1,
              scaleX: isSpeaking ? Math.max(0.75, 1 - vocalIntensity * 0.18) : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 28,
              mass: 0.4,
            }}
          >
            {mouthSvgContent}
          </motion.g>
        </motion.svg>
      </motion.div>
    </div>
  );
};

export const BobiCharacter = LeoCharacter;
