/**
 * 抢单入口 — POST /order-grab/attempt | POST /order-grab/release
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { grabOrder } from "./grab-order.ts";
import { releaseOrder } from "./release-order.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证：只有飞手可以抢单/释放订单
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }
  if (authUser.role !== "pilot" && authUser.role !== "admin") {
    return json(403, { success: false, error: { code: "FORBIDDEN", message: "仅飞手可抢单" } });
  }

  const url = new URL(req.url);

  try {
    if (url.pathname.endsWith("/release") && req.method === "POST") {
      const body = await req.json();
      // 用认证用户 ID
      body.pilot_id = authUser.userId;
      await releaseOrder(supabase, body);
      return json(200, { success: true, data: { message: "订单已释放" } });
    }

    if (req.method === "POST") {
      const body = await req.json();
      // 用认证用户 ID（防伪造）
      body.pilot_id = authUser.userId;
      const result = await grabOrder(supabase, body);
      return json(200, { success: true, data: result });
    }

    return json(404, { success: false, error: { code: "NOT_FOUND" } });
  } catch (err: any) {
    const msg = err.message || "抢单失败";
    const status = msg.includes("CREDIT") ? 403 : msg.includes("NOT_GRABBABLE") ? 409 : 500;
    return json(status, { success: false, error: { code: "GRAB_FAILED", message: msg } });
  }
});
