// app/api/autodarts/status/route.ts
import { NextResponse } from 'next/server';
import { autodartsBus } from '@/lib/services/autodartsBus';

export const dynamic = 'force-dynamic';

export async function GET() {
  const status = autodartsBus.getStatus();
  return NextResponse.json({
    status,
    timestamp: Date.now(),
  });
}
