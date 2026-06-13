/**
 * 角色权限定义 & 认证中间件 — 云深飞运
 *
 * 权限模型：resource:action 字符串集
 * 真实安全由数据库 RLS 保证，此处做应用层早期拦截
 */
import { type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// ==========================================================
// 权限定义
// ==========================================================

export const RolePermissions: Record<string, string[]> = {
  client: [
    "order:create",
    "order:cancel",
    "order:track",
    "order:review",
    "insurance:claim",
    "payment:pay",
    "payment:refund",
  ],
  pilot: [
    "order:grab",
    "order:accept",
    "order:execute",
    "order:complete",
    "flight:upload",
    "location:report",
    "stats:view_own",
  ],
  admin: [
    "order:create",
    "order:cancel",
    "order:track",
    "order:review",
    "order:grab",
    "order:accept",
    "order:execute",
    "order:complete",
    "flight:upload",
    "location:report",
    "insurance:claim",
    "payment:pay",
    "payment:refund",
    "emergency:toggle",
    "dispatch:manual",
    "users:manage",
    "config:manage",
    "stats:view_all",
  ],
};

// ==========================================================
// 权限检查
// ==========================================================

/**
 * 检查指定角色是否拥有某个权限
 */
export function checkPermission(role: string, permission: string): boolean {
  const perms = RolePermissions[role];
  if (!perms) return false;
  return perms.includes(permission);
}

/**
 * 检查角色是否缺少某个权限，缺少时返回拒绝响应，
 * 反之返回 null（表示放行）。
 */
export function requirePermission(
  role: string,
  permission: string
): { code: string; message: string } | null {
  if (!checkPermission(role, permission)) {
    return {
      code: "FORBIDDEN",
      message: `角色 ${role} 无权执行 ${permission}`,
    };
  }
  return null;
}

// ==========================================================
// 认证中间件
// ==========================================================

export interface AuthUser {
  userId: string;
  role: string;
}

/**
 * 从 Authorization 头提取并验证 JWT，返回用户信息。
 * 失败返回 null — 调用方自行决定返回 401 还是放行。
 *
 * 首次调用会请求 Supabase Auth 验证签名；
 * 后续相同 token 在当前 isolate 内可缓存 payload。
 */
export async function authMiddleware(
  req: Request,
  supabase: SupabaseClient
): Promise<AuthUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  if (!token) return null;

  try {
    // Supabase Auth 验证 JWT 签名 + 过期
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;

    // 从 user_metadata 取 public_users 的 id 和 role
    const publicUserId = data.user.user_metadata?.public_user_id;
    const role = data.user.user_metadata?.role;

    if (!publicUserId || !role) {
      // fallback：用 user_metadata 中的 wx_openid 查 public.users
      const wxOpenid = data.user.user_metadata?.wx_openid;
      if (!wxOpenid) return null;

      const { data: publicUser } = await supabase
        .from("users")
        .select("id, role, status")
        .eq("wx_openid", wxOpenid)
        .maybeSingle();

      if (!publicUser || publicUser.status === "banned") return null;

      return { userId: publicUser.id, role: publicUser.role };
    }

    return { userId: publicUserId, role };
  } catch {
    return null;
  }
}

/**
 * 快速解码 JWT payload（不验证签名），仅用于日志/调试。
 * 生产环境请使用 authMiddleware 做完整验证。
 */
export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
