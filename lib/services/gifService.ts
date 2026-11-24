// lib/services/gifService.ts
export type ReactionCategory = 'BOOM' | 'BUST' | 'ELIMINATED' | 'WINNER' | 'RECORD';

export const GifService = {
  getRandomGifUrl: (category: ReactionCategory): string => {
    // Define how many files you have for each category in /public/reactions/
    const counts: Record<ReactionCategory, number> = {
      BOOM: 6,       // boom_1.gif through boom_6.gif
      BUST: 5,       // bust_1.gif through bust_5.gif
      ELIMINATED: 6, // eliminated_1.gif through eliminated_6.gif
      WINNER: 5,     // winner_1.gif through winner_5.gif
      RECORD: 5      // record_1.gif through record_5.gif
    };

    const max = counts[category];
    const randomNum = Math.floor(Math.random() * max) + 1;
    
    // Returns e.g., /reactions/boom_3.gif
    return `/reactions/${category.toLowerCase()}_${randomNum}.gif`;
  }
};