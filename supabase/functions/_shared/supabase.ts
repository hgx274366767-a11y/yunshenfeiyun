/**
 * Supabase 客户端单例 — 云深飞运 Edge Functions 共享
 *
 * 每个 Edge Function 独立 isolate，模块级单例安全
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Service Role 客户端（绕过 RLS，Edge Function 内部使用）
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// 带 admin 配置的客户端
export const supabaseAdmin: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * 创建用户级客户端（带有特定用户访问令牌）
 * 用于需要以具体用户身份执行 RLS 操作的场景
 */
export function createUserClient(userJwt: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });
}
