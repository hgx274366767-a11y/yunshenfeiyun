/**
 * 投诉申诉入口
 *
 * POST   /complaint           — 用户提交投诉
 * GET    /complaint/my         — 我的投诉列表
 * GET    /complaint/:id        — 投诉详情（含订单+飞手信息）
 * PATCH  /complaint/:id        — 管理员处理投诉（扣分+通知）
 * GET    /complaint/stats      — 投诉统计
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { supabase } from "../_shared/supabase.ts";
import { handleCors } from "../_shared/cors.ts";
import { json, badRequest } from "../_shared/responses.ts";
import { authMiddleware } from "../_shared/permissions.ts";
import { updateCreditScore } from "../credit-calc/update-credit-score.ts";
import { COMPLAINT_RULES } from "../credit-calc/complaint-handler.ts";

serve(async (req: Request) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  // 身份验证
  const authUser = await authMiddleware(req, supabase);
  if (!authUser) {
    return json(401, { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } });
  }

  const url = new URL(req.url);
  const path = url.pathname;
  const segments = path.split("/").filter(Boolean);
  const lastSeg = segments[segments.length - 1];

  try {
    // POST /complaint — 用户提交投诉
    if (req.method === "POST" && path.endsWith("/complaint")) {
      return await createComplaint(req);
    }

    // GET /complaint/my?user_id=xxx — 我的投诉列表
    if (req.method === "GET" && path.includes("/my")) {
      return await getMyComplaints(req);
    }

    // GET /complaint/stats — 投诉统计
    if (req.method === "GET" && path.endsWith("/stats")) {
      return await getComplaintStats();
    }

    // GET /complaint/:id — 投诉详情
    if (req.method === "GET" && lastSeg !== "complaint" && lastSeg !== "my") {
      return await getComplaintDetail(lastSeg);
    }

    // PATCH /complaint/:id — 管理员处理投诉
    if (req.method === "PATCH" && lastSeg !== "complaint") {
      return await resolveComplaint(req, lastSeg);
    }

    return json(404, { success: false, error: { code: "NOT_FOUND", message: "未知路由" } });
  } catch (err: any) {
    console.error("Complaint error:", err);
    return json(500, {
      success: false,
      error: { code: "COMPLAINT_FAILED", message: err.message || "投诉服务错误" },
    });
  }
});

// ============================================================
// 创建投诉
// ============================================================

async function createComplaint(req: Request): Promise<Response> {
  const body = await req.json();

  if (!body.order_id || !body.complaint_type || !body.description) {
    return badRequest("MISSING_FIELDS", "缺少必填字段: order_id, complaint_type, description");
  }

  // 校验投诉类型
  const validTypes = [
    "late", "damage", "serious_damage", "cancel", "no_photo",
    "route_violation", "smuggling", "overload", "fake_gps",
    "rude_behavior", "unresponsive", "other",
  ];
  if (!validTypes.includes(body.complaint_type)) {
    return badRequest("INVALID_TYPE", `投诉类型无效，可选: ${validTypes.join(", ")}`);
  }

  // 校验订单存在
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_no, user_id, pilot_id, status")
    .eq("id", body.order_id)
    .single();

  if (!order) {
    return json(404, { success: false, error: { code: "ORDER_NOT_FOUND", message: "订单不存在" } });
  }

  // 校验投诉人身份：请求中的 complainant_id 必须匹配订单的 user_id
  const complainantId = body.complainant_id || order.user_id;
  if (complainantId !== order.user_id) {
    return json(403, {
      success: false,
      error: { code: "NOT_ORDER_OWNER", message: "只能投诉自己的订单" },
    });
  }

  // 只有已完成的订单可以投诉
  if (!["completed"].includes(order.status)) {
    return json(400, {
      success: false,
      error: { code: "ORDER_NOT_COMPLETED", message: "只能对已完成的订单进行投诉" },
    });
  }

  // 需要有飞手
  if (!order.pilot_id) {
    return json(400, {
      success: false,
      error: { code: "NO_PILOT", message: "该订单无飞手，无法投诉" },
    });
  }

  // 检查重复投诉
  const { count: dupCount } = await supabase
    .from("complaints")
    .select("*", { count: "exact", head: true })
    .eq("order_id", body.order_id)
    .eq("complainant_id", complainantId)
    .eq("complaint_type", body.complaint_type);

  if (dupCount && dupCount > 0) {
    return json(409, {
      success: false,
      error: { code: "DUPLICATE_COMPLAINT", message: "您已提交过相同类型的投诉" },
    });
  }

  // 写入投诉记录
  const { data: complaint, error } = await supabase
    .from("complaints")
    .insert({
      order_id: body.order_id,
      complainant_id: complainantId,
      respondent_id: order.pilot_id,
      complaint_type: body.complaint_type,
      description: body.description,
      evidence_urls: body.evidence_urls || [],
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(`INSERT_FAILED: ${error.message}`);

  return json(201, {
    success: true,
    data: {
      ...complaint,
      order_no: order.order_no,
    },
    message: "投诉已提交，客服将在24小时内处理",
  });
}

// ============================================================
// 我的投诉列表
// ============================================================

async function getMyComplaints(req: Request): Promise<Response> {
  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) {
    return badRequest("MISSING_USER_ID", "缺少 user_id 参数");
  }

  const { data: complaints, error } = await supabase
    .from("complaints")
    .select(`
      id, order_id, complaint_type, description, status,
      deduction, suspend_days, resolution, created_at, resolved_at,
      orders(order_no, goods_type)
    `)
    .eq("complainant_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return json(200, {
    success: true,
    data: {
      total: complaints?.length ?? 0,
      items: complaints || [],
    },
  });
}

// ============================================================
// 投诉详情
// ============================================================

async function getComplaintDetail(id: string): Promise<Response> {
  const { data: complaint, error } = await supabase
    .from("complaints")
    .select(`
      *,
      orders(order_no, goods_type, goods_weight, pickup_address, delivery_address, final_price, status),
      complainant:complainant_id(wx_nickname, phone),
      respondent:respondent_id(wx_nickname, phone)
    `)
    .eq("id", id)
    .single();

  if (error || !complaint) {
    return json(404, { success: false, error: { code: "NOT_FOUND", message: "投诉不存在" } });
  }

  return json(200, { success: true, data: complaint });
}

// ============================================================
// 处理投诉（管理员）
// ============================================================

async function resolveComplaint(req: Request, id: string): Promise<Response> {
  const body = await req.json();

  const { data: complaint } = await supabase
    .from("complaints")
    .select("*")
    .eq("id", id)
    .single();

  if (!complaint) {
    return json(404, { success: false, error: { code: "NOT_FOUND", message: "投诉不存在" } });
  }

  if (complaint.status !== "pending" && complaint.status !== "investigating") {
    return json(409, {
      success: false,
      error: { code: "ALREADY_RESOLVED", message: `投诉已处理 (${complaint.status})` },
    });
  }

  const updateData: any = {
    status: body.status || "resolved",
    resolution: body.resolution || "",
    resolution_by: body.resolution_by,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (body.deduction != null) updateData.deduction = body.deduction;
  if (body.suspend_days != null) updateData.suspend_days = body.suspend_days;

  const { error: updateError } = await supabase
    .from("complaints")
    .update(updateData)
    .eq("id", id);

  if (updateError) throw new Error(`UPDATE_FAILED: ${updateError.message}`);

  // 已解决 → 执行信用分扣减
  if (body.status === "resolved" && complaint.respondent_id) {
    const compRule = COMPLAINT_RULES[complaint.complaint_type];
    if (compRule) {
      try {
        await updateCreditScore(supabase, {
          user_id: complaint.respondent_id,
          pilot_id: complaint.respondent_id,
          order_id: complaint.order_id,
          action: `complaint_${complaint.complaint_type}`,
          change_amount: compRule.score,
          reason: `${compRule.reason} — ${complaint.description || "无补充描述"}`,
        });
      } catch (err: any) {
        console.warn("信用扣分执行失败（可能已处理过）:", err.message);
      }
    }
  }

  // 通知双方
  if (body.status === "resolved") {
    await supabase.from("messages").insert([
      {
        user_id: complaint.complainant_id,
        title: "投诉处理结果",
        content: `投诉已处理: ${body.resolution || "已对飞手做出相应处罚"}`,
        type: "system",
        related_order_id: complaint.order_id,
      },
      {
        user_id: complaint.respondent_id,
        title: "投诉处理通知",
        content: [
          `投诉类型: ${complaint.complaint_type}`,
          `处理结果: ${body.resolution || "已处罚"}`,
          body.deduction ? `信用分扣除: ${body.deduction}分` : "",
          body.suspend_days ? `暂停接单: ${body.suspend_days}天` : "",
        ].filter(Boolean).join("。"),
        type: "system",
        related_order_id: complaint.order_id,
      },
    ]);
  }

  if (body.status === "rejected") {
    await supabase.from("messages").insert({
      user_id: complaint.complainant_id,
      title: "投诉处理结果",
      content: `您的投诉已被驳回。理由: ${body.resolution || "证据不足"}`,
      type: "system",
      related_order_id: complaint.order_id,
    });
  }

  return json(200, {
    success: true,
    data: {
      complaint_id: id,
      status: body.status,
      message: body.status === "resolved" ? "投诉已处理，相关处罚已生效" : "投诉已驳回",
    },
  });
}

// ============================================================
// 投诉统计
// ============================================================

async function getComplaintStats(): Promise<Response> {
  const [total, pending, resolved, rejected] = await Promise.all([
    supabase.from("complaints").select("*", { count: "exact", head: true }),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "resolved"),
    supabase.from("complaints").select("*", { count: "exact", head: true }).eq("status", "rejected"),
  ]);

  return json(200, {
    success: true,
    data: {
      total: total.count ?? 0,
      pending: pending.count ?? 0,
      resolved: resolved.count ?? 0,
      rejected: rejected.count ?? 0,
    },
  });
}
