// lib/services/soundService.ts
export type SoundCategory = '180' | 'bust' | 'win' | 'record' | 'spin';

export const SoundService = {
  play: (category: SoundCategory) => {
    const counts: Record<string, number> = {
      '180': 3,    // 180_1.mp3, 180_2.mp3, etc.
      'bust': 3,
      'win': 3,
      'record': 2,
      'spin': 1    // Clicking sound for the roulette
    };

    const max = counts[category] || 1;
    const randomNum = Math.floor(Math.random() * max) + 1;

    try {
      const audio = new Audio(`/sounds/${category}_${randomNum}.mp3`);
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch (err) {
      console.error("Audio error", err);
    }
  }
};