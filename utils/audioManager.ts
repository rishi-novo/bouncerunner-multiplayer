
class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  droneOsc: OscillatorNode | null = null;
  droneGain: GainNode | null = null;
  isMuted: boolean = false;

  constructor() {
    // Lazy init
  }

  init() {
    if (this.ctx) return;
    
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();
    
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Low master volume
    this.masterGain.connect(this.ctx.destination);

    this.startDrone();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  startDrone() {
    if (!this.ctx || !this.masterGain) return;

    // Background drone for speed sensation
    this.droneOsc = this.ctx.createOscillator();
    this.droneGain = this.ctx.createGain();
    
    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.value = 50; // Low rumble
    this.droneGain.gain.value = 0.0; // Start silent

    // Lowpass filter to muffle the drone
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    this.droneOsc.connect(filter);
    filter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);
    
    this.droneOsc.start();
  }

  updateDrone(speedRatio: number) {
    if (!this.ctx || !this.droneOsc || !this.droneGain) return;
    
    // Pitch rises with speed
    const targetFreq = 50 + (speedRatio * 50); 
    this.droneOsc.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.1);

    // Volume rises with speed
    const targetVol = 0.1 + (speedRatio * 0.1);
    this.droneGain.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.1);
  }

  playJump() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  playLand() {
    if (!this.ctx || !this.masterGain) return;

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.1; // 0.1 sec
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start();
  }

  playGameOver() {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 1.0);

    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 1.0);
  }
}

export const audioManager = new AudioManager();
