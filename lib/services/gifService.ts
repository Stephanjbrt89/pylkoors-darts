// lib/services/gifService.ts
export type ReactionCategory = 'BOOM' | 'BUST' | 'ELIMINATED' | 'WINNER' | 'RECORD';

export const GifService = {
  getRandomGifUrl: (category: ReactionCategory): string => {
    // Define how many files you have for each category in /public/reactions/
    const counts: Record<ReactionCategory, number> = {
      BOOM: 5,       // Looks for boom_1.gif through boom_5.gif
      BUST: 5,       
      ELIMINATED: 3, 
      WINNER: 5,
      RECORD: 3
    };

    const max = counts[category];
    const randomNum = Math.floor(Math.random() * max) + 1;
    
    // Returns e.g., /reactions/boom_3.gif
    return `/reactions/${category.toLowerCase()}_${randomNum}.gif`;
  }
};