import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role for RLS-protected operations
// IMPORTANT: Do NOT import this file in client components. Server-only usage.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 在运行时检查环境变量（不在构建时抛出错误）
if (process.env.NODE_ENV === 'production' && !supabaseUrl) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable. " +
    "Please set it in your deployment platform (e.g., Tencent Cloud)"
  );
}

if (!serviceRoleKey && process.env.NODE_ENV === 'production') {
  console.warn(
    "⚠️  SUPABASE_SERVICE_ROLE_KEY is not set. Backend writes may fail due to RLS. " +
    "Falling back to ANON_KEY for admin operations."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  serviceRoleKey || anonKey || 'placeholder-key',
  {
    auth: { persistSession: false },
  }
);
