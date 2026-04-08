export interface Grave {
  id: string;
  subject: string;
  epitaph: string | null;
  buried_by: string;
  tier: 1 | 2 | 3 | 4;
  amount_paid: number;
  share_token: string;
  grid_x: number | null;
  grid_y: number | null;
  created_at: string;
  status: string;
  report_count: number;
  icon: string | null;
  visit_count: number;
}

export interface Stats {
  total_approved: number;
  total_revenue_cents: number;
}
