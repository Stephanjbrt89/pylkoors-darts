// lib/services/soundService.ts

export const SoundService = {
  play: (soundName: '180' | 'bust' | 'win' | 'record') => {
    try {
      const audio = new Audio(`/sounds/${soundName}.mp3`);
      audio.volume = 0.7;
      audio.play().catch(() => {
        console.log("Audio play blocked until user interaction.");
      });
    } catch (err) {
      console.error("Sound play error:", err);
    }
  }
};