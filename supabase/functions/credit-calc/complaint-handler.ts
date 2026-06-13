/**
 * 投诉处理 — 扣分 + 暂停 + 通知
 *
 * 投诉类型: late / damage / cancel / no_photo / route_violation / smuggling / overload
 * 严重违规: 隐瞒禁运品(暂停7天) / 违规超载(暂停15天) / GPS造假(暂停30天)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { updateCreditScore } from "./update-credit-score.ts";

// ============================================================
// 类型定义
// ============================================================

export interface ComplaintInput {
  order_id: string;
  pilot_id: string;
  complainant_id?: string;
  complaint_type: string;
  description?: string;
  evidence_urls?: string[];
}

export interface ComplaintResult {
  order_id: string;
  pilot_id: string;
  complaint_type: string;
  deduction: number;
  reason: string;
  suspend_days: number;
  suspend_until?: string;
  new_score: number;
  new_level: string;
}

// ============================================================
// 投诉类型映射
// ============================================================

export const COMPLAINT_RULES: Record<string, { score: number; reason: string; suspend_days?: number }> = {
  late: { score: -3, reason: "迟到超过10分钟" },
  damage: { score: -8, reason: "货物轻微破损" },
  serious_damage: { score: -25, reason: "货物严重损毁", suspend_days: 14 },
  cancel: { score: -10, reason: "恶意取消订单" },
  no_photo: { score: -5, reason: "未拍照留证" },
  route_violation: { score: -8, reason: "未按核定航线飞行" },
  smuggling: { score: -15, reason: "隐瞒禁运品", suspend_days: 7 },
  overload: { score: -20, reason: "违规超载", suspend_days: 15 },
  fake_gps: { score: -30, reason: "GPS轨迹造假", suspend_days: 30 },
  rude_behavior: { score: -5, reason: "服务态度恶劣" },
  unresponsive: { score: -3, reason: "多次联系不上" },
};

// ============================================================
// 核心函数：处理投诉
// ============================================================

export async function handleComplaint(
  supabase: ReturnType<typeof createClient>,
  input: ComplaintInput,
): Promise<ComplaintResult> {
  const { order_id, pilot_id, complainant_id, complaint_type, description, evidence_urls } = input;

  // 1. 校验投诉类型
  const rule = COMPLAINT_RULES[complaint_type];
  if (!rule) {
    throw new Error(
      `INVALID_COMPLAINT_TYPE: 无效投诉类型 "${complaint_type}"，有效类型: ${Object.keys(COMPLAINT_RULES).join(", ")}`,
    );
  }

  // 2. 校验订单存在
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_no, user_id, status")
    .eq("id", order_id)
    .single();

  if (!order) {
    throw new Error("ORDER_NOT_FOUND: 订单不存在");
  }

  // 3. 校验飞手是该订单的 pilot
  const { data: orderPilot } = await supabase
    .from("orders")
    .select("pilot_id")
    .eq("id", order_id)
    .eq("pilot_id", pilot_id)
    .single();

  if (!orderPilot) {
    throw new Error("PILOT_NOT_MATCHED: 该飞手不是此订单的执飞飞手");
  }

  // 4. 检查是否重复投诉
  const { count: existingCount } = await supabase
    .from("credit_score_logs")
    .select("*", { count: "exact", head: true })
    .eq("order_id", order_id)
    .eq("user_id", pilot_id)
    .eq("action", `complaint_${complaint_type}`);

  if (existingCount && existingCount > 0) {
    throw new Error("DUPLICATE_COMPLAINT: 该订单已存在相同类型的投诉记录");
  }

  // 5. 执行信用分扣减
  const creditResult = await updateCreditScore(supabase, {
    user_id: pilot_id,
    pilot_id,
    order_id,
    action: `complaint_${complaint_type}`,
    change_amount: rule.score,
    reason: `${rule.reason} — ${description || "无补充描述"}`,
  });

  // 6. 严重违规 → 暂停接单
  let suspendDays = 0;
  let suspendUntil: string | undefined;

  if (rule.suspend_days) {
    suspendDays = rule.suspend_days;
    suspendUntil = new Date(
      Date.now() + rule.suspend_days * 24 * 60 * 60 * 1000,
    ).toISOString();

    await supabase
      .from("pilots")
      .update({ online_status: "offline" })
      .eq("user_id", pilot_id);

    await supabase
      .from("users")
      .update({ status: "suspended" })
      .eq("id", pilot_id);
  }

  // 7. 写入投诉记录
  const { error: complaintError } = await supabase
    .from("complaints")
    .insert({
      order_id,
      complainant_id: complainant_id || order.user_id,
      respondent_id: pilot_id,
      complaint_type,
      description: description || rule.reason,
      evidence_urls: evidence_urls || [],
      deduction: Math.abs(rule.score),
      suspend_days: suspendDays,
      status: "resolved",
      created_at: new Date().toISOString(),
      resolved_at: new Date().toISOString(),
    });

  if (complaintError && !complaintError.message?.includes("does not exist")) {
    console.warn("Failed to insert complaint record:", complaintError.message);
  }

  // 8. 通知被投诉飞手
  await supabase.from("messages").insert({
    user_id: pilot_id,
    title: "信用分扣减通知",
    content: [
      `订单 ${order.order_no}: ${rule.reason}`,
      `扣除 ${Math.abs(rule.score)} 分，当前信用分 ${creditResult.after_score} (${creditResult.after_level})`,
      suspendDays > 0 ? `暂停接单 ${suspendDays} 天` : "",
      description ? `投诉详情: ${description}` : "",
    ].filter(Boolean).join("。"),
    type: "system",
    related_order_id: order_id,
  });

  return {
    order_id,
    pilot_id,
    complaint_type,
    deduction: Math.abs(rule.score),
    reason: rule.reason,
    suspend_days: suspendDays,
    suspend_until: suspendUntil,
    new_score: creditResult.after_score,
    new_level: creditResult.after_level,
  };
}

/**
 * 查询飞手投诉历史
 */
export async function getPilotComplaints(
  supabase: ReturnType<typeof createClient>,
  pilotId: string,
  limit = 20,
) {
  const { data: logs } = await supabase
    .from("credit_score_logs")
    .select("*")
    .eq("user_id", pilotId)
    .like("action", "complaint_%")
    .order("created_at", { ascending: false })
    .limit(limit);

  return {
    pilot_id: pilotId,
    total_complaints: logs?.length ?? 0,
    complaints: logs || [],
  };
}
