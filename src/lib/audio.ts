import type { Soundscape } from '../types';

/** A tiny generative audio engine. Every sound is synthesized locally. */
export class AetherAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sources: AudioScheduledSourceNode[] = [];
  private volume = 0.35;

  async start(kind: Soundscape, volume = this.volume) {
    await this.stop();
    this.volume = volume;
    const context = new AudioContext();
    this.context = context;
    const master = context.createGain();
    this.master = master;
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(volume * 0.42, context.currentTime + 1.4);
    master.connect(context.destination);

    if (kind === 'rain') this.createRain(context, master);
    if (kind === 'night') this.createNight(context, master);
    if (kind === 'still') this.createStill(context, master);
    await context.resume();
  }

  setVolume(value: number) {
    this.volume = value;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(value * 0.42, this.context.currentTime, 0.08);
    }
  }

  async stop() {
    const context = this.context;
    if (!context) return;
    this.sources.forEach((source) => {
      try { source.stop(); } catch { /* already stopped */ }
    });
    this.sources = [];
    this.context = null;
    this.master = null;
    if (context.state !== 'closed') await context.close();
  }

  private createNoise(context: AudioContext, color: 'white' | 'brown') {
    const length = context.sampleRate * 4;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (color === 'brown') {
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.2;
      } else {
        data[i] = white;
      }
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    this.sources.push(source);
    return source;
  }

  private createRain(context: AudioContext, master: GainNode) {
    const rain = this.createNoise(context, 'white');
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 650;
    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 6200;
    const gain = context.createGain();
    gain.gain.value = 0.32;
    rain.connect(highpass).connect(lowpass).connect(gain).connect(master);
    rain.start();

    const body = this.createNoise(context, 'brown');
    const bodyFilter = context.createBiquadFilter();
    bodyFilter.type = 'lowpass';
    bodyFilter.frequency.value = 380;
    const bodyGain = context.createGain();
    bodyGain.gain.value = 0.16;
    body.connect(bodyFilter).connect(bodyGain).connect(master);
    body.start();
  }

  private createNight(context: AudioContext, master: GainNode) {
    const wind = this.createNoise(context, 'brown');
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const gain = context.createGain();
    gain.gain.value = 0.42;
    wind.connect(filter).connect(gain).connect(master);
    wind.start();
    this.createPad(context, master, [55, 82.41], 0.025);
  }

  private createStill(context: AudioContext, master: GainNode) {
    this.createPad(context, master, [110, 164.81, 220], 0.028);
  }

  private createPad(context: AudioContext, master: GainNode, frequencies: number[], level: number) {
    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index * 3 - 3;
      const gain = context.createGain();
      gain.gain.value = level;
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      lfo.frequency.value = 0.05 + index * 0.025;
      lfoGain.gain.value = level * 0.5;
      lfo.connect(lfoGain).connect(gain.gain);
      oscillator.connect(gain).connect(master);
      oscillator.start();
      lfo.start();
      this.sources.push(oscillator, lfo);
    });
  }
}
