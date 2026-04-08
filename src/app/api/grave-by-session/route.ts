import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  // Use admin client since the grave may still be 'pending' (not visible via RLS)
  const { data, error } = await supabaseAdmin
    .from('graves')
    .select('subject, epitaph, buried_by, tier, amount_paid, share_token, icon')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}
