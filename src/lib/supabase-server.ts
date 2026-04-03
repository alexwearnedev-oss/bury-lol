import { createClient } from '@supabase/supabase-js';

// Public client — uses anon key, RLS enforced
// Safe for server components that only need to READ approved data
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client — uses service role key, bypasses RLS
// ONLY use in API routes for writes. Never expose client-side.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
