class AudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmNode: OscillatorNode | null = null;
  private bgmGain: GainNode | null = null;
  private bgmIntervalId: number | null = null;

  constructor() {
    // Lazy initialisation on first interaction
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopBGM();
    } else {
      this.startBGM();
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playJump() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    // Frequency sweeps upwards quickly for a classic jump sound
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  public playSlide() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    // Deep slide sound sliding down in pitch
    osc.frequency.setValueAtTime(120, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, this.ctx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);

    // Apply a simple lowpass filter to make it sound "slidey" and soft like snow
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(250, this.ctx.currentTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playCollect() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    
    // First high note
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now); // A5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.08);

    // Second higher note shortly after
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.51, now + 0.05); // E6
    gain2.gain.setValueAtTime(0.12, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.25);
  }

  public playHit() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    
    // Low rumble oscillator
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.linearRampToValueAtTime(40, now + 0.25);
    
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

    // Add a resonance filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'peaking';
    filter.frequency.setValueAtTime(100, now);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playGameOver() {
    this.init();
    if (!this.ctx || this.isMuted) return;
    this.resumeContext();

    const now = this.ctx.currentTime;
    const tempo = 0.12;
    // Sad descending minor chord
    const notes = [587.33, 493.88, 392.00, 293.66]; // D5, B4, G4, D4

    notes.forEach((freq, index) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * tempo);
      
      gain.gain.setValueAtTime(0.15, now + index * tempo);
      gain.gain.exponentialRampToValueAtTime(0.01, now + index * tempo + 0.25);
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      osc.start(now + index * tempo);
      osc.stop(now + index * tempo + 0.25);
    });
  }

  public startBGM() {
    this.init();
    if (!this.ctx || this.isMuted || this.bgmIntervalId !== null) return;
    this.resumeContext();

    let step = 0;
    // Simple light arctic chip-tune melody arpeggio
    // G major scale / Pentatonic
    const melody = [
      392.00, 440.00, 493.88, 587.33, 659.25, 783.99, 659.25, 587.33,
      392.00, 493.88, 587.33, 783.99, 783.99, 659.25, 587.33, 493.88,
      349.23, 440.00, 523.25, 698.46, 698.46, 523.25, 440.00, 349.23,
      440.00, 523.25, 587.33, 698.46, 783.99, 880.00, 783.99, 587.33
    ];

    const bass = [
      196.00, 196.00, 196.00, 196.00,
      146.83, 146.83, 146.83, 146.83,
      174.61, 174.61, 174.61, 174.61,
      196.00, 196.00, 220.00, 246.94
    ];

    const tempo = 180; // BPM
    const stepDuration = 60 / tempo; // Seconds per beat

    const playStep = () => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      // Play melody note
      const oscMelody = this.ctx.createOscillator();
      const gainMelody = this.ctx.createGain();
      
      oscMelody.type = 'triangle';
      oscMelody.frequency.setValueAtTime(melody[step % melody.length], now);
      
      gainMelody.gain.setValueAtTime(0.04, now);
      gainMelody.gain.exponentialRampToValueAtTime(0.001, now + stepDuration - 0.02);
      
      oscMelody.connect(gainMelody);
      gainMelody.connect(this.ctx.destination);
      
      oscMelody.start(now);
      oscMelody.stop(now + stepDuration);

      // Play bass note every 2 steps
      if (step % 2 === 0) {
        const oscBass = this.ctx.createOscillator();
        const gainBass = this.ctx.createGain();
        
        oscBass.type = 'sine';
        oscBass.frequency.setValueAtTime(bass[Math.floor(step / 2) % bass.length], now);
        
        gainBass.gain.setValueAtTime(0.06, now);
        gainBass.gain.exponentialRampToValueAtTime(0.001, now + stepDuration * 2 - 0.05);
        
        oscBass.connect(gainBass);
        gainBass.connect(this.ctx.destination);
        
        oscBass.start(now);
        oscBass.stop(now + stepDuration * 2);
      }

      step++;
    };

    // Run interval
    this.bgmIntervalId = window.setInterval(playStep, stepDuration * 1000);
  }

  public stopBGM() {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
  }

  private resumeContext() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }
}

export const audio = new AudioEngine();
