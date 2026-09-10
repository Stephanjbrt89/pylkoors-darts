import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const [matchesRes, leaderboardRes, recordsRes] = await Promise.allSettled([
      supabase
        .from('matches')
        .select('*')
        .eq('status', 'IN_PROGRESS')
        .order('created_at', { ascending: false })
        .limit(6),

      supabase
        .from('matches')
        .select('winning_player_id, profiles:winning_player_id (username, avatar_url)')
        .not('winning_player_id', 'is', null)
        .eq('status', 'FINISHED'),

      supabase
        .from('game_records')
        .select(`
          *,
          profiles:player_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(12)
    ]);

    const activeMatches = matchesRes.status === 'fulfilled' && matchesRes.value.data ? matchesRes.value.data : [];
    
    // Process leaderboard
    const counts: Record<string, any> = {};
    if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.data) {
      leaderboardRes.value.data.forEach((m: any) => {
        const id = m.winning_player_id;
        if (!m.profiles) return;
        if (!counts[id]) {
          counts[id] = { username: m.profiles.username, avatar: m.profiles.avatar_url, wins: 0 };
        }
        counts[id].wins++;
      });
    }
    const leaderboard = Object.values(counts).sort((a, b) => b.wins - a.wins);

    const records = recordsRes.status === 'fulfilled' && recordsRes.value.data ? recordsRes.value.data : [];

    return NextResponse.json({
      activeMatches,
      leaderboard,
      records
    });
  } catch (err: any) {
    console.error('API lobby error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
