import { supabase } from '../supabase';

export type RecordType = 'FEWEST_DARTS' | 'HIGHEST_SCORE' | 'HIGHEST_CHECKOUT' | 'ACCURACY';

export const StatsService = {
  async updateRecord(mode: string, type: RecordType, playerId: string, value: number, matchId: string): Promise<boolean> {
    try {
      const isLowerBetter = type === 'FEWEST_DARTS';
      
      // 1. Check if the current World Record for this specific slot is beaten
      const { data: currentRecord } = await supabase
        .from('game_records')
        .select('value')
        .eq('game_mode', mode)
        .eq('record_type', type)
        .maybeSingle();

      let isNewRecord = false;
      if (!currentRecord) {
        isNewRecord = true; // First time anyone has played!
      } else {
        // Compare new value against the current world record
        if (isLowerBetter) {
          if (value < currentRecord.value) isNewRecord = true;
        } else {
          if (value > currentRecord.value) isNewRecord = true;
        }
      }

      if (isNewRecord) {
        // 2. THE UPSERT: Overwrite the previous record holder
        // This ensures only ONE player holds the glory for this specific category.
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