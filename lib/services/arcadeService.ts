// lib/services/arcadeService.ts
import { supabase } from '../supabase';

export const ArcadeService = {
  async createMultiplayerMatch(mode: string, playerIds: string[]): Promise<string> {
    try {
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

      if (error || !data) {
        console.warn("Match Insert Error (using local fallback):", error?.message, error?.details);
        return `local-${crypto.randomUUID()}`;
      }

      const playerEntries = playerIds.map((id, index) => ({
        match_id: data.id,
        player_id: id,
        player_order: index + 1
      }));

      const { error: playerError } = await supabase.from('match_players').insert(playerEntries);
      
      if (playerError) {
        console.warn("Player Join Warning:", playerError.message);
      }

      return data.id;
    } catch (err: any) {
      console.warn("Arcade Match Creation Exception (using local fallback):", err?.message);
      return `local-${crypto.randomUUID()}`;
    }
  },

  async saveGameState(matchId: string, state: any) {
    if (!matchId || matchId.startsWith('local-')) return;
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