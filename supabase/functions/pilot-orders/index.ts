/**
 * 飞手端订单接口 — pilot-orders
 *
 * GET  /grabbable      — 可抢订单列表
 * GET  /task/current   — 当前飞手接单的任务
 * POST /step           — 更新任务步骤
 * POST /online-status  — 飞手上下线
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, ok, badRequest, forbidden, notFound } from "../_shared/responses.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const pathname = url.pathname.replace(/\/+$/, "");

  // 提取 JWT 中的 user_id
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "缺少认证令牌" } });
  }
  const jwt = authHeader.slice(7);
  const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
  if (authError || !user) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "令牌无效" } });
  }
  const userId = user.id;

  // 查找飞手记录
  const { data: pilot } = await supabase
    .from("pilots")
    .select("id, user_id, online_status, cert_status")
    .eq("user_id", userId)
    .single();

  if (!pilot) {
    return forbidden("仅飞手可访问此接口");
  }

  try {
    // GET /grabbable — 可抢订单列表
    if (req.method === "GET" && pathname.endsWith("/grabbable")) {
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .in("status", ["grabbable_gold", "grabbable_senior", "grabbable_all"])
        .order("created_at", { ascending: false })
        .limit(50);

      return ok({ orders: orders || [] });
    }

    // GET /task/current — 当前任务
    if (req.method === "GET" && pathname.endsWith("/task/current")) {
      const { data: task } = await supabase
        .from("orders")
        .select("*")
        .eq("pilot_id", pilot.id)
        .in("status", ["accepted", "in_progress", "picked_up", "delivering"])
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      return ok(task || null);
    }

    // POST /step — 更新任务步骤
    if (req.method === "POST" && pathname.endsWith("/step")) {
      const { order_id, step } = await req.json();
      if (!order_id || !step) {
        return badRequest("MISSING_FIELDS", "缺少 order_id 或 step");
      }

      const validSteps = ["accepted", "departed", "arrived_pickup", "picked_up", "delivering", "arrived_delivery", "completed"];
      if (!validSteps.includes(step)) {
        return badRequest("INVALID_STEP", `无效步骤: ${step}`);
      }

      const statusMap: Record<string, string> = {
        accepted: "accepted",
        departed: "in_progress",
        arrived_pickup: "in_progress",
        picked_up: "picked_up",
        delivering: "delivering",
        arrived_delivery: "delivering",
        completed: "completed",
      };

      const { data: updated, error } = await supabase
        .from("orders")
        .update({
          status: statusMap[step],
          current_step: step,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order_id)
        .eq("pilot_id", pilot.id)
        .select()
        .single();

      if (error) return json(500, { success: false, error: { code: "UPDATE_FAILED", message: error.message } });

      // 记录日志
      await supabase.from("order_logs").insert({
        order_id,
        action: `step_${step}`,
        new_status: statusMap[step],
        remark: `飞手更新步骤: ${step}`,
      });

      return ok(updated);
    }

    // POST /online-status — 飞手上下线
    if (req.method === "POST" && pathname.endsWith("/online-status")) {
      const { online } = await req.json();

      await supabase
        .from("pilots")
        .update({
          online_status: online === true ? "online" : "offline",
          updated_at: new Date().toISOString(),
        })
        .eq("id", pilot.id);

      return ok({ online: online === true });
    }

    return notFound(`未找到路由: ${req.method} ${pathname}`);
  } catch (err: any) {
    return json(500, { success: false, error: { code: "INTERNAL_ERROR", message: err.message } });
  }
});
