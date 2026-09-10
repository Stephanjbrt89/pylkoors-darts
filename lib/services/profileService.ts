import { supabase } from '../supabase';

export interface PlayerProfile {
  id: string;
  username: string;
  avatar_url: string;
  created_at?: string;
  updated_at?: string;
}

export const ProfileService = {
  async getPlayers(): Promise<PlayerProfile[]> {
    // 1. Try first-party API route (bypasses browser third-party iframe blocks)
    try {
      const res = await fetch('/api/profiles', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.profiles) && json.profiles.length > 0) {
          // Cache to localStorage for offline resilience
          if (typeof window !== 'undefined') {
            try { localStorage.setItem('pylkoors_cached_profiles', JSON.stringify(json.profiles)); } catch {}
          }
          return json.profiles;
        }
      }
    } catch {
      // Fallback to direct supabase client
    }

    // 2. Direct Supabase Client fallback
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (!error && data && data.length > 0) {
        if (typeof window !== 'undefined') {
          try { localStorage.setItem('pylkoors_cached_profiles', JSON.stringify(data)); } catch {}
        }
        return data;
      }
    } catch {}

    // 3. Fallback to cached profiles in localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pylkoors_cached_profiles');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }

    return [];
  },

  async createPlayer(username: string, avatarUrl: string): Promise<PlayerProfile> {
    const cleanName = username.trim().toUpperCase();
    const cleanAvatar = avatarUrl || '/avatars/1.jpg';

    // 1. Try first-party API route
    try {
      const res = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanName, avatar_url: cleanAvatar }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.profile) {
          return json.profile;
        }
      }
    } catch {}

    // 2. Direct Supabase Client fallback
    try {
      const newId = crypto.randomUUID();
      const { data, error } = await supabase
        .from('profiles')
        .insert({ id: newId, username: cleanName, avatar_url: cleanAvatar })
        .select()
        .single();
      if (!error && data) return data;
    } catch {}

    // 3. Local fallback so user is never blocked
    const fallbackProfile: PlayerProfile = {
      id: crypto.randomUUID(),
      username: cleanName,
      avatar_url: cleanAvatar,
    };
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pylkoors_cached_profiles');
        const list = cached ? JSON.parse(cached) : [];
        list.unshift(fallbackProfile);
        localStorage.setItem('pylkoors_cached_profiles', JSON.stringify(list));
      } catch {}
    }
    return fallbackProfile;
  },

  async deletePlayer(id: string): Promise<void> {
    try {
      const res = await fetch(`/api/profiles?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) return;
    } catch {}

    try {
      await supabase.from('profiles').delete().eq('id', id);
    } catch {}

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('pylkoors_cached_profiles');
        if (cached) {
          const list = JSON.parse(cached).filter((p: any) => String(p.id) !== String(id));
          localStorage.setItem('pylkoors_cached_profiles', JSON.stringify(list));
        }
      } catch {}
    }
  },

  // Fetch detailed stats for a specific player
  async getPlayerStats(playerId: string) {
    try {
      const res = await fetch(`/api/profiles/stats?id=${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.stats) return json.stats;
      }
    } catch {}

    try {
      // 1. Get Games Played
      const { count: played } = await supabase
        .from('match_players')
        .select('*', { count: 'exact', head: true })
        .eq('player_id', playerId);

      // 2. Get Games Won
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
    } catch {
      return { played: 0, won: 0, lost: 0, winRate: 0, records: [] };
    }
  },

  async getLeaderboard() {
    try {
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
    } catch {
      return [];
    }
  }
};