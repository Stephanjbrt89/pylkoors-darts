// lib/services/arcadeService.ts
import { supabase } from '../supabase';

export const ArcadeService = {
  async createMultiplayerMatch(mode: string, playerIds: string[]): Promise<string> {
    const { data, error } = await supabase
      .from('matches')
      .insert({
        created_by: playerIds[0],
        category: 'ARCADE',
        mode: mode,
        status: 'IN_PROGRESS'
      })
      .select()
      .single();

    if (error) {
      console.error("Match Insert Error:", error.message, error.details); // Improved logging
      throw error;
    }

    const playerEntries = playerIds.map((id, index) => ({
      match_id: data.id,
      player_id: id,
      player_order: index + 1
    }));

    const { error: playerError } = await supabase.from('match_players').insert(playerEntries);
    
    if (playerError) {
      console.error("Player Join Error:", playerError.message);
      throw playerError;
    }

    return data.id;
  },

  async saveGameState(matchId: string, state: any) {
    const { error } = await supabase
      .from('arcade_game_states')
      .upsert({
        match_id: matchId,
        current_state: state,
        last_updated: new Date().toISOString()
      });
    if (error) console.error("State Save Error:", error.message);
  }
};