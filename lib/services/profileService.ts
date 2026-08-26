import { supabase } from '../supabase';

export const ProfileService = {
  async getPlayers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async createPlayer(username: string, avatarUrl: string) {
    const { data, error } = await supabase
      .from('profiles')
      .insert({ id: crypto.randomUUID(), username, avatar_url: avatarUrl })
      .select().single();
    if (error) throw error;
    return data;
  },

  async deletePlayer(id: string) {
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;
  },

  // NEW: Fetch detailed stats for a specific player
  async getPlayerStats(playerId: string) {
    // 1. Get Games Played (any match they participated in)
    const { count: played } = await supabase
      .from('match_players')
      .select('*', { count: 'exact', head: true })
      .eq('player_id', playerId);

    // 2. Get Games Won (any match where they are the winning_player_id)
    const { count: won } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('winning_player_id', playerId)
      .eq('status', 'FINISHED');

    // 3. Get Records Held
    const { data: records } = await supabase
      .from('game_records')
      .select('*')
      .eq('player_id', playerId);

    const playedCount = played || 0;
    const wonCount = won || 0;
    const lostCount = playedCount - wonCount;
    const winRate = playedCount > 0 ? Math.round((wonCount / playedCount) * 100) : 0;

    return {
      played: playedCount,
      won: wonCount,
      lost: Math.max(0, lostCount),
      winRate,
      records: records || []
    };
  },

  async getLeaderboard() {
    const { data } = await supabase
      .from('matches')
      .select('winning_player_id, profiles:winning_player_id (username, avatar_url)')
      .not('winning_player_id', 'is', null)
      .eq('status', 'FINISHED');

    const counts: Record<string, any> = {};
    data?.forEach((m: any) => {
      const id = m.winning_player_id;
      if (!m.profiles) return;
      if (!counts[id]) {
        counts[id] = { username: m.profiles.username, avatar: m.profiles.avatar_url, wins: 0 };
      }
      counts[id].wins++;
    });
    return Object.values(counts).sort((a, b) => b.wins - a.wins);
  }
};