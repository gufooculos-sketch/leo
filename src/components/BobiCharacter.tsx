import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BobiEmotion, BobiLifeState, MouthShape, LightTone } from '../types/bobi';

interface BobiCharacterProps {
  lifeState: BobiLifeState;
  emotion: BobiEmotion;
  mouthShape: MouthShape;
  lightTone?: LightTone;
  lightIntensity?: number;
  audioLevel?: number; // 0 to 1, microphone voice level of child
  thinkingPhase?: 'dots_1' | 'dots_2' | 'dots_3' | 'idea';
  onTap?: () => void;
}

export const BobiCharacter: React.FC<BobiCharacterProps> = ({
  lifeState,
  emotion,
  mouthShape,
  lightTone = 'pure-white',
  lightIntensity = 1,
  audioLevel = 0,
  thinkingPhase = 'dots_2',
  onTap,
}) => {
  // Gaze tracking / gentle ambient look
  const [gaze, setGaze] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);

  // Mouse / Pointer track for subtle responsive eye gaze
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (lifeState === 'OFF' || lifeState === 'SLEEPING') return;
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth - 0.5) * 2; // -1 to 1
      const normY = (e.clientY / innerHeight - 0.5) * 2; // -1 to 1

      // Subtle gaze deflection
      setGaze({
        x: Math.max(-14, Math.min(14, normX * 14)),
        y: Math.max(-10, Math.min(10, normY * 10)),
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, [lifeState]);

  // Periodic natural blinking
  useEffect(() => {
    if (lifeState === 'OFF' || lifeState === 'SLEEPING') return;

    let timeoutId: NodeJS.Timeout;
    const scheduleBlink = () => {
      const nextTime = Math.random() * 3200 + 2400; // 2.4s to 5.6s
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          // 20% chance of double blink
          if (Math.random() < 0.25) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 120);
            }, 180);
          }
        }, 140);
        scheduleBlink();
      }, nextTime);
    };

    scheduleBlink();
    return () => clearTimeout(timeoutId);
  }, [lifeState]);

  // Color profiles
  const toneColors = useMemo(() => {
    switch (lightTone) {
      case 'warm-white':
        return {
          core: '#ffffff',
          glow1: 'rgba(255, 245, 220, 0.95)',
          glow2: 'rgba(255, 215, 150, 0.65)',
          glow3: 'rgba(255, 190, 100, 0.3)',
          halo: 'rgba(255, 210, 140, 0.12)',
        };
      case 'cyan-lumen':
        return {
          core: '#f0fdff',
          glow1: 'rgba(165, 243, 252, 0.95)',
          glow2: 'rgba(34, 211, 238, 0.6)',
          glow3: 'rgba(6, 182, 212, 0.25)',
          halo: 'rgba(6, 182, 212, 0.1)',
        };
      case 'aurora':
        return {
          core: '#ffffff',
          glow1: 'rgba(196, 181, 253, 0.95)',
          glow2: 'rgba(147, 197, 253, 0.6)',
          glow3: 'rgba(110, 231, 183, 0.25)',
          halo: 'rgba(167, 139, 250, 0.1)',
        };
      case 'pure-white':
      default:
        return {
          core: '#ffffff',
          glow1: 'rgba(255, 255, 255, 0.95)',
          glow2: 'rgba(240, 246, 255, 0.65)',
          glow3: 'rgba(186, 218, 255, 0.32)',
          halo: 'rgba(190, 225, 255, 0.12)',
        };
    }
  }, [lightTone]);

  // Emotional adjustments
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

  const totalBrightness = (lifeState === 'OFF' ? 0 : lightIntensity * emotionMultiplier);

  // Filter styles for glowing digital light
  const lightGlowFilter = useMemo(() => {
    if (lifeState === 'OFF') return 'none';
    const b = totalBrightness;
    return `
      drop-shadow(0 0 ${4 * b}px ${toneColors.core})
      drop-shadow(0 0 ${12 * b}px ${toneColors.glow1})
      drop-shadow(0 0 ${28 * b}px ${toneColors.glow2})
      drop-shadow(0 0 ${55 * b}px ${toneColors.glow3})
    `;
  }, [lifeState, totalBrightness, toneColors]);

  // Head tilt based on emotion
  const headTilt = useMemo(() => {
    if (emotion === 'CURIOSO') return 7.5;
    if (emotion === 'CONFUSO') return -8.5;
    if (emotion === 'COMEMORANDO') return 0;
    return 0;
  }, [emotion]);

  // Eye gaze direction overrides
  const effectiveGaze = useMemo(() => {
    if (lifeState === 'THINKING' || emotion === 'PENSANDO') {
      return { x: 3, y: -16 }; // Looking up at the thought bubble!
    }
    return gaze;
  }, [lifeState, emotion, gaze]);

  // Path data for mouth shapes
  const mouthPath = useMemo(() => {
    switch (mouthShape) {
      case 'SMILE':
        // Gentle warm digital curved smile
        return 'M 28 26 Q 50 48 72 26';
      case 'O_BIG':
        // Surprised big round O
        return 'M 38 28 A 12 12 0 1 0 62 28 A 12 12 0 1 0 38 28';
      case 'O_SMALL':
        // Cute small circular/pill mouth
        return 'M 43 28 A 7 7 0 1 0 57 28 A 7 7 0 1 0 43 28';
      case 'SAD':
        // Soft sad curve
        return 'M 30 38 Q 50 24 70 38';
      case 'TALK_1':
        // Speaking frame 1: soft open smile
        return 'M 32 26 Q 50 42 68 26';
      case 'TALK_2':
        // Speaking frame 2: oval open
        return 'M 41 27 Q 50 20 59 27 Q 59 36 50 36 Q 41 36 41 27';
      case 'TALK_3':
        // Speaking frame 3: wider soft line
        return 'M 34 29 Q 50 33 66 29';
      case 'LINE':
      default:
        // Neutral quiet delicate luminous line
        return 'M 34 30 L 66 30';
    }
  }, [mouthShape]);

  const isMouthFilled = mouthShape === 'O_BIG' || mouthShape === 'O_SMALL' || mouthShape === 'TALK_2';

  // Overall container motion state
  const isSleeping = lifeState === 'SLEEPING';
  const isWaking = lifeState === 'WAKING';
  const isOff = lifeState === 'OFF';

  return (
    <div
      onClick={onTap}
      className="relative flex flex-col items-center justify-center select-none cursor-pointer"
      style={{ width: 340, height: 340 }}
      role="button"
      tabIndex={0}
      aria-label="BOBI - Companheiro Digital Luminoso"
    >
      {/* Ambient background aura (breath of light) */}
      <motion.div
        animate={{
          opacity:
            isOff ? 0 :
            isSleeping ? [0.35, 0.15, 0] :
            isWaking ? [0, 0.4, 0.6] :
            [0.45, 0.65 + audioLevel * 0.35, 0.45],
          scale:
            isOff ? 0.7 :
            emotion === 'COMEMORANDO' ? [1, 1.25, 1.1] :
            [0.95, 1.05 + audioLevel * 0.15, 0.95],
        }}
        transition={{
          duration: isSleeping ? 1.8 : 3.5,
          repeat: isOff || isSleeping || isWaking ? 0 : Infinity,
          ease: 'easeInOut',
        }}
        className="absolute w-72 h-72 rounded-full pointer-events-none blur-3xl"
        style={{
          background: `radial-gradient(circle, ${toneColors.halo} 0%, rgba(0,0,0,0) 70%)`,
        }}
      />

      {/* Floating thought bubble (when THINKING) */}
      <AnimatePresence>
        {(lifeState === 'THINKING' || emotion === 'PENSANDO') && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.7 }}
            animate={{ opacity: 1, y: -95, scale: 1 }}
            exit={{ opacity: 0, y: -110, scale: 0.6 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute z-20 flex items-center justify-center pointer-events-none"
            style={{ filter: lightGlowFilter }}
          >
            <div className="relative px-5 py-2.5 rounded-2xl bg-black/80 border border-white/40 shadow-2xl backdrop-blur-md flex items-center gap-2">
              {thinkingPhase === 'idea' ? (
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: [1, 1.25, 1.1], rotate: [0, 10, 0] }}
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
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.25 }}
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                    <motion.span
                      animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                      transition={{ duration: 1.2, repeat: Infinity, delay: 0.5 }}
                      className="w-2 h-2 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                    />
                  </div>
                </div>
              )}

              {/* Thought bubble little trailing dots down to head */}
              <div className="absolute -bottom-2 left-6 w-2 h-2 rounded-full bg-white/70 border border-black" />
              <div className="absolute -bottom-4 left-5 w-1.5 h-1.5 rounded-full bg-white/50" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating reactive badges (Celebrate stars, Curious ?, Surprised !) */}
      <AnimatePresence>
        {emotion === 'COMEMORANDO' && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: [0, 1, 0.8], y: [-30, -75], scale: [0.6, 1.2, 1] }}
            exit={{ opacity: 0, y: -90, scale: 0.5 }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute -top-12 z-20 pointer-events-none flex items-center gap-3 text-2xl text-yellow-300"
            style={{ filter: 'drop-shadow(0 0 10px rgba(255,230,100,0.8))' }}
          >
            <span>⭐</span>
            <span className="text-sm tracking-wider uppercase font-semibold text-white/90">Eba!</span>
            <span>✨</span>
          </motion.div>
        )}

        {emotion === 'CONFUSO' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -15 }}
            animate={{ opacity: 1, scale: 1.1, rotate: 10, y: -80, x: 55 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute z-20 text-3xl font-bold text-sky-200 pointer-events-none"
            style={{ filter: lightGlowFilter }}
          >
            ❓
          </motion.div>
        )}

        {emotion === 'SURPRESO' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: -40 }}
            animate={{ opacity: 1, scale: 1.2, y: -85 }}
            exit={{ opacity: 0, scale: 0.6 }}
            className="absolute z-20 text-3xl font-black text-white pointer-events-none"
            style={{ filter: lightGlowFilter }}
          >
            ❗
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main floating body container */}
      <motion.div
        animate={{
          y:
            isOff ? 10 :
            isSleeping ? 18 :
            emotion === 'COMEMORANDO' ? [0, -18, 0, -12, 0] :
            [0, -10, 0],
          rotate: headTilt,
          scale:
            isOff ? 0.9 :
            isSleeping ? 0.92 :
            isWaking ? [0.85, 1.05, 1.0] :
            emotion === 'SURPRESO' ? 1.06 :
            1.0,
        }}
        transition={{
          y: {
            duration: isSleeping ? 4 : emotion === 'COMEMORANDO' ? 1.6 : 3.8,
            repeat: isOff || isSleeping ? 0 : Infinity,
            ease: 'easeInOut',
          },
          rotate: { duration: 0.45, ease: 'easeOut' },
          scale: { duration: 0.5 },
        }}
        className="relative flex flex-col items-center justify-center"
      >
        {/* Luminous Face SVG Canvas */}
        <motion.svg
          width="260"
          height="180"
          viewBox="0 0 100 80"
          className="overflow-visible"
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
          {/* LEFT EYE */}
          <g
            transform={`translate(${33 + effectiveGaze.x * 0.4}, ${30 + effectiveGaze.y * 0.4})`}
          >
            {emotion === 'FELIZ' || emotion === 'COMEMORANDO' ? (
              // Curved smiling eyes ^
              <motion.path
                d="M -9 4 Q 0 -6 9 4"
                fill="none"
                stroke={toneColors.core}
                strokeWidth="4.2"
                strokeLinecap="round"
                initial={false}
                animate={{
                  scaleY: isBlinking ? 0.1 : 1,
                  d: 'M -9 4 Q 0 -6 9 4',
                }}
                transition={{ duration: 0.1 }}
              />
            ) : isSleeping ? (
              // Sleeping closed horizontal line
              <motion.line
                x1="-8"
                y1="0"
                x2="8"
                y2="0"
                stroke={toneColors.core}
                strokeWidth="3.2"
                strokeLinecap="round"
                animate={{ opacity: [1, 0.4, 0] }}
                transition={{ duration: 1.2 }}
              />
            ) : (
              // Round luminous digital light disc
              <motion.circle
                cx="0"
                cy="0"
                r={emotion === 'SURPRESO' ? 9.5 : emotion === 'CONFUSO' ? 9.2 : 8.2}
                fill={toneColors.core}
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.15 : 1,
                }}
                transition={{ duration: 0.09 }}
              />
            )}
          </g>

          {/* RIGHT EYE */}
          <g
            transform={`translate(${67 + effectiveGaze.x * 0.4}, ${
              emotion === 'CONFUSO' ? 27 + effectiveGaze.y * 0.4 : 30 + effectiveGaze.y * 0.4
            })`}
          >
            {emotion === 'FELIZ' || emotion === 'COMEMORANDO' ? (
              // Curved smiling eyes ^
              <motion.path
                d="M -9 4 Q 0 -6 9 4"
                fill="none"
                stroke={toneColors.core}
                strokeWidth="4.2"
                strokeLinecap="round"
                initial={false}
                animate={{
                  scaleY: isBlinking ? 0.1 : 1,
                  d: 'M -9 4 Q 0 -6 9 4',
                }}
                transition={{ duration: 0.1 }}
              />
            ) : isSleeping ? (
              // Sleeping closed horizontal line
              <motion.line
                x1="-8"
                y1="0"
                x2="8"
                y2="0"
                stroke={toneColors.core}
                strokeWidth="3.2"
                strokeLinecap="round"
                animate={{ opacity: [1, 0.4, 0] }}
                transition={{ duration: 1.2 }}
              />
            ) : (
              // Round luminous digital light disc (slightly squinched if confused)
              <motion.circle
                cx="0"
                cy="0"
                r={
                  emotion === 'SURPRESO' ? 9.5 :
                  emotion === 'CONFUSO' ? 6.5 : 8.2
                }
                fill={toneColors.core}
                animate={{
                  scaleY: isBlinking ? 0.08 : 1,
                  scaleX: isBlinking ? 1.15 : 1,
                }}
                transition={{ duration: 0.09 }}
              />
            )}
          </g>

          {/* LUMINOUS MOUTH */}
          <g transform={`translate(${effectiveGaze.x * 0.15}, ${effectiveGaze.y * 0.15 + 18})`}>
            {isSleeping ? (
              // Mouth shutting down: gently closes and dims
              <motion.line
                x1="40"
                y1="30"
                x2="60"
                y2="30"
                stroke={toneColors.core}
                strokeWidth="3"
                strokeLinecap="round"
                animate={{
                  scaleX: [1, 0.6, 0],
                  opacity: [1, 0.5, 0],
                }}
                transition={{ duration: 1.2 }}
              />
            ) : isMouthFilled ? (
              // Open/Speaking oval or circle
              <motion.path
                d={mouthPath}
                fill={toneColors.core}
                stroke={toneColors.core}
                strokeWidth="3.2"
                strokeLinejoin="round"
                strokeLinecap="round"
                animate={{
                  scale: lifeState === 'SPEAKING' ? [0.95, 1.15, 1.0] : 1,
                }}
                transition={{ duration: 0.14 }}
              />
            ) : (
              // Line / Smile / Curve path
              <motion.path
                d={mouthPath}
                fill="none"
                stroke={toneColors.core}
                strokeWidth={emotion === 'FELIZ' || emotion === 'COMEMORANDO' ? '4.2' : '3.6'}
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{
                  d: mouthPath,
                }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
              />
            )}
          </g>
        </motion.svg>
      </motion.div>

      {/* Gentle listening indicator wave under BOBI when child is talking */}
      <AnimatePresence>
        {lifeState === 'LISTENING' && audioLevel > 0.05 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.6 + audioLevel * 0.4, scale: 1 + audioLevel * 0.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute -bottom-8 flex items-center gap-1.5"
            style={{ filter: lightGlowFilter }}
          >
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                animate={{
                  height: [6, Math.max(8, 28 * audioLevel * (1 - Math.abs(i - 2) * 0.2)), 6],
                }}
                transition={{ duration: 0.2, repeat: Infinity }}
                className="w-1 rounded-full bg-white shadow-[0_0_8px_#ffffff]"
                style={{ height: 6 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
