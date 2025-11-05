import { createClient } from "@supabase/supabase-js";

// 环境变量检查 - 提供更好的错误提示
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// 在运行时检查环境变量（不在构建时检查，避免构建失败）
if (typeof window !== 'undefined' || process.env.NODE_ENV === 'production') {
  if (!supabaseUrl) {
    console.error(
      '❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please set it in your deployment platform (e.g., Tencent Cloud)'
    );
  }

  if (!supabaseAnonKey) {
    console.error(
      '❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please set it in your deployment platform (e.g., Tencent Cloud)'
    );
  }
}

// 使用 Supabase SDK 的默认存储键（sb-<project>-auth-token）以获得最稳定的持久化行为
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
