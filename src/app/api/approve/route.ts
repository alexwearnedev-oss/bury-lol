import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(200).optional(),
});

// Find first free grid position that isn't taken by any approved grave.
// Scans gx=0,1,2,... with gy=0 (the canonical encoding used everywhere).
async function findFreeGridPosition(excludeId: string): Promise<{ grid_x: number; grid_y: number }> {
  const { data } = await supabaseAdmin
    .from('graves')
    .select('grid_x, grid_y')
    .eq('status', 'approved')
    .not('grid_x', 'is', null);

  const occupied = new Set(
    (data ?? []).map(g => `${g.grid_x},${g.grid_y}`)
  );
  // Exclude the grave being approved (it may already have a preferred position recorded)
  void excludeId;

  // 10×10 grid = 100 fixed plots (gx 0–99, gy 0)
  for (let gx = 0; gx < 100; gx++) {
    if (!occupied.has(`${gx},0`)) {
      return { grid_x: gx, grid_y: 0 };
    }
  }
  // Graveyard full — overflow beyond grid (admin should handle)
  return { grid_x: 100, grid_y: 0 };
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
    // Fetch the grave's current state (tier + any preferred position set at webhook time)
    const { data: grave } = await supabaseAdmin
      .from('graves')
      .select('tier, grid_x, grid_y')
      .eq('id', id)
      .single();

    let position: { grid_x: number; grid_y: number };

    if (grave?.grid_x != null && grave?.grid_y != null) {
      // User chose a preferred plot — check if it's still free among approved graves
      const { data: conflict } = await supabaseAdmin
        .from('graves')
        .select('id')
        .eq('status', 'approved')
        .eq('grid_x', grave.grid_x)
        .eq('grid_y', grave.grid_y)
        .neq('id', id)
        .limit(1);

      if (!conflict || conflict.length === 0) {
        // Position is free — honour the preference
        position = { grid_x: grave.grid_x, grid_y: grave.grid_y };
      } else {
        // Position taken — auto-assign the next free slot
        position = await findFreeGridPosition(id);
      }
    } else {
      // No preference — auto-assign
      position = await findFreeGridPosition(id);
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
