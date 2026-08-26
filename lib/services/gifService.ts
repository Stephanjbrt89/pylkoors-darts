// lib/services/gifService.ts
export type ReactionCategory = 'BOOM' | 'BUST' | 'ELIMINATED' | 'WINNER' | 'RECORD';

export const GifService = {
  getRandomGifUrl: (category: ReactionCategory): string => {
    // Mapping keys to your local files in /public/reactions/
    const mapping: Record<ReactionCategory, string> = {
      BOOM: '/reactions/boom.gif',
      BUST: '/reactions/bust.gif',
      ELIMINATED: '/reactions/eliminated.gif',
      WINNER: '/reactions/winner.gif',
      RECORD: '/reactions/record.gif' // Make sure to add a record.gif here!
    };
    
    return mapping[category];
  }
};