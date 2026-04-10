import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';
import { reportRateLimit } from '@/lib/rate-limit';
import { hashIP } from '@/lib/hash-ip';
import { getClientIp } from '@/lib/get-client-ip';

const schema = z.object({
  shareToken: z.string().min(1).max(20),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { shareToken } = result.data;
  const ip = getClientIp(request);
  const ipHash = hashIP(ip);

  // Rate limit: 1 report per IP per grave
  const rateLimitKey = `${ipHash}:${shareToken}`;
  const { success } = await reportRateLimit.limit(rateLimitKey);

  if (!success) {
    return NextResponse.json({ error: 'Already reported' }, { status: 429 });
  }

  const { error } = await supabaseAdmin.rpc('increment_report_count', {
    token: shareToken,
  });

  // Fallback if RPC doesn't exist — use direct update
  if (error) {
    const { data: grave } = await supabaseAdmin
      .from('graves')
      .select('id, report_count')
      .eq('share_token', shareToken)
      .single();

    if (!grave) {
      return NextResponse.json({ error: 'Grave not found' }, { status: 404 });
    }

    await supabaseAdmin
      .from('graves')
      .update({ report_count: (grave.report_count ?? 0) + 1 })
      .eq('share_token', shareToken);
  }

  return NextResponse.json({ ok: true });
}
