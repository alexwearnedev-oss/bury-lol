import { supabaseAdmin } from '@/lib/supabase-server';
import AdminDashboard from './AdminDashboard';
import type { Grave } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const [pendingResult, reportedResult, statsResult, countsResult] = await Promise.all([
    supabaseAdmin
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, ip_hash')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('graves')
      .select('id, subject, epitaph, buried_by, tier, amount_paid, share_token, grid_x, grid_y, created_at, status, report_count, ip_hash')
      .gt('report_count', 0)
      .eq('status', 'approved')
      .order('report_count', { ascending: false }),
    supabaseAdmin
      .from('stats')
      .select('total_approved, total_revenue_cents')
      .single(),
    supabaseAdmin
      .from('graves')
      .select('status'),
  ]);

  const pending = (pendingResult.data ?? []) as (Grave & { ip_hash: string })[];
  const reported = (reportedResult.data ?? []) as (Grave & { ip_hash: string })[];
  const stats = statsResult.data;

  // Count by status
  const allGraves = countsResult.data ?? [];
  const counts = {
    pending: allGraves.filter((g) => g.status === 'pending').length,
    approved: stats?.total_approved ?? 0,
    rejected: allGraves.filter((g) => g.status === 'rejected').length,
    revenue: stats?.total_revenue_cents ?? 0,
  };

  return <AdminDashboard pending={pending} reported={reported} counts={counts} />;
}
