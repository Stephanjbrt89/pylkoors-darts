// lib/services/matchService.ts
import { supabase } from '../supabase';
import { Dart } from '../../types/schema';

export const MatchService = {
  // 1. Create a new Match in the DB linked to a specific Player
  async createMatch(playerId: string): Promise<string> {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        created_by: playerId,
        category: 'X01',
        mode: 'X01_501',
        status: 'IN_PROGRESS',
        settings: { doubleOut: true }
      })
      .select()
      .single();

    if (error) {
      console.error("Match Creation Error:", error);
      throw error;
    }
    
    // Add the player to the match_players join table
    await supabase.from('match_players').insert({
      match_id: data.id,
      player_id: playerId,
      player_order: 1
    });

    return data.id;
  },

  // 2. Save a "Visit" (A turn of darts)
  async saveVisit(matchId: string, playerId: string, darts: Dart[], isBust: boolean) {
    const totalScore = darts.reduce((sum, d) => sum + (d.score * d.multiplier), 0);
    
    const { error } = await supabase.from('visits').insert({
      match_id: matchId,
      player_id: playerId,
      round_number: 1, 
      darts: darts,
      total_score: totalScore,
      is_bust: isBust
    });

    if (error) console.error("Error saving visit:", error);
  },

  // 3. Complete the Match and Record the Winner (Required for Hall of Fame)
  async finishMatch(matchId: string, winnerId: string) {
    const { error } = await supabase
      .from('matches')
      .update({ 
        status: 'FINISHED', 
        winning_player_id: winnerId 
      })
      .eq('id', matchId);

    if (error) {
      console.error("Error finishing match:", error);
    }
  },

  // 4. Abandon a match (Used when you click the X on the home screen)
  async abandonMatch(matchId: string) {
    const { error } = await supabase
      .from('matches')
      .update({ status: 'ABANDONED' })
      .eq('id', matchId);
      
    if (error) console.error("Error abandoning match:", error);
  }
};