/**
 * 应急广播 — emergency/
 *
 * Directus 后台一键开启，所有在线飞手广播通知，
 * 应急订单 0 佣金红色置顶。
 * 仅 service_role 可调用。
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证：仅管理员可操作应急模式
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅管理员可操作应急模式" } });
  }

  const url = new URL(req.url);

  try {
    if (url.pathname.endsWith("/toggle") && req.method === "POST") {
      const { enabled } = await req.json();
      await supabase.from("system_config").upsert({
        config_group: "emergency",
        config_key: "emergency_mode",
        config_value: { enabled },
        description: "应急模式开关",
        is_active: true,
      }, { onConflict: "config_group, config_key" });

      return json(200, { success: true, data: { emergency_mode: enabled } });
    }

    if (url.pathname.endsWith("/broadcast") && req.method === "POST") {
      const { order_id } = await req.json();

      await supabase.from("orders").update({ status: "grabbable_all", is_emergency: true }).eq("id", order_id).eq("status", "pending");

      const { data: onlinePilots } = await supabase.from("pilots").select("user_id").eq("online_status", "online").eq("cert_status", "approved");

      if (onlinePilots?.length) {
        const messages = onlinePilots.map((p) => ({
          user_id: p.user_id,
          title: "应急订单",
          content: "附近有应急吊运需求，请立即查看（0佣金）",
          type: "dispatch",
          related_order_id: order_id,
        }));
        await supabase.from("messages").insert(messages);
      }

      await supabase.from("announcements").insert({
        title: "应急救援模式已启动",
        content: "应急吊运订单已发布，请在线飞手立即查看",
        type: "urgent",
        target_roles: ["pilot"],
        is_pinned: true,
      });

      return json(200, { success: true, data: { notified_pilots: onlinePilots?.length || 0 } });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND" } });
  } catch (err) {
    return json(500, { success: false, error: { code: "INTERNAL_ERROR", message: err instanceof Error ? err.message : "应急服务失败" } });
  }
});
