// lib/services/statsService.ts
import { supabase } from '../supabase';

export type RecordType = 
  | 'FEWEST_DARTS' 
  | 'HIGHEST_SCORE' 
  | 'BIGGEST_MARGIN' 
  | 'HIGHEST_CHECKOUT';

export const StatsService = {
  /**
   * Checks if a new value beats the current bar record for a specific game/category.
   * Returns true if a new record was set.
   */
  async updateRecord(mode: string, type: RecordType, playerId: string, value: number, matchId: string): Promise<boolean> {
    try {
      // 1. Get the current best for this mode/type
      // FEWEST_DARTS uses 'ascending' (lower is better), others use descending
      const isAscending = type === 'FEWEST_DARTS';
      
      const { data: currentBest } = await supabase
        .from('game_records')
        .select('value')
        .eq('game_mode', mode)
        .eq('record_type', type)
        .order('value', { ascending: isAscending })
        .limit(1)
        .single();

      // 2. Logic: Should we replace it?
      let isNewRecord = false;
      if (!currentBest) {
        isNewRecord = true;
      } else {
        if (isAscending) {
          if (value < currentBest.value) isNewRecord = true;
        } else {
          if (value > currentBest.value) isNewRecord = true;
        }
      }

      // 3. If it's a record, insert it into the Hall of Fame
      if (isNewRecord) {
        await supabase.from('game_records').insert({
          game_mode: mode,
          record_type: type,
          player_id: playerId,
          value: value,
          match_id: matchId
        });
      }
      return isNewRecord;
    } catch (err) {
      console.error("Stats Update Error:", err);
      return false;
    }
  },

  /**
   * Fetches the latest records to show on the Home Lobby.
   */
  async getGlobalRecords() {
    try {
      const { data, error } = await supabase
        .from('game_records')
        .select(`
          *,
          profiles:player_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("Stats Fetch Error:", err);
      return [];
    }
  }
};