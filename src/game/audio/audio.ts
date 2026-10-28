/**
 * audio.ts
 *
 * Suara sintetis kecil lewat WebAudio (tanpa berkas aset). AudioContext baru dibuat
 * setelah gesture pertama pengguna (kebijakan autoplay browser).
 * Musik: pola pentatonik lambat dan lembut, bisa dimatikan terpisah dari efek suara.
 */

import type { Cue } from '../animation/presentation';

const MUSIC_NOTES = [261.63, 329.63, 392.0, 329.63, 440.0, 392.0, 329.63, 293.66];
const MUSIC_STEP_MS = 1800;

class AudioManager {
  private ctx: AudioContext | null = null;
  private sfx = true;
  private music = false;
  private musicTimer: number | null = null;
  private musicIndex = 0;

  /** Panggil dari event gesture pengguna. Aman dipanggil berulang. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    this.syncMusic();
  }

  configure(sound: boolean, music: boolean): void {
    this.sfx = sound;
    this.music = music;
    this.syncMusic();
  }

  cue(cue: Cue): void {
    if (!this.sfx) return;
    switch (cue) {
      case 'dice':
        [0, 90, 180, 270].forEach((t, i) => this.tone(300 + (i % 2) * 70, 0.05, 'triangle', 0.07, t));
        break;
      case 'hop':
        this.tone(520, 0.05, 'sine', 0.05);
        break;
      case 'land':
        this.tone(660, 0.12, 'sine', 0.09);
        break;
      case 'capture':
        this.tone(240, 0.28, 'triangle', 0.1, 0, 130);
        break;
      case 'home':
        [523.25, 659.25, 783.99].forEach((f, i) => this.tone(f, 0.18, 'sine', 0.08, i * 110));
        break;
      case 'win':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.28, 'sine', 0.09, i * 160));
        break;
    }
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, delayMs = 0, endFreq?: number): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delayMs / 1000;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private syncMusic(): void {
    const shouldPlay = this.music && this.ctx?.state === 'running';
    if (shouldPlay && this.musicTimer === null) {
      const step = () => {
        this.tone(MUSIC_NOTES[this.musicIndex++ % MUSIC_NOTES.length]!, 1.6, 'sine', 0.035);
      };
      step();
      this.musicTimer = window.setInterval(step, MUSIC_STEP_MS);
    } else if (!shouldPlay && this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioManager();
