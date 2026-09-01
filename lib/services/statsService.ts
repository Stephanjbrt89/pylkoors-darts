// lib/services/statsService.ts
import { supabase } from '../supabase';

export type RecordType = 'FEWEST_DARTS' | 'HIGHEST_SCORE' | 'LOWEST_SCORE' | 'HIGHEST_CHECKOUT' | 'ACCURACY';

export const StatsService = {
  async updateRecord(mode: string, type: RecordType, playerId: string, value: number, matchId: string): Promise<boolean> {
    try {
      // FEWEST_DARTS and LOWEST_SCORE: Lower is better.
      const isLowerBetter = type === 'FEWEST_DARTS' || type === 'LOWEST_SCORE';
      
      const { data: currentRecord } = await supabase
        .from('game_records')
        .select('value')
        .eq('game_mode', mode)
        .eq('record_type', type)
        .maybeSingle();

      let isNewRecord = false;
      if (!currentRecord) {
        isNewRecord = true;
      } else {
        if (isLowerBetter) {
          if (value < currentRecord.value) isNewRecord = true;
        } else {
          if (value > currentRecord.value) isNewRecord = true;
        }
      }

      if (isNewRecord) {
        const { error } = await supabase
          .from('game_records')
          .upsert({
            game_mode: mode,
            record_type: type,
            player_id: playerId,
            value: value,
            match_id: matchId
          }, { 
            onConflict: 'game_mode, record_type' 
          });

        if (error) throw error;
        return true; 
      }
      return false;
    } catch (err) {
      console.error("Stats Error:", err);
      return false;
    }
  },

  async getGlobalRecords() {
    const { data } = await supabase
      .from('game_records')
      .select('*, profiles:player_id (username, avatar_url)')
      .order('created_at', { ascending: false });
    return data || [];
  }
};