/**
 * 认证入口 — POST /auth/login | GET /auth/verify
 *
 * 路由：
 * - POST /login   微信登录（code → 用户 + Supabase 凭证）
 * - GET  /verify  验证 token 有效性 + 返回当前用户角色权限
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest, forbidden } from "../_shared/responses.ts";
import { RolePermissions } from "../_shared/permissions.ts";
import { wxLogin } from "./wx-login.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);

  try {
    // ========== 微信登录 ==========
    if (url.pathname.endsWith("/login") && req.method === "POST") {
      const { code, role, nick_name, avatar_url } = await req.json();

      if (!code) return badRequest("MISSING_CODE", "缺少微信登录 code");
      if (!role || !["client", "pilot"].includes(role)) {
        return badRequest("INVALID_ROLE", 'role 必须为 "client" 或 "pilot"');
      }

      const result = await wxLogin(supabase, { code, role, nick_name, avatar_url });

      return json(200, {
        success: true,
        data: {
          user: result.user,
          auth_email: result.auth_email,
          auth_password: result.auth_password,
        },
      });
    }

    // ========== Token 验证 ==========
    if (url.pathname.endsWith("/verify") && (req.method === "GET" || req.method === "POST")) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "缺少 Authorization 头" } });
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: authUser, error } = await supabase.auth.getUser(token);

      if (error || !authUser.user) {
        return json(401, { success: false, error: { code: "INVALID_TOKEN", message: "token 无效或已过期" } });
      }

      // 查询 public.users 获取角色和信用信息
      const { data: publicUser } = await supabase
        .from("users")
        .select("id, role, credit_score, credit_level, status")
        .eq("id", authUser.user.user_metadata.public_user_id)
        .maybeSingle();

      if (!publicUser) {
        return json(404, { success: false, error: { code: "USER_NOT_FOUND", message: "用户不存在" } });
      }

      if (publicUser.status === "banned") {
        return forbidden("账号已被封禁");
      }

      return json(200, {
        success: true,
        data: {
          user_id: publicUser.id,
          role: publicUser.role,
          credit_score: publicUser.credit_score,
          credit_level: publicUser.credit_level,
          permissions: RolePermissions[publicUser.role] || [],
        },
      });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND", message: "路由不存在" } });

  } catch (err: any) {
    const msg = err.message || "认证失败";
    if (msg.includes("WX_AUTH_FAILED")) {
      return json(401, { success: false, error: { code: "WX_AUTH_FAILED", message: msg } });
    }
    if (msg.includes("USER_BANNED")) {
      return forbidden(msg);
    }
    return json(500, { success: false, error: { code: "AUTH_FAILED", message: msg } });
  }
});
