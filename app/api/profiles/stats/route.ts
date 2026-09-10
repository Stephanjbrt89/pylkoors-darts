import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase credentials not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('id');

    if (!playerId) {
      return NextResponse.json({ error: 'Player ID is required' }, { status: 400 });
    }

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

    return NextResponse.json({
      stats: {
        played: playedCount,
        won: wonCount,
        lost: Math.max(0, lostCount),
        winRate,
        records: records || []
      }
    });
  } catch (err: any) {
    console.error('API profiles stats exception:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
