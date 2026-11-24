// lib/services/soundService.ts
export type SoundCategory = '180' | 'bust' | 'win' | 'record' | 'spin';

const SOUND_FILES: Record<Exclude<SoundCategory, 'spin'>, string[]> = {
  '180': ['/sounds/180.mp3'],
  bust: [
    '/sounds/bust.mp3',
    '/sounds/bust_1.mp3',
    '/sounds/bust_2.mp3',
    '/sounds/bust_3.mp3',
    '/sounds/bust_4.mp3',
    '/sounds/bust_5.mp3',
    '/sounds/bust_6.mp3',
  ],
  win: [
    '/sounds/win.mp3',
    '/sounds/win_1.mp3',
    '/sounds/win_2.mp3',
    '/sounds/win_3.mp3',
    '/sounds/win_4.mp3',
    '/sounds/win_5.mp3',
  ],
  record: [
    '/sounds/record.mp3',
    '/sounds/record_1.mp3',
    '/sounds/record_2.mp3',
    '/sounds/record_3.mp3',
    '/sounds/record_4.mp3',
    '/sounds/record_5.mp3',
  ],
};

let audioCtx: AudioContext | null = null;
let unlockBound = false;
const bufferCache = new Map<string, AudioBuffer>();

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      audioCtx = new AudioCtx();
    }
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
}

if (typeof window !== 'undefined' && !unlockBound) {
  unlockBound = true;
  window.addEventListener('pointerdown', unlockAudio, { passive: true });
  window.addEventListener('keydown', unlockAudio, { passive: true });
}

function playSpinTick() {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    void ctx.resume().catch(() => {});
  }
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.035);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.045);
  } catch {
    // Ignore synth failure
  }
}

async function playViaWebAudio(url: string): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  if (ctx.state === 'suspended') {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state !== 'running') return false;

  let buffer = bufferCache.get(url);
  if (!buffer) {
    const res = await fetch(url);
    if (!res.ok) return false;
    const arrayBuffer = await res.arrayBuffer();
    buffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache.set(url, buffer);
  }

  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.8;
  source.buffer = buffer;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(0);
  return true;
}

export const SoundService = {
  unlock: unlockAudio,
  play: (category: SoundCategory) => {
    if (typeof window === 'undefined') return;

    if (category === 'spin') {
      playSpinTick();
      return;
    }

    const candidates = SOUND_FILES[category];
    if (!candidates || candidates.length === 0) return;
    const url = candidates[Math.floor(Math.random() * candidates.length)];

    void playViaWebAudio(url)
      .then((played) => {
        if (played) return;
        const audio = new Audio(url);
        audio.volume = 0.8;
        void audio.play().catch((err) => {
          console.warn('Audio playback blocked or failed:', url, err);
        });
      })
      .catch(() => {
        try {
          const audio = new Audio(url);
          audio.volume = 0.8;
          void audio.play().catch(() => {});
        } catch {
          // Ignore playback error
        }
      });
  },
};