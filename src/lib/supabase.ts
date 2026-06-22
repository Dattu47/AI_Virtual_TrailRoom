import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);

export const supabase = hasSupabase ? createClient(supabaseUrl!, supabaseAnonKey!) : null;
export const supabaseAdmin = hasSupabase
  ? createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
  : null;
