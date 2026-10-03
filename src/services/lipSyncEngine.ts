import { MouthShape } from '../types/leo';

type LipSyncCallback = (shape: MouthShape, intensity: number) => void;

class LipSyncEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;
  private currentShape: MouthShape = 'SMILE';
  private currentIntensity: number = 0;
  private targetIntensity: number = 0;
  private listener: LipSyncCallback | null = null;
  private restingShape: MouthShape = 'SMILE';

  // Phoneme simulation state (for Web Speech API)
  private phonemeInterval: NodeJS.Timeout | null = null;
  private speechStartTime: number = 0;
  private currentSpokenText: string = '';
  private lastWordIndex: number = 0;

  /**
   * Register active callback
   */
  public subscribe(cb: LipSyncCallback) {
    this.listener = cb;
  }

  /**
   * Set resting shape (e.g. SMILE or NEUTRAL)
   */
  public setRestingShape(shape: MouthShape) {
    this.restingShape = shape;
    if (!this.isRunning) {
      this.currentShape = shape;
      this.currentIntensity = 0;
      this.listener?.(shape, 0);
    }
  }

  /**
   * Start lip sync from Web Audio source (when raw audio buffer or stream is playing)
   */
  public startAudioAnalysis(audioElementOrNode: AudioNode | HTMLAudioElement, ctx?: AudioContext) {
    this.stop();
    this.isRunning = true;

    try {
      const audioCtx = ctx || this.getAudioContext();
      this.audioCtx = audioCtx;

      if (audioElementOrNode instanceof AnalyserNode) {
        this.analyser = audioElementOrNode;
      } else {
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.35; // Fast, ultra-responsive volume tracking
        this.analyser = analyser;

        if (audioElementOrNode instanceof AudioNode) {
          audioElementOrNode.connect(analyser);
        } else {
          const source = audioCtx.createMediaElementSource(audioElementOrNode);
          source.connect(analyser);
          source.connect(audioCtx.destination);
        }
      }

      this.runAudioAnalysisLoop();
    } catch (err) {
      console.warn('[LIP_SYNC] Web Audio analysis fallback to synthetic tracking:', err);
      this.startPhonemeTracking(this.currentSpokenText || 'falando');
    }
  }

  /**
   * Start lip sync driven by text phonemes and syllable events (for Web Speech API)
   */
  public startPhonemeTracking(text: string) {
    this.stop();
    this.isRunning = true;
    this.speechStartTime = performance.now();
    this.currentSpokenText = text;
    this.lastWordIndex = 0;

    // Generate expressive vowel-based syllable viseme sequence from text
    const words = text.split(/\s+/).filter(Boolean);
    const syllableShapes: { shape: MouthShape; intensity: number; duration: number }[] = [];

    for (const word of words) {
      const cleanWord = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const parts = cleanWord.match(/([aeiouáéíóúâêôãõ]+|[^aeiouáéíóúâêôãõ\s]+)/gi) || [cleanWord];
      
      for (const piece of parts) {
        let shape: MouthShape = 'TALKING';
        let intensity = 0.7;

        if (/[aáâã]/.test(piece)) {
          shape = 'WIDE_OPEN';
          intensity = 0.95;
        } else if (/[eéê]/.test(piece)) {
          shape = 'OPEN';
          intensity = 0.85;
        } else if (/[oóôõuú]/.test(piece)) {
          shape = 'SMALL_O';
          intensity = 0.8;
        } else if (/[ií]/.test(piece)) {
          shape = 'HAPPY';
          intensity = 0.7;
        } else if (/^[mpb]/.test(piece)) {
          shape = 'LINE';
          intensity = 0.25;
        } else {
          shape = 'TALKING';
          intensity = 0.65;
        }

        syllableShapes.push({ shape, intensity, duration: 110 + Math.random() * 35 });
      }

      // Natural closure between words
      syllableShapes.push({ shape: 'TALKING', intensity: 0.35, duration: 65 });
    }

    if (syllableShapes.length === 0) {
      syllableShapes.push(
        { shape: 'OPEN', intensity: 0.85, duration: 120 },
        { shape: 'SMALL_O', intensity: 0.75, duration: 110 },
        { shape: 'WIDE_OPEN', intensity: 0.95, duration: 130 },
        { shape: 'TALKING', intensity: 0.65, duration: 120 }
      );
    }

    let syllableIdx = 0;
    const playNextSyllable = () => {
      if (!this.isRunning) return;
      const current = syllableShapes[syllableIdx % syllableShapes.length];
      this.currentShape = current.shape;
      this.targetIntensity = current.intensity;
      syllableIdx++;
      this.phonemeInterval = setTimeout(playNextSyllable, current.duration) as any;
    };

    playNextSyllable();

    // Run continuous 60fps spring smoothing
    this.runSpringLoop();
  }

  /**
   * Update active syllable from SpeechSynthesisUtterance.onboundary
   */
  public onWordBoundary(charIndex: number, charLength?: number) {
    if (!this.isRunning) return;

    this.lastWordIndex = charIndex;
    const textSlice = this.currentSpokenText.slice(charIndex, charIndex + (charLength || 6));
    const lower = textSlice.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Analyze first active vowel in syllable
    let newShape: MouthShape = 'TALKING';
    let energy = 0.65;

    // Check for bilabial closure consonants at start: m, p, b
    if (/^[mpb]/.test(lower)) {
      newShape = 'NEUTRAL';
      energy = 0.2;
    } else if (/[aáâã]/.test(lower)) {
      // Open vowels
      newShape = energy > 0.8 ? 'WIDE_OPEN' : 'OPEN';
      energy = 0.95;
    } else if (/[oóôõuú]/.test(lower)) {
      // Rounded vowels
      newShape = 'SMALL_O';
      energy = 0.75;
    } else if (/[eéê]/.test(lower)) {
      // Mid vowels
      newShape = 'OPEN';
      energy = 0.7;
    } else if (/[ií]/.test(lower)) {
      // Narrow vowels
      newShape = 'HAPPY';
      energy = 0.6;
    } else {
      newShape = 'TALKING';
      energy = 0.5;
    }

    this.currentShape = newShape;
    this.targetIntensity = energy;
  }

  /**
   * Stop lip sync immediately and reset to resting shape
   */
  public stop() {
    this.isRunning = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.phonemeInterval) {
      clearInterval(this.phonemeInterval);
      this.phonemeInterval = null;
    }

    // Smooth return to resting shape
    this.currentShape = this.restingShape;
    this.currentIntensity = 0;
    this.targetIntensity = 0;
    this.listener?.(this.restingShape, 0);
  }

  /**
   * Continuous 60 FPS loop for real-time Web Audio FFT & RMS amplitude analysis
   * Directly maps instantaneous volume to mouthShape without fixed delays.
   */
  private runAudioAnalysisLoop = () => {
    if (!this.isRunning || !this.analyser) return;

    // 1. Instantaneous Time-Domain RMS Amplitude (True Physical Sound Wave Volume)
    const timeBuffer = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(timeBuffer);

    let sumSquares = 0;
    for (let i = 0; i < timeBuffer.length; i++) {
      const norm = (timeBuffer[i] - 128) / 128; // -1.0 to 1.0
      sumSquares += norm * norm;
    }
    const rms = Math.sqrt(sumSquares / timeBuffer.length); // Instantaneous RMS amplitude

    // 2. Spectral Formants (Frequency-Domain)
    const bufferLength = this.analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(freqData);

    let lowEnergy = 0;  // Vowels O, U (low formants, 80-400Hz)
    let midEnergy = 0;  // Vowels A, E (mid formants, 450-2000Hz)
    let highEnergy = 0; // Vowel I & consonants (high formants, 2200-6000Hz)

    for (let i = 0; i < bufferLength; i++) {
      const val = freqData[i];
      if (i < 10) lowEnergy += val;
      else if (i < 38) midEnergy += val;
      else highEnergy += val;
    }

    // 3. Direct Mapping: Volume / RMS Amplitude -> mouthShape & intensity
    // Zero artificial delays: driven 100% by the live output waveform!
    if (rms < 0.025) {
      // Acoustic silence, breath, or inter-word pause
      this.currentShape = this.restingShape;
      this.targetIntensity = 0;
    } else if (rms < 0.08) {
      // Soft speech onset or consonant closure
      this.currentShape = 'TALKING';
      this.targetIntensity = Math.min(1, rms * 4.2);
    } else if (rms < 0.18) {
      // Sustained conversational volume: map to vowel formants
      if (midEnergy > lowEnergy * 1.25) {
        this.currentShape = 'OPEN'; // Vowels A, E
      } else if (lowEnergy > midEnergy * 1.1) {
        this.currentShape = 'SMALL_O'; // Vowels O, U
      } else if (highEnergy > midEnergy) {
        this.currentShape = 'HAPPY'; // Narrow vowel I
      } else {
        this.currentShape = 'TALKING';
      }
      this.targetIntensity = Math.min(1, rms * 3.8);
    } else {
      // High volume peak, emphasis or stressed syllable
      this.currentShape = 'WIDE_OPEN';
      this.targetIntensity = Math.min(1, rms * 3.5);
    }

    // 4. Smooth 60 FPS exponential spring smoothing (response time ~16ms)
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.45;
    this.listener?.(this.currentShape, this.currentIntensity);

    this.animFrameId = requestAnimationFrame(this.runAudioAnalysisLoop);
  };

  /**
   * Continuous 60 FPS spring loop for smooth phoneme tracking
   */
  private runSpringLoop = () => {
    if (!this.isRunning) return;

    // Organic micro-variations while speaking
    const time = (performance.now() - this.speechStartTime) * 0.006;
    const microPulse = Math.sin(time * 3.5) * 0.15;

    // Dampen toward target intensity
    this.currentIntensity += (this.targetIntensity - this.currentIntensity) * 0.28;
    const effectiveIntensity = Math.max(0, Math.min(1, this.currentIntensity + microPulse));

    this.listener?.(this.currentShape, effectiveIntensity);

    this.animFrameId = requestAnimationFrame(this.runSpringLoop);
  };

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }
}

export const lipSyncEngine = new LipSyncEngine();
