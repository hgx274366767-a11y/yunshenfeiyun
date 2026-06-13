/**
 * 自动派单入口
 *
 * POST /auto-dispatch/run             — 定时批量派单（cron 调用）
 * POST /auto-dispatch/assign          — 手动指派单个飞手
 * POST /auto-dispatch/dispatch-order  — 手动/自动派单（含48h检查）
 * POST /auto-dispatch/respond         — 飞手确认/拒绝派单
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { findBestPilot } from "./dispatch-algorithm.ts";
import { runAutoDispatch } from "./dispatch-cron.ts";
import { dispatchOrder } from "./dispatch-order.ts";
import { respondDispatch } from "./respond-dispatch.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const path = url.pathname;

  // 身份验证
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }

  try {
    // POST /auto-dispatch/run — 定时批量派单
    if (path.endsWith("/run") && req.method === "POST") {
      const result = await runAutoDispatch(supabase);
      return json(200, { success: true, data: result });
    }

    // POST /auto-dispatch/assign — 手动指派单个飞手
    if (path.endsWith("/assign") && req.method === "POST") {
      const body = await req.json();
      if (!body.order_id) {
        return badRequest("MISSING_ORDER_ID", "缺少 order_id");
      }

      const result = await findBestPilot(supabase, { order_id: body.order_id });
      return json(200, { success: true, data: result });
    }

    // POST /auto-dispatch/dispatch-order — 派单（手动/自动，含48h检查）
    if (path.endsWith("/dispatch-order") && req.method === "POST") {
      const body = await req.json();
      if (!body.order_id) {
        return badRequest("MISSING_ORDER_ID", "缺少 order_id");
      }

      try {
        const result = await dispatchOrder(supabase, body);
        return json(200, { success: true, data: result });
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("DISPATCH_NOT_READY")) {
          return json(400, { success: false, error: { code: "DISPATCH_NOT_READY", message: msg } });
        }
        if (msg.includes("ORDER_NOT_FOUND")) {
          return json(404, { success: false, error: { code: "ORDER_NOT_FOUND", message: msg } });
        }
        if (msg.includes("NO_AVAILABLE_PILOT")) {
          return json(400, { success: false, error: { code: "NO_AVAILABLE_PILOT", message: msg } });
        }
        throw err;
      }
    }

    // POST /auto-dispatch/respond — 飞手确认/拒绝派单
    if (path.endsWith("/respond") && req.method === "POST") {
      const body = await req.json();
      if (!body.order_id || !body.pilot_id || !body.action) {
        return badRequest("MISSING_FIELDS", "缺少必填字段: order_id, pilot_id, action");
      }
      if (!["accept", "reject"].includes(body.action)) {
        return badRequest("INVALID_ACTION", "action 必须为 accept 或 reject");
      }

      try {
        const result = await respondDispatch(supabase, body);
        return json(200, { success: true, data: result });
      } catch (err: any) {
        const msg = err.message || "";
        if (msg.includes("CONFIRM_EXPIRED")) {
          return json(410, { success: false, error: { code: "CONFIRM_EXPIRED", message: msg } });
        }
        if (msg.includes("ORDER_NOT_FOUND")) {
          return json(404, { success: false, error: { code: "ORDER_NOT_FOUND", message: msg } });
        }
        if (msg.includes("PILOT_MISMATCH")) {
          return json(403, { success: false, error: { code: "PILOT_MISMATCH", message: msg } });
        }
        throw err;
      }
    }

    return json(404, { success: false, error: { code: "NOT_FOUND", message: "未知路由" } });
  } catch (err: any) {
    console.error("Auto dispatch error:", err);
    return json(500, {
      success: false,
      error: { code: "DISPATCH_FAILED", message: err.message || "派单失败" },
    });
  }
});
