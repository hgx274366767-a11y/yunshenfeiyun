/**
 * 派单响应 — 飞手确认/拒绝派单
 *
 * 确认 → 订单状态 accepted
 * 拒绝 → 尝试下一个候选 / 重回抢单池
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type { PilotWithScore } from "./dispatch-algorithm.ts";
import { updateCreditScore } from "../credit-calc/update-credit-score.ts";

export interface RespondInput {
  order_id: string;
  pilot_id: string;
  action: "accept" | "reject";
  reject_reason?: string;
}

export interface RespondResult {
  order_id: string;
  pilot_id: string;
  action: string;
  new_status: string;
  next_pilot?: string;
  message: string;
}

export async function respondDispatch(
  supabase: ReturnType<typeof createClient>,
  input: RespondInput,
): Promise<RespondResult> {
  const { order_id, pilot_id, action, reject_reason } = input;

  // 1. 校验订单状态
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", order_id)
    .single();

  if (orderError || !order) {
    throw new Error("ORDER_NOT_FOUND: 订单不存在");
  }

  if (order.status !== "dispatch_sent") {
    throw new Error(`ORDER_STATUS_INVALID: 当前状态 ${order.status}，不可响应派单`);
  }

  if (order.current_dispatch_pilot_id !== pilot_id) {
    throw new Error("PILOT_MISMATCH: 当前派单目标不是该飞手");
  }

  // 检查确认截止时间
  if (order.auto_dispatch_confirm_deadline) {
    const deadline = new Date(order.auto_dispatch_confirm_deadline).getTime();
    if (Date.now() > deadline && action === "accept") {
      throw new Error("CONFIRM_EXPIRED: 确认时间已过，派单已失效");
    }
  }

  const now = new Date().toISOString();

  if (action === "accept") {
    // === 飞手确认接单 ===

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "accepted",
        pilot_id,
        accepted_at: now,
        dispatch_type: order.dispatch_type || "auto",
        updated_at: now,
      })
      .eq("id", order_id);

    if (updateError) throw new Error(`ORDER_UPDATE_FAILED: ${updateError.message}`);

    // 更新派单日志
    await supabase
      .from("dispatch_logs")
      .update({
        status: "accepted",
        responded_at: now,
      })
      .eq("order_id", order_id)
      .eq("pilot_id", pilot_id)
      .eq("status", "sent");

    // 通知用户
    await supabase.from("messages").insert({
      user_id: order.user_id,
      title: "飞手已接单",
      content: `订单 ${order.order_no} 已被飞手接单，请等待吊运`,
      type: "order",
      related_order_id: order_id,
    });

    return {
      order_id,
      pilot_id,
      action: "accept",
      new_status: "accepted",
      message: "接单成功，请前往取货点",
    };
  }

  // === 飞手拒绝 ===

  // 更新派单日志
  await supabase
    .from("dispatch_logs")
    .update({
      status: "rejected",
      reject_reason: reject_reason || "飞手主动拒绝",
      responded_at: now,
    })
    .eq("order_id", order_id)
    .eq("pilot_id", pilot_id)
    .eq("status", "sent");

  // 扣除信用分（通过统一入口）
  try {
    await updateCreditScore(supabase, {
      user_id: pilot_id,
      pilot_id,
      order_id,
      action: "dispatch_reject",
      reason: `拒绝派单: ${reject_reason || "无理由"}`,
    });
  } catch (err: any) {
    console.warn("信用扣分失败:", err.message);
  }

  // 尝试下一个候选
  const candidates: PilotWithScore[] = order.auto_dispatch_candidates || [];
  const currentIdx = candidates.findIndex((c: any) => c.user_id === pilot_id);
  const remaining = candidates.slice((currentIdx + 1) || candidates.length);

  const nextPilot = remaining.find((c: any) => c.user_id !== pilot_id);

  if (nextPilot && remaining.length > 0) {
    // 派给下一个候选
    const nextRound = (order.auto_dispatch_round || 1) + 1;
    const nextDeadline = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await supabase
      .from("orders")
      .update({
        current_dispatch_pilot_id: nextPilot.user_id,
        auto_dispatch_round: nextRound,
        auto_dispatch_confirm_deadline: nextDeadline,
        updated_at: now,
      })
      .eq("id", order_id);

    await supabase.from("dispatch_logs").insert({
      order_id,
      pilot_id: nextPilot.user_id,
      dispatch_type: "auto",
      score_breakdown: nextPilot.breakdown,
      dispatch_round: nextRound,
      status: "sent",
      sent_at: now,
    });

    await supabase.from("messages").insert({
      user_id: nextPilot.user_id,
      title: "系统派单",
      content: `订单 ${order.order_no} 已重新分配给您（上一飞手已拒绝），请在15分钟内确认`,
      type: "order",
      related_order_id: order_id,
    });

    return {
      order_id,
      pilot_id,
      action: "reject",
      new_status: "dispatch_sent",
      next_pilot: nextPilot.user_id,
      message: `已拒绝，订单已转派给下一位飞手（第${nextRound}轮）`,
    };
  }

  // 无更多候选，退回抢单池
  await supabase
    .from("orders")
    .update({
      status: "grabbable_all",
      current_dispatch_pilot_id: null,
      updated_at: now,
    })
    .eq("id", order_id);

  // 通知用户
  await supabase.from("messages").insert({
    user_id: order.user_id,
    title: "订单重回抢单池",
    content: `订单 ${order.order_no} 所有候选飞手均已拒绝，已重新开放抢单`,
    type: "order",
    related_order_id: order_id,
  });

  return {
    order_id,
    pilot_id,
    action: "reject",
    new_status: "grabbable_all",
    message: "已拒绝，所有候选飞手已耗尽，订单已退回抢单池",
  };
}
