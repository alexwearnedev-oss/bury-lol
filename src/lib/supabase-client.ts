import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance — anon key only, RLS enforced
// Safe to use in client components
export const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
