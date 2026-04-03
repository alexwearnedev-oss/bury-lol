import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(200).optional(),
});

// Calculate next available grid position (row-major, 20 cols wide)
async function getNextGridPosition(): Promise<{ grid_x: number; grid_y: number }> {
  const { data } = await supabaseAdmin
    .from('graves')
    .select('grid_x, grid_y')
    .eq('status', 'approved')
    .not('grid_x', 'is', null)
    .order('grid_y', { ascending: false })
    .order('grid_x', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) {
    return { grid_x: 0, grid_y: 0 };
  }

  const last = data[0];
  const lastX = last.grid_x as number;
  const lastY = last.grid_y as number;
  const COLS = 20;

  if (lastX + 1 < COLS) {
    return { grid_x: lastX + 1, grid_y: lastY };
  } else {
    return { grid_x: 0, grid_y: lastY + 1 };
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = schema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }

  const { id, action, reason } = result.data;

  if (action === 'approve') {
    // Get the grave's tier first
    const { data: grave } = await supabaseAdmin
      .from('graves')
      .select('tier')
      .eq('id', id)
      .single();

    let position = {};
    // Mausoleum tier goes to its own row — no grid position needed
    if (grave?.tier !== 4) {
      position = await getNextGridPosition();
    }

    const { error } = await supabaseAdmin
      .from('graves')
      .update({
        status: 'approved',
        moderated_at: new Date().toISOString(),
        ...position,
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to approve' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === 'reject') {
    const { error } = await supabaseAdmin
      .from('graves')
      .update({
        status: 'rejected',
        moderated_at: new Date().toISOString(),
        rejection_reason: reason ?? 'No reason provided',
      })
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Failed to reject' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
