/**
 * 信用分系统入口
 *
 * POST /credit-calc          — 更新信用分（内部服务调用，需 service_role_key）
 * POST /credit-calc/complaint — 处理投诉（管理员）
 * GET  /credit-calc/:id       — 查询飞手信用状态
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest } from "../_shared/responses.ts";
import { updateCreditScore, getPilotCredit, SCORE_RULES } from "./update-credit-score.ts";
import { handleComplaint, getPilotComplaints } from "./complaint-handler.ts";
import type { ComplaintInput } from "./complaint-handler.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  const url = new URL(req.url);
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);
  const lastSeg = segments[segments.length - 1];

  try {
    // GET /credit-calc/:id — 查询飞手信用状态
    if (req.method === "GET" && lastSeg !== "credit-calc" && lastSeg !== "complaint") {
      return await getCredit(req, lastSeg);
    }

    // POST /credit-calc — 更新信用分（内部服务调用）
    if (req.method === "POST" && path.endsWith("/credit-calc")) {
      return await updateCredit(req);
    }

    // POST /credit-calc/complaint — 处理投诉
    if (req.method === "POST" && path.includes("/complaint")) {
      return await createComplaint(req);
    }

    // GET /credit-calc/complaint/:pilot_id — 查询飞手投诉历史
    if (req.method === "GET" && segments.includes("complaint") && lastSeg !== "complaint") {
      return await listComplaints(req, lastSeg);
    }

    return json(404, { success: false, error: { code: "NOT_FOUND", message: "未知路由" } });
  } catch (err: any) {
    console.error("Credit calc error:", err);
    return json(500, {
      success: false,
      error: { code: "CREDIT_FAILED", message: err.message || "信用分服务错误" },
    });
  }
});

// ============================================================
// 查询飞手信用
// ============================================================

async function getCredit(_req: Request, userId: string): Promise<Response> {
  const data = await getPilotCredit(supabase, userId);
  return json(200, { success: true, data });
}

// ============================================================
// 更新信用分（需 service_role_key 鉴权）
// ============================================================

async function updateCredit(req: Request): Promise<Response> {
  // 鉴权检查
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && authHeader !== `Bearer ${serviceKey}`) {
    return json(403, {
      success: false,
      error: { code: "FORBIDDEN", message: "仅内部服务可调用信用分更新" },
    });
  }

  const body = await req.json();

  if (!body.user_id || !body.action) {
    return badRequest("MISSING_FIELDS", "缺少必填字段: user_id, action");
  }

  // 校验 action 是否在规则表中
  if (!SCORE_RULES[body.action]) {
    return badRequest("UNKNOWN_ACTION", `未知操作类型: ${body.action}`);
  }

  const result = await updateCreditScore(supabase, {
    user_id: body.user_id,
    pilot_id: body.pilot_id,
    order_id: body.order_id,
    action: body.action,
    change_amount: body.change_amount,
    reason: body.reason,
  });

  return json(200, { success: true, data: result });
}

// ============================================================
// 处理投诉
// ============================================================

async function createComplaint(req: Request): Promise<Response> {
  const body: ComplaintInput = await req.json();

  if (!body.order_id || !body.pilot_id || !body.complaint_type) {
    return badRequest("MISSING_FIELDS", "缺少必填字段: order_id, pilot_id, complaint_type");
  }

  try {
    const result = await handleComplaint(supabase, body);
    return json(200, { success: true, data: result });
  } catch (err: any) {
    const msg = err.message || "";
    if (msg.includes("INVALID_COMPLAINT_TYPE")) {
      return json(400, { success: false, error: { code: "INVALID_COMPLAINT_TYPE", message: msg } });
    }
    if (msg.includes("ORDER_NOT_FOUND")) {
      return json(404, { success: false, error: { code: "ORDER_NOT_FOUND", message: msg } });
    }
    if (msg.includes("PILOT_NOT_MATCHED")) {
      return json(400, { success: false, error: { code: "PILOT_NOT_MATCHED", message: msg } });
    }
    if (msg.includes("DUPLICATE_COMPLAINT")) {
      return json(409, { success: false, error: { code: "DUPLICATE_COMPLAINT", message: msg } });
    }
    throw err;
  }
}

// ============================================================
// 查询投诉历史
// ============================================================

async function listComplaints(_req: Request, pilotId: string): Promise<Response> {
  const data = await getPilotComplaints(supabase, pilotId);
  return json(200, { success: true, data });
}
