/**
 * 通知服务入口 — POST /notification/send | POST /notification/broadcast
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { sendMessage } from "./send-message.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证：仅管理员可发送通知
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅管理员可发送通知" } });
  }

  const url = new URL(req.url);

  try {
    // 单条/多渠道发送
    if (url.pathname.endsWith("/send") && req.method === "POST") {
      const result = await sendMessage(supabase, await req.json());
      return json(200, { success: true, data: result });
    }

    // 广播：向所有在线飞手发送
    if (url.pathname.endsWith("/broadcast") && req.method === "POST") {
      const { title, content, type, channels } = await req.json();

      const { data: pilots } = await supabase
        .from("pilots")
        .select("user_id")
        .eq("online_status", "online")
        .eq("cert_status", "approved");

      if (!pilots || pilots.length === 0) {
        return json(200, { success: true, data: { sent: 0, message: "无在线飞手" } });
      }

      let sent = 0;
      for (const p of pilots) {
        await sendMessage(supabase, {
          user_id: p.user_id,
          title,
          content,
          type: type || "system",
          channels: channels || ["in_app"],
        });
        sent++;
      }

      return json(200, { success: true, data: { sent, total: pilots.length } });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND" } });
  } catch (err: any) {
    return json(500, { success: false, error: { code: "NOTIFY_FAILED", message: err.message } });
  }
});
