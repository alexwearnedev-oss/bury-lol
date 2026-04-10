import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase-server';

const schema = z.object({
  id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().max(200).optional(),
});

/**
 * Canonical grid encoding (M1 — single source of truth for the approve route):
 *   grid_x = row * GRID_COLS + col   (integer 0–99)
 *   grid_y = 0                        (always; the second dimension is unused)
 *
 * GRID_COLS = 10, GRID_ROWS = 10, total plots = 100.
 * Decoding: col = grid_x % 10, row = Math.floor(grid_x / 10).
 * This matches GraveyardCanvas.dbToDisp and PlotPicker's encode/decode logic.
 */
const GRID_PLOTS = 100; // GRID_COLS(10) × GRID_ROWS(10)

// Find first free grid position that isn't taken by any approved grave.
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

  for (let gx = 0; gx < GRID_PLOTS; gx++) {
    if (!occupied.has(`${gx},0`)) {
      return { grid_x: gx, grid_y: 0 };
    }
  }
  // Graveyard full — overflow beyond grid (admin should handle)
  return { grid_x: GRID_PLOTS, grid_y: 0 };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

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
